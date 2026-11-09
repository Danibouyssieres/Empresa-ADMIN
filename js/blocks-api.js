/**
 * js/blocks-api.js
 * Capa de persistencia centralizada en tiempo real para bloqueos de agenda y disponibilidad.
 * Conecta bidireccionalmente con el endpoint Edge API (/api/blocks, /api/reservas) y Supabase
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

    // Obtener headers de autenticación administrativa para endpoints protegidos
    getAdminAuthHeaders: function() {
      var headers = {};
      try {
        var token = (typeof localStorage !== 'undefined' && localStorage.getItem('msa-admin-token')) || '';
        var sbKey = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_SB_KEY)) || '';
        var sess = null;
        try {
          sess = JSON.parse(sessionStorage.getItem('msa-session')) || JSON.parse(localStorage.getItem('msa-admin-user'));
        } catch (e) {}
        var sessToken = (sess && sess.token) || '';
        var chosen = token || sessToken || sbKey;
        if (chosen) {
          headers['Authorization'] = 'Bearer ' + chosen;
          headers['x-admin-token'] = chosen;
        }
        var conf = this.getConfig();
        if (conf.url) headers['x-supabase-url'] = conf.url;
        if (conf.key) {
          headers['x-supabase-key'] = conf.key;
          headers['apikey'] = conf.key;
        }
      } catch (e) {}
      return headers;
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
          var headers = Object.assign({ 'Accept': 'application/json' }, this.getAdminAuthHeaders());
          var apiRes = await fetch(apiUrl, {
            headers: headers,
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
            var query = sb.from('bloqueos').select('date,type');
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

    // 2. Persistir nuevo bloqueo en la base de datos central y local (Requiere autenticación)
    saveBlock: async function(block) {
      var norm = this.normalizeBlock(block);
      if (!norm) return { ok: false, error: 'Bloqueo inválido' };

      // Actualizar localStorage inmediatamente (optimistic UI)
      this._updateLocalBlock(norm);

      var remoteSuccess = false;

      // Persistir vía /api/blocks con headers de autenticación
      if (typeof fetch === 'function') {
        try {
          var headers = Object.assign(
            { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            this.getAdminAuthHeaders()
          );
          var apiRes = await fetch('/api/blocks', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(norm)
          });
          if (apiRes.ok) remoteSuccess = true;
          else if (apiRes.status === 401) {
            console.warn('[MsaBlocksService] No autorizado para guardar bloqueos. Requiere sesión admin.');
          }
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

    // 3. Eliminar bloqueo en la base de datos central y local (Requiere autenticación)
    removeBlock: async function(idOrDate, type) {
      // Eliminar de localStorage inmediatamente
      this._removeLocalBlock(idOrDate, type);

      var remoteSuccess = false;

      // Eliminar vía /api/blocks con headers de autenticación
      if (typeof fetch === 'function') {
        try {
          var delUrl = '/api/blocks?';
          if (typeof idOrDate === 'number' || (typeof idOrDate === 'string' && /^\d+$/.test(idOrDate))) {
            delUrl += 'id=' + encodeURIComponent(idOrDate);
          } else if (type) {
            delUrl += 'date=' + encodeURIComponent(idOrDate) + '&type=' + encodeURIComponent(type);
          } else {
            // Protección: no enviar sin tipo si no hay id
            delUrl += 'date=' + encodeURIComponent(idOrDate) + '&type=full';
          }
          var delRes = await fetch(delUrl, {
            method: 'DELETE',
            headers: this.getAdminAuthHeaders()
          });
          if (delRes.ok) remoteSuccess = true;
          else if (delRes.status === 401) {
            console.warn('[MsaBlocksService] No autorizado para eliminar bloqueos. Requiere sesión admin.');
          }
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

    // 4. PERSISTENCIA DE RESERVAS WEB: Guardar pre-reserva en base de datos
    createPreReserva: async function(reservaData) {
      if (!reservaData) return { ok: false, error: 'Datos de reserva vacíos' };
      if (typeof fetch === 'function') {
        try {
          var res = await fetch('/api/reservas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(reservaData)
          });
          var data = await res.json().catch(function() { return {}; });
          if (res.ok && (res.status === 200 || res.status === 201) && data && data.ok !== false) {
            var folio = data.folio || (data.data && data.data.folio) || (reservaData && reservaData.folio);
            return { ok: true, source: 'api', folio: folio, data: data.data || data };
          }
          return { ok: false, error: (data && (data.error || data.details)) || ('Error HTTP ' + res.status) };
        } catch (err) {
          return { ok: false, error: err.message || 'Error de conexión' };
        }
      }
      return { ok: false, error: 'Fetch no disponible' };
    },

    // 5. Consultar reservas registradas (Solo Admin)
    fetchReservas: async function(dateFilter, stFilter) {
      if (typeof fetch === 'function') {
        try {
          var q = [];
          if (dateFilter) q.push('date=' + encodeURIComponent(dateFilter));
          if (stFilter) q.push('st=' + encodeURIComponent(stFilter));
          var url = '/api/reservas' + (q.length ? '?' + q.join('&') : '');
          var res = await fetch(url, {
            headers: Object.assign({ 'Accept': 'application/json' }, this.getAdminAuthHeaders()),
            cache: 'no-store'
          });
          if (res.ok) {
            var data = await res.json().catch(function() { return {}; });
            if (data && data.ok && Array.isArray(data.data)) {
              return data.data;
            }
          }
        } catch (err) {}
      }

      // Intento B: Si el endpoint no respondió o estamos directos con Supabase Client
      var sb = this.getSupabaseClient();
      if (sb) {
        try {
          var query = sb.from('reservas').select('*');
          if (dateFilter) query = query.eq('date', dateFilter);
          if (stFilter) query = query.or('st.eq.' + stFilter + ',st.eq.Pre-reserva pendiente');
          query = query.order('created_at', { ascending: false });
          var sbRes = await query;
          if (!sbRes.error && Array.isArray(sbRes.data)) {
            return sbRes.data;
          }
        } catch (eSb) {
          console.warn('[MsaBlocksService] Error al consultar reservas en Supabase:', eSb);
        }
      }
      return [];
    },

    // 6. Actualizar estado de reserva (Solo Admin)
    updateReservaStatus: async function(idOrFolio, st, extraFields) {
      if (!idOrFolio) return { ok: false, error: 'ID o Folio requerido' };
      var remoteSuccess = false;
      var cleanBody = Object.assign({ st: st }, extraFields || {});
      var allowed = ['st', 'paid', 'fare', 'abono', 'obs', 'tens_id', 'date', 'time', 'start_min', 'dur_min', 'svc_type', 'block', 'pat_name', 'pat_phone', 'pat_age', 'coord_name', 'coord_phone', 'coord_type', 'from_addr', 'to_addr', 'depto', 'dx', 'mob', 'conciencia', 'alergias', 'medicamentos', 'patologias', 'comp_desc', 'tax_doc', 'expires_at'];
      var sanitized = {};
      for (var k in cleanBody) {
        if (allowed.indexOf(k) !== -1) sanitized[k] = cleanBody[k];
      }
      if (cleanBody.cancelled_at && !sanitized.obs) {
        sanitized.obs = 'Cancelada el ' + cleanBody.cancelled_at;
      } else if (cleanBody.cancelled_at && sanitized.obs && sanitized.obs.indexOf('Cancelada') === -1) {
        sanitized.obs = sanitized.obs + ' · [Cancelada: ' + cleanBody.cancelled_at + ']';
      }
      if (cleanBody.confirmed_at && !sanitized.obs) {
        sanitized.obs = 'Confirmada el ' + cleanBody.confirmed_at;
      }

      // Intento A: Endpoint /api/reservas (PATCH)
      if (typeof fetch === 'function') {
        try {
          var param = (typeof idOrFolio === 'number' || /^\d+$/.test(idOrFolio))
            ? 'id=' + encodeURIComponent(idOrFolio)
            : 'folio=' + encodeURIComponent(idOrFolio);
          var res = await fetch('/api/reservas?' + param, {
            method: 'PATCH',
            headers: Object.assign(
              { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              this.getAdminAuthHeaders()
            ),
            body: JSON.stringify(sanitized)
          });
          var data = await res.json().catch(function() { return {}; });
          if (res.ok && data && data.ok) remoteSuccess = true;
        } catch (err) {}
      }

      // Intento B: Supabase Client Directo (si está configurado)
      var sb = this.getSupabaseClient();
      if (sb) {
        try {
          var updQ = (typeof idOrFolio === 'number' || /^\d+$/.test(idOrFolio))
            ? sb.from('reservas').update(sanitized).eq('id', idOrFolio)
            : sb.from('reservas').update(sanitized).eq('folio', idOrFolio);
          var sbUpdRes = await updQ;
          if (!sbUpdRes.error) remoteSuccess = true;

          // Si se cancela o descarta, asegurar eliminación del bloqueo asociado en Supabase
          var isCancel = ['cancelada', 'cancelado', 'descartada', 'descartado', 'expirada_cancelada'].indexOf(String(st).toLowerCase()) !== -1;
          if (isCancel) {
            await sb.from('bloqueos').delete().eq('reserva_id', idOrFolio);
          }
        } catch (eSb) {
          console.warn('[MsaBlocksService] Error al actualizar estado en Supabase:', eSb);
        }
      }

      this._notifyUpdate();
      return { ok: true, remote: remoteSuccess };
    },

    // 7. Eliminar reserva y liberar cupo asociado en bloqueos
    deleteReserva: async function(idOrFolio, date, block) {
      if (!idOrFolio) return { ok: false, error: 'ID o Folio requerido' };
      var remoteSuccess = false;

      // Intento A: Endpoint /api/reservas con DELETE
      if (typeof fetch === 'function') {
        try {
          var param = (typeof idOrFolio === 'number' || /^\d+$/.test(idOrFolio))
            ? 'id=' + encodeURIComponent(idOrFolio)
            : 'folio=' + encodeURIComponent(idOrFolio);
          var delRes = await fetch('/api/reservas?' + param, {
            method: 'DELETE',
            headers: this.getAdminAuthHeaders()
          });
          if (delRes.ok) remoteSuccess = true;
        } catch (eDel) {}
      }

      // Intento B: Endpoint /api/blocks con DELETE (para liberar por reserva_id o fecha)
      if (typeof fetch === 'function') {
        try {
          await fetch('/api/blocks?reserva_id=' + encodeURIComponent(idOrFolio), {
            method: 'DELETE',
            headers: this.getAdminAuthHeaders()
          });
          if (date && block) {
            await fetch('/api/blocks?date=' + encodeURIComponent(date) + '&type=' + encodeURIComponent(block), {
              method: 'DELETE',
              headers: this.getAdminAuthHeaders()
            });
          }
        } catch (eBlk) {}
      }

      // Intento C: Supabase Client Directo (si está configurado)
      var sb = this.getSupabaseClient();
      if (sb) {
        try {
          // 1. Borrar bloqueos asociados
          if (idOrFolio) {
            await sb.from('bloqueos').delete().eq('reserva_id', idOrFolio);
          }
          if (date && block) {
            await sb.from('bloqueos').delete().eq('date', date).in('type', [block, 'full']);
          }
          // 2. Borrar o cancelar en reservas
          var delQ = (typeof idOrFolio === 'number' || /^\d+$/.test(idOrFolio))
            ? sb.from('reservas').delete().eq('id', idOrFolio)
            : sb.from('reservas').delete().eq('folio', idOrFolio);
          var resDel = await delQ;
          if (!resDel.error) {
            remoteSuccess = true;
          } else {
            // Si DELETE falla por RLS, intentar UPDATE a 'cancelada'
            var updQ = (typeof idOrFolio === 'number' || /^\d+$/.test(idOrFolio))
              ? sb.from('reservas').update({ st: 'cancelada' }).eq('id', idOrFolio)
              : sb.from('reservas').update({ st: 'cancelada' }).eq('folio', idOrFolio);
            var resUpd = await updQ;
            if (!resUpd.error) remoteSuccess = true;
          }
        } catch (eSb) {
          console.warn('[MsaBlocksService] Error al eliminar reserva en Supabase:', eSb);
        }
      }

      // Liberar localmente
      if (date && block) {
        this._removeLocalBlock(date, block);
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

        var dedArr = JSON.parse(localStorage.getItem(LS_BLOCKS_KEY)) || [];
        var map = {};
        dedArr.forEach(function(b) { map[b.date + '_' + b.type] = b; });
        remoteBlocks.forEach(function(b) { map[b.date + '_' + b.type] = b; });
        localStorage.setItem(LS_BLOCKS_KEY, JSON.stringify(Object.values(map)));

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
