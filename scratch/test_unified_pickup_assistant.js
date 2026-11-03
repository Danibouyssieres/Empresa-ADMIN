const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing unified pickup assistant and removal of redundant elements in reservar.html...\n');

const html = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');

// 1. Verify redundant moon footnote box is completely removed
assert(!html.includes('id="jornadaFootNote"'), 'jornadaFootNote element must be removed from HTML');
assert(!html.includes('🌙 <b>Servicios en Horario Nocturno (20:00 a 06:00 hrs):</b>'), 'Redundant moon callout must be removed');
console.log('✔ 1. Redundant moon footnote box under rate pills completely removed.');

// 2. Verify removal of old manual pickup dropdown label
assert(!html.includes('Hora exacta de recogida requerida (dentro del turno de Paso 1) *'), 'Old manual pickup label must be removed');
console.log('✔ 2. Manual duplicate pickup dropdown removed from transfer view.');

// 3. Verify unified Assistant structure
assert(html.includes('⏱️ Asistente de Hora de Recogida Sugerida'), 'Assistant header present');
assert(html.includes('id="appTimeInput"'), 'appTimeInput present');
assert(html.includes('calcSuggestedPickup()'), 'calcSuggestedPickup call present');
assert(html.includes('Hora de recogida programada:'), 'Confirmed official pickup header present in JS template');
console.log('✔ 3. Unified Assistant is the definitive mechanism for transfer modalities.');

// 4. Verify home care single selector (Modalidad 3)
assert(html.includes('id="homeTimeWrap"'), 'homeTimeWrap element present');
assert(html.includes('Hora de inicio de la atención en el domicilio *'), 'Single home care selector label present');
console.log('✔ 4. Modalidad 3 has single clean selector "Hora de inicio de la atención en el domicilio *".');

// 5. Verify removal of filler card and presence of parallel 2-column layout
assert(!html.includes('✓ Atención ejecutada por TENS acreditado con equipamiento clínico completo'), 'Old filler quality card must be completely removed');
assert(html.includes('⏱️ Permanencia en Destino y Duración del Servicio'), 'Right column must contain Permanencia en Destino');
assert(html.includes('¿Cuánto estimas que durará tu atención, trámite o actividad en el lugar? *'), 'Stay duration question present');
assert(html.includes('10 min de abordaje TENS'), 'Clinical timing updated to 10 min TENS boarding');
assert(html.includes('💬 Solicitar Pre-Reserva vía WhatsApp'), 'Submit button updated to Solicitar Pre-Reserva vía WhatsApp');
console.log('✔ 5. Parallel 2-column layout, 10 min clinical timing and WhatsApp pre-reservation button verified.');

console.log('\nAll unified pickup assistant tests passed successfully! 🚀');
