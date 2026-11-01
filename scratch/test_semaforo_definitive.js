const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('Testing Semáforo de Validación de Jornada in reservar.html...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Mock DOM environment to execute reservar.html
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
      style: {
        setProperty: function(prop, val) { this[prop] = val; },
        removeProperty: function(prop) { delete this[prop]; }
      },
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
    'b_obs', 'b_terms', 'b_app_time', 'appTimeInput', 'hora-cita-medica', 'selStayDestino', 'duracion-atencion',
    'btnBlock_manana', 'btnBlock_tarde', 'btnBlock_noche',
    'badgeBlock_manana', 'badgeBlock_tarde', 'badgeBlock_noche',
    'reasonBlock_manana', 'reasonBlock_tarde', 'reasonBlock_noche',
    'lblCapBadge', 'lblSelectedDateHuman', 'availStatus',
    'nightRuleNotice', 'lblEstimatedWindow', 'submitBlockAlert',
    'submitBtn', 'suggestedPickupCallout', 'suggestedPickupMsg',
    'pickupScheduleGrid', 'colAsistentePickup', 'colDurationService',
    'timeSectionTitle', 'timeSectionSub', 'timeSectionBadge', 'lblStayDestino',
    'serviceTimelineBox', 'tlBadge', 'tlHoraRecogida', 'tlHoraRecogidaLabel',
    'tlHoraLlegadaDestino', 'tlHoraLlegadaDestinoLabel', 'tlTiempoDestino',
    'tlTiempoDestinoLabel', 'tlHoraRetorno', 'tlHoraRetornoLabel',
    'tlHorasEfectivas', 'tlHorasEfectivasLabel', 'tlDesgloseDetalle',
    'selHours34', 'selMins34', 'dirFinalTotal', 'dirAbono50', 'b_calc_total', 'b_calc_abono',
    'sumFinalTotal', 'sumAbono50', 'section3Card', 'section4Card'
  ].forEach(id => makeEl(id, id.startsWith('b_time') || id.startsWith('appTime') || id.startsWith('selStay') || id.startsWith('b_svc') || id.startsWith('selHours') || id.startsWith('selMins') ? 'select' : 'div'));

  const sandbox = {
    console,
    Math,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    window: {},
    document: {
      documentElement: { setAttribute: () => {} },
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === 'main > form > section.card') return [makeEl('sec1'), makeEl('sec2'), elements['section3Card'], elements['section4Card']];
        return [];
      },
      createElement: (tag) => makeEl('temp_' + Math.random(), tag),
      head: { appendChild: () => {} },
      body: { appendChild: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    navigator: { userAgent: 'node' },
    setTimeout: (fn) => { fn(); },
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
    scrollTo: () => {}
  };

  sandbox.window = sandbox;

  const scriptMatches = [...content.matchAll(/<script(?![^>]*src=)(?:[^>]*)>([\s\S]*?)<\/script>/gi)];
  const inlineScript = scriptMatches.map(m => m[1]).join('\n');

  const ctx = vm.createContext(sandbox);
  vm.runInContext(inlineScript, ctx);

  return { ctx, elements };
}

const { ctx, elements } = createMockEnv();

// --- SUITE 1: Función Maestra evaluarSemaforoTurno ---
console.log('Testing evaluarSemaforoTurno function logic...');

// Turno Mañana (Nominal: 12:00 = 720 min, Tolerancia: 12:30 = 750 min)
let res = ctx.evaluarSemaforoTurno(700, 'manana'); // 11:40
assert.strictEqual(res.state, 'green', '11:40 in Mañana must be green');

res = ctx.evaluarSemaforoTurno(720, 'manana'); // 12:00 exacto
assert.strictEqual(res.state, 'green', '12:00 in Mañana must be green');

res = ctx.evaluarSemaforoTurno(721, 'manana'); // 12:01
assert.strictEqual(res.state, 'yellow', '12:01 in Mañana must be yellow');

res = ctx.evaluarSemaforoTurno(750, 'manana'); // 12:30 exacto
assert.strictEqual(res.state, 'yellow', '12:30 in Mañana must be yellow');

res = ctx.evaluarSemaforoTurno(751, 'manana'); // 12:31
assert.strictEqual(res.state, 'red', '12:31 in Mañana must be red');

res = ctx.evaluarSemaforoTurno(800, 'manana'); // 13:20
assert.strictEqual(res.state, 'red', '13:20 in Mañana must be red');

// Turno Tarde (Nominal: 20:00 = 1200 min, Tolerancia: 20:30 = 1230 min)
res = ctx.evaluarSemaforoTurno(1180, 'tarde'); // 19:40
assert.strictEqual(res.state, 'green', '19:40 in Tarde must be green');

res = ctx.evaluarSemaforoTurno(1200, 'tarde'); // 20:00 exacto
assert.strictEqual(res.state, 'green', '20:00 in Tarde must be green');

res = ctx.evaluarSemaforoTurno(1205, 'tarde'); // 20:05
assert.strictEqual(res.state, 'yellow', '20:05 in Tarde must be yellow');

res = ctx.evaluarSemaforoTurno(1230, 'tarde'); // 20:30 exacto
assert.strictEqual(res.state, 'yellow', '20:30 in Tarde must be yellow');

res = ctx.evaluarSemaforoTurno(1231, 'tarde'); // 20:31
assert.strictEqual(res.state, 'red', '20:31 in Tarde must be red');

// Turno Noche (Nominal: 04:00 = 1680 min / 240 min, Tolerancia: 04:30 = 1710 min / 270 min)
res = ctx.evaluarSemaforoTurno(1650, 'noche'); // 03:30 AM
assert.strictEqual(res.state, 'green', '03:30 AM in Noche must be green');

res = ctx.evaluarSemaforoTurno(1680, 'noche'); // 04:00 AM exacto
assert.strictEqual(res.state, 'green', '04:00 AM in Noche must be green');

res = ctx.evaluarSemaforoTurno(1695, 'noche'); // 04:15 AM
assert.strictEqual(res.state, 'yellow', '04:15 AM in Noche must be yellow');

res = ctx.evaluarSemaforoTurno(1710, 'noche'); // 04:30 AM exacto
assert.strictEqual(res.state, 'yellow', '04:30 AM in Noche must be yellow');

res = ctx.evaluarSemaforoTurno(1715, 'noche'); // 04:35 AM
assert.strictEqual(res.state, 'red', '04:35 AM in Noche must be red');

// Test with next-day modulo values (e.g. 04:15 is 255 min)
res = ctx.evaluarSemaforoTurno(255, 'noche'); // 04:15 AM
assert.strictEqual(res.state, 'yellow', '04:15 AM (as 255 min) in Noche must be yellow');

res = ctx.evaluarSemaforoTurno(280, 'noche'); // 04:40 AM
assert.strictEqual(res.state, 'red', '04:40 AM (as 280 min) in Noche must be red');

console.log('✔ SUITE 1 passed: evaluarSemaforoTurno mathematical boundaries validated.');

// --- SUITE 2: renderSemaforoCard Output & Text Compliance ---
console.log('Testing renderSemaforoCard textual and visual compliance...');

// Green: returns empty string
const greenHtml = ctx.renderSemaforoCard({ state: 'green', effEnd: 700 });
assert.strictEqual(greenHtml, '', 'Green state must return empty HTML (hidden)');

// Yellow: verifies amber background, border, title and verbatim text
const yellowHtml = ctx.renderSemaforoCard({ state: 'yellow', effEnd: 735 }); // 12:15
assert(yellowHtml.includes('background:#FFFBEB'), 'Yellow card must have #FFFBEB background');
assert(yellowHtml.includes('border:1.5px solid #F59E0B'), 'Yellow card must have #F59E0B border');
assert(yellowHtml.includes('Atención con Cierre al Límite del Turno') && yellowHtml.includes('⚠️'), 'Yellow card must have required title');
assert(yellowHtml.includes('El retorno estimado finaliza a las <b>12:15 hrs</b>, en el margen límite de nuestro turno. Puede continuar con su reserva con normalidad; sin embargo, considere que durante el servicio no será posible solicitar extensiones de tiempo en el lugar, con el propósito de resguardar los tiempos de traslado y la puntualidad de la atención siguiente.'), 'Yellow card must contain exact required text');

// Red: verifies red background, border, title, verbatim text and WhatsApp CTA
elements['b_from'].value = 'Av. Los Pajaritos 1450, Maipú';
elements['b_to'].value = 'Clínica Santa María, Providencia';
const redHtml = ctx.renderSemaforoCard({ state: 'red', effEnd: 765 }); // 12:45
assert(redHtml.includes('background:#FEF2F2'), 'Red card must have #FEF2F2 background');
assert(redHtml.includes('border:1.5px solid #EF4444'), 'Red card must have #EF4444 border');
assert(redHtml.includes('Horario fuera de rango operativo estándar') && redHtml.includes('🛑'), 'Red card must have required title');
assert(redHtml.includes('Con la duración seleccionada, el servicio finalizaría a las <b>12:45 hrs</b>, invadiendo el cambio de turno. Para evaluar factibilidad técnica personalizada, contáctenos directamente por WhatsApp.'), 'Red card must contain exact required text');
assert(redHtml.includes('href="https://wa.me/56929990095'), 'Red card must contain functional WhatsApp link');

console.log('✔ SUITE 2 passed: renderSemaforoCard styling and text compliance verified.');

// --- SUITE 3: Interactive calcSuggestedPickup Integration ---
console.log('Testing calcSuggestedPickup interactive integration...');

// Mock map route: 10 min ida
ctx.lastRouteIdaMin = 10;
ctx.tripMultiplier = 2; // ida y vuelta
const testDate = ctx.addDaysYMD(ctx.toYMD(new Date()), 6);
elements['b_date'].value = testDate;

// Scenario A: Estado Verde (Cita 10:30, permanencia 60 min)
// Anticipación: 10 min viaje + 10 min abordaje + 20 min admisión = 40 min -> Recogida: 09:45
// Duración completa: 09:45 (585) + 10 (abordaje) + 10 (ida) + 60 (stay) + 10 (retorno) = 11:15 (675 min) <= 12:00 -> Verde
elements['b_svc_type'].value = '1';
elements['selStayDestino'].value = '60';
elements['appTimeInput'].value = '10:30';
ctx.calcSuggestedPickup();

assert.strictEqual(elements['submitBtn'].disabled, false, 'Green state: submitBtn must be ENABLED');
assert(!elements['suggestedPickupMsg'].innerHTML.includes('shiftSemaforoCard'), 'Green state: semaforo card must NOT be present in message');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Hora de recogida programada: <span style="font-size:1.06rem;font-weight:800;color:var(--ink)">09:45 hrs</span>'), 'Green state: scheduled pickup 09:45 hrs');
assert.notStrictEqual(elements['section3Card'].style.display, 'none', 'Green state: Section 3 must be VISIBLE');
assert.notStrictEqual(elements['section4Card'].style.display, 'none', 'Green state: Section 4 must be VISIBLE');

// Scenario B: Estado Amarillo (Cita 11:30, permanencia 60 min)
// Recogida: 11:30 - 40 min = 10:45 (645 min)
// Duración completa: 10:45 (645) + 10 + 10 + 60 + 10 = 12:15 (735 min)
// 735 min > 720 min y <= 750 min (12:30) -> Amarillo
elements['appTimeInput'].value = '11:30';
ctx.calcSuggestedPickup();

assert.strictEqual(elements['submitBtn'].disabled, false, 'Yellow state: submitBtn must be ENABLED');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Atención con Cierre al Límite del Turno'), 'Yellow state: yellow semaforo card must be rendered');
assert(elements['suggestedPickupMsg'].innerHTML.includes('El retorno estimado finaliza a las <b>12:15 hrs</b>, en el margen límite de nuestro turno'), 'Yellow state: exact yellow notice present');
assert.notStrictEqual(elements['section3Card'].style.display, 'none', 'Yellow state: Section 3 must be VISIBLE');
assert.notStrictEqual(elements['section4Card'].style.display, 'none', 'Yellow state: Section 4 must be VISIBLE');

// Scenario C: Estado Rojo (Cita 12:00, permanencia 120 min)
// Recogida: 12:00 - 40 min = 11:15 (675 min)
// Duración completa: 11:15 (675) + 10 + 10 + 120 + 10 = 13:45 (825 min)
// 825 min > 750 min (12:30) -> Rojo
elements['b_from'].value = 'Av. Pajaritos 1450, Maipú';
elements['b_to'].value = 'Clínica Santa María, Providencia';
elements['appTimeInput'].value = '12:00';
elements['selStayDestino'].value = '120';
ctx.calcSuggestedPickup();

assert.strictEqual(elements['submitBtn'].disabled, true, 'Red state: submitBtn must be DISABLED');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Horario fuera de rango operativo estándar'), 'Red state: red semaforo card must be rendered');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Con la duración seleccionada, el servicio finalizaría a las <b>13:45 hrs</b>, invadiendo el cambio de turno'), 'Red state: exact red notice present');
assert(elements['suggestedPickupMsg'].innerHTML.includes('btnSemaforoWa'), 'Red state: WhatsApp button must be present');

// Section 3 and 4 must be HIDDEN in Red State
assert.strictEqual(elements['section3Card'].style.display, 'none', 'Red state: Section 3 must be HIDDEN');
assert.strictEqual(elements['section4Card'].style.display, 'none', 'Red state: Section 4 must be HIDDEN');

// Timeline and Totals must remain VISIBLE in Red State
assert.strictEqual(elements['serviceTimelineBox'].style.display, 'block', 'Red state: serviceTimelineBox must remain VISIBLE');

// Verify Enriched WhatsApp Message
const waMatch = elements['suggestedPickupMsg'].innerHTML.match(/href="https:\/\/wa\.me\/56929990095\?text=([^"]+)"/);
assert(waMatch, 'WhatsApp URL must be present in red card');
const decodedWa = decodeURIComponent(waMatch[1]);

assert(decodedWa.includes('Hola! Estuve cotizando en la web pero mi horario requerido finaliza fuera del bloque estándar:'), 'Greeting must match');
assert(decodedWa.includes('📋 *DETALLE DE MI COTIZACIÓN:*'), 'Header must match');
assert(decodedWa.includes('• *Servicio:* 1. Servicio Integral (Asistencia + Traslado)'), 'Service name must match');
assert(decodedWa.includes('• *Fecha y Turno:*'), 'Date and shift must match');
assert(decodedWa.includes('• *Trayecto:* Av. Pajaritos 1450, Maipú ➔ Clínica Santa María, Providencia'), 'Route must match');
assert(decodedWa.includes('• *Horario previsto:* Salida sugerida 11:15 hrs | Retorno estimado 13:45 hrs'), 'Suggested departure and return must match');
assert(decodedWa.includes('• *Tiempo total circuito:* 2 h 30 min (2 h de espera/atención)'), 'Total circuit time must match');
assert(decodedWa.includes('• *Valor cotizado:*'), 'Quoted price must match');
assert(decodedWa.includes('¿Tienen factibilidad operativa para coordinar este horario especial?'), 'Closing question must match');

console.log('✔ SUITE 3 passed: calcSuggestedPickup interactive integration, conditional visibility and enriched WhatsApp URL verified.');

// --- SUITE 4: Dynamic Reactivity on Address Change ---
console.log('Testing dynamic reactivity on address changes...');
elements['b_from'].value = 'Calle Nueva 123, La Florida';
ctx.refreshSemaforoWaLinkIfPresent();
// Note: In our mock, suggestedPickupMsg innerHTML was rendered earlier; testing getSemaforoRedWaText reactivity:
const refreshedWaText = ctx.getSemaforoRedWaText(ctx.window.currentSemaforo);
assert(refreshedWaText.includes('Calle Nueva 123, La Florida ➔ Clínica Santa María, Providencia'), 'Address change must dynamically update WhatsApp text');

console.log('✔ SUITE 4 passed: Address change reactivity verified.');

console.log('\nAll Semáforo de Validación de Jornada tests passed successfully! 🚀');
process.exit(0);
