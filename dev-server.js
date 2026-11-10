const http = require('http');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const PORT = 3000;
const BASE_DIR = __dirname;

let devConfig = {};
try {
  const cfgPath = path.join(__dirname, 'dev-config.json');
  if (fs.existsSync(cfgPath)) {
    devConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch(e){}

const SUPABASE_DEV_URL = process.env.SUPABASE_DEV_URL || devConfig.SUPABASE_DEV_URL || '';
const SUPABASE_DEV_KEY = process.env.SUPABASE_DEV_KEY || devConfig.SUPABASE_DEV_KEY || '';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || devConfig.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || devConfig.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || devConfig.VAPID_SUBJECT || 'mailto:contacto@movilidadysaludasistida.cl';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[WEBPUSH] Credenciales VAPID activas');
}

// Almacén de suscripciones en memoria / archivo local con respaldo
const SUBS_FILE = path.join(__dirname, 'push-subs.json');
function getLocalSubs() {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8')) || [];
    }
  } catch(e){}
  return [];
}

function saveLocalSub(sub) {
  const subs = getLocalSubs();
  const exists = subs.find(s => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    try { fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2)); } catch(e){}
  }
}

async function dispatchPushToAll(payload) {
  const subs = getLocalSubs();
  console.log(`[PUSH DISPATCHER] Enviando notificación a ${subs.length} dispositivo(s)...`);
  
  const results = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification(s, JSON.stringify(payload));
      results.push({ endpoint: s.endpoint, ok: true });
      console.log('[PUSH DISPATCHER] Notificación entregada con éxito a:', s.endpoint.slice(0, 45) + '...');
    } catch(err) {
      console.warn('[PUSH DISPATCHER] Error enviando a endpoint:', err.message);
      results.push({ endpoint: s.endpoint, ok: false, error: err.message });
    }
  }
  return results;
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // API ROUTE: Recepción pública de Reservas desde reservar.html (Con Push automático a TENS)
  if (pathname === '/api/reservas') {
    if (req.method === 'GET') {
      try {
        const fecha = urlObj.searchParams.get('fecha');
        let sbQuery = `${SUPABASE_DEV_URL}/rest/v1/reservas?select=*`;
        if (fecha) sbQuery += `&fecha=eq.${fecha}`;
        const sbRes = await fetch(sbQuery, {
          headers: {
            apikey: SUPABASE_DEV_KEY,
            Authorization: `Bearer ${SUPABASE_DEV_KEY}`
          }
        });
        const rows = await sbRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: true, data: rows, total: rows.length }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const folioNum = Math.floor(100 + Math.random() * 900);
          const folio = `MSA-2611-${folioNum}`;

          const modMap = {
            '1': '1. Servicio Integral (Asistencia + Traslado)',
            '2': '2. Traslado Clínico Simple',
            '3': '3. Cuidado Clínico a Domicilio',
            '4': '4. Cobertura Sanitaria de Eventos',
            '5': '5. Traslado Interregional'
          };

          const nuevaReserva = {
            folio,
            fecha: data.fecha || data.date || new Date().toISOString().slice(0, 10),
            hora_recogida: data.hora_recogida || data.time || data.start || '10:00',
            turno: data.turno || data.block || 'mañana',
            modalidad: String(data.modalidad || data.svcType || '1'),
            modalidad_nombre: modMap[String(data.modalidad || data.svcType)] || 'Servicio Integral',
            paciente_nombre: data.paciente || data.pat || 'Paciente General',
            paciente_edad: parseInt(data.age, 10) || null,
            paciente_telefono: data.patPhone || data.contacto || data.ph || '',
            paciente_motivo: data.dx || data.motivo || 'Atención en terreno',
            paciente_movilidad: data.mob || data.ayuda_tecnica || 'Autovalente',
            paciente_alergias: data.alergias || 'Sin alergias conocidas',
            coordinador_nombre: data.coord || data.paciente || '',
            coordinador_telefono: data.ph || data.contacto || '',
            ruta_origen: data.origen || data.from || 'Santiago',
            ruta_destino: data.destino || data.to || 'Centro de Salud',
            km_estimado: parseFloat(data.km) || 0,
            tiempo_espera: data.tiempo_espera || (data.dur ? `${data.dur} hrs` : null),
            estado_terreno: 'pendiente',
            estado_pago: 'pendiente_abono'
          };

          // 1. Guardar en Supabase Dev
          if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY) {
            try {
              const ins = await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas`, {
                method: 'POST',
                headers: {
                  apikey: SUPABASE_DEV_KEY,
                  Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(nuevaReserva)
              });
              const insRes = await ins.json().catch(() => null);
              console.log('[SUPABASE DEV] Reserva insertada con éxito:', insRes);
            } catch(e) {
              console.error('[SUPABASE DEV] Error guardando reserva:', e);
            }
          }

          // 2. Disparar Web Push a TODOS los celulares suscritos
          const pushPayload = {
            title: '🚨 ¡Nueva Reserva Agendada!',
            body: `Folio ${folio}: ${nuevaReserva.paciente_nombre} (${nuevaReserva.hora_recogida} hrs - Turno ${nuevaReserva.turno}). Toca para ver la ruta.`,
            icon: '/apple-touch-icon.png',
            badge: '/favicon-32x32.png',
            url: '/tens.html'
          };
          const pushResults = await dispatchPushToAll(pushPayload);
          console.log(`[PUSH DISPATCHER] Alerta enviada tras nueva reserva. Resultados:`, pushResults);

          // 3. Responder con formato esperado por reservar.html
          res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({
            ok: true,
            folio,
            id: folio,
            data: {
              folio,
              id: folio,
              ...nuevaReserva
            }
          }));
        } catch(err) {
          console.error('[DEV SERVER] Error procesando POST /api/reservas:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      const folio = urlObj.searchParams.get('folio');
      const id = urlObj.searchParams.get('id');
      console.log(`[DEV SERVER] Purgando reserva: ${folio || id}`);
      if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY && (folio || id)) {
        try {
          const param = folio ? `folio=eq.${encodeURIComponent(folio)}` : `id=eq.${encodeURIComponent(id)}`;
          await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas?${param}`, {
            method: 'DELETE',
            headers: {
              apikey: SUPABASE_DEV_KEY,
              Authorization: `Bearer ${SUPABASE_DEV_KEY}`
            }
          });
        } catch(e) {
          console.error('[DEV SERVER] Error eliminando en Supabase:', e);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ ok: true, deleted: folio || id }));
    }

    if (req.method === 'PATCH') {
      const folio = urlObj.searchParams.get('folio');
      const id = urlObj.searchParams.get('id');
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const patchData = JSON.parse(body || '{}');
          if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY && (folio || id)) {
            const param = folio ? `folio=eq.${encodeURIComponent(folio)}` : `id=eq.${encodeURIComponent(id)}`;
            await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas?${param}`, {
              method: 'PATCH',
              headers: {
                apikey: SUPABASE_DEV_KEY,
                Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(patchData)
            });
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true, patched: folio || id, data: patchData }));
        } catch(e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }
  }

  // API ROUTE: Obtener clave pública VAPID
  if (pathname === '/api/tens/vapid-key') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, publicKey: VAPID_PUBLIC_KEY }));
  }

  // API ROUTE: Suscribir dispositivo a Notificaciones Push
  if (pathname === '/api/tens/push-subscribe') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const sub = JSON.parse(body || '{}');
        if (sub && sub.endpoint) {
          saveLocalSub(sub);

          // Si la tabla push_subscriptions existe en Supabase, guardar también allí
          if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY) {
            try {
              await fetch(`${SUPABASE_DEV_URL}/rest/v1/push_subscriptions`, {
                method: 'POST',
                headers: {
                  apikey: SUPABASE_DEV_KEY,
                  Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                  endpoint: sub.endpoint,
                  p256dh: sub.keys ? sub.keys.p256dh : '',
                  auth: sub.keys ? sub.keys.auth : ''
                })
              });
            } catch(e){}
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Dispositivo registrado para recibir alertas Push' }));
      } catch(err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API ROUTE: Disparar alerta de prueba remota Push al celular
  if (pathname === '/api/tens/push-trigger') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const payload = {
          title: data.title || '🚨 ¡Nueva Reserva Asignada!',
          body: data.body || 'Nuevo servicio agendado por cliente en la web. Toca para ver la ficha.',
          icon: '/apple-touch-icon.png',
          badge: '/favicon-32x32.png',
          url: '/tens.html'
        };
        const results = await dispatchPushToAll(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, dispatched: results.length, results }));
      } catch(err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API ROUTE: Simular creación de nueva reserva en Supabase y emitir Push automático
  if (pathname === '/api/tens/nueva-reserva-test') {
    try {
      const folioNum = Math.floor(100 + Math.random() * 900);
      const nuevaReserva = {
        folio: `MSA-2611-${folioNum}`,
        fecha: new Date().toISOString().slice(0, 10),
        hora_recogida: '11:30',
        turno: 'mañana',
        modalidad: '1',
        modalidad_nombre: '1. Servicio Integral (Asistencia + Traslado)',
        paciente_nombre: 'Juan Carlos Pérez Miranda',
        paciente_edad: 74,
        paciente_telefono: '977665544',
        paciente_motivo: 'Evaluación Cardiológica de Urgencia',
        paciente_movilidad: 'Autovalente con apoyo de bastón',
        paciente_alergias: 'Alergia a AINEs (Ibuprofeno)',
        coordinador_nombre: 'Claudia Pérez (Hija)',
        coordinador_telefono: '912344321',
        ruta_origen: 'Av. Cristóbal Colón 4560, Las Condes',
        ruta_destino: 'Hospital Clínico FACH, Las Condes',
        km_estimado: 5.2,
        tiempo_espera: '2 horas',
        estado_terreno: 'pendiente'
      };

      // 1. Guardar en Supabase
      if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY) {
        await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_DEV_KEY,
            Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nuevaReserva)
        });
      }

      // 2. Disparar Notificación Push a los celulares
      const pushPayload = {
        title: '🚨 ¡Nueva Reserva Asignada!',
        body: `Folio ${nuevaReserva.folio}: ${nuevaReserva.paciente_nombre} (11:30 hrs). Toca para ver la ruta.`,
        icon: '/apple-touch-icon.png',
        badge: '/favicon-32x32.png',
        url: '/tens.html'
      };
      await dispatchPushToAll(pushPayload);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        ok: true,
        mensaje: 'Reserva creada en Supabase y notificación Push enviada',
        reserva: nuevaReserva
      }));
    } catch(err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // API ROUTE: Itinerario conectado a Supabase Dev
  if (pathname === '/api/tens/itinerario') {
    const fecha = urlObj.searchParams.get('fecha') || new Date().toISOString().slice(0, 10);
    try {
      const sbRes = await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas?order=hora_recogida.asc`, {
        headers: {
          apikey: SUPABASE_DEV_KEY,
          Authorization: `Bearer ${SUPABASE_DEV_KEY}`
        }
      });
      const rows = await sbRes.json();

      const servicios = (rows || []).map(row => ({
        id: row.folio || `res-${row.id}`,
        db_id: row.id,
        folio: row.folio,
        fecha: row.fecha,
        hora_recogida: row.hora_recogida,
        turno: row.turno,
        modalidad: row.modalidad,
        modalidad_nombre: row.modalidad_nombre || `Modalidad ${row.modalidad}`,
        paciente: {
          nombre: row.paciente_nombre,
          edad: row.paciente_edad,
          telefono: row.paciente_telefono,
          motivo: row.paciente_motivo,
          movilidad: row.paciente_movilidad,
          alergias: row.paciente_alergias || 'Sin alergias conocidas',
          conciencia: 'Lúcido / Orientado'
        },
        coordinador: {
          nombre: row.coordinador_nombre,
          telefono: row.coordinador_telefono
        },
        ruta: {
          origen: row.ruta_origen,
          destino: row.ruta_destino,
          km_estimado: row.km_estimado,
          tiempo_espera_contratado: row.tiempo_espera
        },
        estado_terreno: row.estado_terreno || 'pendiente'
      }));

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({
        ok: true,
        fecha,
        total: servicios.length,
        servicios,
        source: 'supabase_dev_live'
      }));
    } catch(err) {
      console.error('[DEV SERVER] Error consultando Supabase:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // API ROUTE: Eventos de terreno (Persiste en Supabase)
  if (pathname === '/api/tens/eventos') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { servicio_id, nuevo_estado, timestamp, notas, lat, lng } = data;

        console.log(`[SUPABASE DEV LIVE] Evento: ${servicio_id} -> ${nuevo_estado}`);

        await fetch(`${SUPABASE_DEV_URL}/rest/v1/eventos_terreno`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_DEV_KEY,
            Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            servicio_id,
            estado: nuevo_estado,
            notas: notas || null,
            latitud: lat || null,
            longitud: lng || null,
            timestamp: timestamp || new Date().toISOString()
          })
        });

        await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas?folio=eq.${encodeURIComponent(servicio_id)}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_DEV_KEY,
            Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            estado_terreno: nuevo_estado
          })
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, source: 'supabase_dev', nuevo_estado }));
      } catch(e){
        console.error('[DEV SERVER] Error guardando evento:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API ROUTE: Ficha clínica / signos vitales (Persiste en Supabase)
  if (pathname === '/api/tens/clinica') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log(`[SUPABASE DEV LIVE] Ficha Clínica ${data.momento.toUpperCase()} para: ${data.servicio_id}`);

        await fetch(`${SUPABASE_DEV_URL}/rest/v1/signos_vitales_tens`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_DEV_KEY,
            Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            servicio_id: data.servicio_id,
            momento: data.momento,
            pa_sistolica: data.pa_sistolica,
            pa_diastolica: data.pa_diastolica,
            frecuencia_cardiaca: data.fc,
            saturacion_oxigeno: data.sato2,
            hgt: data.hgt || null,
            eva_dolor: data.eva_dolor || 0,
            estado_conciencia: data.estado_conciencia,
            observaciones: data.observaciones || null,
            recibe_nombre: data.recibe_nombre || null,
            recibe_rut: data.recibe_rut || null
          })
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, source: 'supabase_dev', momento: data.momento }));
      } catch(e){
        console.error('[DEV SERVER] Error guardando clínica:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // STATIC FILES
  let filePath = path.join(BASE_DIR, pathname === '/' ? 'tens.html' : pathname.replace(/\//g, '\\'));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'tens.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SUPABASE + PUSH SERVER ACTIVO]`);
  console.log(`- Local:   http://localhost:${PORT}/tens.html`);
  console.log(`- Celular: http://192.168.100.49:${PORT}/tens.html`);
});
