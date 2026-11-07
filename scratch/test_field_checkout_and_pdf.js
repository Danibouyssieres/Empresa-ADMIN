const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Field Checkout, Parking Expense & PDF Margin Repairs ---');

const admHtml = fs.readFileSync('admin.html', 'utf8');

// 1. Verify modal markup and elements
assert(admHtml.includes('id="modalFinalizarAtencionAdmin"'), 'Modal must exist');
assert(admHtml.includes('id="adm_parking_expense"'), 'Parking expense input must exist');
assert(admHtml.includes('id="adm_co_breakdown_box"'), 'Reactive breakdown box must exist');
assert(admHtml.includes('id="adm_co_subtotal_servicio"'), 'Subtotal element must exist');
assert(admHtml.includes('id="adm_co_parking_amount"'), 'Parking amount element must exist');
assert(admHtml.includes('id="adm_co_abono_previo"'), 'Abono previo element must exist');
assert(admHtml.includes('id="adm_co_saldo_final"'), 'Saldo final element must exist');
console.log('✓ Modal markup, inputs and reactive breakdown container verified');

// 2. Verify 2-step decoupled actions
assert(admHtml.includes('id="btnSolicitarPagoWhatsAppAdmin"'), 'Action A button must exist');
assert(admHtml.includes('onclick="solicitarPagoWhatsAppAdmin()"'), 'Action A must call solicitarPagoWhatsAppAdmin');
assert(admHtml.includes('id="btnConfirmarDescargarPdfAdmin"'), 'Action B button must exist');
assert(admHtml.includes('onclick="ejecutarFinalizacionYDescargaPdfAdmin()"'), 'Action B must call ejecutarFinalizacionYDescargaPdfAdmin');
console.log('✓ Two-step decoupled actions (WhatsApp request & payment confirmation) verified');

// 3. Verify WhatsApp Request text and banking details
assert(admHtml.includes('function solicitarPagoWhatsAppAdmin()'), 'solicitarPagoWhatsAppAdmin function must be defined');
assert(admHtml.includes('DETALLE DE SALDO A LIQUIDAR'), 'WhatsApp must include breakdown title');
assert(admHtml.includes('TOTAL SALDO PENDIENTE A TRANSFERIR'), 'WhatsApp must specify total balance to transfer');
assert(admHtml.includes('Scotiabank'), 'WhatsApp must include Scotiabank');
assert(admHtml.includes('994989122'), 'WhatsApp must include account 994989122');
assert(admHtml.includes('POS CompraAquí'), 'WhatsApp must mention POS CompraAquí');
console.log('✓ Step 1 WhatsApp message and banking details verified');

// 4. Verify PDF container width, margins and box-sizing
assert(admHtml.includes('id="recibo-pdf" style="display:none;width:680px;max-width:680px'), 'recibo-pdf width must be 680px for A4 fit');
assert(admHtml.includes('margin: [6, 10, 6, 10]') || admHtml.includes('margin: [10, 10, 10, 10]'), 'html2pdf margin must be safe format');
assert(admHtml.includes('id="pdfRowEstacionamiento"'), 'PDF table must include parking footer row');
assert(admHtml.includes('Reembolso Estacionamiento / Parking'), 'PDF table must include parking item row');
assert(admHtml.includes('PAGADO Y LIQUIDADO'), 'PDF must stamp PAGADO Y LIQUIDADO');
console.log('✓ PDF 680px width, 10mm margins, parking rows and paid stamp verified');

// 5. Test Mathematical Logic of calculateFieldLiquidation
const mockService = {
  id: 101,
  folio: 'MSA-101',
  svcType: '1',
  date: '2026-11-07',
  start: 540, // 09:00
  dur: 120,   // 2 hrs
  fare: 48000,
  paid: 24000, // 50% abono
  from: 'Maipú, Av. Pajaritos 1450',
  to: 'Hospital El Carmen',
  pat: 'Rosa Medina',
  ph: '977778888'
};

// Evaluate calculateFieldLiquidation in vm
const vm = require('vm');
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

// Scenario A: Standard on-time closure, $0 parking
const resA = sandbox.calculateFieldLiquidation(mockService, 120, 0);
assert.strictEqual(resA.cobroTotal, 48000, 'Subtotal should be 48.000');
assert.strictEqual(resA.abono, 24000, 'Abono should be 24.000');
assert.strictEqual(resA.parking, 0, 'Parking should be 0');
assert.strictEqual(resA.saldoFinal, 24000, 'Saldo should be 24.000');
console.log('✓ Scenario A ($0 parking, on time): Saldo = $24.000 verified');

// Scenario B: $3.500 parking added
const resB = sandbox.calculateFieldLiquidation(mockService, 120, 3500);
assert.strictEqual(resB.cobroTotal, 48000, 'Subtotal should be 48.000');
assert.strictEqual(resB.parking, 3500, 'Parking should be 3.500');
assert.strictEqual(resB.abono, 24000, 'Abono should be 24.000');
// Saldo = (48.000 + 3.500) - 24.000 = 27.500
assert.strictEqual(resB.saldoFinal, 27500, 'Saldo should be 27.500');
console.log('✓ Scenario B (+$3.500 parking): Saldo = (48k + 3.5k) - 24k = $27.500 verified');

// Scenario C: Retraso en terreno (+35 min extra = 2 bloques x $6.000 = $12.000) + $4.000 parking
const resC = sandbox.calculateFieldLiquidation(mockService, 155, 4000);
assert.strictEqual(resC.extraBlocks, 2, 'Should charge 2 extra blocks');
assert.strictEqual(resC.extraCost, 12000, 'Extra cost should be 12.000');
assert.strictEqual(resC.cobroTotal, 60000, 'Subtotal service should be 48.000 + 12.000 = 60.000');
assert.strictEqual(resC.parking, 4000, 'Parking should be 4.000');
// Saldo = (60.000 + 4.000) - 24.000 = 40.000
assert.strictEqual(resC.saldoFinal, 40000, 'Saldo should be 40.000');
console.log('✓ Scenario C (Retraso + Parking): Saldo = (60k + 4k) - 24k = $40.000 verified');

console.log('\n🎉 ALL FIELD CHECKOUT & PDF TESTS PASSED SUCCESSFULLY! 🚀');
