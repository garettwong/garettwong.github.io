/* DBZ2 All Skills v7: character folders, native targeting, guarded save-state writes. */
(()=>{
 const names=['Energy Wave','Demon Flash','Dodon Ray','Mouth Energy Wave','Energy Barrage','Energy Disc','Explosive Demon Flash','Masenko','Kamehameha','Solar Flare','Scatter Shot','Spirit Ball','Crusher Ball','Kaio-ken','Kaio-ken Kamehameha','Kaio-ken ×3','Kaio-ken ×3 Kamehameha','Kaio-ken ×10','Kaio-ken ×10 Kamehameha','Kaio-ken ×20 Kamehameha','Galick Gun','Speed Attack','Spirit Bomb','Super Spirit Bomb','Mouth Beam','Eraser Gun','Special Beam Cannon','Scatter Energy Wave','Tri-Beam','Four-Body Technique','Four-Body Tri-Beam','Psychic Power','Time Stop','Body Change','Explosive Wave'];
 const folders=[['Goku',[0,8,13,14,15,16,17,18,19,22,23]],['Piccolo',[1,4,6,24,26]],['Gohan',[0,7]],['Krillin',[8,10,27,9]],['Yamcha',[8,11]],['Tien',[0,28,29,30,9]],['Chiaotzu',[2,31]],['Vegeta',[0,4,34,20]],['Frieza',[0,5,34]],['Captain Ginyu',[0,5,34,33]],['Jeice',[0,12]],['Burter',[0,21]],['Recoome',[0,4,25]],['Guldo',[0,32]],['Nail',[0]],['Frieza’s soldiers',[0,3]]];
 const actors={1:'Goku',2:'Piccolo',3:'Gohan',4:'Krillin',5:'Yamcha',6:'Tien',7:'Chiaotzu',8:'Nail',9:'Vegeta',36:'Frieza',42:'Vegeta'};
 let api=null,dialog=null,body=null,title=null,back=null,saved=null,slot=-1,suppressed=false,lastPhase=-1,busy=false,focusBefore=null;
 const inspect=()=>{const state=api.gm().getState(),offset=api.ramStart(state);if(offset<0)throw Error('Cannot read this game state.');return {state:new Uint8Array(state),offset,ram:state.subarray(offset,offset+2048)};};
 const eligible=ram=>ram[0x2e]===1&&[6,7].includes(ram[0x30])&&ram[0x9a]<162&&ram[0x9a]%18===0&&ram[0x200+ram[0x9a]]<64;
 const button=(label,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=fn;return el;};
 const close=(resume=true)=>{if(!dialog||dialog.hidden)return;dialog.hidden=true;saved=null;suppressed=true;if(resume)api.resume();focusBefore?.focus();};
 const root=()=>{title.textContent=`${actors[saved.ram[0x200+slot]&63]||'Fighter'} · Choose a character’s skills`;back.hidden=true;body.replaceChildren();for(const [name,moves] of folders)body.append(button(`${name}  ›`,()=>branch(name,moves)));};
 const branch=(name,moves)=>{title.textContent=name+' · Super skills';back.hidden=false;body.replaceChildren();for(const id of moves){const el=button(names[id]+(id===33?' — swaps bodies':''),()=>select(id));el.dataset.skill=String(id);body.append(el);}body.scrollTop=0;};
 const select=async id=>{
  if(busy||!saved||!Number.isInteger(id)||id<0||id>=names.length)return;
  busy=true;
  try{
   const current=inspect();if(!eligible(current.ram)||current.ram[0x9a]!==slot)throw Error('The battle has moved on. Open All Skills again.');
   const bytes=current.state,r=bytes.subarray(current.offset,current.offset+2048);
   const target=Array.from({length:5},(_,j)=>j).find(j=>r[0x2a2+j*18]<64);
   if(target===undefined)throw Error('There is no active enemy to target.');
   // Mirror the original skill-confirm routine and enter native target selection.
   r[0x210+slot]=0xc0+id;r[0x70]=target;r[0x6d]|=16;r[0x99]=2;r[0x30]=8;r[0x31]=128;r[0x13b]=2;r[0x144]=2;
   await Promise.resolve(api.gm().loadState(bytes));api.resetFrame();
   close();api.status(`${names[id]} selected. Choose your target and press A.`);
  }catch(error){api.status(error.message);close();}finally{busy=false;}
 };
 const open=()=>{
  if(!api||!dialog.hidden)return;
  try{
   api.release();const info=inspect();
   if(!eligible(info.ram)){api.status('Choose a fighter and battle card first. Open All Skills when choosing the attack.');return;}
   api.pause();saved=inspect();slot=saved.ram[0x9a];focusBefore=document.activeElement;root();dialog.hidden=false;body.querySelector('button')?.focus();
  }catch(error){api.status(error.message);api.resume();}
 };
 const start=options=>{
  if(api)return;api=options;
  dialog=document.createElement('section');dialog.id='dbz-skills';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','dbz-skills-title');
  const header=document.createElement('header');back=button('‹ Characters',root);title=document.createElement('h2');title.id='dbz-skills-title';header.append(back,title,button('Back to game',()=>close()));
  const hint=document.createElement('p');hint.textContent='Choose a character folder, then a super skill. Your current fighter will use it.';body=document.createElement('div');body.className='dbz-skill-list';dialog.append(header,hint,body);document.body.append(dialog);
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const items=[...dialog.querySelectorAll('button')].filter(x=>!x.hidden),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  setInterval(()=>{if(!api.active()||!dialog.hidden)return;try{const {ram}=inspect(),phase=ram[0x2e]*256+ram[0x30];if(phase!==lastPhase){lastPhase=phase;suppressed=false;}if(eligible(ram)&&ram[0x30]===7&&!suppressed)open();}catch{/* Loading a state may briefly make snapshots unavailable. */}},250);
 };
 window.DreamSkills={start,open,reset:()=>{close(false);suppressed=false;lastPhase=-1;},catalog:folders.map(([name,moves])=>({name,moves:moves.map(id=>({id,name:names[id]}))}))};
})();
