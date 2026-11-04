// Service worker: guarda la app en el teléfono para que funcione sin internet.
// Al publicar una versión nueva, cambia VERSION para que los teléfonos la descarguen.
const VERSION = 'aip-v1.0.0';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/db.js',
  'js/ui.js',
  'js/scanner.js',
  'js/excel.js',
  'js/screens/home.js',
  'js/screens/products.js',
  'js/screens/scan.js',
  'js/screens/places.js',
  'js/screens/alerts.js',
  'js/screens/reports.js',
  'js/screens/more.js',
  'vendor/xlsx.mini.min.js',
  'vendor/zxing.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== 'aip-fonts' && k.startsWith('aip-')).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Letras de Google Fonts: se guardan la primera vez que se usan.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open('aip-fonts');
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      } catch (_) {
        return new Response('', { status: 404 });
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Archivos de la app: primero lo guardado, si no, internet.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (_) {
      if (req.mode === 'navigate') return cache.match('index.html');
      throw _;
    }
  })());
});
