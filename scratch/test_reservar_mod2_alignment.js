const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('--- Testing reservar.html Modality 2 Alignment ---');

const html = fs.readFileSync('reservar.html', 'utf8');

// 1. Static assertions on STAY_OPTIONS_MOD2
const expectedMod2 = [
  { val: 60, text: '1 hora (Consulta estándar / Trámite breve / Compras - Base mínima)' },
  { val: 90, text: '1 hora 30 min (Notaría / Trámites bancarios / Consulta con exámenes)' },
  { val: 120, text: '2 horas (Procedimiento ambulatorio / Diligencias públicas extensas)' },
  { val: 150, text: '2 horas 30 min (Gestiones combinadas)' },
  { val: 180, text: '3 horas (Tratamientos médicos prolongados / Jornadas extensas)' },
  { val: 210, text: '3 horas 30 min (Atención médica de alta complejidad / Trámites múltiples)' },
  { val: 240, text: '4 horas (Procedimiento clínico quirúrgico ambulatorio extenso)' },
  { val: 270, text: '4 horas 30 min (Tratamientos y esperas prolongadas)' },
  { val: 300, text: '5 horas (Jornadas médicas de media jornada)' },
  { val: 330, text: '5 horas 30 min (Trámites o procedimientos extensos)' },
  { val: 360, text: '6 horas (Tope máximo de espera vehicular)' }
];

expectedMod2.forEach(opt => {
  assert(html.includes(`val: ${opt.val}`), `STAY_OPTIONS_MOD2 must have val: ${opt.val}`);
  assert(html.includes(opt.text), `STAY_OPTIONS_MOD2 must have text "${opt.text}"`);
});

// Check that 3h does not contain "o más"
assert(!html.includes('3 horas o más (Tratamientos médicos prolongados'), '3 hours option must NOT have "o más"');
console.log('✓ STAY_OPTIONS_MOD2 (1h to 6h continuous every 30 min) static verification passed');

// 2. Test in VM: dynamic update of selStayDestino
const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id: id,
      value: '60',
      textContent: '',
      innerHTML: '',
      style: {},
      disabled: false,
      attributes: {},
      getAttribute: function(a) { return this.attributes[a] || null; },
      setAttribute: function(a, v) { this.attributes[a] = String(v); },
      removeAttribute: function(a) { delete this.attributes[a]; },
      classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
      querySelectorAll: () => [],
      querySelector: () => null
    };
  }
  return elements[id];
}

const mockDoc = {
  getElementById: (id) => getEl(id),
  querySelector: (sel) => getEl(sel.replace('#', '')),
  querySelectorAll: () => [],
  addEventListener: () => {}
};

const ctx = {
  $: (sel) => mockDoc.querySelector(sel),
  document: mockDoc,
  window: { location: { href: 'http://localhost/reservar.html' } },
  console: console
};
vm.createContext(ctx);

// Run helper and options in ctx
const startMarker = 'const STAY_OPTIONS_MOD1 =';
const endMarker = 'function getJornadaLabel';
const jsSnippet = html.substring(html.indexOf(startMarker), html.indexOf(endMarker));

vm.runInContext(jsSnippet, ctx);

// Test updateStayDestinoOptions for mode 2
vm.runInContext('updateStayDestinoOptions("2");', ctx);
const selStay = mockDoc.getElementById('selStayDestino');

assert.strictEqual(selStay.getAttribute('data-stay-mode'), '2', 'Must set data-stay-mode="2"');
assert(selStay.innerHTML.includes('6 horas (Tope máximo de espera vehicular)'), 'Option 6h must be for vehicular waiting');
assert(selStay.innerHTML.includes('4 horas 30 min (Tratamientos y esperas prolongadas)'), 'Option 4h30m must be for vehicular waiting');
assert(selStay.innerHTML.includes('3 horas (Tratamientos médicos prolongados / Jornadas extensas)'), 'Option 3h must not have "o más"');
assert(selStay.innerHTML.includes('3 horas 30 min (Atención médica de alta complejidad / Trámites múltiples)'), 'Option 3h30m must have multiples');
console.log('✓ Dynamic update to Modalidad 2 options verified in VM');

// Test updateStayDestinoOptions for mode 1
vm.runInContext('updateStayDestinoOptions("1");', ctx);
assert.strictEqual(selStay.getAttribute('data-stay-mode'), '1', 'Must restore data-stay-mode="1"');
assert(selStay.innerHTML.includes('6 horas (Tope máximo de cobertura ambulatoria)'), 'Option 6h must be for clinical assistance');
assert(selStay.innerHTML.includes('4 horas 30 min (Tratamientos y recuperaciones prolongadas)'), 'Option 4h30m must be for clinical assistance');
console.log('✓ Dynamic switch back to Modalidad 1 options verified in VM');

console.log('\n🎉 ALL RESERVAR.HTML MODALITY 2 ALIGNMENT TESTS PASSED!\n');
