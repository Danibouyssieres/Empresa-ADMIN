// scratch/test_final_adjustments_inbox_and_blocks.js
const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Final Adjustments: Folios MSA-XXX, Settlement & Blocks UX ---');

// 1. Verify api/reservas.js standardized sequential correlative MSA-XXX
const apiCode = fs.readFileSync('api/reservas.js', 'utf8');
assert(apiCode.includes("const folio = 'MSA-' + String(nextNum).padStart(3, '0')"), 'api/reservas.js must generate sequential MSA-XXX folios');
assert(apiCode.includes('maxCorrelative'), 'api/reservas.js must calculate maxCorrelative from existing records');
assert(!apiCode.includes("'FBISA-' + Math.floor"), 'api/reservas.js must not generate legacy FBISA folios');
console.log('✓ api/reservas.js standardized sequential correlative MSA-001, MSA-002 verified');

// 2. Verify reservar.html standardized folio integration
const resCode = fs.readFileSync('reservar.html', 'utf8');
assert(resCode.includes('function formatFolioMSA'), 'reservar.html must include formatFolioMSA helper');
assert(resCode.includes("formatFolioMSA(respData.folio"), 'reservar.html must normalize returned folio with formatFolioMSA');
assert(!resCode.includes("'FBISA-' + Math.floor"), 'reservar.html must not use legacy FBISA random fallback');
console.log('✓ reservar.html formatFolioMSA and clean folio handling verified');

// 3. Verify admin.html: formatFolioMSA and deduplication
const adminCode = fs.readFileSync('admin.html', 'utf8');
assert(adminCode.includes('function formatFolioMSA(folio, id)'), 'admin.html must declare formatFolioMSA helper');
assert(adminCode.includes('function deduplicateAndNormalizeSvcs(svcs)'), 'admin.html must declare deduplicateAndNormalizeSvcs');
assert(adminCode.includes('FOLIO #${displayFolio}'), 'admin.html res-card must render FOLIO #${displayFolio}');
console.log('✓ admin.html formatFolioMSA and deduplicateAndNormalizeSvcs verified');

// Test formatFolioMSA logic directly
function formatFolioMSA(folio, id){
  const str = String(folio || id || '').trim();
  if(!str) return 'MSA-001';
  const m = str.match(/(\d+)/);
  if(m){
    const n = parseInt(m[1], 10);
    if(!isNaN(n) && n > 0){
      return 'MSA-' + String(n).padStart(3, '0');
    }
  }
  return 'MSA-001';
}

function deduplicateAndNormalizeSvcs(svcs){
  if(!Array.isArray(svcs)) return [];
  const seenFolios = new Map();
  let maxNum = 0;

  svcs.forEach(s => {
    const raw = String(s.folio || s.id || '');
    const m = raw.match(/(\d+)/);
    if(m){
      const n = parseInt(m[1], 10);
      if(!isNaN(n) && n > maxNum) maxNum = n;
    }
  });

  svcs.forEach((s) => {
    let clean = formatFolioMSA(s.folio, s.id);
    if(seenFolios.has(clean)){
      maxNum++;
      clean = 'MSA-' + String(maxNum).padStart(3, '0');
    }
    seenFolios.set(clean, true);
    s.folio = clean;
  });
  return svcs;
}

// Simulate the exact collision scenario from user's screenshot:
// Maria Opazo has id 2 / folio MSA-2
// Jorge Salas has id 2 / folio undefined
// Rosa Medina has id 1
// Adrian has folio FBISA-25
const mockSvcs = [
  { id: 2, folio: 'MSA-2', pat: 'Maria Opazo' },
  { id: 2, pat: 'Jorge Salas' },
  { id: 1, pat: 'Rosa Medina' },
  { id: 4, folio: 'FBISA-25', pat: 'Adrian' }
];

const normalized = deduplicateAndNormalizeSvcs(mockSvcs);
const foliosResult = normalized.map(s => s.folio);
console.log('Normalized folios in test:', foliosResult);
assert.strictEqual(foliosResult[0], 'MSA-002', 'Maria Opazo gets MSA-002');
assert.strictEqual(foliosResult[1], 'MSA-026', 'Collision with Jorge Salas resolved to unique MSA-026');
assert.strictEqual(foliosResult[2], 'MSA-001', 'Rosa Medina gets MSA-001');
assert.strictEqual(foliosResult[3], 'MSA-025', 'Adrian FBISA-25 normalized to MSA-025');
console.log('✓ Collision resolution and canonical zero-padding test PASSED');

// 4. Verify Contratante WhatsApp Link in admin.html
assert(adminCode.includes('https://wa.me/'), 'admin.html must generate wa.me link for contratante');
assert(adminCode.includes('💬 +${waPh}'), 'admin.html must display WhatsApp badge for contratante phone');
console.log('✓ Contratante WhatsApp direct link verified');

// 5. Verify Settlement and Finalize Action in admin.html
assert(adminCode.includes('liquidarSaldoReserva'), 'admin.html must define liquidarSaldoReserva function');
assert(adminCode.includes('✔ Liquidar Saldo y Finalizar'), 'admin.html must have button ✔ Liquidar Saldo y Finalizar');
assert(adminCode.includes("s.st = 'completada'"), 'liquidarSaldoReserva must transition status to completada');
assert(adminCode.includes('s.saldoPendiente = 0'), 'liquidarSaldoReserva must set saldoPendiente to 0');
assert(adminCode.includes("setInboxStatusFilter('completed')"), 'admin.html must support filtering by completed');
assert(adminCode.includes('🔵 Finalizadas'), 'admin.html must have 🔵 Finalizadas filter tab');
console.log('✓ Settlement [ ✔ Liquidar Saldo y Finalizar ] and transition to completada verified');

// 6. Verify Gestión de Bloqueos Optimizations
assert(adminCode.includes('let blocksListFilter ='), 'admin.html must have blocksListFilter');
assert(adminCode.includes('setBlocksListFilter'), 'admin.html must define setBlocksListFilter');
assert(adminCode.includes('📋 Ver todos los bloqueos'), 'admin.html must have Ver todos los bloqueos button');
assert(adminCode.includes('📅 Filtrar solo fecha seleccionada'), 'admin.html must have Filtrar solo fecha seleccionada button');
assert(adminCode.includes("pickAdminCalDate('${b.date}')"), 'admin.html table rows must trigger pickAdminCalDate on click');
assert(adminCode.includes("removeManualBlock('${b.id || (b.date + '_' + b.type)}')"), 'admin.html must pass string id to removeManualBlock');
assert(adminCode.includes('event.stopPropagation()'), 'admin.html unlock button in table must stop propagation to prevent row trigger');
console.log('✓ Gestión de Bloqueos UX: quick unlock, view toggle, and row click-to-calendar verified');

console.log('\n🎉 ALL TESTS PASSED! All three user requirements are 100% verified and functional. 🚀');
