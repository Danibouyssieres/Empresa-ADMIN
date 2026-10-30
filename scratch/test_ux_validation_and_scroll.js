const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST SUITE: UX VALIDATION, SCROLL & VISIBLE FEEDBACK ---');

const htmlPath = path.resolve(__dirname, '../reservar.html');
const html = fs.readFileSync(htmlPath, 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../css/reservar.css'), 'utf8');

// 1. Verify HTML elements
assert(html.includes('id="submitBlockAlert"'), 'submitBlockAlert element must exist in Section 4');
assert(html.includes('id="submitBtn"'), 'submitBtn button must exist');
assert(html.includes('💬 Solicitar Pre-Reserva vía WhatsApp'), 'Submit button text must be "💬 Solicitar Pre-Reserva vía WhatsApp"');
console.log('✔ Section 4 submitBlockAlert and button verified.');

// 2. Check exact wording requirements in reservar.html
const expectedAlertSchedule = "Existen observaciones en su selección de horario en el Paso 2 (la hora elegida no se encuentra disponible o excede la ventana del turno seleccionado en el calendario). Por favor revise la Sección 2 antes de confirmar.";
const expected6hConflict = "La duración de este plan (6 horas) excede el turno seleccionado en el calendario. Por favor seleccione un turno compatible en el Paso 1 (Turno Tarde o Noche) o modifique su plan a 4 horas.";

assert(html.includes(expectedAlertSchedule), 'Alert must include schedule observation text');
assert(html.includes(expected6hConflict), 'Must include 6h duration conflict explanation text');
console.log('✔ Exact wording for schedule conflict and 6h guidance verified.');

// 3. Test script logic in VM
const vm = require('vm');
const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi)];
const jsResPath = path.resolve(__dirname, '../js/reservar.js');
let scriptContent = fs.existsSync(jsResPath) ? fs.readFileSync(jsResPath, 'utf8') : (scriptMatches[1] ? scriptMatches[1][1] : '');
scriptContent = scriptContent.replace('initForm();', '// initForm();');

let scrolledTo = null;
class ElementMock {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, val) => {
        if(val === undefined) val = !this.classList._classes.has(c);
        if(val) this.classList._classes.add(c);
        else this.classList._classes.delete(c);
        return val;
      }
    };
    this.options = [];
    this.disabled = false;
    this.required = false;
    this.checked = false;
  }
  scrollIntoView(opts) {
    scrolledTo = { id: this.id, opts };
  }
  focus() {}
  querySelector(sel) {
    if (sel.includes('option[value="')) {
      const val = sel.match(/value="([^"]+)"/)[1];
      return this.options.find(o => o.value === val) || null;
    }
    return null;
  }
  querySelectorAll() { return []; }
  setAttribute(k, v) { this[k] = v; }
  removeAttribute(k) { delete this[k]; }
}

const elements = {};
function getOrCreate(id, tag = 'div') {
  if (!elements[id]) elements[id] = new ElementMock(id, tag);
  return elements[id];
}

['selHours34', 'selMins34', 'b_svc_type', 'b_time', 'b_date', 'b_tens', 'selStayDestino', 'selEventStart1'].forEach(id => {
  const el = getOrCreate(id, 'select');
  if(id === 'b_svc_type') el.value = '1';
  let inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get: () => inner,
    set: (h) => {
      inner = h;
      const optRegex = /<option[^>]*value="([^"]*)"[^>]*>(.*?)<\/option>/gi;
      const opts = [];
      let m;
      while ((m = optRegex.exec(h)) !== null) {
        opts.push({ value: m[1], text: m[2], disabled: m[0].includes('disabled') });
      }
      el.options = opts;
    }
  });
});

const mockWindow = {
  document: {
    addEventListener: () => {},
    getElementById: (id) => getOrCreate(id),
    querySelector: (sel) => {
      const id = sel.replace('#', '');
      return getOrCreate(id);
    },
    querySelectorAll: () => []
  },
  $: (sel) => {
    const id = sel.replace('#', '');
    return getOrCreate(id);
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
  L: {
    map: () => {
      const m = { setView: () => m, on: () => m };
      return m;
    },
    tileLayer: () => ({ addTo: () => {} }),
    marker: () => ({ addTo: () => {}, bindPopup: () => {} }),
    polyline: () => ({ addTo: () => {} }),
    icon: () => ({}),
    divIcon: () => ({})
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
mockWindow.window = mockWindow;
mockWindow.globalThis = mockWindow;

const context = vm.createContext(mockWindow);
vm.runInContext(scriptContent, context);

async function run() {
  // Test 3A: Terms not checked -> scroll to b_terms
  const bTerms = getOrCreate('b_terms');
  bTerms.checked = false;
  scrolledTo = null;
  await vm.runInContext("submitBooking({ preventDefault: () => {} });", context);
  assert(scrolledTo !== null, 'Must scroll to an element when terms not accepted');
  assert.strictEqual(scrolledTo.id, 'b_terms', 'Must scroll directly to b_terms');
  assert.strictEqual(scrolledTo.opts.behavior, 'smooth', 'Must use smooth scroll');
  assert.strictEqual(getOrCreate('submitBlockAlert').style.display, 'block', 'submitBlockAlert must be visible');
  console.log('✔ Terms validation scrolls smoothly to terms checkbox.');

  // Test 3B: Schedule conflict (6 hours in Morning shift at 08:00 when Afternoon is already occupied)
  const testDate = vm.runInContext("addDaysYMD(toYMD(new Date()), 3);", context);
  getOrCreate('b_date').value = testDate;
  bTerms.checked = true;
  getOrCreate('b_from').value = 'Av. Pajaritos 3000, Maipú';
  vm.runInContext("ptFrom = [-33.5, -70.7];", context);
  getOrCreate('b_svc_type').value = '4'; // Eventos Sociales
  getOrCreate('selHours34').value = '6'; // 6 hours

  // Book afternoon shift on testDate so it's not available
  vm.runInContext(`
    D.svcs = [{
      id: 99,
      tid: 't1',
      date: '${testDate}',
      start: 900, // 15:00
      dur: 180,
      st: 'Confirmado',
      svcType: '1',
      block: 'tarde'
    }];
  `, context);

  vm.runInContext("selectedBlock = 'manana';", context);
  getOrCreate('b_time').value = '08:00';
  // Call updateSlots keeping the 08:00 pickup selection
  vm.runInContext("updateSlots(true);", context);

  const submitBlockAlert = getOrCreate('submitBlockAlert');
  const availStatus = getOrCreate('availStatus');
  const submitBtn = getOrCreate('submitBtn');

  assert.strictEqual(submitBlockAlert.style.display, 'block', 'submitBlockAlert shown on 6h conflict');
  assert(submitBlockAlert.innerHTML.includes('6 horas'), 'Alert mentions 6 hours');
  assert(availStatus.innerHTML.includes(expected6hConflict), 'availStatus shows 6h conflict solution');
  assert.strictEqual(submitBtn.disabled, false, 'submitBtn remains clickable for user feedback');
  console.log('✔ updateSlots displays 6h guidance in Section 2 and above submitBtn in Section 4.');

  // Test 3C: Pressing submit with 6h schedule conflict executes scroll to Section 2 error box
  scrolledTo = null;
  await vm.runInContext("submitBooking({ preventDefault: () => {} });", context);
  assert(scrolledTo !== null, 'Must scroll when schedule conflict exists');
  assert(['availStatus', 'b_time', 'selStayDestino', 'timeSectionTitle'].includes(scrolledTo.id), `Scrolled to Section 2 error indicator (got: ${scrolledTo.id})`);
  assert.strictEqual(scrolledTo.opts.behavior, 'smooth', 'Must use smooth scroll');
  console.log('✔ Submitting with conflict triggers smooth scroll to Section 2 error box.');

  console.log('\nAll UX validation and scroll tests passed successfully! 🚀');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
