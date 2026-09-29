/* Separate English card-editor edition. The five native card records control both graphics and combat. */
(()=>{'use strict';
const ROM='e16062d3cabe3c7c84be496c401ee4b5d0e333129be2fda3d70c9898dd2595b8';
const KEY='nes-dream:dbz-card-editor:'+ROM, BASE=0x3f5;
const attrs=[null,'必','界','惑','亀','Z','魔'];
const empty=()=>Array.from({length:5},()=>({attack:null,defense:null,attribute:null}));
let values=empty();try{const found=JSON.parse(localStorage.getItem(KEY)||'null');if(Array.isArray(found)&&found.length===5)values=found.map(v=>({attack:valid(v.attack,8),defense:valid(v.defense,8),attribute:valid(v.attribute,6)}));}catch{}
function valid(n,max){return Number.isInteger(n)&&n>=1&&n<=max?n:null;}
function cardScene(r){return(r[0x2e]===1&&r[0x30]>=3&&r[0x30]<=7)||(r[0x2e]===8&&r[0x30]===14);}
function record(r,i){const a=BASE+i*8,lo=(0xca+i*4)&255;return r[a]===lo&&r[a+1]===0x26&&[1,2].includes(r[a+2])?a:null;}
let api=null,dialog=null,tabs=null,attack=null,defense=null,attribute=null,selected=0,draft=[],lastNative=empty(),lastSeen=empty(),focusBefore=null,busy=false;
function inspect(){const state=new Uint8Array(api.gm().getState()),at=api.ramStart(state);if(at<0)throw Error('Card data is not ready.');return{state,at,ram:state.subarray(at,at+2048)};}
function persist(){localStorage.setItem(KEY,JSON.stringify(values));}
function defaults(r,i){const a=r&&record(r,i);return{attack:values[i].attack??(a!==null?valid(r[a+3],8):null)??5,defense:values[i].defense??(a!==null?valid(r[a+4],8):null)??5,attribute:values[i].attribute??(a!==null?valid(r[a+5],6):null)??4};}
function refresh(){for(const [i,button]of [...tabs.children].entries()){const v=draft[i];button.textContent=`${i+1}\n${v.attack}/${v.defense}`;button.setAttribute('aria-pressed',String(i===selected));}attack.textContent=String(draft[selected].attack);defense.textContent=String(draft[selected].defense);attribute.value=String(draft[selected].attribute);}
function close(){if(!dialog||dialog.hidden)return;dialog.hidden=true;api.resume();api.resetFrame();focusBefore?.focus();}
function apply(restore=false){const {state,ram}=inspect();if(!cardScene(ram))return false;let changed=false;
 for(let i=0;i<5;i++){const a=record(ram,i);if(a===null)continue;
  const target=restore?lastNative[i]:values[i];if(!target)continue;
  for(const [field,offset,max]of [['attack',3,8],['defense',4,8],['attribute',5,6]]){
   const n=valid(target[field],max);if(n===null||ram[a+offset]===n)continue;
   if(!restore&&lastSeen[i][field]!==ram[a+offset])lastNative[i][field]=ram[a+offset];
   ram[a+offset]=n;changed=true;
  }
  lastSeen[i]={attack:ram[a+3],defense:ram[a+4],attribute:ram[a+5]};
 }
 if(changed){api.gm().loadState(state);api.resetFrame();}return changed;
}
function save(all=false){if(busy)return;busy=true;try{const v={...draft[selected]};if(all){for(let i=0;i<5;i++)values[i]={...v};}else values[selected]={...v};persist();apply();api.status(all?'All five cards updated.':'Card '+(selected+1)+' updated.');close();}catch(e){api.status(e.message);close();}finally{busy=false;}}
function reset(){if(busy)return;busy=true;try{values=empty();persist();apply(true);api.status('Original card values restored for the current hand.');close();}catch(e){api.status(e.message);close();}finally{busy=false;}}
function open(){if(!api||!dialog?.hidden)return;try{api.release();api.pause();const r=inspect().ram;draft=Array.from({length:5},(_,i)=>defaults(r,i));selected=0;focusBefore=document.activeElement;refresh();dialog.hidden=false;tabs.children[0].focus();}catch(e){api.status(e.message);api.resume();}}
function btn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
function row(label,key){const line=document.createElement('div');line.className='dbz-card-row';const caption=document.createElement('label');caption.textContent=label;const out=document.createElement('output');const down=btn('−',()=>{draft[selected][key]=Math.max(1,draft[selected][key]-1);refresh();});const up=btn('+',()=>{draft[selected][key]=Math.min(8,draft[selected][key]+1);refresh();});line.append(caption,down,out,up);return[line,out];}
function start(options){if(api)return;api=options;dialog=document.createElement('section');dialog.id='dbz-card-editor';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Edit card points');const title=document.createElement('h2');title.textContent='Edit card points';const intro=document.createElement('p');intro.textContent='Choose one of the five cards. Changes also affect the fight.';tabs=document.createElement('div');tabs.className='dbz-card-tabs';for(let i=0;i<5;i++)tabs.append(btn('Card '+(i+1),()=>{selected=i;refresh();}));const [attLine,attOut]=row('Attack','attack'),[defLine,defOut]=row('Defense','defense');attack=attOut;defense=defOut;const attrLine=document.createElement('div');attrLine.className='dbz-card-attribute';const attrLabel=document.createElement('label');attrLabel.textContent='Middle symbol';attribute=document.createElement('select');for(let n=1;n<=6;n++){const o=document.createElement('option');o.value=String(n);o.textContent=`${n} · ${attrs[n]}`;attribute.append(o);}attribute.onchange=()=>{draft[selected].attribute=Number(attribute.value);};attrLine.append(attrLabel,attribute);const actions=document.createElement('div');actions.className='dbz-card-actions';const hint=document.createElement('p');hint.className='dbz-card-hint';hint.textContent='Works while walking or fighting. Your choice also applies when the next cards appear.';actions.append(btn('Save this card',()=>save(false)),btn('Apply to all 5',()=>save(true)),btn('Original values',reset),btn('Back to game',close));dialog.append(title,intro,tabs,attLine,defLine,attrLine,actions,hint);document.body.append(dialog);dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 setInterval(()=>{if(!api.active()||!dialog.hidden||!values.some(v=>v.attack||v.defense||v.attribute))return;try{apply();}catch{}},150);
}
function draw(ctx,pixels,width,height){if(!values.some(v=>v.attack||v.defense||v.attribute))return;const p=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),beige=(x,y)=>{const c=p[y*256+x];return(c&255)>210&&((c>>>8)&255)>170&&((c>>>16)&255)>110};ctx.save();ctx.scale(width/256,height/240);ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<5;i++){const x=80+i*32,v=values[i];if(!v.attack&&!v.defense&&!v.attribute)continue;let count=0;for(let y=194;y<207;y++)for(let xx=x+9;xx<x+23;xx++)count+=beige(xx,y)?1:0;if(count<40)continue;const current=lastSeen[i];const a=v.attack??current.attack,d=v.defense??current.defense,m=v.attribute??current.attribute;
  if(a){ctx.fillStyle='#ff8170';ctx.beginPath();ctx.arc(x+9,187,6.9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1b1016';ctx.font='bold 9px Arial';ctx.fillText(a===8?'Z':String(a),x+9,187.2);}
  if(d){ctx.fillStyle='#ff8170';ctx.beginPath();ctx.arc(x+24,215,6.9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1b1016';ctx.font='bold 9px Arial';ctx.fillText(d===8?'Z':String(d),x+24,215.2);}
  if(m){ctx.fillStyle='#f7d8a5';ctx.fillRect(x+9,193,15,15);ctx.fillStyle='#171016';ctx.font='bold 13px serif';ctx.fillText(attrs[m],x+16.5,200.7);}
 }ctx.restore();}
window.DreamCards={ROM,start,open,reset:()=>{lastSeen=empty();lastNative=empty();},draw,inspect:()=>({values:values.map(v=>({...v})),active:!!api})};
})();
