// =========================================================================
// API ENDPOINT: SIMULACIÓN DE RESERVA PARA TEST TENS (SERVERLESS)
// =========================================================================
const SUPABASE_DEV_URL = process.env.SUPABASE_DEV_URL || process.env.NEXT_PUBLIC_SUPABASE_DEV_URL || process.env.SUPABASE_URL || '';
const SUPABASE_DEV_KEY = process.env.SUPABASE_DEV_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const folioNum = Math.floor(100 + Math.random() * 900);
    const folio = `MSA-2611-${folioNum}`;
    const nuevaReserva = {
      folio,
      fecha: new Date().toISOString().slice(0, 10),
      hora_recogida: '11:30',
      turno: 'mañana',
      modalidad: '1',
      modalidad_nombre: '1. Servicio Integral (Asistencia + Traslado)',
      paciente_nombre: 'Juan Carlos Pérez Miranda',
      paciente_edad: 74,
      paciente_telefono: '977665544',
      paciente_motivo: 'Evaluación Cardiológica de Urgencia',
      paciente_movilidad: 'Autovalente con apoyo de bastón',
      paciente_alergias: 'Alergia a AINEs (Ibuprofeno)',
      coordinador_nombre: 'Claudia Pérez (Hija)',
      coordinador_telefono: '912344321',
      ruta_origen: 'Av. Cristóbal Colón 4560, Las Condes',
      ruta_destino: 'Hospital Clínico FACH, Las Condes',
      km_estimado: 5.2,
      tiempo_espera: '2 horas',
      estado_terreno: 'pendiente',
      estado_pago: 'confirmada'
    };

    if (SUPABASE_DEV_URL && SUPABASE_DEV_KEY) {
      await fetch(`${SUPABASE_DEV_URL}/rest/v1/reservas`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_DEV_KEY,
          Authorization: `Bearer ${SUPABASE_DEV_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nuevaReserva)
      });
    }

    // Trigger push notification internally
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const triggerUrl = `${protocol}://${host}/api/tens/push-trigger`;
    
    fetch(triggerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🚨 ¡Nueva Reserva Asignada!',
        body: `Folio ${folio}: ${nuevaReserva.paciente_nombre} (11:30 hrs). Toca para ver la ruta.`
      })
    }).catch(() => {});

    return res.status(200).json({
      ok: true,
      mensaje: 'Reserva simulada creada con éxito',
      reserva: nuevaReserva
    });
  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
