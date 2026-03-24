// increment at every new deploy
const CACHE_NAME = `ifm-cache-1774348638095`;

// Base path dinamico
const BASE_PATH = self.location.pathname.replace(/\/[^\/]*$/, '/');

const ASSETS_TO_CACHE = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}css/index.css`,
    `${BASE_PATH}js/constants.js`,
    `${BASE_PATH}js/index.js`,
    `${BASE_PATH}js/audio.js`,
    `${BASE_PATH}img/favicon.ico`,
    `${BASE_PATH}img/logo.png`,
    `${BASE_PATH}img/cbs.png`,
    `${BASE_PATH}img/df.png`,
    `${BASE_PATH}img/tdm.png`
];

console.log('[SW] BASE_PATH:', BASE_PATH);
console.log('[SW] Assets to cache:', ASSETS_TO_CACHE);

self.addEventListener('install', event => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Forza sempre fetch dal server per tutti gli asset nella lista
    if (ASSETS_TO_CACHE.some(path => url.pathname === path)) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }) // bypass browser cache
                .then(resp => {
                    const respClone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                    return resp;
                })
        );
        return;
    }

    // Altri asset: cache-first
    event.respondWith(
        caches.match(event.request)
            .then(resp => resp || fetch(event.request))
    );
});