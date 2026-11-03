const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: Alineación CSS de Desglose de Suma Total (Flexbox) ===\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '../reservar.html'), 'utf8');

// 1. Verificación de Flexbox en .breakdown li
console.log('1. Verificando reglas CSS de dos columnas con Flexbox:');
assert(htmlContent.includes('.breakdown li{display:flex;justify-content:space-between;align-items:flex-start;gap:16px'), 'Debe incluir display:flex, justify-content:space-between, align-items:flex-start y gap:16px');
assert(!htmlContent.includes('.breakdown li{display:flex;justify-content:space-between;padding:4px 0;gap:10px;flex-wrap:wrap}'), 'No debe tener flex-wrap:wrap que desalineaba los montos');
console.log('   ✅ PASS: .breakdown li estructurado con Flexbox, gap: 16px y sin flex-wrap.');

// 2. Verificación de libertad de salto para texto descriptivo a la izquierda
console.log('\n2. Verificando columna descriptiva izquierda:');
assert(htmlContent.includes('.breakdown li > span{flex:1;min-width:0;line-height:1.45}'), 'span debe ocupar flex:1 con min-width:0 para salto de línea libre');
console.log('   ✅ PASS: span ocupa flex: 1 con min-width: 0.');

// 3. Verificación de fijación de columna derecha para montos
console.log('\n3. Verificando columna de montos derecha:');
assert(htmlContent.includes('white-space:nowrap;text-align:right;font-weight:bold;flex-shrink:0'), 'Montos deben tener white-space:nowrap, text-align:right, font-weight:bold y flex-shrink:0');
console.log('   ✅ PASS: Montos con white-space: nowrap, text-align: right y flex-shrink: 0.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE ALINEACIÓN CSS PASARON AL 100%!\n');
