// api/keep-alive.js - Endpoint Edge para Ping Keep-Alive automático en Supabase
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const supabaseUrl = (
    process.env.SUPABASE_DEV_URL ||
    process.env.SUPABASE_URL ||
    'https://iculxhwrvzeokgvpdzlq.supabase.co'
  ).replace(/\/+$/, '');

  const supabaseKey = (
    process.env.SUPABASE_DEV_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    req.headers.get('apikey') ||
    new URL(req.url).searchParams.get('apikey') ||
    ''
  ).trim();

  if (!supabaseKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'SUPABASE_KEY no configurada en variables de entorno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/reservas?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    const elapsedMs = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => []);
      return new Response(
        JSON.stringify({
          ok: true,
          status: 'online',
          message: 'Supabase ping keep-alive registrado exitosamente',
          elapsedMs,
          timestamp: new Date().toISOString(),
          recordCount: data.length
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    } else {
      const errText = await res.text().catch(() => '');
      return new Response(
        JSON.stringify({ ok: false, status: res.status, error: errText }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
