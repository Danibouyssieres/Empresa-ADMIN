// api/blocks.js - Vercel Edge API para Persistencia Centralizada de Bloqueos de Disponibilidad
// Configurado con runtime 'edge' para máxima velocidad y cumplimiento estricto de WHATWG URL API sin advertencias de Node.js

export const config = {
  runtime: 'edge',
};

// Almacenamiento en memoria para instancias Edge
let edgeBlocksStore = [
  { id: 101, date: '2026-11-06', type: 'tarde', reason: 'Mantención móvil / Turno Tarde bloqueado' },
  { id: 102, date: '2026-11-06', type: 'noche', reason: 'Mantención móvil / Turno Noche bloqueado' }
];

export default async function handler(req) {
  const url = new URL(req.url);
  const method = req.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const date = url.searchParams.get('date');
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    // 1. GET: Consultar bloqueos activos
    if (method === 'GET') {
      if (supabaseUrl && supabaseKey) {
        let sbUrl = `${supabaseUrl}/rest/v1/bloqueos?select=*`;
        if (date) sbUrl += `&date=eq.${encodeURIComponent(date)}`;
        sbUrl += '&order=date.asc,id.asc';
        const sbRes = await fetch(sbUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        if (sbRes.ok) {
          const data = await sbRes.json();
          return new Response(JSON.stringify({ ok: true, source: 'supabase', data }), {
            status: 200,
            headers: corsHeaders,
          });
        }
      }
      let results = [...edgeBlocksStore];
      if (date) results = results.filter(b => b.date === date);
      return new Response(JSON.stringify({ ok: true, source: 'edge-store', data: results }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 2. POST: Crear o actualizar bloqueo
    if (method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const newBlock = {
        date: body.date,
        type: body.type || 'full',
        reason: body.reason || 'Sin motivo especificado',
        created_at: new Date().toISOString(),
      };
      if (!newBlock.date || !newBlock.type) {
        return new Response(JSON.stringify({ ok: false, error: 'Campos date y type son requeridos' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (supabaseUrl && supabaseKey) {
        if (newBlock.type === 'full') {
          await fetch(`${supabaseUrl}/rest/v1/bloqueos?date=eq.${encodeURIComponent(newBlock.date)}`, {
            method: 'DELETE',
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          });
        } else {
          await fetch(`${supabaseUrl}/rest/v1/bloqueos?date=eq.${encodeURIComponent(newBlock.date)}&type=in.(${newBlock.type},full)`, {
            method: 'DELETE',
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          });
        }

        const sbRes = await fetch(`${supabaseUrl}/rest/v1/bloqueos`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(newBlock),
        });
        if (sbRes.ok) {
          const data = await sbRes.json();
          return new Response(JSON.stringify({ ok: true, source: 'supabase', data }), {
            status: 200,
            headers: corsHeaders,
          });
        }
      }

      if (newBlock.type === 'full') {
        edgeBlocksStore = edgeBlocksStore.filter(b => b.date !== newBlock.date);
      } else {
        edgeBlocksStore = edgeBlocksStore.filter(b => !(b.date === newBlock.date && (b.type === newBlock.type || b.type === 'full')));
      }
      edgeBlocksStore.push({ id: Date.now(), ...newBlock });
      return new Response(JSON.stringify({ ok: true, source: 'edge-store', data: newBlock }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 3. DELETE: Desbloquear
    if (method === 'DELETE') {
      if (supabaseUrl && supabaseKey) {
        let sbUrl = `${supabaseUrl}/rest/v1/bloqueos?`;
        if (id) sbUrl += `id=eq.${encodeURIComponent(id)}`;
        else if (date && type) sbUrl += `date=eq.${encodeURIComponent(date)}&type=eq.${encodeURIComponent(type)}`;
        else if (date) sbUrl += `date=eq.${encodeURIComponent(date)}`;
        await fetch(sbUrl, {
          method: 'DELETE',
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        });
      }
      if (id) edgeBlocksStore = edgeBlocksStore.filter(b => String(b.id) !== String(id));
      else if (date && type) edgeBlocksStore = edgeBlocksStore.filter(b => !(b.date === date && b.type === type));
      else if (date) edgeBlocksStore = edgeBlocksStore.filter(b => b.date !== date);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
