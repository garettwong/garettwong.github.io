/* One complete cohort per animation. Artwork identity is the actual encounter type. */

(function(global){'use strict';

const bodies=new Map(),poses=new Map(),effects={};let frame=null,castFrame=null,lastDraw=null,observations=0;let environment=null,sceneryPack=null;

const load=(src,store)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{store(im);resolve();};im.onerror=()=>reject(Error('Cannot load native artwork: '+src));im.src=src;});

const ready=Promise.all([fetch('/packs/wide64-v20-poses194/verified/native-pose-manifest.json').then(r=>{if(!r.ok)throw Error('Cannot load native pose manifest');return r.json();}).then(m=>Promise.all(Object.entries(m.types).map(async([type,row])=>{const list=[];await Promise.all(row.poses.map((p,i)=>load('/packs/wide64-v20-poses194/verified/'+p.file,im=>list[i]={image:im,file:p.file})));poses.set(Number(type),list);}))),fetch('/packs/scenery.json').then(r=>{if(!r.ok)throw Error('Cannot load battle scenery reference');return r.json();}).then(p=>sceneryPack=global.DreamSceneryTools.validate(p)),...['wave','impact1','impact2'].map(name=>load('/packs/wide64-v20-native/'+name+'.png',im=>effects[name]=im)),fetch('/packs/wide64-v20-native/enemies/manifest.json').then(r=>r.json()).then(m=>Promise.all(m.types.map(type=>load('/packs/wide64-v20-native/enemies/body-type-'+type+'.png',im=>bodies.set(type,im)))))]);

function canvas(){const c=document.createElement('canvas');c.width=256;c.height=240;return c;}

function observe(pixels){if(!pixels||pixels.length!==256*240*4)return;frame=canvas();frame.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),256,240),0,0);observations++;}

function captureEnvironment(pixels){
 const tools=global.DreamSceneryTools;if(!sceneryPack||!pixels||!tools)return;
 let hash=2166136261;for(let i=128*256*4;i<160*256*4;i+=4){for(let j=0;j<3;j++)hash=Math.imul(hash^pixels[i+j],16777619);hash=Math.imul(hash^255,16777619);}hash>>>=0;const scene=[sceneryPack,...sceneryPack.alternates||[]].find(s=>Object.hasOwn(s.frames,String(hash)));if(!scene||(scene.reveals||{})[hash])return;const match={...scene,offset:scene.frames[hash]};
 // Keep the original cartridge terrain pixels, independently of actors/HUD.
 const terrain=document.createElement('canvas');terrain.width=256;terrain.height=32;
 const bytes=new Uint8ClampedArray(pixels.slice(128*256*4,160*256*4));for(let i=3;i<bytes.length;i+=4)bytes[i]=255;
 terrain.getContext('2d').putImageData(new ImageData(bytes,256,32),0,0);
 environment={arena:match.image,terrain,travel:match.offset,started:performance.now(),source:'native-terrain-match'};
 if(global.DreamFrameSource){global.DreamFrameSource.sceneryObserver=null;global.DreamFrameSource.onSceneryCaptured?.();}
}
function drawEnvironment(ctx){
 if(!environment)return;
 const shift=Math.floor((performance.now()-environment.started)*.032)%256;
 ctx.drawImage(environment.terrain,shift,0,256-shift,32,0,112,256-shift,28);
 if(shift)ctx.drawImage(environment.terrain,0,0,shift,32,256-shift,112,shift,28);
 return {arena:environment.arena,travel:environment.travel+shift,source:environment.source};
}
function beginCast(){captureEnvironment(global.DreamFrameSource?.pixels);if(!environment&&global.DreamFrameSource)global.DreamFrameSource.sceneryObserver=captureEnvironment;castFrame=canvas();const c=castFrame.getContext('2d');if(frame)c.drawImage(frame,0,0);const overlay=global.dreamArtwork?.overlay;if(overlay?.width&&getComputedStyle(overlay).display!=='none')c.drawImage(overlay,0,0,256,240);}

function positions(n,formation=0){const top=n<=4?n:Math.ceil(n/2),bottom=n-top;return Array.from({length:n},(_,i)=>{const row=i<top?top:bottom,j=i<top?i:i-top;return{x:128+(j-(row-1)/2)*51,y:n<=4?78+(formation===1?(j%2?5:-5):0):i<top?52+(formation===1?Math.abs(j-(row-1)/2)*5:formation===2?(j%2?6:0):0):106+(formation===2?(j%2?5:-3):0)};});}

function compact(sum,count=1n){
 sum=BigInt(sum);count=BigInt(count);const value=sum/count;
 let unit=1n,suffix='',places=10n;
 if(value>=1000000000000000n){const exponent=value.toString().length-1;unit=10n**BigInt(exponent);suffix='e'+exponent;places=100n;}
 else for(const [threshold,scale,label]of [[1000000000000n,1000000000000n,'T'],[1000000000n,1000000000n,'B'],[1000000n,1000000n,'M'],[10000n,1000n,'K']])if(value>=threshold){unit=scale;suffix=label;places=100n;break;}
 const rounded=(sum*places+count*unit/2n)/(count*unit),whole=rounded/places,fraction=(rounded%places).toString().padStart(places===100n?2:1,'0').replace(/0+$/,'');
 return whole.toString()+(fraction?'.'+fraction:'')+suffix;
}
function average(values){
 if(!values.length||values.some(v=>v===null||v===undefined))return null;
 const sum=values.reduce((n,v)=>n+BigInt(v),0n);
 return {sum:sum.toString(),count:values.length,label:compact(sum,values.length)};
}
function potentialAverage(enemies,waiting){
 if(waiting||!enemies.length||enemies.some(e=>!e.potential))return null;
 if(enemies.some(e=>e.potential.unbounded))return {label:'MAX',unbounded:true,count:enemies.length};
 const lower=enemies.reduce((a,e)=>a+BigInt(e.potential.lower),0n),upper=enemies.reduce((a,e)=>a+BigInt(e.potential.upper),0n),label=compact(lower,enemies.length),same=label===compact(upper,enemies.length);
 return {lower:lower.toString(),upper:upper.toString(),count:enemies.length,label:(same?'':'~')+label,roundedCertain:same};
}

function draw(ctx,width,height,scene){

 const p=Math.max(0,Math.min(1,scene.progress||0)),enemies=scene.enemies||[],formation=((scene.groupIndex||0)+(scene.cast||0))%3,pos=positions(enemies.length,formation),opening=scene.first&&scene.launchProgress<1;

 const hit=!scene.waiting&&!opening&&p>=.16&&p<.56,fall=!scene.waiting&&!opening?Math.max(0,Math.min(1,(p-.56)/.44)):0;

 ctx.save();ctx.scale(width/256,height/240);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;

 // Keep the entire result panel within a uniform background and 12px safe inset.
 ctx.fillStyle='#000';ctx.fillRect(0,0,256,240);const backdrop=drawEnvironment(ctx);
 const opponentHp=average(enemies.map(e=>e.beforeHp)),opponentBp=average(enemies.map(e=>e.bp));
 const potential=potentialAverage(enemies,scene.waiting),damage=enemies.reduce((sum,e)=>sum+Math.max(0,e.beforeHp-e.afterHp),0),averageDamage=scene.waiting||!enemies.length?null:damage/enemies.length,averageLabel=averageDamage===null?'—':compact(damage,enemies.length);
 const bp=scene.casterBp===null||scene.casterBp===undefined?'—':compact(scene.casterBp);
 ctx.fillStyle='#c68b2e';ctx.fillRect(14,142,228,86);ctx.fillStyle='#f7d9a7';ctx.fillRect(17,145,222,80);
 ctx.fillStyle='#c49b60';ctx.fillRect(128,151,1,66);ctx.fillRect(23,184,210,1);
 ctx.textAlign='center';ctx.fillStyle='#69502d';ctx.font='700 7px monospace';ctx.fillText('PLAYER',75,155);ctx.fillText('ENEMY AVG',182,155);
 ctx.fillStyle='#271b0a';ctx.font='700 8px monospace';ctx.fillText(scene.casterName||'FIGHTER',75,168,96);ctx.fillText(`HP ${opponentHp?.label??'—'}`,182,168,96);
 ctx.font='700 8px monospace';ctx.fillText(`BP ${bp}`,75,179,96);ctx.fillText(`BP ${opponentBp?.label??'—'}`,182,179,96);
 ctx.fillStyle='#69502d';ctx.font='700 7px monospace';ctx.fillText('POTENTIAL / AVG HP',75,195);ctx.fillText('ACTUAL / AVG HP',182,195);
 ctx.fillStyle='#271b0a';ctx.font='700 12px monospace';ctx.fillText(potential?.label??'—',75,209,96);ctx.fillText(averageLabel,182,209,96);
 ctx.font='700 7px monospace';ctx.fillText(scene.waiting?'CALCULATING…':`${enemies.length} ATTACKED · ${enemies.filter(e=>e.beforeHp>0&&e.afterHp===0).length} KO · ${enemies.filter(e=>e.afterHp>0).length} ALIVE`,128,222);

 lastDraw={formation,backdrop,opponentHp,opponentBp,potential,averageDamage,totalHpLost:damage,damageDenominator:enemies.length,averageDamageLabel:averageLabel,casterName:scene.casterName,casterBp:scene.casterBp,casterEarnedBp:scene.casterEarnedBp,bpLabel:`BP ${bp}`,cast:scene.cast||0,bodies:0,blasts:0,ids:[],appearances:[],missing:[],progress:p,waiting:!!scene.waiting,launch:0,first:!!scene.first,stage:opening?'launch':scene.waiting?'ready':p===1?'complete':hit?'hit':fall?'fall':'appear',cohort:enemies.map(e=>e.id),alpha:1};

 // Falling sprites disappear behind the result panel, never over its border.
 ctx.save();ctx.beginPath();ctx.rect(0,30,256,108);ctx.clip();
 for(let i=0;i<enemies.length;i++){

  const e=enemies[i],variants=poses.get(e.type)||[],variant=variants.length?(e.id+Math.floor(e.id/5)+(scene.cast||0)+(scene.groupIndex||0))%variants.length:0,pose=variants[variant],sprite=pose?.image||bodies.get(e.type);if(!sprite){lastDraw.missing.push(e.type);continue;}

  const defeated=e.beforeHp>0&&e.afterHp===0;if(p===1&&defeated&&!scene.waiting)continue;

  const scale=Math.min(2.25,40/sprite.width,(i%2?38:42)/sprite.height),w=Math.round(sprite.width*scale),h=Math.round(sprite.height*scale),at=pos[i],dy=defeated?Math.round(26*fall*fall):0;

  const mirrored=((e.id+(scene.groupIndex||0))%2)===1,entrance=scene.waiting||opening?0:Math.max(0,1-p/.16)*9*(mirrored?-1:1),dodge=e.potential?.missed&&hit?Math.sin((p-.16)/.4*Math.PI)*10*(mirrored?-1:1):0;
  ctx.save();ctx.translate(Math.round(at.x+entrance+dodge),Math.round(at.y-h/2)+dy);if(mirrored)ctx.scale(-1,1);ctx.drawImage(sprite,-Math.round(w/2),0,w,h);ctx.restore();

  lastDraw.bodies++;lastDraw.ids.push(e.id);lastDraw.appearances.push({id:e.id,type:e.type,nativeType:e.type,pose:pose?.file||"original",variant,mirrored});

 }

 if(opening&&effects.wave){const x=16+scene.launchProgress*224;ctx.drawImage(effects.wave,Math.round(x-17),62,34,34);lastDraw.launch=1;lastDraw.launchX=x;}

 if(hit){for(const at of pos){ctx.drawImage(effects[p<.36?'impact1':'impact2'],Math.round(at.x-17),Math.round(at.y-17),34,34);lastDraw.blasts++;}}

 ctx.restore();
 const dead=!scene.waiting&&p===1?enemies.filter(e=>e.beforeHp>0&&e.afterHp===0).length:0;

 const remaining=Math.max(0,(scene.remainingBefore??scene.remaining??0)-dead);lastDraw.counter=remaining;

 ctx.fillStyle='#000';ctx.fillRect(0,0,256,30);ctx.fillStyle='#fff';ctx.font='700 9px Arial,sans-serif';ctx.textAlign='left';ctx.fillText(`${remaining} / ${scene.total} ENEMIES`,8,14);
 const streak=!scene.waiting&&p===1?scene.missStreakAfter:scene.missStreakBefore;lastDraw.missStreak=streak??null;
 ctx.fillStyle=streak>0?'#ffd07d':'#b9bdc5';ctx.font='700 7px Arial,sans-serif';ctx.fillText(`MISS STREAK: ${streak??'—'}`,8,26);

 ctx.restore();

}

function reset(){frame=castFrame=lastDraw=null;observations=0;environment=null;if(global.DreamFrameSource)global.DreamFrameSource.sceneryObserver=captureEnvironment;}

global.DreamGroupBlastVisual={ready,observe,draw,reset,beginCast,captureEnvironment,hasEnvironment:()=>!!environment,inspect:()=>({lastDraw,preloaded:[...bodies.keys()],observations})};

})(typeof window==='undefined'?globalThis:window);
