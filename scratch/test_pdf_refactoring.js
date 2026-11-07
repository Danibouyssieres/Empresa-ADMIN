const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('--- Testing PDF Refactoring & Arithmetic Verification ---');

const admHtml = fs.readFileSync('admin.html', 'utf8');

// 1. Verify Template Structure
assert(admHtml.includes('id="recibo-pdf"'), 'Template #recibo-pdf must exist');
assert(admHtml.includes('id="pdfPatNombre"'), 'pdfPatNombre must exist');
assert(admHtml.includes('id="pdfPatRut"'), 'pdfPatRut must exist');
assert(admHtml.includes('id="pdfPatEdad"'), 'pdfPatEdad must exist');
assert(admHtml.includes('id="pdfPatDx"'), 'pdfPatDx must exist');

assert(admHtml.includes('id="pdfCoordNombre"'), 'pdfCoordNombre must exist');
assert(admHtml.includes('id="pdfCoordRut"'), 'pdfCoordRut must exist');
assert(admHtml.includes('id="pdfCoordTel"'), 'pdfCoordTel must exist');

assert(admHtml.includes('id="pdfTensNombre"'), 'pdfTensNombre must exist');
assert(admHtml.includes('id="pdfTensSis"'), 'pdfTensSis must exist');
assert(admHtml.includes('id="pdfTensVeh"'), 'pdfTensVeh must exist');

assert(admHtml.includes('id="pdfDirOrigen"'), 'pdfDirOrigen must exist');
assert(admHtml.includes('id="pdfAnilloComunal"'), 'pdfAnilloComunal must exist');
assert(admHtml.includes('id="pdfDirDestino"'), 'pdfDirDestino must exist');
assert(admHtml.includes('id="pdfAyudaTecnica"'), 'pdfAyudaTecnica must exist');

assert(admHtml.includes('id="pdfSubtotal"'), 'pdfSubtotal must exist');
assert(admHtml.includes('id="pdfTotalLiquidado"'), 'pdfTotalLiquidado must exist');
assert(admHtml.includes('id="pdfRowEstacionamiento"'), 'pdfRowEstacionamiento must exist');
assert(admHtml.includes('id="pdfEstacionamiento"'), 'pdfEstacionamiento must exist');
assert(admHtml.includes('id="pdfAbono"'), 'pdfAbono must exist');
assert(admHtml.includes('id="pdfSaldoFinal"'), 'pdfSaldoFinal must exist');
assert(admHtml.includes('id="pdfFolioSII"'), 'pdfFolioSII must exist');

console.log('✓ All Persona, Logística and Desglose fields in PDF template verified');

// 2. Single Page A4 properties
assert(admHtml.includes('width:680px;max-width:680px'), 'width must be 680px for A4 fit');
assert(admHtml.includes('page-break-inside:avoid'), 'page-break-inside must be avoid');
assert(admHtml.includes("mode: ['avoid-all', 'css', 'legacy']"), 'html2pdf pagebreak mode must be avoid-all');
assert(admHtml.includes('margin: [6, 10, 6, 10]'), 'html2pdf margin must be safe 6/10mm');
console.log('✓ Single-page A4 formatting and anti-overflow constraints verified');

// 3. Modal inputs
assert(admHtml.includes('id="adm_abono_previo_input"'), 'adm_abono_previo_input must exist in modal');
assert(admHtml.includes('id="adm_co_total_servicio"'), 'adm_co_total_servicio must exist in modal');
console.log('✓ Modal Abono Previo input and Total Servicio Liquidado row verified');

// 4. Test Exact Arithmetic Formula (including MSA-018 case)
const sandbox = {
  TODAY: '2026-11-07',
  PRICE_PER_KM: 1000,
  ADMIN_RATES: {
    '1': { habil: 18000, finde: 22000, nocturno: 27000 },
    '2': { habil: 12000, finde: 15000, nocturno: 18000 }
  },
  RINGS_DATA: [{ id: 1, name: 'Anillo 1', minFare: 18000 }],
  getAdminJornada: () => 'habil',
  detectRingFromText: () => ({ ring: { id: 1, name: 'Anillo 1', minFare: 18000 } }),
  fm: (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`,
  tm: (s) => { const [h,m] = s.split(':').map(Number); return h*60+m; }
};

const calcCode = admHtml.slice(
  admHtml.indexOf('function calculateFieldLiquidation('),
  admHtml.indexOf('function renderFieldCheckoutSummary(')
);

vm.createContext(sandbox);
vm.runInContext(calcCode, sandbox);

// Case MSA-018:
// Subtotal = $46.000 (e.g. Base $40.000 + 1 block extra $6.000 = $46.000)
// Parking = $4.500
// Abono = $20.000
const msa018Service = {
  id: 18,
  folio: 'MSA-018',
  svcType: '1',
  date: '2026-11-07',
  start: 540,
  dur: 120, // 2h
  baseFare: 40000,
  fare: 40000,
  abono: 20000,
  paid: 20000
};

// 135 minutes elapsed -> +15 min diff -> 1 extra block (+6.000) -> subtotal = 46.000
const resMsa018 = sandbox.calculateFieldLiquidation(msa018Service, 135, 4500, 20000);

console.log('\nMSA-018 Result Details:');
console.log('Subtotal Servicio:', resMsa018.subtotalServicio);
console.log('Monto Estacionamiento:', resMsa018.montoEstacionamiento);
console.log('Total Servicio Liquidado:', resMsa018.totalServicio);
console.log('Abono Previo:', resMsa018.abonoPrevio);
console.log('Saldo Final:', resMsa018.saldoFinal);

assert.strictEqual(resMsa018.subtotalServicio, 46000, 'Subtotal Servicio must be 46.000');
assert.strictEqual(resMsa018.montoEstacionamiento, 4500, 'Estacionamiento must be 4.500');
assert.strictEqual(resMsa018.totalServicio, 50500, 'Total Servicio must be 46.000 + 4.500 = 50.500');
assert.strictEqual(resMsa018.abonoPrevio, 20000, 'Abono Previo must be 20.000');
assert.strictEqual(resMsa018.saldoFinal, 30500, 'Saldo Final must be STRICTLY 30.500 (never 48.500!)');

console.log('\n✓ ARITHMETIC TEST PASSED: 46.000 + 4.500 - 20.000 = 30.500 strictly verified!');
console.log('🎉 ALL REFACTORING TESTS PASSED SUCCESSFULLY! 🚀');
