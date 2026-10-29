const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('Testing Event Pack Route Metrics and Timeline in reservar.html...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Static HTML Assertions
assert(content.includes('id="packRouteMetricsCard"'), 'Must have #packRouteMetricsCard in HTML');
assert(content.includes('id="packMetricKm"'), 'Must have #packMetricKm in HTML');
assert(content.includes('id="packMetricTime"'), 'Must have #packMetricTime in HTML');
assert(content.includes('Kilometraje incluido en el pack contratado'), 'Must contain "Kilometraje incluido en el pack contratado" badge');
assert(content.includes('Sin cobro adicional por km para tarifas planas'), 'Must contain explanatory text about no additional km charges');
assert(content.includes('id="serviceTimelineBox"'), 'Must have #serviceTimelineBox in HTML');
assert(content.includes('id="tlBadge"'), 'Must have #tlBadge in HTML');
assert(content.includes('id="tlHoraRecogida"'), 'Must have #tlHoraRecogida in HTML');
assert(content.includes('id="tlHoraLlegadaDestino"'), 'Must have #tlHoraLlegadaDestino in HTML');
assert(content.includes('id="tlTiempoDestino"'), 'Must have #tlTiempoDestino in HTML');
assert(content.includes('id="tlHoraRetorno"'), 'Must have #tlHoraRetorno in HTML');
assert(content.includes('id="tlHorasEfectivas"'), 'Must have #tlHorasEfectivas in HTML');
assert(content.includes('id="tlDesgloseDetalle"'), 'Must have #tlDesgloseDetalle in HTML');
console.log('✔ Static HTML assertions passed.');

// 2. VM Environment Setup
function createMockEnv() {
  const elements = {};

  function makeEl(id, tag = 'div') {
    if (elements[id]) return elements[id];
    const el = {
      id,
      tagName: tag.toUpperCase(),
      value: '',
      textContent: '',
      innerHTML: '',
      disabled: false,
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
      querySelector(sel) {
        return makeEl(id + '_' + sel.replace(/[^a-zA-Z0-9]/g, ''));
      },
      querySelectorAll() { return []; },
      addEventListener() {},
      removeAttribute() {},
      setAttribute() {},
      getBoundingClientRect() { return { top: 0, bottom: 0 }; },
      scrollIntoView() {}
    };

    let innerHTMLVal = '';
    Object.defineProperty(el, 'innerHTML', {
      get() { return innerHTMLVal; },
      set(val) {
        innerHTMLVal = val;
        if (el.tagName === 'SELECT') {
          const optMatches = [...val.matchAll(/<option\s+value="([^"]*)"([^>]*)>([\s\S]*?)<\/option>/gi)];
          el.options = optMatches.map(m => ({
            value: m[1],
            disabled: /disabled/i.test(m[2]),
            text: m[3]
          }));
        }
      }
    });

    elements[id] = el;
    return el;
  }

  const ids = [
    'b_svc_type', 'b_time', 'b_date', 'b_from', 'b_to', 'b_depto',
    'routeLayoutBox', 'mapColumn', 'destWrap', 'kmCalcControls', 'packCalcControls',
    'eventSubModeBox', 'eventBtn_sin', 'eventBtn_con', 'eventChk_sin', 'eventChk_con',
    'jornadaSelectorWrap', 'interProgSelectorWrap', 'interregionalRegionBox',
    'pillJornada_habil', 'pillJornada_tarde', 'pillJornada_nocturno',
    'lblRateHabil', 'lblRateTarde', 'lblRateNocturno',
    'subJornadaTarde', 'subJornadaNocturno', 'titleJornadaNocturno',
    'durationBox12', 'durationBox34', 'selStayDestino', 'lblStayDestino',
    'hours34Col', 'mins34Col', 'eventStartCol', 'selHours34', 'selMins34', 'lblHours34', 'lblMins34',
    'timeSectionTitle', 'timeSectionSub', 'timeSectionBadge',
    'pickupScheduleGrid', 'colAsistentePickup', 'colDurationService',
    'asistenteBox', 'homeTimeWrap', 'lblPickupSelect',
    'serviceTimelineBox', 'tlBadge', 'tlHoraRecogidaLabel', 'tlHoraRecogida',
    'tlHoraLlegadaDestinoLabel', 'tlHoraLlegadaDestino',
    'tlTiempoDestinoLabel', 'tlTiempoDestino',
    'tlHoraRetornoLabel', 'tlHoraRetorno',
    'tlHorasEfectivasLabel', 'tlHorasEfectivas', 'tlDesgloseDetalle',
    'sumKmTimeSection', 'directTimeOnlySection',
    'sumBoxTitle', 'sumKmText', 'sumKmVal', 'sumTimeLabel', 'sumTimeVal',
    'sumRawTotal', 'sumRingFloorRow', 'sumRingFloorVal', 'sumFinalTotal', 'sumAbono50', 'sumSaldoFinal',
    'dirSvcLbl', 'dirSvcName', 'dirRegionRow', 'dirRegionVal', 'dirTimeLbl', 'dirTimeDesc',
    'dirFinalTotal', 'dirAbono50', 'dirSaldoFinal',
    'lblTimeSummaryDesc', 'lblTimeSummaryVal',
    'routeStatusMsg', 'packRouteMetricsCard', 'packMetricKm', 'packMetricTime',
    'resultPanel', 'lblResultTitle', 'outKm', 'outTime', 'outPrice',
    'bdOneWay', 'rowReturn', 'bdReturn', 'bdMode', 'bdTotalPrice',
    'ringInfoBox', 'ringTitle', 'ringDesc', 'map', 'btnPackRouteCalc'
  ];

  ids.forEach(id => {
    const isSelect = ['b_time', 'selHours34', 'selMins34', 'b_svc_type', 'selStayDestino'].includes(id);
    const el = makeEl(id, isSelect ? 'select' : 'div');
    if(id === 'b_svc_type') el.value = '1';
  });

  const sandbox = {
    console,
    window: {},
    document: {
      documentElement: { setAttribute: () => {} },
      getElementById: (id) => makeEl(id),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return makeEl(sel.slice(1));
        return makeEl('mock_' + sel.replace(/[^a-zA-Z0-9]/g, ''));
      },
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: (tag) => makeEl('temp_' + Math.random(), tag),
      body: { appendChild: () => {} }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    alert: () => {},
    navigator: { geolocation: {} },
    L: {
      map: () => {
        const m = { setView: () => m, on: () => m, invalidateSize: () => m, removeLayer: () => m, fitBounds: () => m };
        return m;
      },
      tileLayer: () => ({ addTo: () => ({}) }),
      geoJSON: () => ({ addTo: () => ({ getBounds: () => ({}) }) }),
      marker: () => ({ addTo: () => ({ on: () => ({}), bindPopup: () => ({ openPopup: () => ({}) }) }) }),
      polyline: () => ({ addTo: () => ({}) }),
      divIcon: () => ({}),
      latLngBounds: () => ({ pad: () => ({}) })
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) })
  };
  sandbox.window = sandbox;
  sandbox.$ = (id) => {
    if (typeof id === 'string' && id.startsWith('#')) return makeEl(id.slice(1));
    return makeEl(String(id).replace(/[^a-zA-Z0-9]/g, ''));
  };

  return { sandbox, elements };
}

// Extract scripts from reservar.html
const scriptMatches = [...content.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
const fullScript = scriptMatches.map(m => m[1]).join('\n;\n');

const { sandbox, elements } = createMockEnv();
vm.createContext(sandbox);

try {
  vm.runInContext(fullScript, sandbox);
  console.log('✔ Script evaluated successfully in VM context.');
} catch (e) {
  console.error('Script evaluation error:', e);
  process.exit(1);
}

// 3. Test Modalidad 4 with "sin_traslado" (Sin Traslado)
sandbox.elements = elements;
sandbox.$('#b_svc_type').value = '4';
sandbox.selectEventSubMode('sin_traslado');

assert.strictEqual(elements.serviceTimelineBox.style.display, 'none', 'Timeline box must be hidden in Modalidad 4 Sin Traslado');
assert.strictEqual(elements.packRouteMetricsCard.style.display, 'none', 'Pack route metrics card must be hidden in Modalidad 4 Sin Traslado');
console.log('✔ Modalidad 4 (sin traslado) correctly hides timeline and metrics card.');

// 4. Test Modalidad 4 with "con_traslado" (Con Traslado)
sandbox.selectEventSubMode('con_traslado');
assert.strictEqual(elements.serviceTimelineBox.style.display, 'block', 'Timeline box must be visible in Modalidad 4 Con Traslado');
assert.strictEqual(elements.tlBadge.textContent, 'Ida + Asistencia en Evento + Retorno', 'tlBadge must be "Ida + Asistencia en Evento + Retorno"');

// Set date, tarde block, pickup time to 16:00, plan to 4 hours, and simulate route metrics
sandbox.selectCalendarDate('2026-11-15');
sandbox.selectShiftBlock('tarde');
elements.b_time.value = '16:00';
elements.selHours34.value = '4';
sandbox.renderPricing(18.5, 18.5, 37.0, 70, 35, 35); // 37 km total, 35 min ida, 35 min retorno

assert.strictEqual(elements.packRouteMetricsCard.style.display, 'block', 'Metrics card must be visible after route computation');
assert(elements.packMetricKm.textContent.includes('37,0 km (Ida + Vuelta)'), `Km text should match: got ${elements.packMetricKm.textContent}`);
assert(elements.packMetricTime.textContent.includes('35 min de ida + 35 min de retorno'), `Time text should match: got ${elements.packMetricTime.textContent}`);

// Check 5 boxes for 4 hrs plan:
// Casilla 1: 16:00 hrs
assert.strictEqual(elements.tlHoraRecogida.textContent, '16:00 hrs', 'Casilla 1 should be 16:00 hrs');
// Casilla 2: 16:00 + 35 min = 16:35 hrs
assert.strictEqual(elements.tlHoraLlegadaDestino.textContent, '16:35 hrs', 'Casilla 2 should be 16:35 hrs');
// Casilla 3: 4 hrs continuas
assert.strictEqual(elements.tlTiempoDestino.textContent, '4 hrs continuas', 'Casilla 3 should be 4 hrs continuas');
// Casilla 4: 16:35 + 240 min = 20:35 + 35 min retorno = 21:10 hrs
assert.strictEqual(elements.tlHoraRetorno.textContent, '21:10 hrs', 'Casilla 4 should be 21:10 hrs');
// Casilla 5: 35 + 240 + 35 = 310 min = 5 h 10 min
assert(elements.tlHorasEfectivas.textContent.includes('5 h 10 min') && elements.tlHorasEfectivas.textContent.includes('310 min'), `Casilla 5 should be 5 h 10 min (310 min), got: ${elements.tlHorasEfectivas.textContent}`);
console.log('✔ Timeline 5 boxes correctly computed for 4 hrs plan with route metrics.');

// 5. Test Reactivity on Plan Change: switch to 6 hrs
elements.selHours34.value = '6';
sandbox.onHours34Change();

// Casilla 1: still 16:00 hrs
assert.strictEqual(elements.tlHoraRecogida.textContent, '16:00 hrs', 'Casilla 1 should stay 16:00 hrs');
// Casilla 2: still 16:35 hrs
assert.strictEqual(elements.tlHoraLlegadaDestino.textContent, '16:35 hrs', 'Casilla 2 should stay 16:35 hrs');
// Casilla 3: 6 hrs continuas
assert.strictEqual(elements.tlTiempoDestino.textContent, '6 hrs continuas', 'Casilla 3 should now be 6 hrs continuas');
// Casilla 4: 16:35 + 360 min = 22:35 + 35 min retorno = 23:10 hrs
assert.strictEqual(elements.tlHoraRetorno.textContent, '23:10 hrs', 'Casilla 4 should now be 23:10 hrs');
// Casilla 5: 35 + 360 + 35 = 430 min = 7 h 10 min
assert(elements.tlHorasEfectivas.textContent.includes('7 h 10 min') && elements.tlHorasEfectivas.textContent.includes('430 min'), `Casilla 5 should be 7 h 10 min (430 min), got: ${elements.tlHorasEfectivas.textContent}`);
console.log('✔ Timeline reactively updated when switching to 6 hrs plan.');

// 6. Test Reactivity on Pickup Time Change: switch to Turno Noche (22:00)
sandbox.selectShiftBlock('noche');
elements.selHours34.value = '4';
elements.b_time.value = '22:00';
sandbox.onPickupTimeChange();

assert.strictEqual(elements.tlHoraRecogida.textContent, '22:00 hrs', 'Casilla 1 should be 22:00 hrs');
// 22:00 + 35 min = 22:35 hrs
assert.strictEqual(elements.tlHoraLlegadaDestino.textContent, '22:35 hrs', 'Casilla 2 should be 22:35 hrs');
// 22:35 + 240 min = 02:35 + 35 min = 03:10 hrs
assert.strictEqual(elements.tlHoraRetorno.textContent, '03:10 hrs', 'Casilla 4 should be 03:10 hrs (overnight modulo)');
console.log('✔ Timeline reactively updated when pickup time changed to night shift.');

// 7. Verify switching to Mode 1 (Traslado Asistido) restores standard timeline
sandbox.$('#b_svc_type').value = '1';
sandbox.applyModalityVisibility();
sandbox.recalcAll();

assert.strictEqual(elements.serviceTimelineBox.style.display, 'block', 'Timeline should be visible in Mode 1');
assert.strictEqual(elements.tlBadge.textContent, 'Ida + Asistencia + Retorno', 'tlBadge should be "Ida + Asistencia + Retorno" in Mode 1');
assert.strictEqual(elements.packRouteMetricsCard.style.display, 'none', 'Pack route metrics card should be hidden in Mode 1');
console.log('✔ Modalidad 1 correctly restores standard timeline and hides pack metrics card.');

// 8. Verify switching to Mode 3 (Cuidados a Domicilio) hides timeline
sandbox.$('#b_svc_type').value = '3';
sandbox.applyModalityVisibility();
sandbox.recalcAll();

assert.strictEqual(elements.serviceTimelineBox.style.display, 'none', 'Timeline should be hidden in Mode 3');
assert.strictEqual(elements.packRouteMetricsCard.style.display, 'none', 'Pack route metrics card should be hidden in Mode 3');
console.log('✔ Modalidad 3 correctly hides timeline and pack metrics card.');

console.log('\nAll Event Pack Route Metrics and Timeline tests passed successfully! 🚀');
