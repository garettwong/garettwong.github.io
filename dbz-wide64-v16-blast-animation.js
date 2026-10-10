/* Group presentation made only from the original DBZ2 framebuffer and effects. */
(function(global){'use strict';
const sprites=new Map(),heroes=new Map(),effects={},bodies=new Map();let lastDraw=null,castFrame=null,castHero=null;let frame=null,terrain=null,lastType=null,observations=0,appearanceRoster=[],appearanceTotal=0;
const load=(src,store)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{store(im);resolve();};im.onerror=()=>reject(Error('Cannot load native battle artwork: '+src));im.src=src;});
const ready=Promise.all([ ...['wave','impact1','impact2'].map(name=>load('/packs/wide64-v16-native/'+name+'.png',im=>effects[name]=im)), fetch('/packs/wide64-v16-native/enemies/manifest.json').then(r=>{if(!r.ok)throw Error('Native enemy manifest is unavailable.');return r.json();}).then(m=>Promise.all(m.types.map(type=>load('/packs/wide64-v16-native/enemies/body-type-'+type+'.png',im=>bodies.set(type,im))))) ]);
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function image(pixels,x,y,w,h,alpha=false){const c=canvas(w,h),d=new Uint8ClampedArray(w*h*4);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const from=((y+j)*256+x+i)*4,to=(j*w+i)*4;d.set(pixels.subarray(from,from+4),to);if(alpha&&Math.max(d[to],d[to+1],d[to+2])<9)d[to+3]=0;}c.getContext('2d').putImageData(new ImageData(d,w,h),0,0);return c;}
function components(pixels){
 const W=256,H=124,seen=new Uint8Array(W*H),out=[],lit=i=>Math.max(pixels[i*4],pixels[i*4+1],pixels[i*4+2])>35;
 for(let y=8;y<H;y++)for(let x=0;x<W;x++){const origin=y*W+x;if(seen[origin]||!lit(origin))continue;const queue=[origin];seen[origin]=1;let left=x,right=x,top=y,bottom=y,count=0,orange=0,tinted=0;
  for(let at=0;at<queue.length;at++){const i=queue[at],xx=i%W,yy=(i/W)|0;left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);count++;if(Math.max(pixels[i*4],pixels[i*4+1],pixels[i*4+2])-Math.min(pixels[i*4],pixels[i*4+1],pixels[i*4+2])>40)tinted++;if(pixels[i*4]>160&&pixels[i*4+1]<155&&pixels[i*4+2]<80)orange++;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=xx+dx,ny=yy+dy,k=ny*W+nx;if(nx<0||nx>=W||ny<8||ny>=H||seen[k]||!lit(k))continue;seen[k]=1;queue.push(k);}
  }
  const w=right-left+1,h=bottom-top+1;if(count>=45&&w>=8&&w<=48&&h>=13&&h<=52&&orange/count<.65&&tinted/count>.08&&left>1&&right<254)out.push({x:left,y:top,w,h,count,cx:(left+right)/2});
 }
 return out;
}
function observe(pixels,meta){
 if(!pixels||pixels.length!==256*240*4||!meta)return;frame=image(pixels,0,0,256,240);observations++;
 const parts=components(pixels);
 // Capture the complete native bodies, never portraits or replacement artwork.
 const right=parts.filter(p=>p.cx>125).sort((a,b)=>b.count-a.count)[0],left=parts.filter(p=>p.cx<105).sort((a,b)=>b.count-a.count)[0];
 if(right&&meta.type!==undefined){
  const pose=image(pixels,right.x,right.y,right.w,right.h,true),data=pose.getContext('2d').getImageData(0,0,pose.width,pose.height).data;let hash=2166136261;for(const byte of data)hash=Math.imul(hash^byte,16777619);
  let pool=sprites.get(meta.type)||[],largest=Math.max(right.count,...pool.map(p=>p.count));pool=pool.filter(p=>p.count>=largest*.55);
  if(right.count>=largest*.55&&!pool.some(p=>p.hash===hash)&&pool.length<16)pool.push({image:pose,count:right.count,hash});
  sprites.set(meta.type,pool);lastType=meta.type;
 }
 if(left&&right&&meta.actor!==undefined)heroes.set(meta.actor,{image:image(pixels,left.x,left.y,left.w,left.h,true),count:left.count});
 // Original ground is below the flying fighters; keep its actual scrolling frame.
 let coloured=0;for(let y=132;y<160;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;if(pixels[i]+pixels[i+1]+pixels[i+2]>100)coloured++;}
 if(coloured>150&&coloured<6000)terrain=image(pixels,0,128,256,32);
}
function appearanceFor(id,total){
 if(appearanceTotal!==total||!appearanceRoster.length){
  const palette=[...bodies.keys()].sort((a,b)=>a-b);if(!palette.length)return null;
  appearanceTotal=total;appearanceRoster=Array.from({length:total},(_,i)=>palette[i%palette.length]);
  let seed=(total*2654435761)>>>0;for(let i=total-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[appearanceRoster[i],appearanceRoster[j]]=[appearanceRoster[j],appearanceRoster[i]];}
 }
 return appearanceRoster[id]??null;
}
function random(seed){let v=(seed+0x6d2b79f5)|0;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296;}
function poses(enemies,time,group){const base=[[137,39,.55],[179,42,.60],[220,38,.55],[119,78,.78],[163,80,.83],[217,77,.82],[149,116,1],[211,115,.96]];return enemies.map((enemy,i)=>{const [x,y,s]=base[i],seed=(enemy.id+1)*1013+(group+1)*7919,r=n=>random(seed+n*211);return{
 x:Math.round(x+(r(1)-.5)*13+Math.sin(time*(.7+r(2)*1.4)+r(3)*6.28)*(3+r(4)*6)),
 y:Math.round(y+(r(5)-.5)*9+Math.cos(time*(.8+r(6)*1.5)+r(7)*6.28)*(2+r(8)*4)),
 s:s*(.94+r(9)*.12),flip:(i+(group%3))%3===1,poseOffset:Math.floor(r(10)*97),poseRate:2+r(11)*2.5,delay:0,seed
 };});}
function fighter(ctx,sprite,x,y,w,h,flip){ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(sprite,Math.round(-w/2),Math.round(-h/2),w,h);ctx.restore();}
function counter(ctx,remaining,total){ctx.fillStyle='#000';ctx.fillRect(4,3,110,16);ctx.fillStyle='#fff';ctx.font='700 9px Arial,sans-serif';ctx.textAlign='left';ctx.fillText(`${remaining} / ${total} ENEMIES`,8,14);}
function draw(ctx,width,height,scene){
 const p=Math.max(0,Math.min(1,scene.progress||0)),time=0,enemies=(scene.enemies||[]).slice(0,7),pos=poses(enemies,time,scene.groupIndex||0);
 ctx.save();ctx.scale(width/256,height/240);ctx.imageSmoothingEnabled=false;if(castFrame||frame)ctx.drawImage(castFrame||frame,0,0);else{ctx.fillStyle='#000';ctx.fillRect(0,0,256,240);}lastDraw={bodies:0,blasts:0,ids:[],appearances:[],missing:[],progress:p,waiting:!!scene.waiting,launch:0,first:!!scene.first};ctx.fillStyle='#000';ctx.fillRect(0,0,256,160);if(terrain)ctx.drawImage(terrain,0,128);
 const hero=castHero||heroes.get(scene.actor)?.image;if(hero)ctx.drawImage(hero,34,78,hero.width,hero.height);
 // Distant enemies are drawn first; all figures retain the original pixel art.
 for(let i=0;i<enemies.length;i++){const e=enemies[i],at=pos[i],pool=sprites.get(e.type)||[],displayType=appearanceFor(e.id,scene.total),sprite=bodies.get(displayType)||bodies.get(e.type)||pool[(at.poseOffset+Math.floor(time*at.poseRate))%pool.length]?.image;if(!sprite){lastDraw.missing.push(e.type);continue;}const phase=p-at.delay,hit=e.afterHp<e.beforeHp,fall=hit&&e.afterHp===0?Math.max(0,Math.min(1,(phase-.43)/.57)):0,shake=hit&&phase>.16&&phase<.43?Math.sin(phase*180)*2:0;
  if(fall>=1)continue;lastDraw.bodies++;lastDraw.ids.push(e.id);lastDraw.appearances.push({id:e.id,type:displayType,nativeType:e.type});const w=Math.max(8,Math.round(sprite.width*at.s)),h=Math.max(12,Math.round(sprite.height*at.s));
  ctx.save();ctx.translate(at.x+shake,at.y+fall*fall*150);if(fall>0)ctx.rotate((at.flip?-1:1)*fall*.9);ctx.globalAlpha=fall>.75?(1-fall)/.25:1;fighter(ctx,sprite,0,0,w,h,at.flip);ctx.restore();
 }
 if(scene.first&&scene.launchProgress<1){const wave=effects.wave;if(wave){const t=scene.launchProgress,x=44+t*170;ctx.drawImage(wave,Math.round(x-17),63,34,34);lastDraw.launch=1;lastDraw.launchX=x;}}
 if(!scene.waiting&&!(scene.first&&scene.launchProgress<1)){
  // Only the opening group travels; subsequent groups begin at impact.
  for(let i=0;i<enemies.length;i++){const e=enemies[i],at=pos[i],phase=p-at.delay;if(phase>=.12&&phase<.48){const im=effects[(Math.floor(phase*30)&1)?'impact1':'impact2'];if(im){const size=Math.round(30*at.s);ctx.drawImage(im,at.x-size/2,at.y-size/2,size,size);lastDraw.blasts++;}}}
 }
 const defeated=scene.waiting?0:enemies.filter((e,i)=>e.afterHp===0&&e.beforeHp>0&&p>=1).length;
 const remaining=Math.max(0,(scene.remainingBefore??scene.remaining??0)-defeated);
 counter(ctx,remaining,scene.total);

 ctx.restore();
}
function beginCast(actor){
 castFrame=frame;const overlay=global.dreamArtwork?.overlay;
 if(frame&&overlay&&overlay.width&&getComputedStyle(overlay).display!=='none'){
  castFrame=canvas(256,240);const context=castFrame.getContext('2d');context.imageSmoothingEnabled=false;context.drawImage(frame,0,0);context.drawImage(overlay,0,0,256,240);
 }
 castHero=heroes.get(actor)?.image||null;
}
function reset(){castFrame=null;castHero=null;sprites.clear();heroes.clear();frame=null;terrain=null;lastType=null;observations=0;}
global.DreamGroupBlastVisual={ready,appearanceFor,observe,draw,reset,beginCast,inspect:()=>({lastDraw,preloaded:[...bodies.keys()],observations,enemies:[...sprites.keys()],poseCounts:Object.fromEntries([...sprites].map(([k,v])=>[k,v.length])),heroes:[...heroes.keys()],terrain:!!terrain})};
})(typeof window==='undefined'?globalThis:window);
