// increment at every new deploy
const CACHE_NAME = `ifm-cache-1774351492045`;

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
    `${BASE_PATH}img/tdm.png`,
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}version.json`
];

self.addEventListener('install', event => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching assets...', ASSETS_TO_CACHE);
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .then(() => console.log('[SW] Skip waiting after install'))
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    // Force network-first for HTML, JS, CSS, version.json, manifest, favicon
    if (
        pathname === `${BASE_PATH}` ||
        pathname === `${BASE_PATH}index.html` ||
        pathname.startsWith(`${BASE_PATH}js/`) ||
        pathname.startsWith(`${BASE_PATH}css/`) ||
        pathname.endsWith('version.json') ||
        pathname.endsWith('manifest.json') ||
        pathname.endsWith('favicon.ico')
    ) {
        console.log('[SW] Network-first request for:', pathname);
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .then(resp => {
                    const respClone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                    return resp;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first per immagini
    if (pathname.startsWith(`${BASE_PATH}img/`)) {
        event.respondWith(
            caches.match(event.request).then(resp => {
                if (resp) {
                    console.log('[SW] Serving from cache:', pathname);
                    return resp;
                }
                console.log('[SW] Fetching from network:', pathname);
                return fetch(event.request)
                    .then(resp => {
                        const respClone = resp.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                        return resp;
                    });
            })
        );
        return;
    }

    // Default: network fallback to cache
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});