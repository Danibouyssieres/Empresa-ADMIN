const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing Cotizador Maestro: 5 Modalities, Communes, Floor Pricing & Continuous Time up to 12h ---');

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

// 1. Test Modality 1: Ring Floor Calculation & Deposit
console.log('\nTesting Modality 1: Anillos & Floors...');
// Test 1A: Maipú (Anillo 1: $18.000). 10km ($10.000) + 1h ($12.000) = $22.000 > $18.000
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
assert.strictEqual(qState.floorApplied, false, 'Floor should not be applied since $22.000 > $18.000');
assert.strictEqual(qState.totalFare, 22000, 'Total should be $22.000');
assert.strictEqual(qState.abono50, 11000, 'Abono 50% should be $11.000');
console.log('✓ Modality 1 Anillo 1 standard fare passed');

// Test 1B: Renca (Anillo 2: $35.000). 10km ($10.000) + 1h ($12.000) = $22.000 < $35.000
q_from.value = 'Av. Domingo Santa María 4000, Renca';
vm.runInContext('onAdminAddressInput("from");', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ring.id, 2, 'Renca must be detected as Anillo 2');
assert.strictEqual(qState.floorApplied, true, 'Floor should be applied for Anillo 2');
assert.strictEqual(qState.totalFare, 35000, 'Total should be elevated to Anillo 2 floor $35.000');
assert.strictEqual(qState.abono50, 17500, 'Abono 50% must be calculated on the floor: $17.500');
assert.strictEqual(qState.saldo50, 17500, 'Saldo 50% must be $17.500');
console.log('✓ Modality 1 Anillo 2 guaranteed floor passed');

// Test 1C: Las Condes (Anillo 3: $50.000). 10km ($10.000) + 1h ($12.000) = $22.000 < $50.000
q_from.value = 'Av. Apoquindo 4000, Las Condes';
vm.runInContext('onAdminAddressInput("from");', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ring.id, 3, 'Las Condes must be detected as Anillo 3');
assert.strictEqual(qState.floorApplied, true, 'Floor should be applied for Anillo 3');
assert.strictEqual(qState.totalFare, 50000, 'Total should be elevated to Anillo 3 floor $50.000');
assert.strictEqual(qState.abono50, 25000, 'Abono 50% must be calculated on the floor: $25.000');
console.log('✓ Modality 1 Anillo 3 guaranteed floor passed');

// 2. Test Continuous Scale up to 12 Hours (720 min)
console.log('\nTesting Continuous Time Scale (up to 12 hours)...');
q_from.value = 'Av. Pajaritos 1000, Maipú';
q_km.value = '20'; // $20.000
q_stay.value = '270'; // 4h 30m = 4.5 * 12.000 = $54.000
vm.runInContext('onAdminAddressInput("from");', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 74000, '20km + 4h30m should equal $74.000');

q_stay.value = '330'; // 5h 30m = 5.5 * 12.000 = $66.000
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 86000, '20km + 5h30m should equal $86.000');

// Test 12 hours (720 min) = 12 * $12.000 = $144.000 + $20.000 = $164.000
q_stay.value = '720';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 164000, '20km + 12h should equal $164.000');
assert.strictEqual(qState.abono50, 82000, 'Abono 50% should be $82.000');
assert.strictEqual(qState.saldo50, 82000, 'Saldo 50% should be $82.000');
console.log('✓ Continuous scale (4h 30m, 5h 30m up to 12h) passed');

// 3. Test Modality 1 & 2 Rates across Jornadas
console.log('\nTesting Rates across Jornadas (Hábil, Fin de Semana, Festivo/Nocturno)...');
// Mod 1 Fin de Semana: Sábado 2026-11-07 10:00 -> $15.000/h
q_date.value = '2026-11-07';
q_stay.value = '120'; // 2h * 15.000 = $30.000 + 20km ($20.000) = $50.000
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.jornada, 'finde');
assert.strictEqual(qState.ratePerHour, 15000);
assert.strictEqual(qState.totalFare, 50000);
console.log('✓ Modality 1 Weekend rate ($15.000/h) passed');

// Mod 1 Holiday: Navidad 2026-12-25 10:00 -> $18.000/h
q_date.value = '2026-12-25';
q_stay.value = '120'; // 2h * 18.000 = $36.000 + 20km ($20.000) = $56.000
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.jornada, 'nocturno');
assert.strictEqual(qState.ratePerHour, 18000);
assert.strictEqual(qState.totalFare, 56000);
console.log('✓ Modality 1 Holiday rate ($18.000/h) passed');

// Mod 2 Rates: Hábil ($8.000/h), Fin de semana ($10.000/h), Nocturno/Festivo ($12.000/h)
q_mode.value = '2';
q_date.value = '2026-11-04'; // Hábil
q_stay.value = '120'; // 2h * 8.000 = $16.000 + 20km ($20.000) = $36.000
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ratePerHour, 8000);
assert.strictEqual(qState.totalFare, 36000);

q_date.value = '2026-11-07'; // Fin de semana
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ratePerHour, 10000);
assert.strictEqual(qState.totalFare, 40000); // 2h * 10k + 20k

q_date.value = '2026-12-25'; // Festivo
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.ratePerHour, 12000);
assert.strictEqual(qState.totalFare, 44000); // 2h * 12k + 20k
console.log('✓ Modality 2 rates across all jornadas passed');

// 4. Test Modality 3: Cuidados a Domicilio (Sin Traslado, up to 12h)
console.log('\nTesting Modality 3: Cuidados a Domicilio (Ring minimum hours, $0 Km & up to 12h)...');
q_mode.value = '3';
q_date.value = '2026-11-04'; // Hábil
q_time.value = '10:00';
q_from.value = 'Av. Apoquindo 4000, Las Condes'; // Anillo 3: min 4 hours
vm.runInContext('onAdminModeChange();', mockContext);
vm.runInContext('onAdminAddressInput("from");', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.kmCost, 0, 'Km cost must be 0 in Modality 3');
assert.strictEqual(qState.durationMin >= 240, true, 'Anillo 3 must enforce min 4 hours (240 min)');
assert.strictEqual(qState.totalFare, 48000, '4 hours at $12.000/h should equal $48.000');

// Test 12 hours in Modality 3 = 12 * $12.000 = $144.000
q_stay.value = '720';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 144000, 'Modality 3 12h should equal $144.000');

// Night shift 6 hours: Pack Noche benefit = $96.000
q_time.value = '22:00';
q_stay.value = '360';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.jornada, 'nocturno');
assert.strictEqual(qState.totalFare, 96000, 'Modality 3 6h night pack benefit must be $96.000');
console.log('✓ Modality 3 ring minimum hours, 12h max and $96.000 night pack benefit passed');

// 5. Test Modality 4: Acompañamiento en Eventos Sociales (Corrected Extra Rates: $6k/30m, $12k/1h, $18k/1.5h, $24k/2h)
console.log('\nTesting Modality 4: Eventos Sociales (Corrected Extra Rates: $6k, $12k, $18k, $24k)...');
q_mode.value = '4';
q_event_subtype.value = 'sin_traslado';
q_event_pack.value = 'base'; // 4h: $65.000
q_event_extra.value = '0';
vm.runInContext('onAdminModeChange();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 65000, 'Plan Base Sin Traslado must be $65.000');

q_event_subtype.value = 'con_traslado';
vm.runInContext('onAdminEventSubtypeChange();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 95000, 'Plan Base Con Traslado must be $95.000');

// +30 min -> +$6.000 (total $101.000)
q_event_extra.value = '30';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 101000, 'Plan Base Con Traslado + 30m must be $101.000 (+$6.000)');

// +1 hora -> +$12.000 (total $107.000)
q_event_extra.value = '60';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 107000, 'Plan Base Con Traslado + 1h must be $107.000 (+$12.000)');

// +1 hora 30 min -> +$18.000 (total $113.000)
q_event_extra.value = '90';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 113000, 'Plan Base Con Traslado + 1h30m must be $113.000 (+$18.000)');

// +2 horas (Tope) -> +$24.000 (total $119.000)
q_event_extra.value = '120';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 119000, 'Plan Base Con Traslado + 2h must be $119.000 (+$24.000)');
assert.strictEqual(qState.durationMin, 360, 'Duration must be 240 + 120 = 360 min');
console.log('✓ Modality 4 corrected extra rates (+$6k, +$12k, +$18k, +$24k) passed');

// 6. Test Modality 5: Programas Interregionales (Capped at 2h: 0, 30m, 1h, 1.5h, 2h)
console.log('\nTesting Modality 5: Programas Interregionales (Capped strictly at 2 hours)...');
q_mode.value = '5';
q_inter_plan.value = 'estandar'; // 4h: $250.000
q_inter_extra.value = '0';
vm.runInContext('onAdminModeChange();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 250000, 'Programa Estándar must be $250.000');

// +30m: +$15.000
q_inter_extra.value = '30';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 265000, 'Programa Estándar + 30m must be $265.000');

// +1h: +$25.000
q_inter_extra.value = '60';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 275000, 'Programa Estándar + 1h must be $275.000');

// +1h30m: +$40.000
q_inter_extra.value = '90';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 290000, 'Programa Estándar + 1h30m must be $290.000');

// +2h (Tope): +$50.000
q_inter_extra.value = '120';
vm.runInContext('calcAdminQuote();', mockContext);
qState = vm.runInContext('qState;', mockContext);
assert.strictEqual(qState.totalFare, 300000, 'Programa Estándar + 2h must be $300.000 (+$50.000)');
assert.strictEqual(qState.durationMin, 360, 'Duration must be 240 + 120 = 360 min');

// Verify that INTER_EXTRAS has no options above 120 min
const interExtrasInContext = vm.runInContext('INTER_EXTRAS;', mockContext);
assert.strictEqual(interExtrasInContext['150'], undefined, '+2h 30m option must be removed');
assert.strictEqual(interExtrasInContext['180'], undefined, '+3h option must be removed');
console.log('✓ Modality 5 capped strictly at 2 hours passed');

// 7. Test Buffer Info Text Format
console.log('\nTesting Operational Buffer Information with extended time...');
const bufInfo = getEl('admin_buffer_info');
assert(bufInfo.innerHTML.includes('(2 horas)'), 'Buffer info must state (2 horas)');
console.log('✓ Operational Buffer information (2 horas) verified');

// 8. Test WhatsApp Quotation Formatting
console.log('\nTesting WhatsApp quotation generation...');
vm.runInContext('sendAdminQuoteWhatsApp();', mockContext);
assert(openedUrl !== null, 'WhatsApp URL must be opened');
assert(openedUrl.includes('TOTAL%20COTIZADO'), 'Quotation message must include TOTAL COTIZADO');
assert(openedUrl.includes('Abono%2050%25'), 'Quotation message must include Abono 50%');
console.log('✓ WhatsApp quotation formatting passed');

console.log('\n🎉 ALL 5 MODALITIES EXTENDED & RATE CORRECTION TESTS PASSED PERFECTLY!\n');
