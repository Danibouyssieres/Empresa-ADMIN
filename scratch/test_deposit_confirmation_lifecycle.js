const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing Deposit Confirmation Lifecycle & Persistent Reservations Engine ---');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

// 1. Verify HTML Structure & Modal
assert(adminHtml.includes('id="modalConfirmDepositAdmin"'), 'Modal #modalConfirmDepositAdmin must exist');
assert(adminHtml.includes('id="confirmDepositVoucher"'), 'Voucher input #confirmDepositVoucher must exist');
assert(adminHtml.includes('onclick="executeConfirmDeposit()"'), 'Execute confirmation button must be wired to executeConfirmDeposit()');
assert(adminHtml.includes('.reservation-actions'), 'CSS for .reservation-actions must exist');
assert(adminHtml.includes('.btn-confirm-deposit'), 'CSS for .btn-confirm-deposit must exist');
assert(adminHtml.includes('.btn-cancel-reservation'), 'CSS for .btn-cancel-reservation must exist');
assert(adminHtml.includes("['inbox',"), 'Inbox tab must exist in navigation tabs');
assert(adminHtml.includes('📥 Bandeja de Entrada'), 'Inbox tab label must exist');
console.log('✓ Admin HTML structures, modal, CSS and inbox tab verified');

// 2. Mock DOM & VM Context to test functions
const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id: id,
      value: '',
      textContent: '',
      innerHTML: '',
      style: { display: 'none' },
      disabled: false,
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {},
        contains: () => false
      }
    };
  }
  return elements[id];
}

const fakeDoc = {
  documentElement: { getAttribute: () => 'light', setAttribute: () => {} },
  getElementById: (id) => getEl(id),
  querySelector: (sel) => getEl(sel.replace('#', '').replace('.', '')),
  querySelectorAll: () => []
};

let storageStore = {};
const fakeStorage = {
  getItem: (k) => storageStore[k] || null,
  setItem: (k, v) => { storageStore[k] = String(v); },
  removeItem: (k) => { delete storageStore[k]; },
  clear: () => { storageStore = {}; }
};

const mockContext = {
  console: console,
  document: fakeDoc,
  window: {
    location: { replace: () => {}, href: '' },
    confirm: () => true,
    alert: () => {}
  },
  sessionStorage: {
    getItem: () => JSON.stringify({ role: 'admin', roleLabel: 'Superadmin', name: 'Supervisión Central', token: 'tok123' }),
    setItem: () => {},
    removeItem: () => {}
  },
  localStorage: fakeStorage,
  addEventListener: () => {},
  fetch: async () => ({ ok: true, json: async () => ({}) })
};

vm.createContext(mockContext);

const scriptBody = adminHtml.includes('const PX=44')
  ? (adminHtml.includes('</script>')
      ? adminHtml.substring(adminHtml.indexOf('const PX=44'), adminHtml.indexOf('</script>', adminHtml.indexOf('const PX=44')))
      : adminHtml)
  : adminHtml;

vm.runInContext(scriptBody, mockContext);

// 3. Test Lifecycle Functions & Calculations
const now = new Date();
const createdJustNow = now.toISOString();

// Create a pre-reserva
const preReserva = {
  id: 'res-test-001',
  folio: 'res-test-001',
  pat: 'Juan Pérez',
  phone: '+56911112222',
  date: '2026-11-10',
  time: '10:00',
  endTime: '12:00',
  shift: 'mañana',
  movil: 'M1',
  fare: 50000,
  abono: 25000,
  st: 'pendiente_abono',
  createdAt: createdJustNow,
  dest: 'Hospital Clínico'
};

// Set in D.svcs and D.blocks
vm.runInContext(`
  D.svcs = [${JSON.stringify(preReserva)}];
  D.blocks = [{
    id: 'blk-test-001',
    reservaId: 'res-test-001',
    date: '2026-11-10',
    shift: 'mañana',
    movil: 'M1',
    reason: 'Pre-reserva pendiente abono 50%',
    status: 'temporal_60m'
  }];
  save();
`, mockContext);

// Test State Badge rendering for Pending Pre-reserva
let badgeHtml = vm.runInContext(`renderReservaStateBadge(D.svcs[0]);`, mockContext);
assert(badgeHtml.includes('Pre-reserva Pendiente'), 'Badge must indicate Pre-reserva Pendiente');
assert(badgeHtml.includes('Expira en:'), 'Badge must include countdown display');
console.log('✓ Pending Pre-reserva badge with TTL countdown verified');

// Test Economic Breakdown rendering
let econHtml = vm.runInContext(`renderReservaEconBreakdown(D.svcs[0]);`, mockContext);
assert(econHtml.includes('$50.000'), 'Econ breakdown must show Total Cotizado $50.000');
assert(econHtml.includes('$25.000'), 'Econ breakdown must show Abono 50% ($25.000) and Saldo Pendiente ($25.000)');
console.log('✓ Economic breakdown (Total, Abono 50%, Saldo Pendiente) verified');

// Test Action Buttons rendering
let cardHtml = vm.runInContext(`renderReservaCard(D.svcs[0]);`, mockContext);
assert(cardHtml.includes('class="btn-confirm-deposit"'), 'Card must have .btn-confirm-deposit');
assert(cardHtml.includes('data-reserva-id="res-test-001"'), 'Button must have data-reserva-id');
assert(cardHtml.includes('openConfirmModal('), 'Button must have openConfirmModal call');
assert(cardHtml.includes('class="btn-cancel-reservation"'), 'Card must have .btn-cancel-reservation');
assert(cardHtml.includes('cancelReservation('), 'Button must have cancelReservation call');
console.log('✓ Reservation Action buttons with required data attributes verified');

// 4. Test Transition: Confirm Deposit (openConfirmModal -> executeConfirmDeposit)
vm.runInContext(`openConfirmModal('res-test-001', 'Juan Pérez', 25000);`, mockContext);
assert.strictEqual(getEl('modalConfirmDepositAdmin').style.display, 'flex', 'Modal must open on openConfirmModal');
getEl('confirmDepositVoucher').value = 'TRANSF-987654';

vm.runInContext(`executeConfirmDeposit();`, mockContext);
const confirmedSvc = vm.runInContext(`D.svcs.find(s => s.id === 'res-test-001');`, mockContext);
assert.strictEqual(confirmedSvc.st, 'Confirmado', 'Service state must transition to Confirmado');
assert.strictEqual(confirmedSvc.paid, 25000, 'Service must have paid = 25000');
assert.strictEqual(confirmedSvc.abonoConfirmado, true, 'abonoConfirmado must be true');
assert.strictEqual(confirmedSvc.abonoVoucher, 'TRANSF-987654', 'Voucher must be stored');
assert.strictEqual(confirmedSvc.montoAbono, 25000, 'montoAbono must be recorded as 25000');
assert.strictEqual(confirmedSvc.saldoPendiente, 25000, 'saldoPendiente must be recorded as 25000');

// Verify Block in D.blocks was made permanent
const blk = vm.runInContext(`D.blocks.find(b => b.reservaId === 'res-test-001');`, mockContext);
assert(blk, 'Block must exist');
assert.strictEqual(blk.status, 'definitivo', 'Block status must become definitivo');
assert.strictEqual(blk.locked, true, 'Block must be locked');

// Verify confirmed badge
const confirmedBadge = vm.runInContext(`renderReservaStateBadge(D.svcs.find(s => s.id === 'res-test-001'));`, mockContext);
assert(confirmedBadge.includes('Confirmada / Bloqueo Activo'), 'Badge must display Confirmada / Bloqueo Activo');
console.log('✓ Transition to Confirmada: atomic agenda lock, permanent block, and field balance verified');

// 5. Test Transition: Cancellation / Release of Cupo
vm.runInContext(`cancelReservation('res-test-001');`, mockContext);
const cancelledSvc = vm.runInContext(`D.svcs.find(s => s.id === 'res-test-001');`, mockContext);
assert.strictEqual(cancelledSvc.st, 'Cancelado', 'Service state must transition to Cancelado');

// Verify Block in D.blocks was removed/liberated
const liberatedBlk = vm.runInContext(`D.blocks.find(b => b.reservaId === 'res-test-001');`, mockContext);
assert(!liberatedBlk, 'Block must be removed from D.blocks upon cancellation');

// Verify cancelled badge
const cancelledBadge = vm.runInContext(`renderReservaStateBadge(D.svcs.find(s => s.id === 'res-test-001'));`, mockContext);
assert(cancelledBadge.includes('Cancelada / Expirada'), 'Badge must display Cancelada / Expirada');

// Verify avail() ignores cancelled service
const isAvailable = vm.runInContext(`avail('2026-11-10', 'mañana', 'M1');`, mockContext);
assert.strictEqual(isAvailable, true, 'Slot must be available once reservation is cancelled');
console.log('✓ Transition to Cancelada/Expirada: agenda release, block removal, and avail() restored verified');

// 6. Test Auto-Expiry on 60 min TTL Timeout
const oldCreated = new Date(Date.now() - 65 * 60 * 1000).toISOString(); // 65 min ago
vm.runInContext(`
  D.svcs.push({
    id: 'res-test-expired',
    folio: 'res-test-expired',
    pat: 'Ana Torres',
    date: '2026-11-12',
    time: '15:00',
    shift: 'tarde',
    movil: 'M1',
    fare: 35000,
    abono: 17500,
    st: 'pendiente_abono',
    createdAt: '${oldCreated}'
  });
  D.blocks.push({
    id: 'blk-test-expired',
    reservaId: 'res-test-expired',
    date: '2026-11-12',
    shift: 'tarde',
    movil: 'M1',
    status: 'temporal_60m'
  });
  save();
`, mockContext);

const remSec = vm.runInContext(`getReservationRemainingSeconds(D.svcs.find(s => s.id === 'res-test-expired'));`, mockContext);
assert(remSec <= 0, 'Remaining seconds must be <= 0 for 65-min old reservation');

vm.runInContext(`autoExpireReservation('res-test-expired');`, mockContext);
const autoExpiredSvc = vm.runInContext(`D.svcs.find(s => s.id === 'res-test-expired');`, mockContext);
assert.strictEqual(autoExpiredSvc.st, 'Cancelado', 'Auto-expired reservation must have state Cancelado');
const blkExpired = vm.runInContext(`D.blocks.find(b => b.reservaId === 'res-test-expired');`, mockContext);
assert(!blkExpired, 'Block must be removed on auto-expiration');
console.log('✓ Auto-expiration mechanism (60-min TTL timeout) verified');

// 7. Verify API api/reservas.js registers 60-min block
const apiReservasJs = fs.readFileSync('api/reservas.js', 'utf8');
assert(apiReservasJs.includes('temporal_60m'), 'api/reservas.js must record temporary 60m block status');
assert(apiReservasJs.includes('expires_at'), 'api/reservas.js must compute expires_at (60 min)');
console.log('✓ api/reservas.js automatic registration of 60-min block verified');

console.log('\n🎉 ALL LIFECYCLE, ENGINE AND PERSISTENCE TESTS PASSED SUCCESSFULLY! 🚀');
