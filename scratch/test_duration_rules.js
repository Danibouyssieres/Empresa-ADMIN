const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('reservar.html', 'utf8');

// Mock DOM elements
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
  }
  querySelector(sel) {
    if (sel.includes('option[value="')) {
      const val = sel.match(/value="([^"]+)"/)[1];
      return this.options.find(o => o.value === val) || null;
    }
    return null;
  }
  setAttribute(k, v) { this[k] = v; }
  removeAttribute(k) { delete this[k]; }
}

const elements = {};
function getOrCreate(id, tag = 'div') {
  if (!elements[id]) elements[id] = new ElementMock(id, tag);
  return elements[id];
}

// Intercept innerHTML on select elements to populate mock options
['selHours34', 'selMins34', 'b_svc_type', 'b_time', 'b_date', 'b_tens', 'selStayDestino', 'selEventStart1'].forEach(id => {
  const el = getOrCreate(id, 'select');
  if(id === 'b_svc_type') el.value = '1';
  let inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get: () => inner,
    set: (html) => {
      inner = html;
      const optRegex = /<option[^>]*value="([^"]*)"[^>]*>(.*?)<\/option>/gi;
      const opts = [];
      let m;
      while ((m = optRegex.exec(html)) !== null) {
        opts.push({
          value: m[1],
          textContent: m[2].replace(/<[^>]*>/g, ''),
          disabled: m[0].includes('disabled'),
          selected: m[0].includes('selected')
        });
      }
      el.options = opts;
      if (opts.length > 0 && !opts.some(o => o.value === el.value)) {
        const sel = opts.find(o => o.selected);
        el.value = sel ? sel.value : opts[0].value;
      }
    }
  });
});

const sandbox = {
  window: {},
  document: {
    documentElement: { setAttribute: () => {} },
    getElementById: (id) => getOrCreate(id),
    querySelector: (sel) => {
      const id = sel.replace('#', '');
      return getOrCreate(id);
    },
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  $: (sel) => {
    const id = sel.replace('#', '');
    return getOrCreate(id);
  },
  $$: () => [],
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  navigator: {
    geolocation: { getCurrentPosition: () => {} }
  },
  L: {
    map: () => {
      const m = { on: () => {}, invalidateSize: () => {} };
      m.setView = () => m;
      return m;
    },
    tileLayer: () => ({ addTo: () => {} }),
    marker: () => ({ addTo: () => ({ on: () => {}, setLatLng: () => {} }), setLatLng: () => {} }),
    icon: () => ({}),
    divIcon: () => ({}),
    polyline: () => ({ addTo: () => {} })
  },
  console: console,
  setTimeout: () => {},
  clearTimeout: () => {},
  addEventListener: () => {},
  alerts: []
};
sandbox.alert = (msg) => sandbox.alerts.push(msg);

// Extract the main JS code from the second script tag
const scripts = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi);
const mainScript = scripts[scripts.length - 1].replace(/<\/?script[^>]*>/gi, '');

// Run script in sandbox
vm.createContext(sandbox);
vm.runInContext(mainScript, sandbox);

console.log('Script loaded successfully in VM');

// TEST SUITE
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// TEST 1: Modalidad 3 (Cuidados a Domicilio) - Ring 1 (Maipú)
vm.runInContext(`
  $('#b_svc_type').value = '3';
  detectedRing = RINGS_DATA[0]; // Anillo 1
  detectedComuna = 'Maipú';
  refreshDuration34Options(true);
`, sandbox);

const optsRing1 = sandbox.$('#selHours34').options.map(o => o.value);
assert(optsRing1.join(',') === '2,3,4,5,6', `Modalidad 3 Ring 1 hours should be 2,3,4,5,6 (got: ${optsRing1.join(',')})`);
assert(sandbox.$('#selHours34').value === '2', `Modalidad 3 default hour should be 2 (got: ${sandbox.$('#selHours34').value})`);
assert(sandbox.$('#selMins34').disabled === false, 'Modalidad 3 mins selector enabled when hours < 6');

// Test selecting 6 hours in Mode 3 locks mins selector
vm.runInContext(`
  $('#selHours34').value = '6';
  onHours34Change();
`, sandbox);
assert(sandbox.$('#selMins34').value === '0', 'Minutes forced to 0 when 6h selected');
assert(sandbox.$('#selMins34').disabled === true, 'Minutes disabled when 6h selected');

// TEST 2: Modalidad 3 - Ring 2 (Santiago Centro / Providencia)
vm.runInContext(`
  detectedRing = RINGS_DATA[1]; // Anillo 2
  detectedComuna = 'Providencia';
  refreshDuration34Options(true);
`, sandbox);
const optsRing2 = sandbox.$('#selHours34').options.map(o => o.value);
assert(optsRing2.join(',') === '3,4,5,6', `Modalidad 3 Ring 2 hours should be 3,4,5,6 (got: ${optsRing2.join(',')})`);
assert(sandbox.$('#selHours34').value === '3', `Modalidad 3 Ring 2 default hour should be 3 (got: ${sandbox.$('#selHours34').value})`);

// TEST 3: Modalidad 3 - Ring 3 (Las Condes / Vitacura)
vm.runInContext(`
  detectedRing = RINGS_DATA[2]; // Anillo 3
  detectedComuna = 'Las Condes';
  refreshDuration34Options(true);
`, sandbox);
const optsRing3 = sandbox.$('#selHours34').options.map(o => o.value);
assert(optsRing3.join(',') === '4,5,6', `Modalidad 3 Ring 3 hours should be 4,5,6 (got: ${optsRing3.join(',')})`);
assert(sandbox.$('#selHours34').value === '4', `Modalidad 3 Ring 3 default hour should be 4 (got: ${sandbox.$('#selHours34').value})`);

// TEST 4: Address input triggers ring detection and updates duration options
vm.runInContext(`
  $('#b_from').value = 'Av. Providencia 1234, Providencia';
  onFromBlur();
`, sandbox);
const ringId = vm.runInContext('detectedRing ? detectedRing.id : null', sandbox);
assert(ringId === 2, `Ring detected as 2 from Providencia address (got: ${ringId})`);
const updatedOpts = sandbox.$('#selHours34').options.map(o => o.value);
assert(updatedOpts[0] === '3', `Minimum hour option is 3 for Providencia (got: ${updatedOpts[0]})`);

// TEST 5: Modalidad 4 (Asistencia en Eventos Sociales)
vm.runInContext(`
  $('#b_svc_type').value = '4';
  onServiceTypeChange();
`, sandbox);

const optsMode4 = sandbox.$('#selHours34').options.map(o => o.value);
assert(optsMode4.length === 2 && optsMode4[0] === '4' && optsMode4[1] === '6', `Modalidad 4 has strictly 4 and 6 hours (got: ${optsMode4.join(',')})`);
assert(sandbox.$('#selHours34').value === '4', `Modalidad 4 default is 4 hours (got: ${sandbox.$('#selHours34').value})`);
assert(sandbox.$('#selMins34').value === '0', 'Modalidad 4 minutes fixed at 0');
assert(sandbox.$('#selMins34').disabled === true, 'Modalidad 4 minutes disabled');

// TEST 6: Modalidad 4 Pricing
// Pure daytime event (09:00, 4h and 6h)
// TEST 6: Modalidad 4 Flat Rates
// Option A: Sin Traslado
vm.runInContext(`
  $('#b_date').value = '2026-10-28'; // Miércoles hábil
  $('#b_time').value = '09:00';
  selectedEventSubMode = 'sin_traslado';
  $('#selHours34').value = '4';
  recalcAll();
`, sandbox);
let cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 65000, `Modalidad 4 Sin Traslado 4h flat cost should be $65.000 (got: ${cost})`);

vm.runInContext(`
  $('#selHours34').value = '6';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 95000, `Modalidad 4 Sin Traslado 6h flat cost should be $95.000 (got: ${cost})`);

// Option B: Con Traslado
vm.runInContext(`
  selectedEventSubMode = 'con_traslado';
  $('#selHours34').value = '4';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 95000, `Modalidad 4 Con Traslado 4h flat cost should be $95.000 (got: ${cost})`);

vm.runInContext(`
  $('#selHours34').value = '6';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 125000, `Modalidad 4 Con Traslado 6h flat cost should be $125.000 (got: ${cost})`);

// Eventos flat rates apply uniformly across weekend/night schedules without surcharge
vm.runInContext(`
  currentJornada = 'nocturno';
  $('#b_time').value = '22:00';
  selectedEventSubMode = 'con_traslado';
  $('#selHours34').value = '6';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 125000, `Modalidad 4 Con Traslado in nocturno remains flat $125.000 (got: ${cost})`);

// TEST 7: Modalidad 4 Biological rest & night schedule
const svcNight = {
  start: 22 * 60,
  dur: 360,
  block: 'noche',
  blocksNextMorning: true
};
const doesNightEndAfter22 = vm.runInContext(`doesServiceEndAfter22(${JSON.stringify(svcNight)})`, sandbox);
assert(doesNightEndAfter22 === true, 'Turno Noche service ends after 22:00 / blocks next morning');

// An afternoon event starting at 17:00 with 6 hours ends at 23:00 (> 22:00)
const svcLateAfternoon = {
  start: 17 * 60,
  dur: 360,
  block: 'tarde',
  blocksNextMorning: false
};
const doesLateEndAfter22 = vm.runInContext(`doesServiceEndAfter22(${JSON.stringify(svcLateAfternoon)})`, sandbox);
assert(doesLateEndAfter22 === true, 'Afternoon service ending at 23:00 (>22:00) doesServiceEndAfter22 is true');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
