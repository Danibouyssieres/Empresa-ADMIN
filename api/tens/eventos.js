// =========================================================================
// API ENDPOINT: REGISTRO DE EVENTOS Y ESTADOS EN TERRENO (SUPABASE DEV)
// =========================================================================
export const config = {
  runtime: 'edge',
};

const SUPABASE_DEV_URL = process.env.SUPABASE_DEV_URL || process.env.NEXT_PUBLIC_SUPABASE_DEV_URL || '';
const SUPABASE_DEV_KEY = process.env.SUPABASE_DEV_KEY || process.env.SUPABASE_DEV_ANON_KEY || '';

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { servicio_id, nuevo_estado, timestamp, notas, lat, lng } = body;

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

    return new Response(
      JSON.stringify({
        ok: true,
        source: 'supabase_dev_live',
        mensaje: `Estado actualizado a '${nuevo_estado}'`,
        servicio_id,
        nuevo_estado,
        synced_at: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: corsHeaders }
    );
  }
}
