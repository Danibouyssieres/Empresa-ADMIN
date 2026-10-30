const PX=44,S0=360,S1=1320,BUF=180,K='msa-v1',TM_K='msa-theme',SESS_K='msa-session';
const pad=n=>String(n).padStart(2,'0'),fm=m=>pad(Math.floor(m/60))+':'+pad(m%60),tm=t=>{const[a,b]=t.split(':');return +a*60+ +b};
const toYMD=dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
const addDaysYMD=(str,days)=>{const[y,m,d]=str.split('-').map(Number);const dt=new Date(y,m-1,d);dt.setDate(dt.getDate()+days);return toYMD(dt)};
const TODAY=toYMD(new Date());
const MONTH_NAMES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const BLOCK_LABELS={
  full:'Día completo cerrado',
  manana:'Solo Turno Mañana (06:00 a 12:00)',
  tarde:'Solo Turno Tarde (14:00 a 20:00)'
};

function getTheme(){try{const s=localStorage.getItem(TM_K);if(s)return s}catch(x){}return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function applyTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem(TM_K,t)}catch(x){}}
function toggleTheme(){const cur=document.documentElement.getAttribute('data-theme')||getTheme();applyTheme(cur==='dark'?'light':'dark');render()}
const ST=['Pendiente','Confirmado','En Ruta','En Atención','Finalizado','Cancelado'];
const COL={'Pendiente':'#b45309','Confirmado':'#2563eb','En Ruta':'#7c3aed','En Atención':'#0d9488','Finalizado':'#15803d','Cancelado':'#6b7280'};
const MOB=[
  'Autovalente',
  'Bastón / andador',
  'Silla de ruedas',
  'Dependencia Severa'
];
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
    seedVersion:2,
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
    const parsed=JSON.parse(localStorage.getItem(K));
    if(parsed && parsed.seedVersion===2){
      if(!Array.isArray(parsed.blocks)) parsed.blocks=[];
      return parsed;
    }
    return null;
  }catch(x){return null}
}
function save(){try{localStorage.setItem(K,JSON.stringify(D))}catch(x){}}
function getSession(){try{return JSON.parse(sessionStorage.getItem(SESS_K))}catch(e){return null}}
function setSession(s){try{sessionStorage.setItem(SESS_K,JSON.stringify(s))}catch(e){}}
function logout(){try{sessionStorage.removeItem(SESS_K)}catch(e){}U.sel=null;U.edit=null;render()}

const nowInit=new Date();
let D=load()||seed(),U={view:'admin',tab:'blocks',date:addDaysYMD(TODAY,1),calYear:nowInit.getFullYear(),calMonth:nowInit.getMonth(),blkType:'full',tens:'t1',sel:null,edit:null};
save();
addEventListener('storage',ev=>{if(ev.key===K){D=load()||D;render()}if(ev.key===TM_K){document.documentElement.setAttribute('data-theme',ev.newValue);render()}});
const tn=id=>(D.techs.find(t=>t.id==id)||{}).nom||'—';

/* REGLA DE BUFFER: nuevo.inicio < previo.fin + 180 (y simétrica: previo.inicio < nuevo.fin + 180) */
function avail(tid,date,start,dur,ign){return !D.svcs.some(s=>s.tid==tid&&s.date==date&&s.st!='Cancelado'&&s.id!=ign&&start<s.start+s.dur+BUF&&s.start<start+dur+BUF)}

function render(){
  const sess = getSession();
  if(!sess){
    $('#app').innerHTML = loginView();
    return;
  }
  if(sess.role === 'tens'){
    if(U.view !== 'blocks_tens') U.view = 'tens';
    U.tens = sess.tensId;
    $('#app').innerHTML = hdr(sess) + (U.view === 'blocks_tens' ? blocksView() : tens());
  } else {
    $('#app').innerHTML = hdr(sess) + (U.view=='admin'?admin():tens());
    if(U.view=='admin'&&U.tab=='new')techOpts();
  }
}

function loginView(){
  const d=document.documentElement.getAttribute('data-theme')=='dark';
  return `<div class="login-box">
    <div class="login-header">
      <img src="Logo de Movilidad y Salud Asistida.png" alt="Logo">
      <h1>Portal de Acceso</h1>
      <div style="font-size:13px;color:var(--mut);margin-top:4px">Acceso para Supervisores y Técnicos TENS</div>
    </div>
    <form onsubmit="doLogin(event)" style="display:grid;gap:12px">
      <div>
        <label>Usuario o Perfil</label>
        <input id="l_u" placeholder="Ej: admin o daniela" required autofocus>
      </div>
      <div>
        <label>Contraseña</label>
        <input id="l_p" type="password" placeholder="admin123 o tens123" required>
      </div>
      <div id="l_err" style="color:#dc2626;font-size:13px;display:none">Credenciales no válidas. Revisa los datos o usa un acceso rápido abajo.</div>
      <button class="p" type="submit" style="padding:10px;font-size:15px">Ingresar al Sistema</button>
    </form>
    
    <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--bd)">
      <label style="font-weight:600;margin-bottom:8px">⚡ Accesos directos:</label>
      <button type="button" class="quick-btn" onclick="quickLogin('admin','admin123')">
        <span><b>Supervisor / Administrador</b> (Gestión y Bloqueos)</span>
        <span style="color:var(--pri);font-weight:600">Entrar →</span>
      </button>
      <button type="button" class="quick-btn" onclick="quickLogin('daniela','tens123')">
        <span><b>TENS: Daniela González Bouyssieres</b> (Ruta y Bloqueos)</span>
        <span style="color:var(--pri);font-weight:600">Entrar →</span>
      </button>
    </div>

    <div class="row" style="justify-content:space-between;margin-top:18px;font-size:13px">
      <a class="b" href="index.html">← Volver al sitio web de clientes</a>
      <button type="button" onclick="toggleTheme()">${d?'☀️ Modo claro':'🌙 Modo oscuro'}</button>
    </div>
  </div>`;
}

function quickLogin(u,p){
  $('#l_u').value=u;
  $('#l_p').value=p;
  doLogin(null);
}

function doLogin(ev){
  if(ev) ev.preventDefault();
  const u=($('#l_u').value||'').trim().toLowerCase();
  const p=$('#l_p').value||'';
  
  if((u==='admin'||u==='supervisor') && (p==='admin123'||p==='msa2026'||p==='admin')){
    setSession({role:'admin',name:'Supervisor / Administrador'});
    U.view='admin';
    render();
    return;
  }
  
  const t = D.techs.find(x => {
    const fn = x.nom.toLowerCase().split(' ')[0];
    return fn === u || x.nom.toLowerCase() === u || x.id === u;
  });
  
  if(t && (p==='tens123'||p==='123456'||p==='admin123'||p==='tens')){
    setSession({role:'tens',name:t.nom,tensId:t.id});
    U.view='tens';
    U.tens=t.id;
    render();
    return;
  }
  
  const err = $('#l_err');
  if(err) err.style.display='block';
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
          ${isAdmin ? '👑 <b>Supervisor / Administrador</b>' : '🩺 TENS: <b>'+e(sess.name)+'</b>'}
        </div>
      </div>
    </div>
    <div class="row">
      ${isAdmin ? `
        <button class="${U.view=='admin'?'on':''}" onclick="U.view='admin';render()">Gestión</button>
        <button class="${U.view=='tens'?'on':''}" onclick="U.view='tens';render()">Vista Terreno</button>
      ` : `
        <button class="${U.view=='tens'?'on':''}" onclick="U.view='tens';render()">Mis Servicios</button>
        <button class="${U.view=='blocks_tens'?'on':''}" onclick="U.view='blocks_tens';render()">🔒 Disponibilidad y Bloqueos</button>
      `}
      <button onclick="toggleTheme()" title="Cambiar tema">${d?'☀️ Claro':'🌙 Oscuro'}</button>
      <button onclick="logout()" title="Cerrar sesión actual">Cerrar sesión</button>
      <a class="b" href="reservar.html" title="Ver formulario de reservas">📅 Ver Agendamiento</a>
      <a class="b" href="index.html" title="Ir a la web de clientes">← Web Clientes</a>
    </div>
  </div>`;
}

function dateNav(){return `<div class=row style="margin-bottom:10px"><button onclick="mv(-1)">‹</button><input type=date value="${U.date}" onchange="U.date=this.value;render()"><button onclick="mv(1)">›</button></div>`}
function mv(n){const d=new Date(U.date+'T12:00:00');d.setDate(d.getDate()+n);U.date=d.toISOString().slice(0,10);render()}

function admin(){const tabs=[['blocks','🔒 Gestión de Disponibilidad y Bloqueos'],['cal','Calendario diario'],['new','Nueva reserva'],['staff','Personal TENS']];
return `<div class=row style="margin-bottom:10px">${tabs.map(t=>`<button class="${U.tab==t[0]?'on':''}" onclick="U.tab='${t[0]}';U.sel=null;render()">${t[1]}</button>`).join('')}</div>`+(U.tab=='blocks'?blocksView():U.tab=='cal'?cal():U.tab=='new'?form():staff())}

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

  // Si se bloquea Día Completo, reemplazar bloqueos parciales previos de esa fecha; si es del mismo tipo, actualizar motivo
  if(type === 'full'){
    D.blocks = D.blocks.filter(b => b.date !== dateStr);
  } else {
    D.blocks = D.blocks.filter(b => !(b.date === dateStr && (b.type === type || b.type === 'full')));
  }

  D.blocks.push({
    id: D.nid++,
    date: dateStr,
    type,
    reason: reason || 'Sin motivo especificado',
    tid: 'all',
    createdAt: new Date().toISOString()
  });
  save();
  U.date = dateStr;
  render();
}

function removeManualBlock(blockId){
  if(!Array.isArray(D.blocks)) return;
  D.blocks = D.blocks.filter(b => b.id !== blockId);
  save();
  render();
}

function removeAllBlocksForDate(dateStr){
  if(!Array.isArray(D.blocks)) return;
  D.blocks = D.blocks.filter(b => b.date !== dateStr);
  save();
  render();
}

function blocksView(){
  if(!Array.isArray(D.blocks)) D.blocks = [];
  const y = U.calYear;
  const m = U.calMonth;
  const firstDay = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Lunes = 0 ... Domingo = 6

  let cells = '';
  for(let i = 0; i < startOffset; i++){
    cells += `<div class="mcal-day empty"></div>`;
  }

  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = `${y}-${pad(m+1)}-${pad(d)}`;
    const isSel = dateStr === U.date;
    const dayBlocks = D.blocks.filter(b => b.date === dateStr);
    const daySvcs = (D.svcs || []).filter(s => s.date === dateStr && s.st !== 'Cancelado');

    const hasFull = dayBlocks.some(b => b.type === 'full') || (dayBlocks.some(b => b.type === 'manana') && dayBlocks.some(b => b.type === 'tarde'));
    const hasManana = !hasFull && dayBlocks.some(b => b.type === 'manana');
    const hasTarde  = !hasFull && dayBlocks.some(b => b.type === 'tarde');

    let cls = '';
    if(hasFull) cls = 'b-full';
    else if(hasManana || hasTarde) cls = 'b-part';

    let tags = '';
    if(hasFull){
      tags += `<span class="mtag full">🔒 Día cerrado</span>`;
    } else {
      if(hasManana) tags += `<span class="mtag part">🔒 Mañana</span>`;
      if(hasTarde)  tags += `<span class="mtag part">🔒 Tarde</span>`;
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
            Bloquee días completos o turnos específicos (días libres, mantención de vehículo, trámites personales o feriados). Todo cambio impacta de inmediato en <b>reservar.html</b>.
          </div>
        </div>
      </div>

      <div class="blk-layout" style="margin-top:12px">
        <!-- COLUMNA IZQUIERDA: CALENDARIO MENSUAL -->
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
            <span><span class="dot" style="background:#d97706"></span>Turno Mañana / Tarde bloqueado</span>
            <span><span class="dot" style="background:#0f766e"></span>Con reservas agendadas</span>
          </div>
        </div>

        <!-- COLUMNA DERECHA: FORMULARIO DE BLOQUEO Y DESBLOQUEO EN 1 CLIC -->
        <div>
          <form class="card" style="margin:0 0 12px" onsubmit="saveManualBlock(event)">
            <h2>Bloquear fecha o turno</h2>
            <div style="margin-bottom:10px">
              <label>1. Fecha seleccionada (toque un día en el calendario o elija aquí)</label>
              <input id="mb_date" type="date" value="${U.date}" required onchange="pickAdminCalDate(this.value)" style="width:100%">
            </div>

            <div style="margin-bottom:10px">
              <label>2. Tipo de bloqueo a aplicar</label>
              <label class="blk-opt ${U.blkType==='full'?'on':''}" onclick="setBlkType('full')">
                <input type="radio" name="blk_t" value="full" ${U.blkType==='full'?'checked':''}>
                <div>
                  <b>a) Día completo cerrado</b>
                  <div style="font-size:12px;color:var(--mut)">Inhabilita toda la fecha (Mañana y Tarde) en el formulario público.</div>
                </div>
              </label>
              <label class="blk-opt ${U.blkType==='manana'?'on':''}" onclick="setBlkType('manana')">
                <input type="radio" name="blk_t" value="manana" ${U.blkType==='manana'?'checked':''}>
                <div>
                  <b>b) Solo Turno Mañana (06:00 a 12:00)</b>
                  <div style="font-size:12px;color:var(--mut)">Inhabilita el Turno Mañana (06:00 a 11:30) y deja disponible el Turno Tarde.</div>
                </div>
              </label>
              <label class="blk-opt ${U.blkType==='tarde'?'on':''}" onclick="setBlkType('tarde')">
                <input type="radio" name="blk_t" value="tarde" ${U.blkType==='tarde'?'checked':''}>
                <div>
                  <b>c) Solo Turno Tarde (14:00 a 20:00)</b>
                  <div style="font-size:12px;color:var(--mut)">Inhabilita el Turno Tarde (14:00 a 17:30) y deja disponible el Turno Mañana.</div>
                </div>
              </label>
            </div>

            <div style="margin-bottom:12px">
              <label>3. Motivo interno (opcional · visible únicamente en este panel Admin/TENS)</label>
              <input id="mb_reason" type="text" placeholder="Ej: Mantención auto, Trámite municipalidad, Día libre" style="width:100%">
              <div style="font-size:11px;color:var(--mut);margin-top:3px">🔒 El cliente solo verá "No disponible" sin conocer este motivo interno.</div>
            </div>

            <button class="p" type="submit" style="width:100%;padding:10px">🔒 Aplicar Bloqueo en ${U.date}</button>
          </form>

          <!-- BLOQUEOS ACTIVOS EN LA FECHA SELECCIONADA -->
          <div class="card" style="margin:0">
            <div class="row" style="justify-content:space-between;margin-bottom:8px">
              <h2 style="margin:0">Estado de bloqueos para el ${U.date}</h2>
              ${selDateBlocks.length > 1 ? `<button type="button" class="unlock-btn" onclick="removeAllBlocksForDate('${U.date}')">🔓 Desbloquear todo el día</button>` : ''}
            </div>
            ${selDateBlocks.length === 0 ? `
              <div style="font-size:13px;color:var(--mut)">✅ Esta fecha no tiene bloqueos manuales activos.</div>
            ` : selDateBlocks.map(b => `
              <div class="row" style="justify-content:space-between;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;background:var(--bg)">
                <div>
                  <strong style="color:#dc2626">🔒 ${e(BLOCK_LABELS[b.type] || b.type)}</strong>
                  <div style="font-size:12px;color:var(--mut)">Motivo interno: <b>${e(b.reason || 'Sin motivo')}</b></div>
                </div>
                <button type="button" class="unlock-btn" onclick="removeManualBlock(${b.id})">🔓 Desbloquear</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- LISTADO GENERAL DE TODOS LOS BLOQUEOS ACTIVOS -->
    <div class="card" style="overflow-x:auto">
      <h2>📋 Listado general de bloqueos manuales activos (${allSortedBlocks.length})</h2>
      ${allSortedBlocks.length === 0 ? `
        <div class="msg">No hay bloqueos manuales registrados actualmente.</div>
      ` : `
        <table>
          <tr><th>Fecha</th><th>Tipo de bloqueo</th><th>Motivo interno (Solo Admin)</th><th>Impacto Público</th><th>Acción rápida</th></tr>
          ${allSortedBlocks.map(b => `
            <tr>
              <td><b>${e(b.date)}</b></td>
              <td><span class="badge" style="background:${b.type==='full'?'#dc2626':'#d97706'}">${e(BLOCK_LABELS[b.type] || b.type)}</span></td>
              <td>${e(b.reason || '—')}</td>
              <td style="font-size:12px;color:var(--mut)">Muestra "No disponible" en reservar.html</td>
              <td><button type="button" class="unlock-btn" onclick="removeManualBlock(${b.id})">🔓 Desbloquear (1 clic)</button></td>
            </tr>
          `).join('')}
        </table>
      `}
    </div>
  `;
}

function cal(){const ss=D.svcs.filter(s=>s.date==U.date),act=D.techs.filter(t=>t.act),live=ss.filter(s=>s.st!='Cancelado');
const cob=live.reduce((a,s)=>a+s.paid,0),sal=live.reduce((a,s)=>a+s.fare-s.paid,0);
const H=(S1-S0)*PX/60;let hrs='';for(let m=S0;m<S1;m+=60)hrs+=`<div>${fm(m)}</div>`;
const cols=act.map(t=>`<div class=col><div class=ch style="border-color:${t.col}">${e(t.nom)}</div><div class=cb style="height:${H}px">${ss.filter(s=>s.tid==t.id).map(blk).join('')}</div></div>`).join('');
return dateNav()+`<div class=met><div><b>${live.length}</b><span>Servicios del día</span></div><div><b>${$c(cob)}</b><span>Abonado</span></div><div><b>${$c(sal)}</b><span>Saldo pendiente</span></div><div><b>${act.length}</b><span>TENS operativos</span></div></div>
<div class=row style="margin-bottom:8px;font-size:12px">${ST.map(s=>`<span><span class=dot style="background:${COL[s]}"></span>${s}</span>`).join('')}<span><span class=dot style="background:var(--buf);border:1px dashed var(--mut)"></span>Buffer 3 h</span></div>
<div class=cal><div class=tc><div style="height:38px;border:0"></div>${hrs}</div>${cols||'<p style="padding:12px">No hay TENS activos.</p>'}</div>${detail()}`}

function blk(s){const top=(s.start-S0)*PX/60,h=s.dur*PX/60,bt=top+h,bh=Math.max(0,Math.min(BUF*PX/60,(S1-S0)*PX/60-bt)),c=s.st=='Cancelado';
return (c?'':`<div class=buf style="top:${bt}px;height:${bh}px">Buffer operativo / Colación / Traslado</div>`)+`<div class="sv ${c?'c':''}" style="top:${top}px;height:${h}px;background:${COL[s.st]}" onclick="sel(${s.id})"><b>${fm(s.start)}–${fm(s.start+s.dur)}</b> ${e(s.pat)}<br>${s.st}</div>`}

function sel(id){U.sel=id;render();$('#det')&&$('#det').scrollIntoView({behavior:'smooth'})}
function detail(){const s=D.svcs.find(x=>x.id==U.sel);if(!s)return '';
const opts=D.techs.filter(t=>t.act&&(t.id==s.tid||avail(t.id,s.date,s.start,s.dur,s.id)));
return `<div class=card id=det style="margin-top:10px"><h2>Folio #MSA-${s.id} · ${e(s.pat)} (${s.age}) · ${fm(s.start)}–${fm(s.start+s.dur)} <span class=badge style="background:${COL[s.st]}">${s.st}</span></h2>
<div><b>Motivo:</b> ${e(s.dx)} · <b>Movilidad:</b> ${e(s.mob)}${s.compDesc ? ' · ' + e(s.compDesc) : (s.comp?' (Con acompañante)':'')}</div>
${s.alergias ? `<div><b>Alergias:</b> <span style="${s.alergias.startsWith('Sí') ? 'color:#dc2626;font-weight:700':''}">${e(s.alergias)}</span> · <b>Conciencia:</b> ${e(s.conciencia||'Lúcido / Orientado')}</div>` : ''}
${s.patologias ? `<div><b>Patologías:</b> ${e(Array.isArray(s.patologias)?s.patologias.join(', '):s.patologias)}</div>` : ''}
<div><b>Ruta:</b> ${e(s.from)}${s.depto?' ('+e(s.depto)+')':''} → ${e(s.to)}</div>
${s.obs?`<div><b>Observaciones:</b> ${e(s.obs)}</div>`:''}
${s.taxDoc?`<div><b>Doc. Tributario:</b> ${e(s.taxDoc.label||s.taxDoc.type)}${s.taxDoc.type==='factura'?' ('+e(s.taxDoc.rs)+' · RUT '+e(s.taxDoc.rut)+' · Giro '+e(s.taxDoc.giro)+' · Dir: '+e(s.taxDoc.dir)+')':''}</div>`:''}
<div><b>Contacto:</b> ${e(s.coord)} (${e(s.ph)})${s.coordType==='paciente'?' [Paciente directo]':' [Familiar/Tutor]'}${s.patPhone ? ` · <b>Tel. Paciente:</b> ${e(s.patPhone)}` : ''}</div>
<div class=msg>Bloqueo operativo hasta ${fm(s.start+s.dur+BUF)} · Tarifa ${$c(s.fare)} · Abono ${$c(s.paid)} · Saldo ${$c(s.fare-s.paid)}</div>
<div class=row style="margin-top:8px">
<div><label>Reasignar a</label><select onchange="reasg(${s.id},this.value)">${opts.map(t=>`<option value="${t.id}" ${t.id==s.tid?'selected':''}>${e(t.nom)}</option>`).join('')}</select></div>
<div><label>Estado</label><select onchange="setSt(${s.id},this.value)">${ST.map(x=>`<option ${x==s.st?'selected':''}>${x}</option>`).join('')}</select></div>
<div><label>Tarifa ($)</label><input type=number min=0 value="${s.fare}" style="width:110px" onchange="setPay(${s.id},'fare',this.value)"></div>
<div><label>Abono ($)</label><input type=number min=0 value="${s.paid}" style="width:110px" onchange="setPay(${s.id},'paid',this.value)"></div>
<button onclick="U.sel=null;render()">Cerrar</button></div></div>`}

function reasg(id,tid){const s=D.svcs.find(x=>x.id==id);if(!avail(tid,s.date,s.start,s.dur,id)){alert('Ese TENS no está disponible por la regla de buffer.');return}s.tid=tid;save();render()}
function setSt(id,v){D.svcs.find(x=>x.id==id).st=v;save();render()}
function setPay(id,k,v){const s=D.svcs.find(x=>x.id==id);if(s){s[k]=+v||0;save();render()}}

function form(){const f=(id,l,x='')=>`<div><label>${l}</label>${x}</div>`;
const inp=(id,t='text',extra='')=>`<input id=${id} type=${t} ${extra}>`;
return `<form class=card onsubmit="sub(event)"><h2>Nueva reserva (ficha clínica / traslado)</h2><div class=g>
${f('','Fecha',`<input id=f_d type=date value="${U.date}" required oninput="techOpts()">`)}
${f('','Hora de inicio',`<input id=f_s type=time value="10:00" min="06:00" max="22:00" required oninput="techOpts()">`)}
${f('','Duración estimada (min)',`<input id=f_du type=number value=60 min=15 step=15 required oninput="techOpts()">`)}
${f('','Paciente: nombre completo',inp('f_p','text','required'))}${f('','Edad',inp('f_a','number','min=0 max=120 required'))}
${f('','Diagnóstico base / motivo',inp('f_dx','text','required'))}${f('','Coordinador: nombre',inp('f_c','text','required'))}
${f('','Teléfono (+569)',`<div class=row style="flex-wrap:nowrap"><span>+569</span><input id=f_ph inputmode=numeric pattern="[0-9]{8}" maxlength=8 placeholder="12345678" required></div>`)}
${f('','Origen (Comuna, Calle, N°)',inp('f_o','text','required'))}${f('','Destino (Clínica/Hospital/Domicilio)',inp('f_de','text','required'))}
${f('','Condición de movilidad',`<select id=f_m>${MOB.map(m=>`<option>${m}</option>`).join('')}</select>`)}
${f('','¿Acompañante adicional?',`<select id=f_ac><option>No</option><option>Sí</option></select>`)}
${f('','Tarifa pactada ($)',`<input id=f_fa type=number min=0 value=0 oninput="sld()">`)}${f('','Abono pagado ($)',`<input id=f_ab type=number min=0 value=0 oninput="sld()">`)}
${f('','Saldo a cobrar en terreno',`<b id=sld style="display:block;padding:8px 0">$0</b>`)}
${f('','TENS asignado (solo disponibles)',`<select id=f_t required></select>`)}</div>
<div class=rqs style="margin-top:10px"><label>Requerimiento asistencial</label>${REQ.map(r=>`<label><input type=checkbox class=rq value="${r}" ${r=='Solo traslado'?'checked':''}>${r}</label>`).join('')}</div>
<div class=msg id=info></div><div style="margin-top:10px"><button class=p type=submit>Crear reserva</button></div></form>`}

function sld(){$('#sld').textContent=$c((+$('#f_fa').value||0)-(+$('#f_ab').value||0))}
function techOpts(){const d=$('#f_d').value,s=$('#f_s').value,du=+$('#f_du').value,sl=$('#f_t');if(!d||!s||!du)return;const st=tm(s),cur=sl.value;
const act=D.techs.filter(t=>t.act),ok=act.filter(t=>avail(t.id,d,st,du));
sl.innerHTML=ok.map(t=>`<option value="${t.id}">${e(t.nom)}</option>`).join('');if(ok.some(t=>t.id==cur))sl.value=cur;
$('#info').textContent=`Termina ${fm(st+du)}; bloqueo posterior hasta ${fm(st+du+BUF)}. `+(ok.length?`${ok.length} TENS disponible(s)`:'Ningún TENS disponible')+(act.length-ok.length?` · ${act.length-ok.length} excluido(s) por buffer de 3 h.`:'.')}

function sub(ev){ev.preventDefault();const g=i=>$('#'+i).value,tid=g('f_t'),st=tm(g('f_s')),du=+g('f_du');
if(!tid||!avail(tid,g('f_d'),st,du)){alert('No hay TENS disponible en ese horario (regla de buffer de 3 horas).');return}
D.svcs.push({id:D.nid++,tid,date:g('f_d'),start:st,dur:du,pat:g('f_p'),age:+g('f_a'),dx:g('f_dx'),coord:g('f_c'),ph:'+569'+g('f_ph'),from:g('f_o'),to:g('f_de'),mob:g('f_m'),req:[...document.querySelectorAll('.rq:checked')].map(x=>x.value),comp:g('f_ac')=='Sí',fare:+g('f_fa')||0,paid:+g('f_ab')||0,st:(+g('f_ab')>0?'Confirmado':'Pendiente')});
save();U.date=g('f_d');U.tab='cal';render()}

function staff(){const t=D.techs.find(x=>x.id==U.edit)||{nom:'',rut:'',tel:'',veh:'',col:'#2563eb'},v=(k)=>e(t[k]);
return `<div class=card><h2>${U.edit?'Editar TENS':'Agregar TENS'}</h2><form class=g onsubmit="saveT(event)">
<div><label>Nombre</label><input id=s_nom value="${v('nom')}" required></div><div><label>RUT</label><input id=s_rut value="${v('rut')}" required></div>
<div><label>Teléfono</label><input id=s_tel value="${v('tel')}" placeholder="+569..." required></div><div><label>Vehículo asociado</label><input id=s_veh value="${v('veh')}"></div>
<div><label>Color distintivo</label><input id=s_col type=color value="${t.col}"></div>
<div style="align-self:end"><button class=p type=submit>Guardar</button> ${U.edit?'<button type=button onclick="U.edit=null;render()">Cancelar</button>':''}</div></form></div>
<div class=card style="overflow-x:auto"><table><tr><th>TENS</th><th>RUT</th><th>Teléfono</th><th>Vehículo</th><th>Estado</th><th></th></tr>
${D.techs.map(t=>`<tr><td><span class=dot style="background:${t.col}"></span>${e(t.nom)}</td><td>${e(t.rut)}</td><td>${e(t.tel)}</td><td>${e(t.veh)}</td><td>${t.act?'Activo':'Inactivo'}</td>
<td><button onclick="U.edit='${t.id}';render()">Editar</button> <button onclick="togT('${t.id}')">${t.act?'Desactivar':'Activar'}</button></td></tr>`).join('')}</table></div>`}

function saveT(ev){ev.preventDefault();const g=i=>$('#'+i).value,o={nom:g('s_nom'),rut:g('s_rut'),tel:g('s_tel'),veh:g('s_veh'),col:g('s_col')};
if(U.edit)Object.assign(D.techs.find(x=>x.id==U.edit),o);else D.techs.push({id:'t'+Date.now(),act:true,...o});U.edit=null;save();render()}
function togT(id){const t=D.techs.find(x=>x.id==id);t.act=!t.act;save();render()}

function tens(){
  const sess = getSession();
  const isAdmin = sess && sess.role === 'admin';
  const act=D.techs.filter(t=>t.act);
  if(!act.some(t=>t.id==U.tens))U.tens=(act[0]||{}).id;
  const ss=D.svcs.filter(s=>s.tid==U.tens&&s.date==U.date&&s.st!='Cancelado').sort((a,b)=>a.start-b.start);
  return `<div class=card>
    ${isAdmin ? `
      <label>Supervisar TENS específico:</label>
      <select onchange="U.tens=this.value;render()">${act.map(t=>`<option value="${t.id}" ${t.id==U.tens?'selected':''}>${e(t.nom)}</option>`).join('')}</select>
    ` : `
      <div style="font-weight:600">Servicios asignados para hoy (${e(sess.name)}):</div>
    `}
  </div>${dateNav()}
  ${ss.map(card).join('')||'<div class=card>Sin servicios asignados para este día.</div>'}`}

function card(s){const n=NEXT[s.st],wa=s.ph.replace(/\D/g,''),q=encodeURIComponent(s.to),qo=encodeURIComponent(s.from);
return `<div class=card><div class=row style="justify-content:space-between"><b>${fm(s.start)}–${fm(s.start+s.dur)}</b><span class=badge style="background:${COL[s.st]}">${s.st}</span></div>
<h2 style="margin-top:6px">${e(s.pat)}, ${s.age} años</h2><div>${e(s.dx)}</div>
${s.alergias ? `<div style="font-size:12px;margin:2px 0"><b>Alergias:</b> <span style="${s.alergias.startsWith('Sí')?'color:#dc2626;font-weight:700':''}">${e(s.alergias)}</span> · <b>Conciencia:</b> ${e(s.conciencia||'Lúcido / Orientado')}</div>` : ''}
${s.patologias ? `<div style="font-size:12px;margin:2px 0"><b>Patologías:</b> ${e(Array.isArray(s.patologias)?s.patologias.join(', '):s.patologias)}</div>` : ''}
<div class=al>⚠ ${e(s.mob)}${s.compDesc ? ' · ' + e(s.compDesc) : (s.comp?' · Viaja con acompañante':'')}${s.req && s.req.length ? '<br>' + s.req.map(e).join(' · ') : ''}</div>
<div>Contacto: ${e(s.coord)} ${e(s.ph)}${s.coordType==='paciente'?' (Paciente)':' (Familiar/Tutor)'}${s.patPhone ? `<br><small style="color:var(--mute)">Tel. Paciente: ${e(s.patPhone)}</small>` : ''}</div><div style="margin:4px 0"><a class=b href="tel:${e(s.ph)}">📞 Llamar</a><a class=b href="https://wa.me/${wa}" target=_blank rel=noopener>WhatsApp</a></div>
<div><b>Recogida:</b> ${e(s.from)}${s.depto?' ('+e(s.depto)+')':''}<br><b>Destino:</b> ${e(s.to)}</div>
${s.obs?`<div style="font-size:12px;color:var(--pri);margin-top:2px"><b>📝 Observaciones:</b> ${e(s.obs)}</div>`:''}
<div style="margin:4px 0"><a class=b href="https://waze.com/ul?q=${qo}&navigate=yes" target=_blank rel=noopener>Waze (recogida)</a><a class=b href="https://www.google.com/maps/dir/?api=1&origin=${qo}&destination=${q}" target=_blank rel=noopener>Google Maps (ruta)</a></div>
<div class=msg>Saldo a cobrar en terreno: <b>${$c(s.fare-s.paid)}</b></div>
${n?`<button class=p style="width:100%;margin-top:8px;padding:12px" onclick="setSt(${s.id},'${n[0]}')">[${n[1]}]</button>`:'<div class=msg>✔ Servicio finalizado</div>'}</div>`}

render();
