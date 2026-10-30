const TM_K='msa-theme', WA_NUM='56929990095', PRICE_PER_KM=1000;
const $=s=>document.querySelector(s);
const $c=n=>'$'+Math.round(n).toLocaleString('es-CL');

function getTheme(){try{const s=localStorage.getItem(TM_K);if(s)return s}catch(x){}return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  try{localStorage.setItem(TM_K,t)}catch(x){}
  const btn=$('#themeBtn');
  if(btn) btn.textContent = t==='dark' ? '☀️' : '🌙';
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||getTheme();
  applyTheme(cur==='dark'?'light':'dark');
}
applyTheme(getTheme());
addEventListener('storage',ev=>{if(ev.key===TM_K)applyTheme(ev.newValue)});

// Directorio rápido de principales Hospitales y Clínicas de Santiago / RM para máxima precisión
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

let ptFrom = null;
let ptTo = null;
let markerFrom = null;
let markerTo = null;
let routeLine = null;
let tripMultiplier = 2; // 2 = Ida y Vuelta (por defecto), 1 = Solo Ida
let lastIdaKm = 0;
let lastVueltaKm = 0;
let lastRoundTripKm = 0;
let lastIdaMin = 0;
let lastRoundTripMin = 0;
let pickMode = 'from';
let typeTimers = {from:null, to:null};

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

function setTripMode(mult){
  tripMultiplier = mult;
  $('#btnIdaVuelta').classList.toggle('active', mult === 2);
  $('#btnIda').classList.toggle('active', mult === 1);
  if(ptFrom && ptTo){
    computeRoute();
  }
}

function setPickMode(m){
  pickMode = m;
  $('#pickFromBtn').classList.toggle('on', m==='from');
  $('#pickToBtn').classList.toggle('on', m==='to');
  setStatus(m==='from' ? '📍 Toque el punto exacto en el mapa para situar el Inicio (A).' : '🏁 Toque el punto exacto en el mapa para situar el Destino (B).');
}
setPickMode('from');

map.on('click', async function(ev){
  const {lat, lng} = ev.latlng;
  const target = pickMode;
  setPoint(target, lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`, false);
  const addr = await reverseGeocodeExact(lat, lng);
  if(addr){
    if(target==='from'){
      ptFrom.label = addr;
      $('#inpFrom').value = addr;
    } else {
      ptTo.label = addr;
      $('#inpTo').value = addr;
    }
  }
  if(target==='from' && !ptTo) setPickMode('to');
  if(ptFrom && ptTo) computeRoute();
});

function setPoint(which, lat, lon, label, fit=true){
  if(which === 'from'){
    ptFrom = {lat:+lat, lon:+lon, label};
    $('#inpFrom').value = label;
    if(!markerFrom){
      markerFrom = L.marker([lat, lon], {icon:iconA, draggable:true}).addTo(map);
      markerFrom.on('dragend', async function(e){
        const pos = e.target.getLatLng();
        ptFrom.lat = pos.lat; ptFrom.lon = pos.lng;
        const addr = await reverseGeocodeExact(pos.lat, pos.lng);
        if(addr){ ptFrom.label = addr; $('#inpFrom').value = addr; }
        if(ptFrom && ptTo) computeRoute();
      });
    } else {
      markerFrom.setLatLng([lat, lon]);
    }
  } else {
    ptTo = {lat:+lat, lon:+lon, label};
    $('#inpTo').value = label;
    if(!markerTo){
      markerTo = L.marker([lat, lon], {icon:iconB, draggable:true}).addTo(map);
      markerTo.on('dragend', async function(e){
        const pos = e.target.getLatLng();
        ptTo.lat = pos.lat; ptTo.lon = pos.lng;
        const addr = await reverseGeocodeExact(pos.lat, pos.lng);
        if(addr){ ptTo.label = addr; $('#inpTo').value = addr; }
        if(ptFrom && ptTo) computeRoute();
      });
    } else {
      markerTo.setLatLng([lat, lon]);
    }
  }
  if(fit){
    if(ptFrom && ptTo){
      map.fitBounds([[ptFrom.lat, ptFrom.lon], [ptTo.lat, ptTo.lon]], {padding:[50,50]});
    } else {
      map.setView([lat, lon], 16);
    }
  }
}

// Geocodificación inversa con numeración exacta vía ArcGIS + respaldo OSM
async function reverseGeocodeExact(lat, lon){
  try{
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lon},${lat}&langCode=ES`;
    const r = await fetch(url);
    const d = await r.json();
    if(d && d.address){
      const a = d.address;
      const street = a.Address || a.Match_addr || '';
      const city = a.City || a.Subregion || '';
      if(street && city) return `${street}, ${city}`;
      if(street) return street;
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
      const com = a.city_district || a.suburb || a.town || a.city || '';
      return [road + num, com].filter(Boolean).join(', ') || d2.display_name;
    }
  }catch(e){}
  return null;
}

function onType(which){
  clearTimeout(typeTimers[which]);
  // Si el usuario edita el texto manualmente, limpiamos el punto previo para obligar a usar la nueva numeración
  if(which==='from') ptFrom = null;
  else ptTo = null;

  const val = (which==='from' ? $('#inpFrom').value : $('#inpTo').value).trim();
  const sugBox = which==='from' ? $('#sugFrom') : $('#sugTo');
  if(val.length < 3){
    sugBox.style.display = 'none';
    return;
  }
  typeTimers[which] = setTimeout(()=>searchAddr(which, false), 280);
}

// Buscador con soporte de numeración exacta (ArcGIS Chile + Directorio Clínico RM)
async function searchAddr(which, autoPickFirst){
  const inp = which==='from' ? $('#inpFrom') : $('#inpTo');
  const sugBox = which==='from' ? $('#sugFrom') : $('#sugTo');
  const q = inp.value.trim();
  if(!q) return;

  setStatus('🔍 Buscando dirección y numeración exacta...');
  try{
    const qLow = q.toLowerCase();
    // 1. Buscar coincidencias en centros médicos de RM
    const medMatches = MEDICAL_PLACES.filter(m =>
      m.name.toLowerCase().includes(qLow) || m.addr.toLowerCase().includes(qLow)
    ).map(m => ({
      title: m.name,
      subtitle: m.addr,
      fullLabel: `${m.name} (${m.addr})`,
      lat: m.lat,
      lon: m.lon
    }));

    // 2. Buscar en ArcGIS Geocoder priorizando Región Metropolitana y alrededores (-70.70, -33.46)
    const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(q)}&countryCode=CHL&location=-70.70,-33.46&searchExtent=-71.9,-34.9,-69.8,-32.5&maxLocations=6&outFields=PlaceName,Match_addr,Place_addr,City,Region`;
    const r = await fetch(arcUrl);
    const data = await r.json();
    let arcList = [];

    if(data && data.candidates && data.candidates.length > 0){
      arcList = data.candidates.map(c => {
        const attr = c.attributes || {};
        const mainAddr = (c.address || attr.Match_addr || '').replace(/, CHL$/i, '');
        const subAddr = (attr.Place_addr || '').replace(/, CHL$/i, '');
        const title = attr.PlaceName && !mainAddr.startsWith(attr.PlaceName)
          ? `${attr.PlaceName} · ${mainAddr}`
          : mainAddr;
        return {
          title: title,
          subtitle: subAddr || 'Región Metropolitana / Chile',
          fullLabel: title,
          lat: c.location.y,
          lon: c.location.x
        };
      });
    } else {
      // Si la búsqueda es fuera de RM/Valparaíso/O'Higgins, buscar en todo Chile
      const arcAllUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(q)}&countryCode=CHL&location=-70.70,-33.46&maxLocations=6&outFields=PlaceName,Match_addr,Place_addr`;
      const rAll = await fetch(arcAllUrl);
      const dataAll = await rAll.json();
      if(dataAll && dataAll.candidates){
        arcList = dataAll.candidates.map(c => {
          const mainAddr = (c.address || '').replace(/, CHL$/i, '');
          return {
            title: mainAddr,
            subtitle: (c.attributes && c.attributes.Place_addr) || 'Chile',
            fullLabel: mainAddr,
            lat: c.location.y,
            lon: c.location.x
          };
        });
      }
    }

    const combined = [...medMatches, ...arcList].slice(0, 7);

    if(combined.length === 0){
      sugBox.innerHTML = `<div class="sug-item"><small>No encontramos esa dirección. Intente indicar calle, número y comuna (ej: "Pasaje Los Océanos 456, Maipú") o toque directamente en el mapa.</small></div>`;
      sugBox.style.display = 'block';
      setStatus('⚠️ Dirección no encontrada. Puede marcar el punto directamente en el mapa.');
      return;
    }

    if(autoPickFirst){
      const first = combined[0];
      sugBox.style.display = 'none';
      // Si el usuario escribió un número de casa específico que no venía en la etiqueta, conservar su texto
      const userNumberMatch = q.match(/\b(\d{1,5})\b/);
      let finalLabel = first.fullLabel;
      if(userNumberMatch && !finalLabel.includes(userNumberMatch[1])){
        finalLabel = `${q} (${first.title})`;
      }
      setPoint(which, first.lat, first.lon, finalLabel, true);
      if(ptFrom && ptTo) computeRoute();
      else setStatus('✅ Dirección ubicada con éxito. Ahora ingrese el segundo punto.');
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
    setStatus('Seleccione la dirección exacta de la lista desplegable.');
  }catch(e){
    setStatus('⚠️ Error al consultar dirección. Puede tocar directamente en el mapa.');
  }
}

function pickSugIndex(which, idx){
  const item = (window._lastSugs || [])[idx];
  if(!item) return;
  const inp = which==='from' ? $('#inpFrom') : $('#inpTo');
  const sugBox = which==='from' ? $('#sugFrom') : $('#sugTo');
  const typed = inp.value.trim();
  const userNum = typed.match(/\b(\d{1,5})\b/);
  let label = item.fullLabel;
  if(userNum && !label.includes(userNum[1])){
    label = `${typed} (${item.title})`;
  }
  sugBox.style.display = 'none';
  setPoint(which, item.lat, item.lon, label, true);
  if(which==='from' && !ptTo) setPickMode('to');
  if(ptFrom && ptTo) computeRoute();
}

document.addEventListener('click', function(ev){
  if(!ev.target.closest('.search-wrap')){
    $('#sugFrom').style.display = 'none';
    $('#sugTo').style.display = 'none';
  }
});

async function calculateNow(){
  if(!ptFrom && $('#inpFrom').value.trim()){
    await searchAddr('from', true);
  }
  if(!ptTo && $('#inpTo').value.trim()){
    await searchAddr('to', true);
  }
  if(!ptFrom || !ptTo){
    setStatus('⚠️ Por favor indique tanto la dirección de Inicio (A) como la de Destino (B).');
    return;
  }
  computeRoute();
}

async function computeRoute(){
  if(!ptFrom || !ptTo) return;
  const isRoundTrip = tripMultiplier === 2;
  setStatus(isRoundTrip ? '🚗 Calculando kilómetros exactos de Ida y Vuelta...' : '🚗 Calculando kilómetros exactos de Solo Ida...');
  try{
    const coords = isRoundTrip
      ? `${ptFrom.lon},${ptFrom.lat};${ptTo.lon},${ptTo.lat};${ptFrom.lon},${ptFrom.lat}`
      : `${ptFrom.lon},${ptFrom.lat};${ptTo.lon},${ptTo.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    const data = await r.json();

    if(data && data.routes && data.routes.length > 0){
      const route = data.routes[0];
      const legs = route.legs || [];
      lastIdaKm = legs[0] ? legs[0].distance / 1000 : (route.distance / (isRoundTrip ? 2000 : 1000));
      lastVueltaKm = isRoundTrip ? (legs[1] ? legs[1].distance / 1000 : lastIdaKm) : 0;
      lastRoundTripKm = route.distance / 1000;
      const totalDurationMin = Math.round(route.duration / 60);

      if(routeLine) map.removeLayer(routeLine);
      routeLine = L.geoJSON(route.geometry, {
        style: {color:'#0f766e', weight:6, opacity:0.85}
      }).addTo(map);
      map.fitBounds(routeLine.getBounds(), {padding:[45,45]});

      renderPricing(lastIdaKm, lastVueltaKm, lastRoundTripKm, totalDurationMin);
      setStatus(isRoundTrip
        ? '✅ Ruta de Ida y Vuelta calculada. Puede mover los pines A o B en el mapa si desea ajustar el punto exacto.'
        : '✅ Ruta de Solo Ida calculada. Puede mover los pines A o B en el mapa si desea ajustar el punto exacto.');
    } else {
      setStatus('⚠️ No se pudo trazar ruta vehicular entre ambos puntos.');
    }
  }catch(e){
    const dKm = haversineKm(ptFrom.lat, ptFrom.lon, ptTo.lat, ptTo.lon) * 1.3;
    const totalKm = isRoundTrip ? dKm * 2 : dKm;
    renderPricing(dKm, isRoundTrip ? dKm : 0, totalKm, Math.round(totalKm * 2));
    setStatus('✅ Distancia calculada.');
  }
}

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function renderPricing(idaKm, vueltaKm, totalKm, totalMin){
  const isRoundTrip = tripMultiplier === 2;
  const rIda = Math.round(idaKm * 10) / 10;
  const rTotal = Math.round(totalKm * 10) / 10;
  const rVuelta = isRoundTrip ? Math.max(0, Math.round((rTotal - rIda) * 10) / 10) : 0;
  const fmtIda = rIda.toFixed(1).replace('.', ',');
  const fmtVuelta = rVuelta.toFixed(1).replace('.', ',');
  const fmtTotal = rTotal.toFixed(1).replace('.', ',');
  const totalCost = Math.round((rTotal * PRICE_PER_KM) / 100) * 100;
  const modeLabel = isRoundTrip ? 'Ida y Vuelta (A → B → A)' : 'Solo Ida (A → B)';

  $('#resultPanel').style.display = 'block';
  $('#lblResultTitle').textContent = isRoundTrip ? 'Distancia total Ida y Vuelta:' : 'Distancia total Solo Ida:';
  $('#outKm').textContent = `${fmtTotal} km`;
  $('#outTime').textContent = totalMin > 0 ? `(aprox. ${totalMin} min de conducción)` : '';
  $('#outPrice').textContent = $c(totalCost);

  $('#bdOneWay').textContent = `${fmtIda} km`;
  $('#rowReturn').style.display = isRoundTrip ? 'flex' : 'none';
  $('#bdReturn').textContent = `${fmtVuelta} km`;
  $('#bdMode').textContent = modeLabel;
  $('#bdTotalKm').textContent = `${fmtTotal} km × $1.000`;
  $('#bdTotalPrice').textContent = $c(totalCost);

  const fromStr = $('#inpFrom').value.trim() || (ptFrom ? ptFrom.label : '');
  const toStr = $('#inpTo').value.trim() || (ptTo ? ptTo.label : '');

  const bookParams = new URLSearchParams({
    from: fromStr,
    to: toStr,
    mode: isRoundTrip ? 'ida_vuelta' : 'solo_ida',
    km: rTotal.toFixed(1),
    fare: totalCost
  });
  $('#btnBookRoute').href = `reservar.html?${bookParams.toString()}`;
}

function useMyLocation(){
  if(!navigator.geolocation){
    setStatus('⚠️ Su navegador no soporta geolocalización.');
    return;
  }
  setStatus('📍 Obteniendo su ubicación actual...');
  navigator.geolocation.getCurrentPosition(async pos => {
    const {latitude, longitude} = pos.coords;
    setPoint('from', latitude, longitude, 'Mi ubicación actual', true);
    const addr = await reverseGeocodeExact(latitude, longitude);
    if(addr){
      ptFrom.label = addr;
      $('#inpFrom').value = addr;
    }
    setPickMode('to');
    if(ptFrom && ptTo) computeRoute();
  }, () => {
    setStatus('⚠️ No se pudo acceder al GPS. Puede escribir su dirección o tocar el mapa.');
  });
}

function setStatus(msg){
  $('#statusMsg').textContent = msg;
}
