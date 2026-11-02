const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing terminos.html Updates & PDF Download Integration ---');

const filePath = path.join(__dirname, '..', 'terminos.html');
const content = fs.readFileSync(filePath, 'utf8');

// 1. Check html2pdf CDN
assert(content.includes('html2pdf.bundle.min.js'), 'html2pdf.bundle.min.js CDN must be present in <head>');
console.log('✓ html2pdf.js CDN tag present');

// 2. Check download button
assert(content.includes('id="btnDescargarPdf"'), 'Button #btnDescargarPdf must exist');
assert(content.includes('href="/Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf"'), 'Button href must point to /Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf');
assert(content.includes('download="Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf"'), 'Button download attribute must be Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf');
assert(content.includes('descargarTerminosPdf(event)'), 'Button onclick handler must be attached');
console.log('✓ Download button structure and attributes verified');

// 3. Section 2: Programas Interregionales time breakdown
const interregionalExpected = 'Todo tiempo adicional no programado tendrá un valor de: $15.000 por 30 minutos extra, $25.000 por 1 hora extra, $40.000 por 1 hora y 30 minutos, y $50.000 por 2 horas extras.';
assert(content.includes(interregionalExpected), 'Section 2 must contain the official extra time breakdown');
assert(!content.includes('Fracción extra de 30 min: $15.000 (hora extra: $25.000)'), 'Old extra time text must be removed');
console.log('✓ Section 2 Interregional extra time breakdown verified');

// 4. Section 2: Límites de Jornada y Cierre de Turnos (Semáforo Operativo)
const semaforoBodyExpected = 'Nuestros turnos concluyen nominalmente a las 12:00 hrs (Mañana), 20:00 hrs (Tarde) y 04:00 hrs (Noche), disponiendo de un margen técnico máximo de 30 minutos de tolerancia operativa (alerta amarilla en plataforma). Por resguardo de la puntualidad del paciente agendado a continuación y de los tiempos de conducción, toda atención que finalice dentro de este margen de tolerancia no admitirá extensiones presenciales de tiempo en el recinto médico o destino, debiendo iniciarse el retorno a la hora estipulada.';
assert(content.includes('Límites de Jornada y Cierre de Turnos (Semáforo Operativo)'), 'Semáforo title must be present');
assert(content.includes(semaforoBodyExpected), 'Semáforo body text must match spec');
console.log('✓ Section 2 Semáforo Operativo closure clause verified');

// 5. Section 4: Política de Devolución y Respaldo Legal
const devolucionBodyExpected = 'En caso de cancelación voluntaria, desistimiento o inasistencia imputable al cliente o familiar con menos de 12 horas de aviso previo, no se efectuarán devoluciones de dinero ni reintegros bancarios, aplicándose el abono retenido como compensación por el bloqueo exclusivo de agenda y lucro cesante. En el imprevisto caso de fuerza mayor operacional o imposibilidad técnica directamente atribuible a la empresa, se reintegrará el 100% del abono transferido o se reprogramará con carácter prioritario según la preferencia del contratante.';
assert(content.includes('e) Política de Devolución y Respaldo Legal:</b>'), 'Section 4 title must match spec');
assert(content.includes(devolucionBodyExpected), 'Section 4 balanced refund and legal protection policy body must match spec');
assert(!content.includes('Política de Cero Devolución:'), 'Old zero refund policy title must be removed');
console.log('✓ Section 4 Política de Devolución y Respaldo Legal verified');

// 6. Check JavaScript download handler functions
const jsSrc = content.includes('function descargarTerminosPdf')
  ? content
  : (fs.existsSync(path.join(__dirname, '..', 'js', 'terminos.js')) ? fs.readFileSync(path.join(__dirname, '..', 'js', 'terminos.js'), 'utf8') : '');
assert(jsSrc.includes('function descargarTerminosPdf'), 'descargarTerminosPdf function must exist');
assert(jsSrc.includes('function generarTerminosPdfHtml2Pdf'), 'generarTerminosPdfHtml2Pdf function must exist');
console.log('✓ JavaScript PDF handler functions verified');

// 7. Verify physical PDF file on disk
const pdfPath = path.join(__dirname, '..', 'Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf');
assert(fs.existsSync(pdfPath), 'Terminos_y_Condiciones_Movilidad_y_Salud_SpA.pdf must exist in root');
const stats = fs.statSync(pdfPath);
assert(stats.size > 100000, `PDF file size should be > 100KB, got: ${stats.size} bytes`);
console.log(`✓ Physical PDF file verified (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

console.log('\nAll terminos.html tests passed successfully! 🚀');
