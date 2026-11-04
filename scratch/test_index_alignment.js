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

// 4.1 Event rows d.1 and d.2 with colspan="3"
assert(html.includes('d.1) Asistencia en Eventos (Sin Traslado)'), 'Must contain d.1 row');
assert(html.includes('d.2) Asistencia en Eventos (Con Traslado)'), 'Must contain d.2 row');
assert(html.includes('<td colspan="3" style="text-align:center">'), 'Must contain colspan="3" centered cells');
assert(html.includes('Tarifa Plana Especial única para cualquier día y horario (Incluye nocturno y festivos)'), 'Must contain flat rate header');
assert(html.includes('Plan Base 4 hrs: $65.000 &nbsp;|&nbsp; Plan Total 6 hrs: $95.000'), 'Must contain d.1 prices');
assert(html.includes('Pack Base 4 hrs: $95.000 &nbsp;|&nbsp; Pack Total 6 hrs: $125.000'), 'Must contain d.2 prices');
assert(html.includes('Tiempo adicional: 30 min $7.500 / 1 hora $15.000 / 1 hr 30 min $22.500 / 2 hrs $30.000 (Tope máx.)'), 'Must contain additional time scale in event rows');
console.log('✓ Event rows d.1 and d.2 colspan="3" merged layout verified');

// 5. Sección Preventiva (Rango pediátrico 2 a 13 años)
assert(html.includes('En niños de 2 a 13 años'), 'Pediatric age range must be 2 to 13 years');
console.log('✓ Sección Preventiva (2 a 13 años) verified');

console.log('\n🎉 ALL INDEX.HTML ALIGNMENT TESTS PASSED PERFECTLY!\n');
