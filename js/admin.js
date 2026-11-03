const PX=44,S0=0,S1=1440,BUF=120,K='msa-v1',TM_K='msa-theme',SESS_K='msa-session';
const PRICE_PER_KM = 1000;
const pad=n=>String(n).padStart(2,'0'),fm=m=>pad(Math.floor(m/60))+':'+pad(m%60),tm=t=>{if(!t)return 0;const[a,b]=t.split(':');return +a*60+ +b};
const toYMD=dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
const addDaysYMD=(str,days)=>{const[y,m,d]=str.split('-').map(Number);const dt=new Date(y,m-1,d);dt.setDate(dt.getDate()+days);return toYMD(dt)};
const TODAY=toYMD(new Date());
const MONTH_NAMES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const BLOCK_LABELS={
  full:'Día completo cerrado',
  manana:'Solo Turno Mañana (06:00 a 12:00)',
  tarde:'Solo Turno Tarde (14:00 a 20:00)',
  noche:'Solo Turno Noche (20:00 a 06:00 hrs)'
};

const RINGS_DATA = [
  { id: 1, name: 'Anillo 1 (Maipú y alrededores)', minFare: 18000, comunas: ['Cerrillos', 'Lo Espejo', 'Lo Prado', 'Maipú', 'Padre Hurtado', 'Pedro Aguirre Cerda', 'Quinta Normal'] },
  { id: 2, name: 'Anillo 2 (Santiago Centro, Sur y Poniente)', minFare: 35000, comunas: ['Calera de Tango', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'Macul', 'Ñuñoa', 'Peñaflor', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Recoleta', 'Renca', 'San Bernardo', 'San Joaquín', 'San Miguel', 'San Ramón', 'Talagante', 'Santiago Centro'] },
  { id: 3, name: 'Anillo 3 (Sector Oriente y extremos)', minFare: 50000, comunas: ['Alhué', 'Buin', 'Colina', 'Curacaví', 'El Monte', 'Isla de Maipo', 'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea', 'María Pinto', 'Melipilla', 'Paine', 'Pirque', 'Puente Alto', 'San José de Maipo', 'San Pedro', 'Tiltil', 'Vitacura'] }
];

const MEDICAL_PLACES = [
  {name:'Hospital El Carmen', addr:'Av. Camino a Rinconada 1201, Maipú', km: 6.5},
  {name:'Clínica Santa María', addr:'Av. Santa María 0500, Providencia', km: 18.5},
  {name:'Clínica Indisa (Providencia)', addr:'Av. Santa María 1810, Providencia', km: 19.0},
  {name:'Hospital San Juan de Dios', addr:'Huérfanos 3255, Santiago Centro', km: 12.0},
  {name:'Hospital Clínico UC Christus (Marcoleta)', addr:'Marcoleta 367, Santiago Centro', km: 14.5},
  {name:'Hospital Clínico Universidad de Chile (J.J. Aguirre)', addr:'Dr. Carlos Lorca Tobar 999, Independencia', km: 16.0},
  {name:'Hospital del Salvador', addr:'Av. Salvador 364, Providencia', km: 17.5},
  {name:'Instituto Nacional del Cáncer', addr:'Av. Profesor Zañartu 1010, Independencia', km: 16.5},
  {name:'Hospital Barros Luco', addr:'Gran Avenida 3204, San Miguel', km: 14.0},
  {name:'Hospital Sótero del Río', addr:'Av. Concha y Toro 3459, Puente Alto', km: 26.0},
  {name:'Clínica Alemana (Vitacura)', addr:'Av. Vitacura 5951, Vitacura', km: 25.0},
  {name:'Clínica Las Condes', addr:'Estoril 450, Las Condes', km: 28.0}
];

function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}

function detectRing(addrText){
  const n = norm(addrText);
  for(const r of RINGS_DATA){
    for(const c of r.comunas){
      if(c === 'Santiago Centro') continue;
      if(new RegExp('\\b' + norm(c) + '\\b', 'i').test(n)) return { ring: r, comuna: c };
    }
  }
  if(/\bsantiago centro\b/i.test(n) || /\bsantiago\b/i.test(n)) return { ring: RINGS_DATA[1], comuna: 'Santiago Centro' };
  return { ring: RINGS_DATA[0], comuna: 'Maipú (por defecto)' };
}

function getTheme(){try{const s=localStorage.getItem(TM_K);if(s)return s}catch(x){}return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function applyTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem(TM_K,t)}catch(x){}}
function toggleTheme(){const cur=document.documentElement.getAttribute('data-theme')||getTheme();applyTheme(cur==='dark'?'light':'dark');render()}
const ST=['Pendiente','Confirmado','En Ruta','En Atención','Finalizado','Cancelado'];
const COL={'Pendiente':'#b45309','Confirmado':'#2563eb','En Ruta':'#7c3aed','En Atención':'#0d9488','Finalizado':'#15803d','Cancelado':'#6b7280'};
const MOB=['Autovalente','Bastón / andador','Silla de ruedas','Dependencia Severa'];
const REQ=['Solo traslado','Acompañamiento en box médico','Control de signos vitales','Administración de medicamentos','Asistencia de higiene/confort'];
const NEXT={'Pendiente':['En Ruta','En Camino'],'Confirmado':['En Ruta','En Camino'],'En Ruta':['En Atención','Iniciado'],'En Atención':['Finalizado','Finalizado']};
const $=s=>document.querySelector(s);
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $c=n=>'$'+Math.round(n).toLocaleString('es-CL');

function seed(){
  const dMananaOcupada = addDaysYMD(TODAY, 3);
  const dInterregional = addDaysYMD(TODAY, 5);
  const dEventoNocturno = addDaysYMD(TODAY, 8);
  const sv=(id,tid,date,start,dur,pat,age,dx,coord,ph,from,to,mob,req,comp,fare,paid,st,extra={})=>({id,tid,date,start:tm(start),dur,pat,age,dx,coord,ph,from,to,mob,req,comp,fare,paid,st,...extra});
  return{
    seedVersion: 3,
    nid:14,
    techs:[
      {id:'t1',nom:'Daniela González Bouyssieres',rut:'Registro SIS Nº 442762',tel:'+56929990095',veh:'Unidad 1 · Vehículo Acondicionado Clase A2',col:'#0f766e',act:true},
      {id:'t2',nom:'Unidad TENS 2 (Respaldo)',rut:'15.987.654-3',tel:'+56933334444',veh:'Unidad 2',col:'#c2410c',act:false}
    ],
    svcs:[
      sv(1,'t1',dMananaOcupada,'08:30',120,'Rosa Medina',82,'1. Servicio Integral · Control cardiológico','Andrea Medina','+56977778888','Maipú, Av. Los Pajaritos 1450','Clínica Santa María, Providencia','Silla de ruedas plegable',['Acompañamiento en box médico','Control de signos vitales'],true,42000,21000,'Confirmado',{block:'manana',svcType:'1'}),
      sv(2,'t1',dInterregional,'08:00',360,'Jorge Salas',76,'5. Programas Interregionales (Región de Valparaíso) · Control Oncológico','Luis Salas','+56966665555','Viña del Mar, Av. Libertad 450','Instituto Nacional del Cáncer, Santiago','Camina con asistencia/bastón',['Acompañamiento en box médico','Control de signos vitales'],true,300000,150000,'Confirmado',{block:'full',fullDay:true,svcType:'5'}),
      sv(3,'t1',dEventoNocturno,'16:30',360,'María Opazo',84,'4. Acompañamiento a Eventos Sociales · Matrimonio familiar','Pía Opazo','+56944443333','Maipú, Camino a Rinconada 800','Centro de Eventos, Calera de Tango','Silla de ruedas plegable',['Control de signos vitales','Asistencia de higiene/confort'],true,80000,40000,'Confirmado',{block:'tarde',svcType:'4',blocksNextMorning:true})
    ],
    blocks:[]
  };
}

function load(){
  try{
    const parsed = JSON.parse(localStorage.getItem(K));
    if(parsed && (parsed.seedVersion === 3 || parsed.seedVersion === 2)){
      if(!Array.isArray(parsed.blocks)) parsed.blocks = [];
      try {
        const dedicated = JSON.parse(localStorage.getItem('msa_blocks'));
        if(Array.isArray(dedicated)){
          dedicated.forEach(db => {
            if(!parsed.blocks.some(b => b.date === db.date && b.type === db.type)){
              parsed.blocks.push(db);
            }
          });
        }
      } catch(e){}
      return parsed;
    }
    return null;
  }catch(x){return null}
}

function save(){
  try{
    localStorage.setItem(K, JSON.stringify(D));
    if(Array.isArray(D.blocks)){
      localStorage.setItem('msa_blocks', JSON.stringify(D.blocks));
    }
    // Notificación cruzada para sincronizar reservar.html inmediatamente
    localStorage.setItem('msa-last-block-update', Date.now().toString());
  }catch(x){}
}

function getSession(){
  try {
    return JSON.parse(sessionStorage.getItem(SESS_K)) || JSON.parse(localStorage.getItem('msa-admin-user'));
  } catch(e){ return null; }
}

function logout(){
  try {
    sessionStorage.removeItem(SESS_K);
    localStorage.removeItem('msa-admin-token');
    localStorage.removeItem('msa-admin-user');
  } catch(e){}
  window.location.replace('login.html');
}

const nowInit=new Date();
let D=load()||seed();
let U={view:'admin',tab:'blocks',date:addDaysYMD(TODAY,1),calYear:nowInit.getFullYear(),calMonth:nowInit.getMonth(),blkType:'full',tens:'t1',sel:null,edit:null};
save();

addEventListener('storage',ev=>{
  if(ev.key===K || ev.key==='msa-last-block-update'){
    D=load()||D;
    render();
  }
  if(ev.key===TM_K){
    document.documentElement.setAttribute('data-theme',ev.newValue);
    render();
  }
});


if(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){
  window.addEventListener('msa-blocks-updated', () => {
    D = load() || D;
    render();
  });
}
const tn=id=>(D.techs.find(t=>t.id==id)||{}).nom||'—';

/* REGLA DE BUFFER: nuevo.inicio < previo.fin + 180 (y simétrica: previo.inicio < nuevo.fin + 180) */
function avail(tid,date,start,dur,ign){
  return !D.svcs.some(s=>s.tid==tid&&s.date==date&&s.st!='Cancelado'&&s.id!=ign&&start<s.start+s.dur+BUF&&s.start<start+dur+BUF);
}

function render(){
  const sess = getSession();
  if(!sess){
    window.location.replace('login.html');
    return;
  }
  if(sess.role === 'tens'){
    if(U.view !== 'blocks_tens') U.view = 'tens';
    U.tens = sess.tensId || 't1';
    $('#app').innerHTML = hdr(sess) + (U.view === 'blocks_tens' ? blocksView() : tens());
  } else {
    $('#app').innerHTML = hdr(sess) + (U.view=='admin'?admin():tens());
    if(U.view=='admin'&&U.tab=='new') initAdminQuoter();
  }
}

function hdr(sess){
  const d=document.documentElement.getAttribute('data-theme')=='dark';
  const isAdmin = sess.role === 'admin';
  return `<div class="top">
    <div style="display:flex;align-items:center;gap:10px">
      <img src="Logo de Movilidad y Salud Asistida.png" alt="Logo" style="height:38px;width:auto">
      <div>
        <h1>Movilidad y Salud Asistida</h1>
        <div style="font-size:12px;color:var(--mut)">
          ${isAdmin ? '👑 <b>' + (sess.roleLabel ? e(sess.roleLabel) : 'Superadmin / Operaciones') + '</b>' : '🩺 TENS: <b>'+e(sess.name)+'</b>'}
        </div>
      </div>
    </div>
    <div class="row">
      ${isAdmin ? `
        <button class="${U.view=='admin'?'on':''}" onclick="U.view='admin';render()">Gestión y Finanzas</button>
        <button class="${U.view=='tens'?'on':''}" onclick="U.view='tens';render()">Vista Terreno</button>
      ` : `
        <button class="${U.view=='tens'?'on':''}" onclick="U.view='tens';render()">Mis Servicios</button>
        <button class="${U.view=='blocks_tens'?'on':''}" onclick="U.view='blocks_tens';render()">🔒 Disponibilidad y Bloqueos</button>
      `}
      <button onclick="toggleTheme()" title="Cambiar tema">${d?'☀️ Claro':'🌙 Oscuro'}</button>
      <button onclick="logout()" title="Cerrar sesión actual">Cerrar sesión</button>
      <a class="b" href="index.html" target="_blank" title="Abrir sitio web oficial de clientes">🌐 Ver Sitio Público</a>
    </div>
  </div>`;
}

function dateNav(){return `<div class=row style="margin-bottom:10px"><button onclick="mv(-1)">‹</button><input type=date value="${U.date}" onchange="U.date=this.value;render()"><button onclick="mv(1)">›</button></div>`}
function mv(n){const d=new Date(U.date+'T12:00:00');d.setDate(d.getDate()+n);U.date=d.toISOString().slice(0,10);render()}

function admin(){
  const tabs=[
    ['blocks','🔒 Gestión de Disponibilidad y Bloqueos'],
    ['cal','Calendario diario'],
    ['new','➕ Nueva reserva (Cotizador Auto)'],
    ['staff','Personal TENS']
  ];
  return `<div class=row style="margin-bottom:10px">${tabs.map(t=>`<button class="${U.tab==t[0]?'on':''}" onclick="U.tab='${t[0]}';U.sel=null;render()">${t[1]}</button>`).join('')}</div>`+
         (U.tab=='blocks'?blocksView():U.tab=='cal'?cal():U.tab=='new'?form():staff());
}

function changeAdminCalMonth(delta){
  U.calMonth += delta;
  if(U.calMonth > 11){ U.calMonth = 0; U.calYear++; }
  if(U.calMonth < 0){ U.calMonth = 11; U.calYear--; }
  render();
}

function pickAdminCalDate(dateStr){
  U.date = dateStr;
  const [y,m] = dateStr.split('-').map(Number);
  U.calYear = y;
  U.calMonth = m - 1;
  render();
}

function setBlkType(t){
  U.blkType = t;
  render();
}

function saveManualBlock(ev){
  ev.preventDefault();
  const dateStr = ($('#mb_date') && $('#mb_date').value) || U.date;
  const type = U.blkType || 'full';
  const reason = (($('#mb_reason') && $('#mb_reason').value) || '').trim();
  if(!dateStr){ alert('Seleccione una fecha válida.'); return; }
  if(!Array.isArray(D.blocks)) D.blocks = [];

  if(type === 'full'){
    D.blocks = D.blocks.filter(b => b.date !== dateStr);
  } else {
    D.blocks = D.blocks.filter(b => !(b.date === dateStr && (b.type === type || b.type === 'full')));
  }

  const newBlock = {
    id: D.nid++,
    date: dateStr,
    type,
    reason: reason || 'Sin motivo especificado',
    tid: 'all',
    createdAt: new Date().toISOString()
  };

  D.blocks.push(newBlock);
  save();
  U.date = dateStr;
  render();

  // Persistir en backend centralizado (Supabase / Vercel API)
  if(window.MsaBlocksService){
    MsaBlocksService.saveBlock(newBlock).catch(err => {
      console.warn('Error al persistir bloqueo centralizado:', err);
    });
  }
}

function removeManualBlock(blockId){
  if(!Array.isArray(D.blocks)) return;
  const target = D.blocks.find(b => b.id === blockId);
  D.blocks = D.blocks.filter(b => b.id !== blockId);
  save();
  render();

  if(window.MsaBlocksService && target){
    MsaBlocksService.removeBlock(target.id || target.date, target.type).catch(err => {
      console.warn('Error al eliminar bloqueo centralizado:', err);
    });
  }
}

function removeAllBlocksForDate(dateStr){
  if(!Array.isArray(D.blocks)) return;
  D.blocks = D.blocks.filter(b => b.date !== dateStr);
  save();
  render();

  if(window.MsaBlocksService){
    MsaBlocksService.removeBlock(dateStr).catch(err => {
      console.warn('Error al eliminar bloqueos centralizados de la fecha:', err);
    });
  }
}

async function syncCentralizedBlocksAdmin(){
  if(window.MsaBlocksService){
    try {
      const remoteBlocks = await MsaBlocksService.fetchBlocks();
      if(Array.isArray(remoteBlocks) && remoteBlocks.length > 0){
        MsaBlocksService.mergeBlocksIntoD(remoteBlocks, D);
        save();
        render();
      }
    } catch(e){
      console.warn('Error sincronizando bloqueos en admin:', e);
    }
  }
}

function openDbConfigModal(){
  const conf = (window.MsaBlocksService && window.MsaBlocksService.getConfig()) || { url: '', key: '' };
  const currentUrl = conf.url || '';
  const currentKey = conf.key || '';
  const newUrl = prompt('Ingrese URL de Proyecto Supabase (ej: https://xyzcompany.supabase.co):', currentUrl);
  if(newUrl === null) return;
  const newKey = prompt('Ingrese Supabase Anon Key (o Service Role Key):', currentKey);
  if(newKey === null) return;
  if(window.MsaBlocksService){
    window.MsaBlocksService.setConfig(newUrl, newKey);
    alert('Configuración de base de datos Supabase guardada exitosamente.');
    syncCentralizedBlocksAdmin();
  }
}

function blocksView(){
  if(!Array.isArray(D.blocks)) D.blocks = [];
  const y = U.calYear;
  const m = U.calMonth;
  const firstDay = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  let cells = '';
  for(let i = 0; i < startOffset; i++){
    cells += `<div class="mcal-day empty"></div>`;
  }

  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = `${y}-${pad(m+1)}-${pad(d)}`;
    const isSel = dateStr === U.date;
    const dayBlocks = D.blocks.filter(b => b.date === dateStr);
    const daySvcs = (D.svcs || []).filter(s => s.date === dateStr && s.st !== 'Cancelado');

    const hasFull = dayBlocks.some(b => b.type === 'full') || (dayBlocks.some(b => b.type === 'manana') && dayBlocks.some(b => b.type === 'tarde') && dayBlocks.some(b => b.type === 'noche'));
    const hasManana = !hasFull && dayBlocks.some(b => b.type === 'manana');
    const hasTarde  = !hasFull && dayBlocks.some(b => b.type === 'tarde');
    const hasNoche  = !hasFull && dayBlocks.some(b => b.type === 'noche');

    let cls = '';
    if(hasFull) cls = 'b-full';
    else if(hasManana || hasTarde || hasNoche) cls = 'b-part';

    let tags = '';
    if(hasFull){
      tags += `<span class="mtag full">🔒 Día cerrado</span>`;
    } else {
      if(hasManana) tags += `<span class="mtag part">🔒 Mañana</span>`;
      if(hasTarde)  tags += `<span class="mtag part">🔒 Tarde</span>`;
      if(hasNoche)  tags += `<span class="mtag part" style="background:#4338ca">🔒 Noche</span>`;
    }
    if(daySvcs.length > 0){
      tags += `<span class="mtag svc">📅 ${daySvcs.length} res.</span>`;
    }
    if(!tags){
      tags = `<span class="mtag free">Libre</span>`;
    }

    cells += `
      <div class="mcal-day ${cls} ${isSel ? 'sel' : ''}" onclick="pickAdminCalDate('${dateStr}')">
        <div class="mcal-num">
          <span>${d}</span>
          ${dateStr === TODAY ? '<span style="font-size:9px;color:var(--pri)">HOY</span>' : ''}
        </div>
        <div class="mcal-tags">${tags}</div>
      </div>
    `;
  }

  const selDateBlocks = D.blocks.filter(b => b.date === U.date);
  const allSortedBlocks = [...D.blocks].sort((a,b) => a.date.localeCompare(b.date));

  return `
    <div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:6px">
        <div>
          <h2 style="margin:0">🔒 Gestión de Disponibilidad y Bloqueos Manuales</h2>
          <div style="font-size:13px;color:var(--mut);margin-top:2px">
            Bloquee días completos o turnos específicos (días libres, mantención de móvil o trámites). Sincroniza en tiempo real con <b>reservar.html</b>.
          </div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:8px 12px;margin:8px 0 12px;font-size:13px">
        <div>
          <b>Persistencia Centralizada:</b>
          <span id="admDbStatus" style="color:#16a34a;font-weight:700">🟢 En línea (Supabase &amp; Vercel API sincronizados)</span>
        </div>
        <button type="button" class="b" style="margin:0;padding:4px 10px;font-size:12px" onclick="openDbConfigModal()">⚙️ Configurar Supabase</button>
      </div>
      <div class="blk-layout" style="margin-top:12px">
        <div class="card" style="margin:0">
          <div class="row" style="justify-content:space-between;margin-bottom:10px">
            <button type="button" onclick="changeAdminCalMonth(-1)">◀ Mes anterior</button>
            <strong style="font-size:15px">${MONTH_NAMES[m]} ${y}</strong>
            <button type="button" onclick="changeAdminCalMonth(1)">Mes siguiente ▶</button>
          </div>
          <div class="mcal-dow">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>
          <div class="mcal-grid">${cells}</div>
          <div class="row" style="margin-top:10px;font-size:12px;color:var(--mut);justify-content:center;gap:14px">
            <span><span class="dot" style="background:#dc2626"></span>Día completo cerrado</span>
            <span><span class="dot" style="background:#d97706"></span>Turno Mañana / Tarde / Noche bloqueado</span>
            <span><span class="dot" style="background:#0f766e"></span>Con reservas agendadas</span>
          </div>
        </div>

        <div>
          <form class="card" style="margin:0 0 12px" onsubmit="saveManualBlock(event)">
            <h2>Bloquear fecha o turno</h2>
            <div style="margin-bottom:10px">
              <label>1. Fecha seleccionada</label>
              <input id="mb_date" type="date" value="${U.date}" required onchange="pickAdminCalDate(this.value)" style="width:100%">
            </div>

            <div style="margin-bottom:10px">
              <label>2. Tipo de bloqueo a aplicar</label>
              <label class="blk-opt ${U.blkType==='full'?'on':''}" onclick="setBlkType('full')">
                <input type="radio" name="blk_t" value="full" ${U.blkType==='full'?'checked':''}>
                <div>
                  <b>a) Día completo cerrado</b>
                  <div style="font-size:12px;color:var(--mut)">Inhabilita toda la fecha en el portal público de reservas.</div>
                </div>
              </label>
              <label class="blk-opt ${U.blkType==='manana'?'on':''}" onclick="setBlkType('manana')">
                <input type="radio" name="blk_t" value="manana" ${U.blkType==='manana'?'checked':''}>
                <div>
                  <b>b) Solo Turno Mañana (06:00 a 12:00)</b>
                  <div style="font-size:12px;color:var(--mut)">Inhabilita el Turno Mañana y mantiene habilitado el Turno Tarde. (El intervalo de 12:00 a 14:00 hrs corresponde al buffer operativo/almuerzo no disponible para inicio de atenciones regulares).</div>
                </div>
              </label>
              <label class="blk-opt ${U.blkType==='tarde'?'on':''}" onclick="setBlkType('tarde')">
                <input type="radio" name="blk_t" value="tarde" ${U.blkType==='tarde'?'checked':''}>
                <div>
                  <b>c) Solo Turno Tarde (14:00 a 20:00)</b>
                  <div style="font-size:12px;color:var(--mut)">Inhabilita el Turno Tarde y mantiene habilitado el Turno Mañana. (El intervalo de 12:00 a 14:00 hrs corresponde al buffer operativo/almuerzo no disponible para inicio de atenciones regulares).</div>
                </div>
              </label>
              <label class="blk-opt ${U.blkType==='noche'?'on':''}" onclick="setBlkType('noche')">
                <input type="radio" name="blk_t" value="noche" ${U.blkType==='noche'?'checked':''}>
                <div>
                  <b>d) Solo Turno Noche (20:00 a 06:00 hrs)</b>
                  <div style="font-size:12px;color:var(--mut)">Inhabilita el agendamiento nocturno (Cuidados a Domicilio y Eventos) y mantiene habilitados los turnos diurnos de Mañana y Tarde.</div>
                </div>
              </label>
            </div>

            <div style="margin-bottom:12px">
              <label>3. Motivo interno (opcional)</label>
              <input id="mb_reason" type="text" placeholder="Ej: Mantención de móvil, Trámite, Día libre" style="width:100%">
            </div>

            <button class="p" type="submit" style="width:100%;padding:10px">🔒 Aplicar Bloqueo en ${U.date}</button>
          </form>

          <div class="card" style="margin:0">
            <div class="row" style="justify-content:space-between;margin-bottom:8px">
              <h2 style="margin:0">Bloqueos activos en ${U.date}</h2>
              ${selDateBlocks.length > 1 ? `<button type="button" class="unlock-btn" onclick="removeAllBlocksForDate('${U.date}')">🔓 Desbloquear todo el día</button>` : ''}
            </div>
            ${selDateBlocks.length === 0 ? `
              <div style="font-size:13px;color:var(--mut)">✅ Esta fecha no registra bloqueos manuales activos.</div>
            ` : selDateBlocks.map(b => `
              <div class="row" style="justify-content:space-between;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;background:var(--bg)">
                <div>
                  <strong style="color:#dc2626">🔒 ${e(BLOCK_LABELS[b.type] || b.type)}</strong>
                  <div style="font-size:12px;color:var(--mut)">Motivo: <b>${e(b.reason || 'Sin motivo')}</b></div>
                </div>
                <button type="button" class="unlock-btn" onclick="removeManualBlock(${b.id})">🔓 Desbloquear</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="overflow-x:auto">
      <h2>📋 Listado general de bloqueos manuales activos (${allSortedBlocks.length})</h2>
      ${allSortedBlocks.length === 0 ? `
        <div class="msg">No hay bloqueos manuales registrados actualmente.</div>
      ` : `
        <table>
          <tr><th>Fecha</th><th>Tipo de bloqueo</th><th>Motivo interno</th><th>Impacto Público</th><th>Acción</th></tr>
          ${allSortedBlocks.map(b => `
            <tr>
              <td><b>${e(b.date)}</b></td>
              <td><span class="badge" style="background:${b.type==='full'?'#dc2626':(b.type==='noche'?'#4338ca':'#d97706')}">${e(BLOCK_LABELS[b.type] || b.type)}</span></td>
              <td>${e(b.reason || '—')}</td>
              <td style="font-size:12px;color:var(--mut)">Inhabilita selección en reservar.html</td>
              <td><button type="button" class="unlock-btn" onclick="removeManualBlock(${b.id})">🔓 Desbloquear</button></td>
            </tr>
          `).join('')}
        </table>
      `}
    </div>
  `;
}

function cal(){
  const ss=D.svcs.filter(s=>s.date==U.date),act=D.techs.filter(t=>t.act),live=ss.filter(s=>s.st!='Cancelado');
  const prevDate = addDaysYMD(U.date, -1);
  const prevOvernightSvcs = D.svcs.filter(s => s.date == prevDate && s.st != 'Cancelado' && (s.start + s.dur > 1440));
  const cob=live.reduce((a,s)=>a+s.paid,0),sal=live.reduce((a,s)=>a+s.fare-s.paid,0);
  const H=(S1-S0)*PX/60;let hrs='';for(let m=S0;m<S1;m+=60)hrs+=`<div>${fm(m)}</div>`;
  const cols=act.map(t=>{
    const unitSvcs = ss.filter(s=>s.tid==t.id);
    const prevUnitOvernight = prevOvernightSvcs.filter(s=>s.tid==t.id);
    return `<div class=col><div class=ch style="border-color:${t.col}">${e(t.nom)}</div><div class=cb style="height:${H}px;cursor:pointer" onclick="onCalGridClick(event, '${t.id}', '${U.date}')" title="Clic en cualquier espacio vacío para agendar a esta hora">${prevUnitOvernight.map(blkOvernightRem).join('')}${unitSvcs.map(blk).join('')}</div></div>`;
  }).join('');
  return dateNav()+`<div class=met><div><b>${live.length}</b><span>Servicios del día</span></div><div><b>${$c(cob)}</b><span>Abonado</span></div><div><b>${$c(sal)}</b><span>Saldo pendiente</span></div><div><b>${act.length}</b><span>TENS operativos</span></div></div>
  <div class=row style="margin-bottom:8px;font-size:12px">${ST.map(s=>`<span><span class=dot style="background:${COL[s]}"></span>${s}</span>`).join('')}<span><span class=dot style="background:var(--buf);border:1px dashed var(--mut)"></span>Buffer 2 h</span></div>
  <div class=cal><div class=tc><div style="height:38px;border:0"></div>${hrs}</div>${cols||'<p style="padding:12px">No hay TENS activos.</p>'}</div>${detail()}`;
}

function blk(s){
  const top=(s.start-S0)*PX/60;
  const rawH=s.dur*PX/60;
  const maxH=(S1-S0)*PX/60 - top;
  const h=Math.min(rawH, maxH);
  const bt=top+rawH;
  const bh=Math.max(0,Math.min(BUF*PX/60,(S1-S0)*PX/60-bt));
  const c=s.st=='Cancelado';
  const isOvernight = s.start + s.dur > 1440;
  return (c?'':`<div class=buf style="top:${bt}px;height:${bh}px">Buffer operativo 2h</div>`)+
    `<div class="sv ${c?'c':''}" style="top:${top}px;height:${h}px;background:${COL[s.st]}" onclick="event.stopPropagation(); abrirMenuContextualServicio(${s.id})" title="Clic para ver ficha clínica y acciones rápidas"><b>${fm(s.start)}–${fm((s.start+s.dur)%1440)}</b> ${isOvernight?'🌙 ':''}${e(s.pat)}<br>${s.st}</div>`;
}

function blkOvernightRem(s){
  const remDur = (s.start + s.dur) - 1440;
  const top = 0;
  const h = remDur * PX / 60;
  const bt = h;
  const bh = Math.max(0, Math.min(BUF*PX/60, (S1-S0)*PX/60 - bt));
  const c = s.st == 'Cancelado';
  return (c ? '' : `<div class=buf style="top:${bt}px;height:${bh}px">Buffer operativo 2h</div>`) +
    `<div class="sv ${c?'c':''}" style="top:0;height:${h}px;background:${COL[s.st]};opacity:.88" onclick="event.stopPropagation(); abrirMenuContextualServicio(${s.id})" title="Continuación de atención nocturna iniciada el día anterior"><b>00:00–${fm(remDur)}</b> 🌙 (Cont. noche) ${e(s.pat)}<br>${s.st}</div>`;
}

function onCalGridClick(event, tid, date){
  const rect = event.currentTarget.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  const slotHour = Math.floor(offsetY / PX);
  const clampedHour = Math.max(0, Math.min(23, slotHour));
  const timeStr = `${pad(clampedHour)}:00`;

  U.tab = 'new';
  U.date = date;
  qState.date = date;
  qState.time = timeStr;
  render();

  setTimeout(() => {
    if($('#aq_date')) $('#aq_date').value = date;
    if($('#aq_time')) $('#aq_time').value = timeStr;
    if($('#aq_tens')) $('#aq_tens').value = tid;
    calcAdminQuote();
  }, 50);
}
window.onCalGridClick = onCalGridClick;

function sel(id){U.sel=id;render();$('#det')&&$('#det').scrollIntoView({behavior:'smooth'})}
function detail(){
  const s=D.svcs.find(x=>x.id==U.sel);if(!s)return '';
  const opts=D.techs.filter(t=>t.act&&(t.id==s.tid||avail(t.id,s.date,s.start,s.dur,s.id)));
  return `<div class=card id=det style="margin-top:10px"><h2>Folio #MSA-${s.id} · ${e(s.pat)} (${s.age}) · ${fm(s.start)}–${fm(s.start+s.dur)} <span class=badge style="background:${COL[s.st]}">${s.st}</span></h2>
  <div><b>Motivo:</b> ${e(s.dx)} · <b>Movilidad:</b> ${e(s.mob)}${s.compDesc ? ' · ' + e(s.compDesc) : (s.comp?' (Con acompañante)':'')}</div>
  ${s.alergias ? `<div><b>Alergias:</b> <span style="${s.alergias.startsWith('Sí') ? 'color:#dc2626;font-weight:700':''}">${e(s.alergias)}</span> · <b>Conciencia:</b> ${e(s.conciencia||'Lúcido / Orientado')}</div>` : ''}
  ${s.patologias ? `<div><b>Patologías:</b> ${e(Array.isArray(s.patologias)?s.patologias.join(', '):s.patologias)}</div>` : ''}
  <div><b>Ruta:</b> ${e(s.from)}${s.depto?' ('+e(s.depto)+')':''} → ${e(s.to)}</div>
  ${s.obs?`<div><b>Observaciones:</b> ${e(s.obs)}</div>`:''}
  ${s.taxDoc?`<div><b>Doc. Tributario:</b> ${e(s.taxDoc.label||s.taxDoc.type)}</div>`:''}
  <div><b>Contacto:</b> ${e(s.coord)} (${e(s.ph)})${s.coordType==='paciente'?' [Paciente directo]':' [Familiar/Tutor]'}${s.patPhone ? ` · <b>Tel. Paciente:</b> ${e(s.patPhone)}` : ''}</div>
  <div class=msg>Bloqueo operativo hasta ${fm(s.start+s.dur+BUF)} · Tarifa ${$c(s.fare)} · Abono ${$c(s.paid)} · Saldo ${$c(s.fare-s.paid)}</div>
  <div class=row style="margin-top:8px">
  <div><label>Reasignar a</label><select onchange="reasg(${s.id},this.value)">${opts.map(t=>`<option value="${t.id}" ${t.id==s.tid?'selected':''}>${e(t.nom)}</option>`).join('')}</select></div>
  <div><label>Estado</label><select onchange="setSt(${s.id},this.value)">${ST.map(x=>`<option ${x==s.st?'selected':''}>${x}</option>`).join('')}</select></div>
  <div><label>Tarifa ($)</label><input type=number min=0 value="${s.fare}" style="width:110px" onchange="setPay(${s.id},'fare',this.value)"></div>
  <div><label>Abono ($)</label><input type=number min=0 value="${s.paid}" style="width:110px" onchange="setPay(${s.id},'paid',this.value)"></div>
  <button onclick="U.sel=null;render()">Cerrar</button></div></div>`;
}

function reasg(id,tid){const s=D.svcs.find(x=>x.id==id);if(!avail(tid,s.date,s.start,s.dur,id)){alert('Ese TENS no está disponible por la regla de buffer de 3h.');return}s.tid=tid;save();render()}
function setSt(id,v){D.svcs.find(x=>x.id==id).st=v;save();render()}
function setPay(id,k,v){const s=D.svcs.find(x=>x.id==id);if(s){s[k]=+v||0;save();render()}}

// =========================================================================
// COTIZADOR AUTOMÁTICO ADMINISTRATIVO (NUEVA RESERVA)
// =========================================================================
let qState = {
  mode: '1',
  date: TODAY,
  time: '10:00',
  durationMin: 120, // 2 horas base
  kmOneWay: 12.0,
  kmTotal: 24.0,
  ring: RINGS_DATA[0],
  comuna: 'Maipú',
  kmCost: 24000,
  timeCost: 24000,
  floorApplied: false,
  totalFare: 48000,
  abono50: 24000,
  saldo50: 24000
};

function form(){
  return `
    <form class="card" id="adminQuoteForm" onsubmit="saveAdminBooking(event)">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--bd);padding-bottom:10px;margin-bottom:14px">
        <div>
          <h2 style="margin:0;color:var(--pri)">➕ Nueva Reserva y Cotizador Maestro</h2>
          <div style="font-size:13px;color:var(--mut);margin-top:2px">Cálculo tarifario instantáneo con tarifas oficiales, pisos comunales y privilegios de Administrador.</div>
        </div>
      </div>

      <!-- SECCIÓN 1: MODALIDAD Y TIEMPOS -->
      <div class="g" style="margin-bottom:14px">
        <div>
          <label for="aq_mode"><b>Modalidad de Servicio *</b></label>
          <select id="aq_mode" onchange="calcAdminQuote()" style="font-weight:700">
            <option value="1" selected>1. Servicio Integral (Asistencia TENS + Traslado)</option>
            <option value="2">2. Traslado Exclusivo con Espera</option>
            <option value="3">3. Cuidados a Domicilio (Sin Traslado)</option>
            <option value="4">4. Acompañamiento en Eventos Sociales</option>
            <option value="5">5. Programas Interregionales</option>
          </select>
        </div>

        <div>
          <label for="aq_date"><b>Fecha del Servicio *</b></label>
          <input type="date" id="aq_date" value="${U.date}" onchange="calcAdminQuote()" required>
        </div>

        <div>
          <label for="aq_time"><b>Hora de Recogida / Inicio *</b></label>
          <input type="time" id="aq_time" value="10:00" onchange="calcAdminQuote()" required>
        </div>

        <div id="row_stay_time">
          <label for="aq_stay_hours"><b>Tiempo de Asistencia / Espera *</b></label>
          <select id="aq_stay_hours" onchange="calcAdminQuote()">
            <option value="60">1 hora de asistencia</option>
            <option value="90">1 hora 30 min</option>
            <option value="120" selected>2 horas de asistencia</option>
            <option value="150">2 horas 30 min</option>
            <option value="180">3 horas de asistencia</option>
            <option value="210">3 horas 30 min</option>
            <option value="240">4 horas de asistencia</option>
            <option value="300">5 horas de asistencia</option>
            <option value="360">6 horas de asistencia (Tope)</option>
          </select>
        </div>
      </div>

      <!-- SECCIÓN 2: DIRECCIONES Y KILOMETRAJE -->
      <div class="g" style="margin-bottom:14px" id="row_addresses">
        <div style="position:relative">
          <label for="aq_from"><b>Dirección Origen (A) *</b></label>
          <input type="text" id="aq_from" placeholder="Ej: Av. Pajaritos 1450, Maipú" value="Av. Los Pajaritos 1450, Maipú" oninput="onAdminAddressInput('from')" required>
          <div id="suggest_from" class="suggest-list"></div>
          <small id="aq_ring_badge" style="font-size:11px;color:var(--pri);font-weight:700;display:block;margin-top:2px">Anillo 1 detectado (Piso legal: $18.000)</small>
        </div>

        <div style="position:relative" id="col_destino">
          <label for="aq_to"><b>Dirección Destino (B) *</b></label>
          <input type="text" id="aq_to" placeholder="Ej: Clínica Santa María, Providencia" value="Clínica Santa María, Providencia" oninput="onAdminAddressInput('to')">
          <div id="suggest_to" class="suggest-list"></div>
          <div style="margin-top:4px">
            <label style="font-size:11px;color:var(--mut)">O elija un destino frecuente:</label>
            <select id="aq_quick_dest" onchange="onQuickDestSelect(this.value)" style="font-size:12px;padding:4px 8px">
              <option value="">-- Centros Médicos Frecuentes --</option>
              ${MEDICAL_PLACES.map((m, idx) => `<option value="${idx}">${m.name} (${m.km} km)</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="col_km">
          <label for="aq_km"><b>Kilometraje Total Ida y Vuelta (km) *</b></label>
          <div class="row" style="flex-wrap:nowrap">
            <input type="number" id="aq_km" min="1" step="0.5" value="24" oninput="calcAdminQuote()" style="font-weight:700">
            <button type="button" onclick="autoCalcAdminKm()" title="Estimar km automáticos">📍 Recalcular</button>
          </div>
          <small style="font-size:11px;color:var(--mut)">$1.000 por km en circuito de ida y vuelta.</small>
        </div>
      </div>

      <!-- CAJA DE LIQUIDACIÓN Y COTIZACIÓN AUTOMÁTICA -->
      <div class="quote-box">
        <div style="font-weight:800;color:var(--pri);font-size:0.92rem;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
          <span>📊 DESGLOSE ECONÓMICO AUTOMATIZADO</span>
          <span style="font-size:0.75rem;background:#15803d;color:#fff;padding:2px 8px;border-radius:99px">✅ Tarifas Oficiales Activas</span>
        </div>

        <div class="quote-grid">
          <div>
            <span style="font-size:12px;color:var(--mut)">Kilometraje (<span id="q_lbl_km">24 km</span>):</span>
            <div class="quote-num" id="q_km_cost">$24.000</div>
          </div>
          <div>
            <span style="font-size:12px;color:var(--mut)">Tiempo / Asistencia (<span id="q_lbl_time">2 hrs</span>):</span>
            <div class="quote-num" id="q_time_cost">$24.000</div>
          </div>
          <div>
            <span style="font-size:12px;color:var(--mut)">TOTAL COTIZADO:</span>
            <div class="quote-num" id="q_total" style="font-size:1.45rem;color:#15803d">$48.000</div>
          </div>
          <div>
            <span style="font-size:12px;color:var(--mut)">Abono 50% Requerido:</span>
            <div class="quote-num" id="q_abono" style="color:var(--pri)">$24.000</div>
          </div>
          <div>
            <span style="font-size:12px;color:var(--mut)">Saldo en Terreno:</span>
            <div class="quote-num" id="q_saldo" style="color:#b45309">$24.000</div>
          </div>
        </div>

        <div id="q_floor_alert" style="margin-top:10px;font-size:12px;color:var(--pri);display:none">
          ℹ️ Se aplicó la <b>tarifa mínima legal comunal</b> para el sector.
        </div>
      </div>

      <!-- SECCIÓN 3: ANTECEDENTES DEL PACIENTE Y TENS ASIGNADO -->
      <div class="g" style="margin-top:14px">
        <div>
          <label for="aq_pat">Nombre Completo del Paciente *</label>
          <input type="text" id="aq_pat" placeholder="Ej: Rosa Medina" required>
        </div>
        <div>
          <label for="aq_age">Edad</label>
          <input type="number" id="aq_age" min="0" max="120" value="78">
        </div>
        <div>
          <label for="aq_dx">Diagnóstico / Motivo de Atención *</label>
          <input type="text" id="aq_dx" placeholder="Ej: Control cardiológico" required>
        </div>
        <div>
          <label for="aq_coord">Nombre del Coordinador/Contacto *</label>
          <input type="text" id="aq_coord" placeholder="Ej: Andrea Medina" required>
        </div>
        <div>
          <label for="aq_ph">Teléfono WhatsApp Contacto *</label>
          <input type="tel" id="aq_ph" placeholder="+56 9 8765 4321" value="+56 9 " required>
        </div>
        <div>
          <label for="aq_mob">Condición de Movilidad</label>
          <select id="aq_mob">
            ${MOB.map(m=>`<option>${m}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="aq_tens">TENS Asignado *</label>
          <select id="aq_tens" required></select>
        </div>
        <div>
          <label for="aq_alergias">Alergias Conocidas</label>
          <input type="text" id="aq_alergias" placeholder="No registra o detallar">
        </div>
      </div>

      <div class="rqs" style="margin-top:12px">
        <label><b>Tareas y Protocolos Asistenciales:</b></label>
        ${REQ.map(r=>`<label><input type="checkbox" class="aq_rq" value="${r}" ${r==='Control de signos vitales'||r==='Acompañamiento en box médico'?'checked':''}>${r}</label>`).join('')}
      </div>

      <div id="admin_buffer_info" class="msg" style="margin-top:12px"></div>

      <!-- BOTONES DE ACCIÓN ADMINISTRATIVA -->
      <div class="row" style="justify-content:flex-end;gap:12px;margin-top:18px;border-top:1px solid var(--bd);padding-top:14px">
        <button type="button" class="btn" onclick="sendAdminQuoteWhatsApp()" style="background:#25d366;border-color:#25d366;color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:6px">
          💬 Enviar Cotización por WhatsApp
        </button>
        <button type="submit" class="p" style="padding:10px 20px;font-size:15px;display:inline-flex;align-items:center;gap:6px">
          💾 Guardar en Agenda
        </button>
      </div>
    </form>
  `;
}

function initAdminQuoter(){
  calcAdminQuote();
  populateAdminTechs();
}

function onQuickDestSelect(idx){
  if(idx === '' || !MEDICAL_PLACES[idx]) return;
  const p = MEDICAL_PLACES[idx];
  $('#aq_to').value = p.name + ' (' + p.addr + ')';
  $('#aq_km').value = (p.km * 2).toFixed(1);
  calcAdminQuote();
}

function onAdminAddressInput(type){
  const text = (type === 'from' ? $('#aq_from').value : $('#aq_to').value) || '';
  if(type === 'from'){
    const det = detectRing(text);
    qState.ring = det.ring;
    qState.comuna = det.comuna;
    const badge = $('#aq_ring_badge');
    if(badge){
      badge.textContent = `${det.ring.name} detectado (Piso legal: ${$c(det.ring.minFare)})`;
    }
    calcAdminQuote();
  }
}

function autoCalcAdminKm(){
  const destIdx = $('#aq_quick_dest') ? $('#aq_quick_dest').value : '';
  if(destIdx !== '' && MEDICAL_PLACES[destIdx]){
    $('#aq_km').value = (MEDICAL_PLACES[destIdx].km * 2).toFixed(1);
  } else {
    // Estimación predeterminada razonable de circuito RM si no hay centro seleccionado
    $('#aq_km').value = '25.0';
  }
  calcAdminQuote();
}

function calcAdminQuote(){
  const mode = ($('#aq_mode') && $('#aq_mode').value) || '1';
  qState.mode = mode;

  // Visibilidad según modalidad
  const rowStay = $('#row_stay_time');
  const colDest = $('#col_destino');
  const colKm = $('#col_km');
  const badge = $('#aq_ring_badge');

  if(mode === '3'){ // Domicilio
    if(colDest) colDest.style.display = 'none';
    if(colKm) colKm.style.display = 'none';
    if(badge) badge.style.display = 'block';
  } else {
    if(colDest) colDest.style.display = 'block';
    if(colKm) colKm.style.display = 'block';
    if(badge) badge.style.display = (mode === '1' || mode === '2') ? 'block' : 'none';
  }

  const stayMin = +($('#aq_stay_hours') && $('#aq_stay_hours').value) || 120;
  qState.durationMin = stayMin;
  const kmTot = +($('#aq_km') && $('#aq_km').value) || 24;
  qState.kmTotal = kmTot;

  let kmCost = 0;
  let timeCost = 0;
  let totalFare = 0;
  let floorApplied = false;

  if(mode === '1'){
    kmCost = Math.round((kmTot * PRICE_PER_KM) / 100) * 100;
    timeCost = Math.round((stayMin / 60) * 12000);
    const sum = kmCost + timeCost;
    if(qState.ring && qState.ring.minFare && sum < qState.ring.minFare){
      totalFare = qState.ring.minFare;
      floorApplied = true;
    } else {
      totalFare = sum;
    }
  } else if(mode === '2'){
    kmCost = Math.round((kmTot * PRICE_PER_KM) / 100) * 100;
    timeCost = Math.round((stayMin / 60) * 8000);
    const sum = kmCost + timeCost;
    if(qState.ring && qState.ring.minFare && sum < qState.ring.minFare){
      totalFare = qState.ring.minFare;
      floorApplied = true;
    } else {
      totalFare = sum;
    }
  } else if(mode === '3'){
    kmCost = 0;
    timeCost = Math.round((stayMin / 60) * 12000);
    totalFare = timeCost;
  } else if(mode === '4'){
    kmCost = 0;
    timeCost = stayMin >= 300 ? 125000 : 95000;
    totalFare = timeCost;
  } else if(mode === '5'){
    kmCost = 0;
    timeCost = stayMin >= 300 ? 300000 : 250000;
    totalFare = timeCost;
  }

  qState.kmCost = kmCost;
  qState.timeCost = timeCost;
  qState.totalFare = totalFare;
  qState.abono50 = Math.round((totalFare * 0.5) / 50) * 50;
  qState.saldo50 = totalFare - qState.abono50;
  qState.floorApplied = floorApplied;

  // Actualizar textos en pantalla
  if($('#q_lbl_km')) $('#q_lbl_km').textContent = `${kmTot} km`;
  if($('#q_km_cost')) $('#q_km_cost').textContent = (mode === '4' || mode === '5') ? 'Incluido' : (mode === '3' ? '$0' : $c(kmCost));
  if($('#q_lbl_time')) $('#q_lbl_time').textContent = `${(stayMin/60).toFixed(1)} hrs`;
  if($('#q_time_cost')) $('#q_time_cost').textContent = $c(timeCost);
  if($('#q_total')) $('#q_total').textContent = $c(totalFare);
  if($('#q_abono')) $('#q_abono').textContent = $c(qState.abono50);
  if($('#q_saldo')) $('#q_saldo').textContent = $c(qState.saldo50);
  if($('#q_floor_alert')) $('#q_floor_alert').style.display = floorApplied ? 'block' : 'none';

  populateAdminTechs();
}

function populateAdminTechs(){
  const dateVal = ($('#aq_date') && $('#aq_date').value) || U.date;
  const timeVal = ($('#aq_time') && $('#aq_time').value) || '10:00';
  const durVal = qState.durationMin || 120;
  const startMin = tm(timeVal);

  const select = $('#aq_tens');
  if(!select) return;

  const activeTechs = D.techs.filter(t => t.act);
  const okTechs = activeTechs.filter(t => avail(t.id, dateVal, startMin, durVal));

  select.innerHTML = activeTechs.map(t => {
    const isAvail = okTechs.some(x => x.id === t.id);
    return `<option value="${t.id}" ${!isAvail ? 'style="color:#dc2626"' : ''}>${e(t.nom)} ${!isAvail ? '(⚠️ Conflicto buffer 3h)' : '✅ Disponible'}</option>`;
  }).join('');

  const bufInfo = $('#admin_buffer_info');
  if(bufInfo){
    bufInfo.innerHTML = `ℹ️ Término proyectado: <b>${fm(startMin + durVal)} hrs</b> · Buffer de seguridad liberado a las <b>${fm(startMin + durVal + BUF)} hrs</b> (${okTechs.length} TENS sin conflicto).`;
  }
}

function sendAdminQuoteWhatsApp(){
  calcAdminQuote();
  const phone = (($('#aq_ph') && $('#aq_ph').value) || '').replace(/\D/g, '');
  const cleanPhone = phone.startsWith('56') ? phone : ('56' + (phone || '929990095'));

  const modeNames = {
    '1': '1. Servicio Integral (Asistencia + Traslado)',
    '2': '2. Traslado Exclusivo con Espera',
    '3': '3. Cuidados a Domicilio (Sin Traslado)',
    '4': '4. Acompañamiento en Eventos Sociales',
    '5': '5. Programas Interregionales'
  };

  const pat = ($('#aq_pat') && $('#aq_pat').value.trim()) || 'Paciente';
  const coord = ($('#aq_coord') && $('#aq_coord').value.trim()) || 'Estimado(a)';
  const date = ($('#aq_date') && $('#aq_date').value) || U.date;
  const time = ($('#aq_time') && $('#aq_time').value) || '10:00';
  const from = ($('#aq_from') && $('#aq_from').value.trim()) || 'Origen';
  const to = ($('#aq_to') && $('#aq_to').value.trim()) || 'Destino';
  const durMin = qState.durationMin || 120;

  let breakdown = '';
  if(qState.mode === '1' || qState.mode === '2'){
    breakdown += `• *Kilometraje (${qState.kmTotal} km ida/vuelta):* ${$c(qState.kmCost)}\n`;
    breakdown += `• *Tiempo de asistencia/espera (${(durMin/60).toFixed(1)} hrs):* ${$c(qState.timeCost)}\n`;
    if(qState.floorApplied){
      breakdown += `• *Tarifa base comunal aplicada:* ${$c(qState.ring.minFare)}\n`;
    }
  } else if(qState.mode === '3'){
    breakdown += `• *Horas de cuidado continuo (${(durMin/60).toFixed(1)} hrs):* ${$c(qState.totalFare)}\n`;
  } else {
    breakdown += `• *Plan base contratado:* ${modeNames[qState.mode]} (${$c(qState.totalFare)})\n`;
  }

  const msg = `Hola ${coord}! Le escribimos de Movilidad y Salud Asistida SpA. Le compartimos el detalle oficial de su cotización requerida:

📋 *DETALLE DEL SERVICIO SOLICITADO:*
• *Paciente:* ${pat}
• *Servicio:* ${modeNames[qState.mode]}
• *Fecha y Hora:* ${date} - ${time} hrs
• *Trayecto:* ${from} ➔ ${to}
• *Permanencia estimada:* ${(durMin/60).toFixed(1)} hrs

💰 *DESGLOSE ECONÓMICO:*
${breakdown}• *TOTAL COTIZADO:* ${$c(qState.totalFare)}
• *Abono 50% para reserva:* ${$c(qState.abono50)}
• *Saldo restante al finalizar el servicio:* ${$c(qState.saldo50)}

🏥 *INCLUYE:* Personal TENS calificado, Ficha de Signos Vitales de cortesía al inicio, vehículo climatizado y habilitado para ayudas técnicas.

Quedamos atentos para reservar su cupo exclusivo!`;

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

let pendingAdminBooking = null;

function saveAdminBooking(ev, forceConfirm = false){
  if(ev && ev.preventDefault) ev.preventDefault();
  calcAdminQuote();

  const tid = ($('#aq_tens') && $('#aq_tens').value) || (D.techs[0] && D.techs[0].id) || 't1';
  const date = ($('#aq_date') && $('#aq_date').value) || U.date;
  const time = ($('#aq_time') && $('#aq_time').value) || '10:00';
  const start = tm(time);
  const dur = qState.durationMin || 120;

  const pat = ($('#aq_pat') && $('#aq_pat').value.trim()) || 'Paciente';
  const age = (+$('#aq_age') && +$('#aq_age').value) || 75;
  const dx = ($('#aq_dx') && $('#aq_dx').value.trim()) || 'Atención clínica';
  const coord = ($('#aq_coord') && $('#aq_coord').value.trim()) || 'Coordinador';
  const ph = ($('#aq_ph') && $('#aq_ph').value.trim()) || '+56900000000';
  const from = ($('#aq_from') && $('#aq_from').value.trim()) || 'Domicilio Origen';
  const to = (qState.mode === '3') ? from : (($('#aq_to') && $('#aq_to').value.trim()) || 'Centro Médico');
  const mob = ($('#aq_mob') && $('#aq_mob').value) || 'Autovalente';
  const req = typeof document !== 'undefined' && document.querySelectorAll
    ? [...document.querySelectorAll('.aq_rq:checked')].map(x => x.value)
    : [];
  const alergias = ($('#aq_alergias') && $('#aq_alergias').value.trim()) || 'No registra alergias';

  const bookingData = { tid, date, time, start, dur, pat, age, dx, coord, ph, from, to, mob, req, alergias };

  // Verificación de advertencia preventiva de buffer de 2 horas (120 minutos)
  if(!forceConfirm){
    const conflictSvc = D.svcs.find(s => {
      if(s.tid !== tid || s.date !== date || s.st === 'Cancelado') return false;
      return (start < s.start + s.dur + 120) && (s.start < start + dur + 120);
    });

    if(conflictSvc){
      pendingAdminBooking = bookingData;
      abrirModalWarningBufferAdmin(conflictSvc, bookingData);
      return { conflict: true, conflictSvc, bookingData };
    }
  }

  const newId = D.nid++;
  const newSvc = {
    id: newId,
    tid,
    date,
    start,
    dur,
    pat,
    age,
    dx,
    coord,
    ph,
    from,
    to,
    mob,
    req,
    comp: true,
    fare: qState.totalFare,
    paid: qState.abono50,
    st: 'Confirmado',
    svcType: qState.mode,
    alergias,
    conciencia: 'Lúcido / Orientado',
    createdAt: new Date().toISOString()
  };

  D.svcs.push(newSvc);
  save();

  cerrarModalWarningBufferAdmin();
  if(typeof alert !== 'undefined') alert(`✅ ¡Reserva Folio #MSA-${newId} creada y guardada exitosamente en la agenda!`);
  U.date = date;
  U.tab = 'cal';
  U.sel = newId;
  render();
  return { success: true, service: newSvc };
}
window.saveAdminBooking = saveAdminBooking;

function abrirModalWarningBufferAdmin(conflictSvc, bookingData){
  const modal = $('#modalWarningBufferAdmin');
  const details = $('#modalWarningBufferDetails');
  if(details){
    details.innerHTML = `
      <div><b>Servicio preexistente:</b> Folio #MSA-${conflictSvc.id} (${fm(conflictSvc.start)} a ${fm((conflictSvc.start+conflictSvc.dur)%1440)} hrs) — <i>${e(conflictSvc.pat)}</i></div>
      <div style="margin-top:4px"><b>Nueva reserva proyectada:</b> ${bookingData.time} a ${fm((bookingData.start+bookingData.dur)%1440)} hrs — <i>${e(bookingData.pat)}</i></div>
      <div style="margin-top:4px;color:#b45309"><b>TENS asignado:</b> ${tn(bookingData.tid)} · Fecha: ${bookingData.date}</div>
    `;
  }
  if(modal) modal.style.display = 'flex';
}
window.abrirModalWarningBufferAdmin = abrirModalWarningBufferAdmin;

function cerrarModalWarningBufferAdmin(){
  const modal = $('#modalWarningBufferAdmin');
  if(modal) modal.style.display = 'none';
  pendingAdminBooking = null;
}
window.cerrarModalWarningBufferAdmin = cerrarModalWarningBufferAdmin;

function confirmarGuardarConConflictoAdmin(){
  if(!pendingAdminBooking) return;
  const b = pendingAdminBooking;
  return saveAdminBooking(null, true);
}
window.confirmarGuardarConConflictoAdmin = confirmarGuardarConConflictoAdmin;

function abrirMenuContextualServicio(svcId){
  U.sel = svcId;
  const s = D.svcs.find(x => x.id === svcId);
  if(!s) return;

  const modal = $('#modalContextualServicioAdmin');
  const phoneRaw = s.ph || '';
  const digits = phoneRaw.replace(/\D/g, '');
  const cleanPhone = digits.startsWith('56') ? digits : ('56' + (digits || '929990095'));
  const clientName = s.coord || s.pat || 'Estimado(a)';
  const waMsg = `Hola ${clientName}! Le contactamos de Movilidad y Salud Asistida SpA respecto a su servicio Folio #MSA-${s.id} programado para el ${s.date} a las ${fm(s.start)} hrs.`;
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

  const wazeDestUrl = `https://waze.com/ul?q=${encodeURIComponent(s.to)}`;
  const mapsDestUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.to)}`;

  const ctxTitle = $('#ctxTitle');
  if(ctxTitle){
    ctxTitle.innerHTML = `<span>Folio #MSA-${s.id}</span> · <span class="badge" style="background:${COL[s.st]}">${s.st}</span>`;
  }

  const ctxContent = $('#ctxContent');
  if(ctxContent){
    ctxContent.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;margin-bottom:12px">
        <div style="font-weight:800;color:var(--pri);font-size:1.05rem;margin-bottom:4px">
          ${e(s.pat)} (${s.age} años)
        </div>
        <div><b>Diagnóstico / Motivo:</b> ${e(s.dx)}</div>
        <div><b>Movilidad:</b> ${e(s.mob)} ${s.compDesc ? '· ' + e(s.compDesc) : (s.comp ? '(Con acompañante)' : '')}</div>
        <div><b>Requerimientos Clínicos:</b> ${Array.isArray(s.req) && s.req.length ? s.req.join(' · ') : 'Signos vitales y asistencia TENS'}</div>
        <div><b>Alergias:</b> <span style="${s.alergias && s.alergias.startsWith('Sí') ? 'color:#dc2626;font-weight:700' : ''}">${e(s.alergias || 'No registra')}</span> · <b>Conciencia:</b> ${e(s.conciencia || 'Lúcido / Orientado')}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;font-size:.84rem;margin-bottom:12px">
        <div><b>Horario:</b> ${fm(s.start)} a ${fm((s.start+s.dur)%1440)} hrs</div>
        <div><b>TENS Asignado:</b> ${e(tn(s.tid))}</div>
        <div><b>Origen:</b> ${e(s.from)}</div>
        <div><b>Destino:</b> ${e(s.to)}</div>
        <div><b>Contratante:</b> ${e(s.coord)} (${e(s.ph)})</div>
        <div><b>Tarifa / Saldo:</b> ${$c(s.fare)} (Saldo: ${$c(s.fare - (s.paid||0))})</div>
      </div>
    `;
  }

  const ctxActions = $('#ctxActions');
  if(ctxActions){
    ctxActions.innerHTML = `
      <a href="${waUrl}" target="_blank" rel="noopener" style="background:#25D366;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:.84rem;display:inline-flex;align-items:center;gap:6px">
        💬 WhatsApp Contratante
      </a>
      <a href="${wazeDestUrl}" target="_blank" rel="noopener" style="background:#0284c7;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:.84rem;display:inline-flex;align-items:center;gap:6px">
        🚙 Waze Destino
      </a>
      <a href="${mapsDestUrl}" target="_blank" rel="noopener" style="background:#475569;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:.84rem;display:inline-flex;align-items:center;gap:6px">
        🗺️ Google Maps
      </a>
      <button type="button" class="p" onclick="cerrarModalContextualServicioAdmin(); abrirModalFinalizarAtencionAdmin(${s.id})" style="background:#0f766e;border-color:#0f766e;padding:8px 14px;font-weight:700;font-size:.84rem;display:inline-flex;align-items:center;gap:6px">
        🏁 Liquidar / Finalizar Atención
      </button>
      <button type="button" onclick="cerrarModalContextualServicioAdmin()" style="padding:8px 14px;font-size:.84rem">
        Cerrar
      </button>
    `;
  }

  if(modal) modal.style.display = 'flex';
  render();
}
window.abrirMenuContextualServicio = abrirMenuContextualServicio;

function cerrarModalContextualServicioAdmin(){
  const modal = $('#modalContextualServicioAdmin');
  if(modal) modal.style.display = 'none';
}
window.cerrarModalContextualServicioAdmin = cerrarModalContextualServicioAdmin;

function staff(){
  const t=D.techs.find(x=>x.id==U.edit)||{nom:'',rut:'',tel:'',veh:'',col:'#2563eb'},v=(k)=>e(t[k]);
  return `<div class=card><h2>${U.edit?'Editar TENS':'Agregar TENS'}</h2><form class=g onsubmit="saveT(event)">
  <div><label>Nombre</label><input id=s_nom value="${v('nom')}" required></div><div><label>RUT</label><input id=s_rut value="${v('rut')}" required></div>
  <div><label>Teléfono</label><input id=s_tel value="${v('tel')}" placeholder="+569..." required></div><div><label>Vehículo asociado</label><input id=s_veh value="${v('veh')}"></div>
  <div><label>Color distintivo</label><input id=s_col type=color value="${t.col}"></div>
  <div style="align-self:end"><button class=p type=submit>Guardar</button> ${U.edit?'<button type=button onclick="U.edit=null;render()">Cancelar</button>':''}</div></form></div>
  <div class=card style="overflow-x:auto"><table><tr><th>TENS</th><th>RUT</th><th>Teléfono</th><th>Vehículo</th><th>Estado</th><th></th></tr>
  ${D.techs.map(t=>`<tr><td><span class=dot style="background:${t.col}"></span>${e(t.nom)}</td><td>${e(t.rut)}</td><td>${e(t.tel)}</td><td>${e(t.veh)}</td><td>${t.act?'Activo':'Inactivo'}</td>
  <td><button onclick="U.edit='${t.id}';render()">Editar</button> <button onclick="togT('${t.id}')">${t.act?'Desactivar':'Activar'}</button></td></tr>`).join('')}</table></div>`;
}

function saveT(ev){ev.preventDefault();const g=i=>$('#'+i).value,o={nom:g('s_nom'),rut:g('s_rut'),tel:g('s_tel'),veh:g('s_veh'),col:g('s_col')};
if(U.edit)Object.assign(D.techs.find(x=>x.id==U.edit),o);else D.techs.push({id:'t'+Date.now(),act:true,...o});U.edit=null;save();render()}
function togT(id){const t=D.techs.find(x=>x.id==id);t.act=!t.act;save();render()}

// =========================================================================
// VISTA TERRENO (TENS Y ADMINISTRACIÓN)
// =========================================================================
function tens(){
  const sess = getSession();
  const isAdmin = sess && sess.role === 'admin';
  const act=D.techs.filter(t=>t.act);
  if(!act.some(t=>t.id==U.tens))U.tens=(act[0]||{}).id;
  const ss=D.svcs.filter(s=>s.tid==U.tens&&s.date==U.date&&s.st!='Cancelado').sort((a,b)=>a.start-b.start);
  return `<div class=card>
    ${isAdmin ? `
      <label>Supervisar Conducción / TENS específico:</label>
      <select onchange="U.tens=this.value;render()">${act.map(t=>`<option value="${t.id}" ${t.id==U.tens?'selected':''}>${e(t.nom)}</option>`).join('')}</select>
    ` : `
      <div style="font-weight:700;color:var(--pri)">🩺 Servicios de Hoy Asignados a: ${e(sess.name)}</div>
    `}
  </div>${dateNav()}
  ${ss.map(card).join('')||'<div class=card style="text-align:center;padding:26px;color:var(--mut)">✅ Sin servicios asignados para este día.</div>'}`;
}

function card(s){
  const n=NEXT[s.st];
  const wa=s.ph.replace(/\D/g,'');
  const q=encodeURIComponent(s.to);
  const qo=encodeURIComponent(s.from);
  const saldoFinal = (s.fare || 0) - (s.paid || 0);

  return `
    <div class="card" style="border-left:5px solid ${COL[s.st]};margin-bottom:14px">
      <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--bd);padding-bottom:6px">
        <b>⏰ ${fm(s.start)} – ${fm(s.start+s.dur)} hrs</b>
        <span class="badge" style="background:${COL[s.st]}">${s.st}</span>
      </div>

      <h2 style="margin:8px 0 2px;color:var(--pri)">${e(s.pat)} (${s.age} años)</h2>
      <div style="font-weight:600">${e(s.dx)}</div>

      ${s.alergias ? `<div style="font-size:12px;margin:3px 0"><b>Alergias:</b> <span style="${s.alergias.startsWith('Sí')?'color:#dc2626;font-weight:700':''}">${e(s.alergias)}</span> · <b>Conciencia:</b> ${e(s.conciencia||'Lúcido')}</div>` : ''}
      <div class="al">⚠ ${e(s.mob)}${s.compDesc ? ' · ' + e(s.compDesc) : (s.comp?' · Viaja con acompañante':'')}${s.req && s.req.length ? '<br>' + s.req.map(e).join(' · ') : ''}</div>

      <div style="margin:6px 0;line-height:1.4">
        <div><b>Contacto:</b> ${e(s.coord)} (${e(s.ph)})</div>
        <div style="margin-top:4px">
          <a class="b" href="tel:${e(s.ph)}">📞 Llamar</a>
          <a class="b" href="https://wa.me/${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>
        </div>
      </div>

      <div style="margin:8px 0;line-height:1.4">
        <div><b>📍 Origen:</b> ${e(s.from)}${s.depto?' ('+e(s.depto)+')':''}</div>
        <div><b>🏥 Destino:</b> ${e(s.to)}</div>
        <div style="margin-top:4px">
          <a class="b" href="https://waze.com/ul?q=${qo}&navigate=yes" target="_blank" rel="noopener">🚗 Waze Origen</a>
          <a class="b" href="https://www.google.com/maps/dir/?api=1&origin=${qo}&destination=${q}" target="_blank" rel="noopener">🗺️ Google Maps Ruta</a>
        </div>
      </div>

      <div style="background:var(--bg);border-radius:8px;padding:8px 12px;margin:8px 0;font-size:13.5px;display:flex;justify-content:space-between">
        <span>Tarifa Total: <b>${$c(s.fare)}</b> (Abonado: ${$c(s.paid)})</span>
        <span style="color:#b45309;font-weight:800">Saldo Pendiente: ${$c(saldoFinal)}</span>
      </div>

      <!-- BOTÓN DESTACADO DE CIERRE EN TERRENO Y BOLETA PDF -->
      <div style="margin-top:10px">
        <button type="button" class="p" onclick="abrirModalFinalizarAtencionAdmin(${s.id})" style="background:#0f766e;border-color:#0f766e;width:100%;padding:10px 14px;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px">
          🏁 Finalizar Atención y Emitir Boleta PDF
        </button>
      </div>

      ${n ? `<button class="p" style="width:100%;margin-top:8px;padding:9px;background:var(--card);color:var(--fg);border-color:var(--bd)" onclick="setSt(${s.id},'${n[0]}')">Avanzar a: [${n[1]}]</button>` : ''}
    </div>
  `;
}

// =========================================================================
// FUNCIONES DE CIERRE EN TERRENO Y EMISIÓN DE BOLETA PDF
// =========================================================================
let currentClosingSvcId = null;

function abrirModalFinalizarAtencionAdmin(svcId, options){
  currentClosingSvcId = svcId;
  const modal = $('#modalFinalizarAtencionAdmin');
  if(!modal) return;

  const s = D.svcs.find(item => item.id === svcId);
  if(!s) return;

  const startMin = s.start || 540;
  const durMin = s.dur || 120;
  const endPactadoMin = (startMin + durMin) % 1440;
  const endPactadoStr = fm(endPactadoMin);

  const inpCierre = $('#adm_horaCierreReal');
  if(inpCierre) inpCierre.value = (options && options.horaCierre) || endPactadoStr;

  const inpRut = $('#adm_rutPaciente');
  if(inpRut) inpRut.value = (options && options.rutPaciente) || s.patRut || '12.345.678-9';

  const selMedio = $('#adm_medioPago');
  if(selMedio && options && options.medioPago) selMedio.value = options.medioPago;

  const inpFolio = $('#adm_folioSII');
  if(inpFolio) inpFolio.value = (options && options.folioSII !== undefined) ? options.folioSII : (s.folioSII || '');

  modal.style.display = 'flex';

  if(options && options.autoConfirm){
    return ejecutarFinalizacionYDescargaPdfAdmin(options);
  }
}
window.abrirModalFinalizarAtencionAdmin = abrirModalFinalizarAtencionAdmin;

function cerrarModalFinalizarAtencionAdmin(){
  const modal = $('#modalFinalizarAtencionAdmin');
  if(modal) modal.style.display = 'none';
}
window.cerrarModalFinalizarAtencionAdmin = cerrarModalFinalizarAtencionAdmin;

function ejecutarFinalizacionYDescargaPdfAdmin(customOpts){
  const modal = $('#modalFinalizarAtencionAdmin');
  const horaCierre = (customOpts && customOpts.horaCierre) || ($('#adm_horaCierreReal') && $('#adm_horaCierreReal').value) || '12:00';
  const rutPaciente = (customOpts && customOpts.rutPaciente) || ($('#adm_rutPaciente') && $('#adm_rutPaciente').value.trim()) || '12.345.678-9';
  const medioPago = (customOpts && customOpts.medioPago) || ($('#adm_medioPago') && $('#adm_medioPago').value) || 'Transferencia Electrónica';
  const folioSII = (customOpts && customOpts.folioSII !== undefined) ? customOpts.folioSII : ($('#adm_folioSII') ? $('#adm_folioSII').value.trim() : '');

  const s = D.svcs.find(item => item.id === currentClosingSvcId);
  if(!s){ alert('Servicio no encontrado'); return; }

  const folio = s.id;
  const patName = s.pat || 'Paciente';
  const patAge = s.age || '75';
  const patDx = s.dx || 'Atención médica';
  const mode = s.svcType || '1';

  const startMin = s.start || 540;
  const durMin = s.dur || 120;
  const endPactadoMin = (startMin + durMin) % 1440;
  const endPactadoStr = fm(endPactadoMin);

  // Evaluar tiempo extra
  const cierreMin = tm(horaCierre);
  let diffMin = 0;
  if(cierreMin > endPactadoMin){
    diffMin = cierreMin - endPactadoMin;
  } else if(cierreMin < endPactadoMin && cierreMin < 6 * 60 && endPactadoMin > 18 * 60){
    diffMin = (cierreMin + 1440) - endPactadoMin;
  }

  let extraBlocks = 0;
  let extraCost = 0;
  if(diffMin > 0){
    extraBlocks = Math.ceil(diffMin / 30);
    let blockRate = 6000;
    if(mode === '2') blockRate = 4000;
    else if(mode === '3') blockRate = 7500;
    else if(mode === '4' || mode === '5') blockRate = 15000;
    extraCost = extraBlocks * blockRate;
  }

  const baseFare = s.fare || 48000;
  const totalConExtra = baseFare + extraCost;
  const abonoPrevio = (s.paid && s.paid > 0) ? s.paid : Math.round((baseFare * 0.5) / 50) * 50;
  const saldoFinal = totalConExtra - abonoPrevio;

  // Llenar datos de la boleta PDF
  if($('#pdfFolio')) $('#pdfFolio').textContent = `FOLIO: #MSA-${folio}`;
  if($('#pdfFechaEmision')) $('#pdfFechaEmision').textContent = `Fecha Emisión: ${TODAY}`;
  if($('#pdfPatNombre')) $('#pdfPatNombre').textContent = patName;
  if($('#pdfPatRut')) $('#pdfPatRut').textContent = rutPaciente;
  if($('#pdfPatEdadDx')) $('#pdfPatEdadDx').textContent = `${patAge} años · ${patDx}`;
  if($('#pdfSvcModalidad')) $('#pdfSvcModalidad').textContent = `Modalidad ${mode}`;
  if($('#pdfFechaServicio')) $('#pdfFechaServicio').textContent = s.date;
  if($('#pdfHorarioPactado')) $('#pdfHorarioPactado').textContent = `${fm(startMin)} hrs a ${endPactadoStr} hrs`;
  if($('#pdfDirOrigen')) $('#pdfDirOrigen').textContent = s.from;
  if($('#pdfDirDestino')) $('#pdfDirDestino').textContent = s.to;
  if($('#pdfHoraCierreReal')) $('#pdfHoraCierreReal').textContent = `${horaCierre} hrs`;
  if($('#pdfDesfaseExtraText')){
    $('#pdfDesfaseExtraText').textContent = diffMin > 0
      ? `⚠️ Excedente en terreno: +${diffMin} min (${extraBlocks * 30} min facturados)`
      : 'Atención finalizada en horario estándar';
    $('#pdfDesfaseExtraText').style.color = diffMin > 0 ? '#b91c1c' : '#0f766e';
  }

  // Tabla de items
  const itemsTbody = $('#pdfTablaItems');
  if(itemsTbody){
    let itemsHtml = `
      <tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1">1. Servicio y Asistencia Clínica Programada</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center">${(durMin/60).toFixed(1)} hrs</td>
        <td style="padding:8px 14px;border:1px solid #cbd5e1;text-align:right;white-space:nowrap;min-width:140px">${$c(baseFare)}</td>
      </tr>
    `;
    if(diffMin > 0){
      itemsHtml += `
        <tr style="background:#fef2f2;color:#991b1b">
          <td style="padding:8px 12px;border:1px solid #cbd5e1"><b>Tiempo Adicional Excedente en Terreno</b></td>
          <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;font-weight:700">+${diffMin} min (${extraBlocks} bloques)</td>
          <td style="padding:8px 14px;border:1px solid #cbd5e1;text-align:right;font-weight:700;white-space:nowrap;min-width:140px">${$c(extraCost)}</td>
        </tr>
      `;
    }
    itemsTbody.innerHTML = itemsHtml;
  }

  if($('#pdfSubtotal')) $('#pdfSubtotal').textContent = $c(totalConExtra);
  if($('#pdfAbono')) $('#pdfAbono').textContent = '-' + $c(abonoPrevio);
  if($('#pdfSaldoFinal')) $('#pdfSaldoFinal').textContent = $c(saldoFinal);
  if($('#pdfMedioPago')) $('#pdfMedioPago').textContent = medioPago;
  const folioContainer = $('#pdfFolioSIIContainer');
  if(folioContainer){
    if(folioSII){
      folioContainer.innerHTML = `<b>Boleta Electrónica SII N°:</b> <span id="pdfFolioSII">${folioSII}</span>`;
    } else {
      folioContainer.innerHTML = `<b>Documento Tributario:</b> <span id="pdfFolioSII">Boleta Electrónica Exenta emitida vía e-Boleta SII</span>`;
    }
  } else if($('#pdfFolioSII')) {
    $('#pdfFolioSII').textContent = folioSII || 'Boleta Electrónica Exenta emitida vía e-Boleta SII';
  }

  // Generación y descarga con html2pdf
  const pdfElement = document.getElementById('recibo-pdf');
  if(pdfElement){
    pdfElement.style.display = 'block';
    if(typeof html2pdf !== 'undefined'){
      html2pdf().set({
        margin: 10,
        filename: `Comprobante_Atencion_${folio}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(pdfElement).save().then(() => {
        pdfElement.style.display = 'none';
      }).catch(err => {
        console.error('Error generando PDF:', err);
        pdfElement.style.display = 'none';
      });
    } else {
      console.log(`[html2pdf] Comprobante_Atencion_${folio}.pdf generado.`);
      pdfElement.style.display = 'none';
    }
  }

  // Redirección a WhatsApp
  const clientName = s.coord || s.pat || 'Estimado(a)';
  const phRaw = s.ph || '';
  const digits = phRaw.replace(/\D/g, '');
  const cleanPhone = digits.startsWith('56') ? digits : ('56' + (digits || '929990095'));
  const waMsg = `Hola ${clientName}, adjunto el comprobante digital de atención y respaldo de pago del servicio finalizado.`;
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

  try { window.open(waUrl, '_blank'); } catch(e){}

  // Actualizar estado en D.svcs
  s.st = 'Finalizado';
  s.fare = totalConExtra;
  s.paid = totalConExtra;
  s.patRut = rutPaciente;
  s.medioPago = medioPago;
  s.folioSII = folioSII;
  save();

  if(modal) modal.style.display = 'none';
  render();
  return { folio, totalConExtra, abonoPrevio, saldoFinal, waUrl };
}
window.ejecutarFinalizacionYDescargaPdfAdmin = ejecutarFinalizacionYDescargaPdfAdmin;

render();