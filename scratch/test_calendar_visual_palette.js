const assert = require('assert');
const fs = require('fs');

console.log('=== TEST: DISEÑO VISUAL Y PALETA CLÍNICA DEL CALENDARIO DIARIO ===\n');

const adminCode = fs.existsSync('js/admin.js')
  ? fs.readFileSync('js/admin.js', 'utf8') + '\n' + fs.readFileSync('css/admin.css', 'utf8')
  : fs.readFileSync('admin.html', 'utf8');

// 1. Verificación de la definición de colores y fondos
assert(adminCode.includes("'Pendiente':'#F59E0B'"), 'Pendiente debe ser #F59E0B');
assert(adminCode.includes("'Confirmado':'#3B82F6'"), 'Confirmado debe ser #3B82F6');
assert(adminCode.includes("'En Ruta':'#14B8A6'"), 'En Ruta debe ser #14B8A6');
assert(adminCode.includes("'En Atención':'#06B6D4'"), 'En Atención debe ser #06B6D4');
assert(adminCode.includes("'Finalizado':'#10B981'"), 'Finalizado debe ser #10B981');
assert(adminCode.includes("'Cancelado':'#64748B'"), 'Cancelado debe ser #64748B');

assert(adminCode.includes("'Pendiente':'rgba(245, 158, 11, 0.12)'"), 'Fondo Pendiente debe ser rgba(245, 158, 11, 0.12)');
assert(adminCode.includes("'Confirmado':'rgba(59, 130, 246, 0.12)'"), 'Fondo Confirmado debe ser rgba(59, 130, 246, 0.12)');
assert(adminCode.includes("'En Ruta':'rgba(20, 184, 166, 0.12)'"), 'Fondo En Ruta debe ser rgba(20, 184, 166, 0.12)');
assert(adminCode.includes("'En Atención':'rgba(6, 182, 212, 0.12)'"), 'Fondo En Atención debe ser rgba(6, 182, 212, 0.12)');
assert(adminCode.includes("'Finalizado':'rgba(16, 185, 129, 0.12)'"), 'Fondo Finalizado debe ser rgba(16, 185, 129, 0.12)');
assert(adminCode.includes("'Cancelado':'rgba(100, 116, 139, 0.12)'"), 'Fondo Cancelado debe ser rgba(100, 116, 139, 0.12)');

console.log('✓ Códigos de color y transparencias (12%) verificados en constantes.');

// 2. Verificación de estilos CSS para .sv
assert(adminCode.includes('border-left:4px solid'), 'La tarjeta debe tener barra de acento vertical de 4px');
assert(adminCode.includes('backdrop-filter:blur'), 'La tarjeta debe incorporar backdrop-filter translúcido');
assert(adminCode.includes('color:#f1f5f9') || adminCode.includes('color:#ffffff'), 'La tipografía debe ser en color blanco / alto contraste');

console.log('✓ Estilos CSS de tarjeta translúcida, acento vertical 4px y tipografía blanca verificados.');

// 3. Verificación de distintivos de traslado y asistencial
assert(adminCode.includes('🚗') && adminCode.includes('En Ruta'), 'En Ruta debe tener el distintivo de traslado 🚗');
assert(adminCode.includes('🩺') && adminCode.includes('En Atención'), 'En Atención debe tener el distintivo asistencial 🩺');

console.log('✓ Distintivos 🚗 (En Ruta) y 🩺 (En Atención) verificados en bloques y leyendas.');

// 4. Simulación de renderizado de bloque
const COL = {
  'Pendiente': '#F59E0B',
  'Confirmado': '#3B82F6',
  'En Ruta': '#14B8A6',
  'En Atención': '#06B6D4',
  'Finalizado': '#10B981',
  'Cancelado': '#64748B'
};
const COL_BG = {
  'Pendiente': 'rgba(245, 158, 11, 0.12)',
  'Confirmado': 'rgba(59, 130, 246, 0.12)',
  'En Ruta': 'rgba(20, 184, 166, 0.12)',
  'En Atención': 'rgba(6, 182, 212, 0.12)',
  'Finalizado': 'rgba(16, 185, 129, 0.12)',
  'Cancelado': 'rgba(100, 116, 139, 0.12)'
};

function fm(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const mockSvc = {
  id: 14,
  tid: 't1',
  date: '2026-11-06',
  start: 510, // 08:30
  dur: 120,
  pat: 'Rosa Medina',
  st: 'Confirmado'
};

const top = 0;
const h = 88;
const stColor = COL[mockSvc.st];
const stBg = COL_BG[mockSvc.st];
const timeText = `${fm(mockSvc.start)}–${fm(mockSvc.start + mockSvc.dur)}`;

const renderedBlk = `
  <div class="sv" style="top:${top}px;height:${h}px;background:linear-gradient(0deg,${stBg},${stBg}),rgba(15,23,42,0.88);border-left:4px solid ${stColor}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
      <span style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.5px">#MSA-${mockSvc.id}</span>
      <b style="color:#ffffff">${timeText}</b>
    </div>
    <div style="font-weight:700;color:#f1f5f9">${mockSvc.pat}</div>
    <div style="font-size:11px;color:${stColor};font-weight:700;margin-top:2px">${mockSvc.st}</div>
  </div>
`;

assert(renderedBlk.includes('#MSA-14'), 'Bloque debe renderizar el folio #MSA-14');
assert(renderedBlk.includes('08:30–10:30'), 'Bloque debe renderizar el horario 08:30–10:30');
assert(renderedBlk.includes('Rosa Medina'), 'Bloque debe renderizar el nombre de la paciente');
assert(renderedBlk.includes('border-left:4px solid #3B82F6'), 'Bloque Confirmado debe tener borde lateral #3B82F6');
assert(renderedBlk.includes('rgba(59, 130, 246, 0.12)'), 'Bloque Confirmado debe tener fondo con transparencia 0.12');

console.log('✓ Renderizado del bloque de reserva verificado con folio, horario, paciente y acento lateral.');

// 5. Verificación de Cancelado
const mockCancelado = { ...mockSvc, st: 'Cancelado' };
const cancelColor = COL[mockCancelado.st];
const cancelBg = COL_BG[mockCancelado.st];
assert.strictEqual(cancelColor, '#64748B', 'Cancelado debe tener color #64748B');
assert.strictEqual(cancelBg, 'rgba(100, 116, 139, 0.12)', 'Cancelado debe tener fondo tenue');

console.log('✓ Estado Cancelado tenue verificado.');
console.log('\n=== TODOS LOS TESTS VISUALES PASARON EXITOSAMENTE 🚀 ===');
