const CACHE_NAME = 'ifm-cache-' + Date.now();

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

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE))
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(resp => resp || fetch(event.request))
    );
});
