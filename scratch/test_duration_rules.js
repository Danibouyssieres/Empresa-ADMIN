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
vm.runInContext(`
  $('#b_date').value = '2026-10-28'; // Miércoles hábil
  $('#b_time').value = '09:00';
  currentJornada = 'habil';
  $('#selHours34').value = '4';
  recalcAll();
`, sandbox);
let cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 48000, `Modalidad 4 hábil diurno 4h cost should be $48.000 (got: ${cost})`);

vm.runInContext(`
  $('#selHours34').value = '6';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 64000, `Modalidad 4 hábil diurno 6h cost should be $64.000 (got: ${cost})`);

// Proportional crossing 20:00 (14:30 + 6h = ends at 20:30: 5.5h @ $12k + 0.5h @ $18k = $75.000)
vm.runInContext(`
  $('#b_time').value = '14:30';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 75000, `Modalidad 4 crossing 20:00 (14:30 to 20:30) proportional cost should be $75.000 (got: ${cost})`);

// Weekend diurno (+25%)
vm.runInContext(`
  currentJornada = 'tarde';
  $('#b_time').value = '09:00';
  $('#selHours34').value = '4';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 60000, `Modalidad 4 fin de semana diurno 4h cost should be $60.000 (got: ${cost})`);

vm.runInContext(`
  $('#selHours34').value = '6';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 80000, `Modalidad 4 fin de semana diurno 6h cost should be $80.000 (got: ${cost})`);

// Weekend proportional crossing 20:00 (14:30 to 20:30: 5.5h @ $15k ($82.5k) + 0.5h @ $18k ($9k) = $91.500)
vm.runInContext(`
  $('#b_time').value = '14:30';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 91500, `Modalidad 4 weekend crossing 20:00 proportional cost should be $91.500 (got: ${cost})`);

// Nocturno (+50%)
vm.runInContext(`
  currentJornada = 'nocturno';
  $('#b_time').value = '22:00';
  $('#selHours34').value = '4';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 72000, `Modalidad 4 nocturno 4h cost should be $72.000 (got: ${cost})`);

vm.runInContext(`
  $('#selHours34').value = '6';
  recalcAll();
`, sandbox);
cost = vm.runInContext('lastTimeCost', sandbox);
assert(cost === 96000, `Modalidad 4 nocturno 6h cost should be $96.000 (got: ${cost})`);

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
