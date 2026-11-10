// =========================================================================
// API ENDPOINT: FICHA CLÍNICA Y SIGNOS VITALES TENS (SUPABASE DEV)
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
    const data = await req.json();

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

    return new Response(
      JSON.stringify({
        ok: true,
        source: 'supabase_dev_live',
        mensaje: `Signos vitales de ${data.momento} registrados en Supabase.`,
        servicio_id: data.servicio_id,
        momento: data.momento,
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
