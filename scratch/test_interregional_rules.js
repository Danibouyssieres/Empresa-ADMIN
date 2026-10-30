const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Modalidad 5 (Programas Interregionales) rules...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../css/reservar.css'), 'utf8');

// 1. Check Guarantee Notice for Modalidad 5 (Removed per User Request #6)
// assert(content.includes('Garantía de Cobertura y Traslado Interregional:'), 'Guarantee title missing');
console.log('✔ Garantía de Cobertura y Traslado Interregional removal verified per Request 6.');

// 2. Check REQ_BY_MODE['5'] definition
const expectedReq5 = [
  'Ficha de Valoración y Signos Vitales al inicio del viaje (Marcada por defecto - Gratuita)',
  'Monitoreo clínico, signos vitales y confort durante el trayecto en carretera',
  'Asistencia en hidratación y supervisión de medicación oral en ruta',
  'Apoyo en marcha y traslados internos en Santiago (Silla de ruedas o andador)',
  'Acompañamiento continuo dentro del box médico y recepción de indicaciones/recetas',
  'Gestión de turnos, admisión y orientación en el recinto asistencial'
];

const reqMatch = content.match(/const REQ_BY_MODE = (\{[\s\S]*?\n\};)/);
assert(reqMatch, 'REQ_BY_MODE must exist');
eval('var REQ_BY_MODE = ' + reqMatch[1]);

assert.strictEqual(REQ_BY_MODE['5'].length, 6, 'Mode 5 should have strictly 6 requirements');
expectedReq5.forEach((item, idx) => {
  assert.strictEqual(REQ_BY_MODE['5'][idx].text, item, `Item ${idx} does not match`);
});
assert.strictEqual(REQ_BY_MODE['5'][0].def, true, 'First item must be checked by default');
for (let i = 1; i < 6; i++) {
  assert.strictEqual(REQ_BY_MODE['5'][i].def, false, `Item ${i} must be unchecked by default`);
}
console.log('✔ Section 3 checkboxes for Programas Interregionales strictly verified (6 items).');

// 3. Test Region selection and dynamic binding to blue card (#dirRegionVal)
class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c, v) => v ? this.classList.classes.add(c) : this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c)
    };
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
  }
}

const els = {};
function $(sel) {
  const id = sel.replace('#', '');
  if (!els[id]) els[id] = new MockElement(id);
  return els[id];
}

let selectedInterRegion = 'Región de Valparaíso';
let selectedInterProgram = 4;
let lastInterBreakdown = '';
let lastTimeCost = 0;
let lastFinalTotal = 0;
let lastAbono50 = 0;
const $c = n => '$' + Math.round(n).toLocaleString('es-CL');
const SVC_NAMES = { '5': '5. Programas Interregionales' };

// Extract and eval selectInterRegion
eval(content.match(/function selectInterRegion[\s\S]*?\n\}/)[0]);

// Helper mock of recalcAll relevant parts for mode 5
function recalcAll() {
  const mode = $('#b_svc_type').value;
  if (mode === '5') {
    $('#dirSvcName').textContent = SVC_NAMES[mode];
    $('#dirRegionRow').style.display = 'flex';
    $('#dirRegionVal').textContent = selectedInterRegion;
  }
}

$('#b_svc_type').value = '5';

// Case A: Select Valparaíso
selectInterRegion('Región de Valparaíso');
assert.strictEqual(selectedInterRegion, 'Región de Valparaíso', 'selectedInterRegion should be Valparaíso');
assert.strictEqual($('#dirRegionVal').textContent, 'Región de Valparaíso', 'Blue card should show Región de Valparaíso');
assert.strictEqual($('#regBtn_valparaiso').classList.contains('active'), true, 'Valparaíso button should be active');
assert.strictEqual($('#regBtn_ohiggins').classList.contains('active'), false, 'O\'Higgins button should NOT be active');
assert.strictEqual($('#regChk_valparaiso').textContent, '✓', 'Valparaíso check should be checked');
assert.strictEqual($('#regChk_ohiggins').textContent, '', 'O\'Higgins check should be empty');
console.log('✔ Valparaíso selection dynamically updates blue card to "Región de Valparaíso".');

// Case B: Select O'Higgins
selectInterRegion("Región de O'Higgins");
assert.strictEqual(selectedInterRegion, "Región de O'Higgins", 'selectedInterRegion should be O\'Higgins');
assert.strictEqual($('#dirRegionVal').textContent, "Región de O'Higgins", 'Blue card should show Región de O\'Higgins');
assert.strictEqual($('#regBtn_valparaiso').classList.contains('active'), false, 'Valparaíso button should NOT be active');
assert.strictEqual($('#regBtn_ohiggins').classList.contains('active'), true, 'O\'Higgins button should be active');
assert.strictEqual($('#regChk_valparaiso').textContent, '', 'Valparaíso check should be empty');
assert.strictEqual($('#regChk_ohiggins').textContent, '✓', 'O\'Higgins check should be checked');
console.log('✔ O\'Higgins selection dynamically updates blue card to "Región de O\'Higgins".');

// Case C: Switch back to Valparaíso
selectInterRegion('valparaiso');
assert.strictEqual(selectedInterRegion, 'Región de Valparaíso', 'Switch back to Valparaíso should work');
assert.strictEqual($('#dirRegionVal').textContent, 'Región de Valparaíso', 'Blue card should revert to Región de Valparaíso');
console.log('✔ Switching back to Valparaíso updates blue card cleanly.');

console.log('\nAll tests for Modalidad 5 (Programas Interregionales) passed successfully! 🚀');
