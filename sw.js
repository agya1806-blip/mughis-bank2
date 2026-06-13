// Service Worker untuk MUGHIS BANK V2.0
// Offline support, caching, dan background sync

const CACHE_NAME = 'mughis-bank-v2.0';
const RUNTIME_CACHE = 'mughis-bank-runtime';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/modules.js',
  '/js/config.js',
  '/manifest.json'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH EVENT - NETWORK FIRST STRATEGY
// ============================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external domains
  if (url.origin !== location.origin) {
    return;
  }

  // API calls - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache first, fallback to network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default - Network first
  event.respondWith(networkFirst(request));
});

// ============================================
// CACHE FIRST STRATEGY
// ============================================
async function cacheFirst(request) {
  try {
    // Check cache first
    const cached = await caches.match(request);
    if (cached) {
      console.log('Service Worker: Cache hit for', request.url);
      return cached;
    }

    // If not in cache, fetch from network
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('Service Worker: Fetch failed for', request.url, error);
    
    // Return offline page or cached response
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// ============================================
// NETWORK FIRST STRATEGY
// ============================================
async function networkFirst(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('Service Worker: Network request failed for', request.url, error);
    
    // Fallback to cache
    const cached = await caches.match(request);
    if (cached) {
      console.log('Service Worker: Using cached response for', request.url);
      return cached;
    }

    // Return offline response
    return new Response(JSON.stringify({
      offline: true,
      message: 'You are offline. Some features may not be available.',
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/i.test(pathname) ||
         pathname === '/' ||
         pathname === '/index.html' ||
         pathname === '/manifest.json';
}

// ============================================
// MESSAGE EVENT - COMMUNICATION WITH APP
// ============================================
self.addEventListener('message', event => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(RUNTIME_CACHE)
          .then(() => {
            console.log('Service Worker: Runtime cache cleared');
            event.ports.postMessage({ success: true });
          })
      );
      break;

    case 'GET_CACHE_SIZE':
      event.waitUntil(
        getCacheSize().then(size => {
          event.ports.postMessage({ size });
        })
      );
      break;

    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(RUNTIME_CACHE)
          .then(cache => {
            return Promise.all(
              payload.urls.map(url => cache.add(url))
            );
          })
          .then(() => {
            event.ports.postMessage({ success: true });
          })
          .catch(error => {
            event.ports.postMessage({ error: error.message });
          })
      );
      break;

    default:
      console.log('Service Worker: Unknown message type', type);
  }
});

// ============================================
// BACKGROUND SYNC
// ============================================
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Trigger sync in app
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            action: 'sync-data'
          });
        });
      })
    );
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');

  if (!event.data) {
    console.log('Service Worker: Push event but no data');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'MUGHIS BANK Notification',
    icon: '/data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%232c3e50" width="192" height="192" rx="45"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="100" font-family="Arial" font-weight="bold">MB</text></svg>',
    badge: '/data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%232c3e50" width="192" height="192" rx="45"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="100" font-family="Arial" font-weight="bold">MB</text></svg>',
    tag: data.tag || 'mughis-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MUGHIS BANK', options)
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// ============================================
// NOTIFICATION CLOSE
// ============================================
self.addEventListener('notificationclose', event => {
  console.log('Service Worker: Notification closed');
});

// ============================================
// PERIODIC BACKGROUND SYNC
// ============================================
self.addEventListener('periodicsync', event => {
  console.log('Service Worker: Periodic sync triggered', event.tag);

  if (event.tag === 'sync-periodic') {
    event.waitUntil(
      // Trigger periodic sync in app
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PERIODIC_SYNC',
            action: 'sync-data'
          });
        });
      })
    );
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

// ============================================
// SERVICE WORKER READY
// ============================================
console.log('Service Worker: Script loaded and ready');
