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
      readyState: 'complete',
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
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    L: {
      map: () => {
        const m = {
          setView: () => m,
          addLayer: () => m,
          removeLayer: () => m,
          fitBounds: () => m,
          invalidateSize: () => m,
          on: () => m
        };
        return m;
      },
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => {}, bindPopup: () => {} }),
      polyline: () => ({ addTo: () => {} }),
      geoJSON: () => ({ addTo: () => {}, getBounds: () => ({}) }),
      divIcon: () => ({})
    }
  };

  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  // Extract JS script from reservar.html
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let fullScript = '';
  while ((match = scriptRegex.exec(content)) !== null) {
    if (!match[0].includes('leaflet@1.9.4')) {
      fullScript += '\n' + match[1];
    }
  }

  if (!fullScript.trim() && fs.existsSync(path.join(__dirname, '..', 'js', 'reservar.js'))) {
    fullScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'reservar.js'), 'utf8');
  }
  vm.runInContext(fullScript, ctx);

  return { ctx, elements };
}

// --- SUITE 0: Markup & CSS Initial State Validation ---
console.log('Testing Suite 0: Markup and CSS initial hidden state...');
const cssPath = path.join(__dirname, '..', 'css', 'reservar.css');
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : content;
assert(content.includes('.hidden-step{display:none !important}') || cssContent.includes('.hidden-step{display:none !important}'), 'CSS must define .hidden-step with display: none !important');
assert(content.includes('id="section3Card" class="card hidden-step" style="display:none !important"'), 'section3Card markup must start with hidden-step and display:none !important');
assert(content.includes('id="section4Card" class="card hidden-step" style="display:none !important"'), 'section4Card markup must start with hidden-step and display:none !important');
console.log('✔ SUITE 0 passed: HTML & CSS markup defaults verified.');

// --- SUITE 1: Shifts Nominal Limits and 30-min Tolerance ---
console.log('Testing Suite 1: Shift nominal limits and 30-minute tolerance...');
const { ctx, elements } = createMockEnv();

// 1. Turno Mañana (Nominal: 12:00 / 720 min, Tolerancia: 12:30 / 750 min)
assert.strictEqual(ctx.evaluarSemaforoTurno(720, 'manana').state, 'green', 'Mañana at 12:00 must be GREEN');
assert.strictEqual(ctx.evaluarSemaforoTurno(721, 'manana').state, 'yellow', 'Mañana at 12:01 must be YELLOW');
assert.strictEqual(ctx.evaluarSemaforoTurno(750, 'manana').state, 'yellow', 'Mañana at 12:30 must be YELLOW');
assert.strictEqual(ctx.evaluarSemaforoTurno(751, 'manana').state, 'red', 'Mañana at 12:31 must be RED');

// 2. Turno Tarde (Nominal: 20:00 / 1200 min, Tolerancia: 20:30 / 1230 min)
assert.strictEqual(ctx.evaluarSemaforoTurno(1200, 'tarde').state, 'green', 'Tarde at 20:00 must be GREEN');
assert.strictEqual(ctx.evaluarSemaforoTurno(1201, 'tarde').state, 'yellow', 'Tarde at 20:01 must be YELLOW');
assert.strictEqual(ctx.evaluarSemaforoTurno(1230, 'tarde').state, 'yellow', 'Tarde at 20:30 must be YELLOW');
assert.strictEqual(ctx.evaluarSemaforoTurno(1231, 'tarde').state, 'red', 'Tarde at 20:31 must be RED');

// 3. Turno Noche (Nominal: 04:00 / 28*60 = 1680 min, Tolerancia: 04:30 / 1710 min)
// When midnight crosses: 04:00 am is represented as 240 or 1680 min
assert.strictEqual(ctx.evaluarSemaforoTurno(4 * 60, 'noche').state, 'green', 'Noche at 04:00 must be GREEN');
assert.strictEqual(ctx.evaluarSemaforoTurno(4 * 60 + 15, 'noche').state, 'yellow', 'Noche at 04:15 must be YELLOW');
assert.strictEqual(ctx.evaluarSemaforoTurno(4 * 60 + 30, 'noche').state, 'yellow', 'Noche at 04:30 must be YELLOW');
assert.strictEqual(ctx.evaluarSemaforoTurno(4 * 60 + 31, 'noche').state, 'red', 'Noche at 04:31 must be RED');

console.log('✔ SUITE 1 passed: All shift limits and tolerances verified.');

// --- SUITE 2: Visual Styling and Exact Texts of Semáforo Cards ---
console.log('Testing Suite 2: Visual styling and exact texts...');

// A) Green State: renderSemaforoCard returns empty string
assert.strictEqual(ctx.renderSemaforoCard({ state: 'green' }), '', 'Green card must return empty string');

// B) Yellow State: Amber background (#FFFBEB), border (#F59E0B), dark text (#92400E)
const yellowCard = ctx.renderSemaforoCard({ state: 'yellow', effEnd: 735 });
assert(yellowCard.includes('#FFFBEB') || yellowCard.includes('#fffbeb'), 'Yellow card must have amber background #FFFBEB');
assert(yellowCard.includes('#F59E0B') || yellowCard.includes('#f59e0b'), 'Yellow card must have amber border #F59E0B');
assert(yellowCard.includes('#92400E') || yellowCard.includes('#92400e'), 'Yellow card must have dark amber typography #92400E');
assert(yellowCard.includes('Atención con Cierre al Límite del Turno') && yellowCard.includes('⚠️'), 'Yellow card must have exact title');
assert(yellowCard.includes('El retorno estimado finaliza a las <b>12:15 hrs</b>, en el margen límite de nuestro turno. Puede continuar con su reserva con normalidad; sin embargo, considere que durante el servicio no será posible solicitar extensiones de tiempo en el lugar, con el propósito de resguardar los tiempos de traslado y la puntualidad de la atención siguiente.'), 'Yellow card must contain exact regulatory notice');

// C) Red State: Red background (#FEF2F2), border (#EF4444)
const redCard = ctx.renderSemaforoCard({ state: 'red', effEnd: 825 });
assert(redCard.includes('#FEF2F2') || redCard.includes('#fef2f2'), 'Red card must have red background #FEF2F2');
assert(redCard.includes('#EF4444') || redCard.includes('#ef4444'), 'Red card must have red border #EF4444');
assert(redCard.includes('Horario fuera de rango operativo estándar') && redCard.includes('🛑'), 'Red card must have exact title');
assert(redCard.includes('Con la duración seleccionada, el servicio finalizaría a las <b>13:45 hrs</b>, invadiendo el cambio de turno. Para evaluar factibilidad técnica personalizada, contáctenos directamente por WhatsApp.'), 'Red card must contain exact regulatory explanation');
assert(redCard.includes('btnSemaforoWa'), 'Red card must contain dedicated WhatsApp button');

console.log('✔ SUITE 2 passed: renderSemaforoCard styling and text compliance verified.');

// --- SUITE 3: Interactive calcSuggestedPickup Integration and Conditional Visibility ---
console.log('Testing Suite 3: Interactive calcSuggestedPickup integration and conditional visibility...');

// Check initial state before route calculation
assert.strictEqual(ctx.isCalculationComplete(), false, 'Before route/pricing calculation, isCalculationComplete must be false');
ctx.updateSectionsVisibility();
assert.strictEqual(elements['section3Card'].style.display, 'none', 'Before calculation complete: Section 3 must be HIDDEN');
assert.strictEqual(elements['section4Card'].style.display, 'none', 'Before calculation complete: Section 4 must be HIDDEN');

// Setup valid addresses and calculated route
elements['b_from'].value = 'Av. Pajaritos 1450, Maipú';
elements['b_to'].value = 'Clínica Santa María, Providencia';
vm.runInContext(`
  ptFrom = { lat: -33.50, lon: -70.75 };
  ptTo = { lat: -33.43, lon: -70.62 };
  lastTotalKm = 24.5;
  lastRouteIdaMin = 10;
  lastFinalTotal = 38000;
  lastAbono50 = 19000;
  tripMultiplier = 2;
`, ctx);

assert.strictEqual(ctx.isCalculationComplete(), true, 'With valid points and metrics, isCalculationComplete must be true');

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
assert.strictEqual(elements['section3Card'].style.display, 'block', 'Green state: Section 3 must be VISIBLE');
assert.strictEqual(elements['section4Card'].style.display, 'block', 'Green state: Section 4 must be VISIBLE');
assert(!elements['section3Card'].classList.contains('hidden-step'), 'Green state: Section 3 must not have hidden-step');
assert(!elements['section4Card'].classList.contains('hidden-step'), 'Green state: Section 4 must not have hidden-step');

// Scenario B: Estado Amarillo (Cita 11:30, permanencia 60 min)
// Recogida: 11:30 - 40 min = 10:45 (645 min)
// Duración completa: 10:45 (645) + 10 + 10 + 60 + 10 = 12:15 (735 min)
// 735 min > 720 min y <= 750 min (12:30) -> Amarillo
elements['appTimeInput'].value = '11:30';
ctx.calcSuggestedPickup();

assert.strictEqual(elements['submitBtn'].disabled, false, 'Yellow state: submitBtn must be ENABLED');
assert(elements['suggestedPickupMsg'].innerHTML.includes('Atención con Cierre al Límite del Turno'), 'Yellow state: yellow semaforo card must be rendered');
assert(elements['suggestedPickupMsg'].innerHTML.includes('El retorno estimado finaliza a las <b>12:15 hrs</b>, en el margen límite de nuestro turno'), 'Yellow state: exact yellow notice present');
assert.strictEqual(elements['section3Card'].style.display, 'block', 'Yellow state: Section 3 must be VISIBLE');
assert.strictEqual(elements['section4Card'].style.display, 'block', 'Yellow state: Section 4 must be VISIBLE');

// Scenario C: Estado Rojo (Cita 12:00, permanencia 120 min)
// Recogida: 12:00 - 40 min = 11:15 (675 min)
// Duración completa: 11:15 (675) + 10 + 10 + 120 + 10 = 13:45 (825 min)
// 825 min > 750 min (12:30) -> Rojo
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
assert(elements['section3Card'].classList.contains('hidden-step'), 'Red state: Section 3 must have hidden-step class');
assert(elements['section4Card'].classList.contains('hidden-step'), 'Red state: Section 4 must have hidden-step class');

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

// --- SUITE 4: Dynamic Reactivity on Address Change & Input Invalidation ---
console.log('Testing Suite 4: Dynamic reactivity on address changes and invalidation...');

// Return to Green State first
elements['appTimeInput'].value = '10:30';
elements['selStayDestino'].value = '60';
ctx.calcSuggestedPickup();
assert.strictEqual(elements['section3Card'].style.display, 'block', 'Returned to Green: Section 3 must be VISIBLE');

// When user changes address in b_from: onType('from') invalidates route and hides sections
elements['b_from'].value = 'Calle Nueva 123, La Florida';
ctx.onType('from');
assert.strictEqual(ctx.isCalculationComplete(), false, 'Address change invalidates route calculation');
assert.strictEqual(elements['section3Card'].style.display, 'none', 'Address change must immediately HIDE Section 3');
assert.strictEqual(elements['section4Card'].style.display, 'none', 'Address change must immediately HIDE Section 4');

// WhatsApp text reactivity test
ctx.refreshSemaforoWaLinkIfPresent();
const refreshedWaText = ctx.getSemaforoRedWaText(ctx.window.currentSemaforo);
assert(refreshedWaText.includes('Calle Nueva 123, La Florida ➔ Clínica Santa María, Providencia'), 'Address change must dynamically update WhatsApp text');

console.log('✔ SUITE 4 passed: Address change reactivity verified.');

console.log('\nAll Semáforo de Validación de Jornada & Section Visibility tests passed successfully! 🚀');
process.exit(0);
