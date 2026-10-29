const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const html = fs.readFileSync('reservar.html', 'utf8');

console.log('=== TEST SUITE: Flujo Completo de Cálculo en Horarios Especiales de Mediodía ===\n');

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
    'subJornadaTarde', 'titleJornadaNocturno', 'subJornadaNocturno',
    'lblTimeSummaryDesc', 'lblTimeSummaryVal', 'dirSvcName', 'dirRegionRow',
    'dirRegionVal', 'dirTimeDesc', 'destWrap', 'kmCalcControls', 'routeLayoutBox',
    'mapColumn', 'lblFromAddr', 'lblToAddr', 'eventStartCol', 'hours34Col',
    'mins34Col', 'b_maps_route_mins', 'btnBlock_manana', 'btnBlock_tarde',
    'btnBlock_noche', 'badgeBlock_manana', 'badgeBlock_tarde', 'badgeBlock_noche',
    'reasonBlock_manana', 'reasonBlock_tarde', 'reasonBlock_noche',
    'lblEstimatedWindow', 'nightRuleNotice', 'availStatus', 'submitBtn',
    'lblSelectedDateHuman', 'lblCapBadge', 'suggestedPickupCallout',
    'suggestedPickupMsg', 'btnApplySuggestedPickup', 'submitBlockAlert',
    'calGrid', 'calMonthLabel', 'calPrevBtn', 'calNextBtn', 'mainContent',
    'btnCalcularHora', 'eventSubModeBox', 'interregionalRegionBox',
    'jornadaSelectorWrap', 'interProgSelectorWrap'
  ].forEach(id => makeEl(id));

  elements['b_svc_type'].value = '1';
  elements['selStayDestino'].value = '120'; // 2 horas
  elements['b_date'].value = '2026-11-04'; // día hábil disponible

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
    scrollTo: () => {},
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
    console
  };
  sandbox.window = sandbox;

  const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)(?:[^>]*)>([\s\S]*?)<\/script>/gi)];
  const inlineScript = scriptMatches.map(m => m[1]).join('\n');

  const ctx = vm.createContext(sandbox);
  vm.runInContext(inlineScript, ctx);

  return { ctx, elements };
}

// TEST 1: Cita a las 11:00 con 2h de atención -> salida ~ 10:15, término ~ 13:15 (invade mediodía)
console.log('1. Probando cita que invade mediodía (11:00 hrs + 2h en destino):');
const { ctx, elements } = createMockEnv();

elements['appTimeInput'].value = '11:00';
elements['selStayDestino'].value = '120';
ctx.calcSuggestedPickup();

const msgHtml = elements['suggestedPickupMsg'].innerHTML;
const callout = elements['suggestedPickupCallout'];
const timelineBox = elements['serviceTimelineBox'];

// a) Muestra tarjeta de advertencia roja
assert(msgHtml.includes('Horario Especial de Mediodía Requerido'), 'Debe mostrar tarjeta roja con aviso de horario especial');
assert.strictEqual(callout.style.display, 'block', 'El callout debe estar visible');
console.log('   ✅ 1.a: Muestra tarjeta roja de advertencia con "Horario Especial de Mediodía Requerido".');

// b) Continuó la ejecución normal sin early return: 5 casillas de Cronograma calculadas
assert.strictEqual(timelineBox.style.display, 'block', 'Cronograma debe estar visible (display: block)');
assert(elements['tlHoraRecogida'].textContent.includes('hrs'), 'Hora de recogida debe estar calculada');
assert(elements['tlHoraLlegadaDestino'].textContent.includes('hrs'), 'Llegada al recinto debe estar calculada');
assert(elements['tlTiempoDestino'].textContent.includes('2 h'), 'Permanencia en destino debe indicar 2 h');
assert(elements['tlHoraRetorno'].textContent.includes('hrs'), 'Hora de retorno debe estar calculada');
assert(elements['tlHorasEfectivas'].textContent.includes('min'), 'Horas efectivas deben estar calculadas');
console.log('   ✅ 1.b: Cronograma completo visible y 5 casillas calculadas con horas reales.');
console.log(`          Recogida: ${elements['tlHoraRecogida'].textContent} | Llegada: ${elements['tlHoraLlegadaDestino'].textContent} | Retorno: ${elements['tlHoraRetorno'].textContent}`);

// c) Calcula y actualiza la Suma Total y el Abono del 50%
assert(elements['sumFinalTotal'].textContent !== '' && elements['sumFinalTotal'].textContent !== '$0', 'Suma total debe estar calculada');
assert(elements['sumAbono50'].textContent !== '' && elements['sumAbono50'].textContent !== '$0', 'Abono 50% debe estar calculado');
console.log(`   ✅ 1.c: Suma Total calculada (${elements['sumFinalTotal'].textContent}) y Abono 50% (${elements['sumAbono50'].textContent}).`);

// TEST 2: Pre-Solicitud vía WhatsApp / Envío de Reserva con Horario Especial de Mediodía
console.log('\n2. Verificando trazabilidad en mensaje final con Horario Especial:');
elements['b_pat'].value = 'Juan Pérez';
elements['b_age'].value = '75';
elements['b_dx'].value = 'Control Cardiológico';
elements['b_coord'].value = 'María Pérez';
elements['b_ph'].value = '98765432';
elements['b_from'].value = 'Av. Pajaritos 1000, Maipú';
elements['b_to'].value = 'Hospital del Salvador, Providencia';
elements['b_mob'].value = 'Silla de ruedas plegable';
elements['b_comp'].value = 'Viaja con 1 acompañante';
elements['b_terms'].checked = true;

vm.runInContext(`
  ptFrom = { lat: -33.5, lon: -70.7, label: 'Av. Pajaritos 1000, Maipú' };
  ptTo = { lat: -33.4, lon: -70.6, label: 'Hospital del Salvador, Providencia' };
`, ctx);

let openedUrl = '';
ctx.window.open = (url) => { openedUrl = url; };

async function runTests() {
  await ctx.submitBooking({ preventDefault: () => {} });

  if (!openedUrl.includes('wa.me')) {
    console.log('submitBlockAlert:', elements['submitBlockAlert'].innerHTML);
    console.log('availStatus:', elements['availStatus'].innerHTML);
  }

  assert(openedUrl.includes('wa.me'), 'Debe generar enlace a WhatsApp');
  const decodedWa = decodeURIComponent(openedUrl);
  assert(decodedWa.includes('⚠️ Atención: Horario especial sujeto a confirmación de factibilidad.'), 'Mensaje de WhatsApp debe incluir advertencia de horario especial');
  console.log('   ✅ 2.a: Mensaje de WhatsApp incluye: "⚠️ Atención: Horario especial sujeto a confirmación de factibilidad."');

  const summaryHtml = elements['mainContent'].innerHTML;
  assert(summaryHtml.includes('⚠️ Atención: Horario especial sujeto a confirmación de factibilidad.'), 'Resumen en pantalla debe incluir advertencia de horario especial');
  console.log('   ✅ 2.b: Resumen en pantalla incluye advertencia de horario especial.');

  // TEST 3: Pre-Solicitud con Horario 100% Estándar (Cita a las 09:30 con 1h duración -> salida 08:45, término 10:45)
  console.log('\n3. Verificando horario 100% estándar (sin invasión de mediodía):');
  const env2 = createMockEnv();
  env2.elements['appTimeInput'].value = '09:30';
  env2.elements['selStayDestino'].value = '60';
  env2.ctx.calcSuggestedPickup();

  assert(!env2.elements['suggestedPickupMsg'].innerHTML.includes('Horario Especial de Mediodía Requerido'), 'No debe mostrar aviso de mediodía');

  env2.elements['b_pat'].value = 'Ana Soto';
  env2.elements['b_age'].value = '80';
  env2.elements['b_dx'].value = 'Control Kinesiología';
  env2.elements['b_coord'].value = 'Ana Soto';
  env2.elements['b_ph'].value = '91234567';
  env2.elements['b_from'].value = 'Av. Central 500, Maipú';
  env2.elements['b_to'].value = 'Clínica Dávila, Recoleta';
  env2.elements['b_mob'].value = 'Camina con bastón';
  env2.elements['b_comp'].value = 'Viaja solo';
  env2.elements['b_terms'].checked = true;

  vm.runInContext(`
    ptFrom = { lat: -33.5, lon: -70.7, label: 'Av. Central 500, Maipú' };
    ptTo = { lat: -33.4, lon: -70.6, label: 'Clínica Dávila, Recoleta' };
  `, env2.ctx);

  let openedUrlStd = '';
  env2.ctx.window.open = (url) => { openedUrlStd = url; };
  await env2.ctx.submitBooking({ preventDefault: () => {} });

  const decodedWaStd = decodeURIComponent(openedUrlStd);
  assert(!decodedWaStd.includes('⚠️ Atención: Horario especial sujeto a confirmación de factibilidad.'), 'Mensaje estándar NO debe incluir advertencia');
  assert(!env2.elements['mainContent'].innerHTML.includes('⚠️ Atención: Horario especial sujeto a confirmación de factibilidad.'), 'Resumen estándar NO debe incluir advertencia');
  console.log('   ✅ 3.a: Horario estándar NO incluye ninguna advertencia en WhatsApp ni en resumen.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE FLUJO COMPLETO EN MEDIODÍA PASARON AL 100%! 🚀');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
