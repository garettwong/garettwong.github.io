/* Separate English card-editor edition. The five native card records control both graphics and combat. */
(()=>{'use strict';
const ROM='e16062d3cabe3c7c84be496c401ee4b5d0e333129be2fda3d70c9898dd2595b8';
const KEY='nes-dream:dbz-card-editor:'+ROM, BASE=0x3f5;
const attrs=[null,'必','界','惑','亀','Z','魔'];
const empty=()=>Array.from({length:5},()=>({attack:null,defense:null,attribute:null}));
let values=empty();try{const found=JSON.parse(localStorage.getItem(KEY)||'null');if(Array.isArray(found)&&found.length===5)values=found.map(v=>({attack:valid(v.attack,8),defense:valid(v.defense,8),attribute:valid(v.attribute,6)}));}catch{}
function valid(n,max){return Number.isInteger(n)&&n>=1&&n<=max?n:null;}
// Mode 6 is the real map. Mode 8 is the tutorial/training area; the old
// implementation accidentally supported that area instead of normal walking.
function cardScene(r){return[1,6,8].includes(r[0x2e]);}
function record(r,i){const a=BASE+i*8;return r[a+1]>=0x20&&r[a+1]<=0x2b&&r[a+2]<=4&&valid(r[a+3],8)&&valid(r[a+4],8)&&valid(r[a+5],6)?a:null;}
let api=null,dialog=null,tabs=null,attack=null,defense=null,attribute=null,selected=0,draft=[],lastNative=empty(),lastSeen=empty(),focusBefore=null,busy=false,cheatKey='',lastError='';
function inspect(){const state=new Uint8Array(api.gm().getState()),at=api.ramStart(state);if(at<0)throw Error('Card data is not ready.');return{state,at,ram:state.subarray(at,at+2048)};}
function persist(){localStorage.setItem(KEY,JSON.stringify(values));}
function defaults(r,i){const a=r&&record(r,i);return{attack:values[i].attack??(a!==null?valid(r[a+3],8):null)??5,defense:values[i].defense??(a!==null?valid(r[a+4],8):null)??5,attribute:values[i].attribute??(a!==null?valid(r[a+5],6):null)??4};}
function refresh(){for(const [i,button]of [...tabs.children].entries()){const v=draft[i];button.textContent=`${i+1}\n${v.attack}/${v.defense}`;button.setAttribute('aria-pressed',String(i===selected));}attack.textContent=String(draft[selected].attack);defense.textContent=String(draft[selected].defense);attribute.value=String(draft[selected].attribute);}
function close(){if(!dialog||dialog.hidden)return;dialog.hidden=true;api.resume();api.resetFrame();focusBefore?.focus();}
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
async function apply(restore=false){
 const gm=api.gm(),{state,ram}=inspect();
 if(restore)clearCheats();
 if(!cardScene(ram)){clearCheats();return{ready:false,verified:false};}
 const addresses=Array.from({length:5},(_,i)=>record(ram,i));
 if(addresses.some(a=>a===null)){clearCheats();return{ready:false,verified:false};}
 let changed=false;const codes=[],checks=[];
 for(let i=0;i<5;i++){
  const a=addresses[i],target=restore?lastNative[i]:values[i];
  for(const [field,offset,max]of [['attack',3,8],['defense',4,8],['attribute',5,6]]){
   const n=valid(target[field],max);if(n===null)continue;
   if(!restore)codes.push(`${(a+offset).toString(16).toUpperCase().padStart(4,'0')}:${n.toString(16).toUpperCase().padStart(2,'0')}`);
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
  const target=restore?lastNative[i]:values[i];
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
 if(!verified)throw Error('The game has not accepted this edit. Please try Apply again.');
 return{ready:true,verified};
}
async function save(all=false){if(busy)return;busy=true;const previous=values.map(v=>({...v}));try{const v={...draft[selected]};if(all){for(let i=0;i<5;i++)values[i]={...v};}else values[selected]={...v};const result=await apply();persist();lastError='';api.status(result.ready?'Applied to the game cards. Z = 8 points.':'Saved; waiting for the next playable card hand.');close();}catch(e){clearCheats();values=previous;api.status(e.message);close();}finally{busy=false;}}
async function reset(){if(busy)return;busy=true;const previous=values.map(v=>({...v}));try{values=empty();const result=await apply(true);persist();api.status(result.ready?'Original card values restored in the game.':'Original settings restored; the next card hand will be normal.');close();}catch(e){values=previous;api.status(e.message);close();}finally{busy=false;}}
function open(){if(!api||!dialog?.hidden)return;try{api.release();api.pause();const r=inspect().ram;draft=Array.from({length:5},(_,i)=>defaults(r,i));selected=0;focusBefore=document.activeElement;refresh();dialog.hidden=false;tabs.children[0].focus();}catch(e){api.status(e.message);api.resume();}}
function btn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
function row(label,key){const line=document.createElement('div');line.className='dbz-card-row';const caption=document.createElement('label');caption.textContent=label;const out=document.createElement('output');const down=btn('−',()=>{draft[selected][key]=Math.max(1,draft[selected][key]-1);refresh();});const up=btn('+',()=>{draft[selected][key]=Math.min(8,draft[selected][key]+1);refresh();});line.append(caption,down,out,up);return[line,out];}
function start(options){if(api)return;api=options;dialog=document.createElement('section');dialog.id='dbz-card-editor';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Edit card points');const title=document.createElement('h2');title.textContent='Edit card points';const intro=document.createElement('p');intro.textContent='Choose one of the five cards. Z means 8 points. Changes also affect the fight.';tabs=document.createElement('div');tabs.className='dbz-card-tabs';for(let i=0;i<5;i++)tabs.append(btn('Card '+(i+1),()=>{selected=i;refresh();}));const [attLine,attOut]=row('Attack','attack'),[defLine,defOut]=row('Defense','defense');attack=attOut;defense=defOut;const attrLine=document.createElement('div');attrLine.className='dbz-card-attribute';const attrLabel=document.createElement('label');attrLabel.textContent='Middle symbol';attribute=document.createElement('select');for(let n=1;n<=6;n++){const o=document.createElement('option');o.value=String(n);o.textContent=`${n} · ${attrs[n]}`;attribute.append(o);}attribute.onchange=()=>{draft[selected].attribute=Number(attribute.value);};attrLine.append(attrLabel,attribute);const actions=document.createElement('div');actions.className='dbz-card-actions';const hint=document.createElement('p');hint.className='dbz-card-hint';hint.textContent='Works while walking or fighting. Your choice also applies when the next cards appear.';actions.append(btn('Save this card',()=>save(false)),btn('Apply to all 5',()=>save(true)),btn('Original values',reset),btn('Back to game',close));dialog.append(title,intro,tabs,attLine,defLine,attrLine,actions,hint);document.body.append(dialog);dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 setInterval(async()=>{if(busy||!api.active()||api.isPaused?.()||!dialog.hidden||!values.some(v=>v.attack||v.defense||v.attribute))return;busy=true;try{await apply();lastError='';}catch(e){if(e.message!==lastError){lastError=e.message;api.status('Card points were not applied: '+e.message);}}finally{busy=false;}},250);
}
function draw(){} // Card graphics now come from the NES framebuffer.
window.DreamCards={ROM,start,open,reset:()=>{if(api)clearCheats();lastSeen=empty();lastNative=empty();},draw,inspect:()=>({values:values.map(v=>({...v})),active:!!api,gameCheats:cheatKey.split(',').filter(Boolean)})};
})();
