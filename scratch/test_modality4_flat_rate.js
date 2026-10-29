const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('Testing Modalidad 4 Flat Rate strict rules...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Static HTML assertions
assert(content.includes('id="dirSvcLbl"'), 'dirSvcLbl span id must exist');
assert(content.includes('id="dirTimeLbl"'), 'dirTimeLbl span id must exist');
assert(content.includes("'4': '4. Acompañamiento en Eventos Sociales'"), 'SVC_NAMES must use "en Eventos Sociales"');
assert(content.includes("Pack Asistencia en Recinto (Sin Traslado) · $65.000 fijo"), 'Sin Traslado option should indicate $65.000 fijo');
assert(content.includes("Pack Integral Puerta a Puerta (Con Traslados) · $95.000 fijo"), 'Con Traslados option should indicate $95.000 fijo');

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
      setAttribute: () => {},
      removeAttribute: () => {},
      focus: () => {},
      scrollIntoView: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild(child) {
        this.children.push(child);
        if (this.tagName === 'SELECT' && child.tagName === 'OPTION') {
          this.options.push({ value: child.value, text: child.text || child.textContent });
        }
      },
      querySelector: (sel) => {
        if (sel === 'small') return el.children.find(c => c.tagName === 'SMALL') || null;
        if (sel.startsWith('option[value=')) {
          const valMatch = sel.match(/value="([^"]+)"/);
          if (!valMatch) return null;
          return el.options.find(o => o.value === valMatch[1]) || null;
        }
        return null;
      },
      querySelectorAll: () => []
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

  [
    'b_date', 'b_time', 'b_tens', 'b_svc_type', 'b_mob', 'b_pat', 'b_pat_phone',
    'b_age', 'b_dx', 'b_coord', 'b_ph', 'b_from', 'b_depto', 'b_to', 'b_comp',
    'b_obs', 'b_terms', 'b_app_time', 'appTimeInput', 'selStayDestino',
    'durationBox12', 'durationBox34', 'timeSectionTitle', 'timeSectionSub',
    'lblStayDestino', 'serviceTimelineBox', 'tlHoraRecogida', 'tlHoraLlegadaDestino',
    'tlTiempoDestinoLabel', 'tlTiempoDestino', 'tlHoraRetornoLabel', 'tlHoraRetorno',
    'tlHorasEfectivasLabel', 'tlHorasEfectivas', 'tlDesgloseDetalle', 'tlBadge',
    'sumBoxTitle', 'sumKmText', 'sumKmVal', 'sumTimeLabel', 'sumTimeVal',
    'sumRawTotal', 'sumRingFloorRow', 'sumRingFloorVal', 'sumFinalTotal',
    'sumAbono50', 'sumSaldoFinal', 'lblRateHabil', 'lblRateTarde', 'lblRateNocturno',
    'pillJornada_habil', 'pillJornada_tarde', 'pillJornada_nocturno',
    'subJornadaTarde', 'titleJornadaNocturno', 'subJornadaNocturno',
    'lblTimeSummaryDesc', 'lblTimeSummaryVal', 'dirSvcLbl', 'dirSvcName', 'dirRegionRow',
    'dirRegionVal', 'dirTimeLbl', 'dirTimeDesc', 'dirFinalTotal', 'dirAbono50', 'dirSaldoFinal',
    'destWrap', 'kmCalcControls', 'routeLayoutBox',
    'mapColumn', 'lblFromAddr', 'lblToAddr', 'eventStartCol', 'hours34Col',
    'mins34Col', 'b_maps_route_mins', 'btnBlock_manana', 'btnBlock_tarde',
    'btnBlock_noche', 'badgeBlock_manana', 'badgeBlock_tarde', 'badgeBlock_noche',
    'reasonBlock_manana', 'reasonBlock_tarde', 'reasonBlock_noche',
    'lblEstimatedWindow', 'nightRuleNotice', 'availStatus', 'submitBtn',
    'lblSelectedDateHuman', 'lblCapBadge', 'suggestedPickupCallout',
    'suggestedPickupMsg', 'btnApplySuggestedPickup', 'submitBlockAlert',
    'calGrid', 'calMonthLabel', 'calPrevBtn', 'calNextBtn', 'mainContent',
    'btnCalcularHora', 'eventSubModeBox', 'interregionalRegionBox',
    'jornadaSelectorWrap', 'interProgSelectorWrap', 'eventBtn_sin', 'eventBtn_con',
    'eventChk_sin', 'eventChk_con', 'selHours34', 'selMins34', 'lblHours34', 'lblMins34'
  ].forEach(id => makeEl(id));

  makeEl('selHours34', 'select');
  makeEl('selMins34', 'select');
  makeEl('b_time', 'select');

  elements['b_svc_type'].value = '4';
  elements['b_date'].value = '2026-11-04';

  const sandbox = {
    window: {
      scrollTo: () => {}
    },
    document: {
      documentElement: { setAttribute: () => {} },
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel === 'input[name="b_allergy_radio"]:checked') return { value: 'no' };
        if (sel === 'input[name="b_tax_doc"]:checked') return { value: 'boleta' };
        if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
        return null;
      },
      querySelectorAll: () => [],
      createElement: (tag) => makeEl('temp_' + Math.random(), tag),
      body: { appendChild: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    $: (sel) => {
      if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
      return null;
    },
    $$: () => [],
    alert: (msg) => {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    L: {
      map: () => {
        const m = { setView: () => m, on: () => m, invalidateSize: () => m, removeLayer: () => m };
        return m;
      },
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => ({ bindPopup: () => ({ openPopup: () => {} }) }) }),
      polyline: () => ({ addTo: () => {} }),
      divIcon: () => ({}),
      latLngBounds: () => ({ pad: () => ({}) })
    },
    scrollTo: () => {},
    console
  };
  sandbox.window = sandbox;

  const scriptMatches = [...content.matchAll(/<script(?![^>]*src=)(?:[^>]*)>([\s\S]*?)<\/script>/gi)];
  const inlineScript = scriptMatches.map(m => m[1]).join('\n');

  const ctx = vm.createContext(sandbox);
  vm.runInContext(inlineScript, ctx);

  return { ctx, elements };
}

const { ctx, elements } = createMockEnv();

console.log('✔ Script evaluated successfully in VM context.');

// Configure context for Modalidad 4
elements['b_svc_type'].value = '4';
ctx.onServiceTypeChange();

// Verification 1: #jornadaSelectorWrap must be display: none
assert.strictEqual(elements['jornadaSelectorWrap'].style.display, 'none', '#jornadaSelectorWrap must be hidden in Modalidad 4');

// Verification 2: Sin Traslado Flat Rate ($65.000 / $32.500)
ctx.selectEventSubMode('sin_traslado');
ctx.recalcAll();

assert.strictEqual(elements['dirFinalTotal'].textContent, '$65.000', 'Total Sin Traslado must be $65.000');
assert.strictEqual(elements['dirAbono50'].textContent, '$32.500', 'Abono 50% Sin Traslado must be $32.500');
assert.strictEqual(elements['dirSaldoFinal'].textContent, '$32.500', 'Saldo 50% Sin Traslado must be $32.500');
assert.strictEqual(elements['dirSvcName'].textContent, 'Modalidad: 4. Acompañamiento en Eventos Sociales');
assert.strictEqual(elements['dirTimeDesc'].textContent, 'Plan Seleccionado: Pack Asistencia en Recinto (Sin Traslado) — Tarifa Plana Cerrada');

// Verification 3: Con Traslados Flat Rate ($95.000 / $47.500)
ctx.selectEventSubMode('con_traslado');
ctx.recalcAll();

assert.strictEqual(elements['dirFinalTotal'].textContent, '$95.000', 'Total Con Traslados must be $95.000');
assert.strictEqual(elements['dirAbono50'].textContent, '$47.500', 'Abono 50% Con Traslados must be $47.500');
assert.strictEqual(elements['dirSaldoFinal'].textContent, '$47.500', 'Saldo 50% Con Traslados must be $47.500');
assert.strictEqual(elements['dirSvcName'].textContent, 'Modalidad: 4. Acompañamiento en Eventos Sociales');
assert.strictEqual(elements['dirTimeDesc'].textContent, 'Plan Seleccionado: Pack Integral Puerta a Puerta (Con Traslados) — Tarifa Plana Cerrada');

// Verification 4: Invariance under different dates and shifts
const testCases = [
  { date: '2026-11-02', shift: 'manana', label: 'Lunes Hábil Mañana' },
  { date: '2026-11-02', shift: 'noche', label: 'Lunes Hábil Noche' },
  { date: '2026-11-07', shift: 'manana', label: 'Sábado Fin de Semana Mañana' },
  { date: '2026-11-08', shift: 'tarde', label: 'Domingo Fin de Semana Tarde' },
  { date: '2026-11-01', shift: 'noche', label: 'Feriado Día de Todos los Santos Noche' }
];

testCases.forEach(tc => {
  elements['b_date'].value = tc.date;
  ctx.selectedBlock = tc.shift;
  ctx.actualizarTarifaSegunAgenda();

  // Test Sin Traslado
  ctx.selectEventSubMode('sin_traslado');
  ctx.recalcAll();
  assert.strictEqual(elements['dirFinalTotal'].textContent, '$65.000', `Total Sin Traslado must be $65.000 on ${tc.label}`);
  assert.strictEqual(elements['dirAbono50'].textContent, '$32.500', `Abono Sin Traslado must be $32.500 on ${tc.label}`);
  assert.strictEqual(elements['dirSaldoFinal'].textContent, '$32.500', `Saldo Sin Traslado must be $32.500 on ${tc.label}`);
  assert.strictEqual(elements['jornadaSelectorWrap'].style.display, 'none', `Tariff cards must remain hidden on ${tc.label}`);

  // Test Con Traslado
  ctx.selectEventSubMode('con_traslado');
  ctx.recalcAll();
  assert.strictEqual(elements['dirFinalTotal'].textContent, '$95.000', `Total Con Traslado must be $95.000 on ${tc.label}`);
  assert.strictEqual(elements['dirAbono50'].textContent, '$47.500', `Abono Con Traslado must be $47.500 on ${tc.label}`);
  assert.strictEqual(elements['dirSaldoFinal'].textContent, '$47.500', `Saldo Con Traslado must be $47.500 on ${tc.label}`);
  assert.strictEqual(elements['jornadaSelectorWrap'].style.display, 'none', `Tariff cards must remain hidden on ${tc.label}`);
});

console.log('✔ Invariance verified across business days, weekends, holidays and night shifts.');
console.log('\nAll Modalidad 4 Flat Rate tests passed successfully! 🚀');
