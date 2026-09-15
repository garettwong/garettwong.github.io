/* Scene-art replacement is separate from game logic. Unmatched scenes are untouched. */

(function(global){

 function validatePack(p){if(p?.version!==1||!Array.isArray(p.romSha256)||!Array.isArray(p.rules)||p.rules.length>1024)throw new Error("Invalid artwork pack");for(const r of p.rules){if(!r.id||!Array.isArray(r.region)||r.region.length!==4||!Array.isArray(r.signature)||r.signature.length!==64)throw new Error("Invalid artwork rule");const[x,y,w,h]=r.region;if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>256||y+h>240)throw new Error("Artwork region outside game image");if(typeof r.image!=="string"||!r.image.startsWith("/packs/")||r.image.includes(".."))throw new Error("Unsafe artwork asset path");if(!r.signature.every(n=>Number.isInteger(n)&&n>=0&&n<=255))throw new Error("Invalid artwork signature");}return p;}

 function signature(pixels,region){const[x,y,w,h]=region,lum=[];for(let row=0;row<8;row++)for(let col=0;col<8;col++){const xx=Math.min(255,x+Math.floor((col+.5)*w/8)),yy=Math.min(239,y+Math.floor((row+.5)*h/8)),i=(yy*256+xx)*4;lum.push(Math.round(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]));}return lum;}

 function distance(a,b){return a.reduce((s,n,i)=>s+Math.abs(n-b[i]),0)/a.length;}

 class DreamArtwork{

  constructor({gameId,canvas,overlay,onStatus,onDisplay}){

   Object.assign(this,{gameId,canvas,overlay,onStatus,onDisplay,enabled:true,stopped:false,rules:[],lastStatus:"",assets:new Map(),pending:new Set(),failedAssets:new Set(),queue:[],loading:0,scenery:null,ui:null,map:null,busy:false,generation:0,frameInterval:1000/60,nextFrameAt:0});

   this.scratch=document.createElement("canvas");this.scratch.width=256;this.scratch.height=240;this.ctx=this.scratch.getContext("2d",{willReadFrequently:true});this.out=overlay.getContext("2d",{alpha:false});

   this.debug=new URLSearchParams(location.search).has('debug');this.metrics={frames:0,workerMs:0,drawMs:0};

  }

  setEnabled(v){if(v&&this.stopped){this.notifyDisplay(false,'unavailable');return;}this.enabled=v;this.notifyDisplay(false,v?'preparing':'off');if(global.DreamFrameSource){global.DreamFrameSource.enabled=v&&this.rules.length>0;global.DreamFrameSource.requested=true;}this.generation++;this.waitingFrame=null;if(this.canvas?.style)this.canvas.style.opacity=v&&this.rules.length?'0':'';if(!v)this.overlay.style.display="none";}

  resetFrame(){this.generation++;this.waitingFrame=null;this.lastFrame=null;if(global.DreamFrameSource){global.DreamFrameSource.pixels=null;global.DreamFrameSource.requested=true;}this.nextFrameAt=0;}

  notifyDisplay(active,reason){const key=active+':'+reason;if(this.displayState===key)return;this.displayState=key;this.onDisplay?.({active,reason,detail:this.failureReason||''});}

  status(t){if(t!==this.lastStatus){this.lastStatus=t;this.onStatus(t);}}

  async prepare(){

   if(this.prepared)return;

   const index=await fetch('/packs/index.json').then(r=>r.json()),entry=index.packs.find(p=>p.romSha256.includes(this.gameId));

   if(!entry){this.prepared=true;return;}

   const pack=global.DreamPatternTools.validateSearch(validatePack(await fetch(entry.manifest).then(r=>r.json())));

   if(!pack.romSha256.includes(this.gameId))throw new Error('Artwork pack does not match this ROM');

   this.rules=pack.rules;this.effects=pack.effects===true;

   for(const [key,validator] of [['scenery',global.DreamSceneryTools],['map',global.DreamMapTools],['ui',global.DreamHudTools]])if(pack[key]){if(typeof pack[key]!=='string'||!pack[key].startsWith('/packs/')||pack[key].includes('..'))throw new Error('Invalid artwork path');this[key]=validator.validate(await fetch(pack[key]).then(r=>r.json()));}

   if(this.ui)await global.DreamHudTools.loadFont();

   const catalogue=await fetch('/packs/playback-assets.json').then(r=>{if(!r.ok)throw new Error('Artwork download failed');return r.json();});

   const names=new Set(this.rules.map(r=>r.image));for(const t of this.map?.tiles||[])names.add(t.image);if(this.scenery)for(const scene of [this.scenery,...this.scenery.alternates||[]])names.add(scene.image);

   let loaded=0;const paths=[...names];let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<paths.length){const path=paths[cursor++];

    if(this.stopped)return;

    const item=catalogue.assets?.[path];if(!item?.url?.startsWith('/packs/playback/')||item.url.includes('..'))throw new Error('Incomplete artwork download');

    const asset=new Image();asset.src=item.url;await asset.decode();

    if(asset.width!==item.width||asset.height!==item.height)throw new Error('Artwork size mismatch');

    this.assets.set(path,asset);loaded++;this.status('Preparing artwork '+loaded+' / '+names.size+' — game starts afterwards');

   }}));

   this.metrics.preloadedImages=loaded;this.metrics.artworkMemoryBytes=catalogue.decodedBytes;this.prepared=true;this.notifyDisplay(false,'ready');

  }

  async start(){try{

   await this.prepare();if(!this.rules.length){this.notifyDisplay(false,'no-pack');this.status('Original graphics · no artwork pack for this ROM yet');return;}

   this.setEnabled(this.enabled);

   try{this.workerReady=false;this.workerStartedAt=performance.now();this.lastTickAt=this.workerStartedAt;this.worker=new Worker('/pack-worker.js?v=5');this.worker.onmessage=event=>{const d=event.data;if(d.type==='ready'){this.workerReady=true;this.notifyDisplay(false,'ready');if(global.DreamFrameSource)global.DreamFrameSource.requested=true;return;}this.busy=false;if(d.error){this.stop('Artwork worker could not load');this.status('Artwork worker could not load');return;}if(this.enabled&&!this.stopped&&d.generation===this.generation){try{this.frameInterval=Math.max(1000/60,(d.workerMs||0));this.nextFrameAt=0;this.present(d);if(global.DreamFrameSource)global.DreamFrameSource.requested=true;}catch(error){console.warn(error);this.stop('Artwork display failed');this.status('Artwork display failed');}}};this.worker.onerror=()=>{this.stop('Artwork worker could not load');this.status('Artwork worker could not load');};this.worker.postMessage({type:'init',rules:this.rules,scenery:this.scenery,map:this.map,ui:this.ui,effects:this.effects});}catch{this.stop('Artwork worker could not load');this.status('Artwork worker could not load');return;}

   this.nativeListener=()=>this.dispatchFrame();if(global.DreamFrameSource)global.DreamFrameSource.onFrame=this.nativeListener;this.notifyDisplay(false,'preparing');this.status('Starting artwork');this.tick();

  }catch(e){console.warn(e);this.stop('Artwork download failed');this.status('Artwork download failed');}}

  loadAsset(path){

   if(this.assets.has(path)||this.pending.has(path)||this.failedAssets.has(path))return;

   this.pending.add(path);this.queue.push(path);this.pumpAssets();

  }

  pumpAssets(){

   while(!this.stopped&&this.loading<1&&this.queue.length){const path=this.queue.shift();this.loading++;const asset=new Image();asset.src=path;

    asset.decode().then(()=>{if(this.stopped)return;const scale=Math.min(1,512/Math.max(asset.width,asset.height)),small=document.createElement('canvas');small.width=Math.max(1,Math.round(asset.width*scale));small.height=Math.max(1,Math.round(asset.height*scale));small.getContext('2d').drawImage(asset,0,0,small.width,small.height);this.assets.set(path,small);while(this.assets.size>96){const protectedImages=this.requiredImages(this.waitingFrame);const key=[...this.assets.keys()].find(k=>!protectedImages.has(k));if(!key)break;this.assets.delete(key);}}).catch(()=>{this.failedAssets.add(path);}).finally(()=>{this.loading--;this.pending.delete(path);this.pumpAssets();if(this.waitingFrame&&!this.stopped&&this.enabled)this.present(this.waitingFrame);});}

  }

  analyse(pixels){return {pixels,matches:global.DreamPatternTools.findMatches(pixels,this.rules),scenery:this.scenery?global.DreamSceneryTools.match(pixels,this.scenery):null,ui:this.ui?global.DreamHudTools.match(pixels,this.ui):null,effects:this.effects?global.DreamEffectTools.match(pixels):[],mapTiles:this.map?global.DreamMapTools.match(pixels,this.map):[]};}

  requiredImages(d){const names=new Set();if(!d)return names;for(const r of d.matches||[])names.add(r.index===undefined?r.image:this.rules[r.index].image);for(const t of d.mapTiles||[])names.add(t.image);if(d.scenery)names.add(d.scenery.image);return names;}

  present(d){

   // Keep the last complete composite while its successor's images decode.

   this.waitingFrame=d;const needed=[...this.requiredImages(d)].filter(p=>!this.assets.has(p)&&!this.failedAssets.has(p));for(const p of needed)this.loadAsset(p);if(needed.length){this.metrics.waitingImages=needed.length;return;}this.waitingFrame=null;this.metrics.waitingImages=0;

   const start=performance.now(),pixels=d.pixels,matches=d.matches.map(r=>r.index===undefined?r:{...this.rules[r.index],region:r.region}),{scenery,ui,effects,mapTiles}=d;if(ui)ui.pixels=pixels;

   const {cw,ch,vw,vh,ox,oy}=this.viewport(),rect=this.canvas.getBoundingClientRect(),rw=rect.width*vw/cw,rh=rect.height*vh/ch,scale=Math.min(devicePixelRatio||1,1.5,512/Math.max(rw,1)),width=Math.max(1,Math.round(rw*scale)),height=Math.max(1,Math.round(rh*scale));

   if(this.overlay.width!==width||this.overlay.height!==height){this.overlay.width=width;this.overlay.height=height;}

   Object.assign(this.overlay.style,{left:rect.left+rect.width*ox/cw+'px',top:rect.top+rect.height*oy/ch+'px',width:rw+'px',height:rh+'px',display:'block'});

   // Present one complete, opaque frame. Never combine old artwork with a newer live canvas.

   this.ctx.putImageData(new ImageData(pixels,256,240),0,0);this.out.imageSmoothingEnabled=false;this.out.drawImage(this.scratch,0,0,width,height);this.out.imageSmoothingEnabled=true;

   for(const tile of mapTiles)this.loadAsset(tile.image);

   if(mapTiles.length)global.DreamMapTools.draw(this.out,this.assets,mapTiles,pixels,width,height);

   if(ui)global.DreamHudTools.draw(this.out,ui,width,height);

   if(scenery){const image=this.assets.get(scenery.image);if(image)global.DreamSceneryTools.draw(this.out,image,scenery,width,height);else this.loadAsset(scenery.image);}

   for(const r of matches){const asset=this.assets.get(r.image);if(!asset){this.loadAsset(r.image);continue;}global.DreamDrawTools.sprite(this.out,asset,r,width,height);}

   if(effects.length)global.DreamEffectTools.draw(this.out,effects,width,height);

   this.notifyDisplay(true,'active');this.lastFrame=d;this.metrics.presentedFrameAgeMs=d.capturedAt===undefined?null:Math.round(performance.now()-d.capturedAt);this.metrics.maxPresentedFrameAgeMs=Math.max(this.metrics.maxPresentedFrameAgeMs||0,this.metrics.presentedFrameAgeMs||0);this.metrics.frames++;this.metrics.workerMs=d.workerMs||0;this.metrics.drawMs=performance.now()-start;

   if(this.debug){this.overlay.dataset.match=matches.map(r=>r.id).join(',');this.overlay.dataset.viewport=[cw,ch,vw,vh,ox,oy].join(',');this.overlay.dataset.workerMs=String(this.metrics.workerMs);}

  }

  viewport(){const aspect=global.EJS_emulator?.gameManager?.getVideoDimensions('aspect')||4/3,cw=this.canvas.width,ch=this.canvas.height,vw=Math.min(cw,ch*aspect),vh=vw/aspect;return {cw,ch,vw,vh,ox:(cw-vw)/2,oy:cw<ch?0:(ch-vh)/2};}

  tick(){

   if(this.stopped)return;this.raf=requestAnimationFrame(()=>this.tick());if(!this.enabled||this.suspended||!this.canvas?.width||document.hidden){return;}const now=performance.now();const gap=now-(this.lastTickAt??now);this.lastTickAt=now;if(gap>1000){this.dispatchedAt=now;this.workerStartedAt=now;}if(this.workerReady===false){if(now-this.workerStartedAt>30000)this.recover('Artwork worker download timed out');return;}if(!this.rateAt){this.rateAt=now;this.rateNative=global.DreamFrameSource?.totalFrames||0;this.rateArtwork=this.metrics.frames;}else if(now-this.rateAt>=1000){this.metrics.gameFps=Math.round(((global.DreamFrameSource?.totalFrames||0)-this.rateNative)*1000/(now-this.rateAt));this.metrics.artworkFps=Math.round((this.metrics.frames-this.rateArtwork)*1000/(now-this.rateAt));this.metrics.artworkIntervalMs=Math.round(this.frameInterval);this.rateAt=now;this.rateNative=global.DreamFrameSource?.totalFrames||0;this.rateArtwork=this.metrics.frames;}if(this.lastFrame?.capturedAt!==undefined)this.metrics.visibleFrameAgeMs=Math.round(now-this.lastFrame.capturedAt);if(this.busy){if(now-this.dispatchedAt<2000)return;this.recover('Artwork worker stopped responding');return;}if(this.waitingFrame)return;if(now<this.nextFrameAt){if(now+17>=this.nextFrameAt&&global.DreamFrameSource)global.DreamFrameSource.requested=true;return;}

   this.dispatchFrame();

  }

  dispatchFrame(){
   if(this.stopped||!this.enabled||this.busy||this.waitingFrame||document.hidden||this.suspended||this.workerReady===false||!this.worker)return;
   try{const native=global.DreamFrameSource;if(native?.canvas!==this.canvas||!native.pixels?.byteLength){if(native)native.requested=true;return;}
    const pixels=native.pixels,capturedAt=native.capturedAt;this.lastNativeSeq=native.seq;native.pixels=null;this.metrics.source='native-video';this.busy=true;this.dispatchedAt=performance.now();
    this.worker.postMessage({type:'frame',pixels,capturedAt,generation:this.generation},[pixels.buffer]);
   }catch(error){console.warn('Artwork compositor stopped',error);this.stop('Artwork frame could not be processed');this.status('Artwork frame could not be processed');}
  }

  suspend(){this.suspended=true;this.resetFrame();}

  resume(){this.suspended=false;this.dispatchedAt=performance.now();this.workerStartedAt=performance.now();this.lastTickAt=performance.now();this.resetFrame();}

  async retry(){if(this.restarting)return;this.restarting=true;this.stop();this.stopped=false;this.failureReason='';this.displayState='';this.busy=false;this.enabled=true;this.resetFrame();try{await this.start();}finally{this.restarting=false;}}

  recover(reason){this.metrics.recoveries=(this.metrics.recoveries||0)+1;if(this.metrics.recoveries<=2){void this.retry();}else{this.stop(reason);this.status(reason+' · tap Retry artwork');}}

  stop(reason){this.failureReason=reason||this.failureReason;this.stopped=true;this.notifyDisplay(false,'unavailable');if(global.DreamFrameSource){global.DreamFrameSource.enabled=false;if(global.DreamFrameSource.onFrame===this.nativeListener)global.DreamFrameSource.onFrame=null;}this.worker?.terminate();this.worker=null;this.waitingFrame=null;if(this.canvas?.style)this.canvas.style.opacity='';this.queue.length=0;cancelAnimationFrame(this.raf);this.overlay.style.display='none';}

 }

 global.DreamArtwork=DreamArtwork;global.DreamPackTools={validatePack,signature,distance};

})(typeof window!=="undefined"?window:globalThis);

