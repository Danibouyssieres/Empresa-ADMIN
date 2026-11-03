const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('reservar.html', 'utf8');

// 1. Static HTML assertions
assert(!html.includes('(+25%)'), 'reservar.html must not contain (+25%)');
assert(!html.includes('(+50%)'), 'reservar.html must not contain (+50%)');
assert(html.includes('Sábados, domingos y festivos estándar'), 'HTML must include "Sábados, domingos y festivos estándar"');
assert(html.includes('Feriados oficiales irrenunciables y cobertura nocturna'), 'HTML must include "Feriados oficiales irrenunciables y cobertura nocturna"');

// 2. DOM emulation tests for reactivity
function createMockElement(id = '', tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); },
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
    },
    children: [],
    options: [],
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelector(sel) {
      if(sel === 'small') return this.children.find(c => c.tagName === 'SMALL');
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
}

const dom = {};
function getEl(id) {
  if (!dom[id]) dom[id] = createMockElement(id);
  return dom[id];
}

const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)(?:[^>]*)>([\s\S]*?)<\/script>/gi)];
const inlineScript = scriptMatches.map(m => m[1]).join('\n');

const mockWindow = {
  document: {
    documentElement: { setAttribute: () => {} },
    getElementById: (id) => getEl(id),
    querySelector: (sel) => {
      if (sel.startsWith('#')) return getEl(sel.slice(1));
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  navigator: { geolocation: {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};

const context = {
  window: mockWindow,
  document: mockWindow.document,
  localStorage: mockWindow.localStorage,
  navigator: mockWindow.navigator,
  addEventListener: () => {},
  removeEventListener: () => {},
  alert: () => {},
  console: console,
  setTimeout: () => {},
  clearTimeout: () => {},
  Math: Math,
  Date: Date,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  L: {
    map: () => {
      const m = { setView: () => m, on: () => m, invalidateSize: () => m, removeLayer: () => m };
      return m;
    },
    tileLayer: () => ({ addTo: () => {} }),
    circleMarker: () => ({ addTo: () => ({}) }),
    geoJSON: () => ({ addTo: () => ({}), getBounds: () => ({}) }),
    marker: () => ({ addTo: () => ({ bindPopup: () => ({ openPopup: () => {} }) }) }),
    polyline: () => ({ addTo: () => {} }),
    divIcon: () => ({}),
    latLngBounds: () => ({ pad: () => ({}) })
  }
};

const vm = require('vm');
vm.createContext(context);

// Pre-populate elements needed
[
  'b_svc_type', 'b_date', 'b_time', 'jornadaSelectorWrap', 'interProgSelectorWrap',
  'eventSubModeBox', 'interregionalRegionBox', 'routeLayoutBox', 'mapColumn', 'destWrap',
  'kmCalcControls', 'b_from', 'b_to', 'timeSectionSub', 'pillJornada_habil',
  'pillJornada_tarde', 'pillJornada_nocturno', 'subJornadaTarde', 'titleJornadaNocturno',
  'subJornadaNocturno', 'lblRateHabil', 'lblRateTarde', 'lblRateNocturno',
  'selHours34', 'selMins34', 'selStayDestino', 'btnCalcularHora', 'appTimeInput',
  'timelineBadge', 'boxRecogida', 'boxLlegada', 'boxPermanencia', 'boxTermino',
  'boxRetorno', 'boxMediodiaWarning', 'summaryHoursCost', 'summaryKmCost',
  'summaryTotalCost', 'summaryAbono', 'summarySaldo'
].forEach(id => getEl(id));

getEl('b_svc_type').value = '1';
getEl('b_date').value = '2026-11-04'; // miércoles hábil
getEl('b_time').value = '08:00';
getEl('selStayDestino').value = '60';

vm.runInContext(inlineScript, context);

// Test 1: Mode 1 (Servicio Integral)
context.onServiceTypeChange();
assert.strictEqual(getEl('titleJornadaNocturno').textContent, 'Día Festivo (06:00 a 20:00)');
assert.strictEqual(getEl('subJornadaTarde').textContent, 'Sábados, domingos y festivos estándar');
assert.strictEqual(getEl('subJornadaNocturno').textContent, 'Feriados oficiales irrenunciables y cobertura nocturna');
assert.strictEqual(getEl('lblRateHabil').textContent, '$12.000/h ($1.000/km)');
assert.strictEqual(getEl('lblRateTarde').textContent, '$15.000/h ($1.000/km)');
assert.strictEqual(getEl('lblRateNocturno').textContent, '$18.000/h ($1.000/km)');

// Test 2: Mode 2 (Traslado Exclusivo con Espera)
getEl('b_svc_type').value = '2';
context.onServiceTypeChange();
assert.strictEqual(getEl('titleJornadaNocturno').textContent, 'Día Festivo (06:00 a 20:00)');
assert.strictEqual(getEl('subJornadaTarde').textContent, 'Sábados, domingos y festivos estándar');
assert.strictEqual(getEl('subJornadaNocturno').textContent, 'Feriados oficiales irrenunciables y cobertura nocturna');
assert.strictEqual(getEl('lblRateHabil').textContent, '$8.000/h ($1.000/km)');
assert.strictEqual(getEl('lblRateTarde').textContent, '$10.000/h ($1.000/km)');
assert.strictEqual(getEl('lblRateNocturno').textContent, '$12.000/h ($1.000/km)');

// Test 3: Mode 3 (Cuidados a Domicilio)
getEl('b_svc_type').value = '3';
context.onServiceTypeChange();
assert.strictEqual(getEl('titleJornadaNocturno').textContent, 'Día Festivo (06:00 a 20:00) y Turno Noche (22:00 a 04:00)');
assert.strictEqual(getEl('subJornadaTarde').textContent, 'Sábados, domingos y festivos estándar');
assert.strictEqual(getEl('subJornadaNocturno').textContent, 'Feriados oficiales irrenunciables y cobertura nocturna');
assert.strictEqual(getEl('lblRateHabil').textContent, '$12.000/h');
assert.strictEqual(getEl('lblRateTarde').textContent, '$15.000/h');
assert.strictEqual(getEl('lblRateNocturno').textContent, '$18.000/h');

// Test 4: Mode 4 (Acompañamiento en Eventos)
getEl('b_svc_type').value = '4';
context.onServiceTypeChange();
assert.strictEqual(getEl('titleJornadaNocturno').textContent, 'Día Festivo (06:00 a 20:00) y Turno Noche (22:00 a 04:00)');
assert.strictEqual(getEl('lblRateHabil').textContent, '$12.000/h');
assert.strictEqual(getEl('lblRateTarde').textContent, '$15.000/h');
assert.strictEqual(getEl('lblRateNocturno').textContent, '$18.000/h');

// Test 5: Switch back to Mode 1 and test calendar sync
getEl('b_svc_type').value = '1';
context.onServiceTypeChange();
assert.strictEqual(getEl('lblRateHabil').textContent, '$12.000/h ($1.000/km)');
assert.strictEqual(getEl('lblRateTarde').textContent, '$15.000/h ($1.000/km)');
assert.strictEqual(getEl('lblRateNocturno').textContent, '$18.000/h ($1.000/km)');
assert.strictEqual(getEl('titleJornadaNocturno').textContent, 'Día Festivo (06:00 a 20:00)');

console.log('✅ All rate cards labels, titles, and reactivity tests PASSED!');
