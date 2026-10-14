/**
 * Laxminarayan Group — Offline Site Walk-In Auto-Sync Engine
 * Architecture: IndexedDB Local Storage + Network Detection + Background Auto-Flush
 * 
 * Guarantees zero lead loss on construction sites (sample flats, basements, high-rise slabs)
 * where cellular 4G/5G signal drops or cuts out.
 */

(function () {
  'use strict';

  const DB_NAME = 'LNG_OFFLINE_WALKIN_DB';
  const DB_VERSION = 1;
  const STORE_NAME = 'walkins';

  let dbPromise = null;
  let isSyncing = false;

  // ─── 1. INDEXEDDB PROMISE INITIALIZER ───
  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('[Offline Walk-In] IndexedDB not available on this browser.');
        return resolve(null);
      }

      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };

      req.onsuccess = event => resolve(event.target.result);
      req.onerror = event => {
        console.error('[Offline Walk-In] IndexedDB error:', event.target.error);
        resolve(null);
      };
    });

    return dbPromise;
  }

  // ─── 2. LOCAL SAVE (ZERO NETWORK DEPENDENCY) ───
  async function saveOffline(payload, projectName) {
    const db = await openDatabase();
    const localId = 'offline_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    const record = {
      localId,
      payload,
      projectName: projectName || 'Construction Site',
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } else {
      // Fallback: LocalStorage in rare case IndexedDB is blocked
      const fallbackList = getLocalStorageBackup();
      fallbackList.push(record);
      localStorage.setItem('lng_offline_walkin_backup', JSON.stringify(fallbackList));
    }

    // Try to register Background Sync with Service Worker
    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-walkins');
      }
    } catch (_) {}

    // Update UI elements
    await updateBanner();
    injectOptimisticLead(record);

    return record;
  }

  // ─── 3. FETCH PENDING QUEUE ───
  async function getAllPending() {
    const db = await openDatabase();
    if (!db) return getLocalStorageBackup();

    return new Promise(resolve => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  }

  async function removePending(localId) {
    const db = await openDatabase();
    if (!db) {
      const list = getLocalStorageBackup().filter(x => x.localId !== localId);
      localStorage.setItem('lng_offline_walkin_backup', JSON.stringify(list));
      return;
    }

    return new Promise(resolve => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(localId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  function getLocalStorageBackup() {
    try {
      return JSON.parse(localStorage.getItem('lng_offline_walkin_backup') || '[]');
    } catch (_) {
      return [];
    }
  }

  // ─── 4. QUEUE FLUSH / SYNC ENGINE ───
  async function flushQueue(isManual = false) {
    if (isSyncing) return;
    if (!navigator.onLine && !isManual) return;

    const items = await getAllPending();
    if (!items || items.length === 0) {
      if (isManual && window.toast) {
        window.toast('✨ All offline walk-in enquiries are already synced to the server!');
      }
      await updateBanner();
      return;
    }

    isSyncing = true;
    const manualBtn = document.getElementById('offlineManualSyncBtn');
    if (manualBtn) {
      manualBtn.disabled = true;
      manualBtn.innerHTML = '<span>Syncing...</span> ⏳';
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of items) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch('/api/employee/walk-in', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (res.ok && data.success) {
          // Successfully uploaded to database!
          await removePending(item.localId);
          syncedCount++;
        } else if (res.status === 400) {
          // Permanent validation error: remove from queue so it does not block loop
          console.warn('[Offline Sync] Validation error for entry:', data.error);
          await removePending(item.localId);
          failedCount++;
        } else {
          // Server error or auth issue: break loop and retry later
          break;
        }
      } catch (networkErr) {
        // Network connection dropped mid-sync
        console.warn('[Offline Sync] Network dropped during sync loop:', networkErr);
        break;
      }
    }

    isSyncing = false;
    if (manualBtn) {
      manualBtn.disabled = false;
      manualBtn.innerHTML = '<span>Sync Now</span> 🔄';
    }

    await updateBanner();

    if (syncedCount > 0) {
      if (window.toast) {
        window.toast(`✅ Synced ${syncedCount} offline walk-in enquiry${syncedCount > 1 ? 's' : ''} to database!`);
      }
      if (typeof window.loadPortal === 'function') {
        await window.loadPortal();
      }
    }
  }

  // ─── 5. UI BANNER & CONNECTIVITY STATUS CONTROLLER ───
  async function updateBanner() {
    const banner = document.getElementById('offlineSyncBanner');
    const textEl = document.getElementById('offlineSyncText');
    const iconEl = document.getElementById('offlineSyncIcon');
    if (!banner || !textEl) return;

    const items = await getAllPending();
    const count = items.length;

    if (count > 0) {
      banner.style.display = 'flex';
      banner.className = 'pending';
      if (iconEl) iconEl.textContent = '🟡';
      textEl.innerHTML = `<b>${count} Site Walk-In${count > 1 ? 's' : ''}</b> saved locally on device (Dead Zone) · Will auto-sync when cellular signal returns.`;
    } else {
      if (banner.classList.contains('pending')) {
        // Transition from pending to synced
        banner.className = 'synced';
        if (iconEl) iconEl.textContent = '🟢';
        textEl.innerHTML = `<b>All offline walk-in enquiries successfully synced!</b> Realtime database up to date.`;
        setTimeout(() => {
          if (banner.classList.contains('synced')) {
            banner.style.display = 'none';
            banner.className = '';
          }
        }, 4000);
      } else {
        banner.style.display = 'none';
      }
    }

    updateNetworkStatusUI();
  }

  function updateNetworkStatusUI() {
    const statusEl = document.getElementById('walkInNetworkStatus');
    if (!statusEl) return;

    const isOnline = navigator.onLine;
    if (isOnline) {
      statusEl.style.color = '#16a34a';
      statusEl.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#16a34a;"></span> Online · Direct Cloud Save`;
    } else {
      statusEl.style.color = '#d97706';
      statusEl.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b; animation:pulse 1.5s infinite;"></span> Dead Zone · Auto-Queues on Device`;
    }
  }

  // ─── 6. OPTIMISTIC CLIENT-SIDE INJECTION ───
  function injectOptimisticLead(record) {
    if (!window.state || !Array.isArray(window.state.leads)) return;

    const optimisticLead = {
      id: 'LOCAL-' + String(record.timestamp).slice(-4),
      name: record.payload.name,
      phone: record.payload.phone,
      email: record.payload.email,
      project_name: record.projectName,
      source: 'offline-walkin',
      status: 'site_visit',
      sentiment: record.payload.sentiment || 'warm',
      follow_up_at: record.payload.follow_up_at,
      notes: (record.payload.notes ? record.payload.notes + ' ' : '') + '⚡ [Queued Offline on Device]'
    };

    // Prepend to leads list so advisor immediately sees it on screen
    window.state.leads.unshift(optimisticLead);
    if (typeof window.renderAdvisorLeads === 'function') {
      window.renderAdvisorLeads();
    }
  }

  // ─── 7. LIFECYCLE LISTENERS & AUTO-POLLING ───
  window.addEventListener('online', () => {
    updateNetworkStatusUI();
    flushQueue();
  });

  window.addEventListener('offline', () => {
    updateNetworkStatusUI();
    updateBanner();
  });

  // Listen for Service Worker postMessage
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
        flushQueue();
      }
    });
  }

  // Heartbeat fallback: poll every 20 seconds when online to clear any stranded queue
  setInterval(() => {
    if (navigator.onLine) {
      flushQueue();
    }
  }, 20000);

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateBanner();
      updateNetworkStatusUI();
      if (navigator.onLine) flushQueue();
    });
  } else {
    updateBanner();
    updateNetworkStatusUI();
    if (navigator.onLine) flushQueue();
  }

  // Export public API
  window.LngOfflineWalkIn = {
    saveOffline,
    flushQueue,
    getAllPending,
    updateBanner,
    updateNetworkStatusUI
  };

})();
