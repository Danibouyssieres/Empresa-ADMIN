// api/blocks.js - Vercel Serverless Function para Persistencia Centralizada de Bloqueos de Disponibilidad
// Soporta Supabase REST API (vía variables de entorno) y fallback de memoria en Vercel

let memoryStore = global.__BLOCKS_STORE || [];
global.__BLOCKS_STORE = memoryStore;

module.exports = async function handler(req, res) {
  // Configuración de cabeceras CORS para permitir peticiones desde la web pública y panel administrativo
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabase = !!(supabaseUrl && supabaseKey);

  try {
    // 1. GET: Consultar bloqueos activos (opcionalmente filtrados por fecha ?date=YYYY-MM-DD)
    if (req.method === 'GET') {
      const { date } = req.query || {};

      if (hasSupabase) {
        let endpoint = `${supabaseUrl}/rest/v1/bloqueos?select=*`;
        if (date) {
          endpoint += `&date=eq.${encodeURIComponent(date)}`;
        }
        endpoint += '&order=date.asc,id.asc';

        const sbRes = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (sbRes.ok) {
          const data = await sbRes.json();
          return res.status(200).json({ ok: true, source: 'supabase', data: Array.isArray(data) ? data : [] });
        }
      }

      // Fallback a memoria si no hay Supabase configurado en env
      let results = [...memoryStore];
      if (date) {
        results = results.filter(b => b.date === date);
      }
      return res.status(200).json({ ok: true, source: 'memory', data: results });
    }

    // 2. POST: Crear o actualizar un bloqueo manual
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      const { date, type, reason } = body;
      if (!date || !type) {
        return res.status(400).json({ ok: false, error: 'Campos date y type son requeridos' });
      }

      const newBlock = {
        date: String(date).trim(),
        type: String(type).trim(),
        reason: (reason || 'Sin motivo especificado').toString().trim(),
        created_at: new Date().toISOString()
      };

      if (hasSupabase) {
        // En Supabase: si es 'full', removemos cualquier turno previo de esa fecha
        if (newBlock.type === 'full') {
          await fetch(`${supabaseUrl}/rest/v1/bloqueos?date=eq.${encodeURIComponent(newBlock.date)}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
        } else {
          // Si es turno específico, eliminamos full o duplicado del mismo turno
          await fetch(`${supabaseUrl}/rest/v1/bloqueos?date=eq.${encodeURIComponent(newBlock.date)}&type=in.(${newBlock.type},full)`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
        }

        const sbRes = await fetch(`${supabaseUrl}/rest/v1/bloqueos`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(newBlock)
        });

        if (sbRes.ok) {
          const inserted = await sbRes.json();
          return res.status(200).json({ ok: true, source: 'supabase', data: inserted });
        }
      }

      // Fallback a memoria
      if (newBlock.type === 'full') {
        memoryStore = memoryStore.filter(b => b.date !== newBlock.date);
      } else {
        memoryStore = memoryStore.filter(b => !(b.date === newBlock.date && (b.type === newBlock.type || b.type === 'full')));
      }
      const entry = { id: Date.now(), ...newBlock };
      memoryStore.push(entry);
      global.__BLOCKS_STORE = memoryStore;

      return res.status(200).json({ ok: true, source: 'memory', data: entry });
    }

    // 3. DELETE: Eliminar bloqueo por id o fecha (+ tipo)
    if (req.method === 'DELETE') {
      const { id, date, type } = req.query || {};

      if (hasSupabase) {
        let endpoint = `${supabaseUrl}/rest/v1/bloqueos?`;
        if (id) {
          endpoint += `id=eq.${encodeURIComponent(id)}`;
        } else if (date && type) {
          endpoint += `date=eq.${encodeURIComponent(date)}&type=eq.${encodeURIComponent(type)}`;
        } else if (date) {
          endpoint += `date=eq.${encodeURIComponent(date)}`;
        } else {
          return res.status(400).json({ ok: false, error: 'Parámetro id o date requerido para desbloquear' });
        }

        const sbRes = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (sbRes.ok) {
          return res.status(200).json({ ok: true, source: 'supabase' });
        }
      }

      // Fallback a memoria
      if (id) {
        memoryStore = memoryStore.filter(b => String(b.id) !== String(id));
      } else if (date && type) {
        memoryStore = memoryStore.filter(b => !(b.date === date && b.type === type));
      } else if (date) {
        memoryStore = memoryStore.filter(b => b.date !== date);
      }
      global.__BLOCKS_STORE = memoryStore;

      return res.status(200).json({ ok: true, source: 'memory' });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/blocks:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
