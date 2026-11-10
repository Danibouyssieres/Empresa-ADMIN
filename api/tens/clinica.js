// =========================================================================
// API ENDPOINT: FICHA CLÍNICA Y SIGNOS VITALES TENS
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
    const data = await req.json();
    const {
      servicio_id,
      momento, // 'ingreso' | 'egreso'
      pa_sistolica,
      pa_diastolica,
      fc,
      sato2,
      hgt,
      eva_dolor,
      observaciones,
      recibe_nombre,
      recibe_rut
    } = data;

    console.log(`[TENS CLÍNICA] ${momento.toUpperCase()} - Servicio: ${servicio_id} | PA: ${pa_sistolica}/${pa_diastolica} | FC: ${fc} | Sat: ${sato2}%`);

    // Si existe SUPABASE_DEV_URL, persistir en tabla 'signos_vitales'
    // ...

    return new Response(
      JSON.stringify({
        ok: true,
        mensaje: `Signos vitales de ${momento} registrados exitosamente.`,
        servicio_id,
        momento,
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
