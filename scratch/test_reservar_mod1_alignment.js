const fs = require('fs');
const assert = require('assert');

console.log('--- Testing reservar.html Modality 1 Alignment ---');

const html = fs.readFileSync('reservar.html', 'utf8');

// 1. Duración en selStayDestino
const expectedOptions = [
  { val: '60', text: '1 hora (Consulta estándar / Trámite breve / Compras - Base mínima)' },
  { val: '90', text: '1 hora 30 min (Notaría / Trámites bancarios / Consulta con exámenes)' },
  { val: '120', text: '2 horas (Procedimiento ambulatorio / Diligencias públicas extensas)' },
  { val: '150', text: '2 horas 30 min (Gestiones combinadas)' },
  { val: '180', text: '3 horas (Tratamientos médicos prolongados / Jornadas extensas)' },
  { val: '210', text: '3 horas 30 min (Atención médica de alta complejidad)' },
  { val: '240', text: '4 horas (Procedimiento clínico quirúrgico ambulatorio extenso)' },
  { val: '270', text: '4 horas 30 min (Tratamientos y recuperaciones prolongadas)' },
  { val: '300', text: '5 horas (Procedimientos de media jornada)' },
  { val: '330', text: '5 horas 30 min (Atención clínica continuada)' },
  { val: '360', text: '6 horas (Tope máximo de cobertura ambulatoria)' }
];

expectedOptions.forEach(opt => {
  const snippet = `<option value="${opt.val}"`;
  assert(html.includes(snippet), `selStayDestino must have option value="${opt.val}"`);
  assert(html.includes(opt.text), `selStayDestino must contain label "${opt.text}"`);
});

// Check that 3 hours option does NOT contain "o más"
assert(!html.includes('3 horas o más (Tratamientos médicos prolongados'), '3 hours option must NOT have "o más"');
console.log('✓ selStayDestino options (1h to 6h continuous every 30 min) verified');

// 2. Coherencia en horario hábil
assert(html.includes('<strong>Hábil (Lun a Vie - 06:00 a 20:00)</strong>'), 'Pill jornada habil must say "Hábil (Lun a Vie - 06:00 a 20:00)"');
assert(html.includes("habil: 'Hábil (Lun a Vie - 06:00 a 20:00)'"), 'JORNADA_LABELS.habil must say "Hábil (Lun a Vie - 06:00 a 20:00)"');
console.log('✓ Hábil schedule text (Lun a Vie - 06:00 a 20:00) verified');

console.log('\n🎉 ALL RESERVAR.HTML MODALITY 1 ALIGNMENT TESTS PASSED!\n');
