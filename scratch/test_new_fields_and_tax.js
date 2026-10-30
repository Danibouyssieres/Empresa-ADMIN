const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST SUITE: NEW FIELDS (DEPTO, OBS, TAX DOC) IN RESERVAR.HTML ---');

const htmlPath = path.resolve(__dirname, '../reservar.html');
const html = fs.readFileSync(htmlPath, 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../css/reservar.css'), 'utf8');

// 1. Check HTML elements and labels
assert(html.includes('id="b_depto"'), 'b_depto input must exist');
assert(html.includes('Depto / Block / N° de Casa / Nombre de Condominio (Opcional)'), 'b_depto label must match');
assert(html.includes('Ej: Depto 504, Torre B / Condominio Los Robles'), 'b_depto placeholder must match');
console.log('✔ Campo Depto / Block / Villa verified.');

assert(html.includes('id="b_obs"'), 'b_obs textarea must exist');
assert(html.includes('Observaciones especiales o indicaciones para la llegada (Opcional)'), 'b_obs label must match');
assert(html.includes('Indique detalles de acceso, timbres, si usa oxígeno portátil propio, propensión a mareos o cualquier indicación puntual para la profesional.'), 'b_obs placeholder must match');
console.log('✔ Campo Observaciones verified.');

assert(html.includes('name="b_tax_doc"'), 'b_tax_doc radio group must exist');
assert(html.includes('Boleta Electrónica Exenta (Pacientes particulares / Reembolsos)'), 'Boleta label must match');
assert(html.includes('Factura Electrónica Exenta (Empresas, Fundaciones o ELEAM)'), 'Factura label must match');
assert(html.includes('id="invoiceFieldsBox"'), 'invoiceFieldsBox container must exist');
assert(html.includes('id="b_tax_rs"'), 'b_tax_rs field must exist');
assert(html.includes('id="b_tax_rut"'), 'b_tax_rut field must exist');
assert(html.includes('id="b_tax_giro"'), 'b_tax_giro field must exist');
assert(html.includes('id="b_tax_dir"'), 'b_tax_dir field must exist');
console.log('✔ Selector y campos de Documento Tributario (Boleta / Factura) verified.');

// 2. Test toggleTaxDocFields function in VM context
const vm = require('vm');
const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi)];
const jsResPath = path.resolve(__dirname, '../js/reservar.js');
let scriptContent = fs.existsSync(jsResPath) ? fs.readFileSync(jsResPath, 'utf8') : (scriptMatches[1] ? scriptMatches[1][1] : '');
scriptContent = scriptContent.replace('initForm();', '// initForm();');

const domElements = {
  invoiceFieldsBox: { style: { display: 'none' } },
  b_tax_rs: { required: false, value: '' },
  b_tax_rut: { required: false, value: '' },
  b_tax_giro: { required: false, value: '' },
  b_tax_dir: { required: false, value: '' }
};

const mockWindow = {
  document: {
    addEventListener: () => {},
    getElementById: (id) => domElements[id] || { style: {}, innerHTML: '', value: '', addEventListener: () => {} },
    querySelector: (sel) => {
      const id = sel.replace('#', '');
      return domElements[id] || { style: {}, innerHTML: '', value: '', addEventListener: () => {} };
    },
    querySelectorAll: () => []
  },
  $: (sel) => {
    const id = sel.replace('#', '');
    return domElements[id] || { style: {}, innerHTML: '', value: '', addEventListener: () => {} };
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
  L: {
    map: () => {
      const m = { setView: () => m, on: () => m };
      return m;
    },
    tileLayer: () => ({ addTo: () => {} }),
    marker: () => ({ addTo: () => {}, bindPopup: () => {} }),
    polyline: () => ({ addTo: () => {} }),
    icon: () => ({}),
    divIcon: () => ({})
  },
  console: console
};
mockWindow.window = mockWindow;
mockWindow.globalThis = mockWindow;

const context = vm.createContext(mockWindow);
vm.runInContext(scriptContent, context);

// Test toggleTaxDocFields('factura')
vm.runInContext("toggleTaxDocFields('factura');", context);
assert.strictEqual(domElements.invoiceFieldsBox.style.display, 'block', 'invoiceFieldsBox must be visible on factura');
assert.strictEqual(domElements.b_tax_rs.required, true, 'b_tax_rs must be required on factura');
assert.strictEqual(domElements.b_tax_rut.required, true, 'b_tax_rut must be required on factura');
assert.strictEqual(domElements.b_tax_giro.required, true, 'b_tax_giro must be required on factura');
assert.strictEqual(domElements.b_tax_dir.required, true, 'b_tax_dir must be required on factura');
console.log('✔ toggleTaxDocFields("factura") activates fields and sets required.');

// Test toggleTaxDocFields('boleta')
vm.runInContext("toggleTaxDocFields('boleta');", context);
assert.strictEqual(domElements.invoiceFieldsBox.style.display, 'none', 'invoiceFieldsBox must be hidden on boleta');
assert.strictEqual(domElements.b_tax_rs.required, false, 'b_tax_rs must not be required on boleta');
console.log('✔ toggleTaxDocFields("boleta") hides fields and clears required.');

// 3. Check admin.html integration
const adminHtmlPath = path.resolve(__dirname, '../admin.html');
const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../js/admin.js'), 'utf8');
assert(adminHtml.includes('s.depto'), 'admin.html must reference s.depto');
assert(adminHtml.includes('s.obs'), 'admin.html must reference s.obs');
assert(adminHtml.includes('s.taxDoc'), 'admin.html must reference s.taxDoc');
console.log('✔ admin.html successfully updated to display Depto, Obs and TaxDoc in detail and cards.');

console.log('\nAll tests passed successfully! 🚀');
