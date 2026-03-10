const CACHE_NAME = 'ifm-pwa-v100';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/index.css',
    '/img/favicon.ico',
    '/img/icon.png',
    '/img/icon100.png',
    '/img/cbs.png',
    '/img/df.png',
    '/img/tdm.png',
    '/js/constants.js',
    '/js/index.js',
    '/js/audio.js'
];

// Install SW and cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(ASSETS_TO_CACHE))
        .then(() => {
            console.log('[SW] All assets cached');
            return self.skipWaiting(); // Activate SW immediately
        })
    );
});

// Activate SW and clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event: serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResp) => {
            if (cachedResp) return cachedResp;
            return fetch(event.request).then((networkResp) => {
                return networkResp;
            }).catch(() => {
                // Optionally, return fallback page/image
                return caches.match('/index.html');
            });
        })
    );
});

// Optional: force update from page
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
