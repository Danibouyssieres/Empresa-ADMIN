const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== TEST SUITE: Asignación Automática de Turnos y Tarjetas Compactas ===\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8');

// 1. COMPACTACIÓN DE TARJETAS EN PASO 1
console.log('1. Verificando compactación y títulos de tarjetas en Paso 1:');
assert(htmlContent.includes('🌅 Turno Mañana (06:00 a 12:00 hrs)'), 'Título de Turno Mañana presente');
assert(htmlContent.includes('🌇 Turno Tarde (14:00 a 20:00 hrs)'), 'Título de Turno Tarde presente');
assert(htmlContent.includes('🌙 Turno Noche (22:00 a 04:00 hrs)'), 'Título de Turno Noche presente');

// Verificar que se eliminaron todas las líneas de texto secundario
assert(!htmlContent.includes('Recogidas entre 06:00 y 12:00 hrs'), 'No debe existir línea de subtítulo en Mañana');
assert(!htmlContent.includes('Recogidas entre 08:00 y 13:00 hrs'), 'No debe existir texto secundario antiguo');
assert(!htmlContent.includes('Recogidas entre 14:00 y 20:00 hrs'), 'No debe existir línea de subtítulo en Tarde');
assert(!htmlContent.includes('subBlock_manana'), 'Elemento subBlock_manana debe estar eliminado');
assert(!htmlContent.includes('subBlock_tarde'), 'Elemento subBlock_tarde debe estar eliminado');
assert(!htmlContent.includes('subBlock_noche'), 'Elemento subBlock_noche debe estar eliminado');
console.log('   ✅ PASS: Tarjetas de turno compactadas, delgadas y sin líneas de subtítulo.');

// Preparar ambiente mock para probar lógica JS
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
  elements['b_svc_type'].options = [
    { value: '1', text: '1. Servicio Integral' },
    { value: '2', text: '2. Traslado Exclusivo' },
    { value: '3', text: '3. Cuidados a Domicilio' },
    { value: '4', text: '4. Acompañamiento en Eventos Sociales' },
    { value: '5', text: '5. Programas Interregionales' }
  ];
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

  const alerts = [];
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
    alert: (msg) => alerts.push(msg),
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
    console,
    setTimeout: () => {},
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  };
  sandbox.window = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(mainScript, ctx);

  return {
    ctx,
    elements,
    alerts,
    getVar: (v) => vm.runInContext(v, ctx),
    setVar: (name, val) => vm.runInContext(`${name} = ${JSON.stringify(val)}`, ctx)
  };
}

const env = createMockEnv();
const { ctx, elements, getVar, setVar } = env;

// Fijar fecha válida
elements['b_date'].value = '2026-11-15';
ctx.updateSlots(false);

// 2. ASIGNACIÓN AUTOMÁTICA SEGÚN HORA DE CITA
console.log('\n2. Asignación automática de Turno Mañana (06:00 a 12:00 hrs):');
elements['b_svc_type'].value = '1';
setVar('lastRouteIdaMin', 25);
elements['appTimeInput'].value = '10:00'; // Recogida = 10:00 - 60 min = 09:00 hrs
ctx.calcSuggestedPickup();

assert.strictEqual(getVar('selectedBlock'), 'manana', 'Debe asignar automáticamente turno manana');
assert.strictEqual(elements['b_time'].value, '09:00', 'Debe fijar hora oficial de recogida en 09:00');
assert(elements['btnBlock_manana'].classList.contains('active'), 'Tarjeta de Turno Mañana debe quedar activa (.active)');
assert.strictEqual(elements['submitBtn'].disabled, false, 'Botón submit debe quedar habilitado');
console.log('   ✅ PASS: Cita 10:00 asigna automáticamente Turno Mañana (09:00 hrs) y resalta tarjeta.');

console.log('\n3. Asignación automática de Turno Tarde (14:00 a 20:00 hrs):');
elements['appTimeInput'].value = '16:00'; // Recogida = 16:00 - 60 min = 15:00 hrs
ctx.calcSuggestedPickup();

assert.strictEqual(getVar('selectedBlock'), 'tarde', 'Debe asignar automáticamente turno tarde');
assert.strictEqual(elements['b_time'].value, '15:00', 'Debe fijar hora oficial de recogida en 15:00');
assert(elements['btnBlock_tarde'].classList.contains('active'), 'Tarjeta de Turno Tarde debe quedar activa (.active)');
assert.strictEqual(elements['submitBtn'].disabled, false, 'Botón submit debe quedar habilitado');
console.log('   ✅ PASS: Cita 16:00 asigna automáticamente Turno Tarde (15:00 hrs) y resalta tarjeta.');

// 4. VALIDACIÓN ESTRICTA DE HORARIOS FRONTERA (BLOQUEO DURO)
console.log('\n4. Validación dura: invasión de mediodía en turno mañana:');
elements['appTimeInput'].value = '12:45'; // Salida 11:45 -> slot 11:30. Duración estándar 3h -> finaliza 14:30 > 12:00
ctx.calcSuggestedPickup();
const msgHtml = elements['suggestedPickupMsg'].innerHTML;
assert(msgHtml.includes('Horario Especial de Mediodía Requerido'), 'Debe desplegar aviso de horario especial de mediodía');
assert.strictEqual(elements['b_time'].value, '', 'b_time debe quedar vacío al haber bloqueo');
assert.strictEqual(elements['submitBtn'].disabled, true, 'submitBtn debe quedar inhabilitado');
console.log('   ✅ PASS: Invasión de mediodía bloquea el agendamiento y solicita WhatsApp.');

console.log('\n5. Validación dura: exceso de cierre de Turno Tarde (> 20:00 hrs):');
elements['appTimeInput'].value = '20:00'; // Salida 19:00. Duración 3h -> finaliza 22:00 > 20:00
ctx.calcSuggestedPickup();
const msgTardeHtml = elements['suggestedPickupMsg'].innerHTML;
assert(msgTardeHtml.includes('Límite del Turno Tarde Excedido') || msgTardeHtml.includes('cierre operativo del Turno Tarde'), 'Debe bloquear por exceso de cierre de turno tarde');
assert.strictEqual(elements['b_time'].value, '', 'b_time debe quedar vacío');
assert.strictEqual(elements['submitBtn'].disabled, true, 'submitBtn debe quedar inhabilitado');
console.log('   ✅ PASS: Exceso de cierre de Turno Tarde bloquea correctamente.');

console.log('\n6. Validación de cupo agotado en fecha seleccionada:');
// Simular fecha con cupo agotado en mañana
const testDate = '2026-11-20';
elements['b_date'].value = testDate;
const currentD = getVar('D');
currentD.blocks = currentD.blocks || [];
currentD.blocks.push({
  date: testDate,
  type: 'manana'
});

elements['appTimeInput'].value = '10:00'; // Recogida 09:00 en manana
ctx.calcSuggestedPickup();

const msgFullHtml = elements['suggestedPickupMsg'].innerHTML;
assert(msgFullHtml.includes('El cupo para el turno') && msgFullHtml.includes('ya se encuentra reservado'), 'Debe mostrar alerta clara de turno reservado');
assert.strictEqual(elements['b_time'].value, '', 'b_time debe quedar vacío');
assert.strictEqual(elements['submitBtn'].disabled, true, 'submitBtn debe quedar inhabilitado');
console.log('   ✅ PASS: Turno agotado despliega advertencia clara y bloquea confirmación.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE ASIGNACIÓN AUTOMÁTICA PASARON AL 100%!');
