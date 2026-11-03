/**
 * js/blocks-api.js
 * Capa de persistencia centralizada en tiempo real para bloqueos de agenda y disponibilidad.
 * Conecta bidireccionalmente con el endpoint Edge API (/api/blocks) y Supabase
 * con respaldo inmediato en localStorage (claves 'msa_blocks' y 'msa-v1').
 */

(function(global) {
  'use strict';

  var LS_STATE_KEY = 'msa-v1';
  var LS_BLOCKS_KEY = 'msa_blocks';
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

    // 1. Consultar bloqueos activos desde backend centralizado (/api/blocks y Supabase)
    fetchBlocks: async function(dateFilter) {
      var blocks = [];
      var fetchedSuccess = false;

      // Intento A: Endpoint Edge API /api/blocks (Servidor centralizado Vercel)
      if (typeof fetch === 'function') {
        try {
          var apiUrl = '/api/blocks' + (dateFilter ? '?date=' + encodeURIComponent(dateFilter) : '');
          var apiRes = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
          });
          if (apiRes.ok) {
            var resData = await apiRes.json();
            if (resData && resData.ok && Array.isArray(resData.data)) {
              blocks = resData.data.map(this.normalizeBlock).filter(Boolean);
              fetchedSuccess = true;
            }
          }
        } catch (errApi) {
          // Servidor no disponible o entorno offline/file://
        }
      }

      // Intento B: Supabase Client Directo (si está configurado y el intento A no respondió)
      if (!fetchedSuccess) {
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
            console.warn('[MsaBlocksService] Supabase query falló:', errSb);
          }
        }
      }

      // Intento C: Fusión con almacenamiento local (localStorage msa_blocks y msa-v1)
      try {
        if (typeof localStorage !== 'undefined') {
          var dedArr = JSON.parse(localStorage.getItem(LS_BLOCKS_KEY)) || [];
          var localState = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
          var localArr = Array.isArray(localState.blocks) ? localState.blocks : [];

          var map = {};
          blocks.forEach(function(b) { map[b.date + '_' + b.type] = b; });
          dedArr.forEach(function(b) { if (!map[b.date + '_' + b.type]) map[b.date + '_' + b.type] = b; });
          localArr.forEach(function(b) { if (!map[b.date + '_' + b.type]) map[b.date + '_' + b.type] = b; });

          var combined = Object.values(map);
          if (dateFilter) {
            blocks = combined.filter(function(b) { return b.date === dateFilter; });
          } else {
            blocks = combined;
          }
        }
      } catch (e) {}

      // Sincronizar caché local
      this._mergeIntoLocalCache(blocks, dateFilter);

      return blocks;
    },

    // 2. Persistir nuevo bloqueo en la base de datos central y local
    saveBlock: async function(block) {
      var norm = this.normalizeBlock(block);
      if (!norm) return { ok: false, error: 'Bloqueo inválido' };

      // Actualizar localStorage inmediatamente (optimistic UI)
      this._updateLocalBlock(norm);

      var remoteSuccess = false;

      // Persistir vía /api/blocks
      if (typeof fetch === 'function') {
        try {
          var apiRes = await fetch('/api/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(norm)
          });
          if (apiRes.ok) remoteSuccess = true;
        } catch (eApi) {}
      }

      // Persistir vía Supabase Client directo si existe
      var sb = this.getSupabaseClient();
      if (sb) {
        try {
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

          if (!insRes.error) remoteSuccess = true;
        } catch (errSb) {
          console.warn('[MsaBlocksService] Error al guardar en Supabase:', errSb);
        }
      }

      this._notifyUpdate();
      return { ok: true, remote: remoteSuccess };
    },

    // 3. Eliminar bloqueo en la base de datos central y local
    removeBlock: async function(idOrDate, type) {
      // Eliminar de localStorage inmediatamente
      this._removeLocalBlock(idOrDate, type);

      var remoteSuccess = false;

      // Eliminar vía /api/blocks
      if (typeof fetch === 'function') {
        try {
          var delUrl = '/api/blocks?';
          if (typeof idOrDate === 'number' || (typeof idOrDate === 'string' && /^\d+$/.test(idOrDate))) {
            delUrl += 'id=' + encodeURIComponent(idOrDate);
          } else if (type) {
            delUrl += 'date=' + encodeURIComponent(idOrDate) + '&type=' + encodeURIComponent(type);
          } else {
            delUrl += 'date=' + encodeURIComponent(idOrDate);
          }
          var delRes = await fetch(delUrl, { method: 'DELETE' });
          if (delRes.ok) remoteSuccess = true;
        } catch (eDel) {}
      }

      // Eliminar vía Supabase Client directo
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
          var resSbDel = await delQ;
          if (!resSbDel.error) remoteSuccess = true;
        } catch (errSb) {
          console.warn('[MsaBlocksService] Error al eliminar en Supabase:', errSb);
        }
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
      D.blocks = current;
    },

    // Auxiliares internos para localStorage
    _mergeIntoLocalCache: function(remoteBlocks, dateFilter) {
      try {
        if (typeof localStorage === 'undefined') return;

        // Actualizar msa_blocks
        var dedArr = JSON.parse(localStorage.getItem(LS_BLOCKS_KEY)) || [];
        var map = {};
        dedArr.forEach(function(b) { map[b.date + '_' + b.type] = b; });
        remoteBlocks.forEach(function(b) { map[b.date + '_' + b.type] = b; });
        localStorage.setItem(LS_BLOCKS_KEY, JSON.stringify(Object.values(map)));

        // Actualizar msa-v1
        var state = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
        if (Array.isArray(state.blocks)) {
          var stateMap = {};
          state.blocks.forEach(function(b) { stateMap[b.date + '_' + b.type] = b; });
          remoteBlocks.forEach(function(b) { stateMap[b.date + '_' + b.type] = b; });
          state.blocks = Object.values(stateMap);
          localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
        }
      } catch (e) {}
    },

    _updateLocalBlock: function(block) {
      try {
        if (typeof localStorage === 'undefined') return;

        // Actualizar msa_blocks
        var dedArr = JSON.parse(localStorage.getItem(LS_BLOCKS_KEY)) || [];
        if (block.type === 'full') {
          dedArr = dedArr.filter(function(b) { return b.date !== block.date; });
        } else {
          dedArr = dedArr.filter(function(b) {
            return !(b.date === block.date && (b.type === block.type || b.type === 'full'));
          });
        }
        dedArr.push(block);
        localStorage.setItem(LS_BLOCKS_KEY, JSON.stringify(dedArr));

        // Actualizar msa-v1
        var state = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
        if (Array.isArray(state.blocks)) {
          if (block.type === 'full') {
            state.blocks = state.blocks.filter(function(b) { return b.date !== block.date; });
          } else {
            state.blocks = state.blocks.filter(function(b) {
              return !(b.date === block.date && (b.type === block.type || b.type === 'full'));
            });
          }
          state.blocks.push(block);
          localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
        }
      } catch (e) {}
    },

    _removeLocalBlock: function(idOrDate, type) {
      try {
        if (typeof localStorage === 'undefined') return;

        var filterFn = function(b) {
          if (typeof idOrDate === 'number' || (typeof idOrDate === 'string' && /^\d+$/.test(idOrDate))) {
            return String(b.id) !== String(idOrDate);
          } else if (type) {
            return !(b.date === idOrDate && b.type === type);
          } else {
            return b.date !== idOrDate;
          }
        };

        var dedArr = JSON.parse(localStorage.getItem(LS_BLOCKS_KEY)) || [];
        localStorage.setItem(LS_BLOCKS_KEY, JSON.stringify(dedArr.filter(filterFn)));

        var state = JSON.parse(localStorage.getItem(LS_STATE_KEY)) || {};
        if (Array.isArray(state.blocks)) {
          state.blocks = state.blocks.filter(filterFn);
          localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
        }
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
