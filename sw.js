// increment at every new deploy
const CACHE_NAME = `ifm-cache-1774346003131`;

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
            .then(() => {
                console.log('[SW] Skip waiting after install');
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(keys => {
            console.log('[SW] Existing caches:', keys);
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            console.log('[SW] Clients claimed');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    console.log('[SW] Fetch request for:', url.pathname);

    // Gestione version.json
    if (url.pathname.endsWith('/version.json')) {
        console.log('[SW] Fetching version.json');
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    console.log('[SW] version.json fetch failed, returning fallback');
                    return new Response(JSON.stringify({ app_version: 'unknown' }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // Cache-first per index.html e index.js
    if (url.pathname === `${BASE_PATH}` || url.pathname === `${BASE_PATH}index.html` || url.pathname === `${BASE_PATH}js/index.js`) {
        console.log('[SW] Cache-first strategy for:', url.pathname);
        event.respondWith(
            fetch(event.request)
                .then(resp => {
                    const respClone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        console.log('[SW] Updating cache for:', url.pathname);
                        cache.put(event.request, respClone);
                    });
                    return resp;
                })
                .catch(() => {
                    console.log('[SW] Fetch failed, using cached version for:', url.pathname);
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Altri asset: cache-first
    event.respondWith(
        caches.match(event.request)
            .then(resp => {
                if (resp) {
                    console.log('[SW] Serving from cache:', url.pathname);
                    return resp;
                }
                console.log('[SW] Fetching from network:', url.pathname);
                return fetch(event.request);
            })
    );
});