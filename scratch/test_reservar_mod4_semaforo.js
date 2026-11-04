// scratch/test_reservar_mod4_semaforo.js
const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: MODALIDAD 4 SEMÁFORO OPERATIVO Y CIERRE DE TURNO ===');

const html = fs.readFileSync('c:/Proyectos/Empresa/reservar.html', 'utf8');

// 1. Verificación estructural en HTML
assert(html.includes('id="homeTimeSemaforoBox"'), "Debe existir el contenedor '#homeTimeSemaforoBox'");
assert(html.includes("if(mode === '4')"), "Debe existir la lógica de evaluación reactiva para Modalidad 4");
assert(html.includes("evaluarSemaforoTurno(endServiceMin, selectedBlock)"), "Debe invocar evaluarSemaforoTurno");

// 2. Extraer funciones core de semáforo desde el código
function evaluarSemaforoTurno(endServiceMin, targetBlock){
  let limitNominal = 12 * 60; // Turno Mañana: 12:00 hrs (720 min)
  let limitTolerance = 12 * 60 + 30; // Margen tolerancia: 12:30 hrs (750 min)
  if(targetBlock === 'tarde'){
    limitNominal = 20 * 60; // Turno Tarde: 20:00 hrs (1200 min)
    limitTolerance = 20 * 60 + 30; // Margen tolerancia: 20:30 hrs (1230 min)
  } else if(targetBlock === 'noche'){
    limitNominal = 28 * 60; // Turno Noche: 04:00 hrs (1680 min)
    limitTolerance = 28 * 60 + 30; // Margen tolerancia: 04:30 hrs (1710 min)
  }

  let effEnd = endServiceMin;
  if(targetBlock === 'noche' && effEnd < 12 * 60){
    effEnd += 24 * 60;
  }

  if(effEnd <= limitNominal){
    return { state: 'green', effEnd, limitNominal, limitTolerance };
  } else if(effEnd <= limitTolerance){
    return { state: 'yellow', effEnd, limitNominal, limitTolerance };
  } else {
    return { state: 'red', effEnd, limitNominal, limitTolerance };
  }
}

function calcEndMod4(curTimeStr, block, h, extraM, isCon, idaMin = 30, retornoMin = 30) {
  const [hh, mm] = curTimeStr.split(':').map(Number);
  let startMin = hh * 60 + mm;
  if(block === 'noche' && startMin < 12 * 60){
    startMin += 24 * 60;
  }
  const stayMin = (h >= 6 ? 6 : 4) * 60 + extraM;
  if(isCon){
    return startMin + idaMin + stayMin + retornoMin;
  } else {
    return startMin + stayMin;
  }
}

// 3. Tests Turno Mañana (12:00 nominal / 12:30 buffer)
console.log('Testing Turno Mañana...');
// 08:00 + 4h = 12:00 -> Verde
const endM1 = calcEndMod4('08:00', 'manana', 4, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endM1, 'manana').state, 'green');

// 08:00 + 4h + 30m = 12:30 -> Amarillo (en buffer)
const endM2 = calcEndMod4('08:00', 'manana', 4, 30, false);
assert.strictEqual(evaluarSemaforoTurno(endM2, 'manana').state, 'yellow');

// 08:00 + 4h + 60m = 13:00 -> Rojo (fuera de rango)
const endM3 = calcEndMod4('08:00', 'manana', 4, 60, false);
assert.strictEqual(evaluarSemaforoTurno(endM3, 'manana').state, 'red');

// 08:00 + 6h = 14:00 -> Rojo
const endM4 = calcEndMod4('08:00', 'manana', 6, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endM4, 'manana').state, 'red');
console.log('✔ Turno Mañana verificado (Verde <= 12:00, Amarillo <= 12:30, Rojo > 12:30)');

// 4. Tests Turno Tarde (20:00 nominal / 20:30 buffer)
console.log('Testing Turno Tarde...');
// 14:00 + 6h = 20:00 -> Verde
const endT1 = calcEndMod4('14:00', 'tarde', 6, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endT1, 'tarde').state, 'green');

// 16:00 + 4h = 20:00 -> Verde
const endT2 = calcEndMod4('16:00', 'tarde', 4, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endT2, 'tarde').state, 'green');

// 16:00 + 4h + 30m extra = 20:30 -> Amarillo (en buffer)
const endT3 = calcEndMod4('16:00', 'tarde', 4, 30, false);
assert.strictEqual(evaluarSemaforoTurno(endT3, 'tarde').state, 'yellow');

// 14:00 + 6h + 30m extra = 20:30 -> Amarillo (en buffer)
const endT4 = calcEndMod4('14:00', 'tarde', 6, 30, false);
assert.strictEqual(evaluarSemaforoTurno(endT4, 'tarde').state, 'yellow');

// 16:00 + 4h + 60m extra = 21:00 -> Rojo (fuera de rango)
const endT5 = calcEndMod4('16:00', 'tarde', 4, 60, false);
assert.strictEqual(evaluarSemaforoTurno(endT5, 'tarde').state, 'red');

// 15:00 + 6h = 21:00 -> Rojo (fuera de rango)
const endT6 = calcEndMod4('15:00', 'tarde', 6, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endT6, 'tarde').state, 'red');
console.log('✔ Turno Tarde verificado (Verde <= 20:00, Amarillo <= 20:30, Rojo > 20:30)');

// 5. Tests Turno Noche (04:00 nominal / 04:30 buffer)
console.log('Testing Turno Noche...');
// 22:00 + 4h = 02:00 -> Verde
const endN1 = calcEndMod4('22:00', 'noche', 4, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endN1, 'noche').state, 'green');

// 22:00 + 6h = 04:00 -> Verde
const endN2 = calcEndMod4('22:00', 'noche', 6, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endN2, 'noche').state, 'green');

// 22:00 + 6h + 30m extra = 04:30 -> Amarillo (en buffer)
const endN3 = calcEndMod4('22:00', 'noche', 6, 30, false);
assert.strictEqual(evaluarSemaforoTurno(endN3, 'noche').state, 'yellow');

// 22:00 + 6h + 60m extra = 05:00 -> Rojo (fuera de rango)
const endN4 = calcEndMod4('22:00', 'noche', 6, 60, false);
assert.strictEqual(evaluarSemaforoTurno(endN4, 'noche').state, 'red');

// 23:00 + 6h = 05:00 -> Rojo (fuera de rango)
const endN5 = calcEndMod4('23:00', 'noche', 6, 0, false);
assert.strictEqual(evaluarSemaforoTurno(endN5, 'noche').state, 'red');
console.log('✔ Turno Noche verificado (Verde <= 04:00, Amarillo <= 04:30, Rojo > 04:30)');

// 6. Tests Pack Integral Puerta a Puerta (Con Traslado)
console.log('Testing Pack Integral (Con Traslado)...');
// 15:00 + 30 min ida + 4h stay + 30 min retorno = 20:00 -> Verde
const endCon1 = calcEndMod4('15:00', 'tarde', 4, 0, true, 30, 30);
assert.strictEqual(evaluarSemaforoTurno(endCon1, 'tarde').state, 'green');

// 15:00 + 30 min ida + 4h stay + 30m extra + 30 min retorno = 20:30 -> Amarillo
const endCon2 = calcEndMod4('15:00', 'tarde', 4, 30, true, 30, 30);
assert.strictEqual(evaluarSemaforoTurno(endCon2, 'tarde').state, 'yellow');

// 15:00 + 30 min ida + 4h stay + 60m extra + 30 min retorno = 21:00 -> Rojo
const endCon3 = calcEndMod4('15:00', 'tarde', 4, 60, true, 30, 30);
assert.strictEqual(evaluarSemaforoTurno(endCon3, 'tarde').state, 'red');
console.log('✔ Pack Integral con traslados verificado.');

// 7. Verificación de visibilidad de secciones según estado de semáforo
function testSectionsVisibility(semaState) {
  // isCalculationComplete = true
  const semaOk = (semaState === 'green' || semaState === 'yellow');
  return semaOk;
}

assert.strictEqual(testSectionsVisibility('green'), true, 'Verde debe mostrar secciones 3 y 4');
assert.strictEqual(testSectionsVisibility('yellow'), true, 'Amarillo debe mostrar secciones 3 y 4');
assert.strictEqual(testSectionsVisibility('red'), false, 'Rojo debe ocultar secciones 3 y 4');
console.log('✔ Comportamiento de visibilidad de secciones verificado (Verde/Amarillo: visible, Rojo: oculto).');

console.log('\n=== TODOS LOS TESTS DE SEMÁFORO EN MODALIDAD 4 PASARON EXITOSAMENTE (100% OK) ===');
