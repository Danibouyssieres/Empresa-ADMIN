// scratch/test_block_conflict_resolution.js
const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Manual Block Conflict Detection and Emergency Resolution ---');

const adminCode = fs.readFileSync('admin.html', 'utf8');

// 1. Verify modalConflictoBloqueoAdmin structure
assert(adminCode.includes('id="modalConflictoBloqueoAdmin"'), 'admin.html must contain modalConflictoBloqueoAdmin');
assert(adminCode.includes('Conflicto de Agenda: Servicios previamente agendados'), 'Modal must have critical conflict title');
assert(adminCode.includes('Cancelar y Mantener Agenda'), 'Modal must include Cancelar y Mantener Agenda button');
assert(adminCode.includes('Forzar Bloqueo por Emergencia'), 'Modal must include Forzar Bloqueo por Emergencia button');
assert(adminCode.includes('confirmarBloqueoEmergencia'), 'Modal button must call confirmarBloqueoEmergencia');
assert(adminCode.includes('cerrarModalConflictoBloqueo'), 'Modal button must call cerrarModalConflictoBloqueo');
console.log('✓ Modal HTML and Action Buttons verified');

// 2. Verify Conflict Logic implementation
assert(adminCode.includes('function checkDateReservasConflict('), 'admin.html must declare checkDateReservasConflict');
assert(adminCode.includes('saveManualBlock(ev, forceEmergency = false)'), 'saveManualBlock must accept forceEmergency param');
assert(adminCode.includes('abrirModalConflictoBloqueo('), 'admin.html must declare abrirModalConflictoBloqueo');
console.log('✓ Conflict detection and resolution functions declared');

// 3. Test Conflict Logic in Node environment
const vm = require('vm');
const mockContext = {
  console,
  setTimeout,
  clearTimeout,
  window: {},
  document: {
    documentElement: { setAttribute: () => {} },
    querySelector: () => null,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  sessionStorage: {
    getItem: () => JSON.stringify({ token: 'tok_admin', role: 'admin' }),
    setItem: () => {}
  },
  alert: () => {},
  confirm: () => true
};

mockContext.window = mockContext;
mockContext.global = mockContext;
vm.createContext(mockContext);

// Extract conflict functions from admin.html
const fnCode = `
  const BLOCK_LABELS = { full: 'Día completo cerrado', manana: 'Turno Mañana (06:00 a 12:00)', tarde: 'Turno Tarde (14:00 a 20:00)', noche: 'Turno Noche (20:00 a 06:00)' };
  const pad = n => String(n).padStart(2, '0');
  const fm = m => { const norm = ((Math.round(m)%1440)+1440)%1440; return pad(Math.floor(norm/60))+':'+pad(norm%60); };
  const tm = t => { if(!t) return 0; const [a,b] = t.split(':'); return +a*60 + +b; };
  const e = s => String(s||'');
  function formatFolioMSA(folio, id) { return 'MSA-' + String(id||1).padStart(3, '0'); }
  const COL = { 'Confirmado': '#10B981', 'pendiente_abono': '#F59E0B' };

  let modalOpened = false;
  let modalData = null;
  let modalTitleText = '';

  const $ = id => {
    if (id === '#modalConflictoBloqueoAdmin') return { style: { display: 'none' } };
    if (id === '#modalConflictoBloqueoTitle') return { textContent: '' };
    if (id === '#modalConflictoBloqueoSubtitle') return { innerHTML: '' };
    if (id === '#modalConflictoBloqueoBody') return { innerHTML: '' };
    if (id === '#mb_date') return { value: '2026-11-15' };
    if (id === '#mb_reason') return { value: 'Mantención de flota' };
    return null;
  };

  let D = {
    nid: 100,
    svcs: [
      { id: 1, folio: 'MSA-001', date: '2026-11-15', start: 540, dur: 120, time: '09:00', block: 'manana', pat: 'Pedro Pascal', ph: '988887777', st: 'Confirmado' },
      { id: 2, folio: 'MSA-002', date: '2026-11-15', start: 960, dur: 180, time: '16:00', block: 'tarde', pat: 'Lucia Hiriart', ph: '977776666', st: 'pendiente_abono' },
      { id: 3, folio: 'MSA-003', date: '2026-11-16', start: 600, dur: 120, time: '10:00', block: 'manana', pat: 'Otro Paciente', ph: '966665555', st: 'Confirmado' }
    ],
    blocks: []
  };

  let U = { date: '2026-11-15', blkType: 'full' };
  function save() {}
  function render() {}

  let pendingManualBlockData = null;

  ${adminCode.slice(adminCode.indexOf('async function checkDateReservasConflict('), adminCode.indexOf('function removeManualBlock('))}
`;

vm.runInContext(fnCode, mockContext);

// Test A: Check conflict on 'full' day (both Pedro and Lucia conflict)
vm.runInContext(`
  (async () => {
    const conflictsFull = await checkDateReservasConflict('2026-11-15', 'full');
    console.log('Found full day conflicts:', conflictsFull.length);
    if (conflictsFull.length !== 2) throw new Error('Expected 2 conflicts for full day');

    // Test B: Check conflict on 'manana' (only Pedro conflicts)
    const conflictsManana = await checkDateReservasConflict('2026-11-15', 'manana');
    console.log('Found manana conflicts:', conflictsManana.length);
    if (conflictsManana.length !== 1 || conflictsManana[0].pat !== 'Pedro Pascal') {
      throw new Error('Expected 1 conflict on manana for Pedro Pascal');
    }

    // Test C: Check conflict on 'noche' (0 conflicts)
    const conflictsNoche = await checkDateReservasConflict('2026-11-15', 'noche');
    console.log('Found noche conflicts:', conflictsNoche.length);
    if (conflictsNoche.length !== 0) throw new Error('Expected 0 conflicts on noche');

    // Test D: Check conflict on a free date (2026-11-20 -> 0 conflicts)
    const conflictsFree = await checkDateReservasConflict('2026-11-20', 'full');
    console.log('Found free date conflicts:', conflictsFree.length);
    if (conflictsFree.length !== 0) throw new Error('Expected 0 conflicts on free date');

    // Test E: saveManualBlock triggers modal when conflicts exist
    U.blkType = 'full';
    const res = await saveManualBlock(null, false);
    if (!res || !res.conflict || res.conflicts.length !== 2) {
      throw new Error('saveManualBlock must block execution and return conflict: true');
    }
    if (D.blocks.length !== 0) throw new Error('Block must NOT be inserted when conflict is detected');

    // Test F: Force emergency block overrides and applies block
    const forceRes = await saveManualBlock(null, true);
    if (!forceRes || !forceRes.success) throw new Error('Emergency block must succeed');
    if (D.blocks.length !== 1 || D.blocks[0].date !== '2026-11-15') {
      throw new Error('Block must be inserted in D.blocks when forced by emergency');
    }
    // Existing services in D.svcs must remain preserved!
    if (D.svcs.length !== 3) throw new Error('Existing services must be strictly preserved in D.svcs');
    console.log('✓ Emergency override successfully applied block while preserving all internal services');
  })();
`, mockContext);

console.log('🎉 ALL MANUAL BLOCK CONFLICT AND RESOLUTION TESTS PASSED! 🚀');
