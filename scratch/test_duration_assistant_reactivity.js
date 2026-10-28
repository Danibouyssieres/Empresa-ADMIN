const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8');

const scriptMatches = htmlContent.match(/<script>([\s\S]*?)<\/script>/gi);
const mainScript = scriptMatches[scriptMatches.length - 1]
  .replace(/^<script>/i, '')
  .replace(/<\/script>$/i, '');

function createMockEnv() {
  const elements = {};
  function makeEl(id, tagName = 'div') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      value: '',
      textContent: '',
      innerHTML: '',
      style: { display: 'block', borderColor: '', boxShadow: '' },
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        toggle(c, force) {
          if (force === undefined) {
            if (this.classes.has(c)) this.classes.delete(c);
            else this.classes.add(c);
          } else if (force) {
            this.classes.add(c);
          } else {
            this.classes.delete(c);
          }
        },
        contains(c) { return this.classes.has(c); }
      },
      disabled: false,
      checked: false,
      options: [],
      scrollIntoView: () => {},
      focus: () => {},
      setAttribute: () => {},
      removeAttribute: () => {},
      appendChild: (opt) => { el.options.push(opt); },
      querySelector: (sel) => {
        const valMatch = sel.match(/\[value="([^"]+)"\]/);
        if (valMatch) {
          return el.options.find(o => o.value === valMatch[1]) || null;
        }
        return null;
      },
      querySelectorAll: (sel) => []
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

  makeEl('b_date', 'input');
  makeEl('b_time', 'select');
  makeEl('b_tens', 'select');
  makeEl('b_svc_type', 'select');
  elements['b_svc_type'].value = '1';
  makeEl('b_mob', 'select');
  makeEl('b_pat', 'input');
  makeEl('b_pat_phone', 'input');
  makeEl('b_age', 'input');
  makeEl('b_dx', 'input');
  makeEl('b_coord', 'input');
  makeEl('b_ph', 'input');
  makeEl('b_from', 'input');
  makeEl('b_depto', 'input');
  makeEl('b_to', 'input');
  makeEl('b_comp', 'select');
  makeEl('b_obs', 'textarea');
  makeEl('b_terms', 'input');
  makeEl('b_app_time', 'input');
  makeEl('appTimeInput', 'select');
  makeEl('selStayDestino', 'select');
  elements['selStayDestino'].value = '60';
  elements['selStayDestino'].options = [
    { value: '60', text: '1 hora (Consulta estándar)' },
    { value: '90', text: '1 hora 30 min (Notaría)' },
    { value: '120', text: '2 horas (Procedimiento)' },
    { value: '180', text: '3 horas o más' }
  ];
  makeEl('durationBox12', 'div');
  makeEl('durationBox34', 'div');
  makeEl('timeSectionTitle', 'span');
  makeEl('timeSectionSub', 'p');
  makeEl('lblStayDestino', 'label');
  makeEl('serviceTimelineBox', 'div');
  makeEl('tlHoraRecogida', 'b');
  makeEl('tlHoraLlegadaDestino', 'b');
  makeEl('tlTiempoDestinoLabel', 'small');
  makeEl('tlTiempoDestino', 'b');
  makeEl('tlHoraRetornoLabel', 'small');
  makeEl('tlHoraRetorno', 'b');
  makeEl('tlHorasEfectivasLabel', 'small');
  makeEl('tlHorasEfectivas', 'b');
  makeEl('tlDesgloseDetalle', 'div');
  makeEl('sumBoxTitle', 'span');
  makeEl('sumKmText', 'span');
  makeEl('sumKmVal', 'b');
  makeEl('sumTimeLabel', 'span');
  makeEl('sumTimeVal', 'b');
  makeEl('sumRawTotal', 'b');
  makeEl('sumRingFloorRow', 'li');
  makeEl('sumRingFloorVal', 'b');
  makeEl('sumFinalTotal', 'b');
  makeEl('sumAbono50', 'b');
  makeEl('sumSaldoFinal', 'b');
  makeEl('lblRateHabil', 'span');
  makeEl('lblRateTarde', 'span');
  makeEl('lblRateNocturno', 'span');
  makeEl('lblTimeSummaryDesc', 'span');
  makeEl('lblTimeSummaryVal', 'span');
  makeEl('dirSvcName', 'span');
  makeEl('dirRegionRow', 'li');
  makeEl('dirRegionVal', 'b');
  makeEl('dirTimeDesc', 'span');
  makeEl('destWrap', 'div');
  makeEl('kmCalcControls', 'div');
  makeEl('routeLayoutBox', 'div');
  makeEl('mapColumn', 'div');
  makeEl('lblFromAddr', 'label');
  makeEl('lblToAddr', 'label');
  makeEl('eventStartCol', 'div');
  makeEl('hours34Col', 'div');
  makeEl('mins34Col', 'div');
  makeEl('b_maps_route_mins', 'input');
  makeEl('btnBlock_manana', 'button');
  makeEl('btnBlock_tarde', 'button');
  makeEl('btnBlock_noche', 'button');
  makeEl('badgeBlock_manana', 'span');
  makeEl('badgeBlock_tarde', 'span');
  makeEl('badgeBlock_noche', 'span');
  makeEl('reasonBlock_manana', 'div');
  makeEl('reasonBlock_tarde', 'div');
  makeEl('reasonBlock_noche', 'div');
  makeEl('lblEstimatedWindow', 'div');
  makeEl('nightRuleNotice', 'div');
  makeEl('availStatus', 'div');
  makeEl('submitBtn', 'button');
  makeEl('lblSelectedDateHuman', 'strong');
  makeEl('lblCapBadge', 'span');
  makeEl('suggestedPickupCallout', 'div');
  makeEl('suggestedPickupMsg', 'div');
  makeEl('btnApplySuggestedPickup', 'button');
  makeEl('submitBlockAlert', 'div');
  makeEl('calGrid', 'div');
  makeEl('calMonthLabel', 'span');
  makeEl('calPrevBtn', 'button');
  makeEl('calNextBtn', 'button');

  const sandbox = {
    window: {},
    document: {
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
        return null;
      },
      querySelectorAll: () => [],
      createElement: (tag) => makeEl('temp_' + Math.random(), tag),
      body: { appendChild: () => {} },
      documentElement: { setAttribute: () => {} },
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
    alert: (msg) => console.log('Mock Alert:', msg),
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    L: {
      map: () => {
        const m = { setView: () => m, on: () => m, invalidateSize: () => m };
        return m;
      },
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => ({ bindPopup: () => ({ openPopup: () => {} }) }) }),
      polyline: () => ({ addTo: () => {} }),
      divIcon: () => ({}),
      latLngBounds: () => ({ pad: () => ({}) })
    },
    console
  };
  sandbox.window = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(mainScript, ctx);

  return { ctx, elements, getVar: (n) => vm.runInContext(n, ctx), setVar: (n, v) => vm.runInContext(`${n} = ${JSON.stringify(v)}`, ctx) };
}

console.log('=== TEST SUITE: Reactividad Asistente y Selector de Duración ===\n');

const env = createMockEnv();
const { ctx, elements, setVar, getVar } = env;

// 1. Configurar fecha y ruta inicial
elements['b_date'].value = '2026-11-16'; // Lunes hábil
elements['b_svc_type'].value = '1'; // Modalidad 1
setVar('lastRouteIdaMin', 15);
setVar('tripMultiplier', 2);
setVar('lastTotalKm', 20);
setVar('lastKmCost', 20000);
elements['appTimeInput'].value = '10:00'; // Cita a las 10:00 hrs

// TEST 1: Lectura inmediata y cálculo completo al presionar "Calcular Hora de Salida Sugerida"
console.log('1. Verificando cálculo inmediato de cronograma y tarifas al presionar botón con duración predeterminada (60 min):');
assert.strictEqual(elements['selStayDestino'].value, '60', 'selStayDestino debe iniciar en 60 por defecto');

ctx.calcSuggestedPickup();

// Cita 10:00 - 45 min anticipación (15 min viaje + 10 min abordaje + 20 min admisión) = 09:15 hrs salida
assert.strictEqual(elements['b_time'].value, '09:15', 'Hora de recogida oficial fijada en 09:15');
assert.strictEqual(elements['tlHoraRecogida'].textContent, '09:15 hrs', 'Cronograma debe reflejar 09:15 hrs');
assert.strictEqual(elements['tlTiempoDestino'].textContent, '1 h', 'Cronograma debe reflejar 1 h de permanencia');
// Duración total = 10 + 15 + 60 + 15 = 100 min -> billed 120 min (2h)
assert.strictEqual(elements['sumTimeVal'].textContent, '$24.000', 'Suma Total debe liquidar 2 horas de asistencia ($24.000)');
assert.strictEqual(elements['sumKmVal'].textContent, '$20.000', 'Suma Total debe reflejar $20.000 de KM');
console.log('   ✅ PASS: Al presionar el botón se calcula inmediatamente el cronograma y tarifas completas.\n');

// TEST 2: Feedback visual si combobox de duración está vacío
console.log('2. Verificando feedback visual de error si selStayDestino está vacío al presionar botón:');
elements['selStayDestino'].value = '';

ctx.calcSuggestedPickup();

assert.strictEqual(elements['selStayDestino'].style.borderColor, '#dc2626', 'selStayDestino debe tener borde rojo');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Por favor indique la duración estimada'), 'Mensaje debe solicitar indicar duración');
assert.strictEqual(elements['suggestedPickupCallout'].style.display, 'block', 'Callout de error debe mostrarse');
console.log('   ✅ PASS: Detecta campo vacío, aplica borde rojo y muestra mensaje amigable.\n');

// TEST 3: Reactividad automática al cambiar duración (evento 'change')
console.log('3. Verificando reactividad automática bidireccional al cambiar duración en combobox:');
elements['selStayDestino'].value = '90'; // 1h 30m

// Disparar evento de cambio
ctx.onStayDestinoChange();

assert.strictEqual(elements['selStayDestino'].style.borderColor, '', 'Borde rojo de error debe limpiarse al cambiar');
// Ahora duración total = 10 + 15 + 90 + 15 = 130 min -> billed 150 min (2h 30m -> $30.000)
assert.strictEqual(elements['tlTiempoDestino'].textContent, '1 h 30 min', 'Cronograma debe actualizarse a 1 h 30 min');
assert.strictEqual(elements['sumTimeVal'].textContent, '$30.000', 'Suma Total debe liquidar 2h 30m ($30.000)');
console.log('   ✅ PASS: Al cambiar el combobox se recalculan automáticamente Cronograma y Tarifas.\n');

// TEST 4: Modalidad 2 con reactividad bidireccional
console.log('4. Verificando Modalidad 2 con duración y cálculo reactivo:');
elements['b_svc_type'].value = '2';
elements['selStayDestino'].value = '60'; // 1 hora
ctx.applyModalityVisibility();
ctx.onStayDestinoChange();

assert.strictEqual(elements['sumTimeVal'].textContent, '$8.000', 'Modalidad 2 debe cobrar exactamente 1 hora ($8.000)');
assert(elements['sumTimeLabel'].textContent.includes('Valor por Tiempo de Espera en Destino (1 hr a $8.000/h)'), 'Label debe indicar Tiempo de Espera');

// Cambiar a 2 horas (120 min)
elements['selStayDestino'].value = '120';
ctx.onStayDestinoChange();

assert.strictEqual(elements['sumTimeVal'].textContent, '$16.000', 'Modalidad 2 con 2h debe cobrar $16.000');
assert(elements['sumTimeLabel'].textContent.includes('Valor por Tiempo de Espera en Destino (2 hrs a $8.000/h)'), 'Label debe actualizarse a 2 hrs');
console.log('   ✅ PASS: Modalidad 2 reacciona de forma inmediata a los cambios de duración.\n');

console.log('🎉 ¡TODAS LAS PRUEBAS DE REACTIVIDAD ASISTENTE-DURACIÓN PASARON AL 100%! 🚀');
