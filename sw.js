const CACHE_NAME = 'xpense-pro-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/js/app.js',
    '/js/store.js',
    '/js/utils/charts.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
