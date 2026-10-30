const path = require('path');
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const html = fs.readFileSync('reservar.html', 'utf8') + '\n' + fs.readFileSync('js/reservar.js', 'utf8') + '\n' + fs.readFileSync('css/reservar.css', 'utf8');

console.log('=== TEST SUITE: Reactividad y Selección Automática de Tarifas (Sección 1 -> Sección 2) ===\n');

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
    'jornadaSelectorWrap', 'interProgSelectorWrap'
  ].forEach(id => makeEl(id));

  elements['b_svc_type'].value = '1';
  elements['selStayDestino'].value = '120'; // 2 horas (120 min)
  elements['b_date'].value = '2026-11-04'; // Miércoles hábil disponible

  const sandbox = {
    window: {
      scrollTo: () => {}
    },
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
    alert: (msg) => {},
    setTimeout: (fn) => fn(),
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
    scrollTo: () => {},
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

// TEST 1: Verificar existencia y exportación en window
console.log('1. Verificando función selectora window.actualizarTarifaSegunAgenda():');
assert.strictEqual(typeof ctx.actualizarTarifaSegunAgenda, 'function', 'actualizarTarifaSegunAgenda debe ser función');
assert.strictEqual(typeof ctx.window.actualizarTarifaSegunAgenda, 'function', 'window.actualizarTarifaSegunAgenda debe estar exportada');
console.log('   ✅ PASS: window.actualizarTarifaSegunAgenda está disponible globalmente.');

// TEST 2: Día Hábil (Miércoles 4 de Noviembre de 2026) en Modalidad 1
console.log('\n2. Evaluando Día Hábil (Miércoles 2026-11-04) en Modalidad 1:');
elements['b_svc_type'].value = '1';
elements['b_date'].value = '2026-11-04'; // Miércoles hábil
vm.runInContext("selectedBlock = 'manana';", ctx);
ctx.actualizarTarifaSegunAgenda();

assert(elements['pillJornada_habil'].classList.contains('active'), 'Tarjeta Hábil debe tener clase .active');
assert(!elements['pillJornada_tarde'].classList.contains('active'), 'Tarjeta Fin de Semana NO debe tener .active');
assert(!elements['pillJornada_nocturno'].classList.contains('active'), 'Tarjeta Festivo NO debe tener .active');
assert.strictEqual(ctx.tarifaPorHora, 12000, 'tarifaPorHora en Modalidad 1 Hábil debe ser 12.000');
assert.strictEqual(ctx.window.tarifaPorHora, 12000, 'window.tarifaPorHora debe ser 12.000');
console.log('   ✅ PASS: Tarjeta 1 (Hábil) activa con visto verde, tarifaPorHora = $12.000.');

// TEST 3: Día Hábil en Modalidad 2 (Traslado Exclusivo con Espera)
console.log('\n3. Evaluando Día Hábil en Modalidad 2 (Traslado Exclusivo con Espera):');
elements['b_svc_type'].value = '2';
elements['selStayDestino'].value = '120'; // 2h espera
ctx.actualizarTarifaSegunAgenda();

assert(elements['pillJornada_habil'].classList.contains('active'), 'Tarjeta Hábil debe tener .active');
assert.strictEqual(ctx.tarifaPorHora, 8000, 'tarifaPorHora en Modalidad 2 Hábil debe ser 8.000');
assert.strictEqual(elements['sumTimeVal'].textContent, '$16.000', '2h de espera a $8.000/h debe dar $16.000');
console.log('   ✅ PASS: Modalidad 2 Hábil activa Tarjeta 1 con tarifaPorHora = $8.000 y 2h = $16.000.');

// TEST 4: Fin de Semana (Sábado 7 de Noviembre de 2026) en Modalidad 2
console.log('\n4. Evaluando Fin de Semana (Sábado 2026-11-07) en Modalidad 2:');
elements['b_date'].value = '2026-11-07'; // Sábado
vm.runInContext("selectedBlock = 'tarde';", ctx);
ctx.actualizarTarifaSegunAgenda();

assert(!elements['pillJornada_habil'].classList.contains('active'), 'Tarjeta Hábil NO debe tener .active');
assert(elements['pillJornada_tarde'].classList.contains('active'), 'Tarjeta Fin de Semana DEBE tener .active');
assert(!elements['pillJornada_nocturno'].classList.contains('active'), 'Tarjeta Festivo NO debe tener .active');
assert.strictEqual(ctx.tarifaPorHora, 10000, 'tarifaPorHora en Modalidad 2 Fin de Semana debe ser 10.000');
assert.strictEqual(elements['sumTimeVal'].textContent, '$20.000', '2h de espera en Sábado a $10.000/h debe dar $20.000 (y no $16.000)');
console.log(`   ✅ PASS: Tarjeta 2 (Fin de Semana) activa en Sábado, tarifaPorHora = $10.000, espera 2h = ${elements['sumTimeVal'].textContent}.`);

// TEST 5: Fin de Semana (Domingo 8 de Noviembre de 2026) en Modalidad 1
console.log('\n5. Evaluando Fin de Semana (Domingo 2026-11-08) en Modalidad 1:');
elements['b_svc_type'].value = '1';
elements['b_date'].value = '2026-11-08'; // Domingo
vm.runInContext("selectedBlock = 'manana';", ctx);
ctx.actualizarTarifaSegunAgenda();

assert(elements['pillJornada_tarde'].classList.contains('active'), 'Tarjeta Fin de Semana DEBE tener .active');
assert.strictEqual(ctx.tarifaPorHora, 15000, 'tarifaPorHora en Modalidad 1 Fin de Semana debe ser 15.000');
console.log('   ✅ PASS: Domingo activa Tarjeta 2 con tarifaPorHora = $15.000 en Modalidad 1.');

// TEST 6: Día Feriado Oficial (Martes 8 de Diciembre de 2026 - Inmaculada Concepción)
console.log('\n6. Evaluando Día Feriado Oficial (Martes 2026-12-08):');
elements['b_date'].value = '2026-12-08'; // Martes feriado
vm.runInContext("selectedBlock = 'manana';", ctx);
ctx.actualizarTarifaSegunAgenda();

assert(!elements['pillJornada_habil'].classList.contains('active'), 'Tarjeta Hábil NO debe tener .active');
assert(!elements['pillJornada_tarde'].classList.contains('active'), 'Tarjeta Fin de Semana NO debe tener .active');
assert(elements['pillJornada_nocturno'].classList.contains('active'), 'Tarjeta Festivo DEBE tener .active');
assert.strictEqual(ctx.tarifaPorHora, 18000, 'tarifaPorHora en Feriado Modalidad 1 debe ser 18.000');
console.log('   ✅ PASS: Feriado en martes activa Tarjeta 3 (Festivo) con tarifaPorHora = $18.000.');

// TEST 7: Día Feriado Oficial en Modalidad 2
console.log('\n7. Evaluando Feriado Oficial en Modalidad 2:');
elements['b_svc_type'].value = '2';
ctx.actualizarTarifaSegunAgenda();

assert(elements['pillJornada_nocturno'].classList.contains('active'), 'Tarjeta Festivo DEBE tener .active');
assert.strictEqual(ctx.tarifaPorHora, 12000, 'tarifaPorHora en Feriado Modalidad 2 debe ser 12.000');
assert.strictEqual(elements['sumTimeVal'].textContent, '$24.000', '2h de espera en Feriado a $12.000/h debe dar $24.000');
console.log('   ✅ PASS: Modalidad 2 en Feriado activa Tarjeta 3 con $12.000/h y 2h = $24.000.');

// TEST 8: Turno Noche en Modalidad 3 (Cuidados a Domicilio)
console.log('\n8. Evaluando Turno Noche en Modalidad 3 (Cuidados a Domicilio):');
elements['b_svc_type'].value = '3';
elements['b_date'].value = '2026-11-04'; // Miércoles hábil
vm.runInContext("selectedBlock = 'noche';", ctx);
ctx.actualizarTarifaSegunAgenda();

assert(elements['pillJornada_nocturno'].classList.contains('active'), 'Turno Noche activa Tarjeta 3');
assert.strictEqual(ctx.tarifaPorHora, 18000, 'tarifaPorHora en Turno Noche debe ser 18.000');
console.log('   ✅ PASS: Turno Noche en día hábil activa Tarjeta 3 (Festivo/Nocturno) a $18.000/h.');

// TEST 9: Gatillantes obligatorios
console.log('\n9. Verificando gatillantes obligatorios (selectCalendarDate, selectShiftBlock, onServiceTypeChange):');

// 9.a: selectCalendarDate con Sábado en Modalidad 1 (Turno diurno)
elements['b_svc_type'].value = '1';
vm.runInContext("selectedBlock = 'manana';", ctx);
ctx.selectCalendarDate('2026-11-14'); // Sábado
assert(elements['pillJornada_tarde'].classList.contains('active'), 'selectCalendarDate en Sábado debe activar Tarjeta 2');
console.log('   ✅ PASS: selectCalendarDate gatilla actualización de tarifa correctamente.');

// 9.b: selectShiftBlock con Noche en Modalidad 3
elements['b_svc_type'].value = '3';
ctx.selectShiftBlock('noche');
assert(elements['pillJornada_nocturno'].classList.contains('active'), 'selectShiftBlock noche debe activar Tarjeta 3');
console.log('   ✅ PASS: selectShiftBlock gatilla actualización de tarifa correctamente.');

// 9.c: onServiceTypeChange cambiando a Modalidad 2
elements['b_date'].value = '2026-11-14'; // Sábado
elements['b_svc_type'].value = '2';
ctx.onServiceTypeChange();
assert(elements['pillJornada_tarde'].classList.contains('active'), 'onServiceTypeChange preserva y actualiza tarifa de Sábado');
assert.strictEqual(ctx.tarifaPorHora, 10000, 'tarifaPorHora en Sábado Modalidad 2 debe ser 10.000');
console.log('   ✅ PASS: onServiceTypeChange gatilla actualización de tarifa y recalcula a $10.000/h.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE SELECCIÓN Y REACTIVIDAD DE TARIFAS PASARON AL 100%! 🚀');
