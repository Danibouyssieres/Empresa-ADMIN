const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../css/reservar.css'), 'utf8');

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

console.log('=== TEST SUITE: Insignia Dinámica en Cronograma Estimado ===\n');

// 1. Verificación en HTML de la etiqueta tlBadge
console.log('1. Verificando presencia de tlBadge en HTML:');
assert(htmlContent.includes('id="tlBadge"'), 'El elemento debe tener id="tlBadge"');
console.log('   ✅ PASS: span con id="tlBadge" presente en el DOM.');

const { ctx, elements, setVar } = createMockEnv();

// 2. Verificación en Modalidad 1 (Servicio Integral)
console.log('\n2. Verificando texto en Modalidad 1 (Servicio Integral):');
elements['b_svc_type'].value = '1';
ctx.onServiceTypeChange();
assert.strictEqual(elements['tlBadge'].textContent, 'Ida + Asistencia + Retorno', 'Modalidad 1 debe mostrar "Ida + Asistencia + Retorno"');
console.log('   ✅ PASS: Modalidad 1 muestra exactamente "Ida + Asistencia + Retorno".');

// 3. Verificación al cambiar a Modalidad 2 (Traslado Exclusivo con Espera)
console.log('\n3. Verificando reactividad al cambiar a Modalidad 2 (Traslado Exclusivo con Espera):');
elements['b_svc_type'].value = '2';
ctx.onServiceTypeChange();
assert.strictEqual(elements['tlBadge'].textContent, 'Ida + Espera en Destino + Retorno', 'Modalidad 2 debe mostrar "Ida + Espera en Destino + Retorno"');
console.log('   ✅ PASS: Modalidad 2 actualiza inmediatamente a "Ida + Espera en Destino + Retorno".');

// 4. Verificación al volver a Modalidad 1
console.log('\n4. Verificando retorno reactivo a Modalidad 1:');
elements['b_svc_type'].value = '1';
ctx.onServiceTypeChange();
assert.strictEqual(elements['tlBadge'].textContent, 'Ida + Asistencia + Retorno', 'Debe regresar reactivamente a "Ida + Asistencia + Retorno"');
console.log('   ✅ PASS: Regresa reactivamente a "Ida + Asistencia + Retorno" sin recargar página.');

// 5. Verificación durante updateServiceTimeline
console.log('\n5. Verificando consistencia en updateServiceTimeline():');
setVar('lastRouteIdaMin', 15);
setVar('tripMultiplier', 2);
elements['b_svc_type'].value = '2';
ctx.recalcAll();
assert.strictEqual(elements['tlBadge'].textContent, 'Ida + Espera en Destino + Retorno', 'updateServiceTimeline en Mod 2 mantiene la insignia');
elements['b_svc_type'].value = '1';
ctx.recalcAll();
assert.strictEqual(elements['tlBadge'].textContent, 'Ida + Asistencia + Retorno', 'updateServiceTimeline en Mod 1 mantiene la insignia');
console.log('   ✅ PASS: updateServiceTimeline actualiza y preserva el texto según la modalidad.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA INSIGNIA DINÁMICA PASARON AL 100%! 🚀\n');
