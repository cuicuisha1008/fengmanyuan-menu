'use strict';
const CACHE='fengmanyuan-offline-v3-cart';
const FILES=['./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
const urls=FILES.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fengmanyuan-offline-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||!request.url.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const target=request.mode==='navigate'?urls[0]:request;
  const cached=await cache.match(target);
  return cached||fetch(request);
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='CHECK_OFFLINE'||!event.ports[0])return;
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const entries=await Promise.all(urls.map(url=>cache.match(url)));
  event.ports[0].postMessage({ready:entries.every(r=>r&&r.ok),version:CACHE});
 })().catch(()=>event.ports[0].postMessage({ready:false})));
});
