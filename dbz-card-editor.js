/* Separate English card-editor edition. The five native card records control both graphics and combat. */
(()=>{'use strict';
const ROM='e16062d3cabe3c7c84be496c401ee4b5d0e333129be2fda3d70c9898dd2595b8';
const KEY='nes-dream:dbz-card-editor:'+ROM, BASE=0x3f5;
const attrs={1:'必',2:'界',3:'惑',4:'亀',6:'魔'};
const empty=()=>Array.from({length:5},()=>({attack:null,defense:null,attribute:null}));
let values=empty(),locked=Array(5).fill(false),pending=empty(),versions=Array(5).fill(0);
try{const found=JSON.parse(localStorage.getItem(KEY)||'null'),cards=Array.isArray(found)?found:found?.cards;if(Array.isArray(cards)&&cards.length===5){values=cards.map(v=>({attack:valid(v.attack,8),defense:valid(v.defense,8),attribute:attrs[v.attribute]?v.attribute:null}));locked=cards.map((v,i)=>Array.isArray(found)?Object.values(values[i]).some(Boolean):v.locked===true);}}catch{}
function valid(n,max){return Number.isInteger(n)&&n>=1&&n<=max?n:null;}
// Mode 6 is the real map. Mode 8 is the tutorial/training area; the old
// implementation accidentally supported that area instead of normal walking.
function cardScene(r){return[1,6,8].includes(r[0x2e]);}
function record(r,i){const a=BASE+i*8;return r[a+1]>=0x20&&r[a+1]<=0x2b&&r[a+2]<=4&&valid(r[a+3],8)&&valid(r[a+4],8)&&valid(r[a+5],6)?a:null;}
let api=null,dialog=null,tabs=null,attack=null,defense=null,attribute=null,lockButton=null,feedback=null,selected=0,draft=[],lastNative=empty(),lastSeen=empty(),focusBefore=null,busy=false,dirty=false,draining=null,cheatKey='',lastError='';
function inspect(){const state=new Uint8Array(api.gm().getState()),at=api.ramStart(state);if(at<0)throw Error('Card data is not ready.');return{state,at,ram:state.subarray(at,at+2048)};}
let lastPersisted='';
function persist(){const text=JSON.stringify({version:2,cards:values.map((v,i)=>({...v,locked:locked[i]}))});if(text!==lastPersisted){localStorage.setItem(KEY,text);lastPersisted=text;}}
function defaults(r,i){const a=r?record(r,i):null,v=locked[i]?values[i]:pending[i];return{attack:v.attack??(a!==null?valid(r[a+3],8):null)??5,defense:v.defense??(a!==null?valid(r[a+4],8):null)??5,attribute:v.attribute??(a!==null?valid(r[a+5],6):null)??4};}
function refresh(){for(const [i,button]of [...tabs.children].entries()){const v=draft[i];button.textContent=`${i+1}${locked[i]?' 🔒':''}\n${v.attack}/${v.defense}`;button.setAttribute('aria-label',`Card ${i+1}, attack ${v.attack}, defense ${v.defense}${locked[i]?', locked':''}`);button.setAttribute('aria-pressed',String(i===selected));}attack.textContent=String(draft[selected].attack);defense.textContent=String(draft[selected].defense);attribute.value=attrs[draft[selected].attribute]?String(draft[selected].attribute):'';lockButton.textContent=locked[selected]?`Card ${selected+1} locked · Unlock`:`Lock card ${selected+1}`;lockButton.setAttribute('aria-pressed',String(locked[selected]));}
async function close(){if(!dialog||dialog.hidden)return;if(draining)await draining;dialog.hidden=true;api.resume();api.resetFrame();focusBefore?.focus();}
function clearCheats(){if(cheatKey){api.gm().resetCheat();cheatKey='';}}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const attackTiles=[[],[144,162,145,161],[144,162,147,163],[144,164,147,165],[148,164,149,165],[144,166,151,167],[152,168,153,169],[154,170,155,171],[156,172,157,173]];
const defenseTiles=[[],[158,174,159,175],[176,192,177,193],[178,194,179,195],[180,196,181,197],[182,198,183,199],[184,200,185,201],[186,202,187,203],[188,204,189,205]];
const symbolTiles=[[],[236,237,238,239],[240,241,242,243],[244,245,246,247],[248,249,250,251],[252,253,254,255],[232,233,234,235]];
function nametable(state){for(let i=0;i<state.length-2057;i++)if(state[i]===78&&state[i+1]===77&&state[i+2]===84&&state[i+3]===0&&state[i+4]===1&&state[i+5]===8&&state[i+6]===0&&state[i+7]===0&&state[i+8]===0)return i+9;return -1;}
function redraw(state,ram,addresses){
 const at=nametable(state),checks=[];let changed=false;if(at<0)return{changed,checks};
 // Native 4x6 card borders, excluding its attack, defense and emblem tiles.
 const shell=[[2,190],[3,191],[34,0],[35,206],[64,207],[67,206],[96,207],[99,206],[128,207],[129,0],[160,208],[161,209]];
 for(const a of addresses){
  if(a===null||ram[a+2]!==2)continue;
  const address=(ram[a]|ram[a+1]<<8)&1023;
  if((address&31)>28||(address>>5)>24)continue;
  for(const plane of [0,1024]){
   const base=at+plane+address;
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
 if(restore)clearCheats();
 if(!cardScene(ram)){clearCheats();return{ready:false,verified:false};}
 const addresses=Array.from({length:5},(_,i)=>record(ram,i));
 if(addresses.some(a=>a===null)){clearCheats();return{ready:false,verified:false};}
 let changed=false;const codes=[],checks=[];
 for(let i=0;i<5;i++){
  const a=addresses[i],target=restore?lastNative[i]:targets[i];
  for(const [field,offset,max]of [['attack',3,8],['defense',4,8],['attribute',5,6]]){
   const n=valid(target[field],max);if(n===null)continue;
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
 if(ram[0x2e]===1)for(let actor=0x200;actor<0x2a2;actor+=18){
  const packed=ram[actor+13],i=packed>>4;
  if((ram[actor]&0x80)||i>=5||!valid(packed&15,8))continue;
  const target=restore?lastNative[i]:targets[i];
  const a=valid(target.attack,8),d=valid(target.defense,8),m=valid(target.attribute,6);
  const first=a===null?packed:(packed&0xf0)|a;
  const second=((d??(ram[actor+14]>>4))<<4)|(m??(ram[actor+14]&15));
  for(const [at,n]of [[actor+13,first],[actor+14,second]]){checks.push([at,n]);if(ram[at]!==n){ram[at]=n;changed=true;}}
 }
 // Update the NES nametable itself. No canvas labels stand in for game cards.
 const graphics=redraw(state,ram,addresses);changed=changed||graphics.changed;
 if(changed){gm.loadState(state);api.resetFrame();}
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
  const live=inspect();verified=checks.every(([at,n])=>live.ram[at]===n)&&graphics.checks.every(([at,n])=>live.state[at]===n);
  if(verified)break;
 }while(Date.now()<deadline);
 if(!verified)throw Error('The game has not accepted this edit yet. Change the value again to retry.');
 return{ready:true,verified};
}
const clean=v=>({attack:valid(v.attack,8),defense:valid(v.defense,8),attribute:attrs[v.attribute]?v.attribute:null});
function queueApply(){
 dirty=true;if(feedback)feedback.textContent='Applying…';
 if(draining)return draining;
 busy=true;
 draining=(async()=>{
  while(dirty){
   dirty=false;const seenVersions=versions.slice(),targets=values.map((v,i)=>({... (locked[i]?v:pending[i])}));
   try{
    const result=await apply(false,targets);
    if(result.ready)for(let i=0;i<5;i++)if(versions[i]===seenVersions[i])pending[i]={attack:null,defense:null,attribute:null};
    persist();lastError='';if(feedback)feedback.textContent=result.ready?'Applied immediately.':'Waiting for the next playable card hand.';
   }catch(e){lastError=e.message;if(feedback)feedback.textContent=lastError;api.status(lastError);}
   finally{if(dialog&&!dialog.hidden)api.pause();}
  }
 })().finally(()=>{busy=false;draining=null;});
 return draining;
}
function edit(){values[selected]=clean(draft[selected]);pending[selected]={...values[selected]};versions[selected]++;refresh();return queueApply();}
function applyAll(){const v=clean(draft[selected]);for(let i=0;i<5;i++){values[i]={...v};pending[i]={...v};draft[i]={...draft[selected]};versions[i]++;}refresh();return queueApply();}
function toggleLock(){locked[selected]=!locked[selected];if(locked[selected]){values[selected]=clean(draft[selected]);pending[selected]={...values[selected]};}else pending[selected]={attack:null,defense:null,attribute:null};versions[selected]++;refresh();return queueApply();}
async function reset(){
 if(draining)await draining;busy=true;
 try{values=empty();locked.fill(false);pending=empty();await apply(true);persist();lastNative=empty();lastSeen=empty();draft=Array.from({length:5},(_,i)=>defaults(inspect().ram,i));refresh();feedback.textContent='Original values restored. All five cards are unlocked.';}
 catch(e){feedback.textContent=e.message;api.status(e.message);}
 finally{busy=false;if(!dialog.hidden)api.pause();}
}
function open(){if(!api||!dialog?.hidden)return;try{api.release();api.pause();const r=inspect().ram;draft=Array.from({length:5},(_,i)=>defaults(r,i));selected=0;focusBefore=document.activeElement;refresh();feedback.textContent='Changes apply immediately.';dialog.hidden=false;tabs.children[0].focus();}catch(e){api.status(e.message);api.resume();}}
function btn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
function row(label,key){const line=document.createElement('div');line.className='dbz-card-row';const caption=document.createElement('label');caption.textContent=label;const out=document.createElement('output');const down=btn('−',()=>{draft[selected][key]=Math.max(1,draft[selected][key]-1);return edit();});const up=btn('+',()=>{draft[selected][key]=Math.min(8,draft[selected][key]+1);return edit();});down.setAttribute('aria-label','Decrease '+label.toLowerCase());up.setAttribute('aria-label','Increase '+label.toLowerCase());line.append(caption,down,out,up);return[line,out];}
function start(options){
 if(api)return;api=options;dialog=document.createElement('section');dialog.id='dbz-card-editor';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Edit card points');
 const title=document.createElement('h2');title.textContent='Edit card points';const intro=document.createElement('p');intro.textContent='Attack, defense and middle-symbol changes apply immediately. Points range from 1 to 8.';
 tabs=document.createElement('div');tabs.className='dbz-card-tabs';for(let i=0;i<5;i++)tabs.append(btn('Card '+(i+1),()=>{selected=i;refresh();}));
 const [attLine,attOut]=row('Attack','attack'),[defLine,defOut]=row('Defense','defense');attack=attOut;defense=defOut;
 const attrLine=document.createElement('div');attrLine.className='dbz-card-attribute';const attrLabel=document.createElement('label');attrLabel.textContent='Middle symbol';attribute=document.createElement('select');attribute.setAttribute('aria-label','Middle symbol');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose symbol';placeholder.disabled=true;placeholder.hidden=true;attribute.append(placeholder);for(const [n,symbol]of Object.entries(attrs)){const o=document.createElement('option');o.value=n;o.textContent=symbol;attribute.append(o);}attribute.onchange=()=>{draft[selected].attribute=Number(attribute.value);return edit();};attrLine.append(attrLabel,attribute);
 lockButton=btn('Lock card 1',toggleLock);lockButton.className='dbz-card-lock';
 const hint=document.createElement('p');hint.className='dbz-card-hint';hint.textContent='Lock each card separately to keep its values on every new hand, until you unlock it. Unlocked cards change normally when replaced.';
 feedback=document.createElement('p');feedback.className='dbz-card-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const actions=document.createElement('div');actions.className='dbz-card-actions';actions.append(btn('Apply to all 5',applyAll),btn('Original values',reset),btn('Back to game',close));actions.children[2].className='wide';
 dialog.append(title,intro,tabs,attLine,defLine,attrLine,lockButton,hint,feedback,actions);document.body.append(dialog);dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 setInterval(()=>{if(busy||!api.active()||api.isPaused?.()||!dialog.hidden||!locked.some(Boolean)&&!pending.some(v=>Object.values(v).some(Boolean)))return;void queueApply();},250);
}
function draw(){} // Card graphics now come from the NES framebuffer.
function prepareRom(bytes){
 // The existing refill runs at new-game start and every item-menu opening.
 // Replace its sequential IDs with the same complete deck, King Kai first.
 const code=528+0x3ff4e,table=528+0x3ffdd;
 if(![0x8a,0x09,0x80].every((v,i)=>bytes[code+i]===v)||!bytes.slice(table,table+17).every(v=>v===0xff))throw Error('King Kai card order does not match this ROM.');
 bytes.set([0xbd,0xdd,0xff],code);
 bytes.set([0x8a,...Array.from({length:17},(_,i)=>0x80+i).filter(v=>v!==0x8a)],table);
 // Battle has a separate menu-opening path. Refresh before its first rows
 // are drawn as well, so existing saved inventories receive the new order.
 const hook=528+0x31340,stub=528+0x33fef;
 if(![0x4c,0xa9,0x80].every((v,i)=>bytes[hook+i]===v)||!bytes.slice(stub,stub+6).every(v=>v===0xff))throw Error('King Kai battle menu does not match this ROM.');
 bytes.set([0x4c,0xef,0xbf],hook);
 bytes.set([0x20,0x39,0xff,0x4c,0xa9,0x80],stub);
}
window.DreamCards={ROM,start,open,prepareRom,reset:()=>{if(api)clearCheats();lastSeen=empty();lastNative=empty();},draw,whenSettled:()=>draining||Promise.resolve(),inspect:()=>({values:values.map(v=>({...v})),locked:locked.slice(),pending:pending.map(v=>({...v})),busy,active:!!api,gameCheats:cheatKey.split(',').filter(Boolean)})};
})();
