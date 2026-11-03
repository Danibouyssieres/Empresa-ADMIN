const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const reservarHtml = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');

// Mock a lightweight DOM environment
class ClassList {
  constructor() { this.classes = new Set(); }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  contains(c) { return this.classes.has(c); }
  toggle(c, force) {
    if (force === undefined) {
      if (this.classes.has(c)) this.classes.delete(c);
      else this.classes.add(c);
    } else if (force) {
      this.classes.add(c);
    } else {
      this.classes.delete(c);
    }
  }
}

class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.classList = new ClassList();
    this.style = {};
    this.disabled = false;
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.options = [];
  }
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k]; }
}

const elements = {};
function getEl(id) {
  if (!elements[id]) elements[id] = new MockElement(id);
  return elements[id];
}

const mockDoc = {
  getElementById: (id) => getEl(id),
  querySelector: (sel) => {
    if (sel.startsWith('#')) return getEl(sel.slice(1));
    return new MockElement(sel);
  },
  querySelectorAll: () => [], addEventListener: () => {},
  documentElement: { setAttribute: () => {}, getAttribute: () => 'light' }
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

// Test 1: Add a manual block for Turno Tarde on 2026-11-05 (where morning is free)
vm.runInContext(`
  D.blocks = [{ id: 101, date: '2026-11-05', type: 'tarde', reason: 'Mantención preventiva móvil' }];
  $('#b_date').value = '2026-11-05';
  updateSlots();
`, ctx);

const btnT = mockDoc.getElementById('btnBlock_tarde');
const badgeT = mockDoc.getElementById('badgeBlock_tarde');
const btnM = mockDoc.getElementById('btnBlock_manana');
const badgeM = mockDoc.getElementById('badgeBlock_manana');

assert.strictEqual(btnT.disabled, true, 'Turno Tarde button must be disabled when blocked');
assert(btnT.classList.contains('shift-manual-blocked'), 'Turno Tarde button must have shift-manual-blocked class');
assert.strictEqual(badgeT.textContent, 'Bloqueado / No disponible (0 cupos)', 'Turno Tarde badge must show "Bloqueado / No disponible (0 cupos)"');

assert.strictEqual(btnM.disabled, false, 'Turno Mañana button must remain enabled on 2026-11-05');
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
assert(calGrid.innerHTML.includes('is-blocked-full'), 'Calendar grid must render full-day blocked cell with is-blocked-full class');
assert(calGrid.innerHTML.includes('Bloqueado'), 'Calendar cell must show Bloqueado badge');

// Test 4: For date 2026-11-06, Turno Mañana is blocked by Rosa Medina, and Tarde/Noche blocked manually
vm.runInContext(`
  D.blocks = [
    { id: 101, date: '2026-11-06', type: 'tarde', reason: 'Mantención de unidad' },
    { id: 102, date: '2026-11-06', type: 'noche', reason: 'Mantención de unidad' }
  ];
  $('#b_date').value = '2026-11-06';
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
