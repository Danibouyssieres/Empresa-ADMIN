// =========================================================================
// API ENDPOINT: DESPACHO WEB PUSH A TRIPULACIÓN TENS (SERVERLESS NODE.JS)
// =========================================================================
const webpush = require('web-push');

const SUPABASE_DEV_URL = process.env.SUPABASE_DEV_URL || process.env.NEXT_PUBLIC_SUPABASE_DEV_URL || process.env.SUPABASE_URL || '';
const SUPABASE_DEV_KEY = process.env.SUPABASE_DEV_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contacto@movilidadysaludasistida.cl';

let vapidConfigured = false;
try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  }
} catch(e) {}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const payload = {
      title: data.title || '🚨 ¡Nueva Reserva Agendada!',
      body: data.body || 'Nuevo servicio agendado. Toca para ver la ruta e itinerario.',
      icon: '/apple-touch-icon.png',
      badge: '/favicon-32x32.png',
      url: '/tens.html'
    };

    let subs = [];
    if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY) {
      try {
        const r = await fetch(`${SUPABASE_DEV_URL}/rest/v1/push_subscriptions?select=*`, {
          headers: {
            apikey: SUPABASE_DEV_KEY,
            Authorization: `Bearer ${SUPABASE_DEV_KEY}`
          }
        });
        const rows = await r.json();
        if (Array.isArray(rows)) {
          subs = rows.map(row => ({
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          }));
        }
      } catch(e) {}
    }

    const results = [];
    if (vapidConfigured && subs.length > 0) {
      for (const s of subs) {
        try {
          await webpush.sendNotification(s, JSON.stringify(payload));
          results.push({ ok: true, endpoint: s.endpoint.slice(0, 30) });
        } catch(err) {
          results.push({ ok: false, error: err.message });
        }
      }
    }

    return res.status(200).json({
      ok: true,
      total_subs: subs.length,
      dispatched: results.length,
      results
    });
  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
