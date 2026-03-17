// increment at every new deploy
const CACHE_NAME = `ifm-cache-1773770746560`;

// base path dinamico
const BASE_PATH = self.location.pathname.replace(/\/[^\/]*$/, '');

// Asset da cacheare
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

// INSTALL
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            const results = await Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url))
            );

            results.forEach((result, i) => {
                if (result.status === 'rejected') {
                    console.warn('Cache failed:', ASSETS_TO_CACHE[i]);
                }
            });
        }).then(() => self.skipWaiting())
    );
});

// ACTIVATE
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

// FETCH
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // gestisci solo GET
    if (event.request.method !== 'GET') return;

    // version.json → network first (dinamico)
    if (url.pathname === `${BASE_PATH}version.json`) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ app_version: 'unknown' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    // file critici → network first + cache update
    if (
        url.pathname === BASE_PATH ||
        url.pathname === `${BASE_PATH}index.html` ||
        url.pathname === `${BASE_PATH}js/index.js`
    ) {
        event.respondWith(
            fetch(event.request)
                .then(resp => {
                    const respClone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                    return resp;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // ignora richieste dinamiche (evita errori offline)
    if (
        url.pathname.endsWith('.json') ||
        url.pathname.includes('/api/')
    ) {
        return;
    }

    // cache first + fallback silenzioso
    event.respondWith(
        caches.match(event.request).then(resp => {
            if (resp) return resp;

            return fetch(event.request).catch(() => {
                return new Response('', { status: 204 });
            });
        })
    );
});