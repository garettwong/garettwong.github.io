/* Zelda inventory controls. RAM definitions verified against aldonunez/zelda1-disassembly. */
(()=>{'use strict';
const ROMS=new Set(['8f72dc2e98572eb4ba7c3a902bca5f69c448fc4391837e5f8f0d4556280440ac','2a0153504555093b498fd254190a1f212c0d5ce74f2f4f9f8a61a5022864e1e4']);
const resources=[{id:'rupees',label:'Rupees',at:0x66d,max:255},{id:'hearts',label:'Heart containers',at:0x66f,min:3,max:16},{id:'bombs',label:'Bombs',at:0x658,max:16},{id:'keys',label:'Keys',at:0x66e,max:255}];
const tools=[['sword','Sword',0x657,['None','Wooden','White','Magical']],['arrows','Arrows',0x659,['None','Wooden','Silver']],['bow','Bow',0x65a],['candle','Candle',0x65b,['None','Blue','Red']],['flute','Flute',0x65c],['food','Food / bait',0x65d],['potion','Potion',0x65e,['None','Blue · 1 use','Red · 2 uses']],['rod','Magic rod',0x65f],['raft','Raft',0x660],['book','Magic book',0x661],['ring','Ring',0x662,['None','Blue','Red']],['ladder','Ladder',0x663],['magicKey','Magic key',0x664],['bracelet','Power bracelet',0x665],['letter','Letter',0x666,['None','Have letter','Shown to potion seller']],['boomerang','Boomerang',0x674,['None','Wooden','Magical']],['shield','Magic shield',0x676]];
let api=null,dialog=null,feedback=null,focusBefore=null,wasPaused=false,locks={},targets={},key='',rows=new Map(),toolInputs=new Map();
const playable=r=>!!r&&[5,9,10,11,12].includes(r[0x12])&&(r[0x66f]>>4)>=2;
function read(r,f){return f.id==='hearts'?(r[f.at]>>4)+1:r[f.at];}
function write(r,f,n){
 n=Math.max(f.min||0,Math.min(f.max,Math.round(Number(n))));if(!Number.isFinite(n))throw Error('Enter a valid number.');
 if(f.id==='hearts'){r[0x66f]=(n-1)*17;r[0x670]=255;}
 else {r[f.at]=n;if(f.id==='rupees'){r[0x67d]=0;r[0x67e]=0;}if(f.id==='bombs'&&n>r[0x67c])r[0x67c]=n>12?16:n>8?12:8;}
 return n;
}
function persist(){try{localStorage.setItem(key,JSON.stringify({version:1,locks,targets}));}catch{say('Applied. Browser storage is full, so locks may not survive reopening.');}}
function say(text){if(feedback)feedback.textContent=text;}
function ram(){const r=api?.ram();if(!playable(r))throw Error('Enter your adventure first, then open Zelda Tricks.');return r;}
function updateResource(id,n){const f=resources.find(f=>f.id===id);if(!f)throw Error('Unknown Zelda setting.');const r=ram();targets[id]=write(r,f,n);persist();render();say('Applied immediately. '+(locks[id]?'Locked until you unlock it.':'Value can change normally during play.'));}
function setLock(id,on){const f=resources.find(f=>f.id===id);if(!f)throw Error('Unknown Zelda lock.');const r=ram();locks[id]=!!on;if(on){targets[id]=read(r,f);write(r,f,targets[id]);}persist();render();say(on?'Locked. This value is kept during play.':'Unlocked. Normal game changes are allowed.');}
function setTool(id,n){const t=tools.find(t=>t[0]===id);if(!t)throw Error('Unknown Zelda item.');const r=ram(),max=(t[3]||['None','Have']).length-1;n=Number(n);if(!Number.isInteger(n)||n<0||n>max)throw Error('Invalid item value.');
 if(id==='boomerang'){r[0x674]=n?1:0;r[0x675]=n===2?1:0;}else r[t[2]]=n;
 render();say('Equipment changed. Open Start → inventory to choose a B item. Ring colour refreshes when you enter another room.');
}
function allTools(){ram();for(const t of tools)setTool(t[0],(t[3]||['None','Have']).length-1);say('All listed equipment added. Choose a B item from the Start inventory. Quest progress is unchanged.');}
function frame(r){if(!api||!playable(r))return;for(const f of resources)if(locks[f.id])write(r,f,targets[f.id]);}
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function button(text,fn){const n=el('button',text);n.type='button';n.onclick=()=>{try{fn();}catch(e){say(e.message);}};return n;}
function render(){if(!api)return;const r=api.ram();for(const f of resources){const row=rows.get(f.id);if(!row)continue;row.input.value=String(read(r,f));row.lock.setAttribute('aria-pressed',String(!!locks[f.id]));row.lock.textContent=locks[f.id]?'Locked':'Lock';}for(const t of tools){const select=toolInputs.get(t[0]);if(select)select.value=String(t[0]==='boomerang'?(r[0x675]?2:r[0x674]?1:0):r[t[2]]);}}
function build(){
 dialog=el('section');dialog.id='zelda-tricks';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Zelda Tricks');
 const head=el('div');head.className='zelda-head';head.append(el('h2','Zelda Tricks'),button('Back to game',close));dialog.append(head,el('p','Changes apply immediately. Lock a resource to keep it during play; unlock it to return to normal.'));
 for(const f of resources){const row=el('div');row.className='zelda-resource';const label=el('label',f.label);label.htmlFor='zelda-'+f.id;const input=el('input');input.id=label.htmlFor;input.type='number';input.inputMode='numeric';input.min=String(f.min||0);input.max=String(f.max);input.step='1';input.setAttribute('aria-label',f.label);input.oninput=()=>{const n=Number(input.value);if(input.value!==''&&Number.isInteger(n)&&n>=(f.min||0)&&n<=f.max){try{updateResource(f.id,n);}catch(e){say(e.message);}}};input.onchange=()=>{try{updateResource(f.id,input.value);}catch(e){say(e.message);render();}};const lock=button('Lock',()=>setLock(f.id,!locks[f.id]));lock.setAttribute('aria-label','Lock '+f.label.toLowerCase());row.append(label,input,button('Max',()=>updateResource(f.id,f.max)),lock);rows.set(f.id,{input,lock});dialog.append(row);}
 const actions=el('div');actions.className='zelda-actions';actions.append(button('Refill hearts',()=>updateResource('hearts',read(ram(),resources[1]))),button('Unlock all',()=>{locks={};persist();render();say('All resource locks off. Current items and values are kept.');}));dialog.append(actions);
 const details=el('details'),summary=el('summary','Tools & equipment');details.append(summary,el('p','Select the equipment you want. These changes also remain in your game saves.'));
 for(const t of tools){const label=el('label',t[1]);label.className='zelda-tool';const select=el('select');select.setAttribute('aria-label',t[1]);(t[3]||['None','Have']).forEach((name,i)=>{const option=el('option',name);option.value=String(i);select.append(option);});select.onchange=()=>{try{setTool(t[0],Number(select.value));}catch(e){say(e.message);}};toolInputs.set(t[0],select);label.append(select);details.append(label);}
 details.append(button('Give all equipment',allTools));dialog.append(details);feedback=el('p');feedback.className='zelda-feedback';feedback.setAttribute('role','status');dialog.append(feedback,el('p','Use Save game to keep your progress. Changing these settings does not alter the original NES file.'));
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const list=Array.from(dialog.querySelectorAll('button,input,select,summary')).filter(n=>n.getClientRects().length&&!n.disabled),first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});document.body.append(dialog);
}
function open(){if(!api)return;if(dialog&&!dialog.hidden){dialog.querySelector('button').focus();return;}try{ram();}catch(e){api.status(e.message);return;}if(!dialog)build();focusBefore=document.activeElement;wasPaused=api.isPaused();api.release();api.pause();render();dialog.hidden=false;say('Ready. Changing heart containers also refills your life.');dialog.querySelector('button').focus();}
function close(){if(!dialog)return;dialog.hidden=true;api.release();if(!wasPaused)api.resume();focusBefore?.focus?.();}
function start(options){if(!ROMS.has(options.id)){api=null;return false;}api=options;key='nes-dream:zelda-tricks:'+options.id;locks={};targets={};try{const data=JSON.parse(localStorage.getItem(key)||'null');for(const f of resources){const n=data?.targets?.[f.id];if(data?.locks?.[f.id]===true&&Number.isInteger(n)&&n>=(f.min||0)&&n<=f.max){locks[f.id]=true;targets[f.id]=n;}}}catch{}return true;}
window.DreamZelda={supports:id=>ROMS.has(id),start,frame,open,close,updateResource,setLock,setTool,allTools,inspect:()=>({locks:{...locks},targets:{...targets},ready:playable(api?.ram())}),resources};
})();
