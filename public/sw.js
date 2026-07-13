const CACHE_NAME = 'nexus-chat-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We just need a fetch handler to satisfy PWA installability requirements
  // We won't aggressively cache everything to avoid breaking the chat app
  event.respondWith(fetch(event.request).catch(() => {
    return caches.match(event.request);
  }));
});