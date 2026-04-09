const CACHE = 'mga-v2';
const STATIC = ['/', '/index.html', '/manifest.json', '/css/main.css', '/favicon.ico', '/logo192.png', '/logo512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Skip external APIs - don't cache these
  if (url.hostname.includes('parseapi.back4app.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('paystack.co') ||
      url.hostname.includes('pexels.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Clone BEFORE reading - fixes the "body already used" error
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(e.request)
        .then(cached => cached || caches.match('/index.html'))
      )
  );
});
