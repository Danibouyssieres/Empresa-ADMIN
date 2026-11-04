const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST: SINCRONIZACIÓN DE BLOQUEOS MANUALES Y AGENDA PÚBLICA ===\n');

const reservarHtml = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');

// Setup a mock DOM for testing reservar.html
const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id: id,
      value: '',
      textContent: '',
      innerHTML: '',
      style: {},
      disabled: false,
      classList: {
        _classes: new Set(),
        add: function(c) { this._classes.add(c); },
        remove: function(c) { this._classes.delete(c); },
        toggle: function(c, force) {
          if (force !== undefined) {
            if (force) this._classes.add(c);
            else this._classes.delete(c);
          } else {
            if (this._classes.has(c)) this._classes.delete(c);
            else this._classes.add(c);
          }
        },
        contains: function(c) { return this._classes.has(c); }
      },
      querySelectorAll: () => [],
      querySelector: () => null,
      setAttribute: () => {},
      removeAttribute: () => {},
      addEventListener: () => {}
    };
  }
  return elements[id];
}

const mockDoc = {
  getElementById: (id) => getEl(id),
  querySelector: (sel) => getEl(sel.replace('#', '')),
  querySelectorAll: () => [],
  addEventListener: () => {},
  documentElement: { getAttribute: () => 'light', setAttribute: () => {} }
};

const mockMap = {
  setView: () => mockMap,
  remove: () => {},
  fitBounds: () => {}, on: () => {}
};

const ctx = {
  document: mockDoc, addEventListener: () => {},
  window: {
    location: { href: 'http://localhost/reservar.html' },
    addEventListener: () => {},
    scrollTo: () => {}
  },
  navigator: {},
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  L: {
    map: () => mockMap,
    tileLayer: () => ({ addTo: () => mockMap }),
    divIcon: () => ({}),
    polyline: () => ({ addTo: () => mockMap }),
    marker: () => ({ addTo: () => mockMap, bindPopup: () => ({}) })
  }
};
vm.createContext(ctx);

// Run reservar.html script in ctx
let scriptBody = '';
if (fs.existsSync(path.join(__dirname, '..', 'js', 'reservar.js'))) {
  const fullJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'reservar.js'), 'utf8');
  const idx = fullJs.indexOf('initForm();');
  scriptBody = idx !== -1 ? fullJs.substring(0, idx) : fullJs;
} else {
  const startTag = reservarHtml.indexOf("<script>\nconst K='msa-v1'") !== -1 
    ? reservarHtml.indexOf("<script>\nconst K='msa-v1'")
    : reservarHtml.indexOf("<script>\r\nconst K='msa-v1'");
  const initTag = reservarHtml.indexOf('initForm();');
  scriptBody = reservarHtml.substring(startTag + 8, initTag);
}

vm.runInContext(scriptBody, ctx);

// Test 1: Add a manual block for Turno Tarde on 2026-11-12 (where morning is free)
vm.runInContext(`
  D.blocks = [{ id: 101, date: '2026-11-12', type: 'tarde', reason: 'Mantención preventiva móvil' }];
  $('#b_date').value = '2026-11-12';
  updateSlots();
`, ctx);

const btnT = mockDoc.getElementById('btnBlock_tarde');
const badgeT = mockDoc.getElementById('badgeBlock_tarde');
const btnM = mockDoc.getElementById('btnBlock_manana');
const badgeM = mockDoc.getElementById('badgeBlock_manana');

assert.strictEqual(btnT.disabled, true, 'Turno Tarde button must be disabled when blocked');
assert(btnT.classList.contains('shift-manual-blocked'), 'Turno Tarde button must have shift-manual-blocked class');
assert.strictEqual(badgeT.textContent, 'Bloqueado / No disponible (0 cupos)', 'Turno Tarde badge must show "Bloqueado / No disponible (0 cupos)"');

assert.strictEqual(btnM.disabled, false, 'Turno Mañana button must remain enabled on 2026-11-12');
assert(!btnM.classList.contains('shift-manual-blocked'), 'Turno Mañana button must not have shift-manual-blocked class');
assert(badgeM.textContent.includes('Disponible'), 'Turno Mañana badge must indicate Disponible');

// Test 2: Attempting to select Turno Tarde when blocked
vm.runInContext(`
  selectedBlock = 'manana';
  selectShiftBlock('tarde');
`, ctx);
const selectedBlock = vm.runInContext('selectedBlock', ctx);
assert.strictEqual(selectedBlock, 'manana', 'selectShiftBlock must reject selecting a blocked shift');

// Test 3: Add a full day block on 2026-11-15
vm.runInContext(`
  calViewYear = 2026;
  calViewMonth = 10; // Noviembre (0-indexed)
  D.blocks.push({ id: 102, date: '2026-11-15', type: 'full', reason: 'Feriado de empresa' });
  renderCalendar();
`, ctx);

const calGrid = mockDoc.getElementById('calGrid');
assert(calGrid.innerHTML.includes('is-blocked-full'), 'Calendar grid must render full-day blocked cell with is-blocked-full class');
assert(calGrid.innerHTML.includes('Bloqueado'), 'Calendar cell must show Bloqueado badge');

// Test 4: Dynamic date for Rosa Medina booking (Turno Mañana booked by patient, Tarde/Noche blocked manually)
const rosaService = vm.runInContext("D.svcs.find(s => s.client && s.client.includes('Rosa'))", ctx);
const rosaDate = rosaService ? rosaService.date : '2026-11-07';

vm.runInContext(`
  D.blocks = [
    { id: 101, date: '${rosaDate}', type: 'tarde', reason: 'Mantención de unidad' },
    { id: 102, date: '${rosaDate}', type: 'noche', reason: 'Mantención de unidad' }
  ];
  $('#b_date').value = '${rosaDate}';
  updateSlots();
`, ctx);

const btnN = mockDoc.getElementById('btnBlock_noche');
const badgeN = mockDoc.getElementById('badgeBlock_noche');

assert.strictEqual(btnM.disabled, true, 'Turno Mañana must be disabled because of Rosa Medina booking');
assert.strictEqual(btnT.disabled, true, 'Turno Tarde must be disabled due to manual block');
assert(btnT.classList.contains('shift-manual-blocked'), 'Turno Tarde must have shift-manual-blocked class');
assert.strictEqual(badgeT.textContent, 'Bloqueado / No disponible (0 cupos)');

assert.strictEqual(btnN.disabled, true, 'Turno Noche must be disabled due to manual block');
assert(btnN.classList.contains('shift-manual-blocked'), 'Turno Noche must have shift-manual-blocked class');
assert.strictEqual(badgeN.textContent, 'Bloqueado / No disponible (0 cupos)');

console.log('✓ All reservar.html UI block and calendar tests passed successfully!');
