// Seguimiento IPR (versión de prueba sin señal, carpeta /prueba/): guarda la portada, la app y los íconos para poder abrirla sin señal. Los datos están en Google Apps Script
// y lo que se registra sin señal lo guarda app.html en el celular (IndexedDB) hasta que vuelve la conexión.
const VERSION = "seguimiento-ipr-prueba-v1";
const ARCHIVOS = ["./", "./index.html", "./app.html", "./manifest.webmanifest", "../icons/icon-192.png", "../icons/icon-512.png", "../icons/apple-touch-icon.png", "../icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n.startsWith("seguimiento-ipr-prueba-") && n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Se guarda una sola copia por archivo (sin ?v=…). Primero la red (para recibir cambios). Si no hay señal, o la señal es tan débil que no responde en 4 s, lo guardado.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(guardado => {
    const red = fetch(e.request).then(r => {
      if (r && r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(url.origin + url.pathname, copia)); }
      return r;
    });
    const respaldo = () => guardado || caches.match("./index.html");
    if (!guardado) return red.catch(respaldo);
    return Promise.race([red.catch(respaldo), new Promise(ok => setTimeout(() => ok(guardado), 4000))]);
  }));
});
