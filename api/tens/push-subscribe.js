// =========================================================================
// API ENDPOINT: SUSCRIPCIÓN PUSH EN SUPABASE (SERVERLESS)
// =========================================================================
const SUPABASE_DEV_URL = process.env.SUPABASE_DEV_URL || process.env.NEXT_PUBLIC_SUPABASE_DEV_URL || process.env.SUPABASE_URL || '';
const SUPABASE_DEV_KEY = process.env.SUPABASE_DEV_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const sub = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
    }

    if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY) {
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
    }

    return res.status(200).json({ ok: true, message: 'Dispositivo registrado para recibir alertas Push' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
