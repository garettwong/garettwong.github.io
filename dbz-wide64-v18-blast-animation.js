/* One complete cohort per animation. Artwork identity is the actual encounter type. */

(function(global){'use strict';

const bodies=new Map(),effects={};let frame=null,castFrame=null,lastDraw=null,observations=0;

const load=(src,store)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{store(im);resolve();};im.onerror=()=>reject(Error('Cannot load native artwork: '+src));im.src=src;});

const ready=Promise.all([...['wave','impact1','impact2'].map(name=>load('/packs/wide64-v18-native/'+name+'.png',im=>effects[name]=im)),fetch('/packs/wide64-v18-native/enemies/manifest.json').then(r=>r.json()).then(m=>Promise.all(m.types.map(type=>load('/packs/wide64-v18-native/enemies/body-type-'+type+'.png',im=>bodies.set(type,im)))))]);

function canvas(){const c=document.createElement('canvas');c.width=256;c.height=240;return c;}

function observe(pixels){if(!pixels||pixels.length!==256*240*4)return;frame=canvas();frame.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),256,240),0,0);observations++;}

function beginCast(){castFrame=canvas();const c=castFrame.getContext('2d');if(frame)c.drawImage(frame,0,0);const overlay=global.dreamArtwork?.overlay;if(overlay?.width&&getComputedStyle(overlay).display!=='none')c.drawImage(overlay,0,0,256,240);}

function positions(n){const top=n<=4?n:Math.ceil(n/2),bottom=n-top;return Array.from({length:n},(_,i)=>{const row=i<top?top:bottom,j=i<top?i:i-top;return{x:128+(j-(row-1)/2)*51,y:n<=4?72:i<top?43:100};});}

function draw(ctx,width,height,scene){

 const p=Math.max(0,Math.min(1,scene.progress||0)),enemies=scene.enemies||[],pos=positions(enemies.length),opening=scene.first&&scene.launchProgress<1;

 const hit=!scene.waiting&&!opening&&p>=.16&&p<.56,fall=!scene.waiting&&!opening?Math.max(0,Math.min(1,(p-.56)/.44)):0;

 ctx.save();ctx.scale(width/256,height/240);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;

 ctx.fillStyle='#000';ctx.fillRect(0,0,256,240);ctx.fillStyle='#7429ff';ctx.fillRect(0,160,256,80);

 ctx.fillStyle='#000';ctx.fillRect(18,169,221,71);ctx.fillStyle='#ff6862';ctx.fillRect(18,166,221,71);ctx.fillStyle='#784d00';ctx.fillRect(20,168,217,67);ctx.fillStyle='#f7d9a7';ctx.fillRect(22,170,213,63);ctx.fillStyle='#171005';ctx.textAlign='center';ctx.font='700 8px monospace';ctx.fillText(scene.casterName||'ALL-TARGET ATTACK',128,181);const bp=scene.casterBp===null||scene.casterBp===undefined?'—':String(scene.casterBp).replace(/\B(?=(\d{3})+(?!\d))/g,',');ctx.font='700 7px monospace';ctx.fillText(`BP ${bp}`,128,193,204);const damage=enemies.reduce((sum,e)=>sum+Math.max(0,e.beforeHp-e.afterHp),0),average=scene.waiting||!enemies.length?null:damage/enemies.length,averageLabel=average===null?'CALCULATING':average.toLocaleString('en-US',{maximumFractionDigits:1});ctx.fillText(`AVG DAMAGE: ${averageLabel}${average===null?'':' HP'}`,128,205,204);ctx.fillText(scene.waiting?'PREPARING NEXT GROUP':`${enemies.length} ${enemies.length===1?'ENEMY':'ENEMIES'} — ONE BLAST`,128,217);ctx.fillText(p===1&&!scene.waiting?`${enemies.filter(e=>e.beforeHp>0&&e.afterHp===0).length} DEFEATED`:(scene.attackName||'ALL-TARGET ATTACK'),128,229);

 lastDraw={averageDamage:average,totalHpLost:damage,damageDenominator:enemies.length,averageDamageLabel:averageLabel,casterName:scene.casterName,casterBp:scene.casterBp,casterEarnedBp:scene.casterEarnedBp,bpLabel:`BP ${bp}`,cast:scene.cast||0,bodies:0,blasts:0,ids:[],appearances:[],missing:[],progress:p,waiting:!!scene.waiting,launch:0,first:!!scene.first,stage:opening?'launch':scene.waiting?'ready':p===1?'complete':hit?'hit':fall?'fall':'appear',cohort:enemies.map(e=>e.id),alpha:1};

 for(let i=0;i<enemies.length;i++){

  const e=enemies[i],sprite=bodies.get(e.type);if(!sprite){lastDraw.missing.push(e.type);continue;}

  const defeated=e.beforeHp>0&&e.afterHp===0;if(p===1&&defeated&&!scene.waiting)continue;

  const scale=Math.min(1,38/sprite.width,42/sprite.height),w=Math.round(sprite.width*scale),h=Math.round(sprite.height*scale),at=pos[i],dy=defeated?Math.round(26*fall*fall):0;

  ctx.drawImage(sprite,Math.round(at.x-w/2),Math.round(at.y-h/2)+dy,w,h);

  lastDraw.bodies++;lastDraw.ids.push(e.id);lastDraw.appearances.push({id:e.id,type:e.type,nativeType:e.type});

 }

 if(opening&&effects.wave){const x=16+scene.launchProgress*224;ctx.drawImage(effects.wave,Math.round(x-17),62,34,34);lastDraw.launch=1;lastDraw.launchX=x;}

 if(hit){for(const at of pos){ctx.drawImage(effects[p<.36?'impact1':'impact2'],Math.round(at.x-17),Math.round(at.y-17),34,34);lastDraw.blasts++;}}

 const dead=!scene.waiting&&p===1?enemies.filter(e=>e.beforeHp>0&&e.afterHp===0).length:0;

 const remaining=Math.max(0,(scene.remainingBefore??scene.remaining??0)-dead);lastDraw.counter=remaining;

 ctx.fillStyle='#000';ctx.fillRect(0,0,256,21);ctx.fillStyle='#fff';ctx.font='700 9px Arial,sans-serif';ctx.textAlign='left';ctx.fillText(`${remaining} / ${scene.total} ENEMIES`,8,14);

 ctx.restore();

}

function reset(){frame=castFrame=lastDraw=null;observations=0;}

global.DreamGroupBlastVisual={ready,observe,draw,reset,beginCast,inspect:()=>({lastDraw,preloaded:[...bodies.keys()],observations})};

})(typeof window==='undefined'?globalThis:window);

