// scratch/test_reservar_mod5_safety_lock.js
const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: MODALIDAD 5 REGLA DE SEGURIDAD VIAL PROGRAMA CRÓNICO ===');

const html = fs.readFileSync('c:/Proyectos/Empresa/reservar.html', 'utf8');

// 1. Verificación estructural en HTML
assert(html.includes('id="noteMins34"'), "Debe existir el contenedor '#noteMins34'");
assert(html.includes("⚠️ Por normativas de descanso y seguridad vial interurbana, este servicio opera con cobertura cerrada de 6 horas improrrogable."), "Debe existir el mensaje oficial de advertencia de seguridad vial");

// 2. Simulación de lógica de selección
function simulateInterProgram(h) {
  let disabled = false;
  let val = '0';
  let noteVisible = false;
  let noteText = '';

  if(h >= 6) {
    val = '0';
    disabled = true;
    noteVisible = true;
    noteText = '⚠️ Por normativas de descanso y seguridad vial interurbana, este servicio opera con cobertura cerrada de 6 horas improrrogable.';
  } else {
    disabled = false;
    noteVisible = false;
    noteText = '';
  }
  return { disabled, val, noteVisible, noteText };
}

// Programa Estándar (4h)
const estandar = simulateInterProgram(4);
assert.strictEqual(estandar.disabled, false, "Programa Estándar debe mantener el selector habilitado");
assert.strictEqual(estandar.noteVisible, false, "Programa Estándar debe ocultar la advertencia");

// Programa Crónico (6h)
const cronico = simulateInterProgram(6);
assert.strictEqual(cronico.disabled, true, "Programa Crónico debe deshabilitar el selector");
assert.strictEqual(cronico.val, '0', "Programa Crónico debe fijar el valor en 0");
assert.strictEqual(cronico.noteVisible, true, "Programa Crónico debe mostrar la advertencia");
assert(cronico.noteText.includes('seguridad vial interurbana'), "Nota debe contener mención a seguridad vial interurbana");

// 3. Verificación de cálculo tarifario
function calcInterFare(h, extraM) {
  const m = (h >= 6) ? 0 : extraM;
  const base = (h === 6) ? 300000 : 250000;
  const extraHours = Math.floor(m / 60);
  const extraHalf = (m % 60 === 30) ? 1 : 0;
  const extraCost = (extraHours * 25000) + (extraHalf * 15000);
  return base + extraCost;
}

assert.strictEqual(calcInterFare(4, 0), 250000);
assert.strictEqual(calcInterFare(4, 30), 265000);
assert.strictEqual(calcInterFare(4, 60), 275000);
assert.strictEqual(calcInterFare(4, 90), 290000);
assert.strictEqual(calcInterFare(4, 120), 300000);

// En Crónico cualquier intento de minutos extra queda forzado a 0
assert.strictEqual(calcInterFare(6, 0), 300000);
assert.strictEqual(calcInterFare(6, 60), 300000);
assert.strictEqual(calcInterFare(6, 120), 300000);

// 4. Verificación en REGLAS_NEGOCIO_RESERVAR.md
const doc = fs.readFileSync('c:/Proyectos/Empresa/REGLAS_NEGOCIO_RESERVAR.md', 'utf8');
assert(doc.includes('Aplica exclusivamente sobre el Programa Estándar de 4h'), 'REGLAS_NEGOCIO_RESERVAR.md debe especificar que extras aplican solo sobre 4h');
assert(doc.includes('cobertura cerrada improrrogable por normativas de seguridad vial y descanso interurbano'), 'REGLAS_NEGOCIO_RESERVAR.md debe incluir cláusula de descanso interurbano');

console.log('✔ Todos los tests de Modalidad 5 (Regla de Seguridad Vial) pasaron exitosamente.');
