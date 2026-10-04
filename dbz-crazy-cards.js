/* Separate Crazy Cards editor, derived from verified Player148. Native card records drive graphics and combat. */
(()=>{
function factory(config,globalName){'use strict';
const ROM=config.ROM, MAX_ATTACK=config.MAX_ATTACK, MAX_DEFENSE=config.MAX_DEFENSE;
const expanded=MAX_ATTACK>15||MAX_DEFENSE>15;
const KEY='nes-dream:dbz-crazy-cards:'+ROM, BASE=0x3f5;
const attrs={1:'必',2:'界',3:'惑',4:'亀',6:'魔'};
const empty=()=>Array.from({length:5},()=>({attack:null,defense:null,attribute:null}));
let values=empty(),locked=Array(5).fill(false),pending=empty(),versions=Array(5).fill(0);
try{const found=JSON.parse(localStorage.getItem(KEY)||'null'),cards=Array.isArray(found)?found:found?.cards;if(Array.isArray(cards)&&cards.length===5){values=cards.map(v=>({attack:valid(v.attack,MAX_ATTACK),defense:valid(v.defense,MAX_DEFENSE),attribute:attrs[v.attribute]?v.attribute:null}));locked=cards.map((v,i)=>Array.isArray(found)?Object.values(values[i]).some(Boolean):v.locked===true);}}catch{}
function valid(n,max){return Number.isInteger(n)&&n>=1&&n<=max?n:null;}
// Complete native hand contexts: combat, matching/comparison/gravity training,
// walking, item cards, map card events and Piccolo duplicate training.
// Story/title/status/ending screens retain preferences without touching game RAM.
const HAND_MODES=new Set([1,3,4,5,6,8,9,12]);
function cardScene(r){return HAND_MODES.has(r[0x2e]);}
function record(r,i){const a=BASE+i*8;return r[a+1]>=0x20&&r[a+1]<=0x2b&&r[a+2]<=4&&valid(r[a+3],MAX_ATTACK)&&valid(r[a+4],MAX_DEFENSE)&&valid(r[a+5],6)?a:null;}
let api=null,dialog=null,tabs=null,attack=null,defense=null,attribute=null,lockButton=null,feedback=null,selected=0,draft=[],lastNative=empty(),lastSeen=empty(),focusBefore=null,busy=false,dirty=false,draining=null,cheatKey='',lastError='',lastVerification=null,resetting=null;
function inspect(){const state=new Uint8Array(api.gm().getState()),at=api.ramStart(state);if(at<0)throw Error('Card data is not ready.');return{state,at,ram:state.subarray(at,at+2048)};}
let lastPersisted='';
function persist(){const text=JSON.stringify({version:2,cards:values.map((v,i)=>({...v,locked:locked[i]}))});if(text!==lastPersisted){localStorage.setItem(KEY,text);lastPersisted=text;}}
function defaults(r,i){const a=r?record(r,i):null,v=locked[i]?values[i]:pending[i];return{attack:v.attack??(a!==null?valid(r[a+3],MAX_ATTACK):null)??5,defense:v.defense??(a!==null?valid(r[a+4],MAX_DEFENSE):null)??5,attribute:v.attribute??(a!==null?valid(r[a+5],6):null)??4};}
function refresh(){for(const [i,button]of [...tabs.children].entries()){const v=draft[i];button.textContent=`${i+1}${locked[i]?' 🔒':''}\n${v.attack}/${v.defense}`;button.setAttribute('aria-label',`Card ${i+1}, attack ${v.attack}, defense ${v.defense}${locked[i]?', locked':''}`);button.setAttribute('aria-pressed',String(i===selected));}attack.value=String(draft[selected].attack);defense.value=String(draft[selected].defense);attack.setAttribute('aria-invalid','false');defense.setAttribute('aria-invalid','false');attribute.value=attrs[draft[selected].attribute]?String(draft[selected].attribute):'';lockButton.textContent=locked[selected]?`Card ${selected+1} locked · Unlock`:`Lock card ${selected+1}`;lockButton.setAttribute('aria-pressed',String(locked[selected]));}
async function close(){if(!dialog||dialog.hidden)return;await whenSettled();dialog.hidden=true;api.resume();api.resetFrame();focusBefore?.focus();}
function clearCheats(){if(cheatKey){api.gm().resetCheat();cheatKey='';}}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let stateSequence=0;
// Avoid EmulatorJS's shared game.state: its old five-second cleanup timer can
// delete a newer pending edit. Each card update owns its file until verified.
function queueState(gm,state){
 if(!gm.FS||!gm.functions?.loadState){gm.loadState(state);return()=>{};}
 const name=`dbz-crazy-card-${++stateSequence}.state`,path='/'+name;
 gm.FS.writeFile(path,state);try{gm.functions.loadState(name,0);}catch(e){gm.FS.unlink(path);throw e;}
 return()=>{try{gm.FS.unlink(path);}catch{}};
}
const attackTiles=config.TILES,defenseTiles=config.TILES;
const symbolTiles=[[],[236,237,238,239],[240,241,242,243],[244,245,246,247],[248,249,250,251],[252,253,254,255],[232,233,234,235]];
// EmulatorJS serialises 8 KiB battery RAM as a tagged chunk. This matches
// DreamCrazyRoute so state edits stay valid across the same save format.
function chunk(state,tag,size){for(let i=0;i+size+9<=state.length;i++)if(state[i]===tag.charCodeAt(0)&&state[i+1]===tag.charCodeAt(1)&&state[i+2]===tag.charCodeAt(2)&&state[i+3]===0&&state[i+4]===((size+1)&255)&&state[i+5]===((size+1)>>8)&&state[i+6]===0&&state[i+7]===0&&state[i+8]===0)return i+9;return-1;}
function nametable(state){for(let i=0;i<state.length-2057;i++)if(state[i]===78&&state[i+1]===77&&state[i+2]===84&&state[i+3]===0&&state[i+4]===1&&state[i+5]===8&&state[i+6]===0&&state[i+7]===0&&state[i+8]===0)return i+9;return -1;}
function redraw(state,ram,addresses){
 const at=nametable(state),checks=[];let changed=false;if(at<0)return{changed,checks};
 // Native 4x6 card borders, excluding its attack, defense and emblem tiles.
 const shell=[[2,190],[3,191],[34,0],[35,206],[64,207],[67,206],[96,207],[99,206],[128,207],[129,0],[160,208],[161,209]];
 // Gravity keeps stale drawing addresses after shifting its hand left.
 // Match the complete visible five-card strip before redrawing this scene.
 const gravityStarts=new Map();
 if(ram[0x2e]===5&&addresses.every(a=>a!==null&&ram[a+2]===2)){
  const row=((ram[addresses[0]]|ram[addresses[0]+1]<<8)&1023)>>5;
  for(const plane of [0,1024]){
   const starts=[];
   for(let col=0;col<=12;col++){
    const pos=row*32+col;
    if(Array.from({length:5},(_,i)=>i).every(i=>shell.every(([off,tile])=>state[at+plane+pos+i*4+off]===tile)))starts.push(pos);
   }
   if(starts.length===1)gravityStarts.set(plane,starts[0]);
  }
 }
 for(const [index,a] of addresses.entries()){
  if(a===null||ram[a+2]!==2)continue;
  const address=(ram[a]|ram[a+1]<<8)&1023;
  if((address&31)>28||(address>>5)>24)continue;
  for(const plane of [0,1024]){
   const base=at+plane+(gravityStarts.has(plane)?gravityStarts.get(plane)+index*4:address);
   if(!shell.every(([off,tile])=>state[base+off]===tile))continue;
   for(const [offsets,tiles]of [[[0,32,1,33],attackTiles[ram[a+3]]],[[130,162,131,163],defenseTiles[ram[a+4]]],[[65,66,97,98],symbolTiles[ram[a+5]]]]){
    offsets.forEach((off,i)=>{checks.push([base+off,tiles[i]]);if(state[base+off]!==tiles[i]){state[base+off]=tiles[i];changed=true;}});
   }
  }
 }
 return{changed,checks};
}
async function apply(restore=false,targets=values.map((v,i)=>locked[i]?{...v}:{...pending[i]})){
 const gm=api.gm(),{state,ram}=inspect();
 const wrm=expanded?chunk(state,'WRM',8192):-1;
 if(expanded&&wrm<0)throw Error('Expanded card storage is not ready.');
 if(restore)clearCheats();
 if(!cardScene(ram)){clearCheats();return{ready:false,verified:false};}
 const addresses=Array.from({length:5},(_,i)=>record(ram,i));
 // Hands are rebuilt one record at a time during replacements and transitions.
 // An unavailable slot must not disable the other four locks or lose its edit.
 if(addresses.every(a=>a===null)){clearCheats();return{ready:false,verified:false};}
 let changed=false;const codes=[],checks=[],stateChecks=[];
 for(let i=0;i<5;i++){
  const a=addresses[i],target=restore?lastNative[i]:targets[i];
  if(a===null)continue;
  for(const [field,offset,max]of [['attack',3,MAX_ATTACK],['defense',4,MAX_DEFENSE],['attribute',5,6]]){
   const n=valid(target[field],max);if(n===null)continue;
   // Crazy64's hand records are full bytes. Only selected actor records are
   // packed nibbles, and are clamped later in this function.
   if(!restore&&locked[i])codes.push(`${(a+offset).toString(16).toUpperCase().padStart(4,'0')}:${n.toString(16).toUpperCase().padStart(2,'0')}`);
   checks.push([a+offset,n]);
   if(ram[a+offset]===n)continue;
   if(!restore&&lastSeen[i][field]!==ram[a+offset])lastNative[i][field]=ram[a+offset];
   ram[a+offset]=n;changed=true;
  }
  lastSeen[i]={attack:ram[a+3],defense:ram[a+4],attribute:ram[a+5]};
 }
 // Once a fighter chooses a card, the game copies it into two packed
 // bytes in that fighter's record. Update those copies too, including
 // cards already chosen earlier in the current battle turn.
 if([1,12].includes(ram[0x2e]))for(let actor=0x200;actor<(ram[0x2e]===12?0x212:0x2a2);actor+=18){
  const packed=ram[actor+13],i=packed>>4;
  if((ram[actor]&0x80)||i>=5||addresses[i]===null||!valid(packed&15,MAX_ATTACK))continue;
  const target=restore?lastNative[i]:targets[i];
  const a=valid(target.attack,MAX_ATTACK),d=valid(target.defense,MAX_DEFENSE),m=valid(target.attribute,6);
  const nativeA=a===null?null:Math.min(a,15),nativeD=d===null?null:Math.min(d,15);
  const first=nativeA===null?packed:(packed&0xf0)|nativeA;
  const second=((nativeD??(ram[actor+14]>>4))<<4)|(m??(ram[actor+14]&15));
  for(const [at,n]of [[actor+13,first],[actor+14,second]]){checks.push([at,n]);if(ram[at]!==n){ram[at]=n;changed=true;}}
  if(expanded&&(a!==null||d!==null||m!==null)){
   // Party sidecar mirrors the native actor slot. The ROM's runtime moves
   // this pair into its selected working record when battle state changes.
   const party=wrm+0x1c80+(actor-0x200);
   if(a!==null){stateChecks.push([party,a]);if(state[party]!==a){state[party]=a;changed=true;}}
   if(d!==null){stateChecks.push([party+1,d]);if(state[party+1]!==d){state[party+1]=d;changed=true;}}
   // There are two working records: $7e60/$7e80. Match a party-origin
   // record by its native actor offset and keep both packed display bytes
   // aligned with the clamped native rank and selected symbol.
   const actorOffset=actor-0x200;
   for(const [work,nativeBase,indexAt]of [[0x1e60,0x30e,0x32d],[0x1e80,0x32e,0x34d]]){
    if(ram[indexAt]!==actorOffset||state[wrm+work+2]!==0)continue;
    if(a!==null){stateChecks.push([wrm+work,a]);if(state[wrm+work]!==a){state[wrm+work]=a;changed=true;}}
    if(d!==null){stateChecks.push([wrm+work+1,d]);if(state[wrm+work+1]!==d){state[wrm+work+1]=d;changed=true;}}
    for(const [at,n]of [[nativeBase+13,first],[nativeBase+14,second]]){checks.push([at,n]);if(ram[at]!==n){ram[at]=n;changed=true;}}
   }
  }
 }
 // Update the NES nametable itself. No canvas labels stand in for game cards.
 const graphics=redraw(state,ram,addresses);changed=changed||graphics.changed;
 let cleanup=()=>{};
 if(changed){cleanup=queueState(gm,state);api.resetFrame();}
 try{
 const nextKey=codes.join(',');
 if(nextKey!==cheatKey){
  if(nextKey&&(!gm.setCheat||!gm.resetCheat))throw Error('This emulator cannot enforce card points.');
  if(cheatKey||nextKey)gm.resetCheat();
  try{codes.forEach((code,i)=>gm.setCheat(i,true,code));cheatKey=nextKey;}
  catch(e){gm.resetCheat();cheatKey='';throw e;}
 }
 // EmulatorJS queues a state load until emulation resumes. Its JS method
 // returning is not a completion signal; verify after the core advances.
 if(changed)api.resume();
 let verified=false;const deadline=Date.now()+1800;
 do{
  if(changed)await sleep(20);
  const live=inspect();verified=checks.every(([at,n])=>live.ram[at]===n)&&stateChecks.every(([at,n])=>live.state[at]===n)&&graphics.checks.every(([at,n])=>live.state[at]===n);
  if(verified)break;
 }while(Date.now()<deadline);
 const verifiedLive=inspect();lastVerification={verified,ram:checks.filter(([at,n])=>verifiedLive.ram[at]!==n).map(([at,n])=>({at,want:n,got:verifiedLive.ram[at]})),sidecar:stateChecks.filter(([at,n])=>verifiedLive.state[at]!==n).map(([at,n])=>({at,want:n,got:verifiedLive.state[at]})),graphics:graphics.checks.filter(([at,n])=>verifiedLive.state[at]!==n).slice(0,12).map(([at,n])=>({at,want:n,got:verifiedLive.state[at]}))};
 if(!verified)throw Error('The game has not accepted this edit yet. Change the value again to retry.');
 return{ready:true,verified,applied:addresses.map(a=>a!==null)};
 }finally{cleanup();}
}
const clean=v=>({attack:valid(v.attack,MAX_ATTACK),defense:valid(v.defense,MAX_DEFENSE),attribute:attrs[v.attribute]?v.attribute:null});
function queueApply(){
 dirty=true;if(feedback)feedback.textContent='Applying…';
 if(draining)return draining;
 busy=true;
 draining=(async()=>{
  if(resetting)await resetting;
  while(dirty){
   dirty=false;const seenVersions=versions.slice(),targets=values.map((v,i)=>({... (locked[i]?v:pending[i])}));
   try{
    const result=await apply(false,targets);
    if(result.ready)for(let i=0;i<5;i++)if(result.applied[i]&&versions[i]===seenVersions[i])pending[i]={attack:null,defense:null,attribute:null};
    persist();lastError='';if(feedback)feedback.textContent=result.ready?(result.applied.every(Boolean)?'Applied immediately.':'Available cards updated. Remaining cards will update when ready.'):'Waiting for the next playable card hand.';
   }catch(e){lastError=e.message;if(feedback)feedback.textContent=lastError;api.status(lastError);}
   finally{if(dialog&&!dialog.hidden)api.pause();}
  }
 })().finally(()=>{busy=false;draining=null;});
 return draining;
}
function edit(){values[selected]=clean(draft[selected]);pending[selected]={...values[selected]};versions[selected]++;refresh();return queueApply();}
function applyAll(){const v=clean(draft[selected]);for(let i=0;i<5;i++){values[i]={...v};pending[i]={...v};draft[i]={...draft[selected]};versions[i]++;}refresh();return queueApply();}
function toggleLock(){locked[selected]=!locked[selected];if(locked[selected]){values[selected]=clean(draft[selected]);pending[selected]={...values[selected]};}else pending[selected]={attack:null,defense:null,attribute:null};versions[selected]++;refresh();return queueApply();}
function reset(){
 if(resetting)return resetting;const prior=draining;
 resetting=(async()=>{
 if(prior)await prior;busy=true;
 try{values=empty();locked.fill(false);pending=empty();await apply(true);persist();lastNative=empty();lastSeen=empty();draft=Array.from({length:5},(_,i)=>defaults(inspect().ram,i));refresh();feedback.textContent='Original values restored. All five cards are unlocked.';}
 catch(e){feedback.textContent=e.message;api.status(e.message);}
 finally{busy=false;if(!dialog.hidden)api.pause();}
 })().finally(()=>{resetting=null;});return resetting;
}
async function whenSettled(){while(resetting||draining){if(resetting)await resetting;if(draining)await draining;}}
function open(){if(!api||!dialog?.hidden)return;try{api.release();api.pause();const r=inspect().ram;draft=Array.from({length:5},(_,i)=>defaults(r,i));selected=0;focusBefore=document.activeElement;refresh();feedback.textContent='Changes apply immediately.';dialog.hidden=false;tabs.children[0].focus();}catch(e){api.status(e.message);api.resume();}}
function btn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
function row(label,key){
 const max=key==='attack'?MAX_ATTACK:MAX_DEFENSE;
 const line=document.createElement('div');line.className='dbz-card-row dbz-card-numeric';
 const caption=document.createElement('label');caption.textContent=label;
 const out=document.createElement('input');out.id='crazy-card-'+key;caption.htmlFor=out.id;
 out.type='number';out.inputMode='numeric';out.min='1';out.max=String(max);out.step='1';out.autocomplete='off';
 out.setAttribute('aria-label',label+' points');out.setAttribute('aria-describedby','crazy-card-range');
 const commit=()=>{
  const raw=out.value.trim(),n=Number(raw);
  if(!/^[0-9]+$/.test(raw)||!Number.isSafeInteger(n)||n<1||n>max){
   out.setAttribute('aria-invalid','true');feedback.textContent=label+' must be a whole number from 1 to '+max+'. The card has not changed.';return false;
  }
  out.setAttribute('aria-invalid','false');draft[selected][key]=n;void edit();return true;
 };
 out.onchange=commit;
 out.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();commit();}});
 const step=delta=>{
  // Use only the last accepted card value; invalid or blank input never reaches RAM.
  out.setAttribute('aria-invalid','false');draft[selected][key]=Math.max(1,Math.min(max,draft[selected][key]+delta));return edit();
 };
 const down=btn('−',()=>step(-1)),up=btn('+',()=>step(1));
 down.setAttribute('aria-label','Decrease '+label.toLowerCase());up.setAttribute('aria-label','Increase '+label.toLowerCase());
 line.append(caption,down,out,up);return[line,out];
}
function start(options){
 if(api)return;api=options;dialog=document.createElement('section');dialog.id='dbz-card-editor';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Edit card points');
 const title=document.createElement('h2');title.textContent='Crazy Cards';const intro=document.createElement('p');intro.id='crazy-card-range';intro.textContent='Attack: 1–'+MAX_ATTACK+'. Defence: 1–'+MAX_DEFENSE+'. Use − / + or type a whole number, then press Enter or leave the field.';
 tabs=document.createElement('div');tabs.className='dbz-card-tabs';for(let i=0;i<5;i++)tabs.append(btn('Card '+(i+1),()=>{selected=i;refresh();}));
 const [attLine,attOut]=row('Attack','attack'),[defLine,defOut]=row('Defence','defense');attack=attOut;defense=defOut;
 const attrLine=document.createElement('div');attrLine.className='dbz-card-attribute';const attrLabel=document.createElement('label');attrLabel.textContent='Middle symbol';attribute=document.createElement('select');attribute.setAttribute('aria-label','Middle symbol');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose symbol';placeholder.disabled=true;placeholder.hidden=true;attribute.append(placeholder);for(const [n,symbol]of Object.entries(attrs)){const o=document.createElement('option');o.value=n;o.textContent=symbol;attribute.append(o);}attribute.onchange=()=>{draft[selected].attribute=Number(attribute.value);return edit();};attrLine.append(attrLabel,attribute);
 lockButton=btn('Lock card 1',toggleLock);lockButton.className='dbz-card-lock';
 const hint=document.createElement('p');hint.className='dbz-card-hint';hint.textContent='Lock each card separately to keep its values on every new hand, until you unlock it. Unlocked cards change normally when replaced.';
 feedback=document.createElement('p');feedback.className='dbz-card-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const actions=document.createElement('div');actions.className='dbz-card-actions';actions.append(btn('Apply to all 5',applyAll),btn('Original values',reset),btn('Back to game',close));actions.children[2].className='wide';
 dialog.append(title,intro,tabs,attLine,defLine,attrLine,lockButton,hint,feedback,actions);document.body.append(dialog);dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 setInterval(()=>{if(busy||!api.active()||api.isPaused?.()||!dialog.hidden||!locked.some(Boolean)&&!pending.some(v=>Object.values(v).some(Boolean)))return;void queueApply();},250);
}
function draw(){} // Card graphics now come from the NES framebuffer.
window[globalName]={ROM,start,open,prepareRom:bytes=>(config.prepareCards||config.prepareRom)(bytes),reset:()=>{if(api)clearCheats();lastSeen=empty();lastNative=empty();},draw,whenSettled,inspect:()=>({values:values.map(v=>({...v})),locked:locked.slice(),pending:pending.map(v=>({...v})),busy,active:!!api,lastVerification,gameCheats:cheatKey.split(',').filter(Boolean)})};
}
window.DreamCrazyCardsFactory=factory;
factory(window.DreamCrazy,'DreamCrazyCards');
})();
