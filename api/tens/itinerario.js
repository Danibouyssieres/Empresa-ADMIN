// =========================================================================
// API ENDPOINT: ITINERARIO Y HOJA DE RUTA DIARIA TENS (SUPABASE DEV)
// =========================================================================
export const config = {
  runtime: 'edge',
};

const SUPABASE_DEV_URL = process.env.SUPABASE_DEV_URL || process.env.NEXT_PUBLIC_SUPABASE_DEV_URL || '';
const SUPABASE_DEV_KEY = process.env.SUPABASE_DEV_KEY || process.env.SUPABASE_DEV_ANON_KEY || '';

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get('fecha') || new Date().toISOString().slice(0, 10);

  try {
    const sbRes = await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas?order=hora_recogida.asc`, {
      headers: {
        apikey: SUPABASE_DEV_KEY,
        Authorization: `Bearer ${SUPABASE_DEV_KEY}`
      }
    });

    const rows = await sbRes.json();
    const servicios = (rows || []).map(row => ({
      id: row.folio || `res-${row.id}`,
      db_id: row.id,
      folio: row.folio,
      fecha: row.fecha,
      hora_recogida: row.hora_recogida,
      turno: row.turno,
      modalidad: row.modalidad,
      modalidad_nombre: row.modalidad_nombre || `Modalidad ${row.modalidad}`,
      paciente: {
        nombre: row.paciente_nombre,
        edad: row.paciente_edad,
        telefono: row.paciente_telefono,
        motivo: row.paciente_motivo,
        movilidad: row.paciente_movilidad,
        alergias: row.paciente_alergias || 'Sin alergias conocidas',
        conciencia: 'Lúcido / Orientado'
      },
      coordinador: {
        nombre: row.coordinador_nombre,
        telefono: row.coordinador_telefono
      },
      ruta: {
        origen: row.ruta_origen,
        destino: row.ruta_destino,
        km_estimado: row.km_estimado,
        tiempo_espera_contratado: row.tiempo_espera
      },
      estado_terreno: row.estado_terreno || 'pendiente'
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        fecha,
        total: servicios.length,
        servicios,
        source: 'supabase_dev_live'
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
