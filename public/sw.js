const CACHE_NAME = 'finance-app-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // For now, simple network-first or just pass-through to pass PWA criteria
    event.respondWith(
        fetch(event.request).catch(() => {
            return new Response('Network error occurred');
        })
    );
});
