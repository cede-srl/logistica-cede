// Guarda la "cáscara" de la app para que abra rápido y muestre el aviso de sin conexión.
// Los datos siempre vienen en vivo de Google (no se guardan acá).
// También muestra los avisos push (Firebase) aunque la app esté cerrada: pedidos entregados (Logística)
// y tareas asignadas (Cuadrilla).
var CACHE = 'cede-logistica-v6';
var ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // lo de Google va directo
  // Primero la red (para tomar cambios); si no hay internet, lo guardado
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (r) { return r || caches.match('index.html'); });
    })
  );
});

// Aviso push de Firebase: llega { data: { titulo, texto, tag, ver } } (lo mandan los scripts de Logística y Cuadrilla)
self.addEventListener('push', function (e) {
  var p = {};
  try { p = e.data ? e.data.json() : {}; } catch (x) { p = { data: { texto: e.data ? e.data.text() : '' } }; }
  var d = p.data || p.notification || {};
  e.waitUntil(self.registration.showNotification(String(d.titulo || d.title || 'CEDE'), {
    body: String(d.texto || d.body || ''),
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: String(d.tag || 'cede'),
    renotify: true,
    data: { ver: String(d.ver || '') }
  }));
});

// Al tocar un aviso, abre (o trae al frente) la app; si es de una tarea, va directo a Cuadrilla
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var ver = (e.notification.data && e.notification.data.ver) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) {
      if ('focus' in l[i]) {
        if (ver) l[i].postMessage({ cede: 'ir', ver: ver });
        return l[i].focus();
      }
    }
    return self.clients.openWindow('./' + (ver ? '?ver=' + encodeURIComponent(ver) : ''));
  }));
});
