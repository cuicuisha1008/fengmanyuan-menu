'use strict';
const CACHE='fengmanyuan-offline-v7-categories';
const FILES=['./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
const urls=FILES.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  const old=keys.filter(k=>k.startsWith('fengmanyuan-offline-')&&k!==CACHE);
  await Promise.all(old.map(k=>caches.delete(k)));
  await self.clients.claim();
  // Early versions never reloaded when an updated worker took control.
  // Their cart is persisted on every change, so upgrade the open pages too.
  if(old.length){
   const windows=await self.clients.matchAll({type:'window'});
   await Promise.allSettled(windows.filter(client=>client.url.startsWith(self.registration.scope)).map(client=>client.navigate(client.url)));
  }
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||!request.url.startsWith(self.registration.scope))return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetch(new Request(request,{cache:'no-cache',signal:controller.signal}));
    if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error('Menu unavailable');
    await cache.put(urls[0],response.clone());
    return response;
   }catch(error){
    const cached=await cache.match(urls[0]);
    if(cached)return cached;
    throw error;
   }finally{clearTimeout(timer)}
  })());
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  return await cache.match(request)||fetch(request);
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
