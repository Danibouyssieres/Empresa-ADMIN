// =========================================================================
// API ENDPOINT: ITINERARIO Y HOJA DE RUTA DIARIA TENS
// =========================================================================
export const config = {
  runtime: 'edge',
};

// Datos muestra de prueba inmediata (Modo Desarrollo sin base de datos)
const MOCK_SERVICIOS = [
  {
    id: 'res-mock-1',
    folio: 'MSA-2611-001',
    fecha: new Date().toISOString().slice(0, 10),
    hora_recogida: '08:30',
    turno: 'mañana',
    modalidad: '1',
    modalidad_nombre: '1. Servicio Integral (Asistencia + Traslado)',
    paciente: {
      nombre: 'Rosa María Medina Soto',
      edad: 78,
      telefono: '987654321',
      motivo: 'Control Traumatología y Retiro de Puntos',
      movilidad: 'Silla de Ruedas del móvil',
      alergias: 'Penicilina, Látex',
      conciencia: 'Lúcido / Orientado'
    },
    coordinador: {
      nombre: 'Andrea Medina (Hija)',
      telefono: '912345678'
    },
    ruta: {
      origen: 'Av. Las Condes 12345, Las Condes',
      origen_comuna: 'Las Condes',
      destino: 'Clínica Las Condes, Edificio Central, Estoril 450',
      destino_comuna: 'Las Condes',
      km_estimado: 12.4,
      tiempo_espera_contratado: '2 horas'
    },
    estado_terreno: 'pendiente', // 'en_camino', 'en_domicilio', 'en_traslado', 'en_espera', 'finalizado'
    signos_ingreso: null,
    signos_egreso: null
  },
  {
    id: 'res-mock-2',
    folio: 'MSA-2611-002',
    fecha: new Date().toISOString().slice(0, 10),
    hora_recogida: '15:00',
    turno: 'tarde',
    modalidad: '2',
    modalidad_nombre: '2. Traslado Exclusivo con Espera',
    paciente: {
      nombre: 'Carlos Alberto Valenzuela',
      edad: 82,
      telefono: '998877665',
      motivo: 'Sesión de Quimioterapia Ambulatoria',
      movilidad: 'Camina con dificultad / Andador del servicio',
      alergias: 'Sin alergias conocidas',
      conciencia: 'Lúcido / Orientado'
    },
    coordinador: {
      nombre: 'Carlos Valenzuela Jr.',
      telefono: '987112233'
    },
    ruta: {
      origen: 'Av. Providencia 2150, Depto 804, Providencia',
      origen_comuna: 'Providencia',
      destino: 'Instituto Oncológico FALP, Rancagua 878, Providencia',
      destino_comuna: 'Providencia',
      km_estimado: 6.8,
      tiempo_espera_contratado: '3 horas'
    },
    estado_terreno: 'pendiente',
    signos_ingreso: null,
    signos_egreso: null
  }
];

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

  // Si en el futuro existe SUPABASE_DEV_URL, aquí se consulta la base de datos dev
  const supabaseDevUrl = process.env.SUPABASE_DEV_URL;
  if (supabaseDevUrl) {
    // Consulta a base de datos de desarrollo
  }

  // Fallback desarrollo / mock inmediato
  const serviciosHoy = MOCK_SERVICIOS.map(s => ({ ...s, fecha }));

  return new Response(
    JSON.stringify({
      ok: true,
      fecha,
      total: serviciosHoy.length,
      servicios: serviciosHoy,
      modo: 'desarrollo_mock'
    }),
    { status: 200, headers: corsHeaders }
  );
}
