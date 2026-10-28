const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

console.log('=== TEST SUITE: Bugfix Reset Dinámico Horario Especial de Mediodía ===\n');

const env = createMockEnv();
const { ctx, elements, setVar, getVar } = env;

// Fijar fecha válida futura
elements['b_date'].value = '2026-11-15';
ctx.updateSlots(false);

// Configuración inicial de servicio con traslado
elements['b_svc_type'].value = '1';
setVar('lastRouteIdaMin', 15);
setVar('tripMultiplier', 2);

const appTimeInput = elements['appTimeInput'];
const selStayDestino = elements['selStayDestino'];
const subBtn = elements['submitBtn'];
const callout = elements['suggestedPickupCallout'];
const msg = elements['suggestedPickupMsg'];
const b_time = elements['b_time'];

// TEST 1: Cita a las 11:00 hrs con permanencia de 120 min (2h)
// Salida calculada = 11:00 - (15 min viaje + 10 min abordaje + 20 min admision) = 10:15 hrs.
// Duración total = 10 abordaje + 15 ida + 120 destino + 15 retorno = 160 min -> billed 180 min (3h).
// Término = 10:15 + 180 min = 13:15 hrs (> 12:00 hrs -> Invade mediodía).
console.log('1. Probando cita que invade mediodía (11:00 hrs + 2h permanencia):');
appTimeInput.value = '11:00';
selStayDestino.value = '120';

ctx.calcSuggestedPickup();

if (msg.innerHTML.includes('Horario Especial de Mediodía Requerido') && subBtn.disabled === true && b_time.value === '') {
  console.log('   ✅ PASS: Muestra tarjeta de "Horario Especial de Mediodía Requerido", deshabilita submitBtn y vacía b_time.');
} else {
  console.error('   ❌ FAIL: No activó correctamente la advertencia de mediodía.', {
    html: msg.innerHTML,
    subBtnDisabled: subBtn.disabled,
    b_time: b_time.value
  });
  process.exit(1);
}

// TEST 2: Usuario acorta la permanencia a 30 min a través de onStayDestinoChange()
// Duración total = 10 + 15 + 30 + 15 = 70 min -> billed 90 min (1h 30m).
// Término = 10:15 + 90 min = 11:45 hrs (<= 12:00 hrs -> Finaliza dentro del Turno Mañana).
console.log('\n2. Probando acortamiento de permanencia a través de onStayDestinoChange():');
selStayDestino.value = '30';

// onStayDestinoChange() debe ejecutar calcSuggestedPickup() automáticamente al detectar lastRouteIdaMin > 0
ctx.onStayDestinoChange();

if (!msg.innerHTML.includes('Horario Especial de Mediodía Requerido') &&
    msg.innerHTML.includes('Hora de recogida programada: <span style="font-size:1.06rem;font-weight:800;color:var(--ink)">10:15 hrs</span>') &&
    msg.innerHTML.includes('Turno Mañana (06:00 a 12:00 hrs)') &&
    subBtn.disabled === false &&
    b_time.value === '10:15') {
  console.log('   ✅ PASS: Tarjeta de mediodía desapareció por completo al acortar la duración.');
  console.log('   ✅ PASS: Se restauró la tarjeta de confirmación normal con salida fijada a las 10:15 hrs.');
  console.log('   ✅ PASS: submitBtn se habilitó automáticamente (disabled = false).');
  console.log('   ✅ PASS: b_time fijado correctamente en 10:15.');
} else {
  console.error('   ❌ FAIL: La tarjeta de mediodía no se ocultó o no restauró la confirmación normal.', {
    html: msg.innerHTML,
    subBtnDisabled: subBtn.disabled,
    b_time: b_time.value
  });
  process.exit(1);
}

// TEST 3: Cita que termina holgadamente antes de las 12:00 hrs (Cita a las 09:45 hrs con 60 min permanencia)
// Salida calculada = 09:45 - 45 min = 09:00 hrs.
// Duración total = 10 + 15 + 60 + 15 = 100 min -> billed 120 min (2h).
// Término = 09:00 + 120 min = 11:00 hrs (<= 12:00 hrs).
console.log('\n3. Probando cita matutina limpia (Cita 09:45 hrs, término 11:00 hrs):');
appTimeInput.value = '09:45';
selStayDestino.value = '60';

ctx.calcSuggestedPickup();

if (!msg.innerHTML.includes('Horario Especial de Mediodía Requerido') &&
    msg.innerHTML.includes('Hora de recogida programada: <span style="font-size:1.06rem;font-weight:800;color:var(--ink)">09:00 hrs</span>') &&
    msg.innerHTML.includes('Llegada estimada al recinto: <b>09:25 hrs</b> (20 min antes del box)') &&
    msg.innerHTML.includes('Turno Mañana (06:00 a 12:00 hrs)') &&
    subBtn.disabled === false &&
    b_time.value === '09:00') {
  console.log('   ✅ PASS: Renderiza directamente la confirmación normal y habilita la reserva sin mostrar alerta de mediodía.');
} else {
  console.error('   ❌ FAIL: Error en cálculo de cita matutina limpia.', {
    html: msg.innerHTML,
    subBtnDisabled: subBtn.disabled,
    b_time: b_time.value
  });
  process.exit(1);
}

// TEST 4: Verificación del reset de estado obligatorio al recalcular
console.log('\n4. Verificando que callout, msg y submitBlockAlert se reseteen al inicio de calcSuggestedPickup:');
callout.style.display = 'block';
msg.innerHTML = '<div id="staleAlert">Old alert that must be wiped</div>';
elements['submitBlockAlert'].style.display = 'block';

// Simular ruta en cero
setVar('lastRouteIdaMin', 0);
ctx.calcSuggestedPickup();

if (!msg.innerHTML.includes('Old alert that must be wiped') &&
    msg.innerHTML.includes('Calcule la ruta primero') &&
    elements['submitBlockAlert'].style.display === 'none') {
  console.log('   ✅ PASS: Textos y alertas previas reseteados con éxito al inicio de calcSuggestedPickup.');
} else {
  console.error('   ❌ FAIL: Estado previo no se limpió correctamente.');
  process.exit(1);
}

console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL RESET DINÁMICO DE MEDIODÍA PASARON AL 100%! 🚀');
