const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('--- Testing PDF Boleta & Finalizar Atención Implementation ---');

const html = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');

// 1. CDN html2pdf.js check
assert(html.includes('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'), 'html2pdf CDN script must be in <head>');
console.log('✓ html2pdf.js CDN tag present');

// 2. Template #recibo-pdf
assert(html.includes('id="recibo-pdf"'), '#recibo-pdf element must exist');
assert(html.includes('Logo de Movilidad y Salud Asistida.png'), 'Logo image must be included in receipt');
assert(html.includes('MOVILIDAD Y SALUD ASISTIDA SpA'), 'Company name must be in receipt');
assert(html.includes('78.521.776-4'), 'RUT 78.521.776-4 must be in receipt');
assert(html.includes('id="pdfFolio"'), 'pdfFolio element must exist');
assert(html.includes('id="pdfTablaItems"'), 'pdfTablaItems table must exist');
assert(html.includes('id="pdfSubtotal"'), 'pdfSubtotal element must exist');
assert(html.includes('id="pdfAbono"'), 'pdfAbono element must exist');
assert(html.includes('id="pdfSaldoFinal"'), 'pdfSaldoFinal element must exist');
assert(html.includes('id="pdfMedioPago"'), 'pdfMedioPago element must exist');
assert(html.includes('id="pdfFolioSII"'), 'pdfFolioSII element must exist');
assert(html.includes('D.L. 825'), 'Legal tax exemption notice DL 825 must be present');
console.log('✓ #recibo-pdf template structure verified');

// 3. Modal #modalFinalizarAtencion
assert(html.includes('id="modalFinalizarAtencion"'), 'modal #modalFinalizarAtencion must exist');
assert(html.includes('id="modHoraCierreReal"'), 'input #modHoraCierreReal must exist');
assert(html.includes('id="modRutPaciente"'), 'input #modRutPaciente must exist');
assert(html.includes('id="modMedioPago"'), 'select #modMedioPago must exist');
assert(html.includes('id="modFolioSII"'), 'input #modFolioSII must exist');
assert(html.includes('id="btnFinalizarAtencion"'), 'button #btnFinalizarAtencion must exist in Section 2');
assert(html.includes('id="btnFinalizarAtencionConfirm"'), 'button #btnFinalizarAtencionConfirm must exist in confirmation');
console.log('✓ Modal and trigger buttons verified');

// 4. Test logic in Node simulated environment
let capturedPdfOptions = null;
let savedTarget = null;
let openedUrl = null;

const fakeDoc = {
  elements: {},
  getElementById: function(id) {
    if (!this.elements[id]) {
      this.elements[id] = { id: id, style: {}, textContent: '', value: '', innerHTML: '' };
    }
    return this.elements[id];
  }
};

function $(sel) {
  const id = sel.replace('#', '');
  return fakeDoc.getElementById(id);
}

const fakeWindow = {
  open: function(url) {
    openedUrl = url;
  }
};

function fakeHtml2Pdf() {
  return {
    set: function(opts) {
      capturedPdfOptions = opts;
      return this;
    },
    from: function(el) {
      savedTarget = el;
      return this;
    },
    save: function() {
      return Promise.resolve();
    }
  };
}

const context = {
  console: console,
  document: fakeDoc,
  window: fakeWindow,
  $: $,
  html2pdf: fakeHtml2Pdf,
  tm: function(str) {
    if (!str) return 0;
    const parts = str.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  },
  fm: function(min) {
    const h = String(Math.floor(min / 60) % 24).padStart(2, '0');
    const m = String(min % 60).padStart(2, '0');
    return h + ':' + m;
  },
  $c: function(n) {
    return '$' + Number(n).toLocaleString('es-CL');
  },
  fmtHoursClean: function(min) {
    return (min / 60).toFixed(1) + ' hrs';
  },
  formatHumanDate: function(d) {
    return d;
  },
  TODAY: '2026-11-01',
  PRICE_PER_KM: 1000,
  lastTotalKm: 25,
  lastKmCost: 25000,
  lastTimeCost: 24000,
  lastFinalTotal: 49000,
  lastAbono50: 24500,
  detectedRing: { name: 'Anillo 1', minFare: 18000 },
  D: {
    nid: 105,
    svcs: [{
      id: 105,
      pat: 'Juan Pérez',
      patRut: '11.222.333-4',
      age: '75',
      dx: 'Rehabilitación kinesiológica',
      svcType: '1',
      date: '2026-11-02',
      start: 540,
      dur: 120,
      fare: 49000,
      paid: 24500,
      from: 'Av. Providencia 1234',
      to: 'Hospital Salvador',
      coord: 'María Pérez',
      ph: '+56 9 8765 4321'
    }]
  }
};

vm.createContext(context);

// Extract JS functions
const jsStart = html.indexOf('// ===== GESTIÓN DE FINALIZACIÓN DE ATENCIÓN');
const jsEnd = html.indexOf('window.ejecutarFinalizacionYDescargaPdf = ejecutarFinalizacionYDescargaPdf;', jsStart);
const jsCode = html.substring(jsStart, jsEnd + 'window.ejecutarFinalizacionYDescargaPdf = ejecutarFinalizacionYDescargaPdf;'.length);

vm.runInContext(jsCode, context);

// Test 4A: Normal completion (closing at scheduled time 11:00)
const resNormal = vm.runInContext("ejecutarFinalizacionYDescargaPdf({ horaCierre: '11:00', rutPaciente: '11.222.333-4', medioPago: 'Transferencia Electrónica', folioSII: 'B-5542' });", context);

assert.strictEqual(resNormal.folio, 105, 'Folio must match service id');
assert.strictEqual(resNormal.totalConExtra, 49000, 'Total should be 49000 with 0 extra time');
assert.strictEqual(resNormal.saldoFinal, 24500, 'Saldo should be 24500');
assert(capturedPdfOptions !== null, 'html2pdf options should be configured');
assert.strictEqual(capturedPdfOptions.filename, 'Comprobante_Atencion_105.pdf', 'Filename matches pattern');
assert.strictEqual(capturedPdfOptions.margin, 10, 'Margin should be 10');
assert.strictEqual(capturedPdfOptions.image.quality, 0.98, 'Image quality should be 0.98');
assert.strictEqual(capturedPdfOptions.html2canvas.scale, 2, 'html2canvas scale should be 2');
assert.strictEqual(capturedPdfOptions.jsPDF.format, 'a4', 'PDF format should be a4');
assert.strictEqual(capturedPdfOptions.jsPDF.orientation, 'portrait', 'PDF orientation should be portrait');
assert(resNormal.waUrl.includes('56987654321'), 'WhatsApp phone should be correctly parsed');
assert(resNormal.waUrl.includes(encodeURIComponent('Hola María Pérez, adjunto el comprobante digital de atención y respaldo de pago del servicio finalizado.')), 'WhatsApp message text must match spec');
console.log('✓ Normal completion test passed with exact pdf options and WhatsApp redirect');

// Test 4B: Completion with extra delay (+45 min -> 2 blocks extra of 30 min = $12.000 extra)
const resExtra = vm.runInContext("ejecutarFinalizacionYDescargaPdf({ horaCierre: '11:45', rutPaciente: '11.222.333-4', medioPago: 'Efectivo', folioSII: 'B-5543' });", context);

assert.strictEqual(resExtra.totalConExtra, 49000 + 12000, 'Total with extra time should include 2 blocks of $6.000 = $61.000');
assert.strictEqual(resExtra.saldoFinal, 61000 - 24500, 'Saldo final should be updated to $36.500');
console.log('✓ Extra time recalculation test passed: 45 min delay -> +$12.000 recalculated in PDF receipt');

console.log('\nAll PDF Boleta and Finalizar Atención tests passed successfully!');
