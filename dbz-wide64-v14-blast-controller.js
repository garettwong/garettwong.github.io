/* Native v11 five-target Super Explosive Wave presentation coordinator.
 * The cartridge calculates every hit, miss, reward and victory.  This file
 * only hides the native one-by-one frames and acknowledges its group gate.
 */
(function(global){
'use strict';
const GATE=0x13fd,MODE=0x13fe,LAST=0x13ff,EXPANDED=0x1371,REVISION=0x13b5;
const ATTACKS=new Set([0x40,0xdb,0xe2]),DURATION=0;
let api=null,canvas=null,ctx=null,busy=false,waiting=false,pending=null,unlock=null,token=0,raf=0,sequence=0,lastError='',timer=0,modePending=null;
let queue=[],shown=[],presented=null,groupSize=5,castSerial=0;
const nextSize=()=>5+Math.floor(Math.random()*3);
let lastScene=null;
let roster=new Map(),templates=[],currentCast=false,logs=[],casterCanvas=null,casterRequested=false,casterKey='';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function chunks(state){
 const c=global.DreamWide64;if(!c?.chunk)throw Error('Wide64 state reader is unavailable.');
 const r=c.chunk(state,'RAM',2048),w=c.chunk(state,'WRM',8192);if(r<0||w<0)throw Error('Battle state is incomplete.');return {b:new Uint8Array(state),r,w};
}
function info(v){
 try{const i=global.DreamWide64EnemyInfo?.get?.(v)||global.DreamWide64EnemyInfo?.lookup?.(v);return i?.name||i?.english||i?.label||null;}catch{return null;}
}
function aliveId(id){return Number.isFinite(id)&&id>=0&&id<64;}
function battle(v){return v&&v.b[v.r+0x2e]===1&&v.b[v.w+EXPANDED]===0xa5&&v.b[v.w+REVISION]===0xb8;}
function expanded(v){
 // v11 keeps the active batch at $1372; its full 101–400 roster lives in
 // $1398/$1399.  Earlier layouts may expose the full count at $1372.
 const full=v.b[v.w+0x1398]+v.b[v.w+0x1399]*256;
 return battle(v)&&Math.max(full,v.b[v.w+0x1372])>100;
}
function command(v){return expanded(v)&&v.b[v.r+0x30]>=34&&v.b[v.r+0x30]<=39&&ATTACKS.has(v.b[v.r+0x31e]);}
function entry(index,type,id,hp){return {index,type:type&63,id,hp:Math.max(0,hp|0),alive:aliveId(id)&&hp>0,name:info(type)||`ENEMY ${index+1}`};}
function templateFor(index){return templates.length?templates[(index%100)%templates.length]:entry(index,0,0,0);}
function readTemplates(v){
 const out=[];for(let slot=0;slot<5;slot++){
  const at=v.w+0x1500+slot*18,id=v.b[at],type=v.b[at+12],hp=v.b[at+2]+v.b[at+3]*256;
  if(aliveId(id))out.push(entry(slot,type,id,hp));
 }
 if(out.length)templates=out;
}
function snapshot(v){
 const view=global.DreamLargeBattle?.decode?.(v.b);if(!view)return null;
 const total=Number(view.total)||0,batch=Math.max(0,Number(view.batch??view.enemies?.length)||0),offset=Math.max(0,Number(view.offset??0)),loaded=Math.min(total,offset+batch),remaining=Number(view.remaining)||0;
 readTemplates(v);
 const current=new Map(),reserve=new Map();
 for(let local=0;local<batch;local++){
  const e=view.enemies?.[local];if(e)current.set(offset+local,entry(offset+local,e.type,e.id,e.hp));
 }
 for(const e of view.reserve||[]){
  const t=templateFor(e.index);
  reserve.set(e.index,entry(e.index,t.type,t.id,e.hp));
 }
 return {total,remaining,offset,loaded,current,reserve};
}
function rememberMenu(v){
 // Only menu frames are a safe "before attack" snapshot.  Sampling the native
 // damage phases would replace beforeHp with an already-damaged value.
 if(v.b[v.r+0x30]>=10)return;
 if(currentCast){currentCast=false;queue=[];presented=null;}
 const snap=snapshot(v);if(!snap)return;presented=snap.remaining;
 for(const e of snap.current.values())roster.set(e.index,{...e});
 for(const e of snap.reserve.values())roster.set(e.index,{...e});
}
function portrait(type){try{return global.DreamLargeBattle?.portrait?.(type)||null;}catch{return null;}}
function actorFor(v){
 const actor=v.b[v.r+0x30e]&63,labels={1:'GOKU',2:'PICCOLO',3:'GOHAN',4:'KRILLIN',5:'YAMCHA',6:'TIEN',7:'CHIAOTZU',8:'NAIL',42:'VEGETA'};
 const forms=v.b[v.w+0x15ae],bit=actor===1?1:actor===3?2:0,stage=bit&&(forms&bit)&&(forms&(bit*4))?2:1;
 return {actor,name:labels[actor]||'FIGHTER',stage};
}
function casterPortrait(actor,stage){
 if(global.DreamGroupBlastCasterPortrait&&typeof global.DreamGroupBlastCasterPortrait!=='function')return global.DreamGroupBlastCasterPortrait;
 if(typeof global.DreamGroupBlastCasterPortrait==='function')return global.DreamGroupBlastCasterPortrait(actor,stage)||null;
 const awakening=global.DreamWide64Awakening;
 const key=`${actor}:${stage}`;
 if(casterKey!==key){casterCanvas=null;casterRequested=false;casterKey=key;}
 if(!casterRequested&&awakening?.pose&&awakening?.ready&&typeof document!=='undefined'&&(actor===1||actor===3)){
  casterRequested=true;Promise.resolve(awakening.ready).then(()=>{
   const c=document.createElement('canvas');c.width=c.height=40;
   awakening.pose(c.getContext('2d'),actor,stage,0,0,40,40);casterCanvas=c;
  }).catch(()=>{});
 }
 return casterCanvas;
}
function targetsFor(v,group){
 const snap=snapshot(v);if(!snap)return null;
 const start=Math.max(0,group*5),end=Math.min(snap.total,start+5),out=[];
 for(let index=start;index<end;index++){
  const prior=roster.get(index),fallback=templateFor(index);
  const before=prior?.hp??fallback.hp;
  // The v11 decoder exposes the current batch locally and the future reserve
  // separately.  Everything before offset has completed on an earlier group.
  const now=snap.current.get(index),future=snap.reserve.get(index);
  const after=index<snap.offset?0:now?.hp??future?.hp??prior?.hp??fallback.hp;
  const type=prior?.type??fallback.type;
  if(before>0)out.push({id:index,type,name:now?.name||prior?.name||fallback.name,beforeHp:before,afterHp:after,hp:after,portrait:portrait(type)});
 }
 return {total:snap.total,remaining:snap.remaining,targets:out};
}
function drawScene(scene,progress){
 if(!ctx||!canvas)return;ctx.setTransform(3,0,0,3,0,0);global.DreamGroupBlastVisual?.draw?.(ctx,256,240,{...scene,enemies:scene.targets||[],progress,casterPortrait:casterPortrait(scene.actor,scene.stage)});
}
function fit(){
 if(!canvas)return;const rect=(global.dreamArtwork?.canvas||document.querySelector('#game canvas'))?.getBoundingClientRect();if(!rect)return;
 Object.assign(canvas.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
}
function create(){
 if(canvas)return;canvas=document.createElement('canvas');canvas.id='dbz-group-blast';canvas.width=768;canvas.height=720;canvas.hidden=true;canvas.setAttribute('role','img');canvas.style.cssText='position:fixed;z-index:39;pointer-events:none;touch-action:none;image-rendering:pixelated;';document.body.append(canvas);ctx=canvas.getContext('2d',{alpha:false});addEventListener('resize',fit);
}
function write(v,mutate,label){
 const out=v.b.slice();mutate(out,v);const gm=api.gm(),name=`group-blast-${label}-${++sequence}.state`;gm.FS.writeFile('/'+name,out);gm.functions.loadState(name,0);return {gm,name,before:gm.getFrameNum()};
}
async function loadAndConfirm(v,mutate,label,confirm,current){
 const written=write(v,mutate,label);api.advance();const until=performance.now()+5000;let ok=false;
 while(current===token&&performance.now()<until){await delay(12);const next=chunks(written.gm.getState());if(written.gm.getFrameNum()>written.before&&confirm(next)){ok=true;break;}}
 try{written.gm.FS.unlink('/'+written.name);}catch{}
 if(current!==token)return null;
 if(!ok)throw Error(`The group animation could not ${label}. Load the last save and try again.`);
 return chunks(written.gm.getState());
}
async function setMode(v,current){
 if(v.b[v.w+MODE]===0xb5)return;
 api.pause();try{await loadAndConfirm(v,(out,q)=>{out[q.w+MODE]=0xb5;},'enable grouped wave',q=>q.b[q.w+MODE]===0xb5,current);}finally{if(current===token)api.resume();}
}
function activeGroup(v){
 const loaded=v.b[v.w+0x139a]+v.b[v.w+0x139b]*256,batch=v.b[v.w+0x1372],page=v.b[v.w+0x1370];
 return Math.max(0,Math.floor((loaded-batch)/5)+page);
}
function previewTargets(v){
 const snap=snapshot(v);if(!snap)return null;
 const targets=queue.slice(0,groupSize).map(t=>({...t,afterHp:t.beforeHp,hp:t.beforeHp}));
 let index=targets.length?targets[targets.length-1].id+1:activeGroup(v)*5;
 for(;index<snap.total&&targets.length<groupSize;index++){
  const prior=roster.get(index),now=snap.current.get(index),fallback=templateFor(index),before=prior?.hp??fallback.hp;
  if(before<=0)continue;const type=prior?.type??fallback.type;
  targets.push({id:index,type,name:prior?.name||now?.name||fallback.name,beforeHp:before,afterHp:before,hp:before});
 }
 return {total:snap.total,remaining:snap.remaining,targets};
}
function showCalculating(v){
 if((!command(v)&&!(currentCast&&v.b[v.w+0x13c0]))||busy)return false;
 api.fastCalculation?.(true);global.DreamGroupBlastVisual?.observe?.(global.DreamFrameSource?.pixels,{actor:v.b[v.r+0x30e]&63,type:v.b[v.r+0x33a]&63});
 if(!currentCast){currentCast=true;castSerial++;groupSize=nextSize();}
 const scene=previewTargets(v);if(!scene)return false;if(presented===null)presented=scene.remaining;
 scene.remainingBefore=presented;const caster=actorFor(v);create();fit();canvas.hidden=false;canvas.setAttribute('aria-label',`${scene.targets.length} enemies, with one blast per enemy.`);
 drawScene({...scene,groupIndex:shown.length,groupCount:Math.ceil(scene.total/5),casterName:caster.name,actor:caster.actor,stage:caster.stage,waiting:true},0);waiting=true;return true;
}
async function animate(scene,current){
 // Paint the complete group, one centered impact per enemy, then remove defeats.
 return new Promise(resolve=>{let step=0;const phases=[0,.30,1];const frame=()=>{
  if(current!==token){resolve(false);return;}
  if(document.hidden||!api.active()){raf=requestAnimationFrame(frame);return;}
  fit();drawScene(scene,phases[step]);lastScene=scene;
  if(++step===phases.length){resolve(true);return;}raf=requestAnimationFrame(frame);
 };raf=requestAnimationFrame(frame);});
}
async function acknowledge(v,current){
 global.DreamGroupBlastVisual?.observe?.(global.DreamFrameSource?.pixels,{actor:v.b[v.r+0x30e]&63,type:v.b[v.r+0x33a]&63});
 const group=v.b[v.w+LAST],built=targetsFor(v,group);if(!built)throw Error('Could not read this completed enemy group.');
 const caster=actorFor(v);
 if(!currentCast){currentCast=true;castSerial++;groupSize=nextSize();if(presented===null)presented=built.remaining+built.targets.filter(t=>t.beforeHp>0&&t.afterHp===0).length;}
 queue.push(...built.targets);
 logs.push({index:group,targets:built.targets.map(t=>t.id),before:built.targets.map(t=>t.beforeHp),after:built.targets.map(t=>t.afterHp)});if(logs.length>100)logs.shift();
 busy=true;waiting=true;create();fit();canvas.hidden=false;api.release();unlock=api.beginConfirmation?.();api.pause();
 try{
  await global.DreamGroupBlastVisual.ready;if(current!==token)return;
  const final=(group+1)*5>=built.total;
  while(queue.length>=groupSize||(final&&queue.length)){
   const targets=queue.splice(0,Math.min(groupSize,queue.length)),scene={...built,targets,remainingBefore:presented,groupIndex:shown.length,casterName:caster.name,actor:caster.actor,stage:caster.stage};
   api.status(`Explosive Wave: ${targets.length} enemies struck together.`);
   shown.push({cast:castSerial,targets:targets.map(t=>t.id),size:targets.length,remainingBefore:presented,duration:DURATION,frames:3,defeated:targets.filter(t=>t.beforeHp>0&&t.afterHp===0).length});if(shown.length>200)shown.shift();
   if(!await animate(scene,current))return;
   presented=Math.max(0,presented-targets.filter(t=>t.beforeHp>0&&t.afterHp===0).length);groupSize=nextSize();
  }
  const after=await loadAndConfirm(v,(out,q)=>{out[q.w+GATE]=0;},'continue',q=>q.b[q.w+GATE]===0,current);
  if(!after)return;
  for(const target of built.targets)roster.set(target.id,{...target,hp:target.afterHp});
  rememberMenu(after);api.resetFrame?.();
 }finally{
  if(current===token){busy=false;waiting=currentCast;canvas.hidden=!currentCast;unlock?.();unlock=null;api.resume();}
 }
}

async function examine(){
 if(!api?.active()||modePending)return;let v;
 try{v=chunks(api.gm().getState());}catch(error){lastError=String(error.message||error);return;}
 if(!expanded(v)){if(!busy){waiting=false;if(canvas)canvas.hidden=true;api.fastCalculation?.(false);}return;}
 rememberMenu(v);if(v.b[v.w+MODE]!==0xb5){if(!modePending){const current=token;modePending=setMode(v,current);modePending.catch(error=>{lastError=String(error.message||error);api.status(lastError);}).finally(()=>{if(current===token)modePending=null;});}return;}
 if(v.b[v.w+GATE]===1&&!busy){const current=++token;pending=acknowledge(v,current);pending.catch(error=>{lastError=String(error.message||error);api.status(lastError);}).finally(()=>{if(current===token)pending=null;});return;}
 if(v.b[v.w+GATE]!==1&&!showCalculating(v)&&!busy){waiting=false;if(canvas)canvas.hidden=true;api.fastCalculation?.(false);}
}
function poll(){if(api&&!busy)examine();timer=setTimeout(poll,16);}
function reset(){api?.fastCalculation?.(false);lastScene=null;token++;/* Let an existing RAF observe the new token and resolve. */busy=false;waiting=false;modePending=null;pending=null;unlock?.();unlock=null;if(canvas)canvas.hidden=true;global.DreamGroupBlastVisual?.reset?.();roster.clear();templates=[];currentCast=false;queue=[];shown=[];logs=[];presented=null;casterCanvas=null;casterRequested=false;casterKey='';}
function start(options){api=options;reset();create();poll();}
function whenSettled(){return modePending||pending||Promise.resolve();}
function inspect(){return {busy,waiting,gate:waiting,modePending:!!modePending,logs:logs.map(x=>({...x,targets:[...x.targets],before:[...x.before],after:[...x.after]})),lastError,roster:roster.size,duration:DURATION,queued:queue.length,presented,shown:shown.map(x=>({...x,targets:[...x.targets]}))};}
global.DreamGroupBlast={start,reset,whenSettled,isOpen:()=>busy,coversScreen:()=>waiting&&!!canvas&&!canvas.hidden,inspect};
})(typeof window==='undefined'?globalThis:window);
