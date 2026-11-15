// Test simulation of admin quoter scheduling, assistant, and buffer breakdowns
const assert = require('assert');

// Core helper functions as defined in admin.html
const pad = n => String(n).padStart(2, '0');
const fm = m => {
  const norm = ((Math.round(m) % 1440) + 1440) % 1440;
  return pad(Math.floor(norm / 60)) + ':' + pad(norm % 60);
};
const tm = t => {
  if (!t) return 0;
  const [a, b] = t.split(':');
  return +a * 60 + +b;
};
const fmtHoursClean = mins => {
  const mVal = Number(mins || 0);
  const h = Math.floor(mVal / 60);
  const m = mVal % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
};
const BUF = 120;

console.log('--- 1. Testing 24h wraparound in fm() ---');
assert.strictEqual(fm(0), '00:00');
assert.strictEqual(fm(1439), '23:59');
assert.strictEqual(fm(1440), '00:00');
assert.strictEqual(fm(1500), '01:00');
assert.strictEqual(fm(-15), '23:45');
assert.strictEqual(fm(-60), '23:00');
assert.strictEqual(fm(-1440), '00:00');
assert.strictEqual(fm(2880), '00:00');
console.log('✓ 24h wraparound handles all negative and positive minutes cleanly!');

console.log('--- 2. Testing conTraslado detection ---');
function getConTraslado(mode, eventSubtype) {
  return (mode === '1' || mode === '2' || mode === '5' || (mode === '4' && eventSubtype === 'con_traslado'));
}
assert.strictEqual(getConTraslado('1', 'sin_traslado'), true);
assert.strictEqual(getConTraslado('2', 'sin_traslado'), true);
assert.strictEqual(getConTraslado('3', 'sin_traslado'), false);
assert.strictEqual(getConTraslado('4', 'sin_traslado'), false);
assert.strictEqual(getConTraslado('4', 'con_traslado'), true);
assert.strictEqual(getConTraslado('5', 'sin_traslado'), true);
console.log('✓ conTraslado detection verified for all modalities and subtypes!');

console.log('--- 3. Testing onAdminAppTimeChange Assistant calculation ---');
function calcAppTimePickup(appTimeStr, mode, subtype, adminRouteIdaMin, kmTot) {
  const appTimeMin = tm(appTimeStr);
  let idaMin = 30;
  if (mode === '5') {
    idaMin = adminRouteIdaMin > 0 ? adminRouteIdaMin : 90;
  } else if (mode === '4' && subtype === 'con_traslado') {
    idaMin = adminRouteIdaMin > 0 ? adminRouteIdaMin : 30;
  } else {
    idaMin = adminRouteIdaMin > 0 ? adminRouteIdaMin : Math.max(15, Math.round((kmTot / 2) * 1.3));
  }
  const abordajeMin = 10;
  const margenAdmision = 20;
  const totalAnticipacion = idaMin + abordajeMin + margenAdmision;
  const rawPickupMin = appTimeMin - totalAnticipacion;
  let targetSlotMin = Math.floor(rawPickupMin / 15) * 15;
  targetSlotMin = ((Math.round(targetSlotMin) % 1440) + 1440) % 1440;
  return { targetSlotMin, targetSlotStr: fm(targetSlotMin), idaMin, totalAnticipacion };
}

// Mode 1: Appointment at 10:00 (600m), idaMin = 30m. Anticipacion = 30+10+20 = 60m. Pickup = 09:00 (540m).
let res1 = calcAppTimePickup('10:00', '1', 'sin_traslado', 30, 24);
assert.strictEqual(res1.targetSlotStr, '09:00');
console.log('✓ Mode 1 AppTime 10:00 -> Pickup:', res1.targetSlotStr);

// Mode 1: Appointment at 10:20 (620m), idaMin = 35m. Anticipacion = 35+10+20 = 65m.
// rawPickup = 620 - 65 = 555m (09:15).
let res1b = calcAppTimePickup('10:20', '1', 'sin_traslado', 35, 24);
assert.strictEqual(res1b.targetSlotStr, '09:15');
console.log('✓ Mode 1 AppTime 10:20 -> Pickup:', res1b.targetSlotStr);

// Mode 5: Appointment at 11:00 (660m), idaMin = 90m. Anticipacion = 90+10+20 = 120m. Pickup = 09:00 (540m).
let res5 = calcAppTimePickup('11:00', '5', 'sin_traslado', 90, 180);
assert.strictEqual(res5.targetSlotStr, '09:00');
console.log('✓ Mode 5 AppTime 11:00 -> Pickup:', res5.targetSlotStr);

// Mode 4 con traslado: Event at 19:00 (1140m), idaMin = 30m. Anticipacion = 30+10+20 = 60m. Pickup = 18:00 (1080m).
let res4 = calcAppTimePickup('19:00', '4', 'con_traslado', 30, 40);
assert.strictEqual(res4.targetSlotStr, '18:00');
console.log('✓ Mode 4 con traslado Event at 19:00 -> Pickup:', res4.targetSlotStr);

// Crossing midnight backwards: Event at 00:20 (20m), idaMin = 30m. Anticipacion = 60m. rawPickup = -40m -> floor 15 = -45m -> 23:15
let resNight = calcAppTimePickup('00:20', '4', 'con_traslado', 30, 40);
assert.strictEqual(resNight.targetSlotStr, '23:15');
console.log('✓ Midnight backward crossing 00:20 -> Pickup:', resNight.targetSlotStr);

console.log('--- 4. Testing full circuit schedule breakdown for all modalities ---');

function computeBreakdown(mode, subtype, timeVal, stayMinVal, idaMin, retornoMin) {
  const conTraslado = getConTraslado(mode, subtype);
  const startMin = tm(timeVal);

  if (conTraslado) {
    const durVal = 10 + idaMin + stayMinVal + retornoMin;
    const llegadaDestinoMin = startMin + 10 + idaMin;
    const finDestinoMin = llegadaDestinoMin + stayMinVal;
    const retornoHogarMin = startMin + durVal;
    const bufEndMin = retornoHogarMin + BUF;

    return {
      conTraslado: true,
      recogida: fm(startMin),
      llegadaDestino: fm(llegadaDestinoMin),
      finDestino: fm(finDestinoMin),
      retornoHogar: fm(retornoHogarMin),
      bufferLibre: fm(bufEndMin),
      duracionTotal: durVal
    };
  } else {
    const durVal = stayMinVal;
    const endMin = startMin + durVal;
    const bufEndMin = endMin + BUF;

    return {
      conTraslado: false,
      inicio: fm(startMin),
      termino: fm(endMin),
      bufferLibre: fm(bufEndMin),
      duracionTotal: durVal
    };
  }
}

// Test Mode 1: Recogida 09:00, ida 30m, stay 60m, retorno 30m
let b1 = computeBreakdown('1', 'sin_traslado', '09:00', 60, 30, 30);
assert.strictEqual(b1.recogida, '09:00');
assert.strictEqual(b1.llegadaDestino, '09:40'); // 09:00 + 10m abordaje + 30m viaje = 09:40
assert.strictEqual(b1.finDestino, '10:40'); // 09:40 + 60m atención = 10:40
assert.strictEqual(b1.retornoHogar, '11:10'); // 10:40 + 30m retorno = 11:10
assert.strictEqual(b1.bufferLibre, '13:10'); // 11:10 + 2h buffer = 13:10
assert.strictEqual(b1.duracionTotal, 130); // 10 + 30 + 60 + 30 = 130m
console.log('✓ Mode 1 breakdown verified:', b1);

// Test Mode 2: Recogida 09:00, ida 25m, stay 120m (2h espera), retorno 25m
let b2 = computeBreakdown('2', 'sin_traslado', '09:00', 120, 25, 25);
assert.strictEqual(b2.recogida, '09:00');
assert.strictEqual(b2.llegadaDestino, '09:35'); // 09:00 + 10m abordaje + 25m viaje = 09:35
assert.strictEqual(b2.finDestino, '11:35'); // 09:35 + 120m espera = 11:35
assert.strictEqual(b2.retornoHogar, '12:00'); // 11:35 + 25m retorno = 12:00
assert.strictEqual(b2.bufferLibre, '14:00'); // 12:00 + 2h buffer = 14:00
assert.strictEqual(b2.duracionTotal, 180); // 10 + 25 + 120 + 25 = 180m
console.log('✓ Mode 2 breakdown verified:', b2);

// Test Mode 3: Inicio 10:00, stay 180m (3h domicilio) - SIN TRASLADO
let b3 = computeBreakdown('3', 'sin_traslado', '10:00', 180, 0, 0);
assert.strictEqual(b3.inicio, '10:00');
assert.strictEqual(b3.termino, '13:00');
assert.strictEqual(b3.bufferLibre, '15:00');
assert.strictEqual(b3.duracionTotal, 180);
console.log('✓ Mode 3 breakdown verified:', b3);

// Test Mode 4 Sin Traslado: Inicio 19:00, stay 360m (Plan Total 6h)
let b4sin = computeBreakdown('4', 'sin_traslado', '19:00', 360, 0, 0);
assert.strictEqual(b4sin.inicio, '19:00');
assert.strictEqual(b4sin.termino, '01:00');
assert.strictEqual(b4sin.bufferLibre, '03:00');
assert.strictEqual(b4sin.duracionTotal, 360);
console.log('✓ Mode 4 Sin Traslado breakdown verified:', b4sin);

// Test Mode 4 Con Traslado: Recogida 18:00, ida 30m, stay 360m, retorno 30m
let b4con = computeBreakdown('4', 'con_traslado', '18:00', 360, 30, 30);
assert.strictEqual(b4con.recogida, '18:00');
assert.strictEqual(b4con.llegadaDestino, '18:40'); // 18:00 + 10m + 30m = 18:40
assert.strictEqual(b4con.finDestino, '00:40'); // 18:40 + 360m = 00:40
assert.strictEqual(b4con.retornoHogar, '01:10'); // 00:40 + 30m = 01:10
assert.strictEqual(b4con.bufferLibre, '03:10'); // 01:10 + 2h = 03:10
assert.strictEqual(b4con.duracionTotal, 430); // 10 + 30 + 360 + 30 = 430m
console.log('✓ Mode 4 Con Traslado breakdown verified:', b4con);

// Test Mode 5 Interregional: Recogida 07:30, ida 90m, stay 240m (4h), retorno 90m
let b5 = computeBreakdown('5', 'sin_traslado', '07:30', 240, 90, 90);
assert.strictEqual(b5.recogida, '07:30');
assert.strictEqual(b5.llegadaDestino, '09:10'); // 07:30 + 10m + 90m = 09:10
assert.strictEqual(b5.finDestino, '13:10'); // 09:10 + 240m = 13:10
assert.strictEqual(b5.retornoHogar, '14:40'); // 13:10 + 90m = 14:40
assert.strictEqual(b5.bufferLibre, '16:40'); // 14:40 + 2h = 16:40
assert.strictEqual(b5.duracionTotal, 430); // 10 + 90 + 240 + 90 = 430m (7h 10m)
console.log('✓ Mode 5 Interregional breakdown verified:', b5);

console.log('\nALL TESTS PASSED WITH 100% ACCURACY!');
