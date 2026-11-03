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

// 3. Section 2: Programas Interregionales time breakdown
const interregionalExpected = 'Todo tiempo adicional no programado tendrá un valor de: $15.000 por 30 minutos extra, $25.000 por 1 hora extra, $40.000 por 1 hora y 30 minutos, y $50.000 por 2 horas extras.';
assert(content.includes(interregionalExpected), 'Section 2 must contain the official extra time breakdown');
console.log('✓ Section 2 Interregional extra time breakdown verified');

// 4. Section 2: Límites de Jornada y Cierre de Turnos (Semáforo Operativo)
assert(content.includes('Límites de Jornada y Cierre de Turnos (Semáforo Operativo)'), 'Semáforo title must be present');
console.log('✓ Section 2 Semáforo Operativo closure clause verified');

// 5. Section 4: Typo fix on Política de Devolución y Respaldo Legal (no "e)")
assert(!content.includes('e) Política de Devolución'), 'Letter "e)" must be removed from Section 4');
assert(content.includes('<b>Política de Devolución y Respaldo Legal:</b>'), 'Clean title "Política de Devolución y Respaldo Legal:" must be present');
const devolucionBodyExpected = 'En caso de cancelación voluntaria, desistimiento o inasistencia imputable al cliente o familiar con menos de 12 horas de aviso previo, no se efectuarán devoluciones de dinero ni reintegros bancarios, aplicándose el abono retenido como compensación por el bloqueo exclusivo de agenda y lucro cesante. En el imprevisto caso de fuerza mayor operacional o imposibilidad técnica directamente atribuible a la empresa, se reintegrará el 100% del abono transferido o se reprogramará con carácter prioritario según la preferencia del contratante.';
assert(content.includes(devolucionBodyExpected), 'Section 4 balanced refund body text must match spec');
console.log('✓ Section 4 typographic cleanup confirmed (letter "e)" removed)');

// 6. Check that inline html2pdf scripts were removed
assert(!content.includes('function descargarTerminosPdf'), 'Inline descargarTerminosPdf script must be removed from terminos.html');
assert(!content.includes('function generarTerminosPdfHtml2Pdf'), 'Inline generarTerminosPdfHtml2Pdf script must be removed from terminos.html');
console.log('✓ Script cleanup confirmed in terminos.html');

// 7. Verify physical PDF files in root and in public/
const pdfPath = path.join(__dirname, '..', 'terminos_condiciones.pdf');
assert(fs.existsSync(pdfPath), 'terminos_condiciones.pdf must exist in root directory');
const stats = fs.statSync(pdfPath);
assert(stats.size > 100000, `PDF file size should be > 100KB, got: ${stats.size} bytes`);

const publicPdfPath = path.join(__dirname, '..', 'public', 'terminos_condiciones.pdf');
assert(fs.existsSync(publicPdfPath), 'terminos_condiciones.pdf must also exist in /public directory');
const publicStats = fs.statSync(publicPdfPath);
assert.strictEqual(publicStats.size, stats.size, 'Root and /public PDF file sizes must match');
console.log(`✓ Physical PDF file terminos_condiciones.pdf verified in root and /public (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

console.log('\nAll terminos.html tests passed successfully! 🚀');
