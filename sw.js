// increment at every new deploy
const CACHE_NAME = 'ifm-cache-v1.0.1-test"';

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

    if (url.pathname === '/version.json') {
        event.respondWith(
            fetch(event.request)
            .catch(() => new Response(JSON.stringify({
                app_version: 'unknown'
            }), {
                headers: {
                    'Content-Type': 'application/json'
                }
            }))
        );
        return;
    }

    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/js/index.js') {
        event.respondWith(
            fetch(event.request)
            .then(resp => {
                // aggiorna cache con la nuova versione
                const respClone = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                return resp;
            })
            .catch(() => caches.match(event.request)) // fallback offline
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
        .then(resp => resp || fetch(event.request))
    );
});
