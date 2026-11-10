// =========================================================================
// GESTOR DE DATOS OFFLINE EN DISPOSITIVO (INDEXEDDB) - APP TENS
// =========================================================================
(function(window){
  const DB_NAME = 'MSA_TENS_DB';
  const DB_VERSION = 1;
  let dbInstance = null;

  function openDB(){
    return new Promise((resolve, reject) => {
      if(dbInstance) return resolve(dbInstance);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains('servicios')){
          db.createObjectStore('servicios', { keyPath: 'id' });
        }
        if(!db.objectStoreNames.contains('signos_vitales')){
          db.createObjectStore('signos_vitales', { keyPath: 'id', autoIncrement: true });
        }
        if(!db.objectStoreNames.contains('eventos_cola')){
          db.createObjectStore('eventos_cola', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Guardar servicios descargados para disponibilidad offline
  async function saveServicios(servicios){
    const db = await openDB();
    const tx = db.transaction('servicios', 'readwrite');
    const store = tx.objectStore('servicios');
    for(const s of servicios){
      store.put(s);
    }
    return new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  }

  // Obtener servicios guardados localmente
  async function getServiciosLocal(){
    const db = await openDB();
    const tx = db.transaction('servicios', 'readonly');
    const store = tx.objectStore('servicios');
    const req = store.getAll();
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || []);
      req.onerror = rej;
    });
  }

  // Registrar cambio de estado (si offline, queda en eventos_cola)
  async function queueEvento(evento){
    evento.created_at = new Date().toISOString();
    evento.synced = false;
    const db = await openDB();
    const tx = db.transaction('eventos_cola', 'readwrite');
    tx.objectStore('eventos_cola').add(evento);
    return new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  }

  // Guardar signos vitales clínicos
  async function saveSignosVitales(data){
    data.created_at = new Date().toISOString();
    data.synced = false;
    const db = await openDB();
    const tx = db.transaction('signos_vitales', 'readwrite');
    tx.objectStore('signos_vitales').add(data);
    return new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  }

  // Contar registros pendientes de sincronización
  async function countPendingSync(){
    const db = await openDB();
    const tx = db.transaction(['eventos_cola', 'signos_vitales'], 'readonly');
    const reqEvt = tx.objectStore('eventos_cola').count();
    const reqSig = tx.objectStore('signos_vitales').count();
    return new Promise((res) => {
      tx.oncomplete = () => {
        res((reqEvt.result || 0) + (reqSig.result || 0));
      };
    });
  }

  // Intentar sincronizar cola cuando hay conexión
  async function syncQueueWithApi(){
    if(!navigator.onLine) return { synced: 0, offline: true };
    const db = await openDB();
    
    // 1. Sincronizar eventos
    const txEvt = db.transaction('eventos_cola', 'readonly');
    const eventos = await new Promise(r => {
      const q = txEvt.objectStore('eventos_cola').getAll();
      q.onsuccess = () => r(q.result || []);
      q.onerror = () => r([]);
    });

    let syncCount = 0;
    for(const ev of eventos){
      try {
        const res = await fetch('/api/tens/eventos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ev)
        });
        if(res.ok){
          const delTx = db.transaction('eventos_cola', 'readwrite');
          delTx.objectStore('eventos_cola').delete(ev.id);
          syncCount++;
        }
      } catch(e){
        break; // Detener si falla la red
      }
    }

    // 2. Sincronizar signos vitales
    const txSig = db.transaction('signos_vitales', 'readonly');
    const signos = await new Promise(r => {
      const q = txSig.objectStore('signos_vitales').getAll();
      q.onsuccess = () => r(q.result || []);
      q.onerror = () => r([]);
    });

    for(const sig of signos){
      try {
        const res = await fetch('/api/tens/clinica', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sig)
        });
        if(res.ok){
          const delTx = db.transaction('signos_vitales', 'readwrite');
          delTx.objectStore('signos_vitales').delete(sig.id);
          syncCount++;
        }
      } catch(e){
        break;
      }
    }

    return { synced: syncCount, pending: await countPendingSync() };
  }

  window.TensDB = {
    saveServicios,
    getServiciosLocal,
    queueEvento,
    saveSignosVitales,
    countPendingSync,
    syncQueueWithApi
  };
})(window);
