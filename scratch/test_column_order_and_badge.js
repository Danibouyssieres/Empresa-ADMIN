const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('Testing Column Visual Order and Event Badge in reservar.html...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.resolve(__dirname, '../css/reservar.css'), 'utf8');

// 1. Static HTML assertions
assert(content.includes('id="pickupScheduleGrid"'), 'pickupScheduleGrid must exist in HTML');
assert(content.includes('id="colAsistentePickup"'), 'colAsistentePickup must exist in HTML');
assert(content.includes('id="colDurationService"'), 'colDurationService must exist in HTML');
assert(content.includes('id="timeSectionBadge"'), 'timeSectionBadge must exist in HTML');
assert(content.includes('.modality-reverse-cols #colDurationService{order:1 !important}'), 'CSS order 1 rule missing');
assert(content.includes('.modality-reverse-cols #colAsistentePickup{order:2 !important}'), 'CSS order 2 rule missing');

console.log('✔ Static HTML & CSS rules verified.');

// 2. Mock DOM environment to execute actual functions from reservar.html
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
    'eventChk_sin', 'eventChk_con', 'selHours34', 'selMins34', 'lblHours34', 'lblMins34',
    'pickupScheduleGrid', 'colAsistentePickup', 'colDurationService', 'timeSectionBadge'
  ].forEach(id => makeEl(id));

  makeEl('selHours34', 'select');
  makeEl('selMins34', 'select');
  makeEl('b_time', 'select');
  makeEl('appTimeInput', 'select');
  makeEl('selStayDestino', 'select');

  elements['b_svc_type'].value = '1';
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
    alert: () => {},
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

  const jsResPath = path.resolve(__dirname, '../js/reservar.js');
const inlineScript = fs.existsSync(jsResPath) ? fs.readFileSync(jsResPath, 'utf8') : (fs.existsSync('js/reservar.js') ? fs.readFileSync('js/reservar.js', 'utf8') : '');

  const ctx = vm.createContext(sandbox);
  vm.runInContext(inlineScript, ctx);

  return { ctx, elements };
}

const { ctx, elements } = createMockEnv();
console.log('✔ Script evaluated in VM.');

// TEST 1: Modalidad 1 (Servicio Integral) - Default Order
elements['b_svc_type'].value = '1';
ctx.applyModalityVisibility();

assert.strictEqual(elements['colAsistentePickup'].style.order, '1', 'Mod 1: Asistente must have order: 1 (left)');
assert.strictEqual(elements['colDurationService'].style.order, '2', 'Mod 1: Duration must have order: 2 (right)');
assert.strictEqual(elements['pickupScheduleGrid'].classList.contains('modality-reverse-cols'), false, 'Mod 1 must NOT have modality-reverse-cols class');
assert.strictEqual(elements['timeSectionBadge'].textContent, 'Mínimo 1 hora · Bloques de 30 min', 'Mod 1 badge must say Mínimo 1 hora');

// TEST 2: Modalidad 2 (Traslado Exclusivo con Espera) - Default Order
elements['b_svc_type'].value = '2';
ctx.applyModalityVisibility();

assert.strictEqual(elements['colAsistentePickup'].style.order, '1', 'Mod 2: Asistente must have order: 1 (left)');
assert.strictEqual(elements['colDurationService'].style.order, '2', 'Mod 2: Duration must have order: 2 (right)');
assert.strictEqual(elements['pickupScheduleGrid'].classList.contains('modality-reverse-cols'), false, 'Mod 2 must NOT have modality-reverse-cols class');
assert.strictEqual(elements['timeSectionBadge'].textContent, 'Mínimo 1 hora · Bloques de 30 min', 'Mod 2 badge must say Mínimo 1 hora');

// TEST 3: Modalidad 3 (Cuidados a Domicilio) - REVERSED Order
elements['b_svc_type'].value = '3';
ctx.applyModalityVisibility();

assert.strictEqual(elements['colDurationService'].style.order, '1', 'Mod 3: Duration/Hours must have order: 1 (left)');
assert.strictEqual(elements['colAsistentePickup'].style.order, '2', 'Mod 3: Asistente/HomeTime must have order: 2 (right)');
assert.strictEqual(elements['pickupScheduleGrid'].classList.contains('modality-reverse-cols'), true, 'Mod 3 must HAVE modality-reverse-cols class');

// Test Mod 3 hour selection calculation
elements['selHours34'].value = '3';
elements['selMins34'].value = '0';
ctx.onHours34Change();
assert(elements['dirFinalTotal'].textContent !== '', 'Mod 3 total must be calculated');

// TEST 4: Modalidad 4 (Eventos Sociales) - REVERSED Order & Correct Badge
elements['b_svc_type'].value = '4';
ctx.applyModalityVisibility();

assert.strictEqual(elements['colDurationService'].style.order, '1', 'Mod 4: Duration/Plan must have order: 1 (left)');
assert.strictEqual(elements['colAsistentePickup'].style.order, '2', 'Mod 4: Asistente/HomeTime must have order: 2 (right)');
assert.strictEqual(elements['pickupScheduleGrid'].classList.contains('modality-reverse-cols'), true, 'Mod 4 must HAVE modality-reverse-cols class');

// Check the badge replacement
assert.strictEqual(elements['timeSectionBadge'].textContent, 'Tarifa Plana · Cobertura continua (4 o 6 hrs)', 'Mod 4 badge must say Tarifa Plana · Cobertura continua (4 o 6 hrs)');
assert.strictEqual(elements['timeSectionBadge'].style.color, '#12783E', 'Mod 4 badge must have green color #12783E');

// Test Mod 4 flat rate and pickup time selection
ctx.selectEventSubMode('sin_traslado');
ctx.recalcAll();
assert.strictEqual(elements['dirFinalTotal'].textContent, '$65.000', 'Mod 4 Sin Traslado total must be $65.000');
assert.strictEqual(elements['dirAbono50'].textContent, '$32.500', 'Mod 4 Sin Traslado abono must be $32.500');

// Choose pickup time
elements['b_time'].value = '15:00';
ctx.onPickupTimeChange();
// Ensure flat rate is preserved intact
assert.strictEqual(elements['dirFinalTotal'].textContent, '$65.000', 'Mod 4 Sin Traslado total must remain $65.000 after choosing time');
assert.strictEqual(elements['dirAbono50'].textContent, '$32.500', 'Mod 4 Sin Traslado abono must remain $32.500 after choosing time');

// Con Traslado
ctx.selectEventSubMode('con_traslado');
ctx.recalcAll();
assert.strictEqual(elements['dirFinalTotal'].textContent, '$95.000', 'Mod 4 Con Traslado total must be $95.000');
assert.strictEqual(elements['dirAbono50'].textContent, '$47.500', 'Mod 4 Con Traslado abono must be $47.500');

// Choose another pickup time
elements['b_time'].value = '18:00';
ctx.onPickupTimeChange();
assert.strictEqual(elements['dirFinalTotal'].textContent, '$95.000', 'Mod 4 Con Traslado total must remain $95.000 after choosing time');
assert.strictEqual(elements['dirAbono50'].textContent, '$47.500', 'Mod 4 Con Traslado abono must remain $47.500 after choosing time');

console.log('\nAll Column Order and Event Badge tests passed successfully! 🚀');
