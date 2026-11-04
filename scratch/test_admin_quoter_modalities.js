const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing Cotizador Maestro: 6h Cap, Official Tariff Homologation & Interregional Safety Lock ---');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

// Build a mock DOM for the VM
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
  alert: () => {}
};

vm.createContext(mockContext);

// Extract main application JS
const startMarker = 'const PX=44';
const scriptStart = adminHtml.indexOf(startMarker);
const scriptEnd = adminHtml.indexOf('</script>', scriptStart);
let scriptContent = fs.existsSync("js/admin.js") ? fs.readFileSync("js/admin.js", "utf8") : adminHtml.substring(scriptStart, scriptEnd);

vm.runInContext(scriptContent, mockContext);

// Initial form elements setup
const q_from = getEl('aq_from');
const q_to = getEl('aq_to');
const q_mode = getEl('aq_mode');
const q_date = getEl('aq_date');
const q_time = getEl('aq_time');
const q_km = getEl('aq_km');
const q_stay = getEl('aq_stay_hours');
const q_event_subtype = getEl('aq_event_subtype');
const q_event_pack = getEl('aq_event_pack');
const q_event_extra = getEl('aq_event_extra');
const q_inter_plan = getEl('aq_inter_plan');
const q_inter_extra = getEl('aq_inter_extra');
const lbl_inter_note = getEl('lbl_inter_note');

// 1. Test Modality 1: Ring Floor Calculation & Deposit
console.log('\nTesting Modality 1: Anillos & Floors...');
q_mode.value = '1';
q_date.value = '2026-11-04'; // Wednesday hábil
q_time.value = '10:00';
q_from.value = 'Av. Pajaritos 1000, Maipú';
q_to.value = 'Hospital El Carmen';
q_km.value = '10';
q_stay.value = '60';

vm.runInContext('onAdminAddressInput("from");', mockContext);
let qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ring.id, 1, 'Maipú must be detected as Anillo 1');
assert.strictEqual(qState.floorApplied, false);
// Circuito Completo TENS: 60m box + 10m abordaje + 60m viaje ida/vuelta = 130m -> 150m (2.5h) = $30.000 tiempo + $10.000 km = $40.000
assert.strictEqual(qState.totalFare, 40000);
assert.strictEqual(qState.abono50, 20000);
console.log('✓ Modality 1 Anillo 1 standard fare (Full Circuit TENS) passed');

// Renca (Anillo 2: $35.000 mínimo legal)
// Con 2 km y 0h box para probar aplicación estricta de piso legal:
q_from.value = 'Av. Domingo Santa María 4000, Renca';
q_km.value = '4';
q_stay.value = '30';
vm.runInContext('onAdminAddressInput("from");', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ring.id, 2);
assert.strictEqual(qState.floorApplied, true);
assert.strictEqual(qState.totalFare, 35000);
assert.strictEqual(qState.abono50, 17500);
console.log('✓ Modality 1 Anillo 2 guaranteed floor passed');

// Las Condes (Anillo 3: $50.000 mínimo legal)
q_from.value = 'Av. Apoquindo 4000, Las Condes';
q_km.value = '4';
q_stay.value = '30';
vm.runInContext('onAdminAddressInput("from");', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ring.id, 3);
assert.strictEqual(qState.floorApplied, true);
assert.strictEqual(qState.totalFare, 50000);
assert.strictEqual(qState.abono50, 25000);
console.log('✓ Modality 1 Anillo 3 guaranteed floor passed');

// 2. Test Continuous Scale Strictly Capped at 6 Hours (360 min)
console.log('\nTesting Continuous Time Scale (strictly capped at 6h)...');
const stayOptionsInCtx = vm.runInContext('STAY_HOURS_OPTIONS;', mockContext);
const maxOption = stayOptionsInCtx[stayOptionsInCtx.length - 1];
assert.strictEqual(maxOption.val, 360, 'Maximum option in STAY_HOURS_OPTIONS must be 360 min (6h Tope)');
assert(maxOption.label.includes('6 horas'), 'Max option label must indicate 6 horas');

q_from.value = 'Av. Pajaritos 1000, Maipú';
vm.runInContext('onAdminAddressInput("from");', mockContext);
q_km.value = '20'; // $20.000
q_stay.value = '360'; // 6h = 6 * 12.000 = $72.000 + $20.000 = $92.000
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 92000, '20km + 6h must equal $92.000');
assert.strictEqual(qState.durationMin, 360);
console.log('✓ Continuous scale strictly capped at 6h verified');

// 3. Test Modality 3: Cuidados a Domicilio (Official Tariff Homologation)
console.log('\nTesting Modality 3: Cuidados a Domicilio (Official Tariff Matrix Homologation)...');
q_mode.value = '3';
q_from.value = 'Av. Pajaritos 1000, Maipú'; // Anillo 1: min 2h
vm.runInContext('onAdminAddressInput("from");', mockContext);
vm.runInContext('onAdminModeChange();', mockContext);

// A) HÁBIL ($12.000/h): 2h: $24.000 | 3h: $36.000 | 4h: $48.000 | 5h: $60.000 | 6h (Tope): $72.000
q_date.value = '2026-11-04'; // Hábil
q_time.value = '10:00';
[
  { hours: 120, expected: 24000 },
  { hours: 180, expected: 36000 },
  { hours: 240, expected: 48000 },
  { hours: 300, expected: 60000 },
  { hours: 360, expected: 72000 }
].forEach(test => {
  q_stay.value = String(test.hours);
  vm.runInContext('calcAdminQuote();', mockContext);
  qState = vm.runInContext('qState;', mockContext);
  assert.strictEqual(qState.totalFare, test.expected, `Mod 3 Hábil ${test.hours/60}h must be $${test.expected}`);
});
console.log('✓ Modality 3 Hábil official matrix (2h:$24k, 3h:$36k, 4h:$48k, 5h:$60k, 6h:$72k) passed');

// B) FIN DE SEMANA ($15.000/h): 2h: $30.000 | 3h: $45.000 | 4h: $60.000 | 5h: $75.000 | 6h (Tope): $90.000
q_date.value = '2026-11-07'; // Fin de semana
[
  { hours: 120, expected: 30000 },
  { hours: 180, expected: 45000 },
  { hours: 240, expected: 60000 },
  { hours: 300, expected: 75000 },
  { hours: 360, expected: 90000 }
].forEach(test => {
  q_stay.value = String(test.hours);
  vm.runInContext('calcAdminQuote();', mockContext);
  qState = vm.runInContext('qState;', mockContext);
  assert.strictEqual(qState.totalFare, test.expected, `Mod 3 Fin de Semana ${test.hours/60}h must be $${test.expected}`);
});
console.log('✓ Modality 3 Fin de Semana official matrix (2h:$30k, 3h:$45k, 4h:$60k, 5h:$75k, 6h:$90k) passed');

// C) FESTIVO / NOCTURNO ($18.000/h): 2h: $36.000 | 3h: $54.000 | 4h: $72.000 | 5h: $90.000 | 6h (Tope cerrado especial): $96.000
q_time.value = '22:00'; // Turno Noche
[
  { hours: 120, expected: 36000 },
  { hours: 180, expected: 54000 },
  { hours: 240, expected: 72000 },
  { hours: 300, expected: 90000 },
  { hours: 360, expected: 96000 } // Beneficio cerrado especial $96.000
].forEach(test => {
  q_stay.value = String(test.hours);
  vm.runInContext('calcAdminQuote();', mockContext);
  qState = vm.runInContext('qState;', mockContext);
  assert.strictEqual(qState.totalFare, test.expected, `Mod 3 Nocturno ${test.hours/60}h must be $${test.expected}`);
});
console.log('✓ Modality 3 Festivo/Nocturno official matrix (2h:$36k, 3h:$54k, 4h:$72k, 5h:$90k, 6h especial:$96k) passed');

// 4. Test Modality 4: Eventos Sociales (Scale: $7.5k, $15k, $22.5k, $30k)
console.log('\nTesting Modality 4: Eventos Sociales (Official Extra Scale: $7.5k, $15k, $22.5k, $30k)...');
q_mode.value = '4';
q_event_subtype.value = 'sin_traslado';
q_event_pack.value = 'base'; // 4h: $65.000
q_event_extra.value = '0';
vm.runInContext('onAdminModeChange();', mockContext);

// Base 4h Sin Traslado ($65.000) + 2h extras ($30.000) = $95.000
q_event_extra.value = '120';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 95000, 'Base 4h Sin Traslado + 2h extras ($30k) must equal Plan Total 6h ($95k)');

// Base 4h Con Traslado ($95.000) + 2h extras ($30.000) = $125.000
q_event_subtype.value = 'con_traslado';
vm.runInContext('onAdminEventSubtypeChange();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 125000, 'Base 4h Con Traslado + 2h extras ($30k) must equal Plan Total 6h ($125k)');

// Check all increments
const increments = [
  { extra: '30', expected: 102500 },
  { extra: '60', expected: 110000 },
  { extra: '90', expected: 117500 },
  { extra: '120', expected: 125000 }
];
increments.forEach(inc => {
  q_event_extra.value = inc.extra;
  vm.runInContext('calcAdminQuote();', mockContext);
  qState = vm.runInContext('qState;', mockContext);
  assert.strictEqual(qState.totalFare, inc.expected);
});
console.log('✓ Modality 4 increments and tie-in passed');

// 5. Test Modality 5: Interregionales (Plan Estándar extra allowed vs Plan Crónico locked)
console.log('\nTesting Modality 5: Interregionales (Estándar vs Crónico safety lock)...');
q_mode.value = '5';
q_inter_plan.value = 'estandar';
q_inter_extra.value = '60'; // +1h = $25.000
vm.runInContext('onAdminModeChange();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(q_inter_extra.disabled, false, 'aq_inter_extra must be enabled for Programa Estándar');
assert.strictEqual(qState.totalFare, 275000, 'Estándar 4h ($250k) + 1h ($25k) = $275.000');

// Switch to Programa Crónico / Oncológico (6h)
q_inter_plan.value = 'cronico';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(q_inter_extra.disabled, true, 'aq_inter_extra must be disabled for Programa Crónico');
assert.strictEqual(q_inter_extra.value, '0', 'aq_inter_extra value must be forced to 0 for Programa Crónico');
assert.strictEqual(qState.totalFare, 300000, 'Crónico 6h must be locked at $300.000');
assert.strictEqual(qState.interExtraMin, 0);
assert(lbl_inter_note.style.display !== 'none', 'Safety warning note must be displayed for Programa Crónico');
console.log('✓ Modality 5 safety lock on Programa Crónico (6h closed coverage) passed');

// Switch back to Estándar
q_inter_plan.value = 'estandar';
vm.runInContext('calcAdminQuote();', mockContext);
assert.strictEqual(q_inter_extra.disabled, false, 'aq_inter_extra must be re-enabled when returning to Estándar');
assert.strictEqual(lbl_inter_note.style.display, 'none', 'Safety warning note must be hidden for Estándar');
console.log('✓ Modality 5 dynamic toggle passed');

// 6. Test Physical PDF Files
console.log('\nTesting Physical PDF Files...');
assert(fs.existsSync('terminos_condiciones.pdf'), 'terminos_condiciones.pdf must exist in root');
assert.strictEqual(fs.statSync('terminos_condiciones.pdf').size, 4213653, 'Root PDF size must match uploaded file');
console.log('✓ Physical PDF file (4.21 MB) verified in root');

console.log('\n🎉 ALL COTIZADOR MAESTRO AND OFFICIAL DOCUMENT TESTS PASSED PERFECTLY!\n');
