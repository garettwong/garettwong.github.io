/* W64A player-side training assistance. ROM/save identity and native rewards stay intact. */
(()=>{'use strict';
 const ROM=window.DreamWide64.ROM;
 let api=null,gm=null,raw=null,enabled=true,lease=false,leaseCodes=[],leaseJob=null,job=null,context=null,generation=0,sequence=0,timer=null,toggle=null,lastError='',tieCount=0;
 const stats={transactions:0,cardEdits:0,cardRestores:0,stands:0,ties:0,cancellations:0};
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const now=()=>globalThis.performance?.now?.()??Date.now();
 function ramOffset(state){
  if(api?.ramStart){const n=api.ramStart(state);if(n>=0)return n;}
  for(let i=0;i+2057<=state.length;i++)if(state[i]===82&&state[i+1]===65&&state[i+2]===77&&state[i+3]===0&&state[i+4]===1&&state[i+5]===8&&state[i+6]===0&&state[i+7]===0&&state[i+8]===0)return i+9;
  throw Error('Training card data is not ready.');
 }
 function read(){const state=new Uint8Array(gm.getState());window.DreamWide64.validateNative(state);const offset=ramOffset(state);return{state,offset,ram:state.subarray(offset,offset+2048)};}
 function cardMode(r){return r[0x2e]===4||r[0x2e]===5;}
 function active(){return enabled&&api&&api.active()!==false;}
 function ownsCards(){if(!api)return false;if(lease||job||leaseJob)return true;try{return enabled&&cardMode(read().ram);}catch{return false;}}
 function currentCodes(){try{return [...(api.getCardCheats?.()||[])];}catch{return leaseCodes.slice();}}
 function restoreCheats(){if(!lease)return;const codes=currentCodes();gm.resetCheat();codes.forEach((code,i)=>gm.setCheat(i,true,code));lease=false;leaseCodes=[];}
 function acquire(force=false){
  if(lease&&!force)return Promise.resolve();if(leaseJob)return leaseJob;
  const gen=generation;
  leaseJob=(async()=>{await api.settleCards?.();if(gen!==generation||!enabled||!cardMode(read().ram))return;leaseCodes=currentCodes();gm.resetCheat();lease=true;})().finally(()=>{leaseJob=null;});
  return leaseJob;
 }
 function check(ctx){if(ctx.discard||ctx.generation!==generation)throw Error('cancelled');if(ctx.cancelled||api.active()===false)throw Error('cancelled');if(read().ram[0x2e]!==ctx.mode)throw Error('Training scene changed.');}
 async function until(test,ctx,timeout=4000,cleanup=false){
  const end=now()+timeout;
  while(now()<end){if(!cleanup)check(ctx);else if(ctx.discard||ctx.generation!==generation)throw Error('cancelled');if(test())return;await sleep(4);}
  throw Error('The game has not finished the training input. Press A again.');
 }
 async function frames(n,ctx,cleanup=false){const start=gm.getFrameNum();await until(()=>gm.getFrameNum()-start>=n,ctx,2500,cleanup);}
 async function pulse(code,ctx,cleanup=false){
  raw(0,code,0);await frames(2,ctx,cleanup);raw(0,code,1);
  try{await frames(2,ctx,cleanup);}finally{raw(0,code,0);}
 }
 function queueState(state){
  if(!gm.FS||!gm.functions?.loadState){gm.loadState(state);return()=>{};}
  const name=`wide64-training165-${++sequence}.state`,path='/'+name;
  gm.FS.writeFile(path,state);try{gm.functions.loadState(name,0);}catch(error){try{gm.FS.unlink(path);}catch{}throw error;}
  return()=>{try{gm.FS.unlink(path);}catch{}};
 }
 async function loadEdited(info,checks,ctx,cleanup=false){
  const pending={before:gm.getFrameNum(),checks};ctx.pendingLoad=pending;
  const clear=queueState(info.state);ctx.files.push(clear);api.resume?.();
  await settleLoad(ctx,cleanup);api.resetFrame?.();
 }
 async function settleLoad(ctx,cleanup=false){
  const pending=ctx.pendingLoad;if(!pending)return;
  await until(()=>gm.getFrameNum()>pending.before&&pending.checks.every(([at,value])=>read().ram[at]===value),ctx,3500,cleanup);
  if(ctx.pendingLoad===pending)ctx.pendingLoad=null;
 }
 function validSlot(r,index){const a=0x3f5+8*index;return index>=0&&index<5&&r[a+1]>=0x20&&r[a+1]<=0x2b&&r[a+2]<=4&&[1,2,3,4,6].includes(r[a+5]);}
 async function editCard(ctx,index,attack,defense){
  check(ctx);const info=read(),r=info.ram;if(!validSlot(r,index))throw Error('Wait for the training cards, then press A.');
  const base=0x3f8+8*index,changes=[];
  for(const [at,value] of [[base,attack],[base+1,defense]])if(value!==undefined&&r[at]!==value)changes.push({at,before:r[at],after:value});
  if(!changes.length)return;
  ctx.edits=changes;ctx.cardBase=base;ctx.cardHeader=[r[base-3],r[base-2],r[base+2]];
  for(const e of changes)r[e.at]=e.after;
  await loadEdited(info,changes.map(e=>[e.at,e.after]),ctx);stats.cardEdits++;
 }
 async function restoreCard(ctx){
  if(!ctx.edits.length||ctx.discard||ctx.generation!==generation)return;
  // A paused core may not have consumed its queued file yet. Keep that file
  // and the 1x confirmation lock until it applies, then restore the latest state.
  await settleLoad(ctx,true);
  const info=read(),checks=[];
  const header=[info.ram[ctx.cardBase-3],info.ram[ctx.cardBase-2],info.ram[ctx.cardBase+2]];
  // The face/drawn flag legitimately changes when the native game consumes a
  // card. Its drawing address and emblem do not change before restoration.
  // A different mode or record means this may be a foreign/new state: retain
  // the pending cleanup and fail closed instead of writing old card values.
  if(info.ram[0x2e]!==ctx.mode||header.some((value,i)=>value!==ctx.cardHeader[i]))throw Error('The training card record changed. Reload a verified save before continuing.');
  // Restore only bytes still carrying this transaction's temporary value.
  // Never replay an old whole state, party record, phase or deck flag.
  for(const e of ctx.edits)if(info.ram[e.at]===e.after){info.ram[e.at]=e.before;checks.push([e.at,e.before]);}
  if(checks.length){await loadEdited(info,checks,ctx,true);stats.cardRestores++;}
  ctx.edits=[];
 }
 async function menuChoice(ctx,phase,message,value){
  await until(()=>{const r=read().ram;return r[0x30]===phase&&r[0x54]===message&&r[0x64]===2;},ctx);
  for(let tries=0;read().ram[0x6a]!==value&&tries<3;tries++)await pulse(value===0?6:7,ctx);
  const r=read().ram;if(r[0x30]!==phase||r[0x54]!==message||r[0x6a]!==value)throw Error('Wait for the training choice, then press A.');
 }
 function kind(r){
  // The comparison dispatcher accepts A while its prompt is still printing
  // ($59's high bit bypasses the $55 completion gate). Own every A in phase8
  // and wait here, otherwise an early tap can confirm an unassisted card.
  if(r[0x2e]===4&&r[0x30]===8)return'comparison';
  if(r[0x2e]===5&&r[0x30]===3&&r[0x54]===0x22)return'gravity-card';
  if(r[0x2e]===5&&r[0x30]===4&&r[0x54]===0x23)return'gravity-stand';
  if(r[0x2e]===5&&r[0x30]===7&&r[0x54]===0x2b)return'gravity-tie';
  return null;
 }
 async function execute(ctx){
  try{
   ctx.endConfirmation=api.beginConfirmation?.();raw(0,8,0);raw(0,6,0);raw(0,7,0);
   await acquire(true);check(ctx);if(!lease)throw Error('Training card controls are not ready.');
   const initial=read().ram;if(kind(initial)!==ctx.kind)return;
   await frames(2,ctx);
   if(ctx.kind==='comparison'){
    await until(()=>{const r=read().ram;return r[0x30]===8&&r[0x55]===255;},ctx);
    const r=read().ram,index=r[0x6d];await editCard(ctx,index,255,255);await pulse(8,ctx);
    await until(()=>read().ram[0x30]!==8,ctx);
    if(read().ram[0x30]!==9)throw Error('The comparison moved to another screen.');
   }else if(ctx.kind==='gravity-card'){
    await menuChoice(ctx,3,0x22,0);const r=read().ram,first=r[0x4bb];
    if(first<1||first>8)throw Error('Wait for the gravity machine to deal, then press A.');
    await editCard(ctx,r[0x6d],10-first);await pulse(8,ctx);
    await until(()=>read().ram[0x30]!==3,ctx);
   }else if(ctx.kind==='gravity-stand'){
    await menuChoice(ctx,4,0x23,1);await pulse(8,ctx);await until(()=>read().ram[0x30]!==4,ctx);stats.stands++;
   }else{
    await frames(7+(tieCount++%5),ctx);await pulse(8,ctx);stats.ties++;
   }
   stats.transactions++;lastError='';
  }catch(error){if(error.message==='cancelled'){stats.cancellations++;}else{lastError=error.message;api.status?.(lastError);}}
  finally{
   raw(0,8,0);raw(0,6,0);raw(0,7,0);
   try{await restoreCard(ctx);}catch(error){if(error.message!=='cancelled'){lastError=error.message;api.status?.('Training card restoration is pending. Resume the game before saving.');ctx.restoreFailed=true;}}
   if(!ctx.restoreFailed){await forwardB(ctx);dispose(ctx);}else api.resume?.();
  }
 }
 async function forwardB(ctx){
  if(!ctx.deferredB||ctx.discard||ctx.generation!==generation||read().ram[0x2e]!==ctx.mode)return;
  ctx.deferredB=false;
  try{raw(0,0,0);await frames(2,ctx,true);raw(0,0,1);await frames(2,ctx,true);}catch{}finally{if(!ctx.bHeld)raw(0,0,0);}
 }
 function dispose(ctx){for(const clear of ctx.files)clear();ctx.files=[];ctx.endConfirmation?.();ctx.endConfirmation=null;api.resume?.();}
 function recoverPending(){
  if(job)return job;if(!context?.restoreFailed)return Promise.resolve();
  const ctx=context;
  job=(async()=>{await restoreCard(ctx);ctx.restoreFailed=false;await forwardB(ctx);dispose(ctx);if(context===ctx)context=null;})().finally(()=>{job=null;});
  return job;
 }
 function startJob(type,r){
  if(job)return;
  const ctx={generation,mode:r[0x2e],kind:type,files:[],edits:[],cancelled:false,discard:false,deferredB:false,bHeld:false};context=ctx;
  job=execute(ctx).finally(()=>{job=null;if(!ctx.restoreFailed)context=null;void monitor();});
 }
 function input(player,code,value){
  if(!api||player!==0)return raw(player,code,value);
  if(job||context?.restoreFailed){
   if(code===0){context.cancelled=true;context.deferredB=context.deferredB||!!value;context.bHeld=!!value;return;}
   if(code===8||code===6||code===7)return;
  }
  let r;try{r=read().ram;if(lease&&!job&&!leaseJob&&!cardMode(r))restoreCheats();}catch{return raw(player,code,value);}
  if(context?.restoreFailed){if(code===8&&value)void recoverPending().catch(()=>{});if(code===8)return;}
  if(code!==8||!value||!active())return raw(player,code,value);
  const type=kind(r);if(!type)return raw(player,code,value);
  startJob(type,r);
 }
 async function monitor(){
  if(!api||job||leaseJob)return;
  try{
   if(context?.restoreFailed){if(api.active()!==false)await recoverPending();return;}
   const r=read().ram;if(active()&&cardMode(r)){await acquire();}else if(lease&&!cardMode(r)){restoreCheats();}else if(lease&&!enabled){restoreCheats();}
  }catch(error){lastError=error.message;}
 }
 async function whenSettled(){
  for(;;){const pending=job||leaseJob;if(!pending)break;await pending;}
  if(context?.restoreFailed)await recoverPending();
 }
 async function reset(options={}){
  if(context){context.cancelled=true;if(options.discard){context.discard=true;context.edits=[];}}
  raw?.(0,8,0);raw?.(0,6,0);raw?.(0,7,0);
  await whenSettled();generation++;
  if(lease)restoreCheats();context=null;lastError='';
 }
 async function setEnabled(value){enabled=!!value;updateLabel();if(!enabled)await reset();else await monitor();return enabled;}
 function updateLabel(){if(!toggle)return;toggle.textContent=enabled?'A TRAINING ON':'A TRAINING OFF';toggle.setAttribute('aria-pressed',String(enabled));}
 function sanitize(bytes){const out=new Uint8Array(bytes).slice();if(!context?.edits.length)return out;const offset=ramOffset(out);for(const e of context.edits)if(out[offset+e.at]===e.after)out[offset+e.at]=e.before;return out;}
 function start(options){
  if(api)return;if(options.rom!==ROM&&options.ROM!==ROM)throw Error('Training assistance requires the verified W64A game.');
  api=options;gm=typeof api.gm==='function'?api.gm():api.gm;
  if(!gm?.simulateInput||!gm.getState||!gm.getFrameNum)throw Error('Native training controls are unavailable.');
  raw=gm.simulateInput.bind(gm);gm.simulateInput=input;
  if(globalThis.document&&options.showToggle!==false){toggle=document.createElement('button');toggle.id='training-assist164-toggle';toggle.type='button';toggle.title='Choose training cards automatically when you press A';toggle.onclick=()=>void setEnabled(!enabled);updateLabel();(options.toggleContainer||document.querySelector('#touch-controls')||document.body).append(toggle);}
  timer=setInterval(()=>void monitor(),60);void monitor();
 }
 window.DreamWide64Training={ROM,start,ownsCards,whenSettled,reset,setEnabled,sanitize,inspect:()=>({enabled,lease,busy:!!job,settling:!!leaseJob,generation,kind:context?.kind||null,pendingEdits:context?.edits.map(e=>({...e}))||[],restoreFailed:!!context?.restoreFailed,lastError,stats:{...stats}})};
})();
