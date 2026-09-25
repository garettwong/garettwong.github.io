/* Cache app files only. ROMs and saves remain in separate device databases. */
const SHELL='nes-dream-shell-v1';let preparing=null,paused=false;
async function notify(message){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage({channel:'nes-offline',...message});}
const allowed=url=>url.origin===self.location.origin&&([".nojekyll","apple-touch-icon.png","assets","classic63.html","credits.html","emulator","favicon.svg","fonts","frame-source.js","game-thumbnails","games","graphics-preview","index.html","legacy","manifest.webmanifest","offline-assets.json","offline-worker.js","pack-draw.js","pack-effects.js","pack-engine.js","pack-map.js","pack-match.js","pack-scenery.js","pack-ui.js","pack-worker.js","packs","player-runtime.js","player.html","power-core","power-player.js","preview","touch-controls.js"].includes(url.pathname.split('/')[1])||url.pathname==='/')&&!url.pathname.startsWith('/api/')&&!url.pathname.includes('/auth/');
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
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='pause-offline'){paused=true;return;}if(event.data?.type!=='prepare-offline')return;paused=false;if(!preparing)preparing=prepare().catch(async()=>{await notify({type:'error'});}).finally(()=>{preparing=null;});event.waitUntil(preparing);});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||!allowed(url)||url.pathname==='/offline-worker.js'||url.pathname==='/offline-assets.json')return;
  event.respondWith((async()=>{const cache=await caches.open(SHELL);try{const response=await fetch(request);if(response.ok&&!response.redirected&&(request.mode==='navigate'||/\.(?:js|css|json|webmanifest|png|webp|svg|woff2?|wasm|data|html|ttf)$/.test(url.pathname)))await cache.put(request,response.clone());return response;}catch(error){const cached=await cache.match(request,{ignoreSearch:request.mode!=='navigate'});if(cached)return cached;if(request.mode==='navigate'&&url.pathname==='/')return await cache.match('/')||Response.error();throw error;}})());
});


