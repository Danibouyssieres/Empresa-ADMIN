const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const reservarHtml = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');

// Build a mock DOM environment
function createMockEl(tag = 'div', id = '') {
  return {
    tagName: tag.toUpperCase(),
    id: id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    className: '',
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      toggle: function(c, force) { if(force) this._classes.add(c); else this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); }
    },
    disabled: false,
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

const mockDoc = {
  elements: {},
  getElementById: function(id) {
    if(!this.elements[id]) this.elements[id] = createMockEl('div', id);
    return this.elements[id];
  },
  querySelector: function(sel) {
    if(sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return createMockEl();
  },
  querySelectorAll: function() { return []; },
  addEventListener: () => {},
  documentElement: { setAttribute: () => {}, getAttribute: () => 'light' }
};

// Initialize common inputs
mockDoc.getElementById('b_date').value = '2026-11-06';
mockDoc.getElementById('b_svc_type').value = '1';
mockDoc.getElementById('b_time').value = '';

const mockMap = {
  setView: function() { return this; },
  on: function() { return this; },
  removeLayer: function() { return this; },
  addLayer: function() { return this; }
};

const ctx = {
  console: console,
  document: mockDoc,
  addEventListener: () => {},
  dispatchEvent: () => {},
  window: {
    addEventListener: () => {},
    dispatchEvent: () => {},
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  navigator: { userAgent: 'node' },
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

// Test 1: Add a manual block for Turno Tarde on 2026-11-06
vm.runInContext(`
  D.blocks = [{ id: 101, date: '2026-11-06', type: 'tarde', reason: 'Mantención preventiva móvil' }];
  $('#b_date').value = '2026-11-06';
  updateSlots();
`, ctx);

const btnT = mockDoc.getElementById('btnBlock_tarde');
const badgeT = mockDoc.getElementById('badgeBlock_tarde');
const btnM = mockDoc.getElementById('btnBlock_manana');
const badgeM = mockDoc.getElementById('badgeBlock_manana');

assert.strictEqual(btnT.disabled, true, 'Turno Tarde button must be disabled when blocked');
assert(btnT.classList.contains('shift-manual-blocked'), 'Turno Tarde button must have shift-manual-blocked class');
assert.strictEqual(badgeT.textContent, 'Bloqueado / No disponible (0 cupos)', 'Turno Tarde badge must show "Bloqueado / No disponible (0 cupos)"');

assert.strictEqual(btnM.disabled, false, 'Turno Mañana button must remain enabled');
assert(!btnM.classList.contains('shift-manual-blocked'), 'Turno Mañana button must not have shift-manual-blocked class');
assert(badgeM.textContent.includes('Disponible'), 'Turno Mañana badge must indicate Disponible');

// Test 2: Attempting to select Turno Tarde when blocked
vm.runInContext(`
  selectedBlock = 'manana';
  selectShiftBlock('tarde');
`, ctx);
const selectedBlock = vm.runInContext('selectedBlock', ctx);
assert.strictEqual(selectedBlock, 'manana', 'selectShiftBlock must reject selecting a blocked shift');

// Test 3: Add a full day block on 2026-11-07
vm.runInContext(`
  calViewYear = 2026;
  calViewMonth = 10; // Noviembre (0-indexed)
  D.blocks.push({ id: 102, date: '2026-11-07', type: 'full', reason: 'Feriado de empresa' });
  renderCalendar();
`, ctx);

const calGrid = mockDoc.getElementById('calGrid');
const cells = calGrid.innerHTML.split('<div class="cd-top-row">');
const cell7 = cells.find(c => c.includes('<span class="cd-num">7</span>'));
console.log('Cell 7 snippet:', cell7);
assert(calGrid.innerHTML.includes('st-full is-blocked-full'), 'Calendar grid must render full block day with st-full is-blocked-full');
assert(calGrid.innerHTML.includes('Bloqueado'), 'Calendar grid must render tag Bloqueado');

// Test 4: Attempting to select 2026-11-07 (full blocked date)
vm.runInContext(`
  selectCalendarDate('2026-11-07');
`, ctx);
const activeDate = mockDoc.getElementById('b_date').value;
assert.strictEqual(activeDate, '2026-11-06', 'selectCalendarDate must reject selecting a fully blocked date');

console.log('✓ In-depth VM test passed: UI rendering, badge text "Bloqueado / No disponible (0 cupos)", disabled state, and selection prevention verified! 🚀');
