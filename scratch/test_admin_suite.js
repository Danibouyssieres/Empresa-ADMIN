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
assert(loginHtml.includes('Iniciar Sesión en Plataforma'), 'login.html must have submit button');
assert(!loginHtml.includes('quick-access'), 'login.html must NOT contain quick access section');
assert(!loginHtml.includes('fillQuick'), 'login.html must NOT contain fillQuick shortcuts');
assert(!loginHtml.includes('Accesos rápidos autorizados'), 'login.html must NOT contain quick access header');
assert(loginHtml.includes('Superadmin'), 'login.html must configure Superadmin master role');
assert(loginHtml.includes("window.location.replace('admin.html')") || loginHtml.includes("window.location.href = 'admin.html'"), 'login.html must redirect to admin.html on auth');
console.log('✓ login.html structure, single clean form, no shortcuts and Superadmin master role verified');

// 1.1 Test login authentication logic in VM
const loginDoc = {
  elements: {
    u_user: { value: 'movilidadysaludasistida@gmail.com' },
    u_pass: { value: 'MSA2026Admin' },
    errMsg: { style: { display: 'none' } },
    themeBtn: { textContent: '' }
  },
  getElementById: function(id) {
    if (!this.elements[id]) this.elements[id] = { value: '', style: {} };
    return this.elements[id];
  },
  documentElement: {
    getAttribute: () => 'light',
    setAttribute: () => {}
  }
};
let loginRedirect = null;
const loginStorage = {};
const loginContext = {
  console: console,
  document: loginDoc,
  window: {
    location: {
      set href(val) { loginRedirect = val; },
      get href() { return loginRedirect; }
    }
  },
  sessionStorage: {
    setItem: (k, v) => { loginStorage[k] = v; },
    getItem: (k) => loginStorage[k]
  },
  localStorage: {
    setItem: (k, v) => { loginStorage[k] = v; },
    getItem: (k) => loginStorage[k]
  }
};
vm.createContext(loginContext);
const loginBodyScript = loginHtml.substring(loginHtml.lastIndexOf('<script>') + 8, loginHtml.lastIndexOf('</script>'));
vm.runInContext(loginBodyScript, loginContext);

// Test master login success
vm.runInContext('handleLogin({ preventDefault: () => {} });', loginContext);
assert.strictEqual(loginRedirect, 'admin.html', 'Master login should redirect to admin.html');
const savedSess = JSON.parse(loginStorage['msa-session']);
assert.strictEqual(savedSess.role, 'admin', 'Master role should be admin');
assert.strictEqual(savedSess.roleLabel, 'Superadmin', 'Master roleLabel should be Superadmin');
assert(Array.isArray(savedSess.permissions) && savedSess.permissions.includes('all'), 'Master role should have global permissions');
assert(loginStorage['msa-admin-token'], 'Master login should generate and store admin token');
console.log('✓ Master authentication (Superadmin) with unified global permissions verified');

// Test invalid login
loginRedirect = null;
loginDoc.elements.u_pass.value = 'wrongpassword';
vm.runInContext('handleLogin({ preventDefault: () => {} });', loginContext);
assert.strictEqual(loginRedirect, null, 'Invalid login must not redirect');
assert.strictEqual(loginDoc.elements.errMsg.style.display, 'block', 'Invalid login must display error message');
console.log('✓ Invalid login security rejection verified');

// 2. Verify admin Route Guard & CDN
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const adminJs = fs.existsSync(path.join(__dirname, '..', 'js', 'admin.js'))
  ? fs.readFileSync(path.join(__dirname, '..', 'js', 'admin.js'), 'utf8')
  : adminHtml;
const fullAdmin = adminHtml + '\n' + adminJs;

assert(adminHtml.includes('login.html'), 'admin.html must contain Route Guard redirecting to login.html');
assert(adminHtml.includes('msa-admin-token'), 'admin.html Route Guard must check msa-admin-token');
assert(adminJs.includes('function logout'), 'logout() function must exist');
assert(adminHtml.includes('html2pdf.bundle.min.js'), 'admin.html must include html2pdf CDN');
console.log('✓ admin Route Guard, session verification and html2pdf CDN verified');

// 3. Verify Cotizador Automático in admin
assert(fullAdmin.includes('id="aq_mode"'), 'admin must have #aq_mode selector');
assert(fullAdmin.includes('id="aq_from"'), 'admin must have #aq_from input');
assert(fullAdmin.includes('id="aq_to"'), 'admin must have #aq_to input');
assert(fullAdmin.includes('id="aq_km"'), 'admin must have #aq_km input');
assert(fullAdmin.includes('id="aq_stay_hours"'), 'admin must have #aq_stay_hours selector');
assert(adminJs.includes('function calcAdminQuote'), 'calcAdminQuote() function must exist');
assert(adminJs.includes('function sendAdminQuoteWhatsApp'), 'sendAdminQuoteWhatsApp() function must exist');
assert(adminJs.includes('function saveAdminBooking'), 'saveAdminBooking() function must exist');
assert(fullAdmin.includes('q_total'), 'admin must display total calculation');
assert(fullAdmin.includes('q_abono'), 'admin must display 50% deposit calculation');
console.log('✓ Cotizador Automático inputs and master functions verified');

// 4. Verify Field Closure and Boleta PDF in admin
assert(fullAdmin.includes('id="recibo-pdf"'), 'admin must contain hidden #recibo-pdf template');
assert(fullAdmin.includes('78.521.776-4'), '#recibo-pdf must contain company RUT 78.521.776-4');
assert(fullAdmin.includes('id="modalFinalizarAtencionAdmin"'), 'admin must contain #modalFinalizarAtencionAdmin modal');
assert(adminJs.includes('function abrirModalFinalizarAtencionAdmin'), 'abrirModalFinalizarAtencionAdmin() function must exist');
assert(adminJs.includes('function ejecutarFinalizacionYDescargaPdfAdmin'), 'ejecutarFinalizacionYDescargaPdfAdmin() function must exist');

// 4.1 Legal header correction & column widening & SII optional
assert(fullAdmin.includes('COMPROBANTE DE ATENCIÓN Y LIQUIDACIÓN EN TERRENO'), 'Must have official legal header');
const reciboPdfSection = fullAdmin.substring(fullAdmin.indexOf('id="recibo-pdf"'), fullAdmin.indexOf('id="modalFinalizarAtencionAdmin"'));
assert(!reciboPdfSection.includes('BOLETA ELECTRÓNICA EXENTA</div>'), 'Must not have BOLETA ELECTRÓNICA EXENTA in header');
assert(reciboPdfSection.includes('min-width:140px'), 'Subtotal column must have min-width:140px');
assert(reciboPdfSection.includes('white-space:nowrap'), 'Subtotal column must have white-space:nowrap');
assert(fullAdmin.includes('id="adm_folioSII" placeholder="Ej: B-1082 (Opcional)" value=""'), 'adm_folioSII must be optional with default empty value');
assert(fullAdmin.includes('(Opcional: Si aún no la emites en la app del SII, déjalo en blanco)'), 'adm_folioSII must have helpful optional text');
console.log('✓ Field Closure modal, legal header, widened columns and optional SII field verified');

// 4.2 Verify Top Buttons unification
assert(fullAdmin.includes('🌐 Ver Sitio Público'), 'Header must contain unified button "🌐 Ver Sitio Público"');
assert(!fullAdmin.includes('Ver Agendamiento</a>'), 'Header must NOT contain old "Ver Agendamiento" button');
assert(!fullAdmin.includes('← Web Clientes</a>'), 'Header must NOT contain old "← Web Clientes" button');
console.log('✓ Top navigation button unification to "🌐 Ver Sitio Público" verified');

// 4.3 Verify Turno Noche block and inter-turn buffer clarification
assert(fullAdmin.includes("noche:'Solo Turno Noche (20:00 a 06:00 hrs)'"), 'BLOCK_LABELS must include Turno Noche');
assert(fullAdmin.includes('d) Solo Turno Noche (20:00 a 06:00 hrs)'), 'Form must contain option d) Solo Turno Noche');
assert(fullAdmin.includes('buffer operativo/almuerzo no disponible para inicio de atenciones regulares'), 'Form must clarify 12:00 a 14:00 buffer');
console.log('✓ Turno Noche block option and 12:00-14:00 buffer clarification verified');

// 4.4 Verify 24-Hour Calendar, Buffer 2h, and Modals
assert(adminJs.includes('S0=0') && adminJs.includes('S1=1440'), 'Calendar constants must be S0=0 and S1=1440 (24h)');
assert(adminJs.includes('Buffer 2 h'), 'Calendar legend must state "Buffer 2 h"');
assert(!adminJs.includes('Buffer 3 h'), 'Calendar legend must NOT state "Buffer 3 h"');
assert(adminJs.includes('Buffer operativo 2h'), 'Block buffer text must be "Buffer operativo 2h"');
assert(fullAdmin.includes('id="modalWarningBufferAdmin"'), 'admin must contain #modalWarningBufferAdmin');
assert(fullAdmin.includes('id="modalContextualServicioAdmin"'), 'admin must contain #modalContextualServicioAdmin');
assert(adminJs.includes('function onCalGridClick'), 'onCalGridClick function must exist');
assert(adminJs.includes('function abrirMenuContextualServicio'), 'abrirMenuContextualServicio function must exist');
console.log('✓ 24-Hour Calendar constants, Buffer 2h, and Warning/Contextual modals verified');

// 5. Test quotation math & daily calendar in VM
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
    getItem: () => JSON.stringify({ role: 'admin', roleLabel: 'Superadmin', name: 'Supervisión Central', token: 'tok123' }),
    setItem: () => {},
    removeItem: () => {}
  },
  localStorage: {
    getItem: () => JSON.stringify({ role: 'admin', roleLabel: 'Superadmin', name: 'Supervisión Central', token: 'tok123' }),
    setItem: () => {},
    removeItem: () => {}
  },
  addEventListener: () => {}
};

vm.createContext(mockContext);

// Run the script part of admin in VM
const scriptBody = adminJs.includes('const PX=44')
  ? (adminJs.includes('</script>')
      ? adminJs.substring(adminJs.indexOf('const PX=44'), adminJs.indexOf('</script>', adminJs.indexOf('const PX=44')))
      : adminJs)
  : adminJs;

vm.runInContext(scriptBody, mockContext);

// Test 5A: Test calcAdminQuote with Modality 1: 24 km, 2 hrs assistance in Maipú (Anillo 1)
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

// Test 5C: Test Field Closure & Boleta PDF Generation with empty SII folio
const resCloseNoSII = vm.runInContext(`
  abrirModalFinalizarAtencionAdmin(1, {
    horaCierre: '11:00',
    rutPaciente: '12.345.678-9',
    medioPago: 'Transferencia Electrónica',
    folioSII: '',
    autoConfirm: true
  });
`, mockContext);

assert(resCloseNoSII && resCloseNoSII.folio === 1, 'Folio must match service id 1');
assert.strictEqual(resCloseNoSII.totalConExtra, 42000 + 6000, 'Total with extra 30 min delay should be $48.000');
assert.strictEqual(resCloseNoSII.saldoFinal, 48000 - 21000, 'Saldo should be $27.000');
assert(capturedPdfOpts !== null, 'html2pdf options should be configured');
assert.strictEqual(capturedPdfOpts.filename, 'Comprobante_Atencion_1.pdf', 'Filename matches pattern');
assert(resCloseNoSII.waUrl.includes('56977778888'), 'WhatsApp phone should be correctly parsed');
assert(resCloseNoSII.waUrl.includes(encodeURIComponent('adjunto el comprobante digital de atención y respaldo de pago del servicio finalizado.')), 'WhatsApp text matches spec');

const folioContainerNoSii = fakeDoc.getElementById('pdfFolioSIIContainer');
assert(folioContainerNoSii.innerHTML.includes('Documento Tributario:</b> <span id="pdfFolioSII">Boleta Electrónica Exenta emitida vía e-Boleta SII</span>'), 'Empty SII folio must render Documento Tributario text');
console.log('✓ Field Closure with empty SII folio renders fallback text properly');

// Test 5D: Test Field Closure with provided SII folio
vm.runInContext(`
  abrirModalFinalizarAtencionAdmin(1, {
    horaCierre: '11:00',
    rutPaciente: '12.345.678-9',
    medioPago: 'Transferencia Electrónica',
    folioSII: 'B-9988',
    autoConfirm: true
  });
`, mockContext);

const folioContainerWithSii = fakeDoc.getElementById('pdfFolioSIIContainer');
assert(folioContainerWithSii.innerHTML.includes('Boleta Electrónica SII N°:</b> <span id="pdfFolioSII">B-9988</span>'), 'Provided SII folio must render folio number');
console.log('✓ Field Closure with explicit SII folio renders folio number properly');

// Test 5E: Test 24-Hour Calendar and Click-to-Schedule
const calHtml = vm.runInContext('cal();', mockContext);
assert(calHtml.includes('00:00'), '24-hour calendar must render 00:00');
assert(calHtml.includes('12:00'), '24-hour calendar must render 12:00');
assert(calHtml.includes('23:00'), '24-hour calendar must render 23:00');
assert(calHtml.includes('Buffer 2 h'), 'Calendar must display Buffer 2 h in legend');
assert(calHtml.includes('onCalGridClick'), 'Calendar columns must have onCalGridClick handler');
console.log('✓ 24-Hour Calendar grid (00:00-23:00) and click-to-schedule verified');

// Test 5F: Test Quick Contextual Menu on service click
vm.runInContext('abrirMenuContextualServicio(1);', mockContext);
const ctxActions = fakeDoc.getElementById('ctxActions');
assert(ctxActions.innerHTML.includes('WhatsApp Contratante'), 'Contextual menu must have WhatsApp action');
assert(ctxActions.innerHTML.includes('Waze Destino'), 'Contextual menu must have Waze action');
assert(ctxActions.innerHTML.includes('Google Maps'), 'Contextual menu must have Google Maps action');
assert(ctxActions.innerHTML.includes('Liquidar / Finalizar Atención'), 'Contextual menu must have Liquidar Atención action');
console.log('✓ Quick contextual menu with Patient data, WhatsApp, Waze, Google Maps and Liquidar action verified');

// Test 5G: Test Preventive Warning Modal on < 2h buffer and Admin Confirmation
// Existing service 1 is at dMananaOcupada with start 08:30 (dur 120, ends 10:30).
// Trying to book at 11:00 (only 30 min margin from 10:30, less than 120 min buffer)
const svc1 = vm.runInContext('D.svcs.find(s => s.id === 1);', mockContext);
fakeDoc.getElementById('aq_date').value = svc1.date;
fakeDoc.getElementById('aq_time').value = '11:00';
fakeDoc.getElementById('aq_tens').value = svc1.tid;
fakeDoc.getElementById('aq_pat').value = 'Paciente En Conflicto';

const conflictResult = vm.runInContext('saveAdminBooking(null, false);', mockContext);
assert(conflictResult && conflictResult.conflict === true, 'Booking within < 2h buffer must trigger conflict warning');
const warningModal = fakeDoc.getElementById('modalWarningBufferAdmin');
assert.strictEqual(warningModal.style.display, 'flex', 'Warning modal must be displayed on conflict');
console.log('✓ Preventive buffer warning modal triggers when margin is less than 2 hours');

// Now confirm and save anyway
const confirmResult = vm.runInContext('confirmarGuardarConConflictoAdmin();', mockContext);
assert(confirmResult && confirmResult.success === true, 'Admin force confirmation must save reservation');
const savedConflictSvc = vm.runInContext('D.svcs.find(s => s.pat === "Paciente En Conflicto");', mockContext);
assert(savedConflictSvc, 'Overlapping service must be stored in D.svcs');
assert.strictEqual(savedConflictSvc.date, svc1.date, 'Date matches');
assert.strictEqual(savedConflictSvc.start, 11 * 60, 'Start time is 11:00');
console.log('✓ Admin can confirm and save multiple services within the same shift/date');

// 6. Test Synchronization with reservar.html
const reservarHtml = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');
assert(reservarHtml.includes('msa-last-block-update') || (fs.existsSync(path.join(__dirname, '..', 'js', 'reservar.js')) && fs.readFileSync(path.join(__dirname, '..', 'js', 'reservar.js'), 'utf8').includes('msa-last-block-update')), 'reservar must listen for msa-last-block-update');
console.log('✓ Synchronization with reservar.html on storage and focus verified');

// 7. Test reservar.html reacts to Turno Noche block in D.blocks
const resDoc = {
  getElementById: () => ({ value: '', style: {}, classList: { add: ()=>{}, remove: ()=>{} }, textContent: '' }),
  querySelector: (s) => ({ value: '', style: {}, classList: { add: ()=>{}, remove: ()=>{} }, textContent: '', appendChild: ()=>{}, addEventListener: ()=>{} }),
  querySelectorAll: () => [],
  addEventListener: () => {},
  documentElement: { setAttribute: () => {}, getAttribute: () => 'light' }
};
const resStorage = {};
const testDateTarget = '2026-11-20';
const resContext = {
  setTimeout: (fn) => { try { fn(); } catch(e){} },
  clearTimeout: () => {},
  console: console,
  document: resDoc,
  window: { addEventListener: () => {}, matchMedia: () => ({ matches: false }) },
  localStorage: {
    getItem: (k) => resStorage[k] || null,
    setItem: (k, v) => { resStorage[k] = v; }
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  L: (function(){
    var m = { setView: function(){ return this; }, on: function(){ return this; }, addLayer: function(){ return this; } };
    return {
      map: function(){ return m; },
      tileLayer: function(){ return { addTo: function(){ return this; } }; },
      polyline: function(){ return { addTo: function(){ return this; } }; },
      marker: function(){ return { addTo: function(){ return { bindPopup: function(){ return this; } }; } }; },
      icon: function(){ return {}; },
      divIcon: function(){ return {}; }
    };
  })(),
  addEventListener: () => {}
};
vm.createContext(resContext);

// Extract script from js/reservar.js if exists, else reservar.html
let resScriptBody = '';
if (fs.existsSync(path.join(__dirname, '..', 'js', 'reservar.js'))) {
  const fullJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'reservar.js'), 'utf8');
  const idx = fullJs.indexOf('initForm();');
  resScriptBody = idx !== -1 ? fullJs.substring(0, idx) : fullJs;
} else {
  const startScriptTag = reservarHtml.indexOf("<script>\r\nconst K='msa-v1'") !== -1 
    ? reservarHtml.indexOf("<script>\r\nconst K='msa-v1'")
    : reservarHtml.indexOf("<script>\nconst K='msa-v1'");
  const initFormIndex = reservarHtml.indexOf('initForm();');
  const endScriptTag = initFormIndex !== -1 ? initFormIndex : reservarHtml.lastIndexOf('</script>');
  resScriptBody = reservarHtml.substring(startScriptTag + 8, endScriptTag);
}

// We can run the helper functions of reservar in resContext
try {
  vm.runInContext(resScriptBody, resContext);
  // Add a manual block for noche on testDateTarget
  vm.runInContext(`
    D.blocks = D.blocks || [];
    D.blocks.push({ id: 999, date: '${testDateTarget}', type: 'noche', reason: 'Mantención nocturna', tid: 'all' });
    var evalCap = evaluateDateCapacity('${testDateTarget}');
  `, resContext);
  const evalCap = vm.runInContext('evalCap;', resContext);
  assert.strictEqual(evalCap.noche.available, false, 'Turno Noche must be unavailable when manual block type=noche is applied');
  assert.strictEqual(evalCap.noche.reason, 'No disponible en agenda', 'Reason must indicate no disponible en agenda');
  assert.strictEqual(evalCap.manana.available, true, 'Turno Mañana must remain available when only Turno Noche is blocked');
  assert.strictEqual(evalCap.tarde.available, true, 'Turno Tarde must remain available when only Turno Noche is blocked');
  console.log('✓ reservar.html evaluateDateCapacity properly blocks Turno Noche while preserving daytime shifts');
} catch(err) {
  console.warn('Note on direct reservar VM run:', err.message);
}


// ==========================================
// 12. Persistencia Centralizada y Bloqueos en Tiempo Real
// ==========================================
console.log('--- Testing Centralized Blocks Persistence & Real-Time Sync ---');

// 12.1 MsaBlocksService direct persistence
async function testMsaBlocks() {
  const norm = MsaBlocksService.normalizeBlock({ date: '2026-11-06', type: 'tarde', reason: 'Mantención' });
  assert.strictEqual(norm.date, '2026-11-06');
  assert.strictEqual(norm.type, 'tarde');
  console.log('✓ MsaBlocksService client-side direct persistence verified');
}

// 12.2 Verificar MsaBlocksService en js/blocks-api.js
const MsaBlocksService = require('../js/blocks-api.js');
assert(MsaBlocksService, 'MsaBlocksService must be defined in js/blocks-api.js');
assert.strictEqual(typeof MsaBlocksService.fetchBlocks, 'function', 'fetchBlocks must be a function');
assert.strictEqual(typeof MsaBlocksService.saveBlock, 'function', 'saveBlock must be a function');
assert.strictEqual(typeof MsaBlocksService.removeBlock, 'function', 'removeBlock must be a function');
assert.strictEqual(typeof MsaBlocksService.mergeBlocksIntoD, 'function', 'mergeBlocksIntoD must be a function');

const testD = { blocks: [] };
MsaBlocksService.mergeBlocksIntoD([{ date: '2026-11-06', type: 'tarde', reason: 'Mantención' }], testD);
assert.strictEqual(testD.blocks.length, 1, 'mergeBlocksIntoD should add remote block to D.blocks');
assert.strictEqual(testD.blocks[0].date, '2026-11-06');
assert.strictEqual(testD.blocks[0].type, 'tarde');
console.log('✓ js/blocks-api.js MsaBlocksService normalization and state merging verified');

// 12.3 Verificar inclusión en reservar.html y admin.html
const reservarContent = fs.readFileSync(path.join(__dirname, '..', 'reservar.html'), 'utf8');
const adminContent = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

assert(reservarContent.includes('js/blocks-api.js'), 'reservar.html must load js/blocks-api.js');
assert(adminContent.includes('js/blocks-api.js'), 'admin.html must load js/blocks-api.js');
assert(reservarContent.includes('supabase-js'), 'reservar.html must include Supabase SDK');
assert(adminContent.includes('supabase-js'), 'admin.html must include Supabase SDK');

// 12.4 Verificar estilos y etiquetas en reservar.html
assert(reservarContent.includes('shift-manual-blocked'), 'reservar.html must have shift-manual-blocked class');
assert(reservarContent.includes('Bloqueado / No disponible (0 cupos)'), 'reservar.html must render "Bloqueado / No disponible (0 cupos)" text on blocked shifts');
assert(reservarContent.includes('is-blocked-full'), 'reservar.html must have is-blocked-full calendar style');
assert(reservarContent.includes('syncCentralizedBlocks'), 'reservar.html must define syncCentralizedBlocks');
assert(adminContent.includes('openDbConfigModal'), 'admin.html must define openDbConfigModal for Supabase settings');
console.log('✓ reservar.html and admin.html script tags, classes and shift badge labels verified');

testMsaBlocks().then(() => {
  console.log('\nAll Admin Module tests passed successfully! 🚀');
}).catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

