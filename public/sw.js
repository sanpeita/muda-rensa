const CACHE='muda-rensa-shell-v1';
const ASSETS=['/index.html','/src/main.js','/src/config.js','/src/game.js','/src/input.js','/src/render.js','/src/persistence.js','/src/offline.js','/src/style.css','/vendor/three.module.js','/vendor/three.core.js','/manifest.webmanifest','/icons/drone.svg','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{
 // A failed download must never be reported as a complete offline copy.
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
 // Updates wait for the old app to close; no forced switch during a game.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('muda-rensa-shell-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const path=event.request.mode==='navigate'?'/index.html':url.pathname;
 if(!ASSETS.includes(path))return;
 event.respondWith((async()=>{
  const cached=await (await caches.open(CACHE)).match(path);
  return cached||fetch(event.request);
 })());
});
self.addEventListener('message',event=>{
 if(event.data!=='offline-status'||!event.ports[0])return;
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const complete=(await Promise.all(ASSETS.map(path=>cache.match(path)))).every(Boolean);
  event.ports[0].postMessage({complete});
 })());
});
