const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Section 3 simplification in reservar.html...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../css/reservar.css'), 'utf8');

// 1. Check MOB array definitions
assert(content.includes('const MOB = ['), 'MOB array should be defined');
assert(content.includes("'Autovalente'"), 'Option Autovalente missing');
assert(content.includes("'Bastón / andador'"), 'Option Bastón / andador missing');
assert(content.includes("'Silla de ruedas'"), 'Option Silla de ruedas missing');
assert(content.includes("'Dependencia Severa'"), 'Option Dependencia Severa missing');
console.log('✔ MOB array contains the 4 official choices');

// 2. Check helper text under b_mob
assert(content.includes('Por capacidad vehicular, no se admiten sillas neurológicas rígidas ni motorizadas.'), 'Helper text for b_mob missing');
console.log('✔ b_mob helper text present');

// 3. Check b_comp label and options in HTML
assert(content.includes('¿El paciente viaja solo o acompañado? *'), 'Label for b_comp should be updated');
assert(content.includes('<option value="Sí, viaja solo">Sí, viaja solo</option>'), 'Option 1 for b_comp missing');
assert(content.includes('<option value="No, viaja con 1 acompañante">No, viaja con 1 acompañante</option>'), 'Option 2 for b_comp missing');
assert(content.includes('<option value="No, viaja con 2 acompañantes (máximo permitido)">No, viaja con 2 acompañantes (máximo permitido)</option>'), 'Option 3 for b_comp missing');
console.log('✔ b_comp contains label and exactly the 3 updated options');

// 4. Verify removal of Requerimientos Asistenciales container
assert(!content.includes('id="reqContainer"'), 'reqContainer must be removed from HTML');
assert(!content.includes('Requerimientos asistenciales durante la atención (puede marcar varios)'), 'Requerimientos heading must be removed');
console.log('✔ Requerimientos asistenciales block completely removed');

// 5. Verify Observaciones especiales field
assert(content.includes('Observaciones especiales o indicaciones para la llegada (Opcional)'), 'Observaciones label present');
assert(content.includes('Indique detalles de acceso, timbres, si usa oxígeno portátil propio, propensión a mareos o cualquier indicación puntual para la profesional.'), 'Observaciones placeholder updated');
console.log('✔ Observaciones placeholder and label verified');

// 6. Test logic with a DOM simulator
class ElementMock {
  constructor(id) {
    this.id = id;
    this.value = '';
    this.innerHTML = '';
    this.style = {};
    this.children = [];
  }
}

const elements = {};
function $(sel) {
  const id = sel.replace('#', '');
  if (!elements[id]) {
    elements[id] = new ElementMock(id);
  }
  return elements[id];
}

eval(content.match(/function checkCompanionRecommendation[\s\S]*?\n\}/)[0]);

// Test checkCompanionRecommendation
// Case A: Mode 2, non-autovalente, travels solo -> should show notice
$('#b_svc_type').value = '2';
$('#b_mob').value = 'Silla de ruedas';
$('#b_comp').value = 'Sí, viaja solo';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'block', 'Notice should be displayed for Mode 2 non-autovalente solo');
console.log('✔ Notice shown when Mode 2 + Non-autovalente + "Sí, viaja solo"');

// Case B: Mode 2, autovalente, travels solo -> should hide notice
$('#b_mob').value = 'Autovalente';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'none', 'Notice should be hidden for autovalente');
console.log('✔ Notice hidden when Autovalente');

// Case C: Mode 2, non-autovalente, travels with 1 companion -> should hide notice
$('#b_mob').value = 'Silla de ruedas';
$('#b_comp').value = 'No, viaja con 1 acompañante';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'none', 'Notice should be hidden when companion travels');
console.log('✔ Notice hidden when companion travels ("No, viaja con 1 acompañante")');

// Case D: Mode 1, non-autovalente, travels solo -> should hide notice (TENS is accompanying)
$('#b_svc_type').value = '1';
$('#b_comp').value = 'Sí, viaja solo';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'none', 'Notice should be hidden in Mode 1');
console.log('✔ Notice hidden in Mode 1 (TENS accompanies patient)');

console.log('\nAll Section 3 simplification verification tests passed successfully! 🎉');
