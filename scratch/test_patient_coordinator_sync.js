const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Patient and Coordinator synchronization in reservar.html and admin.html...\n');

const resHtml = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'reservar.js'), 'utf8');
const admHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'admin.js'), 'utf8');

// 1. Verify HTML elements in Section 3
assert(resHtml.includes('id="b_pat_phone"'), 'b_pat_phone input must exist');
assert(resHtml.includes('Teléfono móvil del paciente (+569)'), 'b_pat_phone label must match');
console.log('✔ 1. Section 3 patient phone field verified.');

// 2. Verify HTML elements in Section 4
assert(resHtml.includes('id="cbCoordSameAsPatient"'), 'cbCoordSameAsPatient checkbox must exist');
assert(resHtml.includes('¿La coordinación es directamente con el paciente? (PACIENTE: Coordinar con la misma persona)'), 'Checkbox label must match');
console.log('✔ 2. Section 4 coordinator same-as-patient checkbox verified.');

// 3. Test JS synchronization logic
class MockInput {
  constructor(id, val = '', checked = false) {
    this.id = id;
    this.value = val;
    this.checked = checked;
    this.focused = false;
  }
  focus() { this.focused = true; }
}

const mockDoc = {
  elements: {},
  getElementById(id) { return this.elements[id] || null; }
};

global.document = mockDoc;
global.$ = id => mockDoc.getElementById(id.replace('#', ''));

mockDoc.elements['b_pat'] = new MockInput('b_pat', 'María Ignacia Toro');
mockDoc.elements['b_pat_phone'] = new MockInput('b_pat_phone', '98765432');
mockDoc.elements['b_coord'] = new MockInput('b_coord');
mockDoc.elements['b_ph'] = new MockInput('b_ph');
mockDoc.elements['cbCoordSameAsPatient'] = new MockInput('cbCoordSameAsPatient', '', false);

// Eval functions from reservar.html
eval(resHtml.match(/function toggleCoordSameAsPatient[\s\S]*?\n\}/)[0]);
eval(resHtml.match(/function onPatientFieldInput[\s\S]*?\n\}/)[0]);
eval(resHtml.match(/function onCoordManualInput[\s\S]*?\n\}/)[0]);

// Case A: Check "PACIENTE" -> Autocompletes name and phone
mockDoc.elements['cbCoordSameAsPatient'].checked = true;
toggleCoordSameAsPatient(true);
assert.strictEqual(mockDoc.elements['b_coord'].value, 'María Ignacia Toro', 'b_coord should match patient');
assert.strictEqual(mockDoc.elements['b_ph'].value, '98765432', 'b_ph should match patient phone');
console.log('✔ Checking PACIENTE autocompletes coordinator fields.');

// Case B: Real-time sync when patient fields change while checked
mockDoc.elements['b_pat'].value = 'María Ignacia Toro Ovalle';
mockDoc.elements['b_pat_phone'].value = '91234567';
onPatientFieldInput();
assert.strictEqual(mockDoc.elements['b_coord'].value, 'María Ignacia Toro Ovalle', 'b_coord should update in real time');
assert.strictEqual(mockDoc.elements['b_ph'].value, '91234567', 'b_ph should update in real time');
console.log('✔ Real-time sync updates coordinator fields on patient edit.');

// Case C: Uncheck "PACIENTE" -> Clears fields and focuses b_coord
mockDoc.elements['cbCoordSameAsPatient'].checked = false;
toggleCoordSameAsPatient(false);
assert.strictEqual(mockDoc.elements['b_coord'].value, '', 'b_coord should be cleared');
assert.strictEqual(mockDoc.elements['b_ph'].value, '', 'b_ph should be cleared');
assert.strictEqual(mockDoc.elements['b_coord'].focused, true, 'b_coord should receive focus');
console.log('✔ Unchecking clears fields and gives focus.');

// Case D: Manual editing unchecks checkbox
mockDoc.elements['cbCoordSameAsPatient'].checked = true;
toggleCoordSameAsPatient(true);
mockDoc.elements['b_coord'].value = 'Carlos Toro (Hijo)';
onCoordManualInput();
assert.strictEqual(mockDoc.elements['cbCoordSameAsPatient'].checked, false, 'Checkbox should uncheck when manual edit differs');
console.log('✔ Manual override safely unchecks sync box.');

// 4. Verify WhatsApp and Summary generation in reservar.html
assert(resHtml.includes('isSameAsPatient'), 'isSameAsPatient logic must exist in submitBooking');
assert(resHtml.includes('• Coordinación: Directa con el Paciente'), 'Direct patient coordination in WhatsApp');
assert(resHtml.includes('• Coordinación: Familiar / Tutor'), 'Family/Tutor coordination in WhatsApp');
assert(resHtml.includes('Directa con el Paciente'), 'Summary card must reflect Directa con el Paciente');
assert(resHtml.includes('Familiar / Tutor'), 'Summary card must reflect Familiar / Tutor');
console.log('✔ 4. WhatsApp and summary screen distinctions verified.');

// 5. Verify admin.html
assert(admHtml.includes('s.coordType===\'paciente\''), 'admin.html must distinguish patient coordination');
assert(admHtml.includes('s.patPhone'), 'admin.html must show patient phone when available');
console.log('✔ 5. admin.html displays coordination type and patient phone.');

console.log('\nAll patient/coordinator sync tests passed successfully! 🚀');
