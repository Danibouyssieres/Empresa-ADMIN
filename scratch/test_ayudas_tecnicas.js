const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Ayudas Técnicas in reservar.html, admin.html and api/reservas.js ---');

const resHtml = fs.readFileSync('reservar.html', 'utf8');
const admHtml = fs.readFileSync('admin.html', 'utf8');
const apiCode = fs.readFileSync('api/reservas.js', 'utf8');

const EXPECTED_OPTIONS = [
  'Ninguna (autovalente / no requiere implementos)',
  'Silla de Ruedas del servicio (traslado y confort en clínica / salón de eventos)',
  'Andador / Burrito de apoyo del servicio',
  'Bastón de apoyo del servicio',
  'Paciente cuenta con implemento propio plegable'
];

// 1. Check label and options in reservar.html
assert(resHtml.includes('¿Requiere apoyo de Ayuda Técnica durante la atención o evento? *'), 'reservar.html must have exact label');
assert(resHtml.includes('id="row_ayuda_tecnica"'), 'reservar.html must have row_ayuda_tecnica container');
assert(resHtml.includes('id="b_ayuda_tecnica"'), 'reservar.html must have select b_ayuda_tecnica');
EXPECTED_OPTIONS.forEach(opt => {
  assert(resHtml.includes(opt), `reservar.html must include option: ${opt}`);
});
console.log('✓ reservar.html label, container, select and 5 options verified');

// 2. Check label and options in admin.html
assert(admHtml.includes('¿Requiere apoyo de Ayuda Técnica durante la atención o evento? *'), 'admin.html must have exact label');
assert(admHtml.includes('id="row_aq_ayuda_tecnica"'), 'admin.html must have row_aq_ayuda_tecnica container');
assert(admHtml.includes('id="aq_ayuda_tecnica"'), 'admin.html must have select aq_ayuda_tecnica');
EXPECTED_OPTIONS.forEach(opt => {
  assert(admHtml.includes(opt), `admin.html must include option: ${opt}`);
});
console.log('✓ admin.html label, container, select and 5 options verified');

// 3. Check Visibility Rules in reservar.html
// rowAyuda.style.display = (mode === '3') ? 'none' : 'block';
assert(resHtml.includes("rowAyuda.style.display = (mode === '3') ? 'none' : 'block'"), 'reservar.html must hide rowAyuda only in mode 3');
console.log('✓ reservar.html visibility rule (hidden only in mode 3, visible in 1, 2, 4 [with & without transfer] and 5) verified');

// 4. Check Visibility Rules in admin.html
assert(admHtml.includes("rowAyuda.style.display = (mode === '3') ? 'none' : 'block'"), 'admin.html must hide rowAyuda only in mode 3');
console.log('✓ admin.html visibility rule (hidden only in mode 3, visible in 1, 2, 4 [with & without transfer] and 5) verified');

// 5. Check Persistence and Edge API
assert(apiCode.includes("ayuda_tecnica: String(body.ayudaTecnica || body.ayuda_tecnica || '').trim()"), 'api/reservas.js must map ayuda_tecnica');
assert(apiCode.includes("delete fallbackReserva.ayuda_tecnica"), 'api/reservas.js must have schema-safe fallback');
console.log('✓ api/reservas.js persistence mapping and schema fallback verified');

// 6. Check WhatsApp formatting
assert(resHtml.includes("`• Ayuda técnica requerida: ${ayudaTecnica}\\n`"), 'reservar.html WhatsApp must have exact Ayuda técnica line');
assert(admHtml.includes("`• *Ayuda técnica requerida:* ${ayudaTecnica}\\n`"), 'admin.html WhatsApp quote must have Ayuda técnica line');
console.log('✓ WhatsApp messages in reservar.html and admin.html verified');

// 7. Check Inbox Card in admin.html
assert(admHtml.includes('<b>Ayuda Técnica:</b>'), 'admin.html inbox card must show Ayuda Técnica');
assert(admHtml.includes('s.ayudaTecnica || s.ayuda_tecnica'), 'admin.html inbox card must pull ayudaTecnica or ayuda_tecnica');
console.log('✓ admin.html Inbox cards render Ayuda Técnica implement verified');

console.log('\n🎉 ALL AYUDAS TÉCNICAS TESTS PASSED SUCCESSFULLY! 🚀');
