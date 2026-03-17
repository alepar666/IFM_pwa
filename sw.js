// increment at every new deploy
const CACHE_NAME = `ifm-cache-1773771080449`;

// BASE_PATH sicuro: sempre con slash finale
let BASE_PATH = self.location.pathname.replace(/\/[^\/]*$/, '/');

// Funzione helper per generare URL relativi corretti
function assetPath(file) {
    return new URL(file, self.location.origin + BASE_PATH).toString();
}

// Asset da cacheare
const ASSETS_TO_CACHE = [
    assetPath(''),
    assetPath('index.html'),
    assetPath('css/index.css'),
    assetPath('js/constants.js'),
    assetPath('js/index.js'),
    assetPath('js/audio.js'),
    assetPath('img/favicon.ico'),
    assetPath('img/logo.png'),
    assetPath('img/cbs.png'),
    assetPath('img/df.png'),
    assetPath('img/tdm.png')
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('SW install failed', err))
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

    if (url.pathname === BASE_PATH + 'version.json') {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ app_version: 'unknown' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    if (
        url.pathname === BASE_PATH ||
        url.pathname === BASE_PATH + 'index.html' ||
        url.pathname === BASE_PATH + 'js/index.js'
    ) {
        event.respondWith(
            fetch(event.request)
                .then(resp => {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
                    return resp;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(resp => resp || fetch(event.request).catch(() => new Response('', { status: 204 })))
    );
});