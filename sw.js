const CACHE = "asma-v19";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "qr.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin && !req.url.startsWith("https://fonts.")) return; // عداد الزيارات وأي خدمة خارجية: من الإنترنت دائمًا
  const isPage = req.mode === "navigate" || req.destination === "document" || req.url.endsWith(".html") || req.url.endsWith("/");
  if (isPage) {
    // الصفحة: من الإنترنت أولًا (أحدث نسخة)، والنسخة المحفوظة عند انقطاع الاتصال
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(h => h || caches.match("index.html")))
    );
    return;
  }
  // بقية الملفات: من المحفوظ أولًا مع تحديثه في الخلفية
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
