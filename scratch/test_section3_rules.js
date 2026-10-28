const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Section 3 and Section 2 updates in reservar.html...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

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

// 3. Check b_comp options in HTML
assert(content.includes('No, paciente viaja/estará solo con la profesional (Solo adultos orientados)'), 'Option 1 for b_comp missing');
assert(content.includes('Sí, 1 acompañante familiar (Sin costo adicional)'), 'Option 2 for b_comp missing');
assert(content.includes('Sí, 2 acompañantes familiares (Máximo permitido en cabina)'), 'Option 3 for b_comp missing');
console.log('✔ b_comp contains all 3 options');

// 4. Check REQ_BY_MODE definition
assert(content.includes('const REQ_BY_MODE = {'), 'REQ_BY_MODE must be defined');
assert(content.includes('Ficha de Valoración y Signos Vitales al inicio (Marcada por defecto - Gratuita)'), 'Mode 1 default req missing');
assert(content.includes('Apoyo en marcha y traslados internos (Silla de ruedas o andador)'), 'Mode 1 req missing');
assert(content.includes('Acompañamiento dentro del box médico y toma de notas/recetas'), 'Mode 1 req missing');
assert(content.includes('Gestión de turnos, admisión en mesón o tótems'), 'Mode 1 req missing');
assert(content.includes('Asistencia de higiene, confort o acompañamiento a baño en recinto'), 'Mode 1 req missing');
assert(content.includes('Supervisión de medicación oral (según receta médica vigente aportada por la familia)'), 'Mode 1 req missing');
console.log('✔ REQ_BY_MODE for Modalidad 1 verified');

assert(content.includes('Ficha preventiva de signos vitales al inicio (Marcada por defecto - Gratuita)'), 'Mode 2 default req missing');
assert(content.includes('Apoyo físico para subir y bajar del vehículo (Embarque y desembarque seguro)'), 'Mode 2 req missing');
assert(content.includes('Estiba y traslado de andador o silla manual plegable propia en maletero'), 'Mode 2 req missing');
assert(content.includes('Solicitud de silla de ruedas o andador de la empresa para uso del familiar dentro del recinto (Sin costo)'), 'Mode 2 req missing');
console.log('✔ REQ_BY_MODE for Modalidad 2 verified');

// 5. Check Garantía de Espera Vehicular Exclusiva in Modalidad 2
assert(content.includes('Garantía de Espera Vehicular Exclusiva:'), 'Notice title for Modalidad 2 missing');
assert(content.includes('El vehículo y su conductora permanecen a su total disposición en el recinto durante todo el tiempo contratado. Si la atención demora más de lo presupuestado, el excedente se liquida al regreso en bloques de 30 minutos según la tarifa horaria de espera.'), 'Notice text for Modalidad 2 missing');
console.log('✔ Garantía de Espera Vehicular Exclusiva text verified');

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

const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Extract functions
const reqByModeMatch = content.match(/const REQ_BY_MODE = (\{[\s\S]*?\n\};)/);
eval('var REQ_BY_MODE = ' + reqByModeMatch[1]);

eval(content.match(/function renderRequirements[\s\S]*?\n\}/)[0]);
eval(content.match(/function checkCompanionRecommendation[\s\S]*?\n\}/)[0]);

// Test renderRequirements for Mode 1
renderRequirements('1');
const mode1Html = $('#reqContainer').innerHTML;
assert(mode1Html.includes('Ficha de Valoración y Signos Vitales'), 'Mode 1 must have Ficha de Valoración');
assert(mode1Html.includes('checked'), 'Mode 1 default should be checked');
assert(mode1Html.includes('box médico'), 'Mode 1 must have box médico');
assert(!mode1Html.includes('Solo traslado'), 'Mode 1 must NOT have Solo traslado');
console.log('✔ renderRequirements("1") generates correct checkboxes');

// Test renderRequirements for Mode 2
renderRequirements('2');
const mode2Html = $('#reqContainer').innerHTML;
assert(mode2Html.includes('Ficha preventiva de signos vitales'), 'Mode 2 must have Ficha preventiva');
assert(mode2Html.includes('Estiba y traslado de andador'), 'Mode 2 must have Estiba');
assert(!mode2Html.includes('box médico'), 'Mode 2 must NOT have box médico');
assert(!mode2Html.includes('higiene'), 'Mode 2 must NOT have higiene');
assert(!mode2Html.includes('medicamento'), 'Mode 2 must NOT have medicamentos');
console.log('✔ renderRequirements("2") strictly contains only vehicle/support options');

// Test checkCompanionRecommendation
// Case A: Mode 2, non-autovalente, companion 'No...' -> should show notice
$('#b_svc_type').value = '2';
$('#b_mob').value = 'Silla de ruedas';
$('#b_comp').value = 'No, paciente viaja/estará solo con la profesional (Solo adultos orientados)';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'block', 'Notice should be displayed for Mode 2 non-autovalente solo');
console.log('✔ Notice shown when Mode 2 + Non-autovalente + Solo');

// Case B: Mode 2, autovalente, companion 'No...' -> should hide notice
$('#b_mob').value = 'Autovalente';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'none', 'Notice should be hidden for autovalente');
console.log('✔ Notice hidden when Autovalente');

// Case C: Mode 2, non-autovalente, companion 'Sí...' -> should hide notice
$('#b_mob').value = 'Silla de ruedas';
$('#b_comp').value = 'Sí, 1 acompañante familiar (Sin costo adicional)';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'none', 'Notice should be hidden when companion travels');
console.log('✔ Notice hidden when companion travels');

// Case D: Mode 1, non-autovalente, companion 'No...' -> should hide notice (TENS is accompanying)
$('#b_svc_type').value = '1';
$('#b_comp').value = 'No, paciente viaja/estará solo con la profesional (Solo adultos orientados)';
checkCompanionRecommendation();
assert.strictEqual($('#compValidationNotice').style.display, 'none', 'Notice should be hidden in Mode 1');
console.log('✔ Notice hidden in Mode 1 (TENS accompanies patient)');

console.log('\nAll Section 3 verification tests passed successfully! 🎉');
