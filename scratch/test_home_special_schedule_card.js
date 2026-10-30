const path = require('path');
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const html = fs.readFileSync('reservar.html', 'utf8') + '\n' + fs.readFileSync('js/reservar.js', 'utf8') + '\n' + fs.readFileSync('css/reservar.css', 'utf8');

console.log('=== TEST SUITE: Tarjeta Informativa Roja de Horario Especial y Redacción Domiciliaria ===\n');

// 1. Static HTML Assertions
console.log('1. Verificando estructura HTML estática:');
assert(html.includes('id="homeSpecialScheduleCard"'), 'Debe existir #homeSpecialScheduleCard en el DOM');
assert(html.includes('¿Requiere un horario de inicio diferente?'), 'Debe incluir el título con el texto solicitado');
assert(html.includes('Si necesita que la atención comience en una hora específica fuera de las opciones listadas'), 'Debe incluir el texto explicativo');
assert(html.includes('Consultar Horario Especial por WhatsApp'), 'Debe incluir el botón de WhatsApp con el texto exacto');
assert(html.includes('id="btnHomeSpecialWa"'), 'Debe existir el enlace #btnHomeSpecialWa');
console.log('   ✅ PASS: Estructura HTML estática, título, texto y botón presentes.');

// 2. DOM emulation test
function createMockEnv() {
  const elements = {};

  function makeEl(id, tag = 'div') {
    if (elements[id]) {
      elements[id].tagName = tag.toUpperCase();
      return elements[id];
    }
    const el = {
      id,
      tagName: tag.toUpperCase(),
      value: '',
      textContent: '',
      innerHTML: '',
      href: '',
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
      setAttribute: (k, v) => { if (k === 'href') el.href = v; },
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
    'lblTimeSummaryDesc', 'lblTimeSummaryVal', 'dirSvcName', 'dirRegionRow',
    'dirRegionVal', 'dirTimeDesc', 'dirFinalTotal', 'dirAbono50', 'dirSaldoFinal',
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
    'jornadaSelectorWrap', 'interProgSelectorWrap', 'asistenteBox',
    'homeTimeWrap', 'homeSpecialScheduleCard', 'btnHomeSpecialWa', 'lblPickupSelect',
    'sumKmTimeSection', 'directTimeOnlySection', 'interregionalBlockWarn', 'lblHours34',
    'selHours34', 'selMins34'
  ].forEach(id => makeEl(id));

  makeEl('b_time', 'select');
  makeEl('appTimeInput', 'select');
  makeEl('selStayDestino', 'select');
  makeEl('selHours34', 'select');
  makeEl('selMins34', 'select');
  makeEl('b_svc_type', 'select');

  elements['b_svc_type'].value = '3';
  elements['b_date'].value = '2026-11-04'; // Miércoles hábil
  elements['selHours34'].value = '2';
  elements['selMins34'].value = '0';

  const sandbox = {
    window: { scrollTo: () => {} },
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
    scrollTo: () => {},
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

  const jsResPath = path.resolve(__dirname, '../js/reservar.js');
const inlineScript = fs.existsSync(jsResPath) ? fs.readFileSync(jsResPath, 'utf8') : (fs.existsSync('js/reservar.js') ? fs.readFileSync('js/reservar.js', 'utf8') : '');

  const ctx = vm.createContext(sandbox);
  vm.runInContext(inlineScript, ctx);

  return { ctx, elements };
}

const { ctx, elements } = createMockEnv();

// TEST 2: Visibilidad y enlace WhatsApp en Modalidad 3 (Cuidados a Domicilio)
console.log('\n2. Evaluando Modalidad 3 (Cuidados a Domicilio):');
elements['b_svc_type'].value = '3';
ctx.applyModalityVisibility();

assert.strictEqual(elements['asistenteBox'].style.display, 'none', 'Asistente vehicular debe estar oculto en Mod 3');
assert.strictEqual(elements['homeTimeWrap'].style.display, 'block', 'homeTimeWrap debe estar visible en Mod 3');
const waHref3 = elements['btnHomeSpecialWa'].href;
assert(waHref3.includes('wa.me/56929990095'), 'Enlace debe ser hacia WhatsApp de la empresa');
assert(decodeURIComponent(waHref3).includes('Cuidados a Domicilio'), 'Mensaje WhatsApp debe mencionar "Cuidados a Domicilio"');
console.log(`   ✅ PASS: Enlace prellenado para Modalidad 3: "${decodeURIComponent(waHref3)}"`);

// TEST 3: Redacción en el desplegable b_time para Modalidad 3
console.log('\n3. Verificando redacción de opciones en selector de inicio (Modalidad 3):');
vm.runInContext("selectedBlock = 'manana';", ctx);
ctx.updateSlots(false);

const options3 = elements['b_time'].options.filter(o => o.value);
assert(options3.length > 0, 'Debe haber opciones cargadas en b_time');
console.log('   - Primera opción cargada:', options3[0].text);
assert(options3.every(o => o.text.includes('Llegada estimada / Inicio de atención')), 'Todas las opciones de mañana deben decir "Llegada estimada / Inicio de atención"');
assert(!options3.some(o => o.text.includes('recogida')), 'Ninguna opción en Modalidad 3 debe incluir la palabra vehicular "recogida"');
console.log('   ✅ PASS: Redacción modificada con éxito a "[hh:mm] hrs — Llegada estimada / Inicio de atención" y término "recogida" eliminado.');

// TEST 4: Modalidad 4 (Eventos Sociales)
console.log('\n4. Evaluando Modalidad 4 (Acompañamiento en Eventos Sociales):');
elements['b_svc_type'].value = '4';
ctx.applyModalityVisibility();

assert.strictEqual(elements['asistenteBox'].style.display, 'none', 'Asistente vehicular debe estar oculto en Mod 4');
assert.strictEqual(elements['homeTimeWrap'].style.display, 'block', 'homeTimeWrap debe estar visible en Mod 4');
const waHref4 = elements['btnHomeSpecialWa'].href;
assert(decodeURIComponent(waHref4).includes('Acompañamiento en Eventos Sociales'), 'Mensaje WhatsApp debe mencionar "Acompañamiento en Eventos Sociales"');
console.log(`   ✅ PASS: Enlace prellenado para Modalidad 4: "${decodeURIComponent(waHref4)}"`);

ctx.updateSlots(false);
const options4 = elements['b_time'].options.filter(o => o.value);
assert(options4.every(o => o.text.includes('Llegada estimada / Inicio de atención')), 'Opciones en Modalidad 4 deben decir "Llegada estimada / Inicio de atención"');
assert(!options4.some(o => o.text.includes('recogida')), 'Opciones en Modalidad 4 NO deben incluir "recogida"');
console.log('   ✅ PASS: Opciones en Modalidad 4 no contienen la palabra "recogida".');

// TEST 5: Modalidad 1 (Servicio Integral vehicular)
console.log('\n5. Verificando preservación en Modalidad 1 (Traslados Vehiculares):');
elements['b_svc_type'].value = '1';
ctx.applyModalityVisibility();

assert.strictEqual(elements['asistenteBox'].style.display, 'block', 'Asistente de Salida debe estar visible en Mod 1');
assert.strictEqual(elements['homeTimeWrap'].style.display, 'none', 'homeTimeWrap debe estar oculto en Mod 1');

ctx.updateSlots(false);
const options1 = elements['b_time'].options.filter(o => o.value);
assert(options1.some(o => o.text.includes('Hora exacta de recogida')), 'En Modalidad 1 de traslados vehiculares se mantiene "Hora exacta de recogida"');
console.log('   ✅ PASS: En Modalidad 1 se mantiene "Hora exacta de recogida" para traslados vehiculares.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA TARJETA DE HORARIO ESPECIAL Y REDACCIÓN PASARON AL 100%! 🚀');
