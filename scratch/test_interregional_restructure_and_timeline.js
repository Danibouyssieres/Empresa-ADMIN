const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('Testing Interregional Restructuring, Timeline and Modality 4 texts...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Static HTML assertions
assert(content.includes('Incluye traslados completos Ida y Vuelta + Cobertura TENS efectiva íntegra durante la celebración'), 'Modalidad 4 con traslado subtitle must match');
assert(content.includes('Pack Base (4 hrs continuas en el recinto + Traslados ida/vuelta) — $95.000'), 'Modalidad 4 Pack Base option string must match');
assert(content.includes('Pack Total (6 hrs continuas en el recinto + Traslados ida/vuelta) — $125.000'), 'Modalidad 4 Pack Total option string must match');
assert(content.includes('Nota: Las 4 o 6 horas contratadas corresponden a permanencia continua y efectiva en el evento. Los traslados de ida y regreso se suman como tiempo de viaje adicional, garantizando que el paciente disfrute su fiesta completa.'), 'Modalidad 4 timeline footnote must match');

// 2. VM Simulation
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
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        toggle(c, force) {
          if (force === undefined) {
            if (this._classes.has(c)) this._classes.delete(c);
            else this._classes.add(c);
          } else if (force) {
            this._classes.add(c);
          } else {
            this._classes.delete(c);
          }
        },
        contains(c) { return this._classes.has(c); }
      },
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      removeAttribute(k) { delete this.attributes[k]; },
      children: [],
      options: [],
      addEventListener: () => {},
      focus: () => {}
    };

    // Support innerHTML updates creating options for select elements
    if (tag === 'select') {
      let _html = '';
      Object.defineProperty(el, 'innerHTML', {
        get() { return _html; },
        set(val) {
          _html = val;
          el.options = [];
          const optRegex = /<option\s+value="([^"]*)"([^>]*)>([^<]*)<\/option>/g;
          let m;
          while ((m = optRegex.exec(val)) !== null) {
            const isSelected = m[2].includes('selected');
            const opt = { value: m[1], text: m[3], selected: isSelected };
            el.options.push(opt);
            if (isSelected) el.value = m[1];
          }
        }
      });
    }

    elements[id] = el;
    return el;
  }

  // Necessary DOM IDs
  const requiredIds = [
    'b_svc_type', 'b_date', 'b_time', 'b_app_time', 'appTimeInput', 'hora-cita-medica',
    'selStayDestino', 'selHours34', 'selMins34', 'lblHours34', 'lblMins34',
    'hours34Col', 'mins34Col', 'eventStartCol', 'durationBox12', 'durationBox34',
    'pickupScheduleGrid', 'colAsistentePickup', 'colDurationService',
    'eventSubModeBox', 'interregionalRegionBox', 'jornadaSelectorWrap', 'interProgSelectorWrap',
    'serviceTimelineBox', 'tlBadge', 'tlHoraRecogida', 'tlHoraRecogidaLabel',
    'tlHoraLlegadaDestino', 'tlHoraLlegadaDestinoLabel', 'tlTiempoDestino', 'tlTiempoDestinoLabel',
    'tlHoraRetorno', 'tlHoraRetornoLabel', 'tlHorasEfectivas', 'tlHorasEfectivasLabel',
    'tlDesgloseDetalle', 'routeLayoutBox', 'mapColumn', 'destWrap', 'kmCalcControls',
    'packCalcControls', 'packRouteMetricsCard', 'packMetricKm', 'packMetricTime',
    'b_from', 'b_to', 'lblFromAddr', 'lblToAddr', 'timeSectionBadge', 'timeSectionTitle',
    'timeSectionSub', 'sumKmTimeSection', 'pillProg_4', 'pillProg_6', 'eventBtn_sin',
    'eventBtn_con', 'eventChk_sin', 'eventChk_con', 'dirSvcLbl', 'dirSvcName', 'dirRegionRow',
    'dirRegionVal', 'dirTimeLbl', 'dirTimeDesc', 'dirFinalTotal', 'dirAbono50', 'dirSaldoFinal',
    'lblTimeSummaryDesc', 'lblTimeSummaryVal', 'sumBoxTitle', 'sumTimeLabel', 'sumKmText',
    'sumKmVal', 'sumTimeVal', 'sumRawTotal', 'sumRingFloorRow', 'sumRingFloorVal',
    'sumFinalTotal', 'sumAbono50', 'sumSaldoFinal', 'suggestedPickupCallout', 'suggestedPickupMsg',
    'submitBlockAlert', 'availStatus', 'submitBtn', 'pillJornada_habil', 'pillJornada_tarde',
    'pillJornada_nocturno', 'titleJornadaNocturno', 'subJornadaNocturno', 'subJornadaTarde',
    'lblRateHabil', 'lblRateTarde', 'lblRateNocturno', 'ringInfoBox', 'ringTitle', 'ringDesc'
  ];

  requiredIds.forEach(id => {
    const tag = (id.startsWith('sel') || id === 'b_time' || id === 'appTimeInput' || id === 'b_svc_type') ? 'select' : 'div';
    makeEl(id, tag);
  });

  elements['b_svc_type'].value = '1';
  elements['b_date'].value = '2026-11-04';

  const $ = (selector) => {
    if (!selector) return null;
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return elements[id] || makeEl(id);
    }
    return makeEl(selector.replace(/[^a-zA-Z0-9_-]/g, '_'));
  };

  const mapMock = {
    setView: () => mapMock,
    on: () => mapMock,
    invalidateSize: () => mapMock,
    removeLayer: () => mapMock
  };

  const sandbox = {
    console,
    $,
    document: {
      documentElement: { setAttribute: () => {} },
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => $(sel),
      querySelectorAll: () => [],
      createElement: (tag) => makeEl('temp_' + Math.random(), tag),
      body: { appendChild: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    window: {
      scrollTo: () => {}
    },
    map: mapMock,
    L: {
      map: () => mapMock,
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => ({ on: () => {}, bindPopup: () => ({ openPopup: () => {} }) }) }),
      polyline: () => ({ addTo: () => {} }),
      icon: () => ({}),
      divIcon: () => ({}),
      latLngBounds: () => ({ pad: () => ({}) })
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    alert: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  // Extract <script> content
  const scripts = [];
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    if (!match[0].includes('src=')) {
      scripts.push(match[1]);
    }
  }

  scripts.forEach(code => {
    vm.runInContext(code, ctx);
  });

  return { ctx, elements };
}

const { ctx, elements } = createMockEnv();

// --- TEST 1: Modality 5 Appointment time options (Strict 08:00 to 12:00 in 15m intervals) ---
elements['b_svc_type'].value = '5';
ctx.applyModalityVisibility();

const appTimeInput = elements['appTimeInput'];
const opts = appTimeInput.options.map(o => o.value);
console.log('Interregional appTime options count:', opts.length);
assert.strictEqual(opts.length, 17, 'There must be exactly 17 time slots between 08:00 and 12:00');
assert.strictEqual(opts[0], '08:00', 'First slot must be 08:00');
assert.strictEqual(opts[opts.length - 1], '12:00', 'Last slot must be 12:00');
assert(!opts.includes('07:00'), 'Must NOT include 07:00');
assert(!opts.includes('07:45'), 'Must NOT include 07:45');
assert(!opts.includes('12:15'), 'Must NOT include 12:15');
assert(!opts.includes('13:00'), 'Must NOT include 13:00');
console.log('✔ Test 1: Appointment times restricted strictly to 08:00..12:00 passed.');

// --- TEST 2: Column order reversed for Modality 5 ---
assert.strictEqual(elements['colDurationService'].style.order, '1', 'colDurationService must have order 1');
assert.strictEqual(elements['colAsistentePickup'].style.order, '2', 'colAsistentePickup must have order 2');
assert(elements['pickupScheduleGrid'].classList.contains('modality-reverse-cols'), 'Grid must have reverse class');
console.log('✔ Test 2: Inverted column layout verified for Modality 5.');

// --- TEST 3: Switch back to Modality 1 - restores 07:00..18:00 and normal column order ---
elements['b_svc_type'].value = '1';
ctx.applyModalityVisibility();
assert.strictEqual(elements['colAsistentePickup'].style.order, '1', 'colAsistentePickup must have order 1 in Modality 1');
assert.strictEqual(elements['colDurationService'].style.order, '2', 'colDurationService must have order 2 in Modality 1');
const m1Opts = appTimeInput.options.map(o => o.value);
assert.strictEqual(m1Opts[0], '07:00', 'Modality 1 must start at 07:00');
assert.strictEqual(m1Opts[m1Opts.length - 1], '18:00', 'Modality 1 must end at 18:00');
console.log('✔ Test 3: Normal order and full appointment range restored for Modality 1.');

// --- TEST 4: Modality 5 Timeline and Dynamic Calculation ---
elements['b_svc_type'].value = '5';
ctx.onServiceTypeChange();

assert.strictEqual(elements['serviceTimelineBox'].style.display, 'block', 'serviceTimelineBox must be visible for Modality 5');
assert.strictEqual(elements['tlBadge'].textContent, 'Traslado Interregional Ida + Asistencia + Retorno');
assert.strictEqual(elements['tlHoraRecogidaLabel'].textContent, 'Hora exacta de recogida en el domicilio regional:');
assert.strictEqual(elements['tlHoraLlegadaDestinoLabel'].textContent, 'Hora estimada de llegada al centro hospitalario/clínico en Santiago:');
assert.strictEqual(elements['tlTiempoDestinoLabel'].textContent, 'Horas de permanencia/atención clínica:');
assert.strictEqual(elements['tlHoraRetornoLabel'].textContent, 'Hora estimada de retorno al domicilio regional:');
assert.strictEqual(elements['tlHorasEfectivasLabel'].textContent, 'Total horas del circuito interregional completo:');

// Test with 4h program (default) and appTime = 10:00
elements['appTimeInput'].value = '10:00';
ctx.recalcularTodoElServicio('appTime');

// With default 90 min fallback route:
// AppTime: 10:00 (600 min). Pickup: 600 - (90 + 30) = 480 min (08:00 hrs).
assert.strictEqual(elements['tlHoraRecogida'].textContent, '08:00 hrs', 'Pickup must be 08:00 hrs for 10:00 appTime');
// Santiago Arrival: 08:00 + 10 min abordaje + 90 min viaje = 09:40 hrs
assert.strictEqual(elements['tlHoraLlegadaDestino'].textContent, '09:40 hrs', 'Arrival at Santiago must be 09:40 hrs');
// Stay: 4 hrs continuas
assert.strictEqual(elements['tlTiempoDestino'].textContent, '4 hrs continuas');
// Return: 09:40 + 4 hrs (240 min) = 13:40 + 90 min retorno = 15:10 hrs
assert.strictEqual(elements['tlHoraRetorno'].textContent, '15:10 hrs', 'Return to regional home must be 15:10 hrs');
// Total duration: 10 + 90 + 240 + 90 = 430 min (7 h 10 min)
assert(elements['tlHorasEfectivas'].textContent.includes('7 h 10 min (430 min)'), 'Total circuit time must be 7 h 10 min (430 min)');

// Switch program to 6h (Programa Crónico / Oncológico)
ctx.setInterProgram(6);
assert.strictEqual(elements['tlTiempoDestino'].textContent, '6 hrs continuas');
// Return with 6h stay: 09:40 + 6 hrs (360 min) = 15:40 + 90 min retorno = 17:10 hrs
assert.strictEqual(elements['tlHoraRetorno'].textContent, '17:10 hrs', 'Return to regional home must be 17:10 hrs for 6h program');
// Total circuit: 10 + 90 + 360 + 90 = 550 min (9 h 10 min)
assert(elements['tlHorasEfectivas'].textContent.includes('9 h 10 min (550 min)'), 'Total circuit time must be 9 h 10 min (550 min)');
assert.strictEqual(elements['dirFinalTotal'].textContent, '$300.000', '6h program cost must be $300.000');

// Switch back to 4h and add +60 min extra
ctx.setInterProgram(4);
elements['selMins34'].value = '60';
ctx.onHours34Change();
assert.strictEqual(elements['tlTiempoDestino'].textContent, '4 hrs + 60 min (5 h)');
assert.strictEqual(elements['tlHoraRetorno'].textContent, '16:10 hrs', 'Return must be 16:10 hrs with 1h extra');
assert.strictEqual(elements['dirFinalTotal'].textContent, '$275.000', '4h ($250.000) + 60 min extra ($25.000) = $275.000');

console.log('✔ Test 4: Modality 5 Timeline and Dynamic Calculations verified.');

// --- TEST 5: Modality 4 Con Traslado Timeline footnote and options ---
elements['b_svc_type'].value = '4';
ctx.onServiceTypeChange();
ctx.selectEventSubMode('con_traslado');
elements['selHours34'].value = '4';
ctx.onHours34Change();

assert.strictEqual(elements['serviceTimelineBox'].style.display, 'block', 'serviceTimelineBox must be visible for Modality 4 con traslado');
assert(elements['tlDesgloseDetalle'].innerHTML.includes('Nota: Las 4 o 6 horas contratadas corresponden a permanencia continua y efectiva en el evento.'), 'Footnote must be present in Modality 4 timeline');

console.log('\nAll Interregional Restructure and Timeline tests passed successfully! 🚀');
