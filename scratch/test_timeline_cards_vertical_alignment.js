const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('reservar.html', 'utf8') + '\n' + fs.readFileSync('css/reservar.css', 'utf8');

console.log('=== TEST SUITE: Alineación Vertical de Casillas de Cronograma ===\n');

// 1. Verificación del Contenedor Padre
assert(html.includes('.timeline-grid{display:grid;grid-template-columns:repeat(5, 1fr);align-items:stretch;gap:12px;'), 'CSS must define .timeline-grid with repeat(5, 1fr), align-items:stretch, gap:12px');
assert(html.includes('class="timeline-grid" style="display:grid;grid-template-columns:repeat(5, 1fr);align-items:stretch;gap:12px;'), 'Inline HTML must define timeline container with repeat(5, 1fr), align-items:stretch, gap:12px');
console.log('✅ 1. Contenedor padre con grid de 5 columnas, align-items: stretch y gap: 12px verificado.');

// 2. Verificación de Estructura Flexbox en cada casilla
assert(html.includes('.timeline-card{display:flex;flex-direction:column;justify-content:space-between;height:100%;box-sizing:border-box}'), 'CSS must define .timeline-card with flex column, space-between and height:100%');
const cardMatches = [...html.matchAll(/class="timeline-card"[^>]*style="([^"]*)"/g)];
assert.strictEqual(cardMatches.length, 5, 'Must have exactly 5 timeline cards');
cardMatches.forEach((m, idx) => {
  const style = m[1];
  assert(style.includes('display:flex'), `Card ${idx + 1} must have display:flex`);
  assert(style.includes('flex-direction:column'), `Card ${idx + 1} must have flex-direction:column`);
  assert(style.includes('justify-content:space-between'), `Card ${idx + 1} must have justify-content:space-between`);
  assert(style.includes('height:100%'), `Card ${idx + 1} must have height:100%`);
});
console.log('✅ 2. Estructura Flexbox en las 5 casillas individuales (display: flex, column, space-between, height: 100%) verificada.');

// 3. Verificación de Estandarización de Altura de Títulos/Etiquetas
assert(html.includes('.timeline-card small{min-height:2.8em;line-height:1.3;margin-bottom:8px;display:block}'), 'CSS must define .timeline-card small with min-height:2.8em, line-height:1.3, margin-bottom:8px');
const smallRegex = /<small[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/small>/g;
const timelineBoxSlice = html.slice(html.indexOf('id="serviceTimelineBox"'), html.indexOf('id="tlDesgloseDetalle"'));
const smallMatches = [...timelineBoxSlice.matchAll(smallRegex)];
assert.strictEqual(smallMatches.length, 5, 'Must have 5 label elements in timeline box');
smallMatches.forEach((m, idx) => {
  const style = m[1];
  assert(style.includes('min-height:2.8em'), `Label ${idx + 1} must have min-height:2.8em`);
  assert(style.includes('line-height:1.3'), `Label ${idx + 1} must have line-height:1.3`);
  assert(style.includes('margin-bottom:8px'), `Label ${idx + 1} must have margin-bottom:8px`);
});
console.log('✅ 3. Estandarización de etiquetas superiores (min-height: 2.8em, line-height: 1.3, margin-bottom: 8px) verificada.');

// 4. Verificación de Anclaje de Valores de Tiempo a la Base
assert(html.includes('.timeline-card b{margin-top:auto;display:flex;align-items:flex-end;font-weight:700}'), 'CSS must define .timeline-card b with margin-top:auto, display:flex, align-items:flex-end, font-weight:700');
const bRegex = /<b\s+id="(tlHoraRecogida|tlHoraLlegadaDestino|tlTiempoDestino|tlHoraRetorno|tlHorasEfectivas)"[^>]*style="([^"]*)"/g;
const bMatches = [...timelineBoxSlice.matchAll(bRegex)];
assert.strictEqual(bMatches.length, 5, 'Must have 5 b value elements in timeline box');
bMatches.forEach((m, idx) => {
  const style = m[2];
  assert(style.includes('margin-top:auto'), `Value element ${m[1]} must have margin-top:auto`);
  assert(style.includes('display:flex'), `Value element ${m[1]} must have display:flex`);
  assert(style.includes('align-items:flex-end'), `Value element ${m[1]} must have align-items:flex-end`);
  assert(style.includes('font-weight:700'), `Value element ${m[1]} must have font-weight:700`);
});
console.log('✅ 4. Anclaje de los valores a la base (margin-top: auto, display: flex, align-items: flex-end, font-weight: 700) verificado.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE ALINEACIÓN DE CRONOGRAMA PASARON AL 100%! 🚀');
