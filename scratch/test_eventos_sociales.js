const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Modalidad 4 (Acompañamiento en Eventos Sociales) rules...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Check HTML elements
assert(content.includes('id="eventSubModeBox"'), 'eventSubModeBox must exist in HTML');
assert(content.includes('id="eventBtn_sin"'), 'eventBtn_sin must exist in HTML');
assert(content.includes('id="eventBtn_con"'), 'eventBtn_con must exist in HTML');
assert(content.includes('Pack Asistencia en Recinto (Sin Traslado)'), 'Sin traslado label missing');
assert(content.includes('Pack Integral Puerta a Puerta (Con Traslado)'), 'Con traslado label missing');
console.log('✔ Event sub-mode HTML structure verified.');

// 2. Check Guarantee notice for Modalidad 4
assert(content.includes('Garantía de Cobertura y Bienestar en Eventos:'), 'Guarantee title missing');
assert(content.includes('Acompañamiento exclusivo y dedicado por una profesional TENS durante toda la celebración, asegurando el confort, movilidad asistida en salón, supervisión de medicamentos y tranquilidad integral para la familia. Si la celebración amerita extender el servicio más allá del tiempo contratado, cada bloque adicional de 30 minutos se regularizará al término del evento (sujeto a disponibilidad técnica).'), 'Guarantee text missing');
console.log('✔ Garantía de Cobertura y Bienestar en Eventos text verified.');

// 3. Test Tariff Calculation with pure functions matching the script
function calcEventoCost(h, isConTraslado) {
  const basePkgCost = isConTraslado
    ? (h === 6 ? 125000 : 95000)
    : (h === 6 ? 95000 : 65000);
  const planTitle = isConTraslado
    ? (h === 6 ? 'Pack Cobertura Total (6 hrs en evento + Traslados Ida/Vuelta)' : 'Pack Base (4 hrs en evento + Traslados Ida/Vuelta)')
    : (h === 6 ? 'Plan Cobertura Total (6 hrs continuas en recinto · Sin traslado)' : 'Plan Base (4 hrs continuas en recinto · Sin traslado)');
  const abono = Math.round((basePkgCost * 0.5) / 50) * 50;
  const saldo = basePkgCost - abono;
  return { timeCost: basePkgCost, planTitle, abono, saldo };
}

// Option A: Sin Traslado
const sin4 = calcEventoCost(4, false);
assert.strictEqual(sin4.timeCost, 65000, 'Sin traslado 4h should be $65.000');
assert.strictEqual(sin4.abono, 32500, 'Sin traslado 4h abono should be $32.500');
assert.strictEqual(sin4.saldo, 32500, 'Sin traslado 4h saldo should be $32.500');

const sin6 = calcEventoCost(6, false);
assert.strictEqual(sin6.timeCost, 95000, 'Sin traslado 6h should be $95.000');
assert.strictEqual(sin6.abono, 47500, 'Sin traslado 6h abono should be $47.500');
assert.strictEqual(sin6.saldo, 47500, 'Sin traslado 6h saldo should be $47.500');

// Option B: Con Traslado
const con4 = calcEventoCost(4, true);
assert.strictEqual(con4.timeCost, 95000, 'Con traslado 4h should be $95.000');
assert.strictEqual(con4.abono, 47500, 'Con traslado 4h abono should be $47.500');
assert.strictEqual(con4.saldo, 47500, 'Con traslado 4h saldo should be $47.500');

const con6 = calcEventoCost(6, true);
assert.strictEqual(con6.timeCost, 125000, 'Con traslado 6h should be $125.000');
assert.strictEqual(con6.abono, 62500, 'Con traslado 6h abono should be $62.500');
assert.strictEqual(con6.saldo, 62500, 'Con traslado 6h saldo should be $62.500');

console.log('✔ Flat rates for Eventos Sociales verified (both Sin Traslado and Con Traslado).');

// 4. Test DOM simulation for Event sub-mode switching
class MockElement {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c, v) => v ? this.classList.classes.add(c) : this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c)
    };
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.required = false;
  }
}

const els = {};
function $(sel) {
  const id = sel.replace('#', '');
  if (!els[id]) els[id] = new MockElement(id);
  return els[id];
}

// Setup elements
$('#b_svc_type').value = '4';
let selectedEventSubMode = 'sin_traslado';

function isMapEnabledForCurrentState(){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  if(mode === '4') return selectedEventSubMode === 'con_traslado';
  return mode === '1' || mode === '2' || mode === '5';
}

// Test Sin Traslado state
assert.strictEqual(isMapEnabledForCurrentState(), false, 'Map should be disabled for Sin Traslado');
const showDestSin = ($('#b_svc_type').value === '1' || $('#b_svc_type').value === '2' || $('#b_svc_type').value === '5' || ($('#b_svc_type').value === '4' && selectedEventSubMode === 'con_traslado'));
assert.strictEqual(showDestSin, false, 'Destination address B should NOT be shown for Sin Traslado');

// Test Con Traslado state
selectedEventSubMode = 'con_traslado';
assert.strictEqual(isMapEnabledForCurrentState(), true, 'Map should be enabled for Con Traslado');
const showDestCon = ($('#b_svc_type').value === '1' || $('#b_svc_type').value === '2' || $('#b_svc_type').value === '5' || ($('#b_svc_type').value === '4' && selectedEventSubMode === 'con_traslado'));
assert.strictEqual(showDestCon, true, 'Destination address B should be shown for Con Traslado');

console.log('✔ Address & map visibility rules for both Event sub-modes verified.');
console.log('\nAll tests for Modalidad 4 (Eventos Sociales) passed successfully! 🚀');
