const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing Modalidad 5 (Programas Interregionales) in admin.html ---');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

// Build mock DOM
const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id: id,
      value: '',
      textContent: '',
      innerHTML: '',
      style: {},
      disabled: false,
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {},
        contains: () => false
      }
    };
  }
  return elements[id];
}

const fakeDoc = {
  documentElement: { getAttribute: () => 'light', setAttribute: () => {} },
  getElementById: (id) => getEl(id),
  querySelector: (sel) => getEl(sel.replace('#', '')),
  querySelectorAll: () => []
};

let openedUrl = null;
const fakeWindow = {
  open: (url) => { openedUrl = url; },
  location: { replace: () => {}, href: '' }
};

const mockContext = {
  console: console,
  document: fakeDoc,
  window: fakeWindow,
  sessionStorage: {
    getItem: () => JSON.stringify({ role: 'admin', roleLabel: 'Superadmin', name: 'Supervisión Central', token: 'tok123' }),
    setItem: () => {},
    removeItem: () => {}
  },
  localStorage: {
    getItem: () => JSON.stringify({ role: 'admin', roleLabel: 'Superadmin', name: 'Supervisión Central', token: 'tok123' }),
    setItem: () => {},
    removeItem: () => {}
  },
  addEventListener: () => {},
  alert: () => {},
  fetch: async () => {
    // Mock OSRM response for Valparaíso - Santiago
    return {
      json: async () => ({
        routes: [{
          distance: 242000,
          duration: 11760,
          legs: [
            { duration: 5880 }, // 98 min ida
            { duration: 5880 }  // 98 min retorno
          ]
        }]
      })
    };
  }
};

vm.createContext(mockContext);

// Extract main application JS
const startMarker = 'const PX=44';
const scriptStart = adminHtml.indexOf(startMarker);
const scriptEnd = adminHtml.indexOf('</script>', scriptStart);
const scriptContent = adminHtml.substring(scriptStart, scriptEnd);

vm.runInContext(scriptContent, mockContext);

const q_mode = getEl('aq_mode');
const q_date = getEl('aq_date');
const q_time = getEl('aq_time');
const q_inter_plan = getEl('aq_inter_plan');
const q_inter_extra = getEl('aq_inter_extra');
const q_from = getEl('aq_from');
const q_to = getEl('aq_to');
const lbl_time = getEl('lbl_aq_time');
const lbl_helper = getEl('lbl_aq_time_helper');
const buf_info = getEl('admin_buffer_info');

// 1. Activate Modalidad 5
console.log('\n1. Testing Modalidad 5 Activation & Labeling...');
q_mode.value = '5';
q_date.value = '2026-11-10';
q_time.value = '10:00'; // Medical appointment time in Santiago
vm.runInContext('onAdminModeChange();', mockContext);

assert.strictEqual(lbl_time.textContent, 'Hora de la Cita Médica en Santiago *', 'Time label must be updated for Santiago appointment');
let qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.interRegion, 'Región de Valparaíso', 'Default region must be Región de Valparaíso');
assert(q_from.value.includes('Viña del Mar') || q_from.value.includes('Valparaíso'), 'Origin must default to Valparaíso/Viña del Mar');
console.log('✓ Labeling and default Valparaíso region verified');

// 2. Test Region Toggle to O'Higgins
console.log('\n2. Testing Region Switch to Región de O\'Higgins...');
vm.runInContext("selectAdminInterRegion('Región de O\\'Higgins');", mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.interRegion, "Región de O'Higgins", 'Region must switch to Región de O\'Higgins');
assert(q_from.value.includes('Rancagua'), 'Origin address must update to Rancagua');
console.log('✓ Region switch to O\'Higgins verified');

// 3. Switch back to Valparaíso with 98 min legs from OSRM
console.log('\n3. Testing Timeline & Schedule Calculation with 98 min road legs...');
vm.runInContext("selectAdminInterRegion('Región de Valparaíso');", mockContext);
// Set 98 min ida/vuelta to test the exact validated scenario (salida 07:45, llegada 09:33, retorno 17:11, total 9h 26 min)
vm.runInContext('adminRouteIdaMin = 98; adminRouteVueltaMin = 98;', mockContext);
q_inter_plan.value = 'cronico'; // 6 hours (360 min)
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);

// Check pickup calculation:
// rawPickup = 600 (10:00) - (98 ida + 10 abordaje + 20 admision) = 472 min
// pickupSlot = Math.floor(472/15)*15 = 465 min = 07:45 hrs
assert.strictEqual(qState.pickupMin, 465, 'Regional pickup must be 465 min (07:45 hrs)');
assert.strictEqual(qState.pickupTimeStr, '07:45', 'Regional pickup string must be 07:45');

// Check llegada Santiago:
// 465 + 10 + 98 = 573 min = 09:33 hrs
assert.strictEqual(qState.llegadaSantiagoMin, 573, 'Arrival at Santiago clinic must be 573 min (09:33 hrs)');

// Check return to regional home:
// 573 + 360 (6h clinical stay) = 933 min (15:33 hrs)
// 933 + 98 min return trip = 1031 min (17:11 hrs)
assert.strictEqual(qState.retornoHogarMin, 1031, 'Return to regional home must be 1031 min (17:11 hrs)');

// Check total circuit duration:
// 10 abordaje + 98 ida + 360 stay + 98 retorno = 566 min (9h 26 min)
assert.strictEqual(qState.durationMin, 566, 'Duration in agenda must be 566 min (9h 26 min), not cut at 16:00');
assert.strictEqual(lbl_helper.style.display, 'block', 'Helper label must be visible');
assert(lbl_helper.innerHTML.includes('07:45 hrs'), 'Helper must show 07:45 hrs pickup');
assert(lbl_helper.innerHTML.includes('09:33 hrs'), 'Helper must show 09:33 hrs arrival in Santiago');
assert(lbl_helper.innerHTML.includes('17:11 hrs'), 'Helper must show 17:11 hrs estimated return');
console.log('✓ Timeline calculation: 07:45 salida, 09:33 llegada Stgo, 17:11 retorno (566 min / 9h 26 min) verified');

// 4. Test Buffer and Tech Availability
console.log('\n4. Testing Buffer and Projected Termino in Admin...');
vm.runInContext('populateAdminTechs();', mockContext);
assert(buf_info.innerHTML.includes('Salida regional: <b>07:45 hrs</b>'), 'Buffer info must indicate regional departure');
assert(buf_info.innerHTML.includes('Término proyectado: <b>17:11 hrs</b>'), 'Término proyectado must be 17:11 hrs, not 16:00');
assert(buf_info.innerHTML.includes('19:11 hrs'), 'Buffer 2h must be liberated at 19:11 hrs');
console.log('✓ Buffer release at 19:11 hrs (17:11 + 2h) verified');

// 5. Test WhatsApp Quotation Content
console.log('\n5. Testing WhatsApp Quotation Content...');
vm.runInContext('sendAdminQuoteWhatsApp();', mockContext);
assert(openedUrl, 'WhatsApp URL must be opened');
const decodedMsg = decodeURIComponent(openedUrl);
assert(decodedMsg.includes('Recogida en domicilio regional:* 07:45 hrs'), 'WhatsApp must specify regional pickup 07:45');
assert(decodedMsg.includes('Llegada a centro médico (Stgo):* 09:33 hrs (Cita: 10:00 hrs)'), 'WhatsApp must specify Santiago arrival 09:33 and appointment 10:00');
assert(decodedMsg.includes('Permanencia clínica / espera:* 6 horas'), 'WhatsApp must specify 6 horas clinical stay');
assert(decodedMsg.includes('Retorno estimado al domicilio:* 17:11 hrs'), 'WhatsApp must specify 17:11 return');
assert(decodedMsg.includes('Región de Origen:* Región de Valparaíso'), 'WhatsApp must specify region of origin');
assert(decodedMsg.includes('Subtotal Programa:* $300.000'), 'WhatsApp must specify $300.000 total');
assert(decodedMsg.includes('Abono 50% para reserva:* $150.000'), 'WhatsApp must specify $150.000 deposit');
console.log('✓ WhatsApp quotation breakdown verified');

// 6. Test Booking Persistence in Agenda
console.log('\n6. Testing Agenda Booking Persistence...');
const res = vm.runInContext('saveAdminBooking(null, true);', mockContext);
assert(res && res.success, 'saveAdminBooking must succeed');
const svc = res.service;
assert.strictEqual(svc.svcType, '5');
assert.strictEqual(svc.time, '07:45', 'Service time in agenda must be regional departure (07:45)');
assert.strictEqual(svc.start, 465, 'Service start min must be 465');
assert.strictEqual(svc.dur, 566, 'Service duration must be 566 min');
assert.strictEqual(svc.blocksPrevNight, true, 'Must block previous night for driver rest');
assert.strictEqual(svc.fullDay, true, 'Must block full day');
assert(svc.obs.includes('Cita Médica Stgo: 10:00 hrs'), 'Obs must document appointment time');
assert(svc.obs.includes('Retorno: 17:11 hrs'), 'Obs must document return time');
console.log('✓ Agenda booking persistence with full-day block, biological rest, and accurate timeline verified');

console.log('\n🎉 ALL MODALIDAD 5 INTERREGIONAL TESTS IN ADMIN.HTML PASSED SUCCESSFULLY!');
