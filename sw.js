const CACHE_NAME = `ifm-cache-1777908600848`;
const BASE_PATH = self.location.pathname.replace(/\/[^\/]*$/, '/');

const PRECACHE_ASSETS = [
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
    `${BASE_PATH}manifest.json`
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_ASSETS))
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

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

function isInScope(pathname) {
    return pathname.startsWith(BASE_PATH);
}

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    if (!isInScope(pathname)) return;

    if (
        pathname === `${BASE_PATH}` ||
        pathname === `${BASE_PATH}index.html` ||
        pathname.endsWith('manifest.json') ||
        pathname.endsWith('version.json') ||
        pathname.endsWith('favicon.ico')
    ) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .then(response => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    if (pathname.startsWith(`${BASE_PATH}js/`) || pathname.startsWith(`${BASE_PATH}css/`)) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .then(response => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    if (pathname.startsWith(`${BASE_PATH}img/`)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
