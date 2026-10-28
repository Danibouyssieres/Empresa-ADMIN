const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== TEST SUITE: Asistente de Recogida Limpio, Redondeo a 15m y Sincronización con Cronograma ===\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8');

// 1. VERIFICACIÓN DE LIMPIEZA DE REDUNDANCIAS EN HTML
console.log('1. Verificando eliminación de descripciones redundantes en Sección 2:');
assert(htmlContent.includes('¿A qué hora está programada su cita médica o compromiso? *'), 'Debe incluir la etiqueta directa');
assert(htmlContent.includes('Calculamos su salida considerando tiempo de viaje, 10 min de abordaje TENS y 20 min de margen previo para admisión.'), 'Debe incluir el subtexto breve');
assert(!htmlContent.includes('¿Tienes una cita médica o compromiso programado? Ingresa la hora fijada en destino y calculamos automáticamente tu hora oficial de recogida considerando el tiempo de ruta vehicular'), 'Debe haber eliminado la descripción larga inicial');
assert(!htmlContent.includes('Desglose del cálculo preventivo:'), 'Debe haber eliminado por completo el bloque inferior de desglose con viñetas');
assert(!htmlContent.includes('Ajuste preventivo a bloque de agenda'), 'Debe haber eliminado las explicaciones repetidas de redondeo de agenda');
assert(!htmlContent.includes('id="maxDurationNotice"'), 'maxDurationNotice debe estar completamente eliminado');
assert(!htmlContent.includes('Garantía de acompañamiento y espera'), 'Texto de garantía de espera debe estar eliminado');
assert(!htmlContent.includes('Cálculo del Servicio Completo:'), 'Nota de bombilla eliminada de columna derecha');
assert(!htmlContent.includes('id="lblTimeSummaryDesc"'), 'lblTimeSummaryDesc eliminado de HTML');
assert(!htmlContent.includes('id="lblTimeSummaryVal"'), 'lblTimeSummaryVal eliminado de HTML');
assert(!htmlContent.includes('id="lblEstimatedWindow"'), 'lblEstimatedWindow eliminado de HTML');
assert(!htmlContent.includes('Término estimado:</b>'), 'Línea secundaria de reloj con término estimado eliminada');
console.log('   ✅ PASS: Redundancias, tarjeta de garantía, nota de bombilla y línea de reloj eliminadas.');

// Preparar ambiente mock para VM
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
      appendChild: (child) => {
        if (el.tagName === 'SELECT') {
          el.options.push({ value: child.value, text: child.text || child.textContent, disabled: !!child.disabled });
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
    { value: '3', text: '3. Cuidados Domicilio' },
    { value: '4', text: '4. Eventos' },
    { value: '5', text: '5. Interregional' }
  ];

  makeEl('appTimeInput', 'select');
  makeEl('selStayDestino', 'select');
  elements['selStayDestino'].value = '60';

  makeEl('selHours34', 'select');
  elements['selHours34'].value = '2';
  makeEl('selMins34', 'select');
  elements['selMins34'].value = '0';

  makeEl('suggestedPickupCallout', 'div');
  makeEl('suggestedPickupMsg', 'div');
  makeEl('btnApplySuggestedPickup', 'button');
  makeEl('submitBtn', 'button');
  makeEl('submitBlockAlert', 'div');
  makeEl('availStatus', 'div');
  makeEl('lblSelectedDateHuman', 'div');
  makeEl('lblCapBadge', 'div');
  makeEl('calGrid', 'div');
  makeEl('calMonthTitle', 'div');

  makeEl('btnBlock_manana', 'button');
  makeEl('badgeBlock_manana', 'span');
  makeEl('reasonBlock_manana', 'div');
  makeEl('btnBlock_tarde', 'button');
  makeEl('badgeBlock_tarde', 'span');
  makeEl('reasonBlock_tarde', 'div');
  makeEl('btnBlock_noche', 'button');
  makeEl('badgeBlock_noche', 'span');
  makeEl('reasonBlock_noche', 'div');

  makeEl('serviceTimelineBox', 'div');
  makeEl('tlHoraRecogida', 'b');
  makeEl('tlHoraLlegadaDestino', 'b');
  makeEl('tlTiempoDestino', 'b');
  makeEl('tlHoraRetornoLabel', 'small');
  makeEl('tlHoraRetorno', 'b');
  makeEl('tlHorasEfectivas', 'b');
  makeEl('tlDesgloseDetalle', 'div');

  const alerts = [];
  const sandbox = {
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

// 2. MATEMÁTICA Y REDONDEO NATURAL DE 15 MINUTOS (EJEMPLO DEL USUARIO: CITA 10:00, DESCUENTO DA 09:20 -> AJUSTE 09:15)
console.log('\n2. Verificando cálculo matemático directo a intervalos de 15 minutos:');
elements['b_svc_type'].value = '1';
// Si tiempo viaje ida = 10 min, abordaje = 10 min, margen admisión = 20 min -> total descuento = 40 min
// Cita 10:00 (600 min) - 40 min = 560 min (09:20 hrs)
// Intervalo de 15 min -> Math.floor(560 / 15) * 15 = 555 min -> 09:15 hrs!
setVar('lastRouteIdaMin', 10);
elements['appTimeInput'].value = '10:00';
ctx.calcSuggestedPickup();

assert.strictEqual(elements['b_time'].value, '09:15', 'Hora fijada debe ser 09:15 hrs y nunca restar 30 min arbitrariamente');
assert.strictEqual(getVar('selectedBlock'), 'manana', 'Debe asignarse Turno Mañana');
console.log('   ✅ PASS: Cita 10:00 hrs con descuento a 09:20 hrs ajusta limpiamente a 09:15 hrs.');

// 3. TARJETA COMPACTA DE RESULTADO SEGÚN FORMATO ESPECIFICADO
console.log('\n3. Verificando formato de la tarjeta compacta de resultado:');
const cardHtml = elements['suggestedPickupMsg'].innerHTML;
assert(cardHtml.includes('Hora de recogida programada:'), 'Debe incluir "Hora de recogida programada:"');
assert(cardHtml.includes('09:15 hrs'), 'Debe mostrar 09:15 hrs');
assert(cardHtml.includes('Llegada estimada al recinto:'), 'Debe incluir "Llegada estimada al recinto:"');
// Llegada = recogida 09:15 + 10 min abordaje + 10 min viaje = 09:35 hrs (25 min antes del box de las 10:00)
assert(cardHtml.includes('09:35 hrs'), 'Llegada al recinto calculada correctamente (09:35 hrs)');
assert(cardHtml.includes('25 min antes del box'), 'Margen antes del box exacto');
assert(cardHtml.includes('Bloque asignado:'), 'Debe incluir "Bloque asignado:"');
assert(cardHtml.includes('Turno Mañana (06:00 a 12:00 hrs)'), 'Debe identificar el Turno Mañana');
console.log('   ✅ PASS: Formato visual de tarjeta compacta coincide con el diseño solicitado.');

// Ahora probemos con viaje = 15 min para replicar exactamente los 20 min antes del box del ejemplo de la solicitud:
// Cita 10:00, viaje 15 min + 10 min + 20 min = 45 min -> salida 09:15 hrs -> llegada recinto 09:40 hrs (20 min antes del box)
setVar('lastRouteIdaMin', 15);
elements['appTimeInput'].value = '10:00';
ctx.calcSuggestedPickup();
const cardHtml2 = elements['suggestedPickupMsg'].innerHTML;
assert(cardHtml2.includes('Hora de recogida programada:'), 'Recogida programada presente');
assert(cardHtml2.includes('09:15 hrs'), 'Recogida exacta 09:15 hrs');
assert(cardHtml2.includes('Llegada estimada al recinto: <b>09:40 hrs</b> (20 min antes del box)'), 'Exacto formato: Llegada estimada al recinto: 09:40 hrs (20 min antes del box)');
console.log('   ✅ PASS: Caso idéntico a especificación (09:15 recogida, 09:40 llegada, 20 min antes del box).');

// 4. SINCRONIZACIÓN 1 A 1 CON EL CRONOGRAMA ESTIMADO DEL SERVICIO
console.log('\n4. Verificando sincronización 1 a 1 con el Cronograma inferior:');
// El cronograma debe mostrar:
// - Recogida: 09:15 hrs
// - Llegada al recinto: 09:40 hrs
// - Permanencia en destino: 1 hora (60 min)
// - Retorno al hogar: 09:40 + 60 min + 15 min retorno = 10:55 hrs
assert.strictEqual(elements['tlHoraRecogida'].textContent, '09:15 hrs', 'tlHoraRecogida debe ser exactamente 09:15 hrs');
assert.strictEqual(elements['tlHoraLlegadaDestino'].textContent, '09:40 hrs', 'tlHoraLlegadaDestino debe ser exactamente 09:40 hrs');
assert.strictEqual(elements['tlTiempoDestino'].textContent, '1 h', 'tlTiempoDestino debe ser 1 h');
assert.strictEqual(elements['tlHoraRetorno'].textContent, '10:55 hrs', 'tlHoraRetorno debe ser 10:55 hrs');
console.log('   ✅ PASS: Números del Cronograma coinciden 1 a 1 con el Asistente sin ninguna contradicción.');

// 5. SECUENCIA CRONOLÓGICA DE LA FÓRMULA DEL SERVICIO
console.log('\n5. Verificando secuencia cronológica de la fórmula del servicio:');
const desgloseText = elements['tlDesgloseDetalle'].innerHTML;
assert(desgloseText.includes('10 min abordaje TENS + 15 min viaje ida + 60 min en destino + 15 min viaje retorno = <b>100 min</b>'), 'Fórmula debe listar abordaje primero, luego viaje ida, luego destino y retorno');
console.log('   ✅ PASS: Secuencia cronológica verificada (abordaje -> viaje ida -> destino -> retorno).');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LIMPIEZA Y CÁLCULO DEL ASISTENTE PASARON AL 100%!\n');
