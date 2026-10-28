const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing shift hours and duration end-time cap validation in reservar.html...\n');

const html = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');

// 1. Verify official hours in Step 1
assert(html.includes('🌅 Turno Mañana (06:00 a 12:00 hrs)'), 'Turno Mañana title must be (06:00 a 12:00 hrs)');
assert(html.includes('Recogidas entre 06:00 y 12:00 hrs según duración'), 'Turno Mañana sub text must match');

assert(html.includes('🌇 Turno Tarde (14:00 a 20:00 hrs)'), 'Turno Tarde title must be (14:00 a 20:00 hrs)');
assert(html.includes('Recogidas entre 14:00 y 20:00 hrs según duración'), 'Turno Tarde sub text must match');

assert(html.includes('🌙 Turno Noche (22:00 a 04:00 hrs)'), 'Turno Noche title must be (22:00 a 04:00 hrs)');
assert(html.includes('Exclusivo Cuidados y Eventos, sin traslados clínicos'), 'Turno Noche sub text must match');
console.log('✔ 1. Official shift hours restored in Step 1.');

// 2. Verify Midday special schedule text and WhatsApp link
assert(html.includes('¿Requiere un horario especial de inicio entre las 12:00 y las 13:30 hrs (mediodía)?'), 'Special midday question present');
assert(html.includes('Contáctenos directamente por WhatsApp para evaluar factibilidad operativa y coordinar una atención personalizada fuera de los bloques estándar.'), 'Special midday WhatsApp action present');
assert(html.includes('56929990095'), 'WhatsApp number 56929990095 present');
assert(html.includes('Hola%2C%20necesito%20consultar%20por%20factibilidad%20de%20un%20traslado%20en%20horario%20de%20mediod%C3%ADa.'), 'WhatsApp preconfigured message present');
assert(html.includes('Consultar por WhatsApp'), 'Button label Consultar por WhatsApp present');
console.log('✔ 2. Special midday schedule message and WhatsApp button verified.');

// 3. Mathematical validation of duration cap in Step 2
// Extract BLOCK_HOURS and helper functions
eval(html.match(/const BLOCK_HOURS = \{[\s\S]*?\n\};/)[0].replace('const BLOCK_HOURS', 'var BLOCK_HOURS'));
eval(html.match(/function getShiftEndTime[\s\S]*?\n\}/)[0]);
eval(html.match(/function getSlotStartMin[\s\S]*?\n\}/)[0]);

// Test getShiftEndTime
assert.strictEqual(getShiftEndTime('manana'), 12 * 60, 'Mañana end must be 12:00 (720 min)');
assert.strictEqual(getShiftEndTime('tarde'), 20 * 60, 'Tarde end must be 20:00 (1200 min)');
assert.strictEqual(getShiftEndTime('noche'), 28 * 60, 'Noche end must be 04:00 next day (1680 min)');

// Test filtering logic for Turno Mañana with 3h (180 min) duration
const dur3h = 180;
const shiftEndM = getShiftEndTime('manana');
const slotsMañana3h = BLOCK_HOURS.manana.filter(h => (getSlotStartMin(h, 'manana') + dur3h) <= shiftEndM);

assert(slotsMañana3h.includes('06:00'), '06:00 must be available');
assert(slotsMañana3h.includes('09:00'), '09:00 must be available (09:00 + 3h = 12:00)');
assert.strictEqual(slotsMañana3h[slotsMañana3h.length - 1], '09:00', 'Last available option for 3h in Mañana MUST be 09:00 hrs');
assert(!slotsMañana3h.includes('09:30'), '09:30 must be excluded (09:30 + 3h = 12:30 > 12:00)');
assert(!slotsMañana3h.includes('10:00'), '10:00 must be excluded');
console.log('✔ 3. Turno Mañana with 3h: strictly ends at 09:00 hrs.');

// Test filtering logic for Turno Mañana with 4h (240 min) duration
const dur4h = 240;
const slotsMañana4h = BLOCK_HOURS.manana.filter(h => (getSlotStartMin(h, 'manana') + dur4h) <= shiftEndM);
assert.strictEqual(slotsMañana4h[slotsMañana4h.length - 1], '08:00', 'Last available option for 4h in Mañana must be 08:00 hrs (08:00 + 4h = 12:00)');
console.log('✔ 3. Turno Mañana with 4h: strictly ends at 08:00 hrs.');

// Test filtering logic for Turno Mañana with 6h (360 min) duration
const dur6h = 360;
const slotsMañana6h = BLOCK_HOURS.manana.filter(h => (getSlotStartMin(h, 'manana') + dur6h) <= shiftEndM);
assert.strictEqual(slotsMañana6h.length, 1, 'Only 1 slot can fit 6h in Mañana');
assert.strictEqual(slotsMañana6h[0], '06:00', 'Only 06:00 hrs can fit 6h in Mañana (06:00 + 6h = 12:00)');
console.log('✔ 3. Turno Mañana with 6h: only 06:00 hrs is available.');

// Test filtering logic for Turno Tarde with 3h (180 min) duration
const shiftEndT = getShiftEndTime('tarde');
const slotsTarde3h = BLOCK_HOURS.tarde.filter(h => (getSlotStartMin(h, 'tarde') + dur3h) <= shiftEndT);
assert(slotsTarde3h.includes('14:00'), '14:00 must be available');
assert(slotsTarde3h.includes('17:00'), '17:00 must be available (17:00 + 3h = 20:00)');
assert.strictEqual(slotsTarde3h[slotsTarde3h.length - 1], '17:00', 'Last available option for 3h in Tarde must be 17:00 hrs');
assert(!slotsTarde3h.includes('17:30'), '17:30 must be excluded (17:30 + 3h = 20:30 > 20:00)');
console.log('✔ 3. Turno Tarde with 3h: strictly ends at 17:00 hrs.');

// Test filtering logic for Turno Tarde with 6h (360 min) duration
const slotsTarde6h = BLOCK_HOURS.tarde.filter(h => (getSlotStartMin(h, 'tarde') + dur6h) <= shiftEndT);
assert.strictEqual(slotsTarde6h.length, 1, 'Only 1 slot can fit 6h in Tarde');
assert.strictEqual(slotsTarde6h[0], '14:00', 'Only 14:00 hrs can fit 6h in Tarde (14:00 + 6h = 20:00)');
console.log('✔ 3. Turno Tarde with 6h: only 14:00 hrs is available.');

// Test filtering logic for Turno Noche with 4h (240 min) duration
const shiftEndN = getShiftEndTime('noche');
const slotsNoche4h = BLOCK_HOURS.noche.filter(h => (getSlotStartMin(h, 'noche') + dur4h) <= shiftEndN);
assert(slotsNoche4h.includes('22:00'), '22:00 must be available');
assert(slotsNoche4h.includes('00:00'), '00:00 must be available (00:00 + 4h = 04:00)');
assert.strictEqual(slotsNoche4h[slotsNoche4h.length - 1], '00:00', 'Last available option for 4h in Noche must be 00:00 hrs');
assert(!slotsNoche4h.includes('00:30'), '00:30 must be excluded (00:30 + 4h = 04:30 > 04:00)');
console.log('✔ 3. Turno Noche with 4h: strictly ends at 00:00 hrs.');

console.log('\nAll shift end cap validation tests passed successfully! 🚀');
