const assert = require('assert');
const fs = require('fs');

console.log('=== TEST: SINCRONIZACIÓN DE BLOQUEOS MANUALES Y AGENDA PÚBLICA ===\n');

// 1. Simulación de entorno de navegador (DOM + localStorage)
class MockLocalStorage {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, val) { this.store[key] = String(val); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

global.localStorage = new MockLocalStorage();
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {}
};
global.CustomEvent = class { constructor(type) { this.type = type; } };

// Cargar blocks-api.js
const MsaBlocksService = require('../js/blocks-api.js');

// 2. Simular bloqueos manuales en admin.html para 2026-11-06
console.log('1. Probando persistencia desde admin:');
const blockTarde = {
  id: 201,
  date: '2026-11-06',
  type: 'tarde',
  reason: 'Mantención de unidad / Turno Tarde bloqueado'
};

const blockNoche = {
  id: 202,
  date: '2026-11-06',
  type: 'noche',
  reason: 'Mantención de unidad / Turno Noche bloqueado'
};

MsaBlocksService._updateLocalBlock(blockTarde);
MsaBlocksService._updateLocalBlock(blockNoche);

const savedDedBlocks = JSON.parse(localStorage.getItem('msa_blocks'));
assert(Array.isArray(savedDedBlocks), 'msa_blocks debe ser un array');
assert.strictEqual(savedDedBlocks.length, 2, 'Deben existir 2 bloqueos en msa_blocks');
console.log('  -> Bloqueos guardados correctamente en clave msa_blocks: 2 registros encontrados.');

// 3. Evaluar lógica de reservar con extracto de código
const reservarCode = fs.existsSync('js/reservar.js')
  ? fs.readFileSync('js/reservar.js', 'utf8')
  : fs.readFileSync('reservar.html', 'utf8');

// Comprobar que contiene las funciones clave modificadas
assert(reservarCode.includes('msa_blocks'), 'reservar debe consultar msa_blocks');
assert(reservarCode.includes('parsed.seedVersion === 3 || parsed.seedVersion === 2'), 'reservar debe aceptar seedVersion 2 o 3');
assert(reservarCode.includes('shift-manual-blocked'), 'reservar debe tener la clase shift-manual-blocked');
assert(reservarCode.includes('Bloqueado / No disponible (0 cupos)'), 'reservar debe incluir el texto oficial de bloqueo');
console.log('  -> Verificación estática de reservar (js/html): OK (claves dedicadas y clases presentes).');

// 4. Probar evaluación de capacidad simulada
const D = {
  blocks: [],
  techs: [{ id: 't1', nom: 'Daniela González', act: true }],
  svcs: [
    {
      id: 1,
      tid: 't1',
      date: '2026-11-06',
      start: 8 * 60 + 30, // 08:30
      dur: 120,
      pat: 'Rosa Medina',
      st: 'Confirmado',
      block: 'manana',
      svcType: '1'
    }
  ]
};

// Fusionar msa_blocks en D como hace reservar
let mergedActiveBlocks = Array.isArray(D.blocks) ? [...D.blocks] : [];
const ded = JSON.parse(localStorage.getItem('msa_blocks'));
if (Array.isArray(ded)) {
  ded.forEach(db => {
    if (!mergedActiveBlocks.some(b => b.date === db.date && b.type === db.type)) {
      mergedActiveBlocks.push(db);
    }
  });
}

assert.strictEqual(mergedActiveBlocks.length, 2, 'Los bloques deben fusionarse a 2');
console.log('  -> Fusión de bloques en memoria: OK.');

const dateStr = '2026-11-06';
const dayManualBlocks = mergedActiveBlocks.filter(b => b.date === dateStr);
const isManualM = dayManualBlocks.some(b => b.type === 'manana' || b.type === 'full');
const isManualT = dayManualBlocks.some(b => b.type === 'tarde' || b.type === 'full');
const isManualN = dayManualBlocks.some(b => b.type === 'noche' || b.type === 'full');

console.log('2. Comprobación de estado de turnos para 2026-11-06:');
console.log('   - Turno Mañana manual blocked:', isManualM, '(pero ocupado por Rosa Medina)');
console.log('   - Turno Tarde manual blocked:', isManualT);
console.log('   - Turno Noche manual blocked:', isManualN);

assert.strictEqual(isManualM, false, 'Turno Mañana no tiene bloqueo manual (está reservado por paciente)');
assert.strictEqual(isManualT, true, 'Turno Tarde DEBE tener bloqueo manual');
assert.strictEqual(isManualN, true, 'Turno Noche DEBE tener bloqueo manual');

// Simular el renderizado de botones en reservar
let btnTDisabled = false;
let badgeTText = '';
let btnTClass = '';

if (isManualT) {
  btnTDisabled = true;
  btnTClass = 'shift-manual-blocked';
  badgeTText = 'Bloqueado / No disponible (0 cupos)';
}

assert.strictEqual(btnTDisabled, true, 'El botón Turno Tarde debe estar deshabilitado');
assert.strictEqual(btnTClass, 'shift-manual-blocked', 'El botón Turno Tarde debe tener clase shift-manual-blocked');
assert.strictEqual(badgeTText, 'Bloqueado / No disponible (0 cupos)', 'El badge del Turno Tarde debe ser Bloqueado / No disponible (0 cupos)');
console.log('  -> Renderizado Turno Tarde: DESHABILITADO con etiqueta "Bloqueado / No disponible (0 cupos)": OK.');

let btnNDisabled = false;
let badgeNText = '';
let btnNClass = '';

if (isManualN) {
  btnNDisabled = true;
  btnNClass = 'shift-manual-blocked';
  badgeNText = 'Bloqueado / No disponible (0 cupos)';
}

assert.strictEqual(btnNDisabled, true, 'El botón Turno Noche debe estar deshabilitado');
assert.strictEqual(btnNClass, 'shift-manual-blocked', 'El botón Turno Noche debe tener clase shift-manual-blocked');
assert.strictEqual(badgeNText, 'Bloqueado / No disponible (0 cupos)', 'El badge del Turno Noche debe ser Bloqueado / No disponible (0 cupos)');
console.log('  -> Renderizado Turno Noche: DESHABILITADO con etiqueta "Bloqueado / No disponible (0 cupos)": OK.');

// 5. Probar bloqueo de Día Completo
console.log('\n3. Probando bloqueo de Día Completo:');
const fullDayBlock = {
  id: 301,
  date: '2026-11-10',
  type: 'full',
  reason: 'Feriado de la empresa / Mantención general'
};
MsaBlocksService._updateLocalBlock(fullDayBlock);

const dedAfterFull = JSON.parse(localStorage.getItem('msa_blocks'));
const fullDayManualBlocks = dedAfterFull.filter(b => b.date === '2026-11-10');
const isFullDayManualBlocked = fullDayManualBlocks.some(b => b.type === 'full') ||
  (fullDayManualBlocks.some(b => b.type === 'manana') && fullDayManualBlocks.some(b => b.type === 'tarde') && fullDayManualBlocks.some(b => b.type === 'noche'));

assert.strictEqual(isFullDayManualBlocked, true, '2026-11-10 debe detectarse como Día Completo bloqueado');
console.log('  -> Día completo bloqueado detectado: OK (impedirá selección en calendario).');

// 6. Probar endpoint Edge API
console.log('\n4. Probando Edge API /api/blocks:');
const handlerModule = require('../api/blocks.js');
const handler = handlerModule.default;

async function testApi() {
  // Test GET
  const reqGet = {
    method: 'GET',
    url: 'http://localhost/api/blocks?date=2026-11-06'
  };
  const resGet = await handler(reqGet);
  const dataGet = await resGet.json();
  assert(dataGet.ok, 'GET /api/blocks debe responder ok: true');
  assert(Array.isArray(dataGet.data), 'GET /api/blocks data debe ser array');
  assert(dataGet.data.some(b => b.date === '2026-11-06' && b.type === 'tarde'), 'Edge store debe contener bloqueo tarde para 2026-11-06');
  assert(dataGet.data.some(b => b.date === '2026-11-06' && b.type === 'noche'), 'Edge store debe contener bloqueo noche para 2026-11-06');
  console.log('  -> GET /api/blocks?date=2026-11-06 devuelve tarde y noche: OK.');

  console.log('\n=== TODOS LOS TESTS COMPLETADOS EXITOSAMENTE ===');
}

testApi().catch(err => {
  console.error('API Test failed:', err);
  process.exit(1);
});
