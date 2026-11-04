const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing terminos.html Updates (Direct PDF Download & Typo Fix) ---');

const filePath = path.join(__dirname, '..', 'terminos.html');
const content = fs.readFileSync(filePath, 'utf8');

// 1. Check html2pdf CDN is NOT present
assert(!content.includes('html2pdf.bundle.min.js'), 'html2pdf.bundle.min.js CDN must be removed from terminos.html');
console.log('✓ html2pdf.js CDN tag confirmed removed');

// 2. Check download button
assert(content.includes('class="btn-descarga-pdf"'), 'Button must have class="btn-descarga-pdf"');
assert(content.includes('href="/terminos_condiciones.pdf"'), 'Button href must point directly to /terminos_condiciones.pdf');
assert(content.includes('download="Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf"'), 'Button download attribute must be Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf');
assert(!content.includes('onclick="descargarTerminosPdf'), 'Button must not have html2pdf onclick handler');
console.log('✓ Direct PDF download button attributes verified');

// 3. Section 2: Detalle de Modalidades (Eventos Sociales e Interregionales)
const eventosExpected = 'Tiempo Adicional en Recinto (Extensión de Cobertura): Toda extensión presencial de acompañamiento clínico que exceda el plan contratado tendrá un valor de $7.500 por cada fracción de 30 minutos ($15.000 por 1 hora, $22.500 por 1 hora 30 min y $30.000 por 2 horas extras). Este servicio contempla un tope máximo estricto de 2 horas adicionales por evento para resguardo del descanso del personal.';
assert(content.includes(eventosExpected), 'Section 2 must contain the official Eventos extra time text');

const interregionalExpected = 'Tiempo adicional no programado: Aplica exclusivamente sobre el Programa Interregional Estándar (4 horas) con un tope máximo de hasta 2 horas extras. Por normativas de seguridad en conducción interurbana y prevención de fatiga, el Programa Crónico / Oncológico (6 horas) opera con cobertura cerrada improrrogable. El valor es $15.000 por 30 minutos extra, $25.000 por 1 hora extra, $40.000 por 1 hora y 30 minutos, y $50.000 por 2 horas extras.';
assert(content.includes(interregionalExpected), 'Section 2 must contain the updated official Interregional text');
console.log('✓ Section 2 Eventos and Interregional official descriptions verified');

// 4. Tabla de Tarifas: Filas d.1 y d.2 combinadas con colspan="3"
assert(content.includes('d.1) Asistencia en Eventos (Sin Traslado)'), 'Row d.1 must exist');
assert(content.includes('d.2) Asistencia en Eventos (Con Traslado)'), 'Row d.2 must exist');
assert(content.includes('colspan="3" style="text-align:center"'), 'Rows d.1 and d.2 must have colspan="3" centered');
assert(content.includes('Plan Base 4 hrs: $65.000 &nbsp;|&nbsp; Plan Total 6 hrs: $95.000'), 'Row d.1 must display Plan Base $65k and Plan Total $95k');
assert(content.includes('Pack Base 4 hrs: $95.000 &nbsp;|&nbsp; Pack Total 6 hrs: $125.000'), 'Row d.2 must display Pack Base $95k and Pack Total $125k');
assert(content.includes('Tiempo adicional: 30 min $7.500 / 1 hora $15.000 / 1 hr 30 min: $22.500 / 2 hrs $30.000 (Tope máx.)'), 'Both rows must include the extra time scale note');
console.log('✓ Tariff Table rows d.1 and d.2 merged layout (colspan="3") verified');

// 5. Section 2: Límites de Jornada y Cierre de Turnos (Semáforo Operativo)
assert(content.includes('Límites de Jornada y Cierre de Turnos (Semáforo Operativo)'), 'Semáforo title must be present');
console.log('✓ Section 2 Semáforo Operativo closure clause verified');

// 6. Section 4: Typo fix on Política de Devolución y Respaldo Legal (no "e)")
assert(!content.includes('e) Política de Devolución'), 'Letter "e)" must be removed from Section 4');
assert(content.includes('<b>Política de Devolución y Respaldo Legal:</b>'), 'Clean title "Política de Devolución y Respaldo Legal:" must be present');
const devolucionBodyExpected = 'En caso de cancelación voluntaria, desistimiento o inasistencia imputable al cliente o familiar con menos de 12 horas de aviso previo, no se efectuarán devoluciones de dinero ni reintegros bancarios, aplicándose el abono retenido como compensación por el bloqueo exclusivo de agenda y lucro cesante. En el imprevisto caso de fuerza mayor operacional o imposibilidad técnica directamente atribuible a la empresa, se reintegrará el 100% del abono transferido o se reprogramará con carácter prioritario según la preferencia del contratante.';
assert(content.includes(devolucionBodyExpected), 'Section 4 balanced refund body text must match spec');
console.log('✓ Section 4 typographic cleanup confirmed (letter "e)" removed)');

// 7. Check that inline html2pdf scripts were removed
assert(!content.includes('function descargarTerminosPdf'), 'Inline descargarTerminosPdf script must be removed from terminos.html');
assert(!content.includes('function generarTerminosPdfHtml2Pdf'), 'Inline generarTerminosPdfHtml2Pdf script must be removed from terminos.html');
console.log('✓ Script cleanup confirmed in terminos.html');

// 8. Verify physical PDF files in root
const pdfPath = path.join(__dirname, '..', 'terminos_condiciones.pdf');
assert(fs.existsSync(pdfPath), 'terminos_condiciones.pdf must exist in root directory');
const stats = fs.statSync(pdfPath);
assert(stats.size > 100000, `PDF file size should be > 100KB, got: ${stats.size} bytes`);
console.log(`✓ Physical PDF file terminos_condiciones.pdf verified in root (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

console.log('\nAll terminos.html tests passed successfully! 🚀');
