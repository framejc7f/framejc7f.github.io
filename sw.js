const CACHE_NAME = 'finance-pwa-v5';
const APP_SHELL = [
    './',
    './index.html',
    './auth.html',
    './manifest.json',
    './public/icons/icon.png',
    './src/styles/main.css',
    './src/main.js',
    './src/auth.js',
    './src/app/app.js',
    './src/app/client.js',
    './src/app/cloud.js',
    './src/app/dom.js',
    './src/app/events.js',
    './src/app/modal.js',
    './src/app/services.js',
    './src/app/state.js',
    './src/app/utils.js',
    './src/app/renderers/analytics.js',
    './src/app/renderers/balance.js',
    './src/app/renderers/calendar.js',
    './src/app/renderers/obligations.js',
    './src/app/renderers/transactions.js',
    './src/app/renderers/ui.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        ))
    );

    self.clients.claim();
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);

        if (request.method === 'GET' && response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cached = await cache.match(request);

        if (cached) {
            return cached;
        }

        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkPromise = fetch(request)
        .then((response) => {
            if (request.method === 'GET' && response.ok) {
                cache.put(request, response.clone());
            }

            return response;
        })
        .catch(() => cached);

    return cached || networkPromise;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});
