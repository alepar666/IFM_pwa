// increment at each new deploy
const CACHE_NAME = 'ifm-cache-v2';

// Asset da cacheare
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/index.css',
  '/js/constants.js',
  '/js/index.js',
  '/js/audio.js',
  '/img/favicon.ico',
  '/img/icon.png',
  '/img/cbs.png',
  '/img/df.png',
  '/img/tdm.png'
];

// Install: cache assets and aactivates rigth away SW
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE))
        .then(() => self.skipWaiting()) // force new SW
    );
});

// Activate delete old cache and get control of the client
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim()) // check all pages
    );
});

// Fetch → gestione intelligente delle risorse
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // bypass cache for index.html and index.js always fetch from server
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/js/index.js') {
        event.respondWith(
            fetch(event.request)
            .then(resp => {
                // update cache with last version
                const respClone = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                return resp;
            })
            .catch(() => caches.match(event.request)) // fallback offline
        );
        return;
    }

    // for all other resources, cache first
    event.respondWith(
        caches.match(event.request)
        .then(resp => resp || fetch(event.request))
    );
});
