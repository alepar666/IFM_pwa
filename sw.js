// increment at every new deploy
const CACHE_NAME = `ifm-cache-1773848049925`;

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
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Gestione version.json
    if (url.pathname.endsWith('/version.json')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => new Response(JSON.stringify({ app_version: 'unknown' }), {
                    headers: { 'Content-Type': 'application/json' }
                }))
        );
        return;
    }

    // Cache-first per index.html e index.js
    if (url.pathname === `${BASE_PATH}` || url.pathname === `${BASE_PATH}index.html` || url.pathname === `${BASE_PATH}js/index.js`) {
        event.respondWith(
            fetch(event.request)
                .then(resp => {
                    const respClone = resp.clone(); // clona subito per la cache
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                    return resp; // originale al browser
                })
                .catch(() => caches.match(event.request)) // fallback offline
        );
        return;
    }

    // Altri asset: cache-first
    event.respondWith(
        caches.match(event.request)
            .then(resp => resp || fetch(event.request))
    );
});