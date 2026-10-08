/* Cache app files only. ROMs and saves remain in separate device databases. */

const SHELL='nes-dream-shell-v1';let preparing=null,paused=false;

async function notify(message){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage({channel:'nes-offline',...message});}

const allowed=url=>url.origin===self.location.origin&&([".nojekyll","apple-touch-icon.png","assets","classic63.html","controller-classic.css","credits.html","ct2-english-font.json","ct2-english.js","dbz-crazy.js","dbz-crazy-cards.js","dbz-crazy-cards.css","dbz-card-editor.css","dbz-card-editor.js","dbz-english-font.json","dbz-english.js","dbz-explosive-wave.js","dbz-story-fix.js","dbz-fast-combat.js","dbz-large-battle.js","dbz-skills.css","dbz-skills.js","dbz-source-english.js","dbz-source-font.json","emulator","favicon.svg","fonts","frame-source.js","game-thumbnails","gamepad-controls.css","gamepad-controls.js","games","graphics-preview","index.html","legacy","little-finds","little-finds-harbour","little-finds-layer-test","little-finds-vectors","little-finds-worlds","manifest.webmanifest","offline-assets.json","offline-worker.js","pack-draw.js","pack-effects.js","pack-engine.js","pack-map.js","pack-match.js","pack-scenery.js","pack-ui.js","pack-worker.js","packs","player-runtime.js","player.html","power-core","power-player.js","preview","standard-player.js","touch-controls.js","zelda-tricks.css","zelda-tricks.js","dbz-crazy-route.js","dbz-crazy64.js","dbz-crazy64-cards.js","dbz-nail-recovery.js","dbz-skill-confirm.js","dbz-bp-growth.js","dbz-crazy128.js","dbz-crazy128-cards.js","dbz-limit256.js","dbz-limit256-cards.js","limit-break-256","controller-hub.js","controller-test.html","dbz-boss-fix.js","dbz-enemy-choice.css","dbz-enemy-choice.js","dbz-hundred.js","dbz-nail-fix.js","dbz-scouter-cards.png","dbz-scouter.js","dbz-training-fix.js","dbz-training-win.js","dbz-turbo.js","enemy-strength"].includes(url.pathname.split('/')[1])||url.pathname==='/')&&!url.pathname.startsWith('/api/')&&!url.pathname.includes('/auth/');

async function put(cache,url){const response=await fetch(url,{cache:'reload'});if(!response.ok||!allowed(new URL(response.url)))throw new Error('Cannot cache '+url);const stored=response.redirected?new Response(await response.clone().arrayBuffer(),{status:response.status,statusText:response.statusText,headers:response.headers}):response.clone();await cache.put(url,stored);return response;}

async function prepare(){

 const cache=await caches.open(SHELL),manifest=await fetch('/offline-assets.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Asset list unavailable');return r.json();});

 const assets=new Set(manifest.assets),root=await put(cache,'/'),html=await root.text();

 for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){const url=new URL(match[1],self.location.origin);if(allowed(url)&&/\.(?:js|css|woff2?)(?:$|\?)/.test(url.href))assets.add(url.pathname+url.search);}

 const saved=await cache.match('/__offline-version');if(saved&&await saved.text()===manifest.version){await notify({type:'ready'});return;}

 let done=0;for(const url of assets){if(paused){await notify({type:'paused'});return;}await put(cache,url);done++;if(done%8===0)await notify({type:'progress',done,total:assets.size});}

 await cache.put('/__offline-version',new Response(manifest.version));await notify({type:'ready'});

}

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));

// Player162: update cached home only after its current dependencies are ready.
// No game/save database access and no navigation of an active player.
async function refreshHomeShell(){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),8000);
 try{
  const cache=await caches.open(SHELL);
  const response=await fetch('/',{cache:'reload',signal:abort.signal});
  if(!response.ok||response.redirected)throw Error('Home shell unavailable');
  const html=await response.clone().text(),dependencies=new Set();
  for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
   const url=new URL(match[1],self.location.origin);
   if(allowed(url)&&/\.(?:js|css|woff2?)(?:$|\?)/.test(url.href))dependencies.add(url.pathname+url.search);
  }
  await Promise.all([...dependencies].map(async url=>{
   const result=await fetch(url,{cache:'reload',signal:abort.signal});
   if(!result.ok||result.redirected)throw Error('Home dependency unavailable');
   await cache.put(url,result.clone());
  }));
  await cache.put('/',response.clone());
  await cache.put('/index.html',response.clone());
 }catch{}finally{abort.abort();clearTimeout(timeout);}
}

self.addEventListener('activate',event=>event.waitUntil(Promise.all([self.clients.claim(),refreshHomeShell()])));

self.addEventListener('message',event=>{if(event.data?.type==='pause-offline'){paused=true;return;}if(event.data?.type!=='prepare-offline')return;paused=false;if(!preparing)preparing=prepare().catch(async()=>{await notify({type:'error'});}).finally(()=>{preparing=null;});event.waitUntil(preparing);});
// Never wait for a stalled connection before opening an already cached player.
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||!allowed(url)||url.pathname==='/offline-worker.js'||url.pathname==='/offline-assets.json')return;
 event.respondWith((async()=>{
  let cache;try{cache=await caches.open(SHELL);}catch{return fetch(request);}
  const navigation=request.mode==='navigate';
  let cached=await cache.match(request);
  if(!cached&&navigation&&url.pathname==='/')cached=await cache.match('/');
  const immutable=/^\/assets\/.*-[\w-]+\.(?:js|css)$/.test(url.pathname)||/^\/packs\/playback\//.test(url.pathname)||/^\/emulator\//.test(url.pathname);
  if(cached&&immutable)return cached;
  const network=fetch(request).then(response=>{
   if(response.ok&&!response.redirected&&(navigation||/\.(?:js|css|json|webmanifest|png|webp|svg|woff2?|wasm|data|html|ttf)$/.test(url.pathname))){
    const writes=[cache.put(request,response.clone())];
    if(navigation&&url.pathname==='/')writes.push(cache.put('/',response.clone()));
    event.waitUntil(Promise.all(writes).catch(()=>{}));
   }
   return response.ok||!cached?response:cached;
  }).catch(error=>{if(cached)return cached;throw error;});
  if(!cached)return network;
  // Refresh in the background even when the cached page wins the deadline.
  event.waitUntil(network.then(()=>{}).catch(()=>{}));
  let timer;
  try{return await Promise.race([network,new Promise(resolve=>{timer=setTimeout(()=>resolve(cached),1200);})]);}
  finally{clearTimeout(timer);}
 })());
});
