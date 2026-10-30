const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Clinical Sheet alignment in reservar.html and admin.html...\n');

const resHtml = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8') + '\n' + (fs.existsSync(path.join(__dirname, '..', 'js', 'reservar.js')) ? fs.readFileSync(path.join(__dirname, '..', 'js', 'reservar.js'), 'utf8') : '');
const admHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8') + '\n' + (fs.existsSync(path.join(__dirname, '..', 'js', 'admin.js')) ? fs.readFileSync(path.join(__dirname, '..', 'js', 'admin.js'), 'utf8') : '');

// 1. Motivo de atención label check
assert(resHtml.includes('<label for="b_dx">Motivo de atención *</label>'), 'Should have simplified label "Motivo de atención *"');
assert(!resHtml.includes('Motivo de atención o diagnóstico base *'), 'Old label must not exist');
console.log('✔ 1. Motivo de atención label simplified correctly');

// 2. Alergias check in reservar.html
assert(resHtml.includes('¿Paciente presenta alergias conocidas? *'), 'Alergias question present');
assert(resHtml.includes('name="b_allergy_radio" value="no"'), 'Radio option No present');
assert(resHtml.includes('name="b_allergy_radio" value="si"'), 'Radio option Sí present');
assert(resHtml.includes('id="allergyDetailWrap"'), 'allergyDetailWrap present');
assert(resHtml.includes('Especifique alergias (medicamentos, látex, parches, alimentos) *'), 'Mandatory detail label present');
assert(resHtml.includes('function toggleAllergyField(val)'), 'toggleAllergyField function present');
console.log('✔ 2. Alerta Clínica de Alergias UI and logic present');

// 3. Condición de movilidad (4 options exact)
const expectedMob = ['Autovalente', 'Bastón / andador', 'Silla de ruedas', 'Dependencia Severa'];
expectedMob.forEach(opt => {
  assert(resHtml.includes(`'${opt}'`), `reservar.html MOB must include ${opt}`);
  assert(admHtml.includes(`'${opt}'`), `admin.html MOB must include ${opt}`);
});
assert(!resHtml.includes('Marcha asistida / Apoyo físico de un brazo o bastón'), 'Old 6 MOB options should not exist in reservar.html');
assert(!admHtml.includes('Marcha asistida / Apoyo físico de un brazo o bastón'), 'Old 6 MOB options should not exist in admin.html');
console.log('✔ 3. Condición de movilidad contains exactly the 4 official choices in both files');

// 4. Estado de Conciencia
assert(resHtml.includes('id="b_conciencia"'), 'b_conciencia selector present');
assert(resHtml.includes('value="Lúcido / Orientado"'), 'Conciencia option Lúcido / Orientado present');
assert(resHtml.includes('value="Somnoliento"'), 'Conciencia option Somnoliento present');
assert(resHtml.includes('value="Desorientado"'), 'Conciencia option Desorientado present');
console.log('✔ 4. Estado de Conciencia selector verified');

// 5. Patologías crónicas / base
const expectedPats = [
  'HTA (Hipertensión arterial)',
  'Insulino Dependiente (Diabetes)',
  'Demencia / Alzheimer',
  'Oxígeno dependiente',
  'Asma / Uso de Inhalador',
  'Trastorno del Espectro Autista (TEA)',
  'Epilepsia',
  'Artritis',
  'Ninguna',
  'Otra patología'
];
expectedPats.forEach(pat => {
  assert(resHtml.includes(`value="${pat}"`), `Patology ${pat} missing from checkbox list`);
});
assert(resHtml.includes('id="cbPatNinguna"'), 'cbPatNinguna present');
assert(resHtml.includes('id="cbPatOtra"'), 'cbPatOtra present');
assert(resHtml.includes('id="pathologyOtherWrap"'), 'pathologyOtherWrap present');
assert(resHtml.includes('function onPathologyNingunaChange'), 'onPathologyNingunaChange present');
assert(resHtml.includes('function onPathologyOtraChange'), 'onPathologyOtraChange present');
assert(resHtml.includes('function onPathologyChange'), 'onPathologyChange present');
assert(resHtml.includes('function getSelectedPathologies'), 'getSelectedPathologies present');
console.log('✔ 5. Patologías crónicas checkboxes and interactive helpers verified');

// 6. Test interaction behavior (DOM simulator)
class MockInput {
  constructor(id, val = '', checked = false) {
    this.id = id;
    this.value = val;
    this.checked = checked;
    this.style = {};
  }
  focus() {}
}

const mockDoc = {
  elements: {},
  getElementById(id) { return this.elements[id] || null; },
  querySelectorAll(sel) {
    if(sel === '.pat-cb:checked') {
      return Object.values(this.elements).filter(el => el.isPatCb && el.checked);
    }
    if(sel === '.pat-cb') {
      return Object.values(this.elements).filter(el => el.isPatCb);
    }
    return [];
  }
};

global.document = mockDoc;
global.$ = id => mockDoc.getElementById(id.replace('#', ''));

// Setup inputs
mockDoc.elements['allergyDetailWrap'] = new MockInput('allergyDetailWrap');
mockDoc.elements['b_allergy_detail'] = new MockInput('b_allergy_detail');
mockDoc.elements['pathologyOtherWrap'] = new MockInput('pathologyOtherWrap');
mockDoc.elements['b_pathology_other'] = new MockInput('b_pathology_other');
mockDoc.elements['cbPatNinguna'] = new MockInput('cbPatNinguna', 'Ninguna');
mockDoc.elements['cbPatNinguna'].isPatCb = true;
mockDoc.elements['cbPatOtra'] = new MockInput('cbPatOtra', 'Otra patología');
mockDoc.elements['cbPatOtra'].isPatCb = true;

const hta = new MockInput('cbHta', 'HTA (Hipertensión arterial)');
hta.isPatCb = true;
mockDoc.elements['cbHta'] = hta;

// Eval functions
eval(resHtml.match(/function toggleAllergyField[\s\S]*?\n\}/)[0]);
eval(resHtml.match(/function onPathologyNingunaChange[\s\S]*?\n\}/)[0]);
eval(resHtml.match(/function onPathologyOtraChange[\s\S]*?\n\}/)[0]);
eval(resHtml.match(/function onPathologyChange[\s\S]*?\n\}/)[0]);
eval(resHtml.match(/function getSelectedPathologies[\s\S]*?\n\}/)[0]);

// Test toggleAllergyField
toggleAllergyField('si');
assert.strictEqual(mockDoc.elements['allergyDetailWrap'].style.display, 'block');
toggleAllergyField('no');
assert.strictEqual(mockDoc.elements['allergyDetailWrap'].style.display, 'none');
assert.strictEqual(mockDoc.elements['b_allergy_detail'].value, '');
console.log('✔ toggleAllergyField works as expected');

// Test Ninguna logic: checking Ninguna unchecks HTA and hides Otra
hta.checked = true;
mockDoc.elements['cbPatOtra'].checked = true;
mockDoc.elements['pathologyOtherWrap'].style.display = 'block';
mockDoc.elements['cbPatNinguna'].checked = true;
onPathologyNingunaChange(mockDoc.elements['cbPatNinguna']);
assert.strictEqual(hta.checked, false, 'HTA should be unchecked when Ninguna is checked');
assert.strictEqual(mockDoc.elements['cbPatOtra'].checked, false, 'Otra should be unchecked when Ninguna is checked');
assert.strictEqual(mockDoc.elements['pathologyOtherWrap'].style.display, 'none');

// Test checking HTA unchecks Ninguna
mockDoc.elements['cbPatNinguna'].checked = true;
hta.checked = true;
onPathologyChange(hta);
assert.strictEqual(mockDoc.elements['cbPatNinguna'].checked, false, 'Ninguna should be unchecked when HTA is checked');

// Test Otra patología detail
mockDoc.elements['cbPatOtra'].checked = true;
onPathologyOtraChange(mockDoc.elements['cbPatOtra']);
assert.strictEqual(mockDoc.elements['pathologyOtherWrap'].style.display, 'block');
mockDoc.elements['b_pathology_other'].value = 'Fibromialgia';

const selected = getSelectedPathologies();
assert(selected.includes('HTA (Hipertensión arterial)'), 'HTA included');
assert(selected.includes('Otra: Fibromialgia'), 'Otra: Fibromialgia included');
console.log('✔ Pathology mutual exclusions and getSelectedPathologies work correctly');

// 7. Verify submission payload & WhatsApp & admin display
assert(resHtml.includes('conciencia,'), 'newSvc must store conciencia');
assert(resHtml.includes('alergias: allergyText,'), 'newSvc must store alergias');
assert(resHtml.includes('patologias: pathologies,'), 'newSvc must store patologias');

assert(resHtml.includes('• Alergias conocidas: ${allergyText}'), 'waText must include alergias');
assert(resHtml.includes('• Estado de Conciencia: ${conciencia}'), 'waText must include conciencia');
assert(resHtml.includes('• Condición de Movilidad: ${mob}'), 'waText must include mob');
assert(resHtml.includes('• Patologías crónicas / Base: ${pathologiesText}'), 'waText must include pathologies');

assert(resHtml.includes('Alergias Conocidas:'), 'Summary card must include Alergias');
assert(resHtml.includes('Estado de Conciencia:'), 'Summary card must include Conciencia');
assert(resHtml.includes('Patologías Crónicas / Base:'), 'Summary card must include Patologías');

assert(admHtml.includes('s.alergias'), 'admin.html must display alergias');
assert(admHtml.includes('s.conciencia'), 'admin.html must display conciencia');
assert(admHtml.includes('s.patologias'), 'admin.html must display patologias');
console.log('✔ 6. Summary screen, WhatsApp message, and Admin view verified');

console.log('\nAll Clinical Sheet tests passed successfully! 🚀');
