const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('Testing Definitive Removal of Ventana Biológica Post-Nocturno Notice...');

const htmlPath = path.join(__dirname, '..', 'reservar.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// 1. Static HTML and CSS checks
assert(content.includes('#nightRuleNotice{display:none !important}'), 'CSS rule for nightRuleNotice must enforce display: none !important');
assert(content.includes('id="nightRuleNotice" class="rule-alert" style="display:none !important"'), 'HTML element must have inline display: none !important');
assert(!content.includes('nightNotice.style.display = \'block\''), 'No JS code should set nightNotice display to block');
assert(!content.includes('Descanso Biológico Post-Nocturno:</b> Al agendar'), 'Invasive biological alert message must be removed from updateSlots');

console.log('✔ Static HTML, CSS and script safety assertions passed.');

// 2. Mock DOM environment to execute updateSlots and all shift transitions
function createMockEnv(includeElement = true) {
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

  const registeredIds = [
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
    'lblTimeSummaryDesc', 'lblTimeSummaryVal', 'dirSvcLbl', 'dirSvcName', 'dirRegionRow',
    'dirRegionVal', 'dirTimeLbl', 'dirTimeDesc', 'dirFinalTotal', 'dirAbono50', 'dirSaldoFinal',
    'destWrap', 'kmCalcControls', 'routeLayoutBox',
    'mapColumn', 'lblFromAddr', 'lblToAddr', 'eventStartCol', 'hours34Col',
    'mins34Col', 'b_maps_route_mins', 'btnBlock_manana', 'btnBlock_tarde',
    'btnBlock_noche', 'badgeBlock_manana', 'badgeBlock_tarde', 'badgeBlock_noche',
    'reasonBlock_manana', 'reasonBlock_tarde', 'reasonBlock_noche',
    'lblEstimatedWindow', 'availStatus', 'submitBtn',
    'lblSelectedDateHuman', 'lblCapBadge', 'suggestedPickupCallout',
    'suggestedPickupMsg', 'btnApplySuggestedPickup', 'submitBlockAlert',
    'calGrid', 'calMonthLabel', 'calPrevBtn', 'calNextBtn', 'mainContent',
    'btnCalcularHora', 'eventSubModeBox', 'interregionalRegionBox',
    'jornadaSelectorWrap', 'interProgSelectorWrap', 'eventBtn_sin', 'eventBtn_con',
    'eventChk_sin', 'eventChk_con', 'selHours34', 'selMins34', 'lblHours34', 'lblMins34',
    'pickupScheduleGrid', 'colAsistentePickup', 'colDurationService', 'timeSectionBadge'
  ];

  if (includeElement) {
    registeredIds.push('nightRuleNotice');
  }

  registeredIds.forEach(id => makeEl(id));

  makeEl('selHours34', 'select');
  makeEl('selMins34', 'select');
  makeEl('b_time', 'select');
  makeEl('appTimeInput', 'select');
  makeEl('selStayDestino', 'select');

  elements['b_svc_type'].value = '3';
  elements['b_date'].value = '2026-11-04';

  const sandbox = {
    window: {
      scrollTo: () => {}
    },
    document: {
      documentElement: { setAttribute: () => {} },
      getElementById: (id) => elements[id] || (id === 'nightRuleNotice' && !includeElement ? null : makeEl(id)),
      querySelector: (sel) => {
        if (sel === 'input[name="b_allergy_radio"]:checked') return { value: 'no' };
        if (sel === 'input[name="b_tax_doc"]:checked') return { value: 'boleta' };
        if (sel === '#nightRuleNotice' && !includeElement) return null;
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
      if (sel === '#nightRuleNotice' && !includeElement) return null;
      if (sel.startsWith('#')) return elements[sel.slice(1)] || makeEl(sel.slice(1));
      return null;
    },
    $$: () => [],
    alert: () => {},
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

  const scriptMatches = [...content.matchAll(/<script(?![^>]*src=)(?:[^>]*)>([\s\S]*?)<\/script>/gi)];
  const inlineScript = scriptMatches.map(m => m[1]).join('\n');

  const ctx = vm.createContext(sandbox);
  vm.runInContext(inlineScript, ctx);

  return { ctx, elements };
}

// Test with element present: must NEVER show display: block
const env1 = createMockEnv(true);

// 1. Turno Noche in Modalidad 3 (Cuidados a Domicilio)
env1.elements['b_svc_type'].value = '3';
env1.ctx.selectedBlock = 'noche';
env1.ctx.updateSlots(true);
assert.notStrictEqual(env1.elements['nightRuleNotice'].style.display, 'block', 'nightRuleNotice must NOT be displayed in Mod 3 Turno Noche');

env1.elements['b_time'].value = '22:00';
env1.ctx.updateSlots(true);
assert.notStrictEqual(env1.elements['nightRuleNotice'].style.display, 'block', 'nightRuleNotice must NOT be displayed in Mod 3 with 22:00 selected');
assert(!env1.elements['nightRuleNotice'].innerHTML.includes('Descanso Biológico'), 'No biological alert HTML should be inserted');

// 2. Turno Noche in Modalidad 4 (Eventos Sociales)
env1.elements['b_svc_type'].value = '4';
env1.ctx.selectedBlock = 'noche';
env1.elements['b_time'].value = '22:00';
env1.ctx.updateSlots(true);
assert.notStrictEqual(env1.elements['nightRuleNotice'].style.display, 'block', 'nightRuleNotice must NOT be displayed in Mod 4 Turno Noche');

// 3. Late service ending after 22:00 in Modalidad 1
env1.elements['b_svc_type'].value = '1';
env1.ctx.selectedBlock = 'tarde';
env1.elements['b_time'].value = '18:00';
env1.elements['selStayDestino'].value = '240'; // 4 hours -> ends after 22:00
env1.ctx.updateSlots(true);
assert.notStrictEqual(env1.elements['nightRuleNotice'].style.display, 'block', 'nightRuleNotice must NOT be displayed in Mod 1 ending after 22:00');

// 4. Modalidad 5 (Programas Interregionales)
env1.elements['b_svc_type'].value = '5';
env1.ctx.selectedBlock = 'manana';
env1.elements['b_time'].value = '06:00';
env1.ctx.updateSlots(true);
assert.notStrictEqual(env1.elements['nightRuleNotice'].style.display, 'block', 'nightRuleNotice must NOT be displayed in Mod 5');

console.log('✔ nightRuleNotice verified to NEVER be displayed under any modality or night shift.');

// Test with element completely NULL/missing (Requirement 2: safe from null reference errors)
const env2 = createMockEnv(false);
assert.doesNotThrow(() => {
  env2.elements['b_svc_type'].value = '3';
  env2.ctx.selectedBlock = 'noche';
  env2.elements['b_time'].value = '22:00';
  env2.ctx.updateSlots(true);

  env2.elements['b_svc_type'].value = '4';
  env2.ctx.selectedBlock = 'noche';
  env2.elements['b_time'].value = '22:00';
  env2.ctx.updateSlots(true);

  env2.elements['b_svc_type'].value = '1';
  env2.ctx.selectedBlock = 'tarde';
  env2.elements['b_time'].value = '18:00';
  env2.ctx.updateSlots(true);
}, 'Functions must execute without any null pointer exceptions even if nightRuleNotice is completely absent');

console.log('✔ Complete null-safety confirmed without console exceptions.');
console.log('\nAll tests for definitive removal of Ventana Biológica Post-Nocturno passed! 🚀');
