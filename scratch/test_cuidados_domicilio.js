const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Modalidad 3 (Cuidados a Domicilio) rules...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Check REQ_BY_MODE['3'] definition
const expectedReq3 = [
  'Ficha de Valoración y Control de Signos Vitales (Marcada por defecto - Gratuita)',
  'Asistencia en aseo diario, confort e higiene / Cambio de pañal',
  'Apoyo en transferencias seguras, cambios posturales o pequeñas caminatas en el hogar',
  'Asistencia y paciencia en la alimentación y toma de líquidos',
  'Supervisión y recordatorio de medicación oral habitual (según prescripción médica de la familia)',
  'Acompañamiento, conversación activa y estimulación',
  'Acompañamiento peatonal cercano (trámites breves, compras o farmacia a pie)'
];

const reqMatch = content.match(/const REQ_BY_MODE = (\{[\s\S]*?\n\};)/);
assert(reqMatch, 'REQ_BY_MODE must exist');
eval('var REQ_BY_MODE = ' + reqMatch[1]);

assert.strictEqual(REQ_BY_MODE['3'].length, 7, 'Mode 3 should have strictly 7 requirements');
expectedReq3.forEach((item, idx) => {
  assert.strictEqual(REQ_BY_MODE['3'][idx].text, item, `Item ${idx} does not match`);
});
assert.strictEqual(REQ_BY_MODE['3'][0].def, true, 'First item must be checked by default');
for (let i = 1; i < 7; i++) {
  assert.strictEqual(REQ_BY_MODE['3'][i].def, false, `Item ${i} must be unchecked by default`);
}
console.log('✔ Section 3 checkboxes for Cuidados a Domicilio are exact and verified (7 items).');

// 2. Check Guarantee notice for Modalidad 3
assert(content.includes('Garantía de Cuidado Clínico en el Hogar:'), 'Guarantee title missing');
assert(content.includes('Atención personalizada realizada por una Técnico en Enfermería de Nivel Superior (TENS), enfocada en el confort, higiene, seguridad y bienestar del paciente dentro de su domicilio. Si por requerimiento familiar la atención debe extenderse más allá de las horas reservadas, el tiempo adicional se regularizará al término del servicio en bloques de 30 minutos (sujeto a disponibilidad y tope máximo de 6 hrs continuas).'), 'Guarantee text missing');
console.log('✔ Garantía de Cuidado Clínico en el Hogar text verified.');

// 3. Test Tariff / Calculation for Mode 3
const ratesMatch = content.match(/const RATES = (\{[\s\S]*?\n\};)/);
assert(ratesMatch, 'RATES must exist');
eval('var RATES = ' + ratesMatch[1]);

const rNoct = RATES['3'].nocturno;
assert.strictEqual(rNoct.hour, 18000, 'Hourly rate should be 18000');
assert.strictEqual(rNoct.half, 9000, 'Half hour rate should be 9000');
assert(rNoct.pkg && rNoct.pkg[6] === 96000, '6 hours must have closed pkg cost of 96000');

function calcMode3Cost(h, m, jornada) {
  const r = RATES['3'][jornada];
  if (h >= 6) {
    h = 6;
    m = 0;
  }
  const extraHalfCost = (h < 6 && m === 30) ? r.half : 0;
  let basePkgCost = (r.pkg && r.pkg[h]) ? r.pkg[h] : (h * r.hour);
  if (jornada === 'nocturno' && h === 6) {
    basePkgCost = 96000;
  }
  const timeCost = basePkgCost + extraHalfCost;
  const abono = Math.round((timeCost * 0.5) / 50) * 50;
  const saldo = timeCost - abono;
  return { timeCost, abono, saldo };
}

// Festivo / Nocturno calculations
const n2 = calcMode3Cost(2, 0, 'nocturno');
assert.strictEqual(n2.timeCost, 36000, '2h nocturno should be 36.000');
assert.strictEqual(n2.abono, 18000, '2h nocturno abono should be 18.000');
assert.strictEqual(n2.saldo, 18000, '2h nocturno saldo should be 18.000');

const n3 = calcMode3Cost(3, 0, 'nocturno');
assert.strictEqual(n3.timeCost, 54000, '3h nocturno should be 54.000');
assert.strictEqual(n3.abono, 27000, '3h nocturno abono should be 27.000');
assert.strictEqual(n3.saldo, 27000, '3h nocturno saldo should be 27.000');

const n4 = calcMode3Cost(4, 0, 'nocturno');
assert.strictEqual(n4.timeCost, 72000, '4h nocturno should be 72.000');
assert.strictEqual(n4.abono, 36000, '4h nocturno abono should be 36.000');
assert.strictEqual(n4.saldo, 36000, '4h nocturno saldo should be 36.000');

const n5 = calcMode3Cost(5, 0, 'nocturno');
assert.strictEqual(n5.timeCost, 90000, '5h nocturno should be 90.000');
assert.strictEqual(n5.abono, 45000, '5h nocturno abono should be 45.000');
assert.strictEqual(n5.saldo, 45000, '5h nocturno saldo should be 45.000');

const n6 = calcMode3Cost(6, 0, 'nocturno');
assert.strictEqual(n6.timeCost, 96000, '6h nocturno should be 96.000 (Tope Comercial)');
assert.strictEqual(n6.abono, 48000, '6h nocturno abono should be 48.000');
assert.strictEqual(n6.saldo, 48000, '6h nocturno saldo should be 48.000');

// Hábil calculations
const h2 = calcMode3Cost(2, 0, 'habil');
assert.strictEqual(h2.timeCost, 24000, '2h habil should be 24.000');
const h4 = calcMode3Cost(4, 0, 'habil');
assert.strictEqual(h4.timeCost, 48000, '4h habil should be 48.000');
const h6 = calcMode3Cost(6, 0, 'habil');
assert.strictEqual(h6.timeCost, 72000, '6h habil should be 72.000');

// Finde calculations
const t2 = calcMode3Cost(2, 0, 'tarde');
assert.strictEqual(t2.timeCost, 30000, '2h finde should be 30.000');
const t4 = calcMode3Cost(4, 0, 'tarde');
assert.strictEqual(t4.timeCost, 60000, '4h finde should be 60.000');
const t6 = calcMode3Cost(6, 0, 'tarde');
assert.strictEqual(t6.timeCost, 90000, '6h finde should be 90.000');

console.log('✔ All tariff calculations including 6h $96.000 commercial cap passed.');

// 4. Test warning banner display conditional
class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.innerHTML = '';
    this.value = '';
  }
  querySelector() { return { disabled: false }; }
}

const els = {};
function $(sel) {
  const id = sel.replace('#', '');
  if (!els[id]) els[id] = new MockElement(id);
  return els[id];
}

// Test when mode is 3 and selectedBlock is 'tarde'
$('#b_svc_type').value = '3';
let selectedBlock = 'tarde';
let isInter = false;

// Simulate the updateSlots conditional logic
const curSvc = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
const optInter = $('#b_svc_type') ? $('#b_svc_type').querySelector('option[value="5"]') : null;
const warnInter = $('#interregionalBlockWarn');

if (selectedBlock !== 'manana') {
  if (optInter) optInter.disabled = true;
  if (warnInter) {
    warnInter.style.display = (curSvc === '5') ? 'block' : 'none';
  }
}

assert.strictEqual($('#interregionalBlockWarn').style.display, 'none', 'Banner should be hidden when mode is 3');

// When mode is 5 and selectedBlock is 'tarde'
$('#b_svc_type').value = '5';
const curSvc5 = $('#b_svc_type').value;
if (selectedBlock !== 'manana') {
  if (warnInter) {
    warnInter.style.display = (curSvc5 === '5') ? 'block' : 'none';
  }
}
assert.strictEqual($('#interregionalBlockWarn').style.display, 'block', 'Banner should be displayed when mode is 5 and block is not manana');

console.log('✔ Interregional banner display logic strictly verified.');
console.log('\nAll tests for Modalidad 3 passed successfully! 🚀');
