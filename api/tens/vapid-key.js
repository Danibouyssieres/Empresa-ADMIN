// =========================================================================
// API ENDPOINT: CLAVE PÚBLICA VAPID (SERVERLESS)
// =========================================================================
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.status(200).json({
    ok: true,
    publicKey: VAPID_PUBLIC_KEY
  });
};
