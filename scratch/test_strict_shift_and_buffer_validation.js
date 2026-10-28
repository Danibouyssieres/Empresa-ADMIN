const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== TEST SUITE: Validación Estricta de Turnos, Buffers y Control de Errores ===\n');

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
      style: {},
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
      querySelector: (sel) => {
        const valMatch = sel.match(/\[value="([^"]+)"\]/);
        if (valMatch) {
          return el.options.find(o => o.value === valMatch[1]) || null;
        }
        return null;
      },
      querySelectorAll: (sel) => [],
      appendChild: (opt) => {
        el.options.push(opt);
      }
    };

    let innerHTMLVal = '';
    Object.defineProperty(el, 'innerHTML', {
      get() { return innerHTMLVal; },
      set(val) {
        innerHTMLVal = val;
        const optMatches = [...val.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)];
        if (optMatches.length > 0) {
          el.options = optMatches.map(m => {
            const isSel = m[0].includes('selected');
            const isDis = m[0].includes('disabled');
            const cleanText = m[2].replace(/<[^>]+>/g, '').trim();
            return {
              value: m[1],
              text: cleanText,
              textContent: cleanText,
              selected: isSel,
              disabled: isDis
            };
          });
          const selOpt = el.options.find(o => o.selected) || el.options[0];
          if (selOpt && !el.value) el.value = selOpt.value;
        }
      }
    });

    elements[id] = el;
    return el;
  }

  [
    'b_date', 'b_svc_type', 'lblSelectedDateHuman', 'lblCapBadge',
    'btnBlock_manana', 'btnBlock_tarde', 'btnBlock_noche',
    'badgeBlock_manana', 'badgeBlock_tarde', 'badgeBlock_noche',
    'reasonBlock_manana', 'reasonBlock_tarde', 'reasonBlock_noche',
    'b_time', 'availStatus', 'submitBlockAlert', 'nightRuleNotice',
    'lblEstimatedWindow', 'submitBtn', 'calGrid', 'calMonthLabel',
    'routeLayoutBox', 'mapColumn', 'destWrap', 'kmCalcControls',
    'b_from', 'b_to', 'lblFromAddr', 'lblToAddr', 'ringInfoBox', 'ringTitle', 'ringDesc',
    'asistenteBox', 'homeTimeWrap', 'lblPickupSelect', 'appTimeInput',
    'suggestedPickupCallout', 'suggestedPickupMsg',
    'selStayDestino', 'durationBox12', 'durationBox34', 'eventStartCol', 'hours34Col', 'mins34Col',
    'selHours34', 'selMins34', 'lblHours34', 'timeSectionTitle', 'timeSectionSub', 'lblStayDestino',
    'serviceTimelineBox', 'tlHoraRecogida', 'tlHoraLlegadaDestino', 'tlTiempoDestino',
    'tlHoraRetorno', 'tlHorasEfectivas', 'tlDesgloseDetalle',
    'sumKmTimeSection', 'directTimeOnlySection',
    'sumKmText', 'sumKmVal', 'sumTimeLabel', 'sumTimeVal', 'sumRawTotal', 'sumRingFloorVal', 'sumFinalTotal', 'sumSaldoFinal', 'sumAbono50',
    'dirSvcName', 'dirRegionVal', 'dirTimeDesc', 'dirFinalTotal', 'dirSaldoFinal', 'dirAbono50',
    'jornadaSelectorWrap', 'interregionalRegionBox', 'interProgSelectorWrap', 'eventSubModeBox', 'interregionalBlockWarn',
    'pillJornada_habil', 'pillJornada_tarde', 'pillJornada_nocturno',
    'titleJornadaNocturno', 'subJornadaNocturno',
    'lblRateHabil', 'lblRateTarde', 'lblRateNocturno',
    'b_tens', 'outKm', 'outPrice', 'bdOneWay', 'bdReturn', 'bdMode', 'bdTotalPrice', 'resultPanel',
    'b_comp_notice', 'b_mob', 'b_comp'
  ].forEach(id => makeEl(id));

  elements['b_svc_type'].options = [
    { value: '1', text: '1. Servicio Integral (Asistencia + Traslado)', textContent: '1. Servicio Integral (Asistencia + Traslado)' },
    { value: '2', text: '2. Traslado Exclusivo con Espera', textContent: '2. Traslado Exclusivo con Espera' }
  ];
  elements['b_svc_type'].value = '1';

  elements['selStayDestino'].options = [
    { value: '60', text: '1 hora', textContent: '1 hora' },
    { value: '90', text: '1 hora 30 min', textContent: '1 hora 30 min' },
    { value: '120', text: '2 horas', textContent: '2 horas' }
  ];
  elements['selStayDestino'].value = '60';

  const sandbox = {
    console,
    window: { location: { search: '' } },
    document: {
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
        return null;
      },
      querySelectorAll: (sel) => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      documentElement: { setAttribute: () => {}, getAttribute: () => null },
      createElement: (tag) => makeEl('temp_' + Math.random(), tag)
    },
    $: (sel) => {
      if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
      return null;
    },
    $$: () => [],
    alert: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    L: {
      map: () => {
        const m = { setView: () => m, on: () => m, invalidateSize: () => m };
        return m;
      },
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => ({ bindPopup: () => ({ openPopup: () => {} }) }) }),
      polyline: () => ({ addTo: () => {} }),
      divIcon: () => ({}),
      icon: () => ({})
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {}
  };
  sandbox.window = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(mainScript, ctx);

  const getVar = (name) => vm.runInContext(name, ctx);
  const setVar = (name, val) => vm.runInContext(`${name} = ${JSON.stringify(val)}`, ctx);

  return { ctx, elements, getVar, setVar };
}

const env = createMockEnv();
const { ctx, elements, setVar } = env;

// Fijar fecha válida y ruta
elements['b_date'].value = '2026-11-16';
elements['b_svc_type'].value = '1';
setVar('lastRouteIdaMin', 20); // 20 min ida
setVar('tripMultiplier', 2);   // Ida y vuelta (retorno = 20 min)

console.log('1. Verificando Turno Mañana: Cita que genera salida antes de las 06:00 hrs:');
// Cita a las 06:30 hrs -> anticipación 20 + 30 = 50 min -> Salida 05:40 -> targetSlot 05:30 (< 06:00)
elements['appTimeInput'].value = '06:30';
elements['selStayDestino'].value = '60';
ctx.calcSuggestedPickup();

const msgHtml1 = elements['suggestedPickupMsg'].innerHTML;
assert(msgHtml1.includes('background:#FEF2F2'), 'Tarjeta de alerta debe tener fondo rojo #FEF2F2');
assert(msgHtml1.includes('border:1.5px solid #EF4444'), 'Tarjeta de alerta debe tener borde rojo #EF4444');
assert(msgHtml1.includes('Horario no disponible en agenda estándar'), 'Título debe decir Horario no disponible en agenda estándar');
assert(msgHtml1.includes('Consultar Factibilidad Excepcional por WhatsApp'), 'Botón WhatsApp excepcional presente');
assert.strictEqual(elements['serviceTimelineBox'].style.display, 'none', 'Cronograma debe estar oculto (display: none)');
assert.strictEqual(elements['sumKmTimeSection'].style.display, 'none', 'Suma Total debe estar oculta (display: none)');
assert.strictEqual(elements['b_time'].value, '', 'b_time debe quedar vacío');
assert.strictEqual(elements['submitBtn'].disabled, true, 'submitBtn debe quedar inhabilitado');
console.log('   ✅ PASS: Salida < 06:00 hrs bloquea correctamente con tarjeta roja, oculta cronograma y suma total.');

console.log('\n2. Verificando Turno Mañana: Término cae en buffer de mediodía (12:01 a 13:59 hrs):');
// Cita a las 11:00 hrs -> anticipación 50 min -> Salida 10:10 -> targetSlot 10:00 hrs.
// Ruta ida 20 min + permanencia 90 min + retorno 20 min = 130 min.
// Hora Término = 10:00 + 130 min = 12:10 hrs (Buffer 12:01 a 13:59 hrs).
elements['appTimeInput'].value = '11:00';
elements['selStayDestino'].value = '90';
ctx.calcSuggestedPickup();

const msgHtml2 = elements['suggestedPickupMsg'].innerHTML;
assert(msgHtml2.includes('12:10 hrs'), 'Detalle dinámico debe indicar término exacto a las 12:10 hrs');
assert(msgHtml2.includes('ventana de cambio de turno/descanso de mediodía') || msgHtml2.includes('12:01 a 13:59 hrs'), 'Detalle dinámico debe indicar invasión de cambio de turno');
assert.strictEqual(elements['serviceTimelineBox'].style.display, 'none', 'Cronograma debe estar oculto');
assert.strictEqual(elements['sumKmTimeSection'].style.display, 'none', 'Suma Total debe estar oculta');
assert.strictEqual(elements['submitBtn'].disabled, true, 'submitBtn debe quedar inhabilitado');
console.log('   ✅ PASS: Término en buffer 12:25 hrs bloquea correctamente con detalle dinámico exacto.');

console.log('\n3. Verificando Turno Tarde: Término cae en buffer nocturno (20:01 a 21:59 hrs):');
// Cita a las 19:30 hrs -> anticipación 50 min -> Salida 18:40 -> targetSlot 18:30 hrs.
// Circuito: 20 ida + 90 permanencia + 20 retorno = 130 min.
// Hora Término = 18:30 + 130 min = 20:40 hrs (> 20:00 hrs, buffer nocturno).
elements['appTimeInput'].value = '19:30';
elements['selStayDestino'].value = '90';
ctx.calcSuggestedPickup();

const msgHtml3 = elements['suggestedPickupMsg'].innerHTML;
assert(msgHtml3.includes('20:40 hrs'), 'Detalle dinámico debe indicar término exacto a las 20:40 hrs');
assert(msgHtml3.includes('cierre operativo del Turno Tarde') || msgHtml3.includes('20:01 a 21:59 hrs'), 'Detalle dinámico debe indicar exceso de Turno Tarde');
assert.strictEqual(elements['serviceTimelineBox'].style.display, 'none', 'Cronograma debe estar oculto');
assert.strictEqual(elements['sumKmTimeSection'].style.display, 'none', 'Suma Total debe estar oculta');
assert.strictEqual(elements['submitBtn'].disabled, true, 'submitBtn debe quedar inhabilitado');
console.log('   ✅ PASS: Término en buffer nocturno 20:40 hrs bloquea y oculta timeline y suma total.');

console.log('\n4. Verificando Horario Válido: Servicio calza 100% dentro del bloque (Turno Mañana):');
// Cita a las 10:00 hrs -> Salida 09:10 -> targetSlot 09:00 hrs.
// Circuito: 20 ida + 60 permanencia + 20 retorno = 100 min.
// Hora Término = 09:00 + 100 min = 10:40 hrs (<= 12:00 hrs -> 100% Válido!).
elements['appTimeInput'].value = '10:00';
elements['selStayDestino'].value = '60';
ctx.calcSuggestedPickup();

const msgHtml4 = elements['suggestedPickupMsg'].innerHTML;
assert(!msgHtml4.includes('background:#FEF2F2'), 'Alerta roja NO debe estar presente');
assert(msgHtml4.includes('Hora de recogida programada:'), 'Tarjeta de confirmación verde debe estar presente');
assert(msgHtml4.includes('09:00 hrs'), 'Hora confirmada 09:00 hrs');
assert.strictEqual(elements['serviceTimelineBox'].style.display, 'block', 'Cronograma debe ser visible (display: block)');
assert.strictEqual(elements['sumKmTimeSection'].style.display, 'block', 'Suma Total debe ser visible (display: block)');
assert.strictEqual(elements['b_time'].value, '09:00', 'b_time debe fijarse en 09:00');
assert.strictEqual(elements['submitBtn'].disabled, false, 'submitBtn debe quedar habilitado');
console.log('   ✅ PASS: Horario válido restaura confirmación, cronograma sincronizado y suma total activa.');

console.log('\n5. Verificando Horario Válido: Servicio calza 100% dentro del bloque (Turno Tarde):');
// Cita a las 16:00 hrs -> Salida 15:10 -> targetSlot 15:00 hrs.
// Circuito: 20 ida + 60 permanencia + 20 retorno = 100 min.
// Hora Término = 15:00 + 100 min = 16:40 hrs (<= 20:00 hrs -> 100% Válido!).
elements['appTimeInput'].value = '16:00';
elements['selStayDestino'].value = '60';
ctx.calcSuggestedPickup();

const msgHtml5 = elements['suggestedPickupMsg'].innerHTML;
assert(!msgHtml5.includes('background:#FEF2F2'), 'Alerta roja NO debe estar presente');
assert(msgHtml5.includes('15:00 hrs'), 'Hora confirmada 15:00 hrs en Turno Tarde');
assert.strictEqual(elements['serviceTimelineBox'].style.display, 'block', 'Cronograma visible en Turno Tarde');
assert.strictEqual(elements['sumKmTimeSection'].style.display, 'block', 'Suma Total visible en Turno Tarde');
assert.strictEqual(elements['b_time'].value, '15:00', 'b_time fijado en 15:00');
assert.strictEqual(elements['submitBtn'].disabled, false, 'submitBtn habilitado');
console.log('   ✅ PASS: Turno Tarde válido sincroniza y muestra correctamente cronograma y suma total.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE VALIDACIÓN ESTRICTA Y BUFFERS PASARON AL 100%! 🚀');
