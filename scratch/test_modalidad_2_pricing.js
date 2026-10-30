const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../css/reservar.css'), 'utf8');

const jsResPath = path.resolve(__dirname, '../js/reservar.js');
const mainScript = fs.existsSync(jsResPath) ? fs.readFileSync(jsResPath, 'utf8') : '';

function createMockEnv() {
  const elements = {};
  function makeEl(id, tagName = 'div') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      value: '',
      textContent: '',
      innerHTML: '',
      style: { display: 'block' },
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

console.log('=== TEST SUITE: Modalidad 2 (Traslado Exclusivo con Espera) ===\n');

const env = createMockEnv();
const { ctx, elements, setVar, getVar } = env;

// Fijar fecha válida hábil y ruta de 10 min de viaje por sentido (20 km total)
elements['b_date'].value = '2026-11-16'; // Lunes hábil
setVar('currentJornada', 'habil');
setVar('lastRouteIdaMin', 10);
setVar('tripMultiplier', 2);
setVar('lastTotalKm', 20);
setVar('lastKmCost', 20000);

// =========================================================================
// TEST 1: Modalidad 1 - Servicio Integral
// =========================================================================
console.log('1. Verificando Modalidad 1 (Servicio Integral - Cálculo continuo):');
elements['b_svc_type'].value = '1';
elements['selStayDestino'].value = '60'; // 1 hora en destino
ctx.applyModalityVisibility();
ctx.recalcAll();

// 10 min abordaje + 10 min ida + 60 min stay + 10 min retorno = 90 min -> 1h 30m -> $18.000 ($12k + $6k)
const mod1TimeVal = elements['sumTimeVal'].textContent;
const mod1TimeLabel = elements['sumTimeLabel'].textContent;
const mod1Title = elements['timeSectionTitle'].textContent;
const mod1Formula = elements['tlDesgloseDetalle'].innerHTML;

console.log('   - sumTimeVal:', mod1TimeVal);
console.log('   - sumTimeLabel:', mod1TimeLabel);
console.log('   - timeSectionTitle:', mod1Title);
console.log('   - formula:', mod1Formula);

assert.strictEqual(mod1TimeVal, '$18.000', 'Modalidad 1 debe cobrar 1h 30m ($18.000)');
assert(mod1TimeLabel.includes('Valor por Tiempo de Asistencia'), 'Label debe indicar Tiempo de Asistencia');
assert(mod1Formula.includes('abordaje TENS'), 'Formula de Mod 1 debe incluir abordaje TENS');
console.log('   ✅ PASS: Modalidad 1 calcula correctamente 90 min ($18.000) con abordaje TENS.\n');

// =========================================================================
// TEST 2: Modalidad 2 - 1 hora en destino ($8.000/h)
// =========================================================================
console.log('2. Verificando Modalidad 2 con 1 hora de espera en destino:');
elements['b_svc_type'].value = '2';
elements['selStayDestino'].value = '60'; // 1 hora
ctx.applyModalityVisibility();
ctx.recalcAll();

const mod2TimeVal1h = elements['sumTimeVal'].textContent;
const mod2TimeLabel1h = elements['sumTimeLabel'].textContent;
const mod2Title = elements['timeSectionTitle'].textContent;
const mod2Formula1h = elements['tlDesgloseDetalle'].innerHTML;
const mod2Efectivas1h = elements['tlHorasEfectivas'].textContent;

console.log('   - sumTimeVal:', mod2TimeVal1h);
console.log('   - sumTimeLabel:', mod2TimeLabel1h);
console.log('   - timeSectionTitle:', mod2Title);
console.log('   - formula:', mod2Formula1h);
console.log('   - tlHorasEfectivas:', mod2Efectivas1h);

assert.strictEqual(mod2TimeVal1h, '$8.000', 'Modalidad 2 debe cobrar exactamente 1 hora ($8.000), no $12.000');
assert.strictEqual(mod2Title, '⏱️ Tiempo de Espera Requerido en Destino', 'Título debe ser Tiempo de Espera Requerido en Destino');
assert(mod2TimeLabel1h.includes('Valor por Tiempo de Espera en Destino'), 'Item 2 debe renombrarse a Valor por Tiempo de Espera en Destino');
assert(mod2TimeLabel1h.includes('1 hr a $8.000/h'), 'Item 2 debe indicar 1 hr a $8.000/h');
assert(!mod2Formula1h.includes('abordaje TENS'), 'Formula de Mod 2 NO debe mencionar abordaje TENS');
assert(mod2Formula1h.includes('Tiempo operativo total: 10 min abordaje (asistencia inicial) + 10 min viaje ida + 60 min espera en destino + 10 min viaje retorno = <b>90 min</b> | Espera en destino a liquidar: <b>1 hr</b>.'), 'Formula debe coincidir exactamente');
console.log('   ✅ PASS: Modalidad 2 con 1 hora cobra exactamente $8.000 con textos correctos.\n');

// =========================================================================
// TEST 3: Modalidad 2 - 1 hora 30 min en destino ($12.000)
// =========================================================================
console.log('3. Verificando Modalidad 2 con 1 hora 30 min de espera en destino:');
elements['selStayDestino'].value = '90'; // 1h 30m
ctx.recalcAll();

const mod2TimeVal90 = elements['sumTimeVal'].textContent;
const mod2TimeLabel90 = elements['sumTimeLabel'].textContent;
const mod2Formula90 = elements['tlDesgloseDetalle'].innerHTML;

console.log('   - sumTimeVal:', mod2TimeVal90);
console.log('   - sumTimeLabel:', mod2TimeLabel90);
console.log('   - formula:', mod2Formula90);

assert.strictEqual(mod2TimeVal90, '$12.000', 'Modalidad 2 con 90m debe cobrar $12.000 ($8.000 + $4.000)');
assert(mod2TimeLabel90.includes('1 h 30 min a $8.000/h'), 'Label debe indicar 1 h 30 min a $8.000/h');
assert(mod2Formula90.includes('Tiempo operativo total: 10 min abordaje (asistencia inicial) + 10 min viaje ida + 90 min espera en destino + 10 min viaje retorno = <b>120 min</b> | Espera en destino a liquidar: <b>1 h 30 min</b>.'), 'Formula debe reflejar 1 h 30 min');
console.log('   ✅ PASS: Modalidad 2 con 1 h 30 min cobra exactamente $12.000.\n');

// =========================================================================
// TEST 4: Modalidad 2 - 2 horas en destino ($16.000)
// =========================================================================
console.log('4. Verificando Modalidad 2 con 2 horas de espera en destino:');
elements['selStayDestino'].value = '120'; // 2h
ctx.recalcAll();

const mod2TimeVal120 = elements['sumTimeVal'].textContent;
const mod2TimeLabel120 = elements['sumTimeLabel'].textContent;
const mod2Formula120 = elements['tlDesgloseDetalle'].innerHTML;

console.log('   - sumTimeVal:', mod2TimeVal120);
console.log('   - sumTimeLabel:', mod2TimeLabel120);
console.log('   - formula:', mod2Formula120);

assert.strictEqual(mod2TimeVal120, '$16.000', 'Modalidad 2 con 2h debe cobrar $16.000 (2 x $8.000)');
assert(mod2TimeLabel120.includes('2 hrs a $8.000/h'), 'Label debe indicar 2 hrs a $8.000/h');
assert(mod2Formula120.includes('Tiempo operativo total: 10 min abordaje (asistencia inicial) + 10 min viaje ida + 120 min espera en destino + 10 min viaje retorno = <b>150 min</b> | Espera en destino a liquidar: <b>2 hrs</b>.'), 'Formula debe reflejar 2 hrs');
console.log('   ✅ PASS: Modalidad 2 con 2 horas cobra exactamente $16.000.\n');

console.log('🎉 ¡TODAS LAS PRUEBAS DE MODALIDAD 2 PASARON AL 100%! 🚀');
