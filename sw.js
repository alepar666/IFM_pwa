const CACHE_NAME = 'ifm-cache-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/css/index.css',
  '/js/constants.js',
  '/js/audio.js',
  '/img/favicon.ico',
  '/img/icon.png',
  '/img/cbs.png',
  '/img/df.png',
  '/img/tdm.png'
];

// Install & cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE))
        .then(() => self.skipWaiting())
    );
});

// Activate SW
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // bypass cache for index.html & index.js
    if (url.pathname === '/index.html' || url.pathname === '/js/index.js') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // for other assets, try cache first
    event.respondWith(
        caches.match(event.request).then(resp => resp || fetch(event.request))
    );
});
