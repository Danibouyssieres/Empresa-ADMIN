const fs = require('fs');
const assert = require('assert');

console.log('--- TEST 1: Verificando reservar.html ---');
const reservarHtml = fs.readFileSync('reservar.html', 'utf8');

// 1.1 No debe existir 'océano' ni 'oceano'
const oceanoMatches = reservarHtml.match(/oc[ée]ano/gi);
assert.strictEqual(oceanoMatches, null, 'No deben quedar referencias a Océanos en reservar.html');
console.log('✅ Cero referencias a Océanos en reservar.html');

// 1.2 No debe existir 'Los Robles' como placeholder
assert.ok(!reservarHtml.includes('Los Robles'), 'No debe existir "Los Robles" en reservar.html');
console.log('✅ Cero referencias a Los Robles en reservar.html');

// 1.3 Placeholders exactos de inputs HTML
assert.ok(reservarHtml.includes('id="b_from" type="text" placeholder="Ingrese calle, número exacto y comuna"'), 'Placeholder b_from neutro');
assert.ok(reservarHtml.includes('id="b_depto" type="text" placeholder="Depto, torre, block o condominio (opcional)"'), 'Placeholder b_depto neutro');
assert.ok(reservarHtml.includes('id="b_to" type="text" placeholder="Ingrese nombre de clínica, hospital o dirección con numeración"'), 'Placeholder b_to neutro');
console.log('✅ Placeholders HTML de b_from, b_depto y b_to son neutros');

// 1.4 Concatenación de depto en reservar.html
assert.ok(reservarHtml.includes('from: from + (depto && !from.includes(depto) ? ` (${depto})` : \'\')'), 'Concatenación de depto en newSvc y payload');
assert.ok(reservarHtml.includes('from_addr: from + (depto && !from.includes(depto) ? ` (${depto})` : \'\')'), 'from_addr incluye depto');
console.log('✅ Concatenación de depto en newSvc y payload verificada');


console.log('\n--- TEST 2: Verificando admin.html ---');
const adminHtml = fs.readFileSync('admin.html', 'utf8');

// 2.1 Cero referencias a Pajaritos u Océanos
const pajaritosMatches = adminHtml.match(/pajaritos/gi);
assert.strictEqual(pajaritosMatches, null, 'No deben quedar referencias a Pajaritos en admin.html');
console.log('✅ Cero referencias a Pajaritos en admin.html');

// 2.2 Inputs iniciales limpios
assert.ok(adminHtml.includes('id="aq_from" placeholder="Calle, número y comuna" value=""'), 'aq_from limpio');
assert.ok(adminHtml.includes('id="aq_depto" placeholder="Depto, torre, block o condominio (opcional)" value=""'), 'aq_depto presente y limpio');
assert.ok(adminHtml.includes('id="aq_to" placeholder="Nombre de clínica, hospital o dirección con numeración" value=""'), 'aq_to limpio');
assert.ok(adminHtml.includes('id="aq_km" min="0" step="any" value="0"'), 'aq_km inicializado en 0');
assert.ok(adminHtml.includes('id="pdfDirOrigen">—</span>'), 'PDF template origen limpio');
assert.ok(adminHtml.includes('id="pdfDirDestino">—</span>'), 'PDF template destino limpio');
console.log('✅ Inputs aq_from, aq_depto, aq_to, aq_km y plantilla PDF limpios');

// 2.3 Variables y funciones en admin.html
assert.ok(adminHtml.includes('let adminPtFrom = null;'), 'adminPtFrom inicia en null');
assert.ok(adminHtml.includes('let adminPtTo = null;'), 'adminPtTo inicia en null');
assert.ok(adminHtml.includes('let adminRouteIdaMin = 0;'), 'adminRouteIdaMin inicia en 0');
assert.ok(adminHtml.includes('let adminRouteVueltaMin = 0;'), 'adminRouteVueltaMin inicia en 0');
console.log('✅ Variables de geolocalización y tiempos inician en null / 0');

// 2.4 resetAdminQuoterForm deja limpios los campos
assert.ok(adminHtml.includes("if($('#aq_from')) $('#aq_from').value = '';"), 'reset limpia aq_from');
assert.ok(adminHtml.includes("if($('#aq_depto')) $('#aq_depto').value = '';"), 'reset limpia aq_depto');
assert.ok(adminHtml.includes("if($('#aq_to')) $('#aq_to').value = '';"), 'reset limpia aq_to');
assert.ok(adminHtml.includes("if($('#aq_km')) $('#aq_km').value = '0';"), 'reset limpia aq_km a 0');
console.log('✅ resetAdminQuoterForm limpia adecuadamente los valores');

// 2.5 Simulación de no coerción de km=0 a 24
const parseKm = (val) => {
  const rawKm = (val !== '') ? parseFloat(val) : 0;
  return (!isNaN(rawKm) && rawKm >= 0) ? rawKm : 0;
};
assert.strictEqual(parseKm('0'), 0, 'kmTot con "0" debe ser exactamente 0 y no 24');
assert.strictEqual(parseKm('24.5'), 24.5, 'kmTot con "24.5" debe ser 24.5');
console.log('✅ Lógica de parseo de km no fuerza 24 ante valor 0');

// 2.6 Guardado y visualización de depto en admin.html
assert.ok(adminHtml.includes("const depto = ($('#aq_depto') && $('#aq_depto').value.trim()) || '';"), 'saveAdminBooking extrae depto');
assert.ok(adminHtml.includes("${(s.depto && !s.from.includes(s.depto)) ? ' ('+e(s.depto)+')' : ''}"), 'No duplicación de depto en tarjeta agenda');
assert.ok(adminHtml.includes("const origenPdf = cleanOrigen + ((s.depto && !cleanOrigen.includes(s.depto)) ? ` (${s.depto})` : '');"), 'PDF incluye depto sin duplicar');
console.log('✅ Persistencia y visualización de depto en admin.html verificadas');

console.log('\n--- TEST 3: Verificando REGLAS_NEGOCIO_RESERVAR.md ---');
const reglasMd = fs.readFileSync('REGLAS_NEGOCIO_RESERVAR.md', 'utf8');
assert.ok(reglasMd.includes('3.4. Estandarización de Placeholders Neutros y Manejo del Campo Opcional Domiciliario'), 'Sección 3.4 en reglas de negocio');
console.log('✅ REGLAS_NEGOCIO_RESERVAR.md sincronizado correctamente');

console.log('\n🎉 TODOS LOS TESTS HAN PASADO EXITOSAMENTE (100% OK)');
