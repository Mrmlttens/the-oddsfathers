// Living World Alpha One — free offline app shell. World saves are local to browser origin.
const CACHE='living-world-alpha-one-20261101';
const FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./alpha-art-atlas.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(all=>Promise.all(all.filter(k=>k.startsWith('living-world-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
// Network-first app shell during updates; cached fallback when offline.
e.respondWith(fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}return res}).catch(()=>caches.match(e.request)));});