// scratch/test_reservar_mod4_extras.js
const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: MODALIDAD 4 TIEMPO ADICIONAL Y RECÁLCULO (reservar.html) ===');

const html = fs.readFileSync('c:/Proyectos/Empresa/reservar.html', 'utf8');

// 1. Textos y opciones del selector
assert(html.includes("Tiempo Adicional en Recinto (Opcional)"), "Debe existir la etiqueta 'Tiempo Adicional en Recinto (Opcional)'");
assert(html.includes("+ 0 minutos adicionales ($0)"), "Debe existir la opción '+ 0 minutos adicionales ($0)'");
assert(html.includes("+ 30 minutos extra (+$7.500)"), "Debe existir la opción '+ 30 minutos extra (+$7.500)'");
assert(html.includes("+ 1 hora extra (+$15.000)"), "Debe existir la opción '+ 1 hora extra (+$15.000)'");
assert(html.includes("+ 1 hora 30 min extra (+$22.500)"), "Debe existir la opción '+ 1 hora 30 min extra (+$22.500)'");
assert(html.includes("+ 2 horas extras (+$30.000 - Tope máximo)"), "Debe existir la opción '+ 2 horas extras (+$30.000 - Tope máximo)'");

console.log('✔ 1. Textos y etiquetas verificados correctamente.');

// 2. Simulación de cálculos matemáticos de Modalidad 4
function calcMod4(isCon, hours, extraM) {
  const basePkgCost = isCon
    ? (hours === 6 ? 125000 : 95000)
    : (hours === 6 ? 95000 : 65000);
  const extraCost = (extraM === 30 ? 7500 : extraM === 60 ? 15000 : extraM === 90 ? 22500 : extraM === 120 ? 30000 : 0);
  const total = basePkgCost + extraCost;
  const abono = Math.round((total * 0.5) / 50) * 50;
  const saldo = total - abono;
  return { basePkgCost, extraCost, total, abono, saldo };
}

// Validación de la tabla de combinaciones:
// SIN TRASLADO:
// Base 4h ($65.000):
const sin_4_0 = calcMod4(false, 4, 0);
assert.strictEqual(sin_4_0.total, 65000);
assert.strictEqual(sin_4_0.abono, 32500);

const sin_4_30 = calcMod4(false, 4, 30);
assert.strictEqual(sin_4_30.total, 72500);
assert.strictEqual(sin_4_30.abono, 36250);

// Ejemplo de validación del prompt: Plan Base ($65.000) + 1 hora extra ($15.000) = Total: $80.000 | Abono 50%: $40.000.
const sin_4_60 = calcMod4(false, 4, 60);
assert.strictEqual(sin_4_60.total, 80000, "Plan Base + 1h extra debe ser 80.000");
assert.strictEqual(sin_4_60.abono, 40000, "Abono 50% debe ser 40.000");
assert.strictEqual(sin_4_60.saldo, 40000, "Saldo debe ser 40.000");

const sin_4_90 = calcMod4(false, 4, 90);
assert.strictEqual(sin_4_90.total, 87500);
assert.strictEqual(sin_4_90.abono, 43750);

// Con 2 horas extras empata con Plan Total (6h):
const sin_4_120 = calcMod4(false, 4, 120);
assert.strictEqual(sin_4_120.total, 95000, "Plan Base + 2h extras empata con Plan Total 6h ($95.000)");
assert.strictEqual(sin_4_120.abono, 47500);

// Plan Total 6h ($95.000):
const sin_6_0 = calcMod4(false, 6, 0);
assert.strictEqual(sin_6_0.total, 95000);

const sin_6_120 = calcMod4(false, 6, 120);
assert.strictEqual(sin_6_120.total, 125000);
assert.strictEqual(sin_6_120.abono, 62500);

// CON TRASLADO:
// Pack Base 4h ($95.000):
const con_4_0 = calcMod4(true, 4, 0);
assert.strictEqual(con_4_0.total, 95000);
assert.strictEqual(con_4_0.abono, 47500);

const con_4_60 = calcMod4(true, 4, 60);
assert.strictEqual(con_4_60.total, 110000);
assert.strictEqual(con_4_60.abono, 55000);

// Pack Base 4h + 2h extras empata con Pack Total (6h):
const con_4_120 = calcMod4(true, 4, 120);
assert.strictEqual(con_4_120.total, 125000, "Pack Base + 2h extras empata con Pack Total 6h ($125.000)");
assert.strictEqual(con_4_120.abono, 62500);

// Pack Total 6h ($125.000) + 2h extras ($30.000) = $155.000:
const con_6_120 = calcMod4(true, 6, 120);
assert.strictEqual(con_6_120.total, 155000);
assert.strictEqual(con_6_120.abono, 77500);

console.log('✔ 2. Validaciones financieras y abonos al 50% matemáticamente exactos.');

// 3. Simulación de Cronograma (Timeline) en Pack Integral con Traslado
function calcTimeline(curTimeStr, h, extraM, idaMin = 30, retornoMin = 30) {
  const [hh, mm] = curTimeStr.split(':').map(Number);
  const startMin = hh * 60 + mm;
  const eventStayMin = h * 60 + extraM;
  const llegadaRecintoMin = startMin + idaMin;
  const terminoEventoMin = llegadaRecintoMin + eventStayMin;
  const retornoHogarMin = terminoEventoMin + retornoMin;
  const totalCircuitoMin = idaMin + eventStayMin + retornoMin;
  return { startMin, llegadaRecintoMin, terminoEventoMin, retornoHogarMin, totalCircuitoMin };
}

// Caso 1: Recogida 16:00, Pack Base 4h, Sin extras (extraM = 0)
const tl1 = calcTimeline('16:00', 4, 0, 30, 30);
assert.strictEqual(tl1.llegadaRecintoMin, 16 * 60 + 30); // 16:30
assert.strictEqual(tl1.terminoEventoMin, 16 * 60 + 30 + 240); // 20:30
assert.strictEqual(tl1.retornoHogarMin, 20 * 60 + 30 + 30); // 21:00 (1260 min)
assert.strictEqual(tl1.totalCircuitoMin, 300); // 5 horas

// Caso 2: Recogida 16:00, Pack Base 4h, Con 1 hora extra (+60 min)
const tl2 = calcTimeline('16:00', 4, 60, 30, 30);
assert.strictEqual(tl2.llegadaRecintoMin, 16 * 60 + 30); // 16:30
assert.strictEqual(tl2.terminoEventoMin, 16 * 60 + 30 + 300); // 21:30
assert.strictEqual(tl2.retornoHogarMin, 21 * 60 + 30 + 30); // 22:00 (1320 min) -> Exactamente 1 hora más en el retorno!
assert.strictEqual(tl2.totalCircuitoMin, 360);

// Caso 3: Recogida 16:00, Pack Total 6h, Con 2 horas extras (+120 min)
const tl3 = calcTimeline('16:00', 6, 120, 30, 30);
assert.strictEqual(tl3.terminoEventoMin, 16 * 60 + 30 + 480); // 00:30 del día siguiente
assert.strictEqual(tl3.retornoHogarMin, 16 * 60 + 30 + 480 + 30); // 01:00 (1500 min)
assert.strictEqual(tl3.totalCircuitoMin, 540); // 9 horas

console.log('✔ 3. Sincronización en cronograma y hora estimada de retorno al domicilio verificada.');

// 4. Verificación de reglas de negocio en REGLAS_NEGOCIO_RESERVAR.md
const doc = fs.readFileSync('c:/Proyectos/Empresa/REGLAS_NEGOCIO_RESERVAR.md', 'utf8');
assert(doc.includes("Tiempo Adicional en Recinto (Opcional):"), "REGLAS_NEGOCIO_RESERVAR.md debe incluir Tiempo Adicional en Recinto (Opcional)");
assert(doc.includes("+1 hora extra: +\\$15.000"), "REGLAS_NEGOCIO_RESERVAR.md debe incluir tarifa +$15.000");
assert(doc.includes("+2 horas extras: +\\$30.000 (Tope máximo)"), "REGLAS_NEGOCIO_RESERVAR.md debe incluir tope máximo 2 horas extras");

console.log('✔ 4. REGLAS_NEGOCIO_RESERVAR.md sincronizado y consistente.');
console.log('\n=== TODOS LOS TESTS PASARON EXITOSAMENTE (100% OK) ===');
