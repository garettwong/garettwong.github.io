/* W64B only. Native code applies enemy BP/HP and victory BP multipliers. */
(()=>{'use strict';
window.DreamWide64EnemiesFactory=function(ROM){
const KEY='nes-dream:dbz-wide64-choice:'+ROM;
const counts=[[1,'Original','This fight’s original roster'],[2,'10–20','Random count from 10 to 20'],[4,'50–70','Random count from 50 to 70'],[3,'80–100','Random count from 80 to 100'],[5,'180–200','Random count from 180 to 200'],[6,'380–400','Random count from 380 to 400']];
const validCount=n=>Number.isInteger(n)&&counts.some(([value])=>value===n);
const validStrength=n=>Number.isInteger(n)&&n>=0&&n<=7;
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function chunk(b,tag,size){const h=[...tag].map(c=>c.charCodeAt(0)).concat([0,(size+1)&255,(size+1)>>8,0,0,0]);for(let i=0;i+size+9<=b.length;i++)if(same(b,i,h))return i+9;return-1;}
function pending(bytes){
 const r=chunk(bytes,'RAM',2048),w=chunk(bytes,'WRM',8192);
 if(r<0||w<0||!same(bytes,w+0x1ef8,[87,54,52,66])||bytes[r+0x2e]!==1||bytes[w+0x1390]!==0xa5||bytes[w+0x1394]!==0x82||!same(bytes,w,[0x4c,0,0x68]))return null;
 return{r,w,originalCount:Array.from({length:5},(_,i)=>bytes[r+0x2a2+i*18]).filter(id=>id<64).length};
}
let api=null,dialog=null,feedback=null,summary=null,startButton=null,countButtons=[],strengthButtons=[],busy=false,generation=0,timer=null;
let last=3,lastStrength=0,selected=last,strength=lastStrength;
try{const value=JSON.parse(localStorage.getItem(KEY)||'null');if(validCount(value?.count))last=value.count;if(validStrength(value?.strength))lastStrength=value.strength;}catch{}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const allButtons=()=>[...countButtons,...strengthButtons,startButton].filter(Boolean);
function refresh(){
 countButtons.forEach(b=>{const checked=Number(b.dataset.choice)===selected;b.setAttribute('aria-checked',String(checked));b.tabIndex=checked?0:-1;});
 strengthButtons.forEach(b=>{const checked=Number(b.dataset.strength)===strength;b.setAttribute('aria-checked',String(checked));b.tabIndex=checked?0:-1;});
 if(summary)summary.textContent=`Enemy BP & HP: ${2**strength}×. Victory BP: ${2**strength}×. NG+ round scaling also applies. Enemy count is included in the native reward.`;
}
function reset(){generation++;busy=false;if(dialog)dialog.hidden=true;allButtons().forEach(b=>b.disabled=false);}
function poll(){
 if(!api?.active()||busy)return;
 try{
  const gate=pending(new Uint8Array(api.gm().getState()));
  if(!gate){if(dialog&&!dialog.hidden)dialog.hidden=true;return;}
  if(!dialog.hidden)return;
  api.release();api.pause();selected=last;strength=lastStrength;refresh();dialog.hidden=false;
  feedback.textContent=`Original: ${gate.originalCount} ${gate.originalCount===1?'opponent':'opponents'} in this fight.`;
  countButtons.find(b=>Number(b.dataset.choice)===selected)?.focus();
 }catch(error){api.status(error.message||'Could not read the next battle.');}
}
async function choose(value=selected,exponent=strength){
 if(busy||!api||!dialog||dialog.hidden||!validCount(value)||!validStrength(exponent))return false;
 busy=true;const token=generation;allButtons().forEach(b=>b.disabled=true);feedback.textContent='Preparing this battle…';
 try{
  await api.settle?.();if(token!==generation)return false;
  const gm=api.gm(),state=new Uint8Array(gm.getState()).slice(),gate=pending(state);
  if(!gate)throw Error('This battle is no longer waiting. Reload your save to try again.');
  // Both options are committed together, while the native encounter gate waits.
  // Do not edit enemy records or multiply rewards in JavaScript.
  state[gate.w+0x1391]=value;state[gate.w+0x1c60]=exponent;
  await Promise.resolve(gm.loadState(state));if(token!==generation)return false;
  api.resetFrame();api.release();api.resume();
  let accepted=false;const end=Date.now()+2500;
  while(Date.now()<end){
   await wait(20);if(token!==generation)return false;
   const live=new Uint8Array(gm.getState()),w=chunk(live,'WRM',8192);
   if(w>=0&&same(live,w+0x1ef8,[87,54,52,66])&&live[w+0x1391]===value&&live[w+0x1c60]===exponent&&live[w+0x1390]===0){accepted=true;break;}
  }
  if(!accepted)throw Error('The game has not accepted both choices yet. Please try again.');
  last=value;lastStrength=exponent;try{localStorage.setItem(KEY,JSON.stringify({count:value,strength:exponent}));}catch{}
  dialog.hidden=true;api.status(`Battle started. Enemy BP & HP ${2**exponent}×; victory BP ${2**exponent}×.`);return true;
 }catch(error){if(token===generation){api.pause();feedback.textContent=error.message||'Could not start this battle.';}return false;}
 finally{if(token===generation){busy=false;allButtons().forEach(b=>b.disabled=false);}}
}
function radioGroup(label,choices,key,buttons,onSelect){
 const group=document.createElement('div');group.className='enemy-strength-options';group.setAttribute('role','radiogroup');group.setAttribute('aria-label',label);
 for(const [value,title,description]of choices){
  const button=document.createElement('button');button.type='button';button.setAttribute('role','radio');button.setAttribute('aria-label',title);button.dataset[key]=String(value);button.onclick=()=>{if(busy)return;onSelect(value);refresh();};
  const strong=document.createElement('strong');strong.textContent=title;button.append(strong);
  if(description){const small=document.createElement('span');small.textContent=description;button.append(small);}
  buttons.push(button);group.append(button);
 }
 group.addEventListener('keydown',event=>{
  if(busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  const at=buttons.indexOf(document.activeElement);if(at<0)return;event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+buttons.length)%buttons.length;
  buttons[next].click();buttons[next].focus();
 });
 return group;
}
function start(options){
 api=options;if(timer)clearInterval(timer);
 if(!dialog){
  dialog=document.createElement('section');dialog.id='dbz-enemy-strength-choice';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','dbz-enemy-strength-title');dialog.setAttribute('aria-describedby','dbz-enemy-strength-summary');
  const title=document.createElement('h2');title.id='dbz-enemy-strength-title';title.textContent='Choose this battle';
  const countTitle=document.createElement('h3');countTitle.textContent='Enemy count';
  const countGroup=radioGroup('Enemy count',counts,'choice',countButtons,value=>{selected=value;});
  const strengthTitle=document.createElement('h3');strengthTitle.textContent='Enemy strength';
  const strengthGroup=radioGroup('Enemy BP and HP multiplier',[0,1,2,3,4,5,6,7].map(value=>[value,`${2**value}×`,value===0?'Normal':'']),'strength',strengthButtons,value=>{strength=value;});
  summary=document.createElement('p');summary.id='dbz-enemy-strength-summary';summary.className='enemy-strength-summary';summary.setAttribute('aria-live','polite');
  feedback=document.createElement('p');feedback.className='enemy-strength-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  startButton=document.createElement('button');startButton.type='button';startButton.className='enemy-strength-start';startButton.textContent='Start battle';startButton.onclick=()=>choose();
  const note=document.createElement('p');note.className='enemy-strength-note';note.textContent='Choose again before each battle. Larger battles continue in groups of up to 100, with victory after the full total is defeated. HP caps at 65,534. BP and rewards use unsigned 64-bit values. Scripted invulnerability is preserved. Piccolo’s duplicate training stays one-on-one.';
  dialog.append(title,countTitle,countGroup,strengthTitle,strengthGroup,summary,feedback,startButton,note);document.body.append(dialog);
  dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const available=allButtons().filter(b=>!b.disabled&&b.tabIndex!==-1),first=available[0],end=available[available.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();end?.focus();}else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();first?.focus();}});
 }
 timer=setInterval(poll,80);poll();
}
return {pending,start,reset,choose,isOpen:()=>!!dialog&&!dialog.hidden,inspect:()=>({open:!!dialog&&!dialog.hidden,busy,last,lastStrength,selected,strength})};
};
})();
