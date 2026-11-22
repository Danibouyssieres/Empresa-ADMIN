/**
 * scripts/keep-alive-supabase.js
 * MSA - Keep-Alive Heartbeat para Supabase (Dual: Producción y Desarrollo)
 * 
 * Realiza una consulta liviana de solo lectura (SELECT id FROM reservas LIMIT 1)
 * a la API REST de Supabase (PostgREST) para registrar actividad constante en el servidor
 * y prevenir el pausado automático por inactividad en la capa gratuita (Free Tier).
 * 
 * Sin impacto: No inserta, modifica ni borra ningún dato. No altera la agenda ni notificaciones.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Leer configuración local si existe
let devConfig = {};
try {
  const configPath = path.resolve(__dirname, '../dev-config.json');
  if (fs.existsSync(configPath)) {
    devConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {}

// Lista de proyectos a mantener despiertos:
// 1. Producción: movilidad-salud-asistida (doesbrltwelcocaocykf)
// 2. Desarrollo / Laboratorio: empresa-tens-dev (iculxhwrvzeokgvpdzlq)
const targets = [];

// Proyecto Producción
const prodUrl = process.env.SUPABASE_PROD_URL || process.env.SUPABASE_URL || 'https://doesbrltwelcocaocykf.supabase.co';
const prodKey = process.env.SUPABASE_PROD_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || devConfig.SUPABASE_PROD_KEY;
if (prodKey) {
  targets.push({ name: 'Producción (movilidad-salud-asistida)', url: prodUrl, key: prodKey });
}

// Proyecto Dev
const devUrl = process.env.SUPABASE_DEV_URL || devConfig.SUPABASE_DEV_URL || 'https://iculxhwrvzeokgvpdzlq.supabase.co';
const devKey = process.env.SUPABASE_DEV_KEY || devConfig.SUPABASE_DEV_KEY;
if (devKey) {
  targets.push({ name: 'Desarrollo (empresa-tens-dev)', url: devUrl, key: devKey });
}

// Si no se encontró ninguna key específica pero hay SUPABASE_KEY genérica
if (targets.length === 0 && process.env.SUPABASE_KEY) {
  targets.push({
    name: 'Supabase Default',
    url: process.env.SUPABASE_URL || 'https://doesbrltwelcocaocykf.supabase.co',
    key: process.env.SUPABASE_KEY
  });
}

if (targets.length === 0) {
  console.error(`[${new Date().toISOString()}] ❌ Error: No se encontraron credenciales de Supabase para ejecutar Keep-Alive.`);
  process.exit(1);
}

function pingTarget(target) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const targetUrl = new URL('/rest/v1/reservas?select=id&limit=1', target.url);

    const options = {
      hostname: targetUrl.hostname,
      path: targetUrl.pathname + targetUrl.search,
      method: 'GET',
      headers: {
        'apikey': target.key,
        'Authorization': `Bearer ${target.key}`,
        'User-Agent': 'MSA-KeepAlive-Heartbeat/2.0'
      },
      timeout: 10000
    };

    console.log(`[${new Date().toISOString()}] 💓 Enviando ping Keep-Alive a [${target.name}] (${targetUrl.hostname})...`);

    const req = https.request(options, (res) => {
      let rawBody = '';
      res.on('data', chunk => rawBody += chunk);
      res.on('end', () => {
        const elapsedMs = Date.now() - startTime;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[${new Date().toISOString()}] ✅ [${target.name}] respondió OK (HTTP ${res.statusCode}) en ${elapsedMs}ms.`);
          console.log(`[${new Date().toISOString()}] 📊 Actividad registrada en base de datos. Servidor activo.`);
          resolve();
        } else {
          console.error(`[${new Date().toISOString()}] ⚠️ [${target.name}] respondió con código HTTP ${res.statusCode}: ${rawBody}`);
          // Resolvemos de todas formas para permitir que otros targets continúen
          resolve();
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`[${new Date().toISOString()}] ❌ Timeout tras 10 segundos conectando a [${target.name}].`);
      resolve();
    });

    req.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] ❌ Error en petición HTTPS a [${target.name}]: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function runAll() {
  for (const t of targets) {
    await pingTarget(t);
  }
  console.log(`[${new Date().toISOString()}] 🏁 Proceso Keep-Alive finalizado exitosamente.`);
  process.exit(0);
}

runAll();
