const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing Public Scope of reservar.html (No Admin Settlement Modal) ---');

const html = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');

// 1. html2pdf CDN must NOT be in public booking page
assert(!html.includes('html2pdf.bundle.min.js'), 'html2pdf CDN script must not be in public reservar.html');
console.log('✓ html2pdf.js CDN tag absent from public page');

// 2. Receipt template #recibo-pdf must NOT be in public page
assert(!html.includes('id="recibo-pdf"'), '#recibo-pdf element must not exist in public reservar.html');
console.log('✓ #recibo-pdf element absent from public page');

// 3. Modal #modalFinalizarAtencion and action buttons must NOT be in public page
assert(!html.includes('id="modalFinalizarAtencion"'), 'modal #modalFinalizarAtencion must not exist in public reservar.html');
assert(!html.includes('id="btnFinalizarAtencion"'), 'button #btnFinalizarAtencion must not exist in public reservar.html');
assert(!html.includes('id="btnFinalizarAtencionConfirm"'), 'button #btnFinalizarAtencionConfirm must not exist in public reservar.html');
console.log('✓ Admin action buttons and modal absent from public page');

// 4. Function ejecutarFinalizacionYDescargaPdf must NOT be in public script
assert(!html.includes('function ejecutarFinalizacionYDescargaPdf'), 'ejecutarFinalizacionYDescargaPdf must not be in public reservar.html');
console.log('✓ Internal liquidation JS absent from public booking page');

console.log('\nPublic reservar.html cleanliness verified! 🚀');
