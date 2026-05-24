const CACHE_NAME = 'tsqm9-v2';
const ASSETS = [
  '/TSQM-9/',
  '/TSQM-9/index.html',
  '/TSQM-9/css/style.css',
  '/TSQM-9/js/app.js',
  '/TSQM-9/js/questions.js',
  '/TSQM-9/js/calculator.js',
  '/TSQM-9/manifest.json',
  '/TSQM-9/icon-192.png',
  '/TSQM-9/icon-512.png',
  '/TSQM-9/screenshot-mobile.png',
  '/TSQM-9/screenshot-desktop.png'
];

// Логика установки
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Активация и удаление старого кэша
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Стратегия перехвата запросов
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});