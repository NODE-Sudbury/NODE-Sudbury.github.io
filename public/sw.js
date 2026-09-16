// ── Offline cache ──
const CACHE_NAME = 'node-v1';
const API_CACHE_NAME = 'node-api-v1';
const STATIC_ASSETS = ['/', '/events', '/dashboard', '/node-logo.svg', '/manifest.json', '/checkin'];

// ── IndexedDB helpers for background sync queue ──
const DB_NAME = 'checkin-sync-db';
const QUEUE_STORE = 'checkin-queue';

function openSyncDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function() {
      if (!req.result.objectStoreNames.contains(QUEUE_STORE)) {
        req.result.createObjectStore(QUEUE_STORE, { autoIncrement: true, keyPath: 'id' });
      }
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function enqueueCheckin(db, entry) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add(entry);
    tx.oncomplete = resolve;
    tx.onerror = function() { reject(tx.error); };
  });
}

function getAllQueued(db) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(QUEUE_STORE, 'readonly');
    var req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

function deleteQueued(db, id) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = function() { reject(tx.error); };
  });
}

// ── Route matchers ──
function isCheckinRoute(pathname) {
  return pathname.startsWith('/checkin');
}

function isRegistrationsAPI(pathname) {
  return /\/api\/admin\/events\/[^/]+\/registrations/.test(pathname);
}

function isCheckinAPI(pathname) {
  return /\/api\/admin\/events\/[^/]+\/checkin\/[^/]+/.test(pathname);
}

// ── Install ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(STATIC_ASSETS); })
  );
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME && k !== API_CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch ──
self.addEventListener('fetch', function(event) {
  var url;
  try { url = new URL(event.request.url); } catch(e) { return; }

  // POST to checkin API - try network; on failure enqueue for background sync
  if (event.request.method === 'POST' && isCheckinAPI(url.pathname)) {
    var cloned = event.request.clone();
    event.respondWith(
      cloned.text().then(function(body) {
        return fetch(event.request).catch(function() {
          return openSyncDB().then(function(db) {
            return enqueueCheckin(db, {
              url: event.request.url,
              method: 'POST',
              headers: Array.from(event.request.headers.entries()),
              body: body,
              timestamp: Date.now(),
            });
          }).then(function() {
            if (self.registration.sync) {
              return self.registration.sync.register('checkin-queue');
            }
          }).then(function() {
            return new Response(JSON.stringify({ queued: true, offline: true }), {
              status: 202,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        });
      })
    );
    return;
  }

  // Only handle GET from here on
  if (event.request.method !== 'GET') return;

  // Network-first for registrations API with cache fallback
  if (isRegistrationsAPI(url.pathname)) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(API_CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
    );
    return;
  }

  // Skip other API routes
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for static assets and checkin routes; cache on first fetch
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response.ok && (isCheckinRoute(url.pathname) || STATIC_ASSETS.includes(url.pathname))) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      });
    })
  );
});

// ── Background Sync ──
self.addEventListener('sync', function(event) {
  if (event.tag === 'checkin-queue') {
    event.waitUntil(
      openSyncDB().then(function(db) {
        return getAllQueued(db).then(function(entries) {
          return Promise.all(entries.map(function(entry) {
            var headers = {};
            (entry.headers || []).forEach(function(pair) { headers[pair[0]] = pair[1]; });
            return fetch(entry.url, {
              method: entry.method,
              headers: headers,
              body: entry.body || undefined,
            }).then(function(response) {
              if (response.ok) {
                return deleteQueued(db, entry.id);
              }
            }).catch(function() {
              // Will retry on the next sync event
            });
          }));
        });
      })
    );
  }
});

// ── Push notifications ──
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/node-logo.svg',
      badge: '/node-logo.svg',
      data: { url: data.url || '/' },
      tag: data.tag || 'node-notification',
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
