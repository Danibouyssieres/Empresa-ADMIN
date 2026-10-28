const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== TEST SUITE: Reestructuración de Modalidad de Servicio a Cabecera de Paso 1 ===\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8');

// 1. Verificación de ubicación en HTML estático
console.log('1. Verificando ubicación de Modalidad en Sección 1 y ausencia de duplicados:');
const secAgendaIdx = htmlContent.indexOf('id="secAgenda"');
const secModalidadIdx = htmlContent.indexOf('id="secModalidad"');
const bSvcTypeIdx = htmlContent.indexOf('id="b_svc_type"');
const calGridIdx = htmlContent.indexOf('id="calGrid"');
const blocksPanelIdx = htmlContent.indexOf('class="blocks-panel"');

assert(secAgendaIdx !== -1, 'secAgenda presente');
assert(secModalidadIdx !== -1, 'secModalidad presente');
assert(bSvcTypeIdx !== -1, 'b_svc_type presente');
assert(bSvcTypeIdx > secAgendaIdx && bSvcTypeIdx < secModalidadIdx, 'b_svc_type debe estar dentro de secAgenda');
assert(bSvcTypeIdx < calGridIdx, 'b_svc_type debe estar antes del Calendario (calGrid)');
assert(bSvcTypeIdx < blocksPanelIdx, 'b_svc_type debe estar antes de las tarjetas de turno (blocks-panel)');

// Verificar que b_svc_type no esté duplicado en secModalidad
const secondSvcTypeIdx = htmlContent.indexOf('id="b_svc_type"', bSvcTypeIdx + 1);
assert.strictEqual(secondSvcTypeIdx, -1, 'b_svc_type NO debe estar duplicado en el HTML');
console.log('   ✅ PASS: b_svc_type está en la cabecera del Paso 1 y no existe duplicado en Sección 2.');

// 2. Preparar entorno VM para verificar reactividad y cálculo
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

  // Elementos requeridos
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
    { value: '2', text: '2. Traslado Exclusivo con Espera', textContent: '2. Traslado Exclusivo con Espera' },
    { value: '3', text: '3. Cuidados a Domicilio', textContent: '3. Cuidados a Domicilio' },
    { value: '4', text: '4. Acompañamiento en Eventos Sociales', textContent: '4. Acompañamiento en Eventos Sociales' },
    { value: '5', text: '5. Programas Interregionales', textContent: '5. Programas Interregionales' }
  ];
  elements['b_svc_type'].value = '1';

  elements['selStayDestino'].options = [
    { value: '60', text: '1 hora', textContent: '1 hora' },
    { value: '90', text: '1 hora 30 min', textContent: '1 hora 30 min' },
    { value: '120', text: '2 horas', textContent: '2 horas' }
  ];
  elements['selStayDestino'].value = '60';

  elements['selHours34'].options = [
    { value: '2', text: '2 horas', textContent: '2 horas' },
    { value: '3', text: '3 horas', textContent: '3 horas' },
    { value: '4', text: '4 horas', textContent: '4 horas' }
  ];
  elements['selHours34'].value = '2';

  elements['selMins34'].options = [
    { value: '0', text: '+ 0 minutos', textContent: '+ 0 minutos' },
    { value: '30', text: '+ 30 minutos', textContent: '+ 30 minutos' }
  ];
  elements['selMins34'].value = '0';

  let alertMessages = [];

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
      documentElement: { setAttribute: () => {}, getAttribute: () => null }
    },
    $: (sel) => {
      if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
      return null;
    },
    $$: () => [],
    alert: (msg) => { alertMessages.push(msg); },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
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

  vm.createContext(sandbox);
  vm.runInContext(mainScript, sandbox);

  return {
    ctx: sandbox,
    elements,
    getAlerts: () => alertMessages,
    clearAlerts: () => { alertMessages = []; }
  };
}

const env = createMockEnv();
const { ctx, elements } = env;

// Fijar fecha válida
elements['b_date'].value = '2026-11-16'; // Lunes hábil

console.log('\n2. Verificando reactividad inmediata de tarjetas de Turno al cambiar Modalidad:');

// Modalidad 1
elements['b_svc_type'].value = '1';
ctx.onServiceTypeChange();
assert.strictEqual(elements['btnBlock_noche'].disabled, true, 'Turno Noche debe estar disabled en Modalidad 1');
assert.strictEqual(elements['btnBlock_noche'].style.pointerEvents, 'none', 'Turno Noche pointer-events: none en Modalidad 1');
assert(elements['reasonBlock_noche'].textContent.includes('No disponible para traslados vehiculares'), 'Aviso de bloqueo para traslados presente');
console.log('   ✅ PASS: Modalidad 1 bloquea Turno Noche con aviso de traslados vehiculares.');

// Modalidad 2
elements['b_svc_type'].value = '2';
ctx.onServiceTypeChange();
assert.strictEqual(elements['btnBlock_noche'].disabled, true, 'Turno Noche debe estar disabled en Modalidad 2');
assert.strictEqual(elements['btnBlock_noche'].style.pointerEvents, 'none', 'Turno Noche pointer-events: none en Modalidad 2');
console.log('   ✅ PASS: Modalidad 2 bloquea Turno Noche con aviso de traslados vehiculares.');

// Modalidad 3
elements['b_svc_type'].value = '3';
ctx.onServiceTypeChange();
assert.strictEqual(elements['btnBlock_noche'].disabled, false, 'Turno Noche debe estar habilitado en Modalidad 3');
assert.strictEqual(elements['btnBlock_noche'].style.pointerEvents, 'auto', 'Turno Noche pointer-events: auto en Modalidad 3');
assert(elements['badgeBlock_noche'].textContent.includes('Disponible'), 'Badge debe indicar Disponible en Modalidad 3');
console.log('   ✅ PASS: Modalidad 3 activa Turno Noche 100% disponible.');

// Modalidad 4
elements['b_svc_type'].value = '4';
ctx.onServiceTypeChange();
assert.strictEqual(elements['btnBlock_noche'].disabled, false, 'Turno Noche debe estar habilitado en Modalidad 4');
console.log('   ✅ PASS: Modalidad 4 activa Turno Noche 100% disponible.');

console.log('\n3. Verificando adaptación visual de Sección 2 según Modalidad activa:');

// Probar Modalidad 1
elements['b_svc_type'].value = '1';
ctx.onServiceTypeChange();
assert.strictEqual(elements['jornadaSelectorWrap'].style.display, 'block', 'Tarifas horarias visibles arriba en Sección 2');
assert.strictEqual(elements['mapColumn'].style.display, 'block', 'Mapa visible en Modalidad 1');
assert.strictEqual(elements['destWrap'].style.display, 'block', 'Destino visible en Modalidad 1');
assert.strictEqual(elements['asistenteBox'].style.display, 'block', 'Asistente de Salida visible en Modalidad 1');
assert.strictEqual(elements['homeTimeWrap'].style.display, 'none', 'Selector domiciliario oculto en Modalidad 1');
assert.strictEqual(elements['durationBox12'].style.display, 'block', 'Duración de estancia visible en Modalidad 1');
assert.strictEqual(elements['sumKmTimeSection'].style.display, 'block', 'Suma KM + Tiempo visible en Modalidad 1');
console.log('   ✅ PASS: Modalidad 1 adapta Sección 2 con mapa, destino, asistente de recogida y suma total.');

// Probar Modalidad 3 (Cuidados a Domicilio)
elements['b_svc_type'].value = '3';
ctx.onServiceTypeChange();
assert.strictEqual(elements['jornadaSelectorWrap'].style.display, 'block', 'Tarifas horarias visibles arriba en Sección 2');
assert.strictEqual(elements['mapColumn'].style.display, 'none', 'Mapa oculto en Modalidad 3');
assert.strictEqual(elements['destWrap'].style.display, 'none', 'Destino oculto en Modalidad 3');
assert.strictEqual(elements['routeLayoutBox'].classList.contains('no-map'), true, 'routeLayoutBox tiene clase no-map');
assert.strictEqual(elements['lblFromAddr'].innerHTML, 'Dirección del Domicilio / Lugar de Atención *', 'Etiqueta limpia de dirección sin pin A');
assert.strictEqual(elements['asistenteBox'].style.display, 'none', 'Asistente de Salida oculto en Modalidad 3');
assert.strictEqual(elements['homeTimeWrap'].style.display, 'block', 'Selector de inicio de atención visible en Modalidad 3');
assert(elements['lblPickupSelect'].textContent.includes('Hora de inicio de la atención'), 'Etiqueta solicita Hora de inicio de la atención');
assert(elements['lblHours34'].textContent.includes('Horas de cuidado continuo requeridas'), 'Etiqueta solicita Horas de cuidado continuo requeridas');
assert.strictEqual(elements['directTimeOnlySection'].style.display, 'block', 'Caja de total de tiempo directo visible en Modalidad 3');
assert.strictEqual(elements['sumKmTimeSection'].style.display, 'none', 'Suma KM oculta en Modalidad 3');
console.log('   ✅ PASS: Modalidad 3 adapta Sección 2 ocultando mapa/destino y solicitando campos de cuidado continuo.');

console.log('\n4. Verificando cálculo coherente de Suma Total y Abono 50%:');
// En Modalidad 3, 2 horas hábil: $24.000, abono 50%: $12.000
assert.strictEqual(elements['dirFinalTotal'].textContent, '$24.000', 'Total 2h hábil en Modalidad 3 debe ser $24.000');
assert.strictEqual(elements['dirAbono50'].textContent, '$12.000', 'Abono 50% debe ser $12.000');
console.log('   ✅ PASS: Modalidad 3 calcula inmediatamente Suma Total $24.000 y Abono $12.000.');

// Volver a Modalidad 1
elements['b_svc_type'].value = '1';
ctx.onServiceTypeChange();
// En Modalidad 1 con viaje predeterminado (ida 30m + abordaje 10m + destino 60m + retorno 30m = 130m -> 150m = 2.5h hábil: $30.000), abono: $15.000
assert.strictEqual(elements['sumFinalTotal'].textContent, '$30.000', 'Total 2.5h continuo hábil en Modalidad 1 debe ser $30.000');
assert.strictEqual(elements['sumAbono50'].textContent, '$15.000', 'Abono 50% debe ser $15.000');
console.log('   ✅ PASS: Retorno a Modalidad 1 recalcula instantáneamente Suma Total $30.000 y Abono $15.000.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE REESTRUCTURACIÓN DE MODALIDAD PASARON AL 100%! 🚀');
