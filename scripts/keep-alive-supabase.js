/**
 * scripts/keep-alive-supabase.js
 * MSA - Keep-Alive Heartbeat para Supabase (empresa-tens-dev)
 * 
 * Realiza una consulta liviana de solo lectura (SELECT id FROM reservas LIMIT 1)
 * a la API REST de Supabase (PostgREST) para registrar actividad constante en el servidor
 * y prevenir el pausado automático por inactividad en la capa gratuita.
 * 
 * Sin impacto: No inserta, modifica ni borra ningún dato. No altera la agenda ni notificaciones.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

let SUPABASE_URL = process.env.SUPABASE_URL || 'https://iculxhwrvzeokgvpdzlq.supabase.co';
let SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_DEV_KEY;

// Si no viene por variable de entorno, intentar leer dev-config.json local
if (!SUPABASE_KEY) {
  try {
    const configPath = path.resolve(__dirname, '../dev-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.SUPABASE_DEV_URL) SUPABASE_URL = config.SUPABASE_DEV_URL;
      if (config.SUPABASE_DEV_KEY) SUPABASE_KEY = config.SUPABASE_DEV_KEY;
    }
  } catch (e) {}
}

if (!SUPABASE_KEY) {
  console.error(`[${new Date().toISOString()}] ❌ Error: Variable SUPABASE_KEY no definida ni dev-config.json disponible.`);
  process.exit(1);
}

function pingSupabase() {
  const startTime = Date.now();
  const targetUrl = new URL('/rest/v1/reservas?select=id&limit=1', SUPABASE_URL);

  const options = {
    hostname: targetUrl.hostname,
    path: targetUrl.pathname + targetUrl.search,
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'User-Agent': 'MSA-KeepAlive-Heartbeat/1.0'
    },
    timeout: 10000
  };

  console.log(`[${new Date().toISOString()}] 💓 Iniciando ping Keep-Alive a Supabase: ${targetUrl.hostname}...`);

  const req = https.request(options, (res) => {
    let rawBody = '';
    res.on('data', chunk => rawBody += chunk);
    res.on('end', () => {
      const elapsedMs = Date.now() - startTime;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[${new Date().toISOString()}] ✅ Supabase respondio OK (HTTP ${res.statusCode}) en ${elapsedMs}ms.`);
        console.log(`[${new Date().toISOString()}] 📊 Actividad registrada en base de datos. Servidor activo.`);
        process.exit(0);
      } else {
        console.error(`[${new Date().toISOString()}] ⚠️ Supabase respondio con codigo HTTP ${res.statusCode}: ${rawBody}`);
        process.exit(1);
      }
    });
  });

  req.on('timeout', () => {
    req.destroy();
    console.error(`[${new Date().toISOString()}] ❌ Timeout tras 10 segundos conectando a Supabase.`);
    process.exit(1);
  });

  req.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] ❌ Error en la peticion HTTPS: ${err.message}`);
    process.exit(1);
  });

  req.end();
}

pingSupabase();
