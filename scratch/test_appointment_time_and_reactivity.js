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
  const eventListeners = {};

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
      addEventListener: (evt, fn) => {
        if (!eventListeners[id]) eventListeners[id] = {};
        if (!eventListeners[id][evt]) eventListeners[id][evt] = [];
        eventListeners[id][evt].push(fn);
      },
      dispatchEvent: (evt) => {
        const type = typeof evt === 'string' ? evt : evt.type;
        if (el.onchange && type === 'change') el.onchange();
        if (eventListeners[id] && eventListeners[id][type]) {
          eventListeners[id][type].forEach(fn => fn(evt));
        }
      },
      querySelector: (sel) => {
        const valMatch = sel.match(/\[value="([^"]+)"\]/);
        if (valMatch) {
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
        el.options = [];
        const optMatches = val.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi);
        for (const match of optMatches) {
          el.options.push({
            value: match[1],
            text: match[2],
            selected: match[0].includes('selected')
          });
          if (match[0].includes('selected')) {
            el.value = match[1];
          }
        }
      }
    });

    elements[id] = el;
    return el;
  }

  // Elementos requeridos
  [
    'b_svc_type', 'b_date', 'b_time', 'btnSubmit', 'submitBlockAlert',
    'appTimeInput', 'suggestedPickupCallout', 'suggestedPickupMsg',
    'selStayDestino', 'lblStayDestino', 'timeSectionTitle', 'timeSectionSub',
    'serviceTimelineBox', 'tlHoraRecogida', 'tlHoraLlegadaDestino',
    'tlTiempoDestino', 'tlTiempoDestinoLabel', 'tlHoraRetorno',
    'tlHoraRetornoLabel', 'tlHorasEfectivas', 'tlHorasEfectivasLabel',
    'tlFormulaText', 'sumKmTimeSection', 'sumHoursValue', 'sumTotal',
    'sumAbono50', 'sumSaldoFinal', 'sumKmVal', 'sumTimeVal',
    'directTimeOnlySection', 'dirSvcName', 'dirBasePrice', 'dirTotal',
    'dirAbono50', 'dirSaldoFinal', 'cardManana', 'cardTarde', 'cardNoche',
    'cardInterregional', 'b_mob', 'homeTimeWrap', 'asistenteBox',
    'lblPickupSelect', 'durationBox12', 'durationBox34', 'selHours34',
    'selMins34', 'hours34Col', 'mins34Col', 'eventStartCol', 'selEventStart1',
    'availStatus', 'outKm', 'outPrice', 'outTime', 'bdOneWay', 'bdReturn',
    'bdMode', 'bdTotalPrice', 'rowReturn', 'resultPanel', 'lblResultTitle'
  ].forEach(id => {
    makeEl(id, ['appTimeInput', 'selStayDestino', 'b_time', 'b_svc_type', 'b_mob', 'selHours34', 'selMins34', 'selEventStart1'].includes(id) ? 'select' : 'div');
  });

  elements['b_svc_type'].value = '1';
  elements['selStayDestino'].value = '60';

  const sandbox = {
    window: {},
    document: {
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.substring(1)] || makeEl(sel.substring(1));
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === '.shift-card') return [elements['cardManana'], elements['cardTarde'], elements['cardNoche'], elements['cardInterregional']];
        return [];
      },
      createElement: (tag) => makeEl('temp_' + Math.random(), tag),
      body: { appendChild: () => {} },
      documentElement: { setAttribute: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { search: '' },
    navigator: { geolocation: {} },
    L: {
      map: () => {
        const m = { setView: () => m, on: () => m, invalidateSize: () => m };
        return m;
      },
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => ({ bindPopup: () => ({ openPopup: () => {} }) }) }),
      polyline: () => ({ addTo: () => {} }),
      divIcon: () => ({}),
      icon: () => ({}),
      latLngBounds: () => ({ pad: () => ({}) })
    },
    console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    Intl
  };

  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(mainScript, ctx);

  return {
    ctx,
    elements,
    eventListeners,
    getVar: (n) => vm.runInContext(n, ctx),
    setVar: (n, v) => vm.runInContext(`${n} = ${JSON.stringify(v)}`, ctx)
  };
}

console.log('=== TEST SUITE: Selector de Hora de Cita y Reactividad Automática ===\n');

const { ctx, elements, eventListeners, setVar, getVar } = createMockEnv();

// 1. Verificar opciones generadas para appTimeInput
console.log('1. Verificando opciones del desplegable appTimeInput:');

const appTimeEl = elements['appTimeInput'];
assert(appTimeEl.options.length > 0, 'appTimeInput debe tener opciones pobladas');

const optValues = appTimeEl.options.map(o => o.value);
assert(optValues.includes('07:00'), 'Debe incluir 07:00');
assert(optValues.includes('10:00'), 'Debe incluir 10:00');
assert(optValues.includes('18:00'), 'Debe incluir estrictamente 18:00');

// Verificar que NO existan opciones superiores a 18:00
const forbiddenTimes = ['18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00'];
forbiddenTimes.forEach(t => {
  assert(!optValues.includes(t), `NO debe incluir ${t}`);
});

const lastOpt = appTimeEl.options[appTimeEl.options.length - 1];
assert.strictEqual(lastOpt.value, '18:00', 'La última opción debe ser estrictamente 18:00');
assert.strictEqual(lastOpt.text.trim(), '18:00 hrs', 'El texto de la última opción debe ser "18:00 hrs"');
console.log('   ✅ PASS: Opciones limitadas estrictamente hasta las 18:00 hrs (eliminadas opciones posteriores).');

// 2. Verificar que se haya registrado el evento change en appTimeInput
console.log('\n2. Verificando registro del evento change en appTimeInput:');
assert(typeof ctx.onAppTimeChange === 'function', 'onAppTimeChange debe estar definida en el scope global');
assert(eventListeners['appTimeInput'] && eventListeners['appTimeInput']['change'], 'Debe tener listener de change registrado');
assert(htmlContent.includes('id="appTimeInput" onchange="onAppTimeChange()"'), 'HTML debe incluir onchange="onAppTimeChange()"');
console.log('   ✅ PASS: Evento change registrado tanto en HTML como en addEventListener.');

// 3. Simular selección de hora y verificar reactividad automática (Cita 10:00, Ruta 15 min, Duración 60 min)
console.log('\n3. Verificando reactividad automática ante selección de hora (Turno Mañana):');
elements['b_date'].value = '2026-11-16';
elements['b_svc_type'].value = '1';
ctx.applyModalityVisibility();

// Configurar ruta calculada (15 min de viaje ida)
setVar('lastRouteIdaMin', 15);
setVar('tripMultiplier', 2);
setVar('lastTotalKm', 20);
setVar('lastKmCost', 20000);
elements['selStayDestino'].value = '60'; // 1 hora en destino

// Cambiar hora de cita a las 10:00 hrs y disparar reactividad
elements['appTimeInput'].value = '10:00';
ctx.onAppTimeChange();

// 10:00 (600 min) - (15 min viaje + 10 min TENS + 20 min admisión = 45 min) = 555 min -> 09:15 hrs
assert.strictEqual(elements['b_time'].value, '09:15', 'Hora oficial de recogida debe actualizarse automáticamente a las 09:15 hrs');
assert.strictEqual(elements['tlHoraRecogida'].textContent, '09:15 hrs', 'Cronograma: Hora de recogida debe ser 09:15 hrs');
assert.strictEqual(elements['tlHoraLlegadaDestino'].textContent, '09:40 hrs', 'Cronograma: Llegada estimada debe ser 09:40 hrs (20 min antes)');
assert(elements['tlTiempoDestino'].textContent.includes('1 h'), 'Cronograma: Permanencia debe ser 1 h');
assert.strictEqual(elements['tlHoraRetorno'].textContent, '10:55 hrs', 'Cronograma: Retorno al hogar debe ser 10:55 hrs');
assert.strictEqual(elements['serviceTimelineBox'].style.display, 'block', 'Cronograma debe estar visible');

// Suma Total: Modo 1, 10 + 15 + 60 + 15 = 100 min -> billed 120 min (2h -> $24.000)
assert.strictEqual(elements['sumTimeVal'].textContent, '$24.000', 'Suma Total: 2h de asistencia deben ser $24.000');
assert(elements['sumFinalTotal'].textContent.length > 0, 'Total general debe estar calculado');
assert(elements['sumAbono50'].textContent.length > 0, 'Abono 50% debe estar calculado');
assert.strictEqual(elements['suggestedPickupCallout'].style.display, 'block', 'Tarjeta de confirmación sugerida debe estar visible');
assert(elements['suggestedPickupMsg'].innerHTML.includes('09:15 hrs'), 'Tarjeta debe indicar 09:15 hrs de recogida');
console.log('   ✅ PASS: Cita 10:00 actualiza instantáneamente Cronograma, Turno Mañana y Suma Total.');

// 4. Verificar cambio de hora de cita a la tarde (Cita 16:30, Ruta 15 min, Duración 60 min)
console.log('\n4. Verificando reactividad automática ante selección de hora (Turno Tarde):');
elements['appTimeInput'].value = '16:30';
ctx.onAppTimeChange();

// 16:30 (990 min) - 45 min = 945 min -> 15:45 hrs (Turno Tarde)
assert.strictEqual(elements['b_time'].value, '15:45', 'Hora oficial debe pasar automáticamente a las 15:45 hrs');
assert.strictEqual(elements['tlHoraRecogida'].textContent, '15:45 hrs', 'Cronograma: Recogida 15:45 hrs');
assert.strictEqual(elements['tlHoraLlegadaDestino'].textContent, '16:10 hrs', 'Cronograma: Llegada 16:10 hrs');
assert.strictEqual(elements['tlHoraRetorno'].textContent, '17:25 hrs', 'Cronograma: Retorno 17:25 hrs');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Turno Tarde'), 'Debe asignar automáticamente Turno Tarde');
console.log('   ✅ PASS: Cita 16:30 asigna automáticamente Turno Tarde y actualiza todos los datos en tiempo real.');

// 5. Verificar estabilidad del botón "Calcular Hora de Salida Sugerida"
console.log('\n5. Verificando estabilidad del botón "Calcular Hora de Salida Sugerida":');
assert(htmlContent.includes('onclick="calcSuggestedPickup()"'), 'El botón manual debe seguir apuntando a calcSuggestedPickup()');
assert(typeof ctx.calcSuggestedPickup === 'function', 'calcSuggestedPickup debe permanecer disponible y funcional');
ctx.calcSuggestedPickup();
assert.strictEqual(elements['b_time'].value, '15:45', 'El botón manual debe ejecutar el mismo cálculo con éxito');
console.log('   ✅ PASS: Botón manual permanece plenamente funcional y compatible.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE HORA DE CITA Y REACTIVIDAD PASARON AL 100%! 🚀\n');
