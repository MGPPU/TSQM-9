const CACHE_NAME = 'tsqm9-v1';
const ASSETS = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/questions.js',
  'js/calculator.js',
  'manifest.json',
  'icon.png'
];

// Установка воркера и кэширование ресурсов
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Активация и очистка старого кэша
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

// Стратегия: Сначала сеть, если нет сети — кэш
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});