const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST SUITE: INTERREGIONAL EARLY PICKUP & NIGHT REST BLOCK ---');

const htmlPath = path.resolve(__dirname, '../reservar.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract main script content (second non-src script tag in reservar.html)
const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi)];
if (scriptMatches.length < 2) {
  console.error('❌ Could not find main script in reservar.html');
  process.exit(1);
}

let scriptContent = scriptMatches[1][1];
// Mock initForm so it doesn't auto-run on load
scriptContent = scriptContent.replace('initForm();', '// initForm();');
scriptContent += `
;window.INTERREGIONAL_HOURS = INTERREGIONAL_HOURS;
window.calcSuggestedPickup = calcSuggestedPickup;
window.toYMD = toYMD;
window.addDaysYMD = addDaysYMD;
window.D = D;
window.evaluateDateCapacity = evaluateDateCapacity;
window.getCurrentSuggestedHour = () => currentSuggestedHour;
window.setLastRouteIdaMin = (v) => { lastRouteIdaMin = v; };
`;

// Mock minimal DOM and browser environment
const domElements = {
  b_svc_type: { value: '5' },
  b_time: { value: '05:30', innerHTML: '', disabled: false, focus: () => {}, style: {} },
  suggestedPickupCallout: { style: {} },
  suggestedPickupMsg: { innerHTML: '' },
  btnApplySuggestedPickup: { style: {}, textContent: '' },
  appTimeInput: { value: '08:00' },
  b_date: { value: '2026-11-15' }
};

const createMockEl = () => ({
  style: {},
  innerHTML: '',
  value: '',
  options: [],
  classList: { toggle: () => {}, remove: () => {}, add: () => {}, contains: () => false },
  querySelector: () => null,
  addEventListener: () => {},
  setAttribute: () => {},
  removeAttribute: () => {}
});

const mockWindow = {
  document: {
    addEventListener: () => {},
    getElementById: (id) => domElements[id] || createMockEl(),
    querySelector: (sel) => {
      const id = sel.replace('#', '');
      return domElements[id] || createMockEl();
    },
    querySelectorAll: () => []
  },
  $: (sel) => {
    const id = sel.replace('#', '');
    return domElements[id] || createMockEl();
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  addEventListener: () => {},
  L: {
    map: () => {
      const m = {
        setView: function() { return m; },
        on: function() { return m; }
      };
      return m;
    },
    tileLayer: () => ({ addTo: () => {} }),
    marker: () => ({ addTo: () => {}, bindPopup: () => {} }),
    polyline: () => ({ addTo: () => {} }),
    icon: () => ({}),
    divIcon: () => ({})
  },
  console: console
};
mockWindow.window = mockWindow;
mockWindow.globalThis = mockWindow;

const context = vm.createContext(mockWindow);

try {
  vm.runInContext(scriptContent, context);
  console.log('✅ Script loaded successfully without syntax errors.');
} catch (err) {
  console.error('❌ Syntax / execution error when loading script:', err);
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(cond, desc) {
  if (cond) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failed++;
  }
}

// 1. Verify INTERREGIONAL_HOURS
const hours = mockWindow.INTERREGIONAL_HOURS;
assert(Array.isArray(hours), 'INTERREGIONAL_HOURS is an array');
assert(hours[0] === '05:00', 'First slot is 05:00');
assert(hours[1] === '05:15', 'Second slot is 05:15');
assert(hours[2] === '05:30', 'Third slot is 05:30');
assert(hours[3] === '05:45', 'Fourth slot is 05:45');
assert(hours[4] === '06:00', 'Fifth slot is 06:00');
assert(hours.includes('08:30') && hours.includes('09:00'), 'Includes slots up to 09:00');
assert(hours.length === 17, `Contains 17 slots in 15-min intervals (got ${hours.length})`);

// 2. Verify calcSuggestedPickup logic for Modalidad 5
mockWindow.setLastRouteIdaMin(110);
domElements.b_svc_type.value = '5';
domElements.appTimeInput.value = '08:00'; // 480 min. 480 - (110 + 35) = 335 min (05:35).
mockWindow.calcSuggestedPickup();

const sugHour1 = mockWindow.getCurrentSuggestedHour();
assert(sugHour1 === '05:30', `Suggested hour rounded down to 05:30 (got: ${sugHour1})`);
assert(domElements.suggestedPickupMsg.innerHTML.includes('05:30 hrs'), 'Message mentions 05:30 hrs');
assert(domElements.suggestedPickupMsg.innerHTML.includes('cada 15 min'), 'Message explains 15 min slot adjustment');

// Test edge case: early appointment at 07:00 (420 min). 420 - 145 = 275 min (04:35). Floor 05:00 (300 min).
domElements.appTimeInput.value = '07:00';
mockWindow.calcSuggestedPickup();
const sugHour2 = mockWindow.getCurrentSuggestedHour();
assert(sugHour2 === '05:00', `Clamps to lower bound 05:00 when earlier (got: ${sugHour2})`);

// Test standard appointment at 11:30 in interregional (690 min). 690 - 145 = 545 min (09:05). Clamps to 09:00 (540 min).
domElements.appTimeInput.value = '11:30';
mockWindow.calcSuggestedPickup();
const sugHour3 = mockWindow.getCurrentSuggestedHour();
assert(sugHour3 === '09:00', `Clamps to upper bound 09:00 when later (got: ${sugHour3})`);

// 3. Test Safety & Rest Block on Previous Night
// Setup D.svcs
const todayStr = mockWindow.toYMD(new Date());
const day10 = mockWindow.addDaysYMD(todayStr, 10);
const day9 = mockWindow.addDaysYMD(todayStr, 9);
const day8 = mockWindow.addDaysYMD(todayStr, 8);

mockWindow.D.svcs = [];
mockWindow.D.blocks = [];

// Case A: Day 10 has an interregional service booked (svcType: '5')
mockWindow.D.svcs.push({
  id: 101,
  tid: 't1',
  date: day10,
  start: 330, // 05:30
  dur: 360,
  st: 'Confirmado',
  svcType: '5',
  block: 'full',
  fullDay: true,
  blocksPrevNight: true
});

// Evaluate Day 9 (day before Day 10)
const evalDay9 = mockWindow.evaluateDateCapacity(day9);
assert(evalDay9.noche.available === false, 'Day 9 Turno Noche is BLOCKED when Day 10 has an Interregional booking');
assert(evalDay9.noche.reason.includes('viaje interregional'), `Reason explains interregional trip next morning (got: "${evalDay9.noche.reason}")`);
assert(evalDay9.manana.available === true, 'Day 9 Turno Mañana remains available');
assert(evalDay9.tarde.available === true, 'Day 9 Turno Tarde remains available');

// Case B: Reciprocal rule - Day 8 has a Turno Noche booked
mockWindow.D.svcs.push({
  id: 102,
  tid: 't1',
  date: day8,
  start: 1320, // 22:00
  dur: 360,
  st: 'Confirmado',
  svcType: '3',
  block: 'noche',
  blocksNextMorning: true
});

// Evaluate Day 9 for interregional (Day 8 had Turno Noche)
const evalDay9Reciprocal = mockWindow.evaluateDateCapacity(day9);
assert(evalDay9Reciprocal.interregional.available === false, 'Day 9 Interregional is BLOCKED when Day 8 has a Turno Noche booked');
assert(evalDay9Reciprocal.interregional.reason.includes('Turno Noche'), `Reason explains previous night service (got: "${evalDay9Reciprocal.interregional.reason}")`);

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
