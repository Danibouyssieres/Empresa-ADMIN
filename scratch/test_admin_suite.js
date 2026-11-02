const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('--- Testing Admin Module Restructuring & Integration ---');

// 1. Verify login.html
const loginHtml = fs.readFileSync(path.join(__dirname, '..', 'login.html'), 'utf8');
assert(loginHtml.includes('id="u_user"'), 'login.html must have #u_user input');
assert(loginHtml.includes('id="u_pass"'), 'login.html must have #u_pass input');
assert(loginHtml.includes('movilidadysaludasistida@gmail.com'), 'login.html must include official admin email');
assert(loginHtml.includes('msa-admin-token'), 'login.html must store msa-admin-token');
assert(loginHtml.includes("window.location.replace('admin.html')") || loginHtml.includes("window.location.href = 'admin.html'"), 'login.html must redirect to admin.html on auth');
console.log('✓ login.html structure, official user and session token setup verified');

// 2. Verify admin.html Route Guard & CDN
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
assert(adminHtml.includes('login.html'), 'admin.html must contain Route Guard redirecting to login.html');
assert(adminHtml.includes('msa-admin-token'), 'admin.html Route Guard must check msa-admin-token');
assert(adminHtml.includes('function logout'), 'admin.html must have logout() function');
assert(adminHtml.includes('html2pdf.bundle.min.js'), 'admin.html must include html2pdf CDN');
console.log('✓ admin.html Route Guard, session verification and html2pdf CDN verified');

// 3. Verify Cotizador Automático in admin.html
assert(adminHtml.includes('id="aq_mode"'), 'admin.html must have #aq_mode selector');
assert(adminHtml.includes('id="aq_from"'), 'admin.html must have #aq_from input');
assert(adminHtml.includes('id="aq_to"'), 'admin.html must have #aq_to input');
assert(adminHtml.includes('id="aq_km"'), 'admin.html must have #aq_km input');
assert(adminHtml.includes('id="aq_stay_hours"'), 'admin.html must have #aq_stay_hours selector');
assert(adminHtml.includes('function calcAdminQuote'), 'admin.html must have calcAdminQuote()');
assert(adminHtml.includes('function sendAdminQuoteWhatsApp'), 'admin.html must have sendAdminQuoteWhatsApp()');
assert(adminHtml.includes('function saveAdminBooking'), 'admin.html must have saveAdminBooking()');
assert(adminHtml.includes('q_total'), 'admin.html must display total calculation');
assert(adminHtml.includes('q_abono'), 'admin.html must display 50% deposit calculation');
console.log('✓ admin.html Cotizador Automático inputs and master functions verified');

// 4. Verify Field Closure and Boleta PDF in admin.html
assert(adminHtml.includes('id="recibo-pdf"'), 'admin.html must contain hidden #recibo-pdf template');
assert(adminHtml.includes('78.521.776-4'), '#recibo-pdf must contain company RUT 78.521.776-4');
assert(adminHtml.includes('id="modalFinalizarAtencionAdmin"'), 'admin.html must contain #modalFinalizarAtencionAdmin modal');
assert(adminHtml.includes('function abrirModalFinalizarAtencionAdmin'), 'admin.html must have abrirModalFinalizarAtencionAdmin()');
assert(adminHtml.includes('function ejecutarFinalizacionYDescargaPdfAdmin'), 'admin.html must have ejecutarFinalizacionYDescargaPdfAdmin()');
console.log('✓ admin.html Field Closure modal, #recibo-pdf template and functions verified');

// 5. Test quotation math in VM
const fakeDoc = {
  documentElement: { getAttribute: () => 'light', setAttribute: () => {} },
  elements: {},
  getElementById: function(id) {
    if (!this.elements[id]) {
      this.elements[id] = { id: id, style: {}, textContent: '', value: '', innerHTML: '' };
    }
    return this.elements[id];
  },
  querySelector: function(sel) {
    return this.getElementById(sel.replace('#', ''));
  },
  querySelectorAll: function() { return []; }
};

let capturedPdfOpts = null;
let openedWaUrl = null;

const fakeWindow = {
  open: function(url) { openedWaUrl = url; },
  location: { replace: function() {}, href: '' }
};

function fakeHtml2Pdf() {
  return {
    set: function(opts) { capturedPdfOpts = opts; return this; },
    from: function() { return this; },
    save: function() { return Promise.resolve(); }
  };
}

const mockContext = {
  console: console,
  document: fakeDoc,
  window: fakeWindow,
  html2pdf: fakeHtml2Pdf,
  sessionStorage: {
    getItem: () => JSON.stringify({ role: 'admin', name: 'Supervisión Central', token: 'tok123' }),
    setItem: () => {},
    removeItem: () => {}
  },
  localStorage: {
    getItem: () => JSON.stringify({ role: 'admin', name: 'Supervisión Central', token: 'tok123' }),
    setItem: () => {},
    removeItem: () => {}
  },
  addEventListener: () => {}
};

vm.createContext(mockContext);

// Run the script part of admin.html in VM
const sIdx = adminHtml.indexOf('const PX=44');
const scriptEnd = adminHtml.indexOf('</script>', sIdx);
const scriptBody = adminHtml.substring(sIdx, scriptEnd);

vm.runInContext(scriptBody, mockContext);

// Test 5A: Test calcAdminQuote with Modality 1: 24 km, 2 hrs assistance in Maipú (Anillo 1)
// 24 km * $1.000 = $24.000 kmCost. 2 hrs * $12.000 = $24.000 timeCost. Total = $48.000. Abono = $24.000.
fakeDoc.getElementById('aq_mode').value = '1';
fakeDoc.getElementById('aq_km').value = '24';
fakeDoc.getElementById('aq_stay_hours').value = '120';
fakeDoc.getElementById('aq_from').value = 'Av. Los Pajaritos 1450, Maipú';
fakeDoc.getElementById('aq_to').value = 'Clínica Santa María';

vm.runInContext('calcAdminQuote();', mockContext);
const qState = vm.runInContext('qState;', mockContext);

assert.strictEqual(qState.totalFare, 48000, 'Modality 1 total fare should be $48.000');
assert.strictEqual(qState.abono50, 24000, 'Modality 1 abono 50% should be $24.000');
assert.strictEqual(qState.saldo50, 24000, 'Modality 1 saldo 50% should be $24.000');
console.log('✓ Cotizador Automático calculation verified (24km + 2h in Anillo 1 = $48.000)');

// Test 5B: Test Ring 3 Minimum Floor ($50.000)
// Short route in Las Condes (Anillo 3): 10 km ($10.000) + 1 hr ($12.000) = $22.000 -> Floor $50.000 must be applied!
fakeDoc.getElementById('aq_from').value = 'Av. Las Condes 12000, Las Condes';
fakeDoc.getElementById('aq_km').value = '10';
fakeDoc.getElementById('aq_stay_hours').value = '60';

vm.runInContext('onAdminAddressInput("from");', mockContext);
const qStateFloor = vm.runInContext('qState;', mockContext);

assert.strictEqual(qStateFloor.ring.id, 3, 'Las Condes must be detected as Anillo 3');
assert.strictEqual(qStateFloor.floorApplied, true, 'Floor must be applied for short route below $50.000');
assert.strictEqual(qStateFloor.totalFare, 50000, 'Total fare should be elevated to Anillo 3 floor $50.000');
assert.strictEqual(qStateFloor.abono50, 25000, 'Abono should be $25.000');
console.log('✓ Commensurate minimum floor logic verified ($22.000 elevated to $50.000 in Anillo 3)');

// Test 5C: Test Field Closure & Boleta PDF Generation
const resClose = vm.runInContext(`
  abrirModalFinalizarAtencionAdmin(1, {
    horaCierre: '11:00', // Scheduled: 08:30 + 120min = 10:30. Delay: 30 min -> 1 extra block of $6.000
    rutPaciente: '12.345.678-9',
    medioPago: 'Transferencia Electrónica',
    folioSII: 'B-7788',
    autoConfirm: true
  });
`, mockContext);

assert(resClose.folio === 1, 'Folio must match service id 1');
// Base fare for s=1 is 42000. 30 min extra = +6000 -> totalConExtra = 48000. Abono was 21000 -> Saldo = 27000.
assert.strictEqual(resClose.totalConExtra, 42000 + 6000, 'Total with extra 30 min delay should be $48.000');
assert.strictEqual(resClose.saldoFinal, 48000 - 21000, 'Saldo should be $27.000');
assert(capturedPdfOpts !== null, 'html2pdf options should be configured');
assert.strictEqual(capturedPdfOpts.filename, 'Comprobante_Atencion_1.pdf', 'Filename matches pattern');
assert(resClose.waUrl.includes('56977778888'), 'WhatsApp phone should be correctly parsed');
assert(resClose.waUrl.includes(encodeURIComponent('adjunto el comprobante digital de atención y respaldo de pago del servicio finalizado.')), 'WhatsApp text matches spec');
console.log('✓ Field Closure, 30 min extra delay recalculation, PDF and WhatsApp notification verified');

// 6. Test Synchronization with reservar.html
const reservarHtml = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');
assert(reservarHtml.includes('msa-last-block-update'), 'reservar.html must listen for msa-last-block-update');
assert(reservarHtml.includes("addEventListener('focus'"), 'reservar.html must reload on window focus');
console.log('✓ Synchronization with reservar.html on storage and focus verified');

console.log('\nAll Admin Module tests passed successfully! 🚀');
