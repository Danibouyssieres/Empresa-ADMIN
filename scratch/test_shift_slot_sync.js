const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8');

// Extraer el bloque de script principal
const scriptMatches = htmlContent.match(/<script>([\s\S]*?)<\/script>/gi);
const mainScript = scriptMatches[scriptMatches.length - 1]
  .replace(/^<script>/i, '')
  .replace(/<\/script>$/i, '');

// Crear un DOM mock para ejecutar en Node vm
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

    // Proxy para innerHTML que actualiza options cuando es select
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

  // Elementos conocidos
  makeEl('b_date', 'input');
  makeEl('b_time', 'select');
  makeEl('b_tens', 'select');
  makeEl('b_svc_type', 'select');
  makeEl('b_mob', 'select');
  makeEl('b_pat', 'input');
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
  makeEl('appTimeInput', 'select');
  makeEl('btnBlock_manana', 'button');
  makeEl('btnBlock_tarde', 'button');
  makeEl('btnBlock_noche', 'button');
  makeEl('badgeBlock_manana', 'span');
  makeEl('badgeBlock_tarde', 'span');
  makeEl('badgeBlock_noche', 'span');
  makeEl('subBlock_manana', 'div');
  makeEl('subBlock_tarde', 'div');
  makeEl('subBlock_noche', 'div');
  makeEl('reasonBlock_manana', 'div');
  makeEl('reasonBlock_tarde', 'div');
  makeEl('reasonBlock_noche', 'div');
  makeEl('lblCapBadge', 'span');
  makeEl('lblSelectedDateHuman', 'strong');
  makeEl('availStatus', 'div');
  makeEl('submitBtn', 'button');
  makeEl('nightRuleNotice', 'div');
  makeEl('lblEstimatedWindow', 'div');
  makeEl('submitBlockAlert', 'div');
  makeEl('interregionalBlockWarn', 'div');
  makeEl('suggestedPickupCallout', 'div');
  makeEl('suggestedPickupMsg', 'div');
  makeEl('btnApplySuggestedPickup', 'button');
  makeEl('calMonthLabel', 'span');
  makeEl('calPrevBtn', 'button');
  makeEl('calNextBtn', 'button');
  makeEl('calGrid', 'div');

  // Inicializar opciones de b_svc_type
  const svType = elements['b_svc_type'];
  svType.options = [
    { value: '1', disabled: false, text: '1. Servicio Integral' },
    { value: '2', disabled: false, text: '2. Traslado Exclusivo' },
    { value: '3', disabled: false, text: '3. Cuidados a Domicilio' },
    { value: '4', disabled: false, text: '4. Acompañamiento a Eventos Sociales' },
    { value: '5', disabled: false, text: '5. Programas Interregionales' }
  ];
  svType.value = '1';

  let alertMessages = [];

  const mockWindow = {
    document: {
      addEventListener: () => {},
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
        return null;
      },
      querySelectorAll: (sel) => [],
      documentElement: { setAttribute: () => {} }
    },
    localStorage: {
      store: {},
      getItem(k) { return this.store[k] || null; },
      setItem(k, v) { this.store[k] = v; },
      removeItem(k) { delete this.store[k]; }
    },
    alert: (msg) => { alertMessages.push(msg); },
    L: {
      map: () => {
        const m = { setView: () => m, on: () => m, invalidateSize: () => m };
        return m;
      },
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => {}, bindPopup: () => {} }),
      polyline: () => ({ addTo: () => {} }),
      icon: () => ({}),
      divIcon: () => ({})
    },
    addEventListener: () => {},
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Number: Number,
    Boolean: Boolean,
    String: String,
    Array: Array
  };

  mockWindow.window = mockWindow;
  mockWindow.$ = mockWindow.document.querySelector;
  mockWindow.$$ = mockWindow.document.querySelectorAll;

  const ctx = vm.createContext(mockWindow);
  vm.runInContext(mainScript, ctx);

  return { ctx, elements, getAlerts: () => alertMessages, clearAlerts: () => { alertMessages = []; } };
}

console.log('=== TEST SUITE: Sincronización Paso 1 y Paso 2 ===\n');

const env = createMockEnv();
const { ctx, elements, getAlerts, clearAlerts } = env;

// Helper para obtener y setear variables internas
const getVar = (name) => vm.runInContext(name, ctx);
const setVar = (name, val) => vm.runInContext(`${name} = ${JSON.stringify(val)}`, ctx);

elements['b_date'].value = '2026-11-15';

// 1. Verificar estado inicial: sin turno seleccionado
console.log('1. Verificando estado inicial (sin turno seleccionado):');
ctx.updateSlots();
const bTime = elements['b_time'];
console.log('   - selectedBlock inicial:', getVar('selectedBlock'));
console.log('   - b_time disabled:', bTime.disabled);
console.log('   - b_time innerHTML:', bTime.innerHTML);
if (getVar('selectedBlock') === null && bTime.disabled && bTime.innerHTML.includes('Primero seleccione un turno arriba')) {
  console.log('   ✅ PASS: Selector deshabilitado con texto "Primero seleccione un turno arriba".');
} else {
  console.error('   ❌ FAIL: Selector inicial incorrecto.');
  process.exit(1);
}

// 2. Seleccionar Turno Mañana
console.log('\n2. Seleccionando "Turno Mañana":');
ctx.selectShiftBlock('manana');
console.log('   - selectedBlock tras clic:', getVar('selectedBlock'));
console.log('   - b_time disabled:', bTime.disabled);
console.log('   - b_time value:', bTime.value);
const morningOptions = bTime.options.filter(o => o.value);
console.log('   - Opciones cargadas (' + morningOptions.length + '):', morningOptions.map(o => o.value).join(', '));
const firstM = morningOptions[0] ? morningOptions[0].value : null;
const lastM = morningOptions[morningOptions.length - 1] ? morningOptions[morningOptions.length - 1].value : null;
const morningValid = firstM === '06:00' && lastM <= '12:00';
if (morningValid && bTime.value === '') {
  console.log(`   ✅ PASS: Opciones de Mañana inician en 06:00 y finalizan a lo más a las 12:00 hrs (última opción cargada: ${lastM}) con value inicial vacío.`);
} else {
  console.error('   ❌ FAIL: Opciones de mañana no coinciden.');
  process.exit(1);
}

// Seleccionar hora 08:30
bTime.value = '08:30';
ctx.onPickupTimeChange();
console.log('   - Usuario selecciona 08:30 -> b_time.value:', bTime.value);

// 3. Cambiar a Turno Tarde: debe resetear y cargar solo horas de la tarde
console.log('\n3. Cambiando a "Turno Tarde" (verificar reseteo y filtrado):');
ctx.selectShiftBlock('tarde');
console.log('   - selectedBlock tras cambio:', getVar('selectedBlock'));
console.log('   - b_time value tras cambio:', bTime.value);
const tardeOptions = bTime.options.filter(o => o.value);
console.log('   - Opciones cargadas (' + tardeOptions.length + '):', tardeOptions.map(o => o.value).join(', '));
const firstT = tardeOptions[0] ? tardeOptions[0].value : null;
const lastT = tardeOptions[tardeOptions.length - 1] ? tardeOptions[tardeOptions.length - 1].value : null;
const tardeValid = firstT === '14:00' && lastT <= '20:00';
if (tardeValid && bTime.value === '') {
  console.log(`   ✅ PASS: Hora previa eliminada (reset a vacío) y cargadas opciones desde 14:00 hasta máximo 20:00 (última: ${lastT}).`);
} else {
  console.error('   ❌ FAIL: Reseteo o filtrado de turno tarde incorrecto.');
  process.exit(1);
}

// 4. Probar Turno Noche (en Modalidad 3 o 4)
console.log('\n4. Seleccionando "Turno Noche" en Modalidad 4:');
elements['b_svc_type'].value = '4';
ctx.selectShiftBlock('noche');
console.log('   - selectedBlock tras cambio:', getVar('selectedBlock'));
const nocheOptions = bTime.options.filter(o => o.value);
console.log('   - Opciones cargadas (' + nocheOptions.length + '):', nocheOptions.map(o => o.value).join(', '));
const firstN = nocheOptions[0] ? nocheOptions[0].value : null;
const lastN = nocheOptions[nocheOptions.length - 1] ? nocheOptions[nocheOptions.length - 1].value : null;
const nocheValid = firstN === '22:00' && lastN <= '04:00';
if (nocheValid && bTime.value === '') {
  console.log(`   ✅ PASS: Turno Noche carga horas desde 22:00 hasta cierre (última: ${lastN}).`);
} else {
  console.error('   ❌ FAIL: Opciones de turno noche incorrectas.');
  process.exit(1);
}

// 5. Asignación 100% automática del turno según la hora del servicio
console.log('\n5. Validando Asignación 100% Automática del Turno según horario de servicio:');
elements['b_svc_type'].value = '1';
setVar('lastRouteIdaMin', 35); // Ruta calculada
elements['appTimeInput'].value = '10:00'; // Cita a las 10:00 AM (Recogida calculada 08:30 hrs -> Turno Mañana)
ctx.calcSuggestedPickup();
console.log('   - Hora sugerida calculada:', getVar('currentSuggestedHour'), 'en bloque asignado:', getVar('selectedBlock'));
console.log('   - b_time.value tras cálculo automático:', bTime.value);

if (getVar('selectedBlock') === 'manana' && bTime.value === '08:30') {
  console.log('   ✅ PASS: Turno Mañana asignado 100% automáticamente y hora oficial fijada en 08:30 hrs.');
} else {
  console.error('   ❌ FAIL: No se asignó automáticamente el Turno Mañana.');
  process.exit(1);
}

// 6. Asignación automática a Turno Tarde
console.log('\n6. Validando Asignación Automática a Turno Tarde:');
elements['appTimeInput'].value = '16:30'; // Cita a las 16:30 hrs (Recogida calculada 15:00 hrs -> Turno Tarde)
ctx.calcSuggestedPickup();
console.log('   - Hora sugerida calculada:', getVar('currentSuggestedHour'), 'en bloque asignado:', getVar('selectedBlock'));
console.log('   - b_time.value tras cálculo de tarde:', bTime.value);

if (getVar('selectedBlock') === 'tarde' && bTime.value === '15:00') {
  console.log('   ✅ PASS: Turno Tarde asignado 100% automáticamente y hora oficial fijada en 15:00 hrs.');
} else {
  console.error('   ❌ FAIL: No se asignó automáticamente el Turno Tarde.');
  process.exit(1);
}

// 7. Modalidad 5 (Interregional): debe mantener salida temprana 05:00 a 09:00
console.log('\n7. Verificando Modalidad 5 (Programas Interregionales):');
elements['b_svc_type'].value = '5';
ctx.onServiceTypeChange();
const interOptions = bTime.options.filter(o => o.value);
console.log('   - Opciones cargadas en Mod 5 (' + interOptions.length + '):', interOptions.map(o => o.value).join(', '));
if (interOptions[0].value === '05:00' && interOptions[interOptions.length - 1].value === '09:00') {
  console.log('   ✅ PASS: Modalidad 5 mantiene rango 05:00 a 09:00 hrs.');
} else {
  console.error('   ❌ FAIL: Modalidad 5 no cargó el rango interregional esperado.');
  process.exit(1);
}

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE SINCRONIZACIÓN PASARON EXITOSAMENTE!');
