const assert = require('assert');
const fs = require('fs');

console.log('=== TEST: AJUSTES VISUALES EN PESTAÑA GESTIÓN DE DISPONIBILIDAD Y BLOQUEOS ===\n');

const adminCode = fs.existsSync('js/admin.js')
  ? fs.readFileSync('js/admin.js', 'utf8') + '\n' + fs.readFileSync('css/admin.css', 'utf8')
  : fs.readFileSync('admin.html', 'utf8');

// 1. Unificación cromática: No debe existir #4338ca en el etiquetado de bloqueos
assert(!adminCode.includes('#4338ca'), 'No debe existir el color azul #4338ca en los bloqueos');
assert(adminCode.includes("background:${b.type==='full'?'#EF4444':'#F59E0B'}"), 'Bloqueos de turno deben usar #F59E0B y día completo #EF4444');
console.log('✓ Unificación cromática: Color azul nocturno eliminado y reemplazado por Ámbar #F59E0B.');

// 2. Distintivos de turno e íconos limpios
assert(adminCode.includes('☀️ Mañana'), 'Debe incluir ☀️ Mañana');
assert(adminCode.includes('⛅ Tarde'), 'Debe incluir ⛅ Tarde');
assert(adminCode.includes('🌙 Noche'), 'Debe incluir 🌙 Noche');
assert(adminCode.includes('🔴 Día completo') || adminCode.includes('🔴 Cerrado'), 'Debe incluir distintivo 🔴 para día completo');
console.log('✓ Íconos y distintivos limpios (☀️ Mañana, ⛅ Tarde, 🌙 Noche, 🔴 Día completo) verificados.');

// 3. Celdas del calendario mensual: Dot verde y micro-píldoras
assert(adminCode.includes('mcal-svc-dot'), 'Debe existir la clase mcal-svc-dot para indicador tipo dot');
assert(adminCode.includes('background:#10B981') && adminCode.includes('mcal-svc-dot'), 'El dot de reservas debe ser verde #10B981');
assert(adminCode.includes('mcal-day-num'), 'El número de día debe tener clase mcal-day-num para alto contraste');
console.log('✓ Optimización visual de celdas: Indicador dot verde y tipografía de día contrastada.');

// 4. Botón Desbloquear: Estilo Outline y hover rojo
assert(adminCode.includes('.unlock-btn{background:transparent;color:#EF4444;border:1px solid #EF4444'), 'Botón desbloquear debe tener estilo outline transparente con borde rojo #EF4444');
assert(adminCode.includes('.unlock-btn:hover{background:#EF4444;color:#fff'), 'Botón desbloquear debe rellenarse de rojo en hover');
console.log('✓ Estilo outline para botón Desbloquear y hover destructivo verificados.');

// 5. Leyenda inferior consistente
assert(adminCode.includes('🔴 Día completo cerrado'), 'Leyenda debe tener 🔴 Día completo cerrado');
assert(adminCode.includes('🟠 Turno específico bloqueado (Mañana / Tarde / Noche)'), 'Leyenda debe tener 🟠 Turno específico bloqueado');
assert(adminCode.includes('🟢 Día con reservas agendadas'), 'Leyenda debe tener 🟢 Día con reservas agendadas');
assert(adminCode.includes('#EF4444') && adminCode.includes('#F59E0B') && adminCode.includes('#10B981'), 'Leyenda debe usar exactamente los códigos #EF4444, #F59E0B y #10B981');
console.log('✓ Leyenda inferior consistente con los tres estados y colores oficiales.');

console.log('\n=== TODOS LOS TESTS DE GESTIÓN DE BLOQUEOS PASARON EXITOSAMENTE 🚀 ===');
