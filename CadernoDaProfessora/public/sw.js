// Service worker simples: deixa o app instalável e guarda a casca do app para abrir rápido.
const CACHE = 'caderno-v2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; })));
  }
});

// Notificações: o servidor manda só um "toque"; aqui buscamos o texto e mostramos.
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let a = { titulo: 'Caderno da Professora', corpo: 'Tem novidade no seu caderno.', url: '/' };
    try { const r = await fetch('/api/avisos/ultimo', { credentials: 'include', cache: 'no-store' }); if (r.ok) a = { ...a, ...(await r.json()) }; } catch {}
    await self.registration.showNotification(a.titulo, { body: a.corpo, icon: '/icon', badge: '/icon', data: { url: a.url || '/' }, tag: 'caderno', renotify: true });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abas) { if ('focus' in c) { await c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
