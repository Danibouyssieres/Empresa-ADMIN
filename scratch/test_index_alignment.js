const fs = require('fs');
const assert = require('assert');

console.log('--- Testing index.html Official Document Alignment ---');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Modalidad 3 (Cuidados a Domicilio) untouched with max 6 hrs
assert(html.includes('Cobertura máxima de hasta 6 hrs continuas'), 'Modality 3 must retain 6h continuous coverage cap');
console.log('✓ Modality 3 (Cuidados a Domicilio) 6h max coverage confirmed untouched');

// 2. Modalidad 4 (Acompañamiento en Eventos)
assert(html.includes('Tiempo adicional en recinto: $7.500 por cada fracción de 30 min / $15.000 por hora (tope máx. 2 horas extras)'),
  'Modality 4 card must have extra time bullet ($7.500/30m, $15.000/1h, tope 2h)');
console.log('✓ Modality 4 (Eventos Sociales) extra time bullet verified');

// 3. Modalidad 5 (Programas Interregionales)
assert(html.includes('Tiempo adicional no programado (aplica exclusivamente sobre el Programa Estándar de 4h, con tope máx. de 2 horas extras): $15.000 por 30 min, $25.000 por 1 hora, $40.000 por 1h 30m y $50.000 por 2 horas extras. El Programa Crónico / Oncológico (6h) opera con cobertura cerrada improrrogable por normativas de seguridad vial.'),
  'Modality 5 must have updated breakdown and road safety lock note');
console.log('✓ Modality 5 (Interregionales) extra scale and road safety lock clause verified');

// 4. Tabla de Tarifas ("Para que no haya sorpresas")
assert(html.includes('Extensiones de tiempo en recinto: $7.500 los 30 min / $15.000 la hora (tope máx. 2 horas extras).'),
  'Tabla de tarifas note must specify event time extensions');
console.log('✓ Tabla de Tarifas explanatory note verified');

// 5. Sección Preventiva (Rango pediátrico 2 a 13 años)
assert(html.includes('En niños de 2 a 13 años'), 'Pediatric age range must be 2 to 13 years');
console.log('✓ Sección Preventiva (2 a 13 años) verified');

console.log('\n🎉 ALL INDEX.HTML ALIGNMENT TESTS PASSED PERFECTLY!\n');
