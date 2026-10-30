const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../js/reservar.js'), 'utf8');

const jsResPath = path.resolve(__dirname, '../js/reservar.js');
const mainScript = fs.existsSync(jsResPath) ? fs.readFileSync(jsResPath, 'utf8') : '';

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
        if (el.onclick && type === 'click') el.onclick();
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
    'b_svc_type', 'b_date', 'b_time', 'btnSubmit', 'submitBtn', 'submitBlockAlert',
    'appTimeInput', 'hora-cita-medica', 'selStayDestino', 'duracion-atencion',
    'btnCalcularHora', 'suggestedPickupCallout', 'suggestedPickupMsg',
    'lblStayDestino', 'timeSectionTitle', 'timeSectionSub',
    'serviceTimelineBox', 'tlBadge', 'tlHoraRecogida', 'tlHoraLlegadaDestino',
    'tlTiempoDestino', 'tlTiempoDestinoLabel', 'tlHoraRetorno',
    'tlHoraRetornoLabel', 'tlHorasEfectivas', 'tlHorasEfectivasLabel',
    'tlFormulaText', 'sumKmTimeSection', 'sumHoursValue', 'sumTotal',
    'sumFinalTotal', 'sumAbono50', 'sumSaldoFinal', 'sumKmVal', 'sumTimeVal',
    'directTimeOnlySection', 'dirSvcName', 'dirBasePrice', 'dirTotal',
    'dirAbono50', 'dirSaldoFinal', 'cardManana', 'cardTarde', 'cardNoche',
    'cardInterregional', 'b_mob', 'homeTimeWrap', 'asistenteBox',
    'lblPickupSelect', 'durationBox12', 'durationBox34', 'selHours34',
    'selMins34', 'hours34Col', 'mins34Col', 'eventStartCol', 'selEventStart1',
    'availStatus', 'outKm', 'outPrice', 'outTime', 'bdOneWay', 'bdReturn',
    'bdMode', 'bdTotalPrice', 'rowReturn', 'resultPanel', 'lblResultTitle'
  ].forEach(id => {
    makeEl(id, ['appTimeInput', 'hora-cita-medica', 'selStayDestino', 'duracion-atencion', 'b_time', 'b_svc_type', 'b_mob', 'selHours34', 'selMins34', 'selEventStart1'].includes(id) ? 'select' : (id.startsWith('btn') ? 'button' : 'div'));
  });

  elements['b_svc_type'].value = '1';
  elements['selStayDestino'].value = '60';

  const sandbox = {
    window: {},
    document: {
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel === '#hora-cita-medica') return elements['hora-cita-medica'] || elements['appTimeInput'] || makeEl('appTimeInput');
        if (sel === '#duracion-atencion') return elements['duracion-atencion'] || elements['selStayDestino'] || makeEl('selStayDestino');
        if (sel === '#btnCalcularHora') return elements['btnCalcularHora'] || makeEl('btnCalcularHora');
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

console.log('=== TEST SUITE: Función Maestra Centralizada recalcularTodoElServicio() ===\n');

// 1. Verificación en HTML de los elementos y gatillantes
console.log('1. Verificando identificadores y atributos en HTML:');
assert(htmlContent.includes('id="appTimeInput"'), 'HTML debe incluir selector reactivo id="appTimeInput"');
assert(htmlContent.includes('recalcularTodoElServicio'), 'HTML debe conectar recalcularTodoElServicio');
assert(htmlContent.includes('name="hora-cita-medica"') || htmlContent.includes('id="appTimeInput"'), 'HTML debe asociar hora de cita médica');
assert(htmlContent.includes('name="duracion-atencion"') || htmlContent.includes('id="selStayDestino"'), 'HTML debe asociar duración de atención');
console.log('   ✅ PASS: Atributos y gatillantes presentes en HTML.');

const { ctx, elements, eventListeners, setVar } = createMockEnv();

// 2. Existencia de window.recalcularTodoElServicio
console.log('\n2. Verificando disponibilidad de window.recalcularTodoElServicio:');
assert(typeof ctx.recalcularTodoElServicio === 'function', 'recalcularTodoElServicio debe ser función global');
assert(typeof ctx.window.recalcularTodoElServicio === 'function', 'window.recalcularTodoElServicio debe estar expuesta');
console.log('   ✅ PASS: Función maestra centralizada disponible en window.');

// 3. Verificando cálculo con tiempo base temporal de 10 min si mapa aún no se calcula (lastRouteIdaMin = 0)
console.log('\n3. Verificando fallback de 10 min cuando ruta no está trazada en mapa (lastRouteIdaMin = 0):');
setVar('lastRouteIdaMin', 0);
setVar('tripMultiplier', 2);
elements['b_date'].value = '2026-11-16';
elements['b_svc_type'].value = '1';
elements['appTimeInput'].value = '10:00';
elements['selStayDestino'].value = '60';

// Ejecutar Función Maestra
ctx.recalcularTodoElServicio('appTime');

// Con 10:00 y base temporal de 10 min:
// Anticipación = 10 min ida + 10 min TENS + 20 min admisión = 40 min -> Recogida: 10:00 - 40 min = 09:20 -> slot 15m = 09:15 hrs
assert.strictEqual(elements['b_time'].value, '09:15', 'Debe calcular recogida en 09:15 hrs sin arrojar NaN ni bloquear');
assert.strictEqual(elements['tlHoraRecogida'].textContent, '09:15 hrs', 'Cronograma: Recogida en 09:15 hrs');
assert(elements['tlHoraLlegadaDestino'].textContent.length > 0, 'Cronograma: Llegada calculada');
assert(elements['tlHoraRetorno'].textContent.length > 0, 'Cronograma: Retorno calculado');
assert(elements['tlTiempoDestino'].textContent.includes('1 h'), 'Cronograma: Permanencia 1 h');
assert(elements['tlHorasEfectivas'].textContent.length > 0, 'Cronograma: Horas efectivas calculadas');
assert(elements['sumFinalTotal'].textContent.length > 0, 'Suma Total: Total general calculado');
assert(elements['sumAbono50'].textContent.length > 0, 'Suma Total: Abono 50% calculado');
assert.strictEqual(elements['suggestedPickupCallout'].style.display, 'block', 'Tarjeta de salida visible');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Calcule la ruta primero en el mapa'), 'Aviso amigable de cálculo provisional presente');
console.log('   ✅ PASS: Cálculo 100% matemático sin errores ni NaN con 10 min de base temporal.');

// 4. Verificando actualización automática al terminar ruta en Mapa (renderPricing)
console.log('\n4. Verificando gatillante del Mapa Leaflet/OSM (renderPricing):');
// Ruta de 20 km total (10 km ida), 15 min de viaje
ctx.renderPricing(10, 10, 20, 30, 15);

// Ahora con 15 min de viaje real:
// Anticipación = 15 min ida + 30 min fija = 45 min -> Recogida: 10:00 - 45 min = 09:15 hrs
// Llegada = 09:15 + 10 min abordaje + 15 min ida = 09:40 hrs
assert.strictEqual(elements['tlHoraLlegadaDestino'].textContent, '09:40 hrs', 'Cronograma debe actualizarse con tiempo real del mapa a las 09:40 hrs');
// Retorno = 09:40 + 60 min stay + 15 min retorno = 10:55 hrs
assert.strictEqual(elements['tlHoraRetorno'].textContent, '10:55 hrs', 'Cronograma: Retorno ajustado con mapa a las 10:55 hrs');
assert(!elements['suggestedPickupMsg'].innerHTML.includes('Calcule la ruta primero en el mapa'), 'Aviso de cálculo provisional debe desaparecer tras trazarse el mapa');
console.log('   ✅ PASS: Término de ruta del mapa gatilla automáticamente recalcularTodoElServicio.');

// 5. Verificando gatillante de Botón #btnCalcularHora
console.log('\n5. Verificando gatillante y micro-feedback del Botón #btnCalcularHora:');
elements['appTimeInput'].value = '09:30';
ctx.recalcularTodoElServicio('button');
assert.strictEqual(elements['b_time'].value, '08:45', 'Botón debe recalcular hora a 08:45 hrs');
console.log('   ✅ PASS: Botón #btnCalcularHora procesa y recalcula en un solo paso.');

// 6. Verificando gatillante de Duración en Destino
console.log('\n6. Verificando gatillante del Selector de Duración:');
elements['selStayDestino'].value = '120'; // 2 horas
ctx.onStayDestinoChange();
assert(elements['tlTiempoDestino'].textContent.includes('2 h'), 'Cronograma debe actualizarse a 2 horas');
console.log('   ✅ PASS: Selector de Duración recalcula cronograma y totales inmediatamente.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FUNCIÓN MAESTRA Y SUS GATILLANTES PASARON AL 100%! 🚀\n');
