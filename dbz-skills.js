/* DBZ2 All Skills v7: character folders, native targeting, guarded save-state writes. */
(()=>{
 const names=['Energy Wave','Demon Flash','Dodon Ray','Mouth Energy Wave','Energy Barrage','Super Energy Wave','Explosive Demon Flash','Masenko','Kamehameha','Solar Flare','Destructo Disc','Spirit Ball','Crusher Ball','Kaio-ken','Kaio-ken Kamehameha','Kaio-ken ×3','Kaio-ken ×3 Kamehameha','Kaio-ken ×10','Kaio-ken ×10 Kamehameha','Kaio-ken ×20 Kamehameha','Galick Gun','Speed Attack','Spirit Bomb','Super Spirit Bomb','Mouth Beam','Eraser Gun','Special Beam Cannon','Scatter Energy Wave','Tri-Beam','Four-Body Technique','Four-Body Tri-Beam','Psychic Power','Time Stop','Body Change','Explosive Wave'];
 const hkMoves=['氣功波','魔光炮','洞洞波','口部氣功波','連續氣功波','超級氣功波','爆裂魔光炮','魔閃光','龜波氣功','太陽拳','氣元斬','操氣彈','殛光球','界王拳','界王拳龜波氣功','三倍界王拳','三倍界王拳龜波氣功','十倍界王拳','十倍界王拳龜波氣功','二十倍界王拳龜波氣功','沖天炮','高速攻擊','元氣彈','超級元氣彈','口部光線','力高破壞炮','魔貫光殺炮','擴散氣功波','氣功炮','四身之拳','四身氣功炮','超能力','時間停止','身體交換','爆發波'];
 const hkActors={'Goku':'孫悟空','Piccolo':'魔童','Gohan':'孫悟飯','Krillin':'無限','Yamcha':'阿樂','Tien':'天津飯','Chiaotzu':'餃子','Vegeta':'比達','Frieza':'菲利','Captain Ginyu':'傑紐','Jeice':'捷斯','Burter':'畢特','Recoome':'力高','Guldo':'古杜','Nail':'尼爾','Frieza’s soldiers':'菲利軍團士兵'};
 const characterLabel=name=>`${hkActors[name]||name} · ${name}`;
 const moveLabel=id=>`${hkMoves[id]} · ${names[id]}`;
 const folders=[['Goku',[0,8,13,14,15,16,17,18,19,22,23]],['Piccolo',[1,4,6,24,26]],['Gohan',[0,7]],['Krillin',[8,10,27,9]],['Yamcha',[8,11]],['Tien',[0,28,29,30,9]],['Chiaotzu',[2,31]],['Vegeta',[0,4,34,20]],['Frieza',[0,5,34]],['Captain Ginyu',[0,5,34,33]],['Jeice',[0,12]],['Burter',[0,21]],['Recoome',[0,4,25]],['Guldo',[0,32]],['Nail',[0]],['Frieza’s soldiers',[0,3]]];
 const actors={1:'Goku',2:'Piccolo',3:'Gohan',4:'Krillin',5:'Yamcha',6:'Tien',7:'Chiaotzu',8:'Nail',9:'Vegeta',36:'Frieza',42:'Vegeta'};
 let api=null,dialog=null,body=null,title=null,back=null,saved=null,slot=-1,suppressed=false,lastPhase=-1,busy=false,focusBefore=null;
 const inspect=()=>{const state=api.gm().getState(),offset=api.ramStart(state);if(offset<0)throw Error('Cannot read this game state.');return {state:new Uint8Array(state),offset,ram:state.subarray(offset,offset+2048)};};
 const eligible=ram=>ram[0x2e]===1&&[6,7].includes(ram[0x30])&&ram[0x9a]<162&&ram[0x9a]%18===0&&ram[0x200+ram[0x9a]]<64;
 const button=(label,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=fn;return el;};
 const close=(resume=true)=>{if(!dialog||dialog.hidden)return;dialog.hidden=true;saved=null;suppressed=true;if(resume)api.resume();focusBefore?.focus();};
 const root=()=>{title.textContent=`${characterLabel(actors[saved.ram[0x200+slot]&63]||'戰士')} · 選擇角色招式`;back.hidden=true;body.replaceChildren();for(const [name,moves] of folders)body.append(button(`${characterLabel(name)}  ›`,()=>branch(name,moves)));};
 const branch=(name,moves)=>{title.textContent=characterLabel(name)+' · 必殺技';back.hidden=false;body.replaceChildren();for(const id of moves){const el=button(moveLabel(id)+(id===33?'（交換雙方身體）':''),()=>select(id));el.dataset.skill=String(id);body.append(el);}body.scrollTop=0;};
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
   close();api.status(`已選擇「${hkMoves[id]}」。請選擇目標，然後按 A。`);
  }catch(error){api.status(error.message);close();}finally{busy=false;}
 };
 const open=()=>{
  if(!api||!dialog.hidden)return;
  try{
   api.release();const info=inspect();
   if(!eligible(info.ram)){api.status('請先選擇戰士及戰鬥卡，在選擇攻擊時開啟「全部招式」。');return;}
   api.pause();saved=inspect();slot=saved.ram[0x9a];focusBefore=document.activeElement;root();dialog.hidden=false;body.querySelector('button')?.focus();
  }catch(error){api.status(error.message);api.resume();}
 };
 const start=options=>{
  if(api)return;api=options;
  dialog=document.createElement('section');dialog.id='dbz-skills';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','dbz-skills-title');
  const header=document.createElement('header');back=button('‹ 角色目錄',root);title=document.createElement('h2');title.id='dbz-skills-title';header.append(back,title,button('返回遊戲',()=>close()));
  const hint=document.createElement('p');hint.textContent='先選擇角色目錄，再選擇必殺技；目前的戰士便會使用該招式。';body=document.createElement('div');body.className='dbz-skill-list';dialog.append(header,hint,body);document.body.append(dialog);
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const items=[...dialog.querySelectorAll('button')].filter(x=>!x.hidden),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  setInterval(()=>{if(!api.active()||!dialog.hidden)return;try{const {ram}=inspect(),phase=ram[0x2e]*256+ram[0x30];if(phase!==lastPhase){lastPhase=phase;suppressed=false;}if(eligible(ram)&&ram[0x30]===7&&!suppressed)open();}catch{/* Loading a state may briefly make snapshots unavailable. */}},250);
 };
 window.DreamSkills={start,open,reset:()=>{close(false);suppressed=false;lastPhase=-1;},catalog:folders.map(([name,moves])=>({name,label:characterLabel(name),moves:moves.map(id=>({id,name:names[id],label:moveLabel(id)}))}))};
})();
