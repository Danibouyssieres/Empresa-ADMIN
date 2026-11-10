// =========================================================================
// API ENDPOINT: REGISTRO DE EVENTOS Y ESTADOS EN TERRENO
// =========================================================================
export const config = {
  runtime: 'edge',
};

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

    console.log(`[TENS EVENTO] Servicio: ${servicio_id} -> ${nuevo_estado} (${timestamp || new Date().toISOString()})`);

    // Si existe SUPABASE_DEV_URL, persistir en tabla de desarrollo 'eventos_bitacora'
    // ...

    return new Response(
      JSON.stringify({
        ok: true,
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
