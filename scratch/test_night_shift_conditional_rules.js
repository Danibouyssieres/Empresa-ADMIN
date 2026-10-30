const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== TEST SUITE: Reglas Condicionales del Turno Noche por Modalidad ===\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../js/reservar.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../css/reservar.css'), 'utf8');

// 1. Verificación de estructura inicial en HTML
console.log('1. Verificando estado inicial en HTML:');
assert(htmlContent.includes('id="btnBlock_noche"'), 'btnBlock_noche presente');
assert(htmlContent.includes('id="badgeBlock_noche"'), 'badgeBlock_noche presente');
assert(htmlContent.includes('id="reasonBlock_noche"'), 'reasonBlock_noche presente');
assert(htmlContent.includes('No disponible para traslados vehiculares (habilitado solo para Cuidados a Domicilio y Eventos)'), 'Texto de bloqueo para traslados presente en HTML');
console.log('   ✅ PASS: HTML inicial configurado correctamente.');

// Preparar mock para probar lógica JS
const jsResPath = path.resolve(__dirname, '../js/reservar.js');
const mainScript = fs.existsSync(jsResPath) ? fs.readFileSync(jsResPath, 'utf8') : '';

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

  // Elementos conocidos
  makeEl('b_date', 'input');
  makeEl('b_time', 'select');
  makeEl('b_tens', 'input');
  makeEl('b_svc_type', 'select');
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
  makeEl('appTimeInput', 'select');
  makeEl('btnBlock_manana', 'button');
  makeEl('btnBlock_tarde', 'button');
  makeEl('btnBlock_noche', 'button');
  makeEl('badgeBlock_manana', 'span');
  makeEl('badgeBlock_tarde', 'span');
  makeEl('badgeBlock_noche', 'span');
  makeEl('reasonBlock_manana', 'div');
  makeEl('reasonBlock_tarde', 'div');
  makeEl('reasonBlock_noche', 'div');
  makeEl('lblSelectedDateHuman', 'strong');
  makeEl('lblCapBadge', 'span');
  makeEl('availStatus', 'div');
  makeEl('submitBtn', 'button');
  makeEl('nightRuleNotice', 'div');
  makeEl('lblEstimatedWindow', 'div');
  makeEl('submitBlockAlert', 'div');
  makeEl('interregionalBlockWarn', 'div');
  makeEl('calGrid', 'div');
  makeEl('routeLayoutBox', 'div');
  makeEl('mapColumn', 'div');
  makeEl('destWrap', 'div');
  makeEl('kmCalcControls', 'div');
  makeEl('lblFromAddr', 'label');
  makeEl('lblToAddr', 'label');
  makeEl('eventSubModeBox', 'div');
  makeEl('interregionalRegionBox', 'div');
  makeEl('jornadaSelectorWrap', 'div');
  makeEl('interProgSelectorWrap', 'div');
  makeEl('durationBox12', 'div');
  makeEl('durationBox34', 'div');
  makeEl('serviceTimelineBox', 'div');
  makeEl('timeSectionTitle', 'span');
  makeEl('timeSectionSub', 'p');
  makeEl('eventStartCol', 'div');
  makeEl('hours34Col', 'div');
  makeEl('mins34Col', 'div');
  makeEl('lblHours34', 'label');
  makeEl('sumKmTimeSection', 'div');
  makeEl('directTimeOnlySection', 'div');
  makeEl('asistenteBox', 'div');
  makeEl('homeTimeWrap', 'div');
  makeEl('lblPickupSelect', 'label');
  makeEl('maxDurationNotice', 'div');
  makeEl('lblRateHabil', 'span');
  makeEl('lblRateTarde', 'span');
  makeEl('lblRateNocturno', 'span');
  makeEl('selHours34', 'select');
  makeEl('selMins34', 'select');
  makeEl('selStayDestino', 'select');
  makeEl('selEventStart1', 'select');
  makeEl('lblStayDestino', 'label');
  makeEl('lblTimeSummaryDesc', 'span');
  makeEl('lblTimeSummaryVal', 'strong');
  makeEl('routeStatusMsg', 'div');
  makeEl('ringInfoBox', 'div');

  elements['b_svc_type'].options = [
    { value: '1', text: '1. Servicio Integral' },
    { value: '2', text: '2. Traslado Exclusivo con Espera' },
    { value: '3', text: '3. Cuidados a Domicilio' },
    { value: '4', text: '4. Eventos Sociales' },
    { value: '5', text: '5. Programas Interregionales' }
  ];
  elements['b_svc_type'].value = '1';

  let alerts = [];
  const mockWindow = {
    document: {
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
        return null;
      },
      querySelectorAll: (sel) => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      documentElement: { setAttribute: () => {}, getAttribute: () => null }
    },
    localStorage: {
      store: {},
      getItem(k) { return this.store[k] || null; },
      setItem(k, v) { this.store[k] = v; },
      removeItem(k) { delete this.store[k]; }
    },
    alert: (msg) => { alerts.push(msg); },
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
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    console: console
  };

  mockWindow.window = mockWindow;
  mockWindow.$ = mockWindow.document.querySelector;
  mockWindow.$$ = mockWindow.document.querySelectorAll;

  const ctx = vm.createContext(mockWindow);
  vm.runInContext(mainScript, ctx);

  const getVar = (name) => vm.runInContext(name, ctx);

  return { ctx, elements, getVar, getAlerts: () => alerts, clearAlerts: () => { alerts = []; } };
}

const env = createMockEnv();
const { ctx, elements, getVar, getAlerts, clearAlerts } = env;

// Fijar fecha válida
elements['b_date'].value = '2026-11-15';

// TEST 1: Modalidad 1 (Servicio Integral - Traslado)
console.log('\n2. Verificando Modalidad 1 (Traslado Integral):');
elements['b_svc_type'].value = '1';
ctx.onServiceTypeChange();

const btnN = elements['btnBlock_noche'];
const badgeN = elements['badgeBlock_noche'];
const reasonN = elements['reasonBlock_noche'];

assert(btnN.disabled === true, 'Turno Noche debe estar disabled en Modalidad 1');
assert(btnN.style.pointerEvents === 'none', 'Turno Noche debe tener pointer-events: none en Modalidad 1');
assert(badgeN.textContent === 'No disponible', 'Badge de Turno Noche debe decir "No disponible"');
assert(reasonN.textContent.includes('No disponible para traslados vehiculares'), 'Debe mostrar nota explicativa de bloqueo para traslados');

// Intentar hacer clic en Turno Noche en Modalidad 1
clearAlerts();
ctx.selectShiftBlock('noche');
assert(getVar('selectedBlock') !== 'noche', 'No debe permitir seleccionar Turno Noche en Modalidad 1');
assert(getAlerts().length > 0, 'Debe disparar alerta informativa al intentar hacer clic');
console.log('   ✅ PASS: Turno Noche bloqueado, no cliqueable y protegido en Modalidad 1.');

// TEST 2: Modalidad 2 (Traslado Exclusivo con Espera)
console.log('\n3. Verificando Modalidad 2 (Traslado Exclusivo con Espera):');
elements['b_svc_type'].value = '2';
ctx.onServiceTypeChange();

assert(btnN.disabled === true, 'Turno Noche debe estar disabled en Modalidad 2');
assert(btnN.style.pointerEvents === 'none', 'Turno Noche debe tener pointer-events: none en Modalidad 2');
assert(badgeN.textContent === 'No disponible', 'Badge debe decir "No disponible" en Modalidad 2');
console.log('   ✅ PASS: Turno Noche bloqueado y protegido en Modalidad 2.');

// TEST 3: Modalidad 3 (Cuidados a Domicilio)
console.log('\n4. Verificando Modalidad 3 (Cuidados a Domicilio):');
clearAlerts();
elements['b_svc_type'].value = '3';
ctx.onServiceTypeChange();

assert(btnN.disabled === false, 'Turno Noche debe estar habilitado en Modalidad 3');
assert(btnN.style.pointerEvents !== 'none', 'Turno Noche debe tener pointer-events activo en Modalidad 3');
assert(badgeN.textContent.includes('Disponible'), 'Badge debe decir Disponible en Modalidad 3');

// Seleccionar Turno Noche
ctx.selectShiftBlock('noche');
assert(getVar('selectedBlock') === 'noche', 'Debe permitir seleccionar Turno Noche en Modalidad 3');
assert(btnN.classList.contains('active'), 'Tarjeta de Turno Noche debe tener clase active');
console.log('   ✅ PASS: Turno Noche habilitado y seleccionable en Modalidad 3.');

// TEST 4: Modalidad 4 (Eventos Sociales)
console.log('\n5. Verificando Modalidad 4 (Eventos Sociales):');
elements['b_svc_type'].value = '4';
ctx.onServiceTypeChange();

assert(btnN.disabled === false, 'Turno Noche debe estar habilitado en Modalidad 4');
ctx.selectShiftBlock('noche');
assert(getVar('selectedBlock') === 'noche', 'Debe permitir seleccionar Turno Noche en Modalidad 4');
console.log('   ✅ PASS: Turno Noche habilitado y seleccionable en Modalidad 4.');

// TEST 5: Restablecimiento automático al cambiar de Modalidad 4 (con Turno Noche activo) a Modalidad 1
console.log('\n6. Verificando Restablecimiento Automático al cambiar a Modalidad 1 o 2:');
assert(getVar('selectedBlock') === 'noche', 'Precondición: Turno Noche estaba seleccionado');
elements['b_svc_type'].value = '1';
ctx.onServiceTypeChange();

assert(getVar('selectedBlock') === null, 'Turno Noche debe desmarcarse automáticamente (selectedBlock = null)');
assert(btnN.disabled === true, 'Turno Noche debe volver a estar disabled');
assert(elements['submitBlockAlert'].style.display === 'block', 'Debe desplegar alerta solicitando seleccionar Turno Mañana o Tarde');
assert(elements['submitBlockAlert'].innerHTML.includes('Turno Noche no disponible para traslados'), 'Mensaje explicativo presente en alerta');
console.log('   ✅ PASS: Restablecimiento automático verificado con éxito (desmarca noche y solicita mañana/tarde).');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE VALIDACIÓN CONDICIONAL DEL TURNO NOCHE PASARON AL 100%!');
