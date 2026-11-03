/**
 * js/blocks-api.js
 * Capa de persistencia centralizada en tiempo real para bloqueos de agenda y disponibilidad.
 * Conecta con Supabase (REST / SDK) y con la API Serverless /api/blocks en Vercel,
 * con fallback bidireccional y resiliencia sin dependencias bloqueantes.
 */

(function(global) {
  'use strict';

  var LS_STATE_KEY = 'msa-state-v3';
  var LS_SB_URL = 'msa_supabase_url';
  var LS_SB_KEY = 'msa_supabase_key';
  var LS_LAST_UPDATE = 'msa-last-block-update';

  var MsaBlocksService = {
    _client: null,

    // Obtener credenciales configuradas
    getConfig: function() {
      var url = '';
      var key = '';
      try {
        url = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_SB_URL)) || (global.MSA_SUPABASE_URL || '');
        key = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_SB_KEY)) || (global.MSA_SUPABASE_KEY || '');
      } catch (e) {}
      return { url: (url || '').trim(), key: (key || '').trim() };
    },

    // Guardar credenciales de Supabase
    setConfig: function(url, key) {
      try {
        if (typeof localStorage !== 'undefined') {
          if (url) localStorage.setItem(LS_SB_URL, url.trim());
          else localStorage.removeItem(LS_SB_URL);
          if (key) localStorage.setItem(LS_SB_KEY, key.trim());
          else localStorage.removeItem(LS_SB_KEY);
        }
      } catch (e) {}
      this._client = null;
    },

    // Instancia del cliente Supabase si la librería CDN está presente y hay credenciales
    getSupabaseClient: function() {
      if (this._client) return this._client;
      var conf = this.getConfig();
      if (conf.url && conf.key && global.supabase && typeof global.supabase.createClient === 'function') {
        try {
          this._client = global.supabase.createClient(conf.url, conf.key);
          return this._client;
        } catch (e) {
          console.warn('[MsaBlocksService] Error al crear cliente Supabase:', e);
        }
      }
      return null;
    },

    // Normalizar estructura de bloqueos
    normalizeBlock: function(b, idx) {
      if (!b) return null;
      var rawDate = b.date || b.fecha || '';
      if (!rawDate) return null;
      return {
        id: b.id || b.ID || ('blk_' + (b.date || b.fecha) + '_' + (b.type || b.tipo) + '_' + (idx || 0)),
        date: String(rawDate).trim(),
        type: String(b.type || b.tipo || 'full').trim(),
        reason: String(b.reason || b.motivo || 'Sin motivo especificado').trim(),
        tid: b.tid || 'all',
        createdAt: b.created_at || b.createdAt || new Date().toISOString()
      };
    },

    // 1. Consultar bloqueos activos desde backend centralizado
    fetchBlocks: async function(dateFilter) {
      var blocks = [];
      var fetchedSuccess = false;

      // Intento A: Supabase Client Directo (si está configurado)
      var sb = this.getSupabaseClient();
      if (sb) {
        try {
          var query = sb.from('bloqueos').select('*');
          if (dateFilter) {
            query = query.eq('date', dateFilter);
          }
          var resSb = await query;
          if (!resSb.error && Array.isArray(resSb.data)) {
            blocks = resSb.data.map(this.normalizeBlock).filter(Boolean);
            fetchedSuccess = true;
          }
        } catch (errSb) {
          console.warn('[MsaBlocksService] Supabase query falló, probando API:', errSb);
        }
      }

      // Intento B: Endpoint API Serverless de Vercel (/api/blocks)
      if (!fetchedSuccess && typeof fetch === 'function') {
        try {
          var url = '/api/blocks';
          if (dateFilter) {
            url += '?date=' + encodeURIComponent(dateFilter);
          }
          var resApi = await fetch(url, { method: 'GET' });
          if (resApi.ok) {
            var json = await resApi.json();
            if (json && json.ok && Array.isArray(json.data)) {
              blocks = json.data.map(this.normalizeBlock).filter(Boolean);
              fetchedSuccess = true;
            }
          }
        } catch (errApi) {
          // Servidor local o entorno estático sin backend API
        }
      }

      // Intento C: Fallback a localStorage local si no hubo respuesta remota
      if (!fetchedSuccess) {
        try {
          if (typeof localStorage !== 'undefined') {
            var localState = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
            var localArr = Array.isArray(localState.blocks) ? localState.blocks : [];
            if (dateFilter) {
              blocks = localArr.filter(function(b) { return b.date === dateFilter; });
            } else {
              blocks = localArr;
            }
          }
        } catch (e) {}
      } else {
        // Si obtuvimos datos del backend remoto, sincronizamos el localStorage local
        this._mergeIntoLocalCache(blocks, dateFilter);
      }

      return blocks;
    },

    // 2. Persistir nuevo bloqueo en la base de datos central
    saveBlock: async function(block) {
      var norm = this.normalizeBlock(block);
      if (!norm) return { ok: false, error: 'Bloqueo inválido' };

      // Actualizar localStorage inmediatamente (optimistic UI)
      this._updateLocalBlock(norm);

      var remoteSuccess = false;

      // Intento A: Supabase Client
      var sb = this.getSupabaseClient();
      if (sb) {
        try {
          // Si es día completo, eliminamos turnos individuales
          if (norm.type === 'full') {
            await sb.from('bloqueos').delete().eq('date', norm.date);
          } else {
            await sb.from('bloqueos').delete().eq('date', norm.date).in('type', [norm.type, 'full']);
          }

          var insRes = await sb.from('bloqueos').insert([{
            date: norm.date,
            type: norm.type,
            reason: norm.reason,
            created_at: new Date().toISOString()
          }]).select();

          if (!insRes.error) {
            remoteSuccess = true;
          }
        } catch (errSb) {
          console.warn('[MsaBlocksService] Error al guardar en Supabase:', errSb);
        }
      }

      // Intento B: Vercel API /api/blocks
      if (!remoteSuccess && typeof fetch === 'function') {
        try {
          var resApi = await fetch('/api/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(norm)
          });
          if (resApi.ok) {
            var json = await resApi.json();
            if (json && json.ok) {
              remoteSuccess = true;
            }
          }
        } catch (errApi) {}
      }

      this._notifyUpdate();
      return { ok: true, remote: remoteSuccess };
    },

    // 3. Eliminar bloqueo en la base de datos central
    removeBlock: async function(idOrDate, type) {
      // Eliminar de localStorage inmediatamente
      this._removeLocalBlock(idOrDate, type);

      var remoteSuccess = false;

      // Intento A: Supabase Client
      var sb = this.getSupabaseClient();
      if (sb) {
        try {
          var delQ = sb.from('bloqueos').delete();
          if (typeof idOrDate === 'number' || (typeof idOrDate === 'string' && /^\d+$/.test(idOrDate))) {
            delQ = delQ.eq('id', idOrDate);
          } else if (type) {
            delQ = delQ.eq('date', idOrDate).eq('type', type);
          } else {
            delQ = delQ.eq('date', idOrDate);
          }
          var delRes = await delQ;
          if (!delRes.error) remoteSuccess = true;
        } catch (errSb) {
          console.warn('[MsaBlocksService] Error al eliminar en Supabase:', errSb);
        }
      }

      // Intento B: Vercel API
      if (!remoteSuccess && typeof fetch === 'function') {
        try {
          var query = '';
          if (typeof idOrDate === 'number' || (typeof idOrDate === 'string' && /^\d+$/.test(idOrDate))) {
            query = 'id=' + encodeURIComponent(idOrDate);
          } else if (type) {
            query = 'date=' + encodeURIComponent(idOrDate) + '&type=' + encodeURIComponent(type);
          } else {
            query = 'date=' + encodeURIComponent(idOrDate);
          }
          var resApi = await fetch('/api/blocks?' + query, { method: 'DELETE' });
          if (resApi.ok) remoteSuccess = true;
        } catch (errApi) {}
      }

      this._notifyUpdate();
      return { ok: true, remote: remoteSuccess };
    },

    // Combinar bloques remotos con el estado local
    mergeBlocksIntoD: function(remoteBlocks, D) {
      if (!D) return;
      if (!Array.isArray(D.blocks)) D.blocks = [];
      if (!Array.isArray(remoteBlocks)) return;

      var current = D.blocks;
      remoteBlocks.forEach(function(rb) {
        var exists = current.some(function(cb) {
          return cb.date === rb.date && cb.type === rb.type;
        });
        if (!exists) {
          current.push(rb);
        }
      });
      // Asegurar que si hay un 'full', prevalezca
      D.blocks = current;
    },

    // Auxiliares internos para localStorage
    _mergeIntoLocalCache: function(remoteBlocks, dateFilter) {
      try {
        if (typeof localStorage === 'undefined') return;
        var state = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
        if (!Array.isArray(state.blocks)) state.blocks = [];

        if (dateFilter) {
          // Reemplazar los de esta fecha con la verdad del servidor
          state.blocks = state.blocks.filter(function(b) { return b.date !== dateFilter; });
          remoteBlocks.forEach(function(b) { state.blocks.push(b); });
        } else {
          // Si es lista global, usamos la lista remota como fuente oficial manteniendo cualquier campo adicional
          var map = {};
          remoteBlocks.forEach(function(b) {
            map[b.date + '_' + b.type] = b;
          });
          state.blocks = Object.values(map);
        }
        localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
      } catch (e) {}
    },

    _updateLocalBlock: function(block) {
      try {
        if (typeof localStorage === 'undefined') return;
        var state = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
        if (!Array.isArray(state.blocks)) state.blocks = [];

        if (block.type === 'full') {
          state.blocks = state.blocks.filter(function(b) { return b.date !== block.date; });
        } else {
          state.blocks = state.blocks.filter(function(b) {
            return !(b.date === block.date && (b.type === block.type || b.type === 'full'));
          });
        }
        state.blocks.push(block);
        localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
      } catch (e) {}
    },

    _removeLocalBlock: function(idOrDate, type) {
      try {
        if (typeof localStorage === 'undefined') return;
        var state = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
        if (!Array.isArray(state.blocks)) return;

        if (typeof idOrDate === 'number' || (typeof idOrDate === 'string' && /^\d+$/.test(idOrDate))) {
          state.blocks = state.blocks.filter(function(b) { return String(b.id) !== String(idOrDate); });
        } else if (type) {
          state.blocks = state.blocks.filter(function(b) { return !(b.date === idOrDate && b.type === type); });
        } else {
          state.blocks = state.blocks.filter(function(b) { return b.date !== idOrDate; });
        }
        localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
      } catch (e) {}
    },

    _notifyUpdate: function() {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LS_LAST_UPDATE, Date.now().toString());
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('msa-blocks-updated'));
        }
      } catch (e) {}
    }
  };

  // Exponer globalmente
  global.MsaBlocksService = MsaBlocksService;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MsaBlocksService;
  }
})(typeof window !== 'undefined' ? window : global);
