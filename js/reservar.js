const K='msa-v1',TODAY='2026-10-17',BUF=180,TM_K='msa-theme',WA_NUM='56929990095',PRICE_PER_KM=1000;
const MOB = [
  'Autovalente',
  'Bastón / andador',
  'Silla de ruedas',
  'Dependencia Severa'
];

const REQ_BY_MODE = {
  '1': [
    { text: 'Ficha de Valoración y Signos Vitales al inicio (Marcada por defecto - Gratuita)', def: true },
    { text: 'Apoyo en marcha y traslados internos (Silla de ruedas o andador)', def: false },
    { text: 'Acompañamiento dentro del box médico y toma de notas/recetas', def: false },
    { text: 'Gestión de turnos, admisión en mesón o tótems', def: false },
    { text: 'Asistencia de higiene, confort o acompañamiento a baño en recinto', def: false },
    { text: 'Supervisión de medicación oral (según receta médica vigente aportada por la familia)', def: false }
  ],
  '2': [
    { text: 'Ficha preventiva de signos vitales al inicio (Marcada por defecto - Gratuita)', def: true },
    { text: 'Apoyo físico para subir y bajar del vehículo (Embarque y desembarque seguro)', def: false },
    { text: 'Estiba y traslado de andador o silla manual plegable propia en maletero', def: false },
    { text: 'Solicitud de silla de ruedas o andador de la empresa para uso del familiar dentro del recinto (Sin costo)', def: false }
  ],
  '3': [
    { text: 'Ficha de Valoración y Control de Signos Vitales (Marcada por defecto - Gratuita)', def: true },
    { text: 'Asistencia en aseo diario, confort e higiene / Cambio de pañal', def: false },
    { text: 'Apoyo en transferencias seguras, cambios posturales o pequeñas caminatas en el hogar', def: false },
    { text: 'Asistencia y paciencia en la alimentación y toma de líquidos', def: false },
    { text: 'Supervisión y recordatorio de medicación oral habitual (según prescripción médica de la familia)', def: false },
    { text: 'Acompañamiento, conversación activa y estimulación', def: false },
    { text: 'Acompañamiento peatonal cercano (trámites breves, compras o farmacia a pie)', def: false }
  ],
  '4': [
    { text: 'Control preventivo de signos vitales previo al evento (Marcado por defecto - Gratuito)', def: true },
    { text: 'Asistencia continua en desplazamiento con silla o andador en recinto', def: false },
    { text: 'Asistencia en mesa, higiene/confort y acompañamiento a baños', def: false },
    { text: 'Supervisión de fármacos orales (según indicación de la familia)', def: false }
  ],
  '5': [
    { text: 'Ficha de Valoración y Signos Vitales al inicio del viaje (Marcada por defecto - Gratuita)', def: true },
    { text: 'Monitoreo clínico, signos vitales y confort durante el trayecto en carretera', def: false },
    { text: 'Asistencia en hidratación y supervisión de medicación oral en ruta', def: false },
    { text: 'Apoyo en marcha y traslados internos en Santiago (Silla de ruedas o andador)', def: false },
    { text: 'Acompañamiento continuo dentro del box médico y recepción de indicaciones/recetas', def: false },
    { text: 'Gestión de turnos, admisión y orientación en el recinto asistencial', def: false }
  ]
};
const PRESET_HOURS=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

const SVC_NAMES = {
  '1': '1. Servicio Integral (Asistencia + Traslado)',
  '2': '2. Traslado Exclusivo con Espera',
  '3': '3. Cuidados a Domicilio',
  '4': '4. Acompañamiento en Eventos Sociales',
  '5': '5. Programas Interregionales'
};

// Tarifas horarias exactas según tabla oficial
const RATES = {
  '1': { // Servicio Integral: $1.000/km + hora
    habil:    { hour: 12000, half: 6000 },
    tarde:    { hour: 15000, half: 7500 },
    nocturno: { hour: 18000, half: 9000 }
  },
  '2': { // Traslado Exclusivo con Espera: $1.000/km + hora
    habil:    { hour: 8000,  half: 4000 },
    tarde:    { hour: 10000, half: 5000 },
    nocturno: { hour: 12000, half: 6000 }
  },
  '3': { // c) Cuidados a domicilio (Sin Traslado Vehicular): 2h a 6h (tope de $96.000 en nocturno/festivo) + frac. 30m
    habil:    { hour: 12000, half: 6000 },
    tarde:    { hour: 15000, half: 7500 },
    nocturno: { hour: 18000, half: 9000, pkg: { 6: 96000 }, savings: { 6: 12000 } }
  },
  '4': { // d) Asistencia en eventos (Tarifas planas paquetizadas cerradas para toda la RM)
    sin_traslado: { 4: 65000, 6: 95000 },
    con_traslado: { 4: 95000, 6: 125000 },
    habil:    { hour: 16250, half: 8125 },
    tarde:    { hour: 16250, half: 8125 },
    nocturno: { hour: 16250, half: 8125 }
  },
  '5': { // e) Programas Interregionales (Estándar hasta 4h = $250.000, Crónico/Oncológico hasta 6h = $300.000; extra: $15.000/30min y $25.000/hora)
    habil:    { hour: 25000, half: 15000, pkg: {4: 250000, 6: 300000} },
    tarde:    { hour: 25000, half: 15000, pkg: {4: 250000, 6: 300000} },
    nocturno: { hour: 25000, half: 15000, pkg: {4: 250000, 6: 300000} }
  }
};

const JORNADA_LABELS = {
  habil: 'Hábil (Lun a Vie · 06:00 a 20:00)',
  tarde: 'Fin de Semana (Sáb y Dom · 06:00 a 20:00)',
  nocturno: 'Días Festivos (06:00 a 20:00) y Horario Nocturno (20:00 a 06:00)'
};

function getJornadaLabel(jornada, mode){
  if((mode === '1' || mode === '2') && jornada === 'nocturno'){
    return 'Días Festivos (06:00 a 20:00)';
  }
  return JORNADA_LABELS[jornada] || jornada;
}

const RINGS_DATA = [
  {
    id: 1,
    name: 'Anillo 1 (Maipú y alrededores)',
    minFare: 18000,
    comunas: ['Cerrillos', 'Lo Espejo', 'Lo Prado', 'Maipú', 'Padre Hurtado', 'Pedro Aguirre Cerda', 'Quinta Normal']
  },
  {
    id: 2,
    name: 'Anillo 2 (Santiago Centro, Sur y Poniente)',
    minFare: 35000,
    comunas: ['Calera de Tango', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'Macul', 'Ñuñoa', 'Peñaflor', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Recoleta', 'Renca', 'San Bernardo', 'San Joaquín', 'San Miguel', 'San Ramón', 'Talagante', 'Santiago Centro']
  },
  {
    id: 3,
    name: 'Anillo 3 (Sector Oriente y extremos)',
    minFare: 50000,
    comunas: ['Alhué', 'Buin', 'Colina', 'Curacaví', 'El Monte', 'Isla de Maipo', 'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea', 'María Pinto', 'Melipilla', 'Paine', 'Pirque', 'Puente Alto', 'San José de Maipo', 'San Pedro', 'Tiltil', 'Vitacura']
  }
];

const MEDICAL_PLACES = [
  {name:'Hospital El Carmen (Dr. Luis Valentín Ferrada)', addr:'Av. Camino a Rinconada 1201, Maipú', lat:-33.5048, lon:-70.7712},
  {name:'Hospital San José', addr:'San José 1053, Independencia, Santiago', lat:-33.4163, lon:-70.6531},
  {name:'Hospital Clínico Universidad de Chile (J.J. Aguirre)', addr:'Dr. Carlos Lorca Tobar 999, Independencia, Santiago', lat:-33.4192, lon:-70.6535},
  {name:'Hospital San Juan de Dios', addr:'Huérfanos 3255, Santiago Centro', lat:-33.4426, lon:-70.6791},
  {name:'Hospital Clínico Félix Bulnes', addr:'Av. Mapocho Sur 7432, Cerro Navia, Santiago', lat:-33.4231, lon:-70.7429},
  {name:'Hospital del Salvador', addr:'Av. Salvador 364, Providencia, Santiago', lat:-33.4375, lon:-70.6236},
  {name:'Hospital Barros Luco Trudeau', addr:'Gran Avenida José Miguel Carrera 3204, San Miguel, Santiago', lat:-33.4858, lon:-70.6495},
  {name:'Hospital Dr. Sótero del Río', addr:'Av. Concha y Toro 3459, Puente Alto, Santiago', lat:-33.5769, lon:-70.5811},
  {name:'Hospital Clínico UC Christus (Marcoleta)', addr:'Marcoleta 367, Santiago Centro', lat:-33.4418, lon:-70.6406},
  {name:'Hospital Militar de Santiago', addr:'Av. Alcalde Fernando Castillo Velasco 9100, La Reina', lat:-33.4519, lon:-70.5403},
  {name:'Hospital Clínico de la Fuerza Aérea (FACh)', addr:'Av. Las Condes 8631, Las Condes, Santiago', lat:-33.3948, lon:-70.5453},
  {name:'Instituto Nacional del Cáncer', addr:'Av. Profesor Zañartu 1010, Independencia, Santiago', lat:-33.4178, lon:-70.6524},
  {name:'Instituto Traumatológico', addr:'San Martín 771, Santiago Centro', lat:-33.4357, lon:-70.6584},
  {name:'Instituto Teletón Santiago', addr:'Av. Libertador Bernardo O\'Higgins 4620, Estación Central', lat:-33.4557, lon:-70.6978},
  {name:'Clínica Indisa (Providencia)', addr:'Av. Santa María 1810, Providencia, Santiago', lat:-33.4248, lon:-70.6186},
  {name:'Clínica Indisa (Maipú)', addr:'Av. Américo Vespucio 1077, Maipú, Santiago', lat:-33.4812, lon:-70.7518},
  {name:'Clínica Santa María', addr:'Av. Santa María 0500, Providencia, Santiago', lat:-33.4316, lon:-70.6279},
  {name:'Clínica Dávila (Recoleta)', addr:'Av. Recoleta 464, Recoleta, Santiago', lat:-33.4256, lon:-70.6458},
  {name:'Clínica Dávila Vespucio', addr:'Av. Serafín Zamora 190, La Florida, Santiago', lat:-33.5194, lon:-70.5968},
  {name:'Clínica RedSalud Santiago (Ex Bicentenario)', addr:'Av. Libertador Bernardo O\'Higgins 4850, Estación Central', lat:-33.4563, lon:-70.7012},
  {name:'Clínica Alemana (Vitacura)', addr:'Av. Vitacura 5951, Vitacura, Santiago', lat:-33.3905, lon:-70.5734},
  {name:'Clínica Las Condes', addr:'Estoril 450, Las Condes, Santiago', lat:-33.3827, lon:-70.5305},
  {name:'Clínica Bupa Santiago', addr:'Av. Departamental 1455, La Florida, Santiago', lat:-33.5122, lon:-70.5897}
];

const $ = s => {
  if (s === '#hora-cita-medica') return document.querySelector('#hora-cita-medica') || document.querySelector('#appTimeInput');
  if (s === '#duracion-atencion') return document.querySelector('#duracion-atencion') || document.querySelector('#selStayDestino');
  if (s === '#btnCalcularHora') return document.querySelector('#btnCalcularHora') || document.querySelector('button[onclick*="recalcularTodoElServicio"]') || document.querySelector('button[onclick*="calcSuggestedPickup"]');
  return document.querySelector(s);
};
const $c=n=>'$'+Math.round(n).toLocaleString('es-CL');
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0'),fm=m=>pad(Math.floor(m/60))+':'+pad(m%60),tm=t=>{const[a,b]=t.split(':');return +a*60+ +b};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

function getTheme(){try{const s=localStorage.getItem(TM_K);if(s)return s}catch(x){}return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  try{localStorage.setItem(TM_K,t)}catch(x){}
  const btn=$('#themeBtn');
  if(btn) btn.textContent = t==='dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||getTheme();
  applyTheme(cur==='dark'?'light':'dark');
}

// ===== ESTADO DE CÁLCULO DE TARIFA Y MODALIDAD =====
let currentJornada = 'habil'; // 'habil' | 'tarde' | 'nocturno'
let tarifaPorHora = 12000;
window.tarifaPorHora = 12000;
let selectedInterRegion = 'Región de Valparaíso';
let selectedInterProgram = 4; // 4 = Programa Interregional Estándar ($250.000), 6 = Programa Crónico / Oncológico ($300.000)
let lastInterBreakdown = '';
let detectedRing = null;
let detectedComuna = '';

let ptFrom = null;
let ptTo = null;
let markerFrom = null;
let markerTo = null;
let routeLine = null;
let tripMultiplier = 2; // Fijado siempre en circuito cerrado de Ida y Vuelta (A → B → A)
let lastIdaKm = 0;
let lastVueltaKm = 0;
let lastTotalKm = 0;
let lastKmCost = 0;
let lastFinalTotal = 0;
let lastAbono50 = 0;
let lastTimeCost = 0;
let lastRouteIdaMin = 0;
let lastRouteVueltaMin = 0;
let lastRouteTotalMin = 0;
let pickMode = 'from';
let typeTimers = {from:null, to:null};

// Inicializar Mapa Leaflet
const map = L.map('map').setView([-33.485, -70.74], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

const iconA = L.divIcon({
  className: '',
  html: '<div class="custom-pin a">A</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
const iconB = L.divIcon({
  className: '',
  html: '<div class="custom-pin b">B</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function selectInterRegion(regName){
  if(typeof regName === 'string' && (regName.includes("O'Higgins") || regName.includes("O\'Higgins") || regName.toLowerCase().includes('higgins'))){
    selectedInterRegion = "Región de O'Higgins";
  } else {
    selectedInterRegion = "Región de Valparaíso";
  }
  const isValpo = (selectedInterRegion === "Región de Valparaíso");
  const btnValpo = $('#regBtn_valparaiso');
  const btnOhig = $('#regBtn_ohiggins');
  const chkValpo = $('#regChk_valparaiso');
  const chkOhig = $('#regChk_ohiggins');
  if(btnValpo) btnValpo.classList.toggle('active', isValpo);
  if(btnOhig) btnOhig.classList.toggle('active', !isValpo);
  if(chkValpo) chkValpo.textContent = isValpo ? '✓' : '';
  if(chkOhig) chkOhig.textContent = !isValpo ? '✓' : '';

  const dirVal = $('#dirRegionVal');
  if(dirVal) dirVal.textContent = selectedInterRegion;
  const dirRow = $('#dirRegionRow');
  if(dirRow && ($('#b_svc_type') && $('#b_svc_type').value === '5')) dirRow.style.display = 'flex';

  recalcAll();
}

function setInterProgram(hours){
  selectedInterProgram = hours;
  $('#pillProg_4').classList.toggle('active', hours === 4);
  $('#pillProg_6').classList.toggle('active', hours === 6);
  applyMaxDurationRule();
  recalcAll();
  updateSlots();
  if(typeof calcSuggestedPickup === 'function'){
    calcSuggestedPickup();
  }
}

// ===== REGLAS POR MODALIDAD DE SERVICIO =====
let selectedEventSubMode = 'sin_traslado'; // 'sin_traslado' | 'con_traslado'

function selectEventSubMode(subMode){
  selectedEventSubMode = subMode;
  const isSin = (subMode === 'sin_traslado');
  const btnSin = $('#eventBtn_sin');
  const btnCon = $('#eventBtn_con');
  const chkSin = $('#eventChk_sin');
  const chkCon = $('#eventChk_con');

  if(btnSin) btnSin.classList.toggle('active', isSin);
  if(btnCon) btnCon.classList.toggle('active', !isSin);
  if(chkSin) chkSin.textContent = isSin ? '✓' : '';
  if(chkCon) chkCon.textContent = isSin ? '' : '✓';

  applyModalityVisibility();
  refreshDuration34Options();
  recalcAll();
  if(!isSin && ptFrom && ptTo && isMapEnabledForCurrentState()){
    computeRoute();
  }
}

function isMapEnabledForCurrentState(){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  if(mode === '4') return selectedEventSubMode === 'con_traslado';
  return mode === '1' || mode === '2' || mode === '5';
}

function refreshDuration34Options(resetSelection = false){
  const mode = $('#b_svc_type').value;
  if(mode !== '3' && mode !== '4' && mode !== '5') return;

  const prevH = $('#selHours34') ? $('#selHours34').value : '';
  const prevM = $('#selMins34') ? $('#selMins34').value : '';

  if(mode === '3'){
    let minH = 2;
    if(detectedRing && detectedRing.id === 2) minH = 3;
    else if(detectedRing && detectedRing.id === 3) minH = 4;

    const ringLabel = detectedRing ? detectedRing.name : 'Anillo 1';
    $('#lblHours34').textContent = 'Horas de cuidado continuo requeridas *';

    let opts = '';
    for(let h = minH; h <= 6; h++){
      let tag = '';
      if(h === minH) tag = ` (Piso mínimo ${ringLabel})`;
      else if(h === 6) tag = ' (Tope máximo)';
      opts += `<option value="${h}">${h} horas${tag}</option>`;
    }
    $('#selHours34').innerHTML = opts;

    const prevHNum = +prevH;
    if(!resetSelection && prevHNum >= minH && prevHNum <= 6){
      $('#selHours34').value = String(prevHNum);
    } else {
      $('#selHours34').value = String(minH);
    }

    $('#lblMins34').textContent = 'Bloque adicional de 30 minutos (50% valor hora)';
    $('#selMins34').innerHTML = `
      <option value="0">+ 0 minutos (sin bloque adicional)</option>
      <option value="30">+ 30 minutos extra (1/2 hora)</option>
    `;
    const curH = +$('#selHours34').value;
    if(curH >= 6){
      $('#selMins34').value = '0';
      $('#selMins34').disabled = true;
      $('#selMins34').title = 'Tope máximo de 6 horas alcanzado en la agenda web.';
    } else {
      $('#selMins34').disabled = false;
      $('#selMins34').removeAttribute('title');
      $('#selMins34').value = (!resetSelection && ['0','30'].includes(prevM)) ? prevM : '0';
    }
  } else if(mode === '4'){
    const isCon = selectedEventSubMode === 'con_traslado';
    $('#lblHours34').textContent = isCon
      ? 'Pack Integral Puerta a Puerta (Traslados Ida/Vuelta + Asistencia TENS)'
      : 'Plan de Asistencia en Recinto (Sin Traslado Vehicular)';
    $('#selHours34').innerHTML = isCon ? `
      <option value="4">Pack Base (4 hrs continuas en el recinto + Traslados ida/vuelta) — $95.000</option>
      <option value="6">Pack Total (6 hrs continuas en el recinto + Traslados ida/vuelta) — $125.000</option>
    ` : `
      <option value="4">Plan Base (4 hrs continuas en recinto) — $65.000</option>
      <option value="6">Plan Total (6 hrs continuas en recinto) — $95.000</option>
    `;
    $('#selHours34').value = (!resetSelection && prevH === '6') ? '6' : '4';

    $('#lblMins34').textContent = 'Minutos adicionales (cerrado en planes de evento)';
    $('#selMins34').innerHTML = `<option value="0">+ 0 min (incluido en paquete)</option>`;
    $('#selMins34').value = '0';
    $('#selMins34').disabled = true;
    $('#selMins34').title = 'Los eventos sociales se contratan en paquetes de tarifa plana cerrada.';
  } else if(mode === '5'){
    $('#lblMins34').textContent = 'Tiempo adicional no programado (en destino)';
    $('#selMins34').innerHTML = `
      <option value="0">+ 0 minutos adicionales ($0)</option>
      <option value="30">+ 30 minutos extra ($15.000)</option>
      <option value="60">+ 1 hora extra ($25.000)</option>
      <option value="90">+ 1 hora 30 min ($40.000)</option>
      <option value="120">+ 2 horas extra ($50.000)</option>
    `;
    $('#selMins34').disabled = false;
    $('#selMins34').removeAttribute('title');
    $('#selMins34').value = (!resetSelection && ['0','30','60','90','120'].includes(prevM)) ? prevM : '0';
  }

  applyMaxDurationRule();
}

function onServiceTypeChange(){
  const mode = $('#b_svc_type').value;
  let nightReset = false;
  if(mode === '5'){
    // Al seleccionar Programas Interregionales, fijar automáticamente Turno Mañana
    selectedBlock = 'manana';
    selectInterRegion(selectedInterRegion);
  } else if((mode === '1' || mode === '2') && selectedBlock === 'noche'){
    // Restablecimiento automático de selección al cambiar a Modalidad 1 o 2
    selectedBlock = null;
    nightReset = true;
    const timeSelect = $('#b_time');
    if(timeSelect) timeSelect.value = '';
  }
  setRouteStatus('');
  refreshDuration34Options(true);
  applyModalityVisibility();
  applyMaxDurationRule();
  recalcAll();
  updateSlots();
  syncJornadaFromSchedule();

  if(nightReset){
    const submitAlert = $('#submitBlockAlert');
    if(submitAlert){
      submitAlert.style.display = 'block';
      submitAlert.innerHTML = `<span>⚠️ <b>Turno Noche no disponible para traslados:</b> Por favor seleccione Turno Mañana (06:00 a 12:00) o Turno Tarde (14:00 a 20:00) en el Paso 1 para continuar.</span>`;
    }
    const stBox = $('#availStatus');
    if(stBox){
      stBox.className = 'status-box';
      stBox.style.display = 'block';
      stBox.innerHTML = `<span>⚠️ <b>Turno Noche no disponible para traslados:</b> Por favor seleccione Turno Mañana o Turno Tarde en el Paso 1.</span>`;
    }
  }
}

function applyModalityVisibility(){
  const mode = $('#b_svc_type').value;
  const showMap = isMapEnabledForCurrentState(); // true en '1', '2', '5' y en '4' (con traslado)
  const showDestAddress = (mode === '1' || mode === '2' || mode === '5' || (mode === '4' && selectedEventSubMode === 'con_traslado'));

  const layoutBox = $('#routeLayoutBox');
  const mapCol = $('#mapColumn');
  const destWrap = $('#destWrap');
  const kmControls = $('#kmCalcControls');
  const bFrom = $('#b_from');
  const bTo = $('#b_to');

  // Mostrar/ocultar selectores exclusivos de Modalidad 4 y 5
  const eventSubBox = $('#eventSubModeBox');
  if(eventSubBox){
    eventSubBox.style.display = (mode === '4') ? 'block' : 'none';
  }
  $('#interregionalRegionBox').style.display = (mode === '5') ? 'block' : 'none';

  // Mostrar tarjetas de Jornada (1 a 3) vs Ocultar en Eventos (4) y Programas Interregionales (5)
  // En Eventos y Programas Interregionales rigen tarifas planas paquetizadas cerradas
  $('#jornadaSelectorWrap').style.display = (mode === '4' || mode === '5') ? 'none' : 'block';
  $('#interProgSelectorWrap').style.display = (mode === '5') ? 'block' : 'none';

  if(mode === '5' || (mode === '4' && selectedEventSubMode === 'con_traslado')){
    setTripMode(2); // Por defecto Ida y Vuelta
  }

  // En Modalidades 1 y 2 (Traslados Clínicos): solo permitir Hábil, Sábados y Domingos/Festivos (06:00 a 20:00). No hay traslados nocturnos.
  const noctPill = $('#pillJornada_nocturno');
  const titleNoct = $('#titleJornadaNocturno');
  const subNoct = $('#subJornadaNocturno');
  const subTarde = $('#subJornadaTarde') || ($('#pillJornada_tarde') ? $('#pillJornada_tarde').querySelector('small') : null);
  if(noctPill) noctPill.classList.remove('disabled');
  if(subTarde) subTarde.textContent = 'Sábados, domingos y festivos estándar';
  if(subNoct) subNoct.textContent = 'Feriados oficiales irrenunciables y cobertura nocturna';

  if(mode === '1' || mode === '2'){
    if(titleNoct) titleNoct.textContent = 'Día Festivo (06:00 a 20:00)';
  } else {
    if(titleNoct) titleNoct.textContent = 'Día Festivo (06:00 a 20:00) y Turno Noche (22:00 a 04:00)';
  }

  // Actualizar etiquetas de precios en las píldoras de jornada según la modalidad activa
  const lblHabil = $('#lblRateHabil');
  const lblTarde = $('#lblRateTarde');
  const lblNocturno = $('#lblRateNocturno');
  if(lblHabil && lblTarde && lblNocturno){
    if(mode === '2'){
      lblHabil.textContent = '$8.000/h ($1.000/km)';
      lblTarde.textContent = '$10.000/h ($1.000/km)';
      lblNocturno.textContent = '$12.000/h ($1.000/km)';
    } else if(mode === '1'){
      lblHabil.textContent = '$12.000/h ($1.000/km)';
      lblTarde.textContent = '$15.000/h ($1.000/km)';
      lblNocturno.textContent = '$18.000/h ($1.000/km)';
    } else {
      lblHabil.textContent = '$12.000/h';
      lblTarde.textContent = '$15.000/h';
      lblNocturno.textContent = '$18.000/h';
    }
  }

  if(mode === '5'){
    $('#timeSectionSub').textContent = 'Seleccione el programa requerido según las horas de permanencia en destino. En caso de requerir tiempo adicional, cada bloque de 30 minutos tiene un valor de $15.000 ($25.000 por hora).';
  } else if(mode === '4'){
    $('#timeSectionSub').textContent = 'Seleccione el plan de cobertura (4 o 6 horas continuas). En Eventos Sociales rigen tarifas planas paquetizadas cerradas para toda la Región Metropolitana, sin recargo nocturno ni por día festivo.';
  } else {
    $('#timeSectionSub').textContent = 'Seleccione la jornada horaria en que necesita el servicio y la cantidad de horas/minutos. Cada bloque adicional de 30 minutos se calcula a la mitad del valor hora de su jornada.';
  }

  if(showMap){
    layoutBox.classList.remove('no-map');
    mapCol.style.display = 'block';
    kmControls.style.display = (mode === '1' || mode === '2') ? 'block' : 'none';
    setTimeout(() => map.invalidateSize(), 80);
  } else {
    layoutBox.classList.add('no-map');
    mapCol.style.display = 'none';
    kmControls.style.display = 'none';
  }

  const packCalc = $('#packCalcControls');
  if(packCalc){
    packCalc.style.display = ((mode === '4' && selectedEventSubMode === 'con_traslado') || mode === '5') ? 'block' : 'none';
  }

  const packCard = $('#packRouteMetricsCard');
  if(packCard){
    if(((mode === '4' && selectedEventSubMode === 'con_traslado') || mode === '5') && lastTotalKm > 0){
      packCard.style.display = 'block';
      const vMin = lastRouteVueltaMin > 0 ? lastRouteVueltaMin : lastRouteIdaMin;
      const fmtTotal = lastTotalKm.toFixed(1).replace('.', ',');
      if($('#packMetricKm')) $('#packMetricKm').textContent = `${fmtTotal} km (Ida + Vuelta)`;
      if($('#packMetricTime')) $('#packMetricTime').textContent = `${lastRouteIdaMin} min de ida + ${vMin} min de retorno`;
    } else {
      packCard.style.display = 'none';
    }
  }

  if(showDestAddress){
    destWrap.style.display = 'block';
    bTo.required = true;
  } else {
    destWrap.style.display = 'none';
    bTo.required = false;
  }

  // Etiquetas de dirección según modalidad
  if(mode === '1' || mode === '2'){
    $('#lblFromAddr').innerHTML = `<span class="pin-badge pin-a">A</span>Dirección de Recogida / Inicio (Calle, número exacto y comuna) *`;
    $('#lblToAddr').innerHTML = `<span class="pin-badge pin-b">B</span>Dirección de Destino (Clínica, Hospital o dirección con numeración) *`;
    bFrom.placeholder = 'Ej: Pasaje Los Océanos 424, Maipú';
  } else if(mode === '4'){
    if(selectedEventSubMode === 'con_traslado'){
      $('#lblFromAddr').innerHTML = `<span class="pin-badge pin-a">A</span>Dirección de recogida en Domicilio (Calle, número exacto y comuna) *`;
      $('#lblToAddr').innerHTML = `<span class="pin-badge pin-b">B</span>Dirección del Centro de Eventos o Salón (Destino) *`;
      bFrom.placeholder = 'Ej: Pasaje Los Océanos 424, Maipú';
      bTo.placeholder = 'Ej: Centro de Eventos El Manantial, Pirque';
    } else {
      $('#lblFromAddr').innerHTML = `<span class="pin-badge pin-a">A</span>Dirección del Centro de Eventos o Salón (Calle, número exacto y comuna) *`;
      bFrom.placeholder = 'Ej: Centro de Eventos El Manantial, Camino El Volcán 450, Pirque';
    }
  } else if(mode === '5'){
    $('#lblFromAddr').innerHTML = `<span class="pin-badge pin-a">A</span>Dirección exacta donde debemos ir a buscarlo (Valparaíso u O'Higgins) *`;
    $('#lblToAddr').innerHTML = `<span class="pin-badge pin-b">B</span>Dirección exacta a donde necesita ir (Clínica, Hospital o Centro en Santiago) *`;
    bFrom.placeholder = 'Ej: Av. Libertad 450, Viña del Mar o Av. Libertador Bernardo O\'Higgins 520, Rancagua';
  } else if(mode === '3'){
    $('#lblFromAddr').innerHTML = `Dirección del Domicilio / Lugar de Atención *`;
    bFrom.placeholder = 'Ej: Pasaje Los Océanos 424, Maipú';
  } else {
    $('#lblFromAddr').innerHTML = `<span class="pin-badge pin-a">A</span>Dirección del Domicilio / Lugar de Atención (Calle, número exacto y comuna) *`;
    bFrom.placeholder = 'Ej: Pasaje Los Océanos 424, Maipú';
  }

  // Mostrar el selector de horas correspondiente (1-2 vs 3-4-5)
  const timeBadge = $('#timeSectionBadge');
  if(mode === '1' || mode === '2'){
    const selStay = $('#selStayDestino');
    if(selStay && (!selStay.value || selStay.value === '')){
      selStay.value = '60';
    }
    $('#durationBox12').style.display = 'block';
    $('#durationBox34').style.display = 'none';
    if($('#serviceTimelineBox')) $('#serviceTimelineBox').style.display = 'block';
    if(timeBadge){
      timeBadge.textContent = 'Mínimo 1 hora · Bloques de 30 min';
      timeBadge.style.background = 'var(--mist)';
      timeBadge.style.color = 'var(--mute)';
      timeBadge.style.borderColor = 'var(--line)';
      timeBadge.style.fontWeight = 'normal';
    }
    if(mode === '1'){
      $('#timeSectionTitle').textContent = '⏱️ Permanencia en Destino y Duración del Servicio Completo';
      $('#timeSectionSub').textContent = 'Indique cuánto tiempo estima permanecer en el lugar de atención o trámite. El sistema calculará automáticamente la duración total del viaje continuo sumando los traslados y el abordaje clínico.';
      if($('#lblStayDestino')) $('#lblStayDestino').textContent = '¿Cuánto estimas que durará tu atención, trámite o actividad en el lugar? *';
      if($('#tlBadge')) $('#tlBadge').textContent = 'Ida + Asistencia + Retorno';
    } else {
      $('#timeSectionTitle').textContent = '⏱️ Tiempo de Espera Requerido en Destino';
      $('#timeSectionSub').textContent = 'Indique cuánto tiempo estima que el vehículo permanecerá esperando en el lugar. El cobro por tiempo se aplica exclusivamente a la espera en destino ($8.000/h).';
      if($('#lblStayDestino')) $('#lblStayDestino').textContent = '¿Cuánto tiempo de espera requerirá en destino? *';
      if($('#tlBadge')) $('#tlBadge').textContent = 'Ida + Espera en Destino + Retorno';
    }
  } else {
    $('#durationBox12').style.display = 'none';
    $('#durationBox34').style.display = 'grid';
    const showTimeline = (mode === '5' || (mode === '4' && selectedEventSubMode === 'con_traslado'));
    if($('#serviceTimelineBox')) $('#serviceTimelineBox').style.display = showTimeline ? 'block' : 'none';
    if(mode === '3'){
      $('#eventStartCol').style.display = 'none';
      $('#hours34Col').style.display = 'block';
      $('#mins34Col').style.display = 'block';
      if($('#lblHours34')) $('#lblHours34').textContent = 'Horas de cuidado continuo requeridas *';
      $('#durationBox34').style.gridTemplateColumns = '';
      let minH = 2;
      if(detectedRing && detectedRing.id === 2) minH = 3;
      else if(detectedRing && detectedRing.id === 3) minH = 4;
      if(timeBadge){
        timeBadge.textContent = `Mínimo ${minH} horas · Bloques de 30 min`;
        timeBadge.style.background = 'var(--mist)';
        timeBadge.style.color = 'var(--mute)';
        timeBadge.style.borderColor = 'var(--line)';
        timeBadge.style.fontWeight = 'normal';
      }
      $('#timeSectionTitle').textContent = `⏱️ Tiempo de Asistencia en Domicilio (Piso mínimo ${minH}h según comuna · Máximo 6h)`;
      $('#timeSectionSub').textContent = 'Seleccione la cantidad de horas continuas de atención en el hogar. Cada bloque adicional de 30 minutos se calcula al 50% del valor hora.';
    } else if(mode === '4'){
      $('#eventStartCol').style.display = 'none';
      $('#hours34Col').style.display = 'block';
      $('#mins34Col').style.display = 'none';
      if($('#lblHours34')) $('#lblHours34').textContent = 'Plan de Asistencia y Cobertura *';
      $('#durationBox34').style.gridTemplateColumns = '1fr';
      const isCon = selectedEventSubMode === 'con_traslado';
      if(isCon){
        updateServiceTimeline();
      }
      if(timeBadge){
        timeBadge.textContent = 'Tarifa Plana · Cobertura continua (4 o 6 hrs)';
        timeBadge.style.background = 'rgba(22,143,74,.12)';
        timeBadge.style.color = '#12783E';
        timeBadge.style.borderColor = 'rgba(22,143,74,.25)';
        timeBadge.style.fontWeight = '700';
      }
      $('#timeSectionTitle').textContent = isCon
        ? '⏱️ Pack Integral Puerta a Puerta (Traslados Ida/Vuelta + Atención en Evento)'
        : '⏱️ Plan de Asistencia en Recinto / Salón (Tarifa Plana Cerrada)';
      $('#timeSectionSub').textContent = 'Seleccione la cobertura deseada. En Eventos Sociales rigen tarifas planas paquetizadas cerradas para toda la Región Metropolitana.';
    } else if(mode === '5'){
      $('#eventStartCol').style.display = 'none';
      $('#hours34Col').style.display = 'none';
      $('#mins34Col').style.display = 'block';
      $('#durationBox34').style.gridTemplateColumns = '1fr';
      updateServiceTimeline();
      if(timeBadge){
        timeBadge.textContent = 'Programa Cerrado · Tarifa Plana';
        timeBadge.style.background = 'rgba(22,143,74,.12)';
        timeBadge.style.color = '#12783E';
        timeBadge.style.borderColor = 'rgba(22,143,74,.25)';
        timeBadge.style.fontWeight = '700';
      }
      $('#timeSectionTitle').textContent = '⏱️ Selección de Programa Interregional y Tiempo Adicional';
    }
  }

  // Inversión visual de columnas (CSS Order): Izquierda = Horas/Plan/Programa, Derecha = Asistente/Inicio (Mod 3, 4 y 5)
  const gridSchedule = $('#pickupScheduleGrid');
  const colAsistente = $('#colAsistentePickup');
  const colDuration = $('#colDurationService');
  if(mode === '3' || mode === '4' || mode === '5'){
    if(gridSchedule) gridSchedule.classList.add('modality-reverse-cols');
    if(colDuration) colDuration.style.order = '1';
    if(colAsistente) colAsistente.style.order = '2';
  } else {
    if(gridSchedule) gridSchedule.classList.remove('modality-reverse-cols');
    if(colAsistente) colAsistente.style.order = '1';
    if(colDuration) colDuration.style.order = '2';
  }

  populateAppTimeOptions(mode);

  // Mostrar/ocultar sección de Suma (KM + TIEMPO) vs Valor Directo sin suma de KM (Tarjeta Azul)
  if(mode === '1' || mode === '2'){
    $('#sumKmTimeSection').style.display = 'block';
    $('#directTimeOnlySection').style.display = 'none';
  } else {
    $('#sumKmTimeSection').style.display = 'none';
    $('#directTimeOnlySection').style.display = 'block';
  }

  // Visibilidad del Asistente de Salida (solo en traslados y programas interregionales) vs Selector Domiciliario
  const asisBox = $('#asistenteBox');
  const homeTimeWrap = $('#homeTimeWrap');
  const isTransfer = (mode === '1' || mode === '2' || mode === '5');
  if(asisBox){
    asisBox.style.display = isTransfer ? 'block' : 'none';
  }
  if(homeTimeWrap){
    homeTimeWrap.style.display = isTransfer ? 'none' : 'block';
  }
  updateHomeSpecialWaLink();
  const lblPick = $('#lblPickupSelect');
  if(lblPick){
    if(mode === '3'){
      lblPick.textContent = 'Hora de inicio de la atención *';
    } else if(mode === '4'){
      lblPick.textContent = (selectedEventSubMode === 'con_traslado')
        ? 'Hora exacta de recogida en domicilio para iniciar viaje al evento *'
        : 'Hora exacta de llegada de la TENS al centro de eventos / salón *';
    } else {
      lblPick.textContent = 'Hora de inicio de la atención *';
    }
  }

  // Banner de advertencia de Programas Interregionales (solo visible en Modalidad 5)
  const warnInter = $('#interregionalBlockWarn');
  if(warnInter && mode !== '5'){
    warnInter.style.display = 'none';
  }


  renderRequirements(mode);
  checkCompanionRecommendation();

  updateRingDisplay();
}

function updateHomeSpecialWaLink(){
  const btn = $('#btnHomeSpecialWa');
  if(!btn) return;
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '3';
  const modeName = mode === '4' ? 'Acompañamiento en Eventos Sociales' : 'Cuidados a Domicilio';
  const msg = `Hola, necesito consultar por un horario de inicio especial o cobertura personalizada para el servicio de ${modeName}.`;
  btn.href = `https://wa.me/56929990095?text=${encodeURIComponent(msg)}`;
}
window.updateHomeSpecialWaLink = updateHomeSpecialWaLink;

function renderRequirements(mode){
  // Bloque de requerimientos asistenciales eliminado para simplificar la Sección 3
}

function onMobilityOrCompanionChange(){
  checkCompanionRecommendation();
}

function checkCompanionRecommendation(){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  const mobVal = ($('#b_mob') && $('#b_mob').value) || '';
  const compVal = ($('#b_comp') && $('#b_comp').value) || '';
  const notice = $('#compValidationNotice');
  if(!notice) return;

  const isNotAutovalente = mobVal && !mobVal.startsWith('Autovalente');
  const isSolo = compVal && compVal.includes('solo');

  if(mode === '2' && isNotAutovalente && isSolo){
    notice.style.display = 'block';
  } else {
    notice.style.display = 'none';
  }
}

function toggleAllergyField(val){
  const wrap = $('#allergyDetailWrap');
  const inp = $('#b_allergy_detail');
  if(!wrap || !inp) return;
  if(val === 'si'){
    wrap.style.display = 'block';
    inp.required = true;
    inp.focus();
  } else {
    wrap.style.display = 'none';
    inp.required = false;
    inp.value = '';
  }
}

function onPathologyNingunaChange(el){
  if(el.checked){
    document.querySelectorAll('.pat-cb').forEach(cb => {
      if(cb !== el) cb.checked = false;
    });
    const wrap = $('#pathologyOtherWrap');
    const inp = $('#b_pathology_other');
    if(wrap) wrap.style.display = 'none';
    if(inp){ inp.required = false; inp.value = ''; }
  }
}

function onPathologyOtraChange(el){
  const wrap = $('#pathologyOtherWrap');
  const inp = $('#b_pathology_other');
  if(el.checked){
    const ning = $('#cbPatNinguna');
    if(ning) ning.checked = false;
    if(wrap) wrap.style.display = 'block';
    if(inp){ inp.required = true; inp.focus(); }
  } else {
    if(wrap) wrap.style.display = 'none';
    if(inp){ inp.required = false; inp.value = ''; }
  }
}

function onPathologyChange(el){
  if(el.checked){
    const ning = $('#cbPatNinguna');
    if(ning) ning.checked = false;
  }
}

function getSelectedPathologies(){
  const cbs = [...document.querySelectorAll('.pat-cb:checked')];
  if(cbs.length === 0) return ['Ninguna'];
  const list = [];
  cbs.forEach(cb => {
    if(cb.value === 'Otra patología'){
      const otherDetail = ($('#b_pathology_other') && $('#b_pathology_other').value.trim()) || '';
      list.push(otherDetail ? `Otra: ${otherDetail}` : 'Otra patología');
    } else {
      list.push(cb.value);
    }
  });
  return list;
}

function toggleTaxDocFields(val){
  const box = $('#invoiceFieldsBox');
  const isFactura = val === 'factura';
  if(box) box.style.display = isFactura ? 'block' : 'none';
  const reqFields = ['b_tax_rs', 'b_tax_rut', 'b_tax_giro', 'b_tax_dir'];
  reqFields.forEach(id => {
    const el = $('#' + id);
    if(el){
      el.required = isFactura;
      if(!isFactura) el.value = '';
    }
  });
}

function toggleCoordSameAsPatient(isChecked){
  const coordInp = $('#b_coord');
  const phInp = $('#b_ph');
  const patName = ($('#b_pat') && $('#b_pat').value) || '';
  const patPhone = ($('#b_pat_phone') && $('#b_pat_phone').value) || '';

  if(isChecked){
    if(coordInp) coordInp.value = patName;
    if(phInp) phInp.value = patPhone;
  } else {
    if(coordInp) coordInp.value = '';
    if(phInp) phInp.value = '';
    if(coordInp) coordInp.focus();
  }
}

function onPatientFieldInput(){
  const cb = $('#cbCoordSameAsPatient');
  if(cb && cb.checked){
    const coordInp = $('#b_coord');
    const phInp = $('#b_ph');
    if(coordInp) coordInp.value = ($('#b_pat') && $('#b_pat').value) || '';
    if(phInp) phInp.value = ($('#b_pat_phone') && $('#b_pat_phone').value) || '';
  }
}

function onCoordManualInput(){
  const cb = $('#cbCoordSameAsPatient');
  if(cb && cb.checked){
    const patName = ($('#b_pat') && $('#b_pat').value) || '';
    const patPhone = ($('#b_pat_phone') && $('#b_pat_phone').value) || '';
    const coordVal = ($('#b_coord') && $('#b_coord').value) || '';
    const phVal = ($('#b_ph') && $('#b_ph').value) || '';
    if(coordVal !== patName || phVal !== patPhone){
      cb.checked = false;
    }
  }
}

function applyMaxDurationRule(){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';

  // 1. Modalidades 1 y 2 (Traslados con cálculo de Servicio Completo)
  const selStay = $('#selStayDestino');
  if(selStay && (mode === '1' || mode === '2')){
    if(!selStay.value || selStay.value === ''){
      selStay.value = '60';
    }
    const isRoundTrip = tripMultiplier === 2;
    const idaMin = lastRouteIdaMin > 0 ? lastRouteIdaMin : 30;
    const abordajeMin = 10;
    const retornoMin = isRoundTrip ? (lastRouteIdaMin > 0 ? lastRouteIdaMin : 30) : 0;
    const travelMin = idaMin + abordajeMin + retornoMin;
    const maxStayAllowed = Math.max(60, 360 - travelMin);
    [...selStay.options].forEach(opt => {
      const v = +opt.value;
      const txt = opt.textContent || opt.text || '';
      if(v > maxStayAllowed){
        opt.disabled = true;
        if(!txt.includes('(Excede tope 6h)')){
          opt.textContent = txt + ' (Excede tope 6h)';
        }
      } else {
        opt.disabled = false;
        opt.textContent = txt.replace(' (Excede tope 6h)', '');
      }
    });
    if(+selStay.value > maxStayAllowed){
      const validOpts = [...selStay.options].filter(o => !o.disabled);
      if(validOpts.length > 0) selStay.value = validOpts[validOpts.length - 1].value;
    }
  }

  // 2. Modalidades 3, 4 y 5
  const selH34 = $('#selHours34');
  const selM34 = $('#selMins34');
  if(mode === '3'){
    if(selH34 && selM34){
      const h34 = +selH34.value || 2;
      if(h34 >= 6){
        selM34.value = '0';
        selM34.disabled = true;
        selM34.title = 'Tope máximo de 6 horas alcanzado en la agenda web.';
      } else {
        selM34.disabled = false;
        selM34.removeAttribute('title');
      }
    }
  } else if(mode === '4'){
    if(selM34){
      selM34.value = '0';
      selM34.disabled = true;
      selM34.title = 'Los eventos sociales se contratan en paquetes de tarifa plana cerrada.';
    }
  } else if(mode === '5'){
    if(selM34){
      const progH = selectedInterProgram || 4;
      if(progH >= 6){
        selM34.value = '0';
        selM34.disabled = true;
        selM34.title = 'El Programa Crónico ya incluye 6 horas continuas (tope máximo web).';
      } else {
        selM34.disabled = false;
        selM34.removeAttribute('title');
      }
    }
  }
}

function onHours34Change(){
  applyMaxDurationRule();
  syncJornadaFromSchedule();
  recalcAll();
  updateSlots(true);
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  if(mode === '5' && typeof calcSuggestedPickup === 'function'){
    calcSuggestedPickup();
  }
}

function onEventStart1Change(){
  const val = $('#selEventStart1').value;
  if(val){
    const mins = tm(val);
    selectedBlock = (mins >= 22 * 60 || mins < 6 * 60) ? 'noche' : (mins <= 13 * 60 ? 'manana' : 'tarde');
    const bTime = $('#b_time');
    if(bTime){
      updateSlots(false);
      if([...bTime.options].some(o => o.value === val && !o.disabled)){
        bTime.value = val;
      }
    }
  }
  syncJornadaFromSchedule();
  recalcAll();
  updateSlots(true);
}

function setJornada(j){
  currentJornada = j;
  ['habil','tarde','nocturno'].forEach(k => {
    const el = $('#pillJornada_' + k);
    if(el) el.classList.toggle('active', k === j);
  });
  refreshDuration34Options(false);
  recalcAll();
}

function fmtHoursClean(mins){
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if(h > 0 && m > 0) return `${h} h ${m} min`;
  if(h > 0) return `${h} h`;
  return `${m} min`;
}

function recalcularTodoElServicio(triggerSource){
  try {
    // Micro-feedback visual en el botón de cálculo (#btnCalcularHora)
    const btn = $('#btnCalcularHora') || document.querySelector('button[onclick*="calcSuggestedPickup"]') || document.querySelector('button[onclick*="recalcularTodoElServicio"]');
    if(btn){
      btn.classList.add('active');
      btn.style.transform = 'scale(0.96)';
      btn.style.opacity = '0.85';
      setTimeout(() => {
        btn.classList.remove('active');
        btn.style.transform = '';
        btn.style.opacity = '';
      }, 180);
    }

    const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';

    // Duración en destino: asegurar 60 min por defecto si está vacío y limpiar estilos de error
    const selStay = $('#selStayDestino') || $('#duracion-atencion');
    if(selStay && (!selStay.value || selStay.value === '')){
      selStay.value = '60';
    }
    if(selStay){
      selStay.style.borderColor = '';
      selStay.style.boxShadow = '';
    }

    applyMaxDurationRule();
    applyModalityVisibility();
    if(typeof actualizarTarifaSegunAgenda === 'function') actualizarTarifaSegunAgenda(true);
    recalcAll();
    updateSlots(true);

    if(mode === '1' || mode === '2' || mode === '5'){
      const appTime = ($('#appTimeInput') && $('#appTimeInput').value) || ($('#b_app_time') && $('#b_app_time').value);
      if(appTime && typeof calcSuggestedPickup === 'function'){
        calcSuggestedPickup();
      }
    }
  } catch(err) {
    console.error('Error en recalcularTodoElServicio:', err);
  }
}
window.recalcularTodoElServicio = recalcularTodoElServicio;

function onStayDestinoChange(){
  recalcularTodoElServicio('duration');
}
window.onStayDestinoChange = onStayDestinoChange;

function onAppTimeChange(){
  recalcularTodoElServicio('appTime');
}
window.onAppTimeChange = onAppTimeChange;

function updateServiceTimeline(idaMin, abordajeMin, stayMin, retornoMin, rawTotalMin, billedMin){
  const box = $('#serviceTimelineBox');
  if(!box) return;
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  const isEventConTraslado = (mode === '4' && selectedEventSubMode === 'con_traslado');
  const isInterregional = (mode === '5');
  if(mode !== '1' && mode !== '2' && !isEventConTraslado && !isInterregional){
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';

  // 1. MODALIDAD 5: PROGRAMAS INTERREGIONALES
  if(isInterregional){
    const timeSelect = $('#b_time');
    const curTime = (timeSelect && timeSelect.value) || currentSuggestedHour || '07:30';
    const startMin = tm(curTime);

    const routeIda = (typeof idaMin === 'number' && idaMin > 0) ? idaMin : (lastRouteIdaMin > 0 ? lastRouteIdaMin : 90);
    const routeRetorno = (typeof retornoMin === 'number' && retornoMin > 0) ? retornoMin : (lastRouteVueltaMin > 0 ? lastRouteVueltaMin : routeIda);

    const progH = selectedInterProgram || 4;
    const extraM = (+$('#selMins34').value) || 0;
    const stayClinicalMin = progH * 60 + extraM;

    const llegadaSantiagoMin = startMin + 10 + routeIda;
    const salidaSantiagoMin = llegadaSantiagoMin + stayClinicalMin;
    const retornoHogarMin = salidaSantiagoMin + routeRetorno;
    const totalCircuitoMin = 10 + routeIda + stayClinicalMin + routeRetorno;

    if($('#tlBadge')) $('#tlBadge').textContent = 'Traslado Interregional Ida + Asistencia + Retorno';
    if($('#tlHoraRecogidaLabel')) $('#tlHoraRecogidaLabel').textContent = 'Hora exacta de recogida en el domicilio regional:';
    if($('#tlHoraRecogida')) $('#tlHoraRecogida').textContent = `${curTime} hrs`;
    if($('#tlHoraLlegadaDestinoLabel')) $('#tlHoraLlegadaDestinoLabel').textContent = 'Hora estimada de llegada al centro hospitalario/clínico en Santiago:';
    if($('#tlHoraLlegadaDestino')) $('#tlHoraLlegadaDestino').textContent = `${fm(llegadaSantiagoMin % 1440)} hrs`;
    if($('#tlTiempoDestinoLabel')) $('#tlTiempoDestinoLabel').textContent = 'Horas de permanencia/atención clínica:';
    if($('#tlTiempoDestino')) $('#tlTiempoDestino').textContent = extraM > 0 ? `${progH} hrs + ${extraM} min (${fmtHoursClean(stayClinicalMin)})` : `${progH} hrs continuas`;
    if($('#tlHoraRetornoLabel')) $('#tlHoraRetornoLabel').textContent = 'Hora estimada de retorno al domicilio regional:';
    if($('#tlHoraRetorno')) $('#tlHoraRetorno').textContent = `${fm(retornoHogarMin % 1440)} hrs`;
    if($('#tlHorasEfectivasLabel')) $('#tlHorasEfectivasLabel').textContent = 'Total horas del circuito interregional completo:';
    if($('#tlHorasEfectivas')) $('#tlHorasEfectivas').textContent = `${fmtHoursClean(totalCircuitoMin)} (${totalCircuitoMin} min)`;

    const formulaDesc = `Circuito Interregional Completo (${selectedInterRegion}): ${routeIda} min traslado ida a Santiago + ${fmtHoursClean(stayClinicalMin)} de permanencia/atención clínica + ${routeRetorno} min traslado de retorno = <b>${fmtHoursClean(totalCircuitoMin)} (${totalCircuitoMin} min)</b> estimados con vehículo y TENS en dedicación exclusiva.`;
    if($('#tlDesgloseDetalle')) $('#tlDesgloseDetalle').innerHTML = formulaDesc;
    return;
  }

  const timeSelect = $('#b_time');
  const curTime = (timeSelect && timeSelect.value)
    ? timeSelect.value
    : (isEventConTraslado ? '16:00' : (currentSuggestedHour || '08:30'));
  const startMin = tm(curTime);

  if(isEventConTraslado){
    let h = +($('#selHours34') ? $('#selHours34').value : 4) || 4;
    if(h >= 6) h = 6;
    else h = 4;
    const eventStayMin = h * 60;
    const effIdaMin = (typeof idaMin === 'number' && idaMin > 0) ? idaMin : (lastRouteIdaMin > 0 ? lastRouteIdaMin : 30);
    const effRetornoMin = (typeof retornoMin === 'number' && retornoMin > 0) ? retornoMin : (lastRouteVueltaMin > 0 ? lastRouteVueltaMin : effIdaMin);

    const llegadaRecintoMin = startMin + effIdaMin;
    const terminoEventoMin = llegadaRecintoMin + eventStayMin;
    const retornoHogarMin = terminoEventoMin + effRetornoMin;
    const totalCircuitoMin = effIdaMin + eventStayMin + effRetornoMin;

    if($('#tlBadge')) $('#tlBadge').textContent = 'Ida + Asistencia en Evento + Retorno';
    if($('#tlHoraRecogidaLabel')) $('#tlHoraRecogidaLabel').textContent = 'Hora de recogida programada:';
    if($('#tlHoraRecogida')) $('#tlHoraRecogida').textContent = `${curTime} hrs`;
    if($('#tlHoraLlegadaDestinoLabel')) $('#tlHoraLlegadaDestinoLabel').textContent = 'Llegada estimada al recinto:';
    if($('#tlHoraLlegadaDestino')) $('#tlHoraLlegadaDestino').textContent = `${fm(llegadaRecintoMin % 1440)} hrs`;
    if($('#tlTiempoDestinoLabel')) $('#tlTiempoDestinoLabel').textContent = 'Tiempo de permanencia contratado:';
    if($('#tlTiempoDestino')) $('#tlTiempoDestino').textContent = `${h} hrs continuas`;
    if($('#tlHoraRetornoLabel')) $('#tlHoraRetornoLabel').textContent = 'Hora estimada de regreso al hogar:';
    if($('#tlHoraRetorno')) $('#tlHoraRetorno').textContent = `${fm(retornoHogarMin % 1440)} hrs`;
    if($('#tlHorasEfectivasLabel')) $('#tlHorasEfectivasLabel').textContent = 'Duración total del compromiso:';
    if($('#tlHorasEfectivas')) $('#tlHorasEfectivas').textContent = `${fmtHoursClean(totalCircuitoMin)} (${totalCircuitoMin} min)`;

    const formulaDesc = `Circuito completo del servicio: ${effIdaMin} min viaje de ida + ${h} hrs de permanencia continua en el evento + ${effRetornoMin} min viaje de regreso = <b>${fmtHoursClean(totalCircuitoMin)} (${totalCircuitoMin} min)</b> estimados de dedicación exclusiva.<br><span style="display:inline-block;margin-top:6px;color:var(--ink);font-weight:600">Nota: Las 4 o 6 horas contratadas corresponden a permanencia continua y efectiva en el evento. Los traslados de ida y regreso se suman como tiempo de viaje adicional, garantizando que el paciente disfrute su fiesta completa.</span>`;
    if($('#tlDesgloseDetalle')) $('#tlDesgloseDetalle').innerHTML = formulaDesc;
    return;
  }

  if($('#tlHoraRecogidaLabel')) $('#tlHoraRecogidaLabel').textContent = 'Hora de recogida programada:';
  if($('#tlHoraLlegadaDestinoLabel')) $('#tlHoraLlegadaDestinoLabel').textContent = 'Llegada estimada al recinto:';
  const llegadaDestinoMin = startMin + abordajeMin + idaMin;
  const salidaDestinoMin = llegadaDestinoMin + stayMin;
  const retornoHogarMin = salidaDestinoMin + retornoMin;
  const isRoundTrip = tripMultiplier === 2;

  if($('#tlHoraRecogida')) $('#tlHoraRecogida').textContent = `${curTime} hrs`;
  if($('#tlHoraLlegadaDestino')) $('#tlHoraLlegadaDestino').textContent = `${fm(llegadaDestinoMin % 1440)} hrs`;
  if($('#tlBadge')){
    $('#tlBadge').textContent = (mode === '2') ? 'Ida + Espera en Destino + Retorno' : 'Ida + Asistencia + Retorno';
  }
  if($('#tlTiempoDestinoLabel')){
    $('#tlTiempoDestinoLabel').textContent = (mode === '2') ? 'Espera estimada en destino:' : 'Permanencia estimada en destino:';
  }
  if($('#tlTiempoDestino')) $('#tlTiempoDestino').textContent = fmtHoursClean(stayMin);
  if($('#tlHoraRetornoLabel')) $('#tlHoraRetornoLabel').textContent = isRoundTrip ? 'Hora estimada de retorno al hogar:' : 'Hora estimada de término en destino:';
  if($('#tlHoraRetorno')) $('#tlHoraRetorno').textContent = `${fm(retornoHogarMin % 1440)} hrs`;

  const h = Math.floor(billedMin / 60);
  const extraHalf = (billedMin % 60 === 30) ? 1 : 0;
  const waitHoursText = extraHalf ? `${h > 0 ? `${h} h 30 min` : '30 min'}` : (h === 1 ? '1 hr' : `${h} hrs`);

  if($('#tlHorasEfectivasLabel')){
    $('#tlHorasEfectivasLabel').textContent = (mode === '2') ? 'Espera en destino a liquidar:' : 'Total horas efectivas a liquidar:';
  }
  if($('#tlHorasEfectivas')){
    $('#tlHorasEfectivas').textContent = (mode === '2')
      ? `${waitHoursText} (${billedMin} min)`
      : `${fmtHoursClean(billedMin)} (${billedMin} min)`;
  }

  let formulaDesc = '';
  if(mode === '2'){
    formulaDesc = isRoundTrip
      ? `Tiempo operativo total: 10 min abordaje (asistencia inicial) + ${idaMin} min viaje ida + ${stayMin} min espera en destino + ${retornoMin} min viaje retorno = <b>${rawTotalMin} min</b> | Espera en destino a liquidar: <b>${waitHoursText}</b>.`
      : `Tiempo operativo total (Solo ida): 10 min abordaje (asistencia inicial) + ${idaMin} min viaje ida + ${stayMin} min espera en destino = <b>${rawTotalMin} min</b> | Espera en destino a liquidar: <b>${waitHoursText}</b>.`;
  } else {
    formulaDesc = isRoundTrip
      ? `Fórmula del servicio: ${abordajeMin} min abordaje TENS + ${idaMin} min viaje ida + ${stayMin} min en destino + ${retornoMin} min viaje retorno = <b>${rawTotalMin} min</b> continuos estimados → <b>${fmtHoursClean(billedMin)}</b> efectivos a liquidar y reservar (bloques de 30 min).`
      : `Fórmula del servicio (Solo ida): ${abordajeMin} min abordaje TENS + ${idaMin} min viaje ida + ${stayMin} min en destino = <b>${rawTotalMin} min</b> continuos estimados → <b>${fmtHoursClean(billedMin)}</b> efectivos a liquidar y reservar (bloques de 30 min).`;
  }

  if($('#tlDesgloseDetalle')) $('#tlDesgloseDetalle').innerHTML = formulaDesc;
}

function getSelectedTotalMinutes(){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  let totalMin = 60;
  if(mode === '1' || mode === '2'){
    const stayMin = +($('#selStayDestino') ? $('#selStayDestino').value : 60) || 60;
    const isRoundTrip = tripMultiplier === 2;
    const idaMin = lastRouteIdaMin > 0 ? lastRouteIdaMin : 30;
    const abordajeMin = 10;
    const retornoMin = isRoundTrip ? (lastRouteIdaMin > 0 ? lastRouteIdaMin : 30) : 0;
    const rawTotalMin = abordajeMin + idaMin + stayMin + retornoMin;
    const billedMin = Math.min(360, Math.max(60, Math.ceil(rawTotalMin / 30) * 30));
    totalMin = billedMin;
  } else if(mode === '5'){
    const h = selectedInterProgram || 4;
    const m = (h >= 6) ? 0 : (+$('#selMins34').value || 0);
    totalMin = h * 60 + m;
  } else if(mode === '4'){
    const h = +$('#selHours34').value || 4;
    totalMin = (h >= 6 ? 6 : 4) * 60;
  } else {
    // Mode 3
    let minH = 2;
    if(detectedRing && detectedRing.id === 2) minH = 3;
    else if(detectedRing && detectedRing.id === 3) minH = 4;
    const h = +$('#selHours34').value || minH;
    const m = (h >= 6) ? 0 : (+$('#selMins34').value || 0);
    totalMin = h * 60 + m;
  }
  return Math.min(totalMin, 360); // Nunca admitir más de 6 horas (360 minutos) en la simulación web
}

function recalcAll(){
  const mode = $('#b_svc_type').value;
  const r = RATES[mode][currentJornada];
  if(r && r.hour){
    tarifaPorHora = r.hour;
    window.tarifaPorHora = r.hour;
  }

  // Actualizar etiquetas de precios en las píldoras de jornada según la modalidad activa
  const lblHabil = $('#lblRateHabil');
  const lblTarde = $('#lblRateTarde');
  const lblNocturno = $('#lblRateNocturno');
  if(lblHabil && lblTarde && lblNocturno){
    if(mode === '2'){
      lblHabil.textContent = '$8.000/h ($1.000/km)';
      lblTarde.textContent = '$10.000/h ($1.000/km)';
      lblNocturno.textContent = '$12.000/h ($1.000/km)';
    } else if(mode === '1'){
      lblHabil.textContent = '$12.000/h ($1.000/km)';
      lblTarde.textContent = '$15.000/h ($1.000/km)';
      lblNocturno.textContent = '$18.000/h ($1.000/km)';
    } else {
      lblHabil.textContent = '$12.000/h';
      lblTarde.textContent = '$15.000/h';
      lblNocturno.textContent = '$18.000/h';
    }
  }

  const titleNoct = $('#titleJornadaNocturno');
  const subNoct = $('#subJornadaNocturno');
  const subTarde = $('#subJornadaTarde') || ($('#pillJornada_tarde') ? $('#pillJornada_tarde').querySelector('small') : null);
  if(subTarde) subTarde.textContent = 'Sábados, domingos y festivos estándar';
  if(subNoct) subNoct.textContent = 'Feriados oficiales irrenunciables y cobertura nocturna';
  if(titleNoct){
    if(mode === '1' || mode === '2'){
      titleNoct.textContent = 'Día Festivo (06:00 a 20:00)';
    } else {
      titleNoct.textContent = 'Día Festivo (06:00 a 20:00) y Turno Noche (22:00 a 04:00)';
    }
  }

  let timeCost = 0;
  let durationText = '';

  if(mode === '1'){
    const stayMin = +($('#selStayDestino') ? $('#selStayDestino').value : 60) || 60;
    const isRoundTrip = tripMultiplier === 2;
    const idaMin = lastRouteIdaMin > 0 ? lastRouteIdaMin : 30;
    const abordajeMin = 10;
    const retornoMin = isRoundTrip ? (lastRouteIdaMin > 0 ? lastRouteIdaMin : 30) : 0;
    const rawTotalMin = abordajeMin + idaMin + stayMin + retornoMin;
    const billedMin = Math.min(360, Math.max(60, Math.ceil(rawTotalMin / 30) * 30));
    const h = Math.floor(billedMin / 60);
    const extraHalfBlocks = (billedMin % 60 === 30) ? 1 : 0;
    timeCost = (h * r.hour) + (extraHalfBlocks * r.half);
    durationText = `${h} h${extraHalfBlocks ? ' y 30 min' : ''} (${$c(r.hour)}/h${extraHalfBlocks ? ` + ${$c(r.half)} bloque 30m` : ''})`;

    updateServiceTimeline(idaMin, abordajeMin, stayMin, retornoMin, rawTotalMin, billedMin);
  } else if(mode === '2'){
    const stayMin = +($('#selStayDestino') ? $('#selStayDestino').value : 60) || 60;
    const isRoundTrip = tripMultiplier === 2;
    const idaMin = lastRouteIdaMin > 0 ? lastRouteIdaMin : 30;
    const abordajeMin = 10;
    const retornoMin = isRoundTrip ? (lastRouteIdaMin > 0 ? lastRouteIdaMin : 30) : 0;
    const rawTotalMin = abordajeMin + idaMin + stayMin + retornoMin;
    const billedMin = stayMin;
    const h = Math.floor(billedMin / 60);
    const extraHalfBlocks = (billedMin % 60 === 30) ? 1 : 0;
    timeCost = (h * r.hour) + (extraHalfBlocks * r.half);
    const waitHoursText = extraHalfBlocks ? `${h > 0 ? `${h} h 30 min` : '30 min'}` : (h === 1 ? '1 hr' : `${h} hrs`);
    durationText = `${waitHoursText} a ${$c(r.hour)}/h`;

    updateServiceTimeline(idaMin, abordajeMin, stayMin, retornoMin, rawTotalMin, billedMin);
  } else if(mode === '3'){
    let h = +$('#selHours34').value || 2;
    let m = +$('#selMins34').value || 0;
    if(h >= 6){
      h = 6;
      m = 0;
    } else if(h * 60 + m > 360){
      m = 0;
    }
    const extraHalfCost = (h < 6 && m === 30) ? r.half : 0;
    let basePkgCost = (r.pkg && r.pkg[h]) ? r.pkg[h] : (h * r.hour);
    if(currentJornada === 'nocturno' && h === 6){
      basePkgCost = 96000;
    }
    timeCost = basePkgCost + extraHalfCost;
    durationText = `${h} h${extraHalfCost ? ' y 30 min' : ''} (${$c(basePkgCost)}${extraHalfCost ? ` + ${$c(extraHalfCost)} bloque 30m` : ''})`;
  } else if(mode === '4'){
    let h = +($('#selHours34') ? $('#selHours34').value : 4) || 4;
    if(h >= 6) h = 6;
    else h = 4;
    const isCon = (selectedEventSubMode === 'con_traslado');
    let planName = '';
    let basePkgCost = 0;
    if(isCon){
      if(h === 6){
        planName = 'Pack Total (6 hrs continuas en el recinto + Traslados ida/vuelta)';
        basePkgCost = 125000;
      } else {
        planName = 'Pack Base (4 hrs continuas en el recinto + Traslados ida/vuelta)';
        basePkgCost = 95000;
      }
      updateServiceTimeline();
    } else {
      if(h === 6){
        planName = 'Plan Total (6 hrs continuas en recinto)';
        basePkgCost = 95000;
      } else {
        planName = 'Plan Base (4 hrs continuas en recinto)';
        basePkgCost = 65000;
      }
      const tlBox = $('#serviceTimelineBox');
      if(tlBox) tlBox.style.display = 'none';
    }
    timeCost = basePkgCost;
    durationText = `Plan Seleccionado: ${planName} — Tarifa Plana Cerrada`;
  } else if(mode === '5'){
    const h = selectedInterProgram || 4;
    let m = +$('#selMins34').value || 0;
    if(h >= 6 || h * 60 + m > 360){
      m = 0;
    }
    const basePkgCost = h === 6 ? 300000 : 250000;
    const progShortName = h === 6 ? 'Programa Crónico / Oncológico' : 'Programa Estándar';
    const extraHours = Math.floor(m / 60);
    const extraHalf = (m % 60 === 30) ? 1 : 0;
    const extraCost = (extraHours * 25000) + (extraHalf * 15000);
    timeCost = basePkgCost + extraCost;

    let extraPart = '';
    if(m === 30) extraPart = ` + 30 min extra (${$c(extraCost)})`;
    else if(m === 60) extraPart = ` + 1 hora extra (${$c(extraCost)})`;
    else if(m === 90) extraPart = ` + 1 hora 30 min (${$c(extraCost)})`;
    else if(m === 120) extraPart = ` + 2 horas extra (${$c(extraCost)})`;

    lastInterBreakdown = `${progShortName} (${$c(basePkgCost)})${extraPart} = Total: ${$c(timeCost)}`;
    durationText = lastInterBreakdown;
    updateServiceTimeline();
  }

  lastTimeCost = timeCost;
  if($('#lblTimeSummaryDesc')){
    if(mode === '5'){
      $('#lblTimeSummaryDesc').textContent = lastInterBreakdown;
    } else if(mode === '4'){
      $('#lblTimeSummaryDesc').textContent = `${durationText}:`;
    } else {
      const jShort = currentJornada === 'habil' ? 'Hábil (Lun a Vie · 06:00 a 20:00)' : currentJornada === 'tarde' ? 'Fin de Semana (Sáb y Dom · 06:00 a 20:00)' : 'Días Festivos (06:00 a 20:00) y Horario Nocturno (20:00 a 06:00)';
      $('#lblTimeSummaryDesc').textContent = `Valor según selección (${durationText} · ${jShort}):`;
    }
  }
  if($('#lblTimeSummaryVal')) $('#lblTimeSummaryVal').textContent = $c(timeCost);

  const isKmService = (mode === '1' || mode === '2');
  const kmCost = isKmService ? lastKmCost : 0;

  if(isKmService){
    // Modalidad 1 o 2 (cobro de KM + Tiempo)
    const titleLabel = mode === '1'
      ? '💰 Suma Total del Servicio (KM + Tiempo de Asistencia)'
      : '💰 Suma Total del Servicio (KM + Tiempo de Espera)';
    $('#sumBoxTitle').textContent = titleLabel;

    $('#sumTimeLabel').textContent = mode === '1'
      ? `Valor por Tiempo de Asistencia (${durationText})`
      : `Valor por Tiempo de Espera en Destino (${durationText})`;

    const fmtKm = lastTotalKm.toFixed(1).replace('.', ',') + ' km';
    $('#sumKmText').textContent = fmtKm;
    $('#sumKmVal').textContent = $c(kmCost);
    $('#sumTimeVal').textContent = $c(timeCost);

    const rawSum = kmCost + timeCost;
    $('#sumRawTotal').textContent = $c(rawSum);

    // En Modalidad 1 y 2 aplica tarifa mínima del anillo si la suma KM + Tiempo es menor
    let finalTotal = Math.round(rawSum / 100) * 100;
    if(detectedRing){
      $('#sumRingFloorRow').style.display = 'flex';
      $('#sumRingFloorVal').textContent = `${detectedRing.name} · Mín. ${$c(detectedRing.minFare)}`;
      finalTotal = Math.max(finalTotal, detectedRing.minFare);
    } else {
      $('#sumRingFloorRow').style.display = 'flex';
      $('#sumRingFloorVal').textContent = 'Ingrese dirección A para verificar mínimo de anillo';
    }

    lastFinalTotal = finalTotal;
    lastAbono50 = Math.round((finalTotal * 0.5) / 50) * 50;
    const saldo50 = finalTotal - lastAbono50;

    $('#sumFinalTotal').textContent = $c(finalTotal);
    $('#sumAbono50').textContent = $c(lastAbono50);
    $('#sumSaldoFinal').textContent = $c(saldo50);
  } else {
    // Modalidad 3 (Cuidados a Domicilio), Modalidad 4 (Eventos Sociales) o Modalidad 5 (Programas Interregionales)
    if(mode === '5'){
      if($('#dirSvcLbl')) $('#dirSvcLbl').textContent = 'Modalidad seleccionada:';
      $('#dirSvcName').textContent = SVC_NAMES[mode];
      $('#dirRegionRow').style.display = 'flex';
      $('#dirRegionVal').textContent = selectedInterRegion;
      if($('#dirTimeLbl')) $('#dirTimeLbl').textContent = 'Valor del Programa Interregional:';
      $('#dirTimeDesc').textContent = lastInterBreakdown;
    } else if(mode === '4'){
      let h = +($('#selHours34') ? $('#selHours34').value : 4) || 4;
      if(h >= 6) h = 6;
      else h = 4;
      const isCon = (selectedEventSubMode === 'con_traslado');
      let planName = '';
      if(isCon){
        planName = h === 6 ? 'Pack Total (6 hrs continuas en el recinto + Traslados ida/vuelta)' : 'Pack Base (4 hrs continuas en el recinto + Traslados ida/vuelta)';
      } else {
        planName = h === 6 ? 'Plan Total (6 hrs continuas en recinto)' : 'Plan Base (4 hrs continuas en recinto)';
      }
      if($('#dirSvcLbl')) $('#dirSvcLbl').textContent = '';
      $('#dirSvcName').textContent = 'Modalidad: 4. Acompañamiento en Eventos Sociales';
      $('#dirRegionRow').style.display = 'none';
      if($('#dirTimeLbl')) $('#dirTimeLbl').textContent = '';
      $('#dirTimeDesc').textContent = `Plan Seleccionado: ${planName} — Tarifa Plana Cerrada`;
    } else {
      if($('#dirSvcLbl')) $('#dirSvcLbl').textContent = 'Modalidad seleccionada:';
      $('#dirSvcName').textContent = SVC_NAMES[mode];
      $('#dirRegionRow').style.display = 'none';
      if($('#dirTimeLbl')) $('#dirTimeLbl').textContent = 'Valor por Tiempo de Asistencia:';
      $('#dirTimeDesc').textContent = `${durationText} · ${getJornadaLabel(currentJornada, mode).split(' (')[0]}`;
    }
    lastFinalTotal = Math.round(timeCost / 100) * 100;
    lastAbono50 = Math.round((lastFinalTotal * 0.5) / 50) * 50;
    const saldo50 = lastFinalTotal - lastAbono50;

    $('#dirFinalTotal').textContent = $c(lastFinalTotal);
    $('#dirAbono50').textContent = $c(lastAbono50);
    $('#dirSaldoFinal').textContent = $c(saldo50);
  }
}

// ===== DETECCIÓN DE ANILLO COMUNAL (SOLO PARA MODALIDAD 1 Y 2) =====
function detectRingFromText(addrText, lat, lon){
  const nText = norm(addrText);
  for(const ring of RINGS_DATA){
    for(const com of ring.comunas){
      if(com === 'Santiago Centro') continue;
      const nCom = norm(com);
      const regex = new RegExp(`\\b${nCom}\\b`, 'i');
      if(regex.test(nText)){
        return {ring, comuna: com};
      }
    }
  }
  if(/\bsantiago centro\b/i.test(nText) || /\bsantiago\b/i.test(nText)){
    return {ring: RINGS_DATA[1], comuna: 'Santiago Centro'};
  }
  if(lat && lon){
    const dMaipu = haversineKm(-33.505, -70.76, lat, lon);
    if(dMaipu <= 8.5) return {ring: RINGS_DATA[0], comuna: 'Sector Anillo 1'};
    if(dMaipu <= 18.5) return {ring: RINGS_DATA[1], comuna: 'Sector Anillo 2'};
    return {ring: RINGS_DATA[2], comuna: 'Sector Anillo 3'};
  }
  return null;
}

function updateRingDisplay(){
  const box = $('#ringInfoBox');
  const mode = $('#b_svc_type').value;
  // Ocultar siempre en Modalidad 4 y 5, o si aún no hay anillo detectado
  if(!detectedRing || mode === '4' || mode === '5'){
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';

  if(mode === '3'){
    const minH = detectedRing.id === 1 ? 2 : (detectedRing.id === 2 ? 3 : 4);
    $('#ringTitle').textContent = `📍 Domicilio de atención: ${detectedComuna} → ${detectedRing.name}`;
    $('#ringDesc').innerHTML = `Por cobertura y distancia territorial, esta comuna contempla un piso mínimo de <b>${minH} horas continuas</b> de atención (mínimo ${minH}h hasta 6h tope).`;
  } else {
    // Modalidad 1 y 2
    $('#ringTitle').textContent = `📍 Comuna de recogida: ${detectedComuna} → ${detectedRing.name}`;
    $('#ringDesc').innerHTML = `Tarifa mínima correspondiente a su dirección: <b>${$c(detectedRing.minFare)}</b> (aplica si la suma de KM + Tiempo resulta menor a este monto).`;
  }
}

// ===== MAPA Y BUSCADOR DE DIRECCIONES (ARCGIS + OSRM) =====
function setTripMode(mult = 2){
  tripMultiplier = 2; // Fijado de manera definitiva en circuito cerrado de Ida y Vuelta (A → B → A)
  if(ptFrom && ptTo && isMapEnabledForCurrentState()){
    computeRoute();
  }
}

function setPickMode(m){
  pickMode = m;
  $('#pickFromBtn').classList.toggle('on', m==='from');
  $('#pickToBtn').classList.toggle('on', m==='to');
  setRouteStatus(m==='from' ? '📍 Toque el punto exacto en el mapa para situar el Inicio (A).' : '🏁 Toque el punto exacto en el mapa para situar el Destino (B).');
}

map.on('click', async function(ev){
  const {lat, lng} = ev.latlng;
  const target = pickMode;
  const addrObj = await reverseGeocodeExact(lat, lng);
  if(addrObj && addrObj.label){
    if(!validateAddressRegion(addrObj, target)){
      return;
    }
    setPoint(target, lat, lng, addrObj.label, false, addrObj.full);
    if(target==='from'){
      ptFrom.label = addrObj.label;
      $('#b_from').value = addrObj.label;
      const det = detectRingFromText(addrObj.full || addrObj.label, lat, lng);
      if(det){
        detectedRing = det.ring;
        detectedComuna = det.comuna;
        updateRingDisplay();
        if($('#b_svc_type').value === '3') refreshDuration34Options(false);
        recalcAll();
      }
    } else {
      ptTo.label = addrObj.label;
      $('#b_to').value = addrObj.label;
    }
  } else {
    setPoint(target, lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`, false);
  }
  if(target==='from' && !ptTo) setPickMode('to');
  if(ptFrom && ptTo && isMapEnabledForCurrentState()) computeRoute();
});

function setPoint(which, lat, lon, label, fit=true, rawFull=''){
  if(which === 'from'){
    ptFrom = {lat:+lat, lon:+lon, label};
    $('#b_from').value = label;

    const det = detectRingFromText(rawFull || label, +lat, +lon);
    if(det){
      detectedRing = det.ring;
      detectedComuna = det.comuna;
      updateRingDisplay();
      if($('#b_svc_type').value === '3') refreshDuration34Options(false);
    }
    if(!markerFrom){
      markerFrom = L.marker([lat, lon], {icon:iconA, draggable:true}).addTo(map);
      markerFrom.on('dragend', async function(e){
        const pos = e.target.getLatLng();
        ptFrom.lat = pos.lat; ptFrom.lon = pos.lng;
        const addrObj = await reverseGeocodeExact(pos.lat, pos.lng);
        if(addrObj && addrObj.label){
          if(!validateAddressRegion(addrObj, 'from')){
            return;
          }
          ptFrom.label = addrObj.label;
          $('#b_from').value = addrObj.label;
          const d2 = detectRingFromText(addrObj.full || addrObj.label, pos.lat, pos.lng);
          if(d2){
            detectedRing = d2.ring;
            detectedComuna = d2.comuna;
            updateRingDisplay();
            if($('#b_svc_type').value === '3') refreshDuration34Options(false);
          }
        }
        recalcAll();
        if(ptFrom && ptTo && isMapEnabledForCurrentState()) computeRoute();
      });
    } else {
      markerFrom.setLatLng([lat, lon]);
    }
    recalcAll();
  } else {
    ptTo = {lat:+lat, lon:+lon, label};
    $('#b_to').value = label;
    if(!markerTo){
      markerTo = L.marker([lat, lon], {icon:iconB, draggable:true}).addTo(map);
      markerTo.on('dragend', async function(e){
        const pos = e.target.getLatLng();
        ptTo.lat = pos.lat; ptTo.lon = pos.lng;
        const addrObj = await reverseGeocodeExact(pos.lat, pos.lng);
        if(addrObj && addrObj.label){
          if(!validateAddressRegion(addrObj, 'to')){
            return;
          }
          ptTo.label = addrObj.label;
          $('#b_to').value = addrObj.label;
        }
        if(ptFrom && ptTo && isMapEnabledForCurrentState()) computeRoute();
      });
    } else {
      markerTo.setLatLng([lat, lon]);
    }
  }
  if(fit && isMapEnabledForCurrentState()){
    if(ptFrom && ptTo){
      map.fitBounds([[ptFrom.lat, ptFrom.lon], [ptTo.lat, ptTo.lon]], {padding:[45,45]});
    } else {
      map.setView([lat, lon], 16);
    }
  }
}

async function reverseGeocodeExact(lat, lon){
  try{
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lon},${lat}&langCode=ES`;
    const r = await fetch(url);
    const d = await r.json();
    if(d && d.address){
      const a = d.address;
      const street = a.Address || a.Match_addr || '';
      const city = a.District || a.City || a.Subregion || '';
      const reg = a.Region || '';
      const full = [street, a.Nbrhd, a.District, a.City, a.Subregion, reg].filter(Boolean).join(', ');
      const lbl = (street && city) ? `${street}, ${city}` : (street || a.Match_addr || '');
      return {
        label: lbl,
        full,
        result: {
          address: {
            countrySubdivision: reg,
            municipalitySubdivision: city
          }
        }
      };
    }
  }catch(e){}
  try{
    const url2 = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
    const r2 = await fetch(url2);
    const d2 = await r2.json();
    if(d2 && d2.address){
      const a = d2.address;
      const road = a.road || a.pedestrian || '';
      const num = a.house_number ? ' ' + a.house_number : '';
      const com = a.city_district || a.suburb || a.town || a.municipality || a.city || '';
      const reg = a.state || '';
      const lbl = [road + num, com].filter(Boolean).join(', ') || d2.display_name;
      return {
        label: lbl,
        full: d2.display_name || lbl,
        result: {
          address: {
            countrySubdivision: reg,
            municipalitySubdivision: com
          }
        }
      };
    }
  }catch(e){}
  return null;
}

function onType(which){
  clearTimeout(typeTimers[which]);
  const errBox = which === 'from' ? $('#errFrom') : $('#errTo');
  if(errBox){ errBox.style.display = 'none'; errBox.textContent = ''; }
  const inp = which === 'from' ? $('#b_from') : $('#b_to');
  if(inp) inp.style.borderColor = '';

  if(which==='from') ptFrom = null;
  else ptTo = null;

  const val = (which==='from' ? $('#b_from').value : $('#b_to').value).trim();
  const sugBox = which==='from' ? $('#sugFrom') : $('#sugTo');

  if(which==='from' && val.length >= 3){
    const det = detectRingFromText(val, null, null);
    if(det){
      detectedRing = det.ring;
      detectedComuna = det.comuna;
      updateRingDisplay();
      if($('#b_svc_type').value === '3') refreshDuration34Options(false);
      recalcAll();
    }
  }

  if(val.length < 3){
    sugBox.style.display = 'none';
    return;
  }
  typeTimers[which] = setTimeout(()=>searchAddr(which, false), 280);
}

function onFromBlur(){
  const val = ($('#b_from') && $('#b_from').value || '').trim();
  if(val.length >= 3){
    const det = detectRingFromText(val, ptFrom ? ptFrom.lat : null, ptFrom ? ptFrom.lon : null);
    if(det){
      detectedRing = det.ring;
      detectedComuna = det.comuna;
      updateRingDisplay();
      if($('#b_svc_type').value === '3') refreshDuration34Options(false);
      recalcAll();
    }
  }
}

// ===== CONFIGURACIÓN Y PARÁMETROS GEOGRÁFICOS DE BÚSQUEDA (TOMTOM / ARCGIS) =====
function getTomTomSearchParams(){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  const isInterregional = (mode === '5');
  const countrySet = 'CL';
  // Bounding box dinámico según la modalidad:
  // - Modalidades 1, 2, 3 o 4 (Cobertura Local / RM): '-71.15,-33.80,-70.35,-33.20'
  // - Programas Interregionales (Modalidad 5): '-72.10,-34.70,-70.20,-32.50' (V Región, RM y VI Región)
  const boundingBox = isInterregional
    ? '-72.10,-34.70,-70.20,-32.50'
    : '-71.15,-33.80,-70.35,-33.20';
  return { countrySet, boundingBox, isInterregional, mode };
}
window.getTomTomSearchParams = getTomTomSearchParams;

// ===== VALIDACIÓN Y FILTRO SEMÁNTICO DE RESULTADOS POR REGIÓN =====
function validateAddressRegion(item, which){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  const errEl = which === 'from' ? $('#errFrom') : $('#errTo');
  const inp = which === 'from' ? $('#b_from') : $('#b_to');

  function clearError(){
    if(errEl){
      errEl.style.display = 'none';
      errEl.textContent = '';
    }
    if(inp) inp.style.borderColor = '';
  }

  function triggerError(msg){
    if(errEl){
      errEl.style.display = 'block';
      errEl.textContent = msg;
    }
    if(inp){
      inp.value = '';
      inp.style.borderColor = '#ef4444';
      inp.focus();
    }
    // Cancelar trazado en el mapa y reiniciar puntos
    if(which === 'from'){
      if(markerFrom && map){ map.removeLayer(markerFrom); markerFrom = null; }
      ptFrom = null;
    } else {
      if(markerTo && map){ map.removeLayer(markerTo); markerTo = null; }
      ptTo = null;
    }
    if(routeLine && map){ map.removeLayer(routeLine); routeLine = null; }
    lastTotalKm = 0;
    lastRouteIdaMin = 0;
    lastRouteVueltaMin = 0;
    const packMetrics = $('#packRouteMetricsCard');
    if(packMetrics) packMetrics.style.display = 'none';
    const resPanel = $('#resultPanel');
    if(resPanel) resPanel.style.display = 'none';
    setRouteStatus('');
    recalcAll();
    return false;
  }

  if(!item) return false;

  const addr = (item.result && item.result.address) || {};
  const subDiv = (addr.countrySubdivision || '').trim();
  const muniDiv = (addr.municipalitySubdivision || '').trim();
  const fullRaw = (item.rawFull || item.title || item.label || '').toLowerCase();
  const subDivLow = subDiv.toLowerCase();
  const muniDivLow = muniDiv.toLowerCase();

  // Helper de detección de Región Metropolitana
  const isRM = (
    subDivLow.includes('metropolitana') ||
    subDivLow.includes('santiago') ||
    subDivLow.includes('cordillera') ||
    subDivLow.includes('maipo') ||
    subDivLow.includes('talagante') ||
    subDivLow.includes('melipilla') ||
    subDivLow.includes('chacabuco') ||
    fullRaw.includes('región metropolitana') ||
    fullRaw.includes('region metropolitana') ||
    Boolean(detectRingFromText(fullRaw, null, null))
  ) && !subDivLow.includes('valparaíso') && !subDivLow.includes('valparaiso') && !subDivLow.includes("o'higgins") && !subDivLow.includes('ohiggins');

  // Helper de detección de Valparaíso
  const isValpo = subDivLow.includes('valparaíso') ||
                  subDivLow.includes('valparaiso') ||
                  muniDivLow.includes('valparaíso') ||
                  muniDivLow.includes('valparaiso') ||
                  muniDivLow.includes('viña del mar') ||
                  muniDivLow.includes('vina del mar') ||
                  muniDivLow.includes('concón') ||
                  muniDivLow.includes('concon') ||
                  muniDivLow.includes('quilpué') ||
                  muniDivLow.includes('quilpue') ||
                  muniDivLow.includes('villa alemana') ||
                  muniDivLow.includes('san antonio') ||
                  muniDivLow.includes('quillota');

  // Helper de detección de O'Higgins
  const isOHiggins = subDivLow.includes("o'higgins") ||
                     subDivLow.includes('ohiggins') ||
                     subDivLow.includes('libertador') ||
                     muniDivLow.includes('rancagua') ||
                     muniDivLow.includes('machalí') ||
                     muniDivLow.includes('machali') ||
                     muniDivLow.includes('rengo') ||
                     muniDivLow.includes('san fernando');

  if(mode === '1' || mode === '2' || mode === '3' || mode === '4'){
    // Para Modalidades 1, 2, 3 y 4 (Cobertura Local / RM):
    if(!isRM){
      return triggerError('La dirección ingresada se encuentra fuera de nuestra zona de cobertura urbana (Región Metropolitana).');
    }
  } else if(mode === '5'){
    // Para Programas Interregionales:
    if(which === 'from'){
      const isValpoTarget = selectedInterRegion.includes('Valparaíso') || selectedInterRegion.includes('Valparaiso');
      if(isValpoTarget){
        if(!isValpo){
          return triggerError('La dirección de origen debe pertenecer a la Región de Valparaíso según el programa seleccionado. Por favor corrija el punto de partida.');
        }
      } else {
        // Región de O'Higgins
        if(!isOHiggins){
          return triggerError("La dirección de origen debe pertenecer a la Región de O'Higgins según el programa seleccionado. Por favor corrija el punto de partida.");
        }
      }
    } else {
      // Destino en Modalidad 5 debe ser Santiago / RM
      if(!isRM){
        return triggerError('El destino del programa interregional debe ubicarse en la Región Metropolitana (Santiago). Por favor ingrese un centro médico o dirección en Santiago.');
      }
    }
  }

  clearError();
  return true;
}
window.validateAddressRegion = validateAddressRegion;

async function searchAddr(which, autoPickFirst){
  const inp = which==='from' ? $('#b_from') : $('#b_to');
  const sugBox = which==='from' ? $('#sugFrom') : $('#sugTo');
  const q = inp.value.trim();
  if(!q) return;

  const { countrySet, boundingBox, isInterregional, mode } = getTomTomSearchParams();
  setRouteStatus('🔍 Buscando dirección exacta...');

  try{
    const qLow = q.toLowerCase();
    const medMatches = MEDICAL_PLACES.filter(m =>
      m.name.toLowerCase().includes(qLow) || m.addr.toLowerCase().includes(qLow)
    ).map(m => ({
      title: m.name,
      subtitle: m.addr,
      fullLabel: `${m.name} (${m.addr})`,
      rawFull: `${m.name}, ${m.addr}, Santiago, Región Metropolitana de Santiago`,
      lat: m.lat,
      lon: m.lon,
      result: {
        address: {
          countrySubdivision: 'Región Metropolitana de Santiago',
          municipalitySubdivision: m.comuna || 'Santiago'
        }
      }
    }));

    let tomtomOrArcResults = [];
    const apiKey = window.TOMTOM_API_KEY || '';

    if(apiKey){
      try {
        const tomtomUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?key=${encodeURIComponent(apiKey)}&countrySet=${countrySet}&bbox=${boundingBox}&limit=6&language=es-ES`;
        const resTom = await fetch(tomtomUrl);
        if(resTom.ok){
          const dataTom = await resTom.json();
          if(dataTom && dataTom.results && dataTom.results.length > 0){
            tomtomOrArcResults = dataTom.results.map(r => {
              const a = r.address || {};
              const title = a.freeformAddress || a.streetName || q;
              const sub = [a.municipalitySubdivision || a.municipality, a.countrySubdivision].filter(Boolean).join(', ') || 'Chile';
              return {
                title: title,
                subtitle: sub,
                fullLabel: title,
                rawFull: `${title}, ${sub}`,
                lat: r.position ? r.position.lat : 0,
                lon: r.position ? r.position.lon : 0,
                result: {
                  address: {
                    countrySubdivision: a.countrySubdivision || '',
                    municipalitySubdivision: a.municipalitySubdivision || a.municipality || ''
                  }
                }
              };
            });
          }
        }
      } catch(eTom) {
        console.warn('TomTom Search falló, utilizando respaldo:', eTom);
      }
    }

    if(tomtomOrArcResults.length === 0){
      const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(q)}&countryCode=CHL&searchExtent=${boundingBox}&maxLocations=6&outFields=PlaceName,Match_addr,Place_addr,City,Subregion,District,Nbrhd,Region`;
      const r = await fetch(arcUrl);
      const data = await r.json();

      if(data && data.candidates && data.candidates.length > 0){
        tomtomOrArcResults = data.candidates.map(c => {
          const attr = c.attributes || {};
          const mainAddr = (c.address || attr.Match_addr || '').replace(/, CHL$/i, '');
          const subAddr = (attr.Place_addr || '').replace(/, CHL$/i, '');
          const title = attr.PlaceName && !mainAddr.startsWith(attr.PlaceName)
            ? `${attr.PlaceName} · ${mainAddr}`
            : mainAddr;
          const reg = attr.Region || (attr.Subregion && attr.Subregion.includes('Santiago') ? 'Región Metropolitana de Santiago' : '');
          const muni = attr.District || attr.City || attr.Nbrhd || '';
          return {
            title: title,
            subtitle: subAddr || 'Chile',
            fullLabel: title,
            rawFull: `${title}, ${subAddr}, ${muni}, ${reg}`,
            lat: c.location.y,
            lon: c.location.x,
            result: {
              address: {
                countrySubdivision: reg,
                municipalitySubdivision: muni
              }
            }
          };
        });
      }
    }

    const combined = [...medMatches, ...tomtomOrArcResults].slice(0, 7);

    if(combined.length === 0){
      sugBox.innerHTML = `<div class="sug-item"><small>No encontramos esa dirección. Intente indicar calle, número y comuna.</small></div>`;
      sugBox.style.display = 'block';
      setRouteStatus('⚠️ Dirección no encontrada.');
      return;
    }

    if(autoPickFirst){
      const first = combined[0];
      sugBox.style.display = 'none';
      if(!validateAddressRegion(first, which)){
        return;
      }
      const userNumberMatch = q.match(/\b(\d{1,5})\b/);
      let finalLabel = first.fullLabel;
      if(userNumberMatch && !finalLabel.includes(userNumberMatch[1])){
        finalLabel = `${q} (${first.title})`;
      }
      setPoint(which, first.lat, first.lon, finalLabel, true, `${q}, ${first.rawFull}`);
      if(isMapEnabledForCurrentState()){
        if(ptFrom && ptTo) computeRoute();
        else setRouteStatus('✅ Dirección ubicada. Ahora ingrese el segundo punto.');
      } else {
        setRouteStatus('');
      }
      return;
    }

    window._lastSugs = combined;
    sugBox.innerHTML = combined.map((item, idx) => `
      <div class="sug-item" onclick="pickSugIndex('${which}', ${idx})">
        <b>${item.title}</b>
        <small>${item.subtitle}</small>
      </div>
    `).join('');
    sugBox.style.display = 'block';
    setRouteStatus('Seleccione la dirección exacta de la lista desplegable.');
  }catch(e){
    setRouteStatus('⚠️ Error al consultar dirección.');
  }
}

function pickSugIndex(which, idx){
  const item = (window._lastSugs || [])[idx];
  if(!item) return;
  const sugBox = which==='from' ? $('#sugFrom') : $('#sugTo');
  sugBox.style.display = 'none';

  if(!validateAddressRegion(item, which)){
    return;
  }

  const inp = which==='from' ? $('#b_from') : $('#b_to');
  const typed = inp.value.trim();
  const userNum = typed.match(/\b(\d{1,5})\b/);
  let label = item.fullLabel;
  if(userNum && !label.includes(userNum[1])){
    label = `${typed} (${item.title})`;
  }
  setPoint(which, item.lat, item.lon, label, true, `${typed}, ${item.rawFull}`);
  if(isMapEnabledForCurrentState()){
    if(which==='from' && !ptTo) setPickMode('to');
    if(ptFrom && ptTo) computeRoute();
  } else {
    setRouteStatus('');
  }
}

document.addEventListener('click', function(ev){
  if(!ev.target.closest('.search-wrap')){
    $('#sugFrom').style.display = 'none';
    $('#sugTo').style.display = 'none';
  }
});

async function calculateNow(){
  if(!ptFrom && $('#b_from').value.trim()){
    await searchAddr('from', true);
  }
  if(!ptTo && $('#b_to').value.trim()){
    await searchAddr('to', true);
  }
  if(!ptFrom || !ptTo){
    setRouteStatus('⚠️ Por favor indique tanto la dirección de Recogida (A) como la de Destino (B).');
    return;
  }
  computeRoute();
}

async function computeRoute(){
  if(!ptFrom || !ptTo) return;
  const isRoundTrip = true;
  setRouteStatus('🚗 Calculando kilómetros exactos de Ida y Vuelta...');
  try{
    const coords = `${ptFrom.lon},${ptFrom.lat};${ptTo.lon},${ptTo.lat};${ptFrom.lon},${ptFrom.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    const data = await r.json();

    if(data && data.routes && data.routes.length > 0){
      const route = data.routes[0];
      const legs = route.legs || [];
      const rawIda = legs[0] ? legs[0].distance / 1000 : (route.distance / 2000);
      const rawTotal = route.distance / 1000;
      lastIdaKm = Math.round(rawIda * 10) / 10;
      lastTotalKm = Math.round(rawTotal * 10) / 10;
      lastVueltaKm = Math.max(0, Math.round((lastTotalKm - lastIdaKm) * 10) / 10);
      const totalDurationMin = Math.round(route.duration / 60);
      const idaDurationMin = (legs[0] && legs[0].duration)
        ? Math.max(1, Math.round(legs[0].duration / 60))
        : Math.max(1, Math.round(totalDurationMin / 2));
      const vueltaDurationMin = (legs[1] && legs[1].duration)
        ? Math.max(1, Math.round(legs[1].duration / 60))
        : Math.max(1, totalDurationMin - idaDurationMin);
      lastRouteVueltaMin = vueltaDurationMin;

      if(routeLine) map.removeLayer(routeLine);
      routeLine = L.geoJSON(route.geometry, {
        style: {color:'#0f766e', weight:6, opacity:0.85}
      }).addTo(map);
      map.fitBounds(routeLine.getBounds(), {padding:[40,40]});

      renderPricing(lastIdaKm, lastVueltaKm, lastTotalKm, totalDurationMin, idaDurationMin, vueltaDurationMin);
      const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
      if(mode === '4' || mode === '5'){
        setRouteStatus('✅ Ruta de Ida y Vuelta calculada y confirmada.');
      } else {
        setRouteStatus('✅ Ruta de Ida y Vuelta calculada y sumada al total.');
      }
    } else {
      setRouteStatus('⚠️ No se pudo trazar ruta vehicular entre ambos puntos.');
    }
  }catch(e){
    const dKm = Math.round(haversineKm(ptFrom.lat, ptFrom.lon, ptTo.lat, ptTo.lon) * 1.3 * 10) / 10;
    const totalKm = Math.round(dKm * 2 * 10) / 10;
    const estIdaMin = Math.max(15, Math.round(dKm * 1.3));
    lastIdaKm = dKm;
    lastVueltaKm = dKm;
    lastTotalKm = totalKm;
    lastRouteVueltaMin = estIdaMin;
    renderPricing(dKm, dKm, totalKm, estIdaMin * 2, estIdaMin, estIdaMin);
    setRouteStatus('✅ Distancia calculada.');
  }
}

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function renderPricing(idaKm, vueltaKm, totalKm, totalMin, idaMin, vueltaMin){
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  const isRoundTrip = tripMultiplier === 2;
  const rIda = Math.round(idaKm * 10) / 10;
  const rVuelta = Math.round(vueltaKm * 10) / 10;
  const rTotal = Math.round(totalKm * 10) / 10;
  lastIdaKm = rIda;
  lastVueltaKm = rVuelta;
  lastTotalKm = rTotal;
  lastRouteTotalMin = totalMin || 0;
  lastRouteIdaMin = (idaMin && idaMin > 0) ? idaMin : (isRoundTrip ? Math.max(1, Math.round(lastRouteTotalMin / 2)) : lastRouteTotalMin);
  lastRouteVueltaMin = (vueltaMin && vueltaMin > 0) ? vueltaMin : (lastRouteVueltaMin > 0 ? lastRouteVueltaMin : lastRouteIdaMin);
  const fmtIda = rIda.toFixed(1).replace('.', ',');
  const fmtVuelta = rVuelta.toFixed(1).replace('.', ',');
  const fmtTotal = rTotal.toFixed(1).replace('.', ',');
  const modeLabel = 'Ida y Vuelta (A → B → A)';

  // Tarjeta resumen de distancia y tiempo bajo confirmación de ruta para packs paquetizados
  const packCard = $('#packRouteMetricsCard');
  if(packCard){
    if((mode === '4' && selectedEventSubMode === 'con_traslado') || mode === '5'){
      packCard.style.display = 'block';
      const vMin = lastRouteVueltaMin > 0 ? lastRouteVueltaMin : lastRouteIdaMin;
      if($('#packMetricKm')) $('#packMetricKm').textContent = `${fmtTotal} km (Ida + Vuelta)`;
      if($('#packMetricTime')) $('#packMetricTime').textContent = `${lastRouteIdaMin} min de ida + ${vMin} min de retorno`;
    } else {
      packCard.style.display = 'none';
    }
  }

  $('#resultPanel').style.display = (mode === '1' || mode === '2') ? 'block' : 'none';
  $('#lblResultTitle').textContent = 'Distancia total Ida y Vuelta:';
  $('#outKm').textContent = `${fmtTotal} km`;
  $('#outTime').textContent = totalMin > 0 ? `(aprox. ${totalMin} min de conducción total · ${lastRouteIdaMin} min de ida)` : '';

  if(mode === '5'){
    lastKmCost = 0;
    $('#outPrice').textContent = 'Incluido';
    $('#bdOneWay').textContent = `${fmtIda} km (${lastRouteIdaMin} min de viaje)`;
    $('#rowReturn').style.display = 'flex';
    $('#bdReturn').textContent = `${fmtVuelta} km`;
    $('#bdMode').textContent = `${modeLabel} · Dedicación Exclusiva`;
    $('#bdTotalPrice').textContent = 'Incluido en Programa';
  } else if(mode === '4'){
    lastKmCost = 0;
    $('#outPrice').textContent = 'Incluido';
    $('#bdOneWay').textContent = `${fmtIda} km (${lastRouteIdaMin} min de viaje)`;
    $('#rowReturn').style.display = 'flex';
    $('#bdReturn').textContent = `${fmtVuelta} km`;
    $('#bdMode').textContent = `${modeLabel} · Dedicación Exclusiva`;
    $('#bdTotalPrice').textContent = 'Incluido en Pack';
  } else {
    lastKmCost = Math.round((rTotal * PRICE_PER_KM) / 100) * 100;
    $('#outPrice').textContent = $c(lastKmCost);
    $('#bdOneWay').textContent = `${fmtIda} km (${lastRouteIdaMin} min de viaje)`;
    $('#rowReturn').style.display = isRoundTrip ? 'flex' : 'none';
    $('#bdReturn').textContent = `${fmtVuelta} km`;
    $('#bdMode').textContent = modeLabel;
    $('#bdTotalPrice').textContent = $c(lastKmCost);
  }

  recalcularTodoElServicio('mapRoute');
}

function useMyLocation(){
  if(!navigator.geolocation){
    setRouteStatus('⚠️ Su navegador no soporta geolocalización.');
    return;
  }
  setRouteStatus('📍 Obteniendo su ubicación actual...');
  navigator.geolocation.getCurrentPosition(async pos => {
    const {latitude, longitude} = pos.coords;
    setPoint('from', latitude, longitude, 'Mi ubicación actual', true);
    const addrObj = await reverseGeocodeExact(latitude, longitude);
    if(addrObj && addrObj.label){
      ptFrom.label = addrObj.label;
      $('#b_from').value = addrObj.label;
      const det = detectRingFromText(addrObj.full || addrObj.label, latitude, longitude);
      if(det){
        detectedRing = det.ring;
        detectedComuna = det.comuna;
        updateRingDisplay();
        if($('#b_svc_type').value === '3') refreshDuration34Options(false);
      }
    }
    setPickMode('to');
    recalcAll();
    if(ptFrom && ptTo && isMapEnabledForCurrentState()) computeRoute();
  }, () => {
    setRouteStatus('⚠️ No se pudo acceder al GPS. Puede escribir su dirección o tocar el mapa.');
  });
}

function setRouteStatus(msg){
  $('#routeStatusMsg').textContent = msg;
}

// ===== AGENDA, GESTIÓN DE CAPACIDAD Y REGLAS DE BLOQUEO AUTOMATIZADO =====
// Escalabilidad Multi-recurso: cambiar a 2 o más en el futuro habilita múltiples reservas por bloque automáticamente
let capacidadSimultanea = 1;

const CHILE_FERIADOS = {
  '2026-01-01': 'Año Nuevo',
  '2026-04-03': 'Viernes Santo',
  '2026-04-04': 'Sábado Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-05-21': 'Glorias Navales',
  '2026-06-21': 'Pueblos Indígenas',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-16': 'Virgen del Carmen',
  '2026-08-15': 'Asunción de la Virgen',
  '2026-09-18': 'Fiestas Patrias',
  '2026-09-19': 'Glorias del Ejército',
  '2026-09-20': 'Fiestas Patrias',
  '2026-10-12': 'Encuentro de Dos Mundos',
  '2026-10-31': 'Iglesias Evangélicas',
  '2026-11-01': 'Todos los Santos',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
  '2027-01-01': 'Año Nuevo',
  '2027-03-26': 'Viernes Santo',
  '2027-03-27': 'Sábado Santo',
  '2027-05-01': 'Día del Trabajo',
  '2027-05-21': 'Glorias Navales'
};

function isChileHoliday(dateStr){
  return Boolean(CHILE_FERIADOS[dateStr]);
}

function getChileHolidayName(dateStr){
  return CHILE_FERIADOS[dateStr] || '';
}

const BLOCK_HOURS = {
  manana: [
    '06:00', '06:15', '06:30', '06:45',
    '07:00', '07:15', '07:30', '07:45',
    '08:00', '08:15', '08:30', '08:45',
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00'
  ],
  tarde: [
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00'
  ],
  noche: [
    '22:00', '22:15', '22:30', '22:45',
    '23:00', '23:15', '23:30', '23:45',
    '00:00', '00:15', '00:30', '00:45',
    '01:00', '01:15', '01:30', '01:45',
    '02:00', '02:15', '02:30', '02:45',
    '03:00', '03:15', '03:30', '03:45',
    '04:00'
  ]
};

function getShiftEndTime(blockId){
  if(blockId === 'manana') return 12 * 60; // 12:00 hrs (720 min)
  if(blockId === 'tarde')  return 20 * 60; // 20:00 hrs (1200 min)
  if(blockId === 'noche')  return 28 * 60; // 04:00 hrs (1680 min = 24:00 + 04:00)
  return 24 * 60;
}

function getSlotStartMin(h, blockId){
  if(!h) return 0;
  const [hh, mm] = h.split(':').map(Number);
  let mins = hh * 60 + (mm || 0);
  if(blockId === 'noche' && hh < 12){
    mins += 24 * 60;
  }
  return mins;
}

const INTERREGIONAL_HOURS = [
  '05:00', '05:15', '05:30', '05:45',
  '06:00', '06:15', '06:30', '06:45',
  '07:00', '07:15', '07:30', '07:45',
  '08:00', '08:15', '08:30', '08:45',
  '09:00'
];

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_NAMES_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

let selectedBlock = null; // 'manana' | 'tarde' | 'noche' | null (Paso 1 pendiente de selección)
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth(); // 0..11

function toYMD(dt){
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}
function parseYMD(str){
  const [y,m,d] = String(str).split('-').map(Number);
  return new Date(y, m-1, d, 0, 0, 0, 0);
}
function addDaysYMD(str, days){
  const dt = parseYMD(str);
  dt.setDate(dt.getDate() + days);
  return toYMD(dt);
}
function formatHumanDate(str){
  if(!str) return '—';
  const dt = parseYMD(str);
  return `${DAY_NAMES_FULL[dt.getDay()]} ${dt.getDate()} de ${MONTH_NAMES[dt.getMonth()]} de ${dt.getFullYear()}`;
}

function getRealNow(){
  return new Date();
}
function getBookingWindowBounds(){
  const now = getRealNow();
  const minMs = now.getTime() + 24 * 60 * 60 * 1000; // Mínimo 24 horas de anticipación
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const maxDateObj = new Date(todayMidnight);
  maxDateObj.setDate(maxDateObj.getDate() + 30); // Máximo 30 días corridos hacia adelante
  maxDateObj.setHours(23, 59, 59, 999);
  return { now, minMs, todayStr: toYMD(todayMidnight), maxDateStr: toYMD(maxDateObj), maxMs: maxDateObj.getTime() };
}

function isSlotAtLeast24hAhead(dateStr, timeStr, isNochePostMidnight = false){
  const { minMs, maxDateStr } = getBookingWindowBounds();
  if(dateStr > maxDateStr) return false;
  const [y,m,d] = dateStr.split('-').map(Number);
  const [hh,mm] = timeStr.split(':').map(Number);
  const slotDt = new Date(y, m-1, d + (isNochePostMidnight ? 1 : 0), hh, mm, 0, 0);
  return slotDt.getTime() >= minMs;
}

function getBlockHoursList(blockId){
  if(blockId === 'manana') return BLOCK_HOURS.manana;
  if(blockId === 'tarde') return BLOCK_HOURS.tarde;
  if(blockId === 'noche') return BLOCK_HOURS.noche;
  return [];
}

function seed(){
  const now = getRealNow();
  const baseDate = toYMD(now);
  const dMananaOcupada = addDaysYMD(baseDate, 3);    // Ejemplo: Bloque Mañana ocupado -> "Último cupo"
  const dInterregional = addDaysYMD(baseDate, 5);    // Ejemplo: Interregional día completo -> "Agotado"
  const dEventoNocturno = addDaysYMD(baseDate, 8);   // Ejemplo: Turno Noche (22:00) -> Bloquea Mañana de día +9 por descanso post-nocturno
  const dDosTurnos = addDaysYMD(baseDate, 12);       // Ejemplo: 2 turnos agendados (Mañana y Tarde) -> Bloquea Turno Noche por tope diario (máx. 2 turnos)
  const sv=(id,tid,date,start,dur,pat,age,dx,coord,ph,from,to,mob,req,comp,fare,paid,st,extra={})=>({
    id,tid,date,start:tm(start),dur,pat,age,dx,coord,ph,from,to,mob,req,comp,fare,paid,st,...extra
  });
  return{
    seedVersion: 3,
    nid: 16,
    techs:[
      {id:'t1',nom:'Daniela González Bouyssieres',rut:'Registro SIS Nº 442762',tel:'+56929990095',veh:'Unidad 1 · Vehículo Acondicionado Clase A2',col:'#0f766e',act:true},
      {id:'t2',nom:'Unidad TENS 2 (Respaldo)',rut:'15.987.654-3',tel:'+56933334444',veh:'Unidad 2',col:'#c2410c',act:false}
    ],
    svcs:[
      sv(1,'t1',dMananaOcupada,'08:30',120,'Rosa Medina',82,'1. Servicio Integral · Control cardiológico','Andrea Medina','+56977778888','Maipú, Av. Los Pajaritos 1450','Clínica Santa María, Providencia','Silla de ruedas plegable',['Acompañamiento en box médico','Control de signos vitales'],true,42000,21000,'Confirmado',{block:'manana',svcType:'1'}),
      sv(2,'t1',dInterregional,'08:00',360,'Jorge Salas',76,'5. Programas Interregionales (Región de Valparaíso) · Control Oncológico','Luis Salas','+56966665555','Viña del Mar, Av. Libertad 450','Instituto Nacional del Cáncer, Santiago','Camina con asistencia/bastón',['Acompañamiento en box médico','Control de signos vitales'],true,300000,150000,'Confirmado',{block:'full',fullDay:true,svcType:'5',blocksPrevNight:true}),
      sv(3,'t1',dEventoNocturno,'22:00',360,'María Opazo',84,'4. Acompañamiento a Eventos Sociales · Matrimonio familiar','Pía Opazo','+56944443333','Maipú, Camino a Rinconada 800','Centro de Eventos, Calera de Tango','Silla de ruedas plegable',['Control de signos vitales','Asistencia de higiene/confort'],true,80000,40000,'Confirmado',{block:'noche',svcType:'4',blocksNextMorning:true}),
      sv(4,'t1',dDosTurnos,'08:30',120,'Héctor Muñoz',79,'1. Servicio Integral · Control traumatología','Carmen Muñoz','+56955556666','Maipú, Pajaritos 2200','Hospital del Trabajador, Providencia','Camina con bastón',['Acompañamiento en box médico'],true,42000,21000,'Confirmado',{block:'manana',svcType:'1'}),
      sv(5,'t1',dDosTurnos,'15:00',180,'Elena Valdés',81,'2. Traslado con Espera · Sesión Kinesiología','Carlos Valdés','+56933332222','Maipú, Segunda Transversal 500','Centro Médico, Las Condes','Silla de ruedas plegable',['Acompañamiento en box médico'],true,36000,18000,'Confirmado',{block:'tarde',svcType:'2'})
    ],
    blocks:[]
  };
}

function load(){
  try{
    const parsed = JSON.parse(localStorage.getItem(K));
    if(parsed && parsed.seedVersion === 3){
      if(!Array.isArray(parsed.blocks)) parsed.blocks = [];
      return parsed;
    }
    return null;
  }catch(x){return null}
}
function save(){try{localStorage.setItem(K,JSON.stringify(D))}catch(x){}}
let D=load()||seed();
save();

// Obtener las unidades activas según capacidadSimultanea
function getActiveUnitsForCapacity(){
  const allTechs = D.techs || [];
  const active = allTechs.filter(t => t.act);
  const result = [];
  for(let i = 0; i < capacidadSimultanea; i++){
    if(active[i]) result.push(active[i]);
    else if(allTechs[i]) result.push(allTechs[i]);
    else result.push({id: 'u'+(i+1), nom: `Profesional TENS · Unidad ${i+1}`, veh: `Unidad ${i+1}`, act: true});
  }
  return result;
}

// Determinar qué bloque ocupa un servicio guardado
function inferServiceBlock(s){
  if(s.fullDay || s.block === 'full' || s.svcType === '5' || /interregional/i.test(s.dx || '')) return 'full';
  if(s.crossShift) return 'full';
  if(s.block === 'noche') return 'noche';
  if(s.block === 'manana' || s.block === 'tarde') return s.block;
  const startMin = Number(s.start);
  const durMin = Number(s.dur);
  if(startMin >= 22 * 60 || startMin < 4 * 60) return 'noche';
  // Si una reserva por su duración invade dos turnos o la ventana intermedia (12:00 a 14:00 hrs):
  if(startMin < 12 * 60 && (startMin + durMin) > 12 * 60) return 'full';
  return (startMin < 12 * 60) ? 'manana' : 'tarde';
}

// Determinar si un servicio termina después de las 22:00 hrs (1320 min) o pertenece al Turno Noche
function doesServiceEndAfter22(s){
  if(s.blocksNextMorning) return true;
  if(s.block === 'noche') return true;
  const startMin = Number(s.start);
  const durMin = Number(s.dur);
  if(startMin >= 22 * 60) return true;
  return (startMin + durMin) > (22 * 60);
}

// Evaluar el estado detallado de capacidad y bloqueos para una fecha YYYY-MM-DD
function evaluateDateCapacity(dateStr){
  const { minMs, todayStr, maxDateStr } = getBookingWindowBounds();
  if(dateStr < todayStr || dateStr > maxDateStr){
    return {
      inRange: false,
      outReason: dateStr < todayStr ? 'Fecha pasada' : 'Supera el límite máximo de 30 días',
      manana: { availUnits: [], used: capacidadSimultanea, free: 0, available: false, reason: 'Fuera de rango permitido' },
      tarde:  { availUnits: [], used: capacidadSimultanea, free: 0, available: false, reason: 'Fuera de rango permitido' },
      noche:  { availUnits: [], used: capacidadSimultanea, free: 0, available: false, reason: 'Fuera de rango permitido' },
      interregional: { availUnits: [], free: 0, available: false, reason: 'Fuera de rango permitido' },
      status: 'off'
    };
  }

  const units = getActiveUnitsForCapacity();
  const prevDateStr = addDaysYMD(dateStr, -1);
  const nextDateStr = addDaysYMD(dateStr, 1);

  const daySvcs = (D.svcs || []).filter(s => s.date === dateStr && s.st !== 'Cancelado');
  const prevDaySvcs = (D.svcs || []).filter(s => s.date === prevDateStr && s.st !== 'Cancelado');
  const nextDaySvcs = (D.svcs || []).filter(s => s.date === nextDateStr && s.st !== 'Cancelado');
  const dayManualBlocks = (D.blocks || []).filter(b => b.date === dateStr);

  // Revisar qué horas dentro de cada bloque cumplen las 24 horas de anticipación
  const validHoursManana = BLOCK_HOURS.manana.filter(h => isSlotAtLeast24hAhead(dateStr, h));
  const validHoursTarde  = BLOCK_HOURS.tarde.filter(h => isSlotAtLeast24hAhead(dateStr, h));
  const validHoursNoche  = BLOCK_HOURS.noche.filter(h => isSlotAtLeast24hAhead(dateStr, h, h < '12:00'));
  const validHoursInter  = INTERREGIONAL_HOURS.filter(h => isSlotAtLeast24hAhead(dateStr, h));

  const mananaTimeOk = validHoursManana.length > 0;
  const tardeTimeOk  = validHoursTarde.length > 0;
  const nocheTimeOk  = validHoursNoche.length > 0;

  if(!mananaTimeOk && !tardeTimeOk && !nocheTimeOk){
    return {
      inRange: false,
      outReason: 'Requiere mínimo 24 horas de anticipación',
      manana: { availUnits: [], used: capacidadSimultanea, free: 0, available: false, reason: 'Bloqueado (menos de 24 hrs de anticipación)' },
      tarde:  { availUnits: [], used: capacidadSimultanea, free: 0, available: false, reason: 'Bloqueado (menos de 24 hrs de anticipación)' },
      noche:  { availUnits: [], used: capacidadSimultanea, free: 0, available: false, reason: 'Bloqueado (menos de 24 hrs de anticipación)' },
      interregional: { availUnits: [], free: 0, available: false, reason: 'Bloqueado (menos de 24 hrs de anticipación)' },
      status: 'off'
    };
  }

  let availUnitsManana = [];
  let availUnitsTarde  = [];
  let availUnitsNoche  = [];
  let availUnitsFullDay = [];

  let reasonMananaList = [];
  let reasonTardeList  = [];
  let reasonNocheList  = [];
  let manualBlockedM = false;
  let manualBlockedT = false;
  let manualBlockedN = false;

  units.forEach((u, idx) => {
    const unitSvcs = daySvcs.filter(s => s.tid === u.id || (idx === 0 && !units.some(x => x.id === s.tid)));
    const prevUnitSvcs = prevDaySvcs.filter(s => s.tid === u.id || (idx === 0 && !units.some(x => x.id === s.tid)));
    const nextUnitSvcs = nextDaySvcs.filter(s => s.tid === u.id || (idx === 0 && !units.some(x => x.id === s.tid)));
    const unitManual = dayManualBlocks.filter(b => !b.tid || b.tid === 'all' || b.tid === u.id || (idx === 0 && !units.some(x => x.id === b.tid)));

    const hasManualFull   = unitManual.some(b => b.type === 'full');
    const hasManualManana = unitManual.some(b => b.type === 'manana' || b.type === 'full');
    const hasManualTarde  = unitManual.some(b => b.type === 'tarde' || b.type === 'full');
    const hasManualNoche  = unitManual.some(b => b.type === 'noche' || b.type === 'full');

    const bookedShifts = new Set();
    let hasFullDay = false;
    unitSvcs.forEach(s => {
      const blk = inferServiceBlock(s);
      if(blk === 'full'){
        hasFullDay = true;
        bookedShifts.add('manana');
        bookedShifts.add('tarde');
      } else if(blk === 'manana'){
        bookedShifts.add('manana');
      } else if(blk === 'tarde'){
        bookedShifts.add('tarde');
      } else if(blk === 'noche'){
        bookedShifts.add('noche');
      }
    });

    const hasManana = bookedShifts.has('manana');
    const hasTarde  = bookedShifts.has('tarde');
    const hasNoche  = bookedShifts.has('noche');

    // Regla 3: Descanso biológico post-nocturno si el día anterior hubo servicio en Turno Noche o finalizado > 22:00 hrs
    const prevNightRestBlock = prevUnitSvcs.some(s => doesServiceEndAfter22(s));

    // Regla de Seguridad Vial / Descanso Pre-Interregional: Bloqueo de noche previa si al día siguiente la unidad tiene un Programa Interregional
    const nextInterregionalBlock = nextUnitSvcs.some(s => s.svcType === '5' || s.blocksPrevNight);

    // Regla 2: Máximo 2 turnos por fecha. Si ya existen 2 turnos reservados, cualquier 3er turno queda bloqueado.
    const isDailyCapReached = bookedShifts.size >= 2 || hasFullDay;

    let mFree = true;
    let tFree = true;
    let nFree = true;

    // --- EVALUACIÓN TURNO MAÑANA ---
    if(!mananaTimeOk){
      mFree = false;
      reasonMananaList.push('Requiere mínimo 24 hrs de anticipación');
    } else if(hasManualManana){
      mFree = false;
      manualBlockedM = true;
      reasonMananaList.push('No disponible en agenda');
    } else if(hasFullDay){
      mFree = false;
      reasonMananaList.push('Día bloqueado por servicio extenso o Programa Interregional');
    } else if(prevNightRestBlock){
      mFree = false;
      reasonMananaList.push('Bloqueado por descanso biológico post-nocturno (atención nocturna el día anterior)');
    } else if(hasManana){
      mFree = false;
      reasonMananaList.push('Turno Mañana ya reservado en esta fecha');
    } else if(isDailyCapReached){
      mFree = false;
      reasonMananaList.push('Capacidad diaria completa (máx. 2 turnos por fecha: Tarde y Noche ya reservados)');
    }

    // --- EVALUACIÓN TURNO TARDE ---
    if(!tardeTimeOk){
      tFree = false;
      reasonTardeList.push('Requiere mínimo 24 hrs de anticipación');
    } else if(hasManualTarde){
      tFree = false;
      manualBlockedT = true;
      reasonTardeList.push('No disponible en agenda');
    } else if(hasFullDay){
      tFree = false;
      reasonTardeList.push('Día bloqueado por servicio extenso o Programa Interregional');
    } else if(hasTarde){
      tFree = false;
      reasonTardeList.push('Turno Tarde ya reservado en esta fecha');
    } else if(isDailyCapReached){
      tFree = false;
      reasonTardeList.push('Capacidad diaria completa (máx. 2 turnos por fecha: Mañana y Noche ya reservados)');
    }

    // --- EVALUACIÓN TURNO NOCHE ---
    if(!nocheTimeOk){
      nFree = false;
      reasonNocheList.push('Requiere mínimo 24 hrs de anticipación');
    } else if(hasManualNoche){
      nFree = false;
      manualBlockedN = true;
      reasonNocheList.push('No disponible en agenda');
    } else if(hasFullDay){
      nFree = false;
      reasonNocheList.push('Día bloqueado por servicio extenso o Programa Interregional');
    } else if(nextInterregionalBlock){
      nFree = false;
      reasonNocheList.push('Bloqueado por protocolo de seguridad vial y descanso: la profesional tiene un viaje interregional de larga distancia la madrugada siguiente');
    } else if(hasNoche){
      nFree = false;
      reasonNocheList.push('Turno Noche ya reservado en esta fecha');
    } else if(isDailyCapReached){
      nFree = false;
      reasonNocheList.push('Capacidad diaria completa (máx. 2 turnos por fecha: Mañana y Tarde ya reservados)');
    }

    if(mFree) availUnitsManana.push(u);
    if(tFree) availUnitsTarde.push(u);
    if(nFree) availUnitsNoche.push(u);
    if(mFree && tFree) availUnitsFullDay.push(u);
  });

  const freeM = availUnitsManana.length;
  const freeT = availUnitsTarde.length;
  const freeN = availUnitsNoche.length;
  const freeFull = availUnitsFullDay.length;

  const totalFree = freeM + freeT + freeN;
  let dayStatus = 'disp'; // 'disp' | 'last' | 'full' | 'closed'
  if(freeM === 0 && freeT === 0 && freeN === 0){
    dayStatus = (manualBlockedM && manualBlockedT && manualBlockedN) ? 'closed' : 'full';
  } else if(totalFree === 1){
    dayStatus = 'last';
  } else {
    dayStatus = 'disp';
  }

  let interReason = 'Disponible (bloquea jornada completa Mañana + Tarde)';
  let interAvail = (freeFull > 0 && validHoursInter.length > 0);
  if(freeFull === 0){
    if(prevDaySvcs.some(s => doesServiceEndAfter22(s))){
      interReason = 'Bloqueado por protocolo de seguridad vial y descanso preventivo (atención en Turno Noche el día anterior)';
    } else if(freeM === 0 && freeT === 0){
      interReason = reasonMananaList[0] || reasonTardeList[0] || 'No disponible en esta fecha';
    } else {
      interReason = 'Programa Interregional requiere día completo (ambos bloques Mañana y Tarde libres)';
    }
  } else if(validHoursInter.length === 0){
    interReason = 'Requiere mínimo 24 hrs de anticipación para salida temprana interregional (05:00 a 09:00 AM)';
  }

  return {
    inRange: true,
    manana: {
      availUnits: availUnitsManana,
      used: capacidadSimultanea - freeM,
      free: freeM,
      available: freeM > 0,
      manualBlocked: manualBlockedM,
      validHours: validHoursManana,
      reason: freeM > 0 ? '' : (reasonMananaList[0] || 'No disponible')
    },
    tarde: {
      availUnits: availUnitsTarde,
      used: capacidadSimultanea - freeT,
      free: freeT,
      available: freeT > 0,
      manualBlocked: manualBlockedT,
      validHours: validHoursTarde,
      reason: freeT > 0 ? '' : (reasonTardeList[0] || 'No disponible')
    },
    noche: {
      availUnits: availUnitsNoche,
      used: capacidadSimultanea - freeN,
      free: freeN,
      available: freeN > 0,
      manualBlocked: manualBlockedN,
      validHours: validHoursNoche,
      reason: freeN > 0 ? '' : (reasonNocheList[0] || 'No disponible')
    },
    interregional: {
      availUnits: availUnitsFullDay,
      free: interAvail ? freeFull : 0,
      available: interAvail,
      validHours: validHoursInter,
      reason: interReason
    },
    status: dayStatus
  };
}

function findFirstAvailableDate(){
  const { todayStr } = getBookingWindowBounds();
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  const isInter = mode === '5';
  const allowsNight = (mode === '3' || mode === '4');

  for(let i = 1; i <= 30; i++){
    const dStr = addDaysYMD(todayStr, i);
    const ev = evaluateDateCapacity(dStr);
    if(!ev.inRange) continue;
    if(isInter && ev.interregional.available) return dStr;
    if(!isInter && (ev.manana.available || ev.tarde.available || (allowsNight && ev.noche.available))) return dStr;
  }
  return addDaysYMD(todayStr, 1);
}

function changeCalMonth(delta){
  calViewMonth += delta;
  if(calViewMonth > 11){ calViewMonth = 0; calViewYear++; }
  if(calViewMonth < 0){ calViewMonth = 11; calViewYear--; }
  renderCalendar();
}

function selectCalendarDate(dateStr){
  const ev = evaluateDateCapacity(dateStr);
  if(!ev.inRange) return;
  $('#b_date').value = dateStr;
  const dt = parseYMD(dateStr);
  calViewYear = dt.getFullYear();
  calViewMonth = dt.getMonth();

  const mode = $('#b_svc_type').value;
  if(mode === '5'){
    selectedBlock = 'manana';
  } else if(selectedBlock){
    if(mode === '3' || mode === '4'){
      if(selectedBlock === 'manana' && !ev.manana.available){
        selectedBlock = ev.tarde.available ? 'tarde' : (ev.noche.available ? 'noche' : null);
      } else if(selectedBlock === 'tarde' && !ev.tarde.available){
        selectedBlock = ev.manana.available ? 'manana' : (ev.noche.available ? 'noche' : null);
      } else if(selectedBlock === 'noche' && !ev.noche.available){
        selectedBlock = ev.manana.available ? 'manana' : (ev.tarde.available ? 'tarde' : null);
      }
    } else {
      if(selectedBlock === 'noche'){
        selectedBlock = ev.manana.available ? 'manana' : (ev.tarde.available ? 'tarde' : null);
      } else if(selectedBlock === 'manana' && !ev.manana.available){
        selectedBlock = ev.tarde.available ? 'tarde' : null;
      } else if(selectedBlock === 'tarde' && !ev.tarde.available){
        selectedBlock = ev.manana.available ? 'manana' : null;
      }
    }
  }
  updateSlots(true);
  actualizarTarifaSegunAgenda();
  if(lastRouteIdaMin > 0){
    calcSuggestedPickup();
  }
}

function selectShiftBlock(blockId){
  const dateStr = $('#b_date').value;
  const ev = evaluateDateCapacity(dateStr);
  const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';

  if(mode === '5'){
    if(blockId !== 'manana'){
      alert("⚠️ Los Programas Interregionales (Valparaíso / O'Higgins) contemplan entre 4 y 6 horas de permanencia más traslados de larga distancia, por lo que únicamente pueden iniciarse en el Turno Mañana.");
      return;
    }
    selectedBlock = 'manana';
  } else if(blockId === 'noche'){
    if(mode === '1' || mode === '2'){
      alert("⚠️ El Turno Noche no está disponible para traslados vehiculares (habilitado solo para Cuidados a Domicilio y Eventos). Por favor seleccione Turno Mañana o Turno Tarde.");
      return;
    }
    if(!ev.noche.available){
      alert(`El Turno Noche no se encuentra disponible para el ${formatHumanDate(dateStr)}: ${ev.noche.reason || 'Sin cupos disponibles'}.`);
      return;
    }
    selectedBlock = 'noche';
  } else {
    if(blockId === 'manana' && !ev.manana.available) return;
    if(blockId === 'tarde' && !ev.tarde.available) return;
    selectedBlock = blockId;
  }

  // Limpiar la hora previamente seleccionada para evitar inconsistencias
  const timeSelect = $('#b_time');
  if(timeSelect) timeSelect.value = '';

  updateSlots(false);
  actualizarTarifaSegunAgenda();
}

function onPickupTimeChange(){
  updateSlots(true);
  actualizarTarifaSegunAgenda();
  const mode = $('#b_svc_type') ? $('#b_svc_type').value : '1';
  if(mode === '4'){
    const curTime = $('#b_time') ? $('#b_time').value : '';
    const evSelect = $('#selEventStart1');
    if(evSelect && curTime && [...evSelect.options].some(o => o.value === curTime)){
      evSelect.value = curTime;
    }
  }
  recalcAll();
}

let isUpdatingTarifa = false;

function actualizarTarifaSegunAgenda(skipRecalc = false){
  if(isUpdatingTarifa) return { winningJornada: currentJornada, tarifaPorHora };
  isUpdatingTarifa = true;

  try {
    const dateStr = $('#b_date') ? $('#b_date').value : '';
    const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
    const jWrap = $('#jornadaSelectorWrap');
    if(jWrap && (mode === '4' || mode === '5')){
      jWrap.style.display = 'none';
    }
    let day = -1;
    let isHoliday = false;

    if(dateStr){
      const dt = parseYMD(dateStr);
      day = dt.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
      isHoliday = isChileHoliday(dateStr);
    }

    // Turno seleccionado en agenda ('manana', 'tarde' o 'noche')
    const isTurnoNoche = (selectedBlock === 'noche');

    // 1. Evalúa cuál de las 3 tarjetas de "Tarifa horaria aplicada a su reserva" corresponde activar:
    // • TARJETA 3 (Festivo / Nocturno): Se activa SI es feriado oficial O SI el turno seleccionado es "Turno Noche".
    // • TARJETA 2 (Fin de Semana): Se activa SI el día es Sábado o Domingo (y no es feriado ni turno noche).
    // • TARJETA 1 (Hábil): Se activa SI el día es de Lunes a Viernes (y no es feriado ni turno noche).
    let winningJornada = 'habil';
    if(isHoliday || isTurnoNoche){
      winningJornada = 'nocturno';
    } else if(day === 0 || day === 6){
      winningJornada = 'tarde';
    } else {
      winningJornada = 'habil';
    }

    currentJornada = winningJornada;

    // 2. Actualización Visual (Bordes y Visto Verde):
    // Remueve la clase activa (.active / borde verde destacado) y el ícono de verificación (✔) de las tarjetas no correspondientes.
    // Aplica la clase activa y añade el visto verde (✔) a la tarjeta ganadora según la regla anterior.
    ['habil', 'tarde', 'nocturno'].forEach(k => {
      const el = $('#pillJornada_' + k);
      if(el){
        el.classList.toggle('active', k === winningJornada);
      }
    });

    // Adaptación dinámica de títulos y subtítulos de tarjetas según Modalidad activa
    const titleNoct = $('#titleJornadaNocturno');
    const subNoct = $('#subJornadaNocturno');
    const subTarde = $('#subJornadaTarde') || ($('#pillJornada_tarde') ? $('#pillJornada_tarde').querySelector('small') : null);
    if(subTarde) subTarde.textContent = 'Sábados, domingos y festivos estándar';
    if(subNoct) subNoct.textContent = 'Feriados oficiales irrenunciables y cobertura nocturna';
    if(titleNoct){
      if(mode === '1' || mode === '2'){
        titleNoct.textContent = 'Día Festivo (06:00 a 20:00)';
      } else {
        titleNoct.textContent = 'Día Festivo (06:00 a 20:00) y Turno Noche (22:00 a 04:00)';
      }
    }

    // 3. Impacto en el Cálculo Monetario (Crucial):
    // Al activarse la tarjeta correspondiente, actualiza la variable interna de tarifa horaria (tarifaPorHora):
    // • Para Modalidad 1, 3 y 4: Hábil = $12.000 | Fin de Semana = $15.000 | Festivo/Noche = $18.000
    // • Para Modalidad 2: Hábil = $8.000 | Fin de Semana = $10.000 | Festivo = $12.000
    if(mode === '2'){
      if(winningJornada === 'nocturno') tarifaPorHora = 12000;
      else if(winningJornada === 'tarde') tarifaPorHora = 10000;
      else tarifaPorHora = 8000;
    } else {
      if(winningJornada === 'nocturno') tarifaPorHora = 18000;
      else if(winningJornada === 'tarde') tarifaPorHora = 15000;
      else tarifaPorHora = 12000;
    }
    window.tarifaPorHora = tarifaPorHora;

    // Ejecuta inmediatamente "recalcularTodoElServicio()" para que el desglose de la "Suma Total del Servicio" y el Abono del 50% se recalculen con el valor por hora correcto
    if(!skipRecalc && typeof recalcularTodoElServicio === 'function'){
      recalcularTodoElServicio('actualizarTarifaSegunAgenda');
    }

    return { winningJornada, tarifaPorHora };
  } finally {
    isUpdatingTarifa = false;
  }
}
window.actualizarTarifaSegunAgenda = actualizarTarifaSegunAgenda;

function syncJornadaFromSchedule(){
  return actualizarTarifaSegunAgenda(false);
}

function onDateTimeChange(){
  updateSlots();
  syncJornadaFromSchedule();
}

function renderCalendar(){
  const grid = $('#calGrid');
  if(!grid) return;

  const { now, todayStr, maxDateStr } = getBookingWindowBounds();
  const minMonthKey = now.getFullYear() * 12 + now.getMonth();
  const maxDt = parseYMD(maxDateStr);
  const maxMonthKey = maxDt.getFullYear() * 12 + maxDt.getMonth();
  const curMonthKey = calViewYear * 12 + calViewMonth;

  $('#calMonthLabel').textContent = `${MONTH_NAMES[calViewMonth]} ${calViewYear}`;
  $('#calPrevBtn').disabled = curMonthKey <= minMonthKey;
  $('#calNextBtn').disabled = curMonthKey >= maxMonthKey;

  const firstDay = new Date(calViewYear, calViewMonth, 1);
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  // Lunes = 0 ... Domingo = 6
  const startOffset = (firstDay.getDay() + 6) % 7;

  const selectedDate = $('#b_date').value;
  const isInter = ($('#b_svc_type') && $('#b_svc_type').value === '5');

  let html = '';
  for(let i = 0; i < startOffset; i++){
    html += `<div class="cal-day empty"></div>`;
  }

  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = `${calViewYear}-${pad(calViewMonth+1)}-${pad(d)}`;
    const dt = new Date(calViewYear, calViewMonth, d);
    const dayOfWeek = dt.getDay(); // 0: Dom, 6: Sáb
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = isChileHoliday(dateStr);
    const holidayName = getChileHolidayName(dateStr);
    const ev = evaluateDateCapacity(dateStr);
    const isSel = dateStr === selectedDate;

    let stClass = 'st-off';
    let tagText = 'No disp.';
    let clickable = false;
    let titleTip = '';

    if(!ev.inRange){
      stClass = 'st-off';
      tagText = dateStr <= todayStr ? '< 24h' : '> 30d';
      titleTip = ev.outReason;
    } else if(isInter){
      if(ev.interregional.available){
        stClass = 'st-disp';
        tagText = 'Disponible';
        clickable = true;
        titleTip = 'Día completo disponible para Programa Interregional';
      } else {
        stClass = 'st-full';
        tagText = 'Agotado';
        clickable = false;
        titleTip = ev.interregional.reason;
      }
    } else {
      const curMode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
      const curAllowsNight = (curMode === '3' || curMode === '4');
      const freeSlotsCount = (ev.manana.available ? 1 : 0) + (ev.tarde.available ? 1 : 0) + (curAllowsNight && ev.noche.available ? 1 : 0);

      if(freeSlotsCount === 0){
        stClass = 'st-full';
        tagText = 'Agotado';
        clickable = false;
        titleTip = 'Sin cupos disponibles para esta modalidad en esta fecha';
      } else if(freeSlotsCount === 1){
        stClass = 'st-last';
        tagText = 'Último cupo';
        clickable = true;
        const availList = [];
        if(ev.manana.available) availList.push('Mañana');
        if(ev.tarde.available) availList.push('Tarde');
        if(curAllowsNight && ev.noche.available) availList.push('Noche');
        titleTip = `Último cupo: solo Turno ${availList.join(' / ')} disponible`;
      } else if(ev.status === 'closed'){
        stClass = 'st-full';
        tagText = 'No disponible';
        clickable = false;
        titleTip = 'Fecha no disponible en agenda';
      } else {
        stClass = 'st-disp';
        tagText = 'Disponible';
        clickable = true;
        titleTip = 'Turnos disponibles en agenda';
      }
    }

    if(ev.manana && !ev.manana.available && ev.manana.reason && ev.manana.reason.includes('descanso biológico')){
      titleTip += ' (Mañana bloqueada por descanso biológico post-nocturno)';
    }

    if(isHoliday){
      titleTip += ` · Feriado oficial: ${holidayName}`;
    } else if(isWeekend){
      titleTip += ` · Fin de Semana`;
    }

    const dayClasses = [
      'cal-day',
      stClass,
      isWeekend ? 'is-weekend' : '',
      isHoliday ? 'is-holiday' : '',
      isSel ? 'selected' : ''
    ].filter(Boolean).join(' ');

    let badgeHtml = '';
    if(isHoliday){
      badgeHtml = `<span class="cd-day-type holiday" title="Feriado: ${e(holidayName)}">🎉 Festivo</span>`;
    } else if(isWeekend){
      badgeHtml = `<span class="cd-day-type wknd" title="Fin de Semana">Sáb/Dom</span>`;
    }

    html += `
      <div class="${dayClasses}"
           title="${e(titleTip)}"
           ${clickable ? `onclick="selectCalendarDate('${dateStr}'); if(typeof window.actualizarTarifaSegunAgenda==='function') window.actualizarTarifaSegunAgenda();"` : ''}>
        <div class="cd-top-row">
          <span class="cd-num">${d}</span>
          ${badgeHtml}
        </div>
        <span class="cd-tag">${tagText}</span>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function updateSlots(keepCurrentTime = false){
  D = load() || D;
  const mode = $('#b_svc_type').value;
  const isInter = mode === '5';

  $('#lblCapBadge').textContent = `Capacidad activa: ${capacidadSimultanea} ${capacidadSimultanea === 1 ? 'unidad' : 'unidades'}`;

  let dateStr = $('#b_date').value;
  if(!dateStr){
    dateStr = findFirstAvailableDate();
    $('#b_date').value = dateStr;
    const dt = parseYMD(dateStr);
    calViewYear = dt.getFullYear();
    calViewMonth = dt.getMonth();
  }

  const ev = evaluateDateCapacity(dateStr);
  $('#lblSelectedDateHuman').textContent = formatHumanDate(dateStr);

  // Si la modalidad cambió o el bloque elegido quedó sin cupo en esta fecha, auto-ajustar bloque
  const allowsNight = (mode === '3' || mode === '4');
  if(isInter){
    selectedBlock = 'manana';
  } else if(selectedBlock && ev.inRange){
    if(!allowsNight && selectedBlock === 'noche'){
      selectedBlock = null;
    } else if(selectedBlock === 'manana' && !ev.manana.available){
      selectedBlock = ev.tarde.available ? 'tarde' : (allowsNight && ev.noche.available ? 'noche' : null);
    } else if(selectedBlock === 'tarde' && !ev.tarde.available){
      selectedBlock = ev.manana.available ? 'manana' : (allowsNight && ev.noche.available ? 'noche' : null);
    } else if(selectedBlock === 'noche' && !ev.noche.available){
      selectedBlock = ev.manana.available ? 'manana' : (ev.tarde.available ? 'tarde' : null);
    }
  }

  renderCalendar();

  // Actualizar botones de Turnos (Mañana, Tarde, Noche)
  const btnM = $('#btnBlock_manana');
  const btnT = $('#btnBlock_tarde');
  const btnN = $('#btnBlock_noche');
  const badgeM = $('#badgeBlock_manana');
  const badgeT = $('#badgeBlock_tarde');
  const badgeN = $('#badgeBlock_noche');
  const reasonM = $('#reasonBlock_manana');
  const reasonT = $('#reasonBlock_tarde');
  const reasonN = $('#reasonBlock_noche');

  // Restricción cruzada en combobox de modalidades (Sección 2):
  // Si el usuario tiene seleccionado Turno Tarde o Noche, la opción 5 queda disabled.
  // La advertencia SOLO se muestra si el usuario tiene seleccionada la modalidad 5.
  const curSvc = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
  const optInter = ($('#b_svc_type') && typeof $('#b_svc_type').querySelector === 'function') ? $('#b_svc_type').querySelector('option[value="5"]') : null;
  const warnInter = $('#interregionalBlockWarn');

  if(selectedBlock && selectedBlock !== 'manana'){
    if(optInter){
      optInter.disabled = true;
    }
    if(warnInter){
      warnInter.style.display = (curSvc === '5') ? 'block' : 'none';
      warnInter.innerHTML = `⚠️ Los Programas Interregionales (Valparaíso / O'Higgins) contemplan entre 4 y 6 horas de permanencia más traslados de larga distancia, por lo que únicamente pueden iniciarse en el Turno Mañana.`;
    }
  } else {
    if(optInter){
      optInter.disabled = false;
    }
    if(warnInter){
      warnInter.style.display = 'none';
    }
  }

  if(isInter){
    selectedBlock = 'manana';
    const okInter = ev.inRange && ev.interregional.available;

    // a) Turno Mañana: Fijado automáticamente en la Sección 1
    btnM.disabled = !okInter;
    btnM.classList.toggle('active', okInter);
    badgeM.className = 'block-badge ' + (okInter ? 'ok' : 'occ');
    badgeM.textContent = okInter ? `Disponible (${ev.interregional.free} cupo)` : 'Agotado';
    reasonM.style.display = okInter ? 'none' : 'block';
    reasonM.textContent = okInter ? '' : `🔒 ${ev.interregional.reason}`;

    // b) Turno Tarde: Marcar como NO DISPONIBLE informando al usuario que la reserva adquiere y bloquea la jornada completa
    btnT.disabled = true;
    btnT.classList.remove('active');
    badgeT.className = 'block-badge occ';
    badgeT.textContent = 'Agotado';
    reasonT.style.display = 'block';
    reasonT.textContent = '🔒 No disponible: La reserva del Programa Interregional adquiere y bloquea la jornada completa de la unidad (Mañana y Tarde) por tiempos de traslado y permanencia.';

    if(btnN){
      btnN.disabled = true;
      btnN.classList.remove('active');
      badgeN.className = 'block-badge occ';
      badgeN.textContent = 'Exclusivo Cuidados y Eventos';
      reasonN.style.display = 'block';
      reasonN.textContent = '🔒 Programa Interregional opera exclusivamente en jornada diurna completa (05:00 a 20:00).';
    }
  } else {
    // Todos los turnos disponibles según capacidad de la fecha
    const okM = ev.inRange && ev.manana.available;
    const okT = ev.inRange && ev.tarde.available;
    const okN = ev.inRange && ev.noche.available;

    btnM.disabled = !okM;
    btnM.classList.toggle('active', okM && selectedBlock === 'manana');
    badgeM.className = 'block-badge ' + (okM ? 'ok' : 'occ');
    badgeM.textContent = okM ? `Disponible (${ev.manana.free} ${ev.manana.free===1?'cupo':'cupos'})` : 'Agotado';
    reasonM.style.display = okM ? 'none' : 'block';
    reasonM.textContent = okM ? '' : `🔒 ${ev.manana.reason}`;

    btnT.disabled = !okT;
    btnT.classList.toggle('active', okT && selectedBlock === 'tarde');
    badgeT.className = 'block-badge ' + (okT ? 'ok' : 'occ');
    badgeT.textContent = okT ? `Disponible (${ev.tarde.free} ${ev.tarde.free===1?'cupo':'cupos'})` : 'Agotado';
    reasonT.style.display = okT ? 'none' : 'block';
    reasonT.textContent = okT ? '' : `🔒 ${ev.tarde.reason}`;

    if(btnN){
      if(!allowsNight){
        // Modalidades 1 y 2: Bloquear Turno Noche para servicios con traslado vehicular
        btnN.disabled = true;
        btnN.style.pointerEvents = 'none';
        btnN.classList.remove('active');
        badgeN.className = 'block-badge occ';
        badgeN.textContent = 'No disponible';
        reasonN.style.display = 'block';
        reasonN.textContent = '🔒 No disponible para traslados vehiculares (habilitado solo para Cuidados a Domicilio y Eventos).';
      } else {
        // Modalidades 3 y 4 (Cuidados a Domicilio y Eventos Sociales): Habilitar Turno Noche según capacidad
        btnN.disabled = !okN;
        btnN.style.pointerEvents = okN ? 'auto' : 'none';
        btnN.classList.toggle('active', okN && selectedBlock === 'noche');
        badgeN.className = 'block-badge ' + (okN ? 'ok' : 'occ');
        badgeN.textContent = okN ? `Disponible (${ev.noche.free} ${ev.noche.free===1?'cupo':'cupos'})` : 'Agotado';
        reasonN.style.display = okN ? 'none' : 'block';
        reasonN.textContent = okN ? '' : `🔒 ${ev.noche.reason}`;
      }
    }
  }

  // Poblar desplegable #b_time según el bloque activo
  const timeSelect = $('#b_time');
  const prevTime = timeSelect ? timeSelect.value : '';
  const dur = getSelectedTotalMinutes();
  const stBox = $('#availStatus');
  const tensSelect = $('#b_tens');
  const subBtn = $('#submitBtn');
  const nightNotice = $('#nightRuleNotice');
  const estWindow = $('#lblEstimatedWindow');
  const submitAlert = $('#submitBlockAlert');

  // Si aún no se selecciona ningún turno en el Paso 1:
  if(!selectedBlock && !isInter){
    if(timeSelect){
      timeSelect.innerHTML = `<option value="">Primero seleccione un turno arriba</option>`;
      timeSelect.value = '';
      timeSelect.disabled = true;
    }
    if(tensSelect){
      if(tensSelect.tagName === 'SELECT'){
        tensSelect.innerHTML = `<option value="">Primero seleccione un turno arriba</option>`;
        tensSelect.disabled = true;
      }
      tensSelect.value = '';
    }
    if(estWindow) estWindow.textContent = '';
    if(nightNotice) nightNotice.style.display = 'none';
    if(stBox){
      stBox.style.display = 'none';
      stBox.innerHTML = '';
    }
    if(submitAlert) submitAlert.style.display = 'none';
    return;
  }

  const rawHoursList = isInter ? INTERREGIONAL_HOURS : getBlockHoursList(selectedBlock);
  const activeBlockObj = isInter ? ev.interregional : (selectedBlock === 'manana' ? ev.manana : (selectedBlock === 'noche' ? ev.noche : ev.tarde));
  const shiftEnd = getShiftEndTime(selectedBlock);

  // Regla matemática de validación de tope horario en Paso 2:
  // [Hora de Recogida] + [Duración] debe ser menor o igual a la hora final del turno seleccionado:
  // - Turno Mañana: <= 12:00 hrs (720 min)
  // - Turno Tarde: <= 20:00 hrs (1200 min)
  // - Turno Noche: <= 04:00 hrs (1680 min)
  const hoursList = isInter
    ? rawHoursList
    : rawHoursList.filter(h => {
        const slotStart = getSlotStartMin(h, selectedBlock);
        return (slotStart + dur) <= shiftEnd;
      });

  const isTransfer = (mode === '1' || mode === '2');
  if(!ev.inRange || !activeBlockObj.available || (hoursList.length === 0 && !isTransfer)){
    let timeOptText = 'Sin horarios disponibles en este bloque';
    if(hoursList.length === 0 && !isInter && ev.inRange && activeBlockObj.available){
      const shiftName = selectedBlock === 'manana' ? 'Turno Mañana (cierre 12:00 hrs)' : (selectedBlock === 'tarde' ? 'Turno Tarde (cierre 20:00 hrs)' : 'Turno Noche (cierre 04:00 hrs)');
      timeOptText = `La duración (${fmtHoursClean(dur)}) excede el límite del ${shiftName}`;
    }
    if(timeSelect){
      timeSelect.innerHTML = `<option value="">${timeOptText}</option>`;
      timeSelect.value = '';
      timeSelect.disabled = true;
    }
    if(hoursList.length === 0 && !isInter && stBox){
      const blockName = selectedBlock === 'manana' ? 'Turno Mañana (06:00 a 12:00 hrs)' : (selectedBlock === 'tarde' ? 'Turno Tarde (14:00 a 20:00 hrs)' : 'Turno Noche (22:00 a 04:00 hrs)');
      stBox.className = 'status-box err';
      stBox.innerHTML = `<span>⚠️ <b>Tope horario de turno excedido:</b> La duración seleccionada (${fmtHoursClean(dur)}) no alcanza a completarse antes del término del ${blockName}. Por favor seleccione una duración menor o elija otro turno.</span>`;
    }
  } else {
    if(timeSelect){
      timeSelect.disabled = false;
      const isDomicilioOrEvento = (mode === '3' || mode === '4');
      const timeLabelSuffix = isInter
        ? 'Salida temprana interregional (hacia Santiago)'
        : (isDomicilioOrEvento
            ? ((selectedBlock === 'noche') ? 'Hora de inicio de atención nocturna' : 'Llegada estimada / Inicio de atención')
            : ((selectedBlock === 'noche') ? 'Hora de inicio de atención nocturna' : 'Hora exacta de recogida'));

      const placeholderText = isInter
        ? 'Seleccione hora de salida temprana...'
        : (isDomicilioOrEvento
            ? ((selectedBlock === 'noche') ? 'Seleccione hora de inicio nocturno...' : 'Seleccione hora de inicio de atención...')
            : ((selectedBlock === 'noche') ? 'Seleccione hora de inicio nocturno...' : 'Seleccione hora exacta de recogida...'));

      timeSelect.innerHTML = [
        `<option value="">${placeholderText}</option>`,
        ...hoursList.map(h => {
          const isPostMid = (selectedBlock === 'noche' && h < '12:00');
          const ok24 = isSlotAtLeast24hAhead(dateStr, h, isPostMid);
          return `<option value="${h}" ${!ok24 ? 'disabled' : ''}>${h} hrs — ${timeLabelSuffix}${!ok24 ? ' (Menos de 24h)' : ''}</option>`;
        })
      ].join('');

      const validChoices = hoursList.filter(h => {
        const isPostMid = (selectedBlock === 'noche' && h < '12:00');
        return isSlotAtLeast24hAhead(dateStr, h, isPostMid);
      });

      let prevTimeExceededShift = false;
      const isTransfer = (mode === '1' || mode === '2');
      if(keepCurrentTime && prevTime){
        if(validChoices.includes(prevTime) || (isTransfer && (window.isMiddaySpecial || prevTime))){
          const hasOpt = timeSelect.options ? [...timeSelect.options].some(o => o.value === prevTime) : false;
          if(isTransfer && !hasOpt){
            timeSelect.innerHTML += `<option value="${prevTime}">${prevTime} hrs</option>`;
          }
          timeSelect.value = prevTime;
        } else {
          timeSelect.value = '';
          prevTimeExceededShift = true;
        }
      } else {
        timeSelect.value = '';
      }

      if(prevTimeExceededShift){
        if(estWindow) estWindow.textContent = '';
        if(nightNotice) nightNotice.style.display = 'none';
        stBox.className = 'status-box err';
        if(dur >= 360 && (selectedBlock === 'manana' || !isInter)){
          stBox.innerHTML = `<span>⚠️ <b>Conflicto de Horario:</b> La duración de este plan (6 horas) excede el turno seleccionado en el calendario. Por favor seleccione un turno compatible en el Paso 1 (Turno Tarde o Noche) o modifique su plan a 4 horas.</span>`;
          if(submitAlert){
            submitAlert.style.display = 'block';
            submitAlert.innerHTML = `<span>⚠️ <b>No es posible continuar con la reserva:</b> La duración de este plan (6 horas) excede el turno seleccionado en el calendario. Por favor seleccione un turno compatible en el Paso 1 (Turno Tarde o Noche) o modifique su plan a 4 horas.</span>`;
          }
        } else {
          const shiftName = selectedBlock === 'manana' ? 'Turno Mañana (cierre 12:00 hrs)' : (selectedBlock === 'tarde' ? 'Turno Tarde (cierre 20:00 hrs)' : 'Turno Noche (cierre 04:00 hrs)');
          stBox.innerHTML = `<span>⚠️ <b>Conflicto de Horario:</b> Con una duración de ${fmtHoursClean(dur)}, la hora previa elegida (${prevTime} hrs) excede el ${shiftName}. Por favor seleccione una hora de inicio disponible en el menú desplegable.</span>`;
          if(submitAlert){
            submitAlert.style.display = 'block';
            submitAlert.innerHTML = `<span>⚠️ <b>No es posible continuar con la reserva:</b> La hora de recogida seleccionada previamente excede el cierre del turno para esta duración. Por favor elija un horario válido.</span>`;
          }
        }
        if(tensSelect && tensSelect.tagName === 'SELECT'){
          tensSelect.innerHTML = `<option value="">Conflicto de horario con el turno</option>`;
          tensSelect.disabled = true;
        }
        if(subBtn) subBtn.disabled = false;
        return;
      }
    }
  }

  const curTime = timeSelect ? timeSelect.value : '';

  if(ev.inRange && activeBlockObj.available && curTime && (hoursList.length > 0 || isTransfer)){
    const stMin = getSlotStartMin(curTime, selectedBlock);
    const endMin = stMin + dur;
    const endsAfter22 = endMin > 22 * 60;
    const isMiddayCase = (!isInter && (window.isMiddaySpecial || (stMin >= 720 && stMin < 840) || (selectedBlock === 'manana' && endMin > 720 && endMin <= 840)));

    if(!isInter && endMin > shiftEnd && !isMiddayCase){
      if(estWindow) estWindow.textContent = '';
      if(nightNotice) nightNotice.style.display = 'none';
      stBox.className = 'status-box err';
      const shiftName = selectedBlock === 'manana' ? 'Turno Mañana (12:00 hrs)' : (selectedBlock === 'tarde' ? 'Turno Tarde (20:00 hrs)' : 'Turno Noche (04:00 hrs)');
      stBox.innerHTML = `<span>⚠️ <b>Conflicto de Horario:</b> Esta atención (${fmtHoursClean(dur)}) finaliza a las <b>${fm(endMin % 1440)} hrs</b>, superando la hora de cierre del ${shiftName}. Por favor seleccione una hora de recogida más temprana o reduzca la duración.</span>`;
      if(subBtn) subBtn.disabled = false;
      if(submitAlert){
        submitAlert.style.display = 'block';
        submitAlert.innerHTML = `<span>⚠️ <b>No es posible continuar con la reserva:</b> El servicio excede la hora de cierre del turno seleccionado. Por favor ajuste la hora de recogida o la duración en el Paso 2.</span>`;
      }
      return;
    }

    const blockLabel = isInter
      ? 'Jornada Completa Interregional (Bloquea Mañana + Tarde)'
      : (selectedBlock === 'manana' ? 'Turno Mañana (06:00 a 12:00 hrs)' : (selectedBlock === 'noche' ? 'Turno Noche (22:00 a 04:00 hrs)' : 'Turno Tarde (14:00 a 20:00 hrs)'));

    if(estWindow) estWindow.textContent = '';

    if(nightNotice){
      nightNotice.style.display = 'none';
      nightNotice.innerHTML = '';
    }

    const availUnits = activeBlockObj.availUnits;
    stBox.className = 'status-box ok';
    stBox.innerHTML = `<span>✅ <b>Cupo verificado y disponible</b> para el <b>${formatHumanDate(dateStr)}</b> a las <b>${curTime} hrs</b> (${availUnits.length} de ${capacidadSimultanea} unidad disponible).</span>`;
    if(tensSelect){
      if(tensSelect.tagName === 'SELECT'){
        tensSelect.innerHTML = availUnits.map((t,idx)=>`<option value="${t.id}">${idx===0?'Asignación titular: ':''}${e(t.nom)} (${e(t.veh||'Unidad TENS')})</option>`).join('');
        tensSelect.disabled = false;
      } else {
        tensSelect.value = (availUnits[0] && availUnits[0].id) || 't1';
      }
    }
    if(subBtn) subBtn.disabled = false;
    if(submitAlert) submitAlert.style.display = 'none';
  } else if(ev.inRange && activeBlockObj.available && !curTime){
    // Turno activo y disponible, pero aún no selecciona la hora exacta
    if(estWindow) estWindow.textContent = '';
    if(nightNotice) nightNotice.style.display = 'none';
    stBox.className = 'status-box';
    const blockNames = { manana: 'Turno Mañana (06:00 a 12:00 hrs)', tarde: 'Turno Tarde (14:00 a 20:00 hrs)', noche: 'Turno Noche (22:00 a 04:00 hrs)' };
    const bName = isInter ? 'Programa Interregional' : (blockNames[selectedBlock] || 'Turno seleccionado');
    stBox.innerHTML = `<span>🕒 <b>${bName} activo:</b> Seleccione la hora exacta en el selector para verificar cupo y avanzar.</span>`;
    if(tensSelect){
      if(tensSelect.tagName === 'SELECT'){
        tensSelect.innerHTML = `<option value="">Seleccione hora exacta primero</option>`;
        tensSelect.disabled = true;
      }
      tensSelect.value = '';
    }
    if(submitAlert) submitAlert.style.display = 'none';
  } else {
    if(estWindow) estWindow.textContent = '';
    if(nightNotice) nightNotice.style.display = 'none';
    if(stBox) stBox.className = 'status-box err';
    const errReason = !ev.inRange ? ev.outReason : activeBlockObj.reason;
    if(dur >= 360 && (selectedBlock === 'manana' || !activeBlockObj.available)){
      stBox.innerHTML = `<span>⚠️ <b>Conflicto de Horario:</b> La duración de este plan (6 horas) excede el turno seleccionado en el calendario. Por favor seleccione un turno compatible en el Paso 1 (Turno Tarde o Noche) o modifique su plan a 4 horas.</span>`;
    } else {
      stBox.innerHTML = `<span>⚠️ <b>No disponible en la selección actual:</b> ${e(errReason)}. Por favor elija otro bloque o seleccione una fecha disponible en el calendario.</span>`;
    }
    if(tensSelect){
      if(tensSelect.tagName === 'SELECT'){
        tensSelect.innerHTML = `<option value="">Sin unidad disponible en este bloque</option>`;
        tensSelect.disabled = true;
      }
      tensSelect.value = '';
    }
    if(subBtn) subBtn.disabled = false;
    if(submitAlert) submitAlert.style.display = 'none';
  }
}

// ===== ASISTENTE DE HORA DE RECOGIDA SUGERIDA (CÁLCULO DE SALIDA) =====
let currentSuggestedHour = '08:30';
let currentSuggestedBlock = 'manana';

function calcSuggestedPickup(){
  try {
    const callout = $('#suggestedPickupCallout');
    const msg = $('#suggestedPickupMsg');
    const subBtn = $('#submitBtn');

    // 0. Reset de estado obligatorio al recalcular
    if(callout) callout.style.display = 'none';
    if(msg) msg.innerHTML = '';
    const blkAlert = $('#submitBlockAlert');
    if(blkAlert) blkAlert.style.display = 'none';
    const avail = $('#availStatus');
    if(avail && avail.classList.contains('err')){
      avail.style.display = 'none';
      avail.innerHTML = '';
    }

    // Quitar feedback de error previo en combobox de duración
    const mode = ($('#b_svc_type') && $('#b_svc_type').value) || '1';
    const selStay = $('#selStayDestino') || $('#duracion-atencion');
    if(selStay){
      selStay.style.borderColor = '';
      selStay.style.boxShadow = '';
    }

    // Si Modalidad 1 o 2, verificar que el combobox de duración no esté vacío
    if((mode === '1' || mode === '2') && selStay){
      if(!selStay.value || selStay.value === ''){
        selStay.style.borderColor = '#dc2626';
        selStay.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.25)';
        selStay.focus();
        if(msg){
          msg.innerHTML = `
            <div style="padding:12px 14px;background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;color:#991b1b;font-size:.87rem;line-height:1.45">
              ⚠️ <b>Duración requerida:</b> Por favor indique la duración estimada del servicio a la derecha para generar el cronograma.
            </div>
          `;
        }
        if(callout) callout.style.display = 'block';
        return;
      }
    }

    // 1. Minutos de viaje: si aún no se calcula en mapa, asumir base temporal (10 min en Santiago, 90 min en Interregional)
    const isInter = ($('#b_svc_type') && $('#b_svc_type').value === '5');
    const isEstimatedTempRoute = (!lastRouteIdaMin || lastRouteIdaMin <= 0);
    const defaultRouteMin = isInter ? 90 : 10;
    const routeMin = isEstimatedTempRoute ? defaultRouteMin : lastRouteIdaMin;

    const appTimeInput = $('#appTimeInput') || $('#hora-cita-medica') || $('#b_app_time');
    const appTimeStr = (appTimeInput && appTimeInput.value) || '10:00';
    const appTimeMin = tm(appTimeStr);

  const margenAbordaje = 10; // 10 min abordaje vehicular y valoración inicial TENS
  const margenAdmision = 20; // 20 min margen previo para admisión o estacionamiento
  const anticipacionFija = margenAbordaje + margenAdmision; // 30 min
  const totalAnticipacionExacta = routeMin + anticipacionFija;

  // Fórmula directa: [Hora de Cita] − [Tiempo de Viaje en Mapa + 10 min abordaje + 20 min margen]
  const rawPickupMin = appTimeMin - totalAnticipacionExacta;

  // Ajuste de la salida a intervalos naturales de 15 minutos (hacia atrás para asegurar puntualidad)
  let targetSlotMin = Math.floor(rawPickupMin / 15) * 15;
  if(targetSlotMin < 0) targetSlotMin += 1440;

  const durMins = getSelectedTotalMinutes();

  let targetBlock = 'manana';

  // 1. EVALUACIÓN DE BLOQUE Y REGLAS DE TURNO (MAÑANA, TARDE O INTERREGIONAL)
  if(isInter){
    targetBlock = 'manana';
    if(targetSlotMin < 300) targetSlotMin = 300; // Mínimo 05:00 AM (300 min)
    if(targetSlotMin > 540) targetSlotMin = 540; // Máximo 09:00 AM (540 min)
  } else if(targetSlotMin < 720 || (targetSlotMin >= 720 && targetSlotMin < 840)){
    // Mañana o Mediodía (06:00 a 14:00 hrs)
    targetBlock = 'manana';
    if(targetSlotMin < 360) targetSlotMin = 360; // Mínimo 06:00 AM (360 min)
  } else {
    // Tarde (14:00 a 20:00 hrs)
    targetBlock = 'tarde';
    if(targetSlotMin < 840) targetSlotMin = 840; // Mínimo 14:00 (840 min)

    // Validación dura de tope de turno tarde: [Hora de recogida] + [Duración] <= 20:00 (1200 min)
    const endServiceMin = targetSlotMin + durMins;
    if(endServiceMin > 1200){
      const timeSel = $('#b_time');
      if(timeSel) timeSel.value = '';
      if(subBtn) subBtn.disabled = true;

      msg.innerHTML = `
        <div style="padding:14px 16px;background:#fee2e2;border-left:4px solid #ef4444;border-radius:10px;color:#991b1b;line-height:1.5">
          <div style="font-weight:800;font-size:1rem;margin-bottom:4px">⛔ Límite del Turno Tarde Excedido</div>
          <div style="font-size:.87rem">
            Con la hora calculada de salida (<b>${fm(targetSlotMin)} hrs</b>) y la duración de servicio seleccionada (<b>${fmtHoursClean(durMins)}</b>), la atención finalizaría a las <b>${fm(endServiceMin)} hrs</b>, sobrepasando el cierre operativo del Turno Tarde (20:00 hrs).
          </div>
          <div style="font-size:.82rem;margin-top:6px;color:#7f1d1d">
            Por favor seleccione una duración menor, adelante la hora de su compromiso médico o consulte por WhatsApp para una evaluación especial.
          </div>
        </div>
      `;
      callout.style.display = 'block';
      return;
    }
  }

  const endServiceMin = targetSlotMin + durMins;

  // REGLA ESPECIAL MEDIODÍA (12:01 a 13:59 hrs o salida entre 12:00 y 14:00 hrs):
  // Se activa la advertencia roja pero NO se corta la ejecución (sin return) para calcular y mostrar el cronograma y totales completos.
  const isMiddaySpecial = (!isInter && ((targetSlotMin >= 720 && targetSlotMin < 840) || (targetSlotMin < 720 && endServiceMin > 720)));
  window.isMiddaySpecial = isMiddaySpecial;

  if(isMiddaySpecial){
    msg.innerHTML = `
      <div style="padding:14px 16px;background-color:#FEF2F2;border:1.5px solid #EF4444;border-radius:12px;color:var(--ink);line-height:1.5">
        <div style="font-weight:800;color:#B91C1C;font-size:1rem;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <span>⏰</span> Horario Especial de Mediodía Requerido
        </div>
        <div style="font-size:.87rem;margin-bottom:8px">
          ${targetSlotMin >= 720
            ? `La hora de salida calculada para su cita de las <b>${appTimeStr} hrs</b> es a las <b>${fm(targetSlotMin)} hrs</b>, la cual se encuentra en la ventana de mediodía (12:00 a 14:00 hrs) fuera de los bloques estándar de la agenda.`
            : `Con la hora de salida requerida (<b>${fm(targetSlotMin)} hrs</b>) y la duración de servicio seleccionada (<b>${fmtHoursClean(durMins)}</b>), la atención terminaría a las <b>${fm(endServiceMin)} hrs</b>, invadiendo la ventana de mediodía (12:00 a 14:00 hrs) fuera del Turno Mañana.`
          }
        </div>
        <div style="font-size:.83rem;color:var(--mute);margin-bottom:12px">
          Por favor contáctenos directamente por WhatsApp para evaluar factibilidad operativa y coordinar una atención personalizada fuera de los bloques estándar.
        </div>
        <a href="https://wa.me/56929990095?text=Hola%2C%20necesito%20coordinar%20un%20traslado%20que%20abarca%20horario%20de%20mediod%C3%ADa%20(terminando%20a%20las%20${encodeURIComponent(fm(endServiceMin))}%20hrs)." target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#ffffff;padding:9px 18px;border-radius:8px;font-size:.84rem;font-weight:700;text-decoration:none;box-shadow:0 2px 6px rgba(37,211,102,.25)">
          💬 Coordinar por WhatsApp (+56 9 2999 0095)
        </a>
      </div>
    `;
    callout.style.display = 'block';
  }

  const targetSlotStr = fm(targetSlotMin);
  currentSuggestedHour = targetSlotStr;
  currentSuggestedBlock = targetBlock;

  // 2. VERIFICACIÓN DE DISPONIBILIDAD Y CUPOS DEL TURNO PARA LA FECHA SELECCIONADA
  const dateStr = $('#b_date') ? $('#b_date').value : '';
  const ev = evaluateDateCapacity(dateStr);
  const targetCap = isInter ? ev.interregional : (targetBlock === 'manana' ? ev.manana : ev.tarde);

  if(!targetCap.available){
    selectedBlock = targetBlock;
    updateSlots(true);
    const timeSel = $('#b_time');
    if(timeSel) timeSel.value = '';
    if(subBtn) subBtn.disabled = true;

    msg.innerHTML = `
      <div style="padding:14px 16px;background:#fee2e2;border-left:4px solid #ef4444;border-radius:10px;color:#991b1b;line-height:1.5">
        <div style="font-weight:800;font-size:1rem;margin-bottom:4px">⛔ Turno No Disponible</div>
        <div style="font-size:.88rem">
          El cupo para el turno <b>${targetBlock === 'manana' ? 'Mañana' : 'Tarde'}</b> de este día ya se encuentra reservado. Por favor seleccione otra fecha o consulte por WhatsApp.
        </div>
        <div style="margin-top:10px">
          <a href="https://wa.me/56929990095?text=Hola%2C%20el%20cupo%20para%20el%20turno%20${targetBlock === 'manana' ? 'Ma%C3%B1ana' : 'Tarde'}%20del%20d%C3%ADa%20${encodeURIComponent(formatHumanDate(dateStr))}%20ya%20se%20encuentra%20reservado%2C%20deseo%20consultar%20por%20disponibilidad." target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#ffffff;padding:8px 16px;border-radius:8px;font-size:.82rem;font-weight:700;text-decoration:none">
            💬 Consultar por WhatsApp (+56 9 2999 0095)
          </a>
        </div>
      </div>
    `;
    callout.style.display = 'block';
    return;
  }

  // 3. ASIGNACIÓN 100% AUTOMÁTICA DEL TURNO
  selectedBlock = targetBlock;
  updateSlots(true);

  // 4. FIJAR LA HORA OFICIAL DE RECOGIDA EN #b_time
  const timeSel = $('#b_time');
  if(timeSel){
    if(timeSel.options && typeof timeSel.options[Symbol.iterator] === 'function'){
      if(![...timeSel.options].some(o => o.value === targetSlotStr)){
        if(timeSel.innerHTML !== undefined){
          timeSel.innerHTML += `<option value="${targetSlotStr}">${targetSlotStr} hrs</option>`;
        } else if(typeof document !== 'undefined' && document.createElement && timeSel.appendChild){
          const opt = document.createElement('option');
          opt.value = targetSlotStr;
          opt.text = `${targetSlotStr} hrs`;
          timeSel.appendChild(opt);
        }
      }
    }
    timeSel.value = targetSlotStr;
    timeSel.disabled = false;
    onPickupTimeChange();
  }

  // Habilitar botón de confirmación
  if(subBtn) subBtn.disabled = false;
  recalcAll();

  const llegadaRecintoMin = targetSlotMin + margenAbordaje + routeMin;
  const minutosAntesDelBox = appTimeMin - llegadaRecintoMin;

  const blockNames = {
    manana: isInter ? 'Turno Mañana (Salida Temprana Interregional)' : 'Turno Mañana (06:00 a 12:00 hrs)',
    tarde: 'Turno Tarde (14:00 a 20:00 hrs)',
    noche: 'Turno Noche (22:00 a 04:00 hrs)'
  };
  const blockHuman = blockNames[targetBlock] || targetBlock;

    const tempRouteNote = isEstimatedTempRoute
      ? `<div style="font-size:.82rem;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;margin-top:8px;line-height:1.4">
          ⚠️ <b>Calcule la ruta primero en el mapa</b> para obtener los minutos reales de conducción (cálculo provisional con tiempo base de ${isInter ? '90' : '10'} min de viaje).
         </div>`
      : '';

    // Formato visual simple, limpio y sin redundancias según especificación (si es horario especial de mediodía, conserva la tarjeta roja)
    if(!isMiddaySpecial){
      msg.innerHTML = `
        <div style="background:#ffffff;border:1.5px solid var(--wa);border-left:5px solid #168F4A;border-radius:10px;padding:12px 16px;box-shadow:0 2px 6px rgba(22,143,74,.08);line-height:1.6">
          <div style="font-weight:700;color:#12783E;font-size:.96rem;display:flex;align-items:center;gap:6px">
            <span>✓</span> Hora de recogida programada: <span style="font-size:1.06rem;font-weight:800;color:var(--ink)">${targetSlotStr} hrs</span>
          </div>
          <div style="font-size:.86rem;color:var(--ink);margin-top:3px">
            Llegada estimada al recinto: <b>${fm(llegadaRecintoMin)} hrs</b> (${minutosAntesDelBox} min antes del box)
          </div>
          <div style="font-size:.84rem;color:var(--mute);margin-top:3px">
            Bloque asignado: <b>${blockHuman}</b>
          </div>
          ${tempRouteNote}
        </div>
      `;
    }

    callout.style.display = 'block';
  } catch(err) {
    console.error('Error en calcSuggestedPickup:', err);
  }
}

function calculateSuggestedTime(){
  return recalcularTodoElServicio('manual');
}
window.calculateSuggestedTime = recalcularTodoElServicio;

function applySuggestedPickup(){
  return recalcularTodoElServicio('manual');
}
window.applySuggestedPickup = recalcularTodoElServicio;

function populateAppTimeOptions(mode){
  const appTimeSel = $('#appTimeInput') || $('#hora-cita-medica');
  if(!appTimeSel) return;
  const currentVal = appTimeSel.value;
  const isInter = (mode === '5');
  const startMin = isInter ? (8 * 60) : (7 * 60);
  const endMin = isInter ? (12 * 60) : (18 * 60);
  const appTimes = [];
  for(let m = startMin; m <= endMin; m += 15){
    appTimes.push(fm(m));
  }
  const defaultVal = appTimes.includes(currentVal) ? currentVal : (isInter ? '10:00' : (currentVal || '10:00'));
  appTimeSel.innerHTML = appTimes.map(t => `<option value="${t}" ${t === defaultVal ? 'selected' : ''}>${t} hrs</option>`).join('');
  appTimeSel.value = defaultVal;
}
window.populateAppTimeOptions = populateAppTimeOptions;

async function initForm(){
  applyTheme(getTheme());
  const firstDate = findFirstAvailableDate();
  $('#b_date').value = firstDate;
  const dt = parseYMD(firstDate);
  calViewYear = dt.getFullYear();
  calViewMonth = dt.getMonth();

  // Inicializar opciones de hora de cita médica para el Asistente de Recogida
  const appTimeSel = $('#appTimeInput') || $('#hora-cita-medica');
  if(appTimeSel && appTimeSel.addEventListener){
    appTimeSel.addEventListener('change', () => recalcularTodoElServicio('appTime'));
  }
  populateAppTimeOptions($('#b_svc_type') ? $('#b_svc_type').value : '1');

  // Conexión obligatoria de eventos para botón y selector de duración
  const btnCalc = document.getElementById('btnCalcularHora') || document.querySelector('button[onclick*="recalcularTodoElServicio"]');
  if(btnCalc && btnCalc.addEventListener){
    btnCalc.addEventListener('click', () => recalcularTodoElServicio('button'));
  }

  const selStay = $('#selStayDestino') || $('#duracion-atencion');
  if(selStay && (!selStay.value || selStay.value === '')){
    selStay.value = '60';
  }
  if(selStay && selStay.addEventListener){
    selStay.addEventListener('change', () => recalcularTodoElServicio('duration'));
  }

  const selHours34 = $('#selHours34');
  if(selHours34 && selHours34.addEventListener){
    selHours34.addEventListener('change', () => onHours34Change());
  }

  const svcSelect = $('#b_svc_type');
  if(svcSelect && svcSelect.addEventListener){
    svcSelect.addEventListener('change', () => {
      if(typeof window.actualizarTarifaSegunAgenda === 'function') window.actualizarTarifaSegunAgenda();
    });
  }
  ['btnBlock_manana', 'btnBlock_tarde', 'btnBlock_noche'].forEach(id => {
    const btn = $('#' + id);
    if(btn && btn.addEventListener){
      btn.addEventListener('click', () => {
        if(typeof window.actualizarTarifaSegunAgenda === 'function') window.actualizarTarifaSegunAgenda();
      });
    }
  });
  const calGrid = $('#calGrid');
  if(calGrid && calGrid.addEventListener){
    calGrid.addEventListener('click', () => {
      setTimeout(() => {
        if(typeof window.actualizarTarifaSegunAgenda === 'function') window.actualizarTarifaSegunAgenda();
      }, 50);
    });
  }
  $('#b_mob').innerHTML = MOB.map(m=>`<option value="${e(m)}">${e(m)}</option>`).join('');
  renderRequirements($('#b_svc_type').value || '1');
  checkCompanionRecommendation();

  onServiceTypeChange();

  try{
    const params = new URLSearchParams(window.location.search);
    const svcParam = params.get('svc');
    if(svcParam && ['1','2','3','4','5'].includes(svcParam)){
      $('#b_svc_type').value = svcParam;
      onServiceTypeChange();
      setTimeout(() => {
        const sec = document.getElementById('secModalidad');
        if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
      }, 120);
    }

    const regParam = params.get('region');
    if(regParam && (regParam.includes('ohiggins') || regParam.includes('higgins'))){
      selectInterRegion("Región de O'Higgins");
    }

    setTripMode(2); // Fijado siempre en Ida y Vuelta

    if(params.get('from')){
      $('#b_from').value = params.get('from');
      await searchAddr('from', true);
    }
    if(params.get('to')){
      $('#b_to').value = params.get('to');
      await searchAddr('to', true);
    }
  }catch(e){}
  applyMaxDurationRule();
  updateSlots(true);
  actualizarTarifaSegunAgenda();
}

async function submitBooking(ev){
  ev.preventDefault();
  D = load() || D;

  const termsChk = $('#b_terms');
  if(termsChk && !termsChk.checked){
    const submitAlert = $('#submitBlockAlert');
    if(submitAlert){
      submitAlert.style.display = 'block';
      submitAlert.innerHTML = `<span>⚠️ <b>Términos y Condiciones requeridos:</b> Debe leer y aceptar los Términos y Condiciones del Servicio para confirmar su hora.</span>`;
    }
    termsChk.scrollIntoView({ behavior: 'smooth', block: 'center' });
    termsChk.focus();
    return;
  }

  const mode = $('#b_svc_type').value;
  const isConEvento = (mode === '4' && selectedEventSubMode === 'con_traslado');
  const svcName = mode === '4'
    ? `4. Acompañamiento en Eventos Sociales (${isConEvento ? 'Pack Integral Puerta a Puerta (Con Traslados)' : 'Pack Asistencia en Recinto (Sin Traslado)'})`
    : SVC_NAMES[mode];
  const showMap = isMapEnabledForCurrentState();
  const showDest = (mode === '1' || mode === '2' || mode === '5' || isConEvento);
  const isInter = mode === '5';

  // Asegurar que la dirección (y la ruta si aplica) esté geocodificada
  if(!ptFrom && $('#b_from').value.trim()){
    await searchAddr('from', true);
  }
  if(showMap && !ptTo && $('#b_to').value.trim()){
    await searchAddr('to', true);
  }
  if(!$('#b_from').value.trim()){
    const submitAlert = $('#submitBlockAlert');
    if(submitAlert){
      submitAlert.style.display = 'block';
      submitAlert.innerHTML = `<span>⚠️ <b>Dirección de recogida requerida:</b> Por favor ingrese su dirección de inicio en el Paso 2 antes de confirmar.</span>`;
    }
    $('#b_from').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#b_from').focus();
    return;
  }
  if(showMap && (!ptFrom || !ptTo)){
    const submitAlert = $('#submitBlockAlert');
    if(submitAlert){
      submitAlert.style.display = 'block';
      submitAlert.innerHTML = `<span>⚠️ <b>Direcciones requeridas:</b> Por favor ingrese y verifique las direcciones de Inicio (A) y Destino (B) en el mapa superior para continuar.</span>`;
    }
    const targetInp = (!ptFrom ? $('#b_from') : $('#b_to')) || $('#routeLayoutBox');
    if(targetInp){
      targetInp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetInp.focus();
    }
    return;
  }

  recalcAll();

  const date = $('#b_date').value;
  const timeStr = $('#b_time').value;
  const dur = getSelectedTotalMinutes();

  if(!selectedBlock && timeStr && !isInter){
    const tmMins = tm(timeStr);
    if(tmMins >= 360 && tmMins < 720) selectedBlock = 'manana';
    else if(tmMins >= 840 && tmMins <= 1200) selectedBlock = 'tarde';
    else if(tmMins >= 1320 || tmMins <= 240) selectedBlock = 'noche';
  }

  const capEval = evaluateDateCapacity(date);
  const targetBlockObj = isInter ? capEval.interregional : (selectedBlock ? (selectedBlock === 'manana' ? capEval.manana : (selectedBlock === 'noche' ? capEval.noche : capEval.tarde)) : { available: false });
  const start = timeStr ? getSlotStartMin(timeStr, selectedBlock) : 0;
  const endMin = start + dur;
  const shiftEnd = getShiftEndTime(selectedBlock);
  const isMiddayCase = (!isInter && (window.isMiddaySpecial || (start >= 720 && start < 840) || (selectedBlock === 'manana' && endMin > 720 && endMin <= 840)));
  const exceedsShift = (!isInter && selectedBlock && endMin > shiftEnd && !isMiddayCase);

  if(!date || (!selectedBlock && !isInter) || !timeStr || !capEval.inRange || (!targetBlockObj.available && !isMiddayCase) || !isSlotAtLeast24hAhead(date, timeStr, selectedBlock === 'noche' && timeStr < '12:00') || exceedsShift){
    updateSlots();
    const submitAlert = $('#submitBlockAlert');
    if(submitAlert){
      submitAlert.style.display = 'block';
      if(!selectedBlock && !isInter){
        submitAlert.innerHTML = `<span>⚠️ <b>Turno requerido en Paso 1:</b> Por favor seleccione un turno (Mañana, Tarde o Noche) en la agenda antes de continuar.</span>`;
      } else if(!targetBlockObj.available){
        const shiftName = selectedBlock === 'manana' ? 'Mañana' : (selectedBlock === 'tarde' ? 'Tarde' : 'Noche');
        submitAlert.innerHTML = `<span>⛔ <b>Turno agotado:</b> El cupo para el turno ${shiftName} de este día ya se encuentra reservado. Por favor seleccione otra fecha o consulte por WhatsApp.</span>`;
      } else if(!timeStr){
        const isTransfer = (mode === '1' || mode === '2' || mode === '5');
        if(isTransfer){
          submitAlert.innerHTML = `<span>⚠️ <b>Hora oficial de recogida requerida en Paso 2:</b> Por favor seleccione la hora de su cita médica en destino para fijar automáticamente la hora de recogida de su reserva.</span>`;
        } else {
          submitAlert.innerHTML = `<span>⚠️ <b>Hora requerida en Paso 2:</b> Por favor seleccione la hora de inicio de la atención en el domicilio antes de continuar.</span>`;
        }
      } else if(exceedsShift){
        const shiftName = selectedBlock === 'manana' ? 'Turno Mañana (cierre 12:00 hrs)' : (selectedBlock === 'tarde' ? 'Turno Tarde (cierre 20:00 hrs)' : 'Turno Noche (cierre 04:00 hrs)');
        submitAlert.innerHTML = `<span>⚠️ <b>Tope horario de turno excedido:</b> El servicio finaliza a las <b>${fm(endMin % 1440)} hrs</b>, superando la hora de cierre del ${shiftName}. Por favor seleccione una hora de recogida más temprana o reduzca la duración.</span>`;
      } else {
        submitAlert.innerHTML = `<span>⚠️ <b>No es posible continuar con la reserva:</b> Existen observaciones en su selección de horario en el Paso 2 (la hora elegida no se encuentra disponible o excede la ventana del turno seleccionado en el calendario). Por favor revise la Sección 2 antes de confirmar.</span>`;
      }
    }
    const targetErr = $('#availStatus') || $('#b_time') || $('#selStayDestino') || $('#timeSectionTitle');
    if(targetErr){
      targetErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetErr.style.transition = 'box-shadow 0.3s, transform 0.2s';
      targetErr.style.boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.4)';
      setTimeout(() => { targetErr.style.boxShadow = ''; }, 2200);
    }
    return;
  }

  // Validaciones de datos en Sección 3
  const pat = $('#b_pat').value.trim();
  const patPhoneRaw = ($('#b_pat_phone') && $('#b_pat_phone').value.trim()) || '';
  const patPhone = patPhoneRaw ? ('+569' + patPhoneRaw) : '';
  if(!pat){
    $('#b_pat').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#b_pat').focus();
    return;
  }
  const age = +$('#b_age').value;
  if(!$('#b_age').value || age < 0){
    $('#b_age').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#b_age').focus();
    return;
  }
  const dxInput = $('#b_dx').value.trim();
  if(!dxInput){
    $('#b_dx').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#b_dx').focus();
    return;
  }

  // Validación de Alerta Clínica de Alergias
  const allergyRadio = document.querySelector('input[name="b_allergy_radio"]:checked');
  const hasAllergy = allergyRadio ? allergyRadio.value === 'si' : false;
  const allergyDetail = hasAllergy ? (($('#b_allergy_detail') && $('#b_allergy_detail').value.trim()) || '') : '';
  if(hasAllergy && !allergyDetail){
    const inp = $('#b_allergy_detail');
    if(inp){
      inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inp.focus();
    }
    const submitAlert = $('#submitBlockAlert');
    if(submitAlert){
      submitAlert.style.display = 'block';
      submitAlert.innerHTML = `<span>⚠️ <b>Alergias requeridas:</b> Ha indicado que el paciente presenta alergias conocidas. Por favor especifíquelas en el campo correspondiente antes de confirmar.</span>`;
    }
    return;
  }
  const allergyText = hasAllergy ? `Sí (${allergyDetail})` : 'No';

  // Estado de Conciencia
  const conciencia = ($('#b_conciencia') && $('#b_conciencia').value) || 'Lúcido / Orientado';

  // Validación de Otra Patología si está marcada
  const cbOtra = $('#cbPatOtra');
  if(cbOtra && cbOtra.checked){
    const otherInp = $('#b_pathology_other');
    if(otherInp && !otherInp.value.trim()){
      otherInp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      otherInp.focus();
      const submitAlert = $('#submitBlockAlert');
      if(submitAlert){
        submitAlert.style.display = 'block';
        submitAlert.innerHTML = `<span>⚠️ <b>Patología requerida:</b> Ha marcado la opción "Otra patología". Por favor especifíquela por escrito antes de continuar.</span>`;
      }
      return;
    }
  }
  const pathologies = getSelectedPathologies();
  const pathologiesText = pathologies.join(', ');

  const coord = $('#b_coord').value.trim();
  if(!coord){
    $('#b_coord').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#b_coord').focus();
    return;
  }
  const phVal = $('#b_ph').value.trim();
  if(!phVal || phVal.length < 8){
    $('#b_ph').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#b_ph').focus();
    return;
  }
  const ph = '+569' + phVal;
  const isSameAsPatient = ($('#cbCoordSameAsPatient') && $('#cbCoordSameAsPatient').checked) || (coord.toLowerCase() === pat.toLowerCase());

  const isNightShift = (selectedBlock === 'noche');
  const endsAfter22 = isNightShift || (endMin > 22 * 60);
  const tid = ($('#b_tens') && $('#b_tens').value) || (targetBlockObj.availUnits && targetBlockObj.availUnits[0] && targetBlockObj.availUnits[0].id) || 't1';

  const fullDx = mode === '5'
    ? `${svcName} (${selectedInterRegion}) · ${dxInput}`
    : (mode === '4'
        ? `${svcName} · ${dxInput}`
        : `${svcName} · ${dxInput}`);
  const mob = $('#b_mob').value;
  const from = $('#b_from').value.trim();
  const depto = ($('#b_depto') && $('#b_depto').value.trim()) || '';
  const to = showDest ? $('#b_to').value.trim() : (mode === '4' ? 'Atención directa en centro de eventos / salón (Sin traslado vehicular)' : 'Atención en domicilio / lugar del evento');
  const compVal = $('#b_comp').value;
  const comp = compVal.includes('acompañante');
  const reqs = [];
  const obs = ($('#b_obs') && $('#b_obs').value.trim()) || '';

  const taxDocRadio = document.querySelector('input[name="b_tax_doc"]:checked');
  const taxDocType = taxDocRadio ? taxDocRadio.value : 'boleta';
  const isInvoice = taxDocType === 'factura';
  const taxRS = isInvoice ? (($('#b_tax_rs') && $('#b_tax_rs').value.trim()) || '') : '';
  const taxRUT = isInvoice ? (($('#b_tax_rut') && $('#b_tax_rut').value.trim()) || '') : '';
  const taxGiro = isInvoice ? (($('#b_tax_giro') && $('#b_tax_giro').value.trim()) || '') : '';
  const taxDir = isInvoice ? (($('#b_tax_dir') && $('#b_tax_dir').value.trim()) || '') : '';

  if(isInvoice && (!taxRS || !taxRUT || !taxGiro || !taxDir)){
    const submitAlert = $('#submitBlockAlert');
    if(submitAlert){
      submitAlert.style.display = 'block';
      submitAlert.innerHTML = `<span>⚠️ <b>Datos de Facturación incompletos:</b> Por favor complete los datos requeridos para la emisión de la Factura Electrónica Exenta (Razón Social, RUT, Giro y Dirección Tributaria).</span>`;
    }
    const firstEmpty = (!taxRS ? $('#b_tax_rs') : (!taxRUT ? $('#b_tax_rut') : (!taxGiro ? $('#b_tax_giro') : $('#b_tax_dir'))));
    if(firstEmpty){
      firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstEmpty.focus();
    }
    return;
  }

  const isRoundTrip = true;
  const modeLabel = 'Ida y Vuelta (A → B → A)';
  const fmtTotalKm = showMap ? (lastTotalKm.toFixed(1).replace('.', ',') + ' km') : 'No aplica';
  const ringLabel = detectedRing ? `${detectedRing.name} (Mín. ${$c(detectedRing.minFare)})` : 'Verificado en dirección';
  const saldo50 = lastFinalTotal - lastAbono50;
  const blockHuman = isInter
    ? 'Jornada Completa Interregional (Bloquea Mañana y Tarde)'
    : (selectedBlock === 'manana' ? 'Turno Mañana (06:00 a 12:00 hrs)' : (selectedBlock === 'noche' ? 'Turno Noche (22:00 a 04:00 hrs)' : 'Turno Tarde (14:00 a 20:00 hrs)'));

  const newId = D.nid++;
  const newSvc = {
    id: newId,
    tid,
    date,
    start,
    dur,
    pat,
    patPhone,
    age,
    dx: fullDx,
    coord,
    coordType: isSameAsPatient ? 'paciente' : 'familiar',
    ph,
    from,
    depto,
    to,
    mob,
    conciencia,
    alergias: allergyText,
    patologias: pathologies,
    req: reqs,
    obs,
    taxDoc: {
      type: taxDocType,
      label: isInvoice ? 'Factura Electrónica Exenta' : 'Boleta Electrónica Exenta',
      rs: taxRS,
      rut: taxRUT,
      giro: taxGiro,
      dir: taxDir
    },
    comp,
    compDesc: compVal,
    fare: lastFinalTotal,
    paid: 0,
    st: 'Confirmado',
    svcType: mode,
    block: isInter ? 'full' : selectedBlock,
    fullDay: isInter,
    crossShift: false,
    blocksNextMorning: endsAfter22,
    blocksPrevNight: (mode === '5')
  };

  D.svcs.push(newSvc);
  save();

  const taxDocWa = isInvoice
    ? `• Documento Tributario: Factura Electrónica Exenta\n  - Razón Social: ${taxRS}\n  - RUT: ${taxRUT}\n  - Giro: ${taxGiro}\n  - Dirección Tributaria: ${taxDir}\n`
    : `• Documento Tributario: Boleta Electrónica Exenta (Pacientes particulares / Reembolsos)\n`;

  const techObj = D.techs.find(t=>t.id===tid) || {nom:'Daniela González Bouyssieres'};
  const waText = `Hola, deseo solicitar una Pre-Reserva vía WhatsApp (Folio #MSA-${newId}):\n` +
    `• Modalidad: ${svcName}\n` +
    (mode === '4'
      ? `• Formato y Plan: ${durationText}\n• Tarifa: Plana paquetizada cerrada para toda la RM\n`
      : (mode === '5'
          ? `• Región de origen: ${selectedInterRegion}\n• Programa y desglose: ${lastInterBreakdown}\n`
          : `• Jornada: ${getJornadaLabel(currentJornada, mode)}\n`)) +
    `• Fecha: ${formatHumanDate(date)} (${date})\n` +
    `• Turno / Bloque: ${blockHuman}\n` +
    `• Servicio Completo: Recogida ${timeStr} hrs → Retorno/término aprox. ${fm(endMin % 1440)} hrs (${fmtHoursClean(dur)} efectivas reservadas)\n` +
    (isMiddayCase ? `• ⚠️ Atención: Horario especial sujeto a confirmación de factibilidad.\n` : '') +
    `• Dirección: ${from}${depto ? ` (${depto})` : ''}\n` +
    (showDest ? `• Destino / Recinto: ${to}\n` : '') +
    (showMap && (mode === '1' || mode === '2') ? `• Recorrido: ${modeLabel} (${fmtTotalKm} = ${$c(lastKmCost)})\n` : '') +
    `• Valor Total Real: ${$c(lastFinalTotal)}\n` +
    `• Abono 50% para Reservar: ${$c(lastAbono50)}\n` +
    `• Saldo 50% al finalizar: ${$c(saldo50)}\n` +
    `• Paciente: ${pat} (${age} años${patPhone ? ` · Móvil: ${patPhone}` : ''}) · Motivo: ${dxInput}\n` +
    `• Alergias conocidas: ${allergyText}\n` +
    `• Estado de Conciencia: ${conciencia}\n` +
    `• Condición de Movilidad: ${mob}\n` +
    `• Patologías crónicas / Base: ${pathologiesText}\n` +
    `• ¿Viaja solo o acompañado?: ${compVal}\n` +
    (obs ? `• Observaciones e Indicaciones: ${obs}\n` : '') +
    (isSameAsPatient
      ? `• Coordinación: Directa con el Paciente - ${coord} (${ph})\n`
      : `• Coordinación: Familiar / Tutor - ${coord} (${ph})${patPhone ? ` (Móvil paciente: ${patPhone})` : ''}\n`) +
    taxDocWa +
    `Adjunto comprobante del abono del 50% (${$c(lastAbono50)}) transferido a Scotiabank Cta Cte 994989122.`;
  const waUrl = `https://wa.me/${WA_NUM}?text=${encodeURIComponent(waText)}`;
  try {
    window.open(waUrl, '_blank');
  } catch(e) {}

  $('#mainContent').innerHTML = `
    <section class="card" style="text-align:center;padding:36px 24px">
      <div style="font-size:3rem;margin-bottom:8px">🎉</div>
      <span class="step-tag">Solicitud Registrada · Folio #MSA-${newId}</span>
      <h2 style="margin-top:6px">¡Su bloque horario ha sido reservado con éxito!</h2>
      <p style="color:var(--mute);max-width:62ch;margin:8px auto 20px">
        Su bloque ya quedó registrado en nuestra agenda. A continuación encontrará el desglose de su atención y las <b>coordenadas bancarias oficiales</b> para transferir el abono del 50%.
      </p>

      <ul class="summary-list" style="max-width:660px;margin:20px auto;text-align:left">
        <li><span>🛎️ <b>Modalidad de Servicio:</b></span> <span>${e(svcName)}</span></li>
        ${mode === '4' ? `<li><span>🎉 <b>Formato y Plan de Evento:</b></span> <span><b>${e(durationText)} · Tarifa Plana Cerrada RM</b></span></li>` : ''}
        ${mode === '5' ? `<li><span>🗺️ <b>Región del Programa:</b></span> <span><b>${e(selectedInterRegion)}</b></span></li>` : ''}
        <li><span>📅 <b>Fecha Reservada:</b></span> <span><b>${e(formatHumanDate(date))}</b></span></li>
        <li><span>🌅 <b>Bloque de Agenda:</b></span> <span><b>${e(blockHuman)}</b></span></li>
        <li><span>🕒 <b>Servicio Completo:</b></span> <span>Recogida a las <b>${e(timeStr)} hrs</b> → Retorno/término aprox. a las <b>${fm(endMin % 1440)} hrs</b> (${fmtHoursClean(dur)} efectivas reservadas)</span></li>
        ${isMiddayCase ? `<li style="background:#FEF2F2;border:1px solid #EF4444;color:#B91C1C"><span>⚠️ <b>Observación de Horario:</b></span> <b>⚠️ Atención: Horario especial sujeto a confirmación de factibilidad.</b></li>` : ''}
        ${endsAfter22 ? `<li><span>🌙 <b>Regla Descanso Nocturno:</b></span> <span>Bloquea automáticamente Bloque Mañana del día siguiente</span></li>` : ''}
        ${mode === '5' ? `<li><span>🛡️ <b>Seguridad Vial y Descanso:</b></span> <span>Bloquea jornada completa de la fecha y el Turno Noche de la víspera (noche anterior)</span></li>` : ''}
        <li><span>📍 <b>${(mode === '4' && selectedEventSubMode === 'sin_traslado') ? 'Centro de Eventos / Salón:' : 'Dirección de Recogida / Inicio (A):'}</b></span> <span>${e(from)}${depto ? ` · <b>${e(depto)}</b>` : ''}</span></li>
        ${showDest ? `<li><span>🏁 <b>Dirección de Destino / Recinto (B):</b></span> <span>${e(to)}</span></li>` : ''}
        ${showMap && (mode === '1' || mode === '2') ? `
          <li><span>⭕ <b>Anillo Comunal:</b></span> <span>${e(ringLabel)}</span></li>
          <li><span>🛣️ <b>Kilómetros (${e(modeLabel)}):</b></span> <span><b>${e(fmtTotalKm)}</b> (${$c(lastKmCost)})</span></li>
        ` : ''}
        <li><span>⏱️ <b>${mode === '5' ? 'Programa y Tiempo:' : (mode === '4' ? 'Plan de Cobertura:' : 'Jornada y Tiempo:')}</b></span> <span>${mode === '5' ? e(lastInterBreakdown) : (mode === '4' ? `${e(durationText)} · Tarifa Plana Cerrada` : `${e(getJornadaLabel(currentJornada, mode))} · ${dur} min (${$c(lastTimeCost)})`)}</span></li>
        <li style="background:var(--mist);border-color:var(--teal)">
          <span>💰 <b>VALOR REAL TOTAL A PAGAR:</b></span> <span style="font-size:1.15rem;font-weight:800;color:var(--teal)">${$c(lastFinalTotal)}</span>
        </li>
        <li style="background:#0E4A55;color:#fff">
          <span>🔒 <b>ABONO 50% PARA RESERVAR:</b></span> <span style="font-size:1.15rem;font-weight:800;color:#8fe0c0">${$c(lastAbono50)}</span>
        </li>
        <li><span>🏁 <b>Saldo 50% al terminar la atención:</b></span> <span><b>${$c(saldo50)}</b></span></li>
        <li><span>🩺 <b>Profesional TENS:</b></span> <span>${e(techObj.nom)}</span></li>
        <li><span>👤 <b>Paciente:</b></span> <span>${e(pat)} (${age} años${patPhone ? ` · 📞 ${e(patPhone)}` : ''}) · <b>Motivo:</b> ${e(dxInput)}</span></li>
        <li><span>⚠️ <b>Alergias Conocidas:</b></span> <span style="${hasAllergy ? 'color:#b91c1c;font-weight:700' : ''}">${e(allergyText)}</span></li>
        <li><span>🧠 <b>Estado de Conciencia:</b></span> <span>${e(conciencia)}</span></li>
        <li><span>♿ <b>Condición de Movilidad:</b></span> <span>${e(mob)}</span></li>
        <li><span>🩺 <b>Patologías Crónicas / Base:</b></span> <span>${e(pathologiesText)}</span></li>
        <li><span>👥 <b>¿Viaja solo o acompañado?:</b></span> <span>${e(compVal)}</span></li>
        ${obs ? `<li><span>📝 <b>Observaciones / Indicaciones:</b></span> <span>${e(obs)}</span></li>` : ''}
        <li><span>📞 <b>Coordinación de Reserva:</b></span> <span><b>${isSameAsPatient ? 'Directa con el Paciente' : 'Familiar / Tutor'}:</b> ${e(coord)} (${e(ph)})</span></li>
        <li><span>📑 <b>Documento Tributario:</b></span> <span>${isInvoice ? `Factura Electrónica Exenta<br><small style="color:var(--mute)">Razón Social: <b>${e(taxRS)}</b> · RUT: <b>${e(taxRUT)}</b> · Giro: <b>${e(taxGiro)}</b><br>Dirección Tributaria: <b>${e(taxDir)}</b></small>` : 'Boleta Electrónica Exenta (Pacientes particulares / Reembolsos)'}</span></li>
      </ul>

      <!-- COORDENADAS BANCARIAS OFICIALES -->
      <div style="max-width:660px;margin:24px auto;text-align:left;background:var(--mist);border:2px solid var(--teal);border-radius:12px;padding:22px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="font-size:1.5rem">🏦</span>
          <h3 style="margin:0;font-size:1.18rem;color:var(--teal)">Datos Bancarios para Pago del Abono (50%: ${$c(lastAbono50)})</h3>
        </div>
        <p style="font-size:.92rem;color:var(--mute);margin:0 0 14px;line-height:1.5">
          Para confirmar y bloquear formalmente la agenda exclusiva de la unidad TENS y el vehículo, realice la transferencia del 50% a la cuenta bancaria oficial de la empresa:
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px">
          <div>
            <span style="font-size:.78rem;text-transform:uppercase;color:var(--mute);font-weight:700;display:block">Razón Social</span>
            <strong style="color:var(--ink);font-size:.92rem">Servicios Integrales de Asistencia, Cuidados y Traslados SpA</strong>
          </div>
          <div>
            <span style="font-size:.78rem;text-transform:uppercase;color:var(--mute);font-weight:700;display:block">RUT de la Empresa</span>
            <strong style="color:var(--teal);font-size:1.02rem">78.521.776-4</strong>
          </div>
          <div>
            <span style="font-size:.78rem;text-transform:uppercase;color:var(--mute);font-weight:700;display:block">Banco</span>
            <strong style="color:var(--teal);font-size:1.05rem">Scotiabank</strong>
          </div>
          <div>
            <span style="font-size:.78rem;text-transform:uppercase;color:var(--mute);font-weight:700;display:block">Tipo de Cuenta</span>
            <strong style="color:var(--ink);font-size:.95rem">Cuenta Corriente</strong>
          </div>
          <div>
            <span style="font-size:.78rem;text-transform:uppercase;color:var(--mute);font-weight:700;display:block">Número de Cuenta</span>
            <strong style="color:var(--teal);font-size:1.15rem;letter-spacing:.03em">994989122</strong>
          </div>
          <div>
            <span style="font-size:.78rem;text-transform:uppercase;color:var(--mute);font-weight:700;display:block">Correo de Notificación</span>
            <strong style="color:var(--ink);font-size:.9rem">movilidadysaludasistida@gmail.com</strong>
          </div>
          <div>
            <span style="font-size:.78rem;text-transform:uppercase;color:var(--mute);font-weight:700;display:block">WhatsApp de Comprobantes</span>
            <strong style="color:var(--teal);font-size:.95rem">+56 9 2999 0095</strong>
          </div>
        </div>
        <div style="margin-top:14px;font-size:.85rem;color:var(--mute);display:flex;align-items:center;gap:6px">
          <span>📋</span> <span>El cupo se reserva temporalmente por 1 hora a la espera del comprobante. Consulte nuestros <a href="terminos.html" target="_blank" rel="noopener" style="color:var(--teal);font-weight:600;text-decoration:underline">Términos y Condiciones</a>.</span>
        </div>
      </div>

      <div class="info-banner" style="max-width:660px;margin:18px auto;text-align:left">
        <b>Siguiente paso (Envío de Comprobante de Abono):</b><br>
        1. Realice la transferencia electrónica del abono del 50% (${$c(lastAbono50)}) a la cuenta Scotiabank indicada arriba.<br>
        2. Presione el botón verde a continuación para enviar los detalles de la reserva y adjuntar su comprobante vía WhatsApp (+56 9 2999 0095).
      </div>

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px">
        <a class="btn" href="${waUrl}" target="_blank" rel="noopener">💬 Confirmar y Enviar Comprobante por WhatsApp</a>
        <a class="btn ghost" href="reservar.html">📅 Agendar otra hora</a>
        <a class="btn ghost" href="index.html">← Volver al inicio</a>
      </div>
    </section>
  `;
  window.scrollTo({top:0,behavior:'smooth'});
}

addEventListener('storage',ev=>{
  if(ev.key===K) updateSlots();
  if(ev.key===TM_K) applyTheme(ev.newValue);
});

initForm();
