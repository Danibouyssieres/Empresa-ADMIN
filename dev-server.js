const http = require('http');
const fs = require('fs');
const path = require('path');

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

  // API ROUTE: Itinerario conectado a Supabase Dev
  if (pathname === '/api/tens/itinerario') {
    const fecha = urlObj.searchParams.get('fecha') || new Date().toISOString().slice(0, 10);
    try {
      // Consultar la tabla reservas en Supabase
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

  // API ROUTE: Eventos de terreno (Persiste en Supabase en tiempo real)
  if (pathname === '/api/tens/eventos') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { servicio_id, nuevo_estado, timestamp, notas, lat, lng } = data;

        console.log(`[SUPABASE DEV LIVE] Evento: ${servicio_id} -> ${nuevo_estado}`);

        // 1. Guardar en eventos_terreno
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

        // 2. Actualizar estado en reservas
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
  console.log(`[SUPABASE CONECTADO] Servidor TENS activo en:`);
  console.log(`- Local:   http://localhost:${PORT}/tens.html`);
  console.log(`- Celular: http://192.168.100.49:${PORT}/tens.html`);
});
