const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('Testing TomTom Search Bounding Box, Regional Validation and Button Removal...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Static HTML assertions
assert(!content.includes('Trazar Ruta y Calcular Tiempos de Traslado'), 'Button "Trazar Ruta y Calcular Tiempos de Traslado" must be removed');
assert(!content.includes('Calcular Hora de Salida Sugerida'), 'Button "Calcular Hora de Salida Sugerida" must be removed');
assert(content.includes('id="errFrom"'), '#errFrom error container must exist');
assert(content.includes('id="errTo"'), '#errTo error container must exist');

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
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        toggle(c, force) {
          if (force === undefined) {
            if (this._classes.has(c)) this._classes.delete(c);
            else this._classes.add(c);
          } else if (force) {
            this._classes.add(c);
          } else {
            this._classes.delete(c);
          }
        },
        contains(c) { return this._classes.has(c); }
      },
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      removeAttribute(k) { delete this.attributes[k]; },
      children: [],
      options: [],
      addEventListener: () => {},
      focus: () => {}
    };

    if (tag === 'select') {
      let _html = '';
      Object.defineProperty(el, 'innerHTML', {
        get() { return _html; },
        set(val) {
          _html = val;
          el.options = [];
          const optRegex = /<option\s+value="([^"]*)"([^>]*)>([^<]*)<\/option>/g;
          let m;
          while ((m = optRegex.exec(val)) !== null) {
            const isSelected = m[2].includes('selected');
            const opt = { value: m[1], text: m[3], selected: isSelected };
            el.options.push(opt);
            if (isSelected) el.value = m[1];
          }
        }
      });
    }

    elements[id] = el;
    return el;
  }

  const requiredIds = [
    'b_svc_type', 'b_date', 'b_time', 'b_app_time', 'appTimeInput', 'hora-cita-medica',
    'b_from', 'b_to', 'errFrom', 'errTo', 'sugFrom', 'sugTo', 'routeLayoutBox',
    'mapColumn', 'destWrap', 'kmCalcControls', 'packCalcControls', 'packRouteMetricsCard',
    'packMetricKm', 'packMetricTime', 'resultPanel', 'routeStatusMsg', 'ringInfoBox',
    'ringTitle', 'ringDesc', 'timeSectionBadge', 'timeSectionTitle', 'timeSectionSub',
    'selHours34', 'selMins34', 'lblHours34', 'lblMins34', 'hours34Col', 'mins34Col',
    'eventStartCol', 'durationBox12', 'durationBox34', 'pickupScheduleGrid',
    'colAsistentePickup', 'colDurationService', 'eventSubModeBox', 'interregionalRegionBox',
    'jornadaSelectorWrap', 'interProgSelectorWrap', 'serviceTimelineBox', 'tlBadge',
    'tlHoraRecogida', 'tlHoraRecogidaLabel', 'tlHoraLlegadaDestino', 'tlHoraLlegadaDestinoLabel',
    'tlTiempoDestino', 'tlTiempoDestinoLabel', 'tlHoraRetorno', 'tlHoraRetornoLabel',
    'tlHorasEfectivas', 'tlHorasEfectivasLabel', 'tlDesgloseDetalle', 'lblFromAddr', 'lblToAddr',
    'sumKmTimeSection', 'btnRegionValpo', 'btnRegionOhiggins', 'dirSvcLbl', 'dirSvcName',
    'dirRegionRow', 'dirRegionVal', 'dirTimeLbl', 'dirTimeDesc', 'dirFinalTotal', 'dirAbono50',
    'dirSaldoFinal', 'lblTimeSummaryDesc', 'lblTimeSummaryVal', 'sumBoxTitle', 'sumTimeLabel',
    'sumKmText', 'sumKmVal', 'sumTimeVal', 'sumRawTotal', 'sumRingFloorRow', 'sumRingFloorVal',
    'sumFinalTotal', 'sumAbono50', 'sumSaldoFinal', 'suggestedPickupCallout', 'suggestedPickupMsg',
    'submitBlockAlert', 'availStatus', 'submitBtn', 'pillJornada_habil', 'pillJornada_tarde',
    'pillJornada_nocturno', 'titleJornadaNocturno', 'subJornadaNocturno', 'subJornadaTarde',
    'lblRateHabil', 'lblRateTarde', 'lblRateNocturno', 'pillProg_4', 'pillProg_6'
  ];

  requiredIds.forEach(id => {
    const tag = (id.startsWith('sel') || id === 'b_time' || id === 'appTimeInput' || id === 'b_svc_type') ? 'select' : 'div';
    makeEl(id, tag);
  });

  elements['b_svc_type'].value = '1';
  elements['b_date'].value = '2026-11-04';

  const $ = (selector) => {
    if (!selector) return null;
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return elements[id] || makeEl(id);
    }
    return makeEl(selector.replace(/[^a-zA-Z0-9_-]/g, '_'));
  };

  const mapMock = {
    setView: () => mapMock,
    on: () => mapMock,
    invalidateSize: () => mapMock,
    removeLayer: () => mapMock,
    fitBounds: () => mapMock
  };

  const sandbox = {
    console,
    $,
    document: {
      documentElement: { setAttribute: () => {} },
      getElementById: (id) => elements[id] || makeEl(id),
      querySelector: (sel) => $(sel),
      querySelectorAll: () => [],
      createElement: (tag) => makeEl('temp_' + Math.random(), tag),
      body: { appendChild: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    window: {
      scrollTo: () => {}
    },
    map: mapMock,
    L: {
      map: () => mapMock,
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => ({ addTo: () => ({ on: () => {}, bindPopup: () => ({ openPopup: () => {} }) }) }),
      polyline: () => ({ addTo: () => {} }),
      geoJSON: () => ({ addTo: () => ({ getBounds: () => ({}) }) }),
      icon: () => ({}),
      divIcon: () => ({}),
      latLngBounds: () => ({ pad: () => ({}) })
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    alert: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  const scripts = [];
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    if (!match[0].includes('src=')) {
      scripts.push(match[1]);
    }
  }

  scripts.forEach(code => {
    vm.runInContext(code, ctx);
  });

  return { ctx, elements };
}

const { ctx, elements } = createMockEnv();

// --- TEST 1: Bounding Box and Country Parameters according to active Modality ---
console.log('1. Verificando getTomTomSearchParams():');

// Modalidades 1, 2, 3, 4 (Cobertura Local / RM)
['1', '2', '3', '4'].forEach(m => {
  elements['b_svc_type'].value = m;
  const params = ctx.getTomTomSearchParams();
  assert.strictEqual(params.countrySet, 'CL', `Modality ${m} must set countrySet to CL`);
  assert.strictEqual(params.boundingBox, '-71.15,-33.80,-70.35,-33.20', `Modality ${m} must set boundingBox to RM`);
  assert.strictEqual(params.isInterregional, false, `Modality ${m} is not interregional`);
});

// Modalidad 5 (Programas Interregionales)
elements['b_svc_type'].value = '5';
const interParams = ctx.getTomTomSearchParams();
assert.strictEqual(interParams.countrySet, 'CL', 'Modality 5 must set countrySet to CL');
assert.strictEqual(interParams.boundingBox, '-72.10,-34.70,-70.20,-32.50', 'Modality 5 must set boundingBox to V, RM and VI regions corridor');
assert.strictEqual(interParams.isInterregional, true, 'Modality 5 must be interregional');

console.log('   ✅ PASS: Parámetros countrySet y boundingBox dinámicos verificados.');

// --- TEST 2: Semantic Validation in Local Modalities (1, 2, 3, 4) ---
console.log('\n2. Verificando validación semántica en Modalidades 1 a 4 (Cobertura Urbana RM):');
elements['b_svc_type'].value = '1';
elements['b_from'].value = 'Av. Matta 500';

// Item valid in RM
const validRMItem = {
  title: 'Av. Matta 500, Santiago',
  rawFull: 'Av. Matta 500, Santiago, Región Metropolitana de Santiago',
  lat: -33.456,
  lon: -70.645,
  result: {
    address: {
      countrySubdivision: 'Región Metropolitana de Santiago',
      municipalitySubdivision: 'Santiago'
    }
  }
};

const okRM = ctx.validateAddressRegion(validRMItem, 'from');
assert.strictEqual(okRM, true, 'Address in RM must pass validation');
assert.strictEqual(elements['errFrom'].style.display, 'none', 'Error must be hidden for valid address');

// Item outside RM (e.g. Rancagua or Viña del Mar)
elements['b_from'].value = 'Av. España 100, Valparaíso';
const invalidRMItem = {
  title: 'Av. España 100, Valparaíso',
  rawFull: 'Av. España 100, Valparaíso, Región de Valparaíso',
  lat: -33.024,
  lon: -71.552,
  result: {
    address: {
      countrySubdivision: 'Valparaíso',
      municipalitySubdivision: 'Valparaíso'
    }
  }
};

const failRM = ctx.validateAddressRegion(invalidRMItem, 'from');
assert.strictEqual(failRM, false, 'Address outside RM must fail validation');
assert.strictEqual(elements['b_from'].value, '', 'Input must be cleared when address is outside RM');
assert.strictEqual(elements['errFrom'].style.display, 'block', 'Error message must be displayed');
assert.strictEqual(
  elements['errFrom'].textContent,
  'La dirección ingresada se encuentra fuera de nuestra zona de cobertura urbana (Región Metropolitana).'
);

console.log('   ✅ PASS: Validación urbana y mensaje de error en rojo verificados.');

// --- TEST 3: Semantic Validation in Modalidad 5 (Programas Interregionales) ---
console.log('\n3. Verificando validación semántica en Modalidad 5 (Programas Interregionales):');
elements['b_svc_type'].value = '5';

// Case 3A: Región de Valparaíso selected
ctx.selectInterRegion('Región de Valparaíso');

// Origin in Valparaíso -> Valid
elements['b_from'].value = 'Av. Libertad 450, Viña del Mar';
const validValpo = {
  title: 'Av. Libertad 450, Viña del Mar',
  rawFull: 'Av. Libertad 450, Viña del Mar, Región de Valparaíso',
  lat: -33.015,
  lon: -71.550,
  result: {
    address: {
      countrySubdivision: 'Valparaíso',
      municipalitySubdivision: 'Viña del Mar'
    }
  }
};
assert.strictEqual(ctx.validateAddressRegion(validValpo, 'from'), true, 'Valparaíso origin must be valid for Valparaíso program');

// Origin in O'Higgins when Valparaíso selected -> Invalid
elements['b_from'].value = 'Av. Libertador Bernardo O\'Higgins 520, Rancagua';
const wrongRegionForValpo = {
  title: 'Av. Libertador Bernardo O\'Higgins 520, Rancagua',
  rawFull: 'Av. Libertador Bernardo O\'Higgins 520, Rancagua, Región de O\'Higgins',
  lat: -34.170,
  lon: -70.740,
  result: {
    address: {
      countrySubdivision: 'Libertador General Bernardo O\'Higgins',
      municipalitySubdivision: 'Rancagua'
    }
  }
};
assert.strictEqual(ctx.validateAddressRegion(wrongRegionForValpo, 'from'), false, 'Rancagua origin must fail for Valparaíso program');
assert.strictEqual(elements['b_from'].value, '', 'Origin input must be cleared');
assert(elements['errFrom'].textContent.includes('debe pertenecer a la Región de Valparaíso'), 'Must show Valparaíso warning');

// Case 3B: Región de O'Higgins selected
ctx.selectInterRegion("Región de O'Higgins");

// Origin in Rancagua -> Valid
elements['b_from'].value = 'Av. Libertador Bernardo O\'Higgins 520, Rancagua';
assert.strictEqual(ctx.validateAddressRegion(wrongRegionForValpo, 'from'), true, 'Rancagua origin must be valid for O\'Higgins program');

// Origin in Valparaíso when O'Higgins selected -> Invalid
elements['b_from'].value = 'Av. Libertad 450, Viña del Mar';
assert.strictEqual(ctx.validateAddressRegion(validValpo, 'from'), false, 'Valparaíso origin must fail for O\'Higgins program');
assert.strictEqual(elements['b_from'].value, '', 'Origin input must be cleared');
assert(elements['errFrom'].textContent.includes("debe pertenecer a la Región de O'Higgins"), 'Must show O\'Higgins warning');

// Case 3C: Destination in Modalidad 5 must be in Santiago (RM)
elements['b_to'].value = 'Hospital del Profesor, Santiago';
const validDestRM = {
  title: 'Hospital del Profesor, Santiago',
  rawFull: 'Hospital del Profesor, Santiago, Región Metropolitana de Santiago',
  lat: -33.450,
  lon: -70.690,
  result: {
    address: {
      countrySubdivision: 'Región Metropolitana de Santiago',
      municipalitySubdivision: 'Estación Central'
    }
  }
};
assert.strictEqual(ctx.validateAddressRegion(validDestRM, 'to'), true, 'Destination in Santiago must pass in Modalidad 5');

// Destination outside Santiago in Modalidad 5 -> Invalid
elements['b_to'].value = 'Hospital Gustavo Fricke, Viña del Mar';
const invalidDestOutsideRM = {
  title: 'Hospital Gustavo Fricke, Viña del Mar',
  rawFull: 'Hospital Gustavo Fricke, Viña del Mar, Región de Valparaíso',
  lat: -33.025,
  lon: -71.535,
  result: {
    address: {
      countrySubdivision: 'Valparaíso',
      municipalitySubdivision: 'Viña del Mar'
    }
  }
};
assert.strictEqual(ctx.validateAddressRegion(invalidDestOutsideRM, 'to'), false, 'Destination outside RM must fail in Modalidad 5');
assert.strictEqual(elements['b_to'].value, '', 'Destination input must be cleared');
assert(elements['errTo'].textContent.includes('debe ubicarse en la Región Metropolitana (Santiago)'), 'Must show RM destination warning');

console.log('   ✅ PASS: Validación de corredores interregionales y destinos en Santiago verificada.');

// --- TEST 4: Typing resets error indicators ---
elements['errFrom'].style.display = 'block';
elements['errFrom'].textContent = 'Error';
elements['b_from'].style.borderColor = '#ef4444';
elements['b_from'].value = 'A';
ctx.onType('from');
assert.strictEqual(elements['errFrom'].style.display, 'none', 'onType must hide error container');
assert.strictEqual(elements['b_from'].style.borderColor, '', 'onType must reset border color');

console.log('   ✅ PASS: Reset dinámico de alertas al tipear verificado.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE BÚSQUEDA Y VALIDACIÓN GEOGRÁFICA PASARON AL 100%! 🚀');
