/* DBZ2 All Skills v7: character folders, native targeting, guarded save-state writes. */
(()=>{
 const names=['Energy Wave','Demon Flash','Dodon Ray','Mouth Energy Wave','Energy Barrage','Super Energy Wave','Explosive Demon Flash','Masenko','Kamehameha','Solar Flare','Destructo Disc','Spirit Ball','Crusher Ball','Kaio-ken','Kaio-ken Kamehameha','Kaio-ken ×3','Kaio-ken ×3 Kamehameha','Kaio-ken ×10','Kaio-ken ×10 Kamehameha','Kaio-ken ×20 Kamehameha','Galick Gun','Speed Attack','Spirit Bomb','Super Spirit Bomb','Mouth Beam','Eraser Gun','Special Beam Cannon','Scatter Energy Wave','Tri-Beam','Four-Body Technique','Four-Body Tri-Beam','Psychic Power','Time Stop','Body Change','Explosive Wave'];
 const hkMoves=['氣功波','魔光炮','洞洞波','口部氣功波','連續氣功波','超級氣功波','爆裂魔光炮','魔閃光','龜波氣功','太陽拳','氣元斬','操氣彈','殛光球','界王拳','界王拳龜波氣功','三倍界王拳','三倍界王拳龜波氣功','十倍界王拳','十倍界王拳龜波氣功','二十倍界王拳龜波氣功','沖天炮','高速攻擊','元氣彈','超級元氣彈','口部光線','力高破壞炮','魔貫光殺炮','擴散氣功波','氣功炮','四身之拳','四身氣功炮','超能力','時間停止','身體交換','爆發波'];
 const hkActors={'Goku':'孫悟空','Piccolo':'魔童','Gohan':'孫悟飯','Krillin':'無限','Yamcha':'阿樂','Tien':'天津飯','Chiaotzu':'餃子','Vegeta':'比達','Frieza':'菲利','Captain Ginyu':'傑紐','Jeice':'捷斯','Burter':'畢特','Recoome':'力高','Guldo':'古杜','Nail':'尼爾','Frieza’s soldiers':'菲利軍團士兵'};
 let english=false;
 const characterLabel=name=>english?name:`${hkActors[name]||name} · ${name}`;
 const moveLabel=id=>english?names[id]:`${hkMoves[id]} · ${names[id]}`;
 const folders=[['Frieza',[0,5,34]],['Vegeta',[0,4,34,20]],['Goku',[0,8,13,14,15,16,17,18,19,22,23]],['Piccolo',[1,4,6,24,26]],['Gohan',[0,7]],['Krillin',[8,10,27,9]],['Yamcha',[8,11]],['Tien',[0,28,29,30,9]],['Chiaotzu',[2,31]],['Captain Ginyu',[0,5,34,33]],['Jeice',[0,12]],['Burter',[0,21]],['Recoome',[0,4,25]],['Guldo',[0,32]],['Nail',[0]],['Frieza’s soldiers',[0,3]]];
 const actors={1:'Goku',2:'Piccolo',3:'Gohan',4:'Krillin',5:'Yamcha',6:'Tien',7:'Chiaotzu',8:'Nail',9:'Vegeta',36:'Frieza',42:'Vegeta'};
 let api=null,dialog=null,body=null,title=null,back=null,saved=null,slot=-1,suppressed=false,lastPhase=-1,busy=false,focusBefore=null;
 const inspect=()=>{const state=new Uint8Array(api.gm().getState()),offset=api.ramStart(state);if(offset<0)throw Error('Cannot read this game state.');return {state,offset,ram:state.subarray(offset,offset+2048)};};
 const eligible=ram=>ram[0x2e]===1&&[6,7].includes(ram[0x30])&&ram[0x9a]<162&&ram[0x9a]%18===0&&ram[0x200+ram[0x9a]]<64;
 const button=(label,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=fn;return el;};
 const close=(resume=true)=>{if(!dialog||dialog.hidden)return;dialog.hidden=true;saved=null;suppressed=true;if(resume)api.resume();focusBefore?.focus();};
 const root=()=>{title.textContent=`${characterLabel(actors[saved.ram[0x200+slot]&63]||(english?'Fighter':'戰士'))} · ${english?'Choose skills':'選擇角色招式'}`;back.hidden=true;body.replaceChildren();for(const [name,moves] of folders)body.append(button(`${characterLabel(name)}  ›`,()=>branch(name,moves)));};
 const branch=(name,moves)=>{title.textContent=characterLabel(name)+(english?' · Super skills':' · 必殺技');back.hidden=false;body.replaceChildren();for(const id of moves){const el=button(moveLabel(id)+(id===33?(english?' (swap bodies)':'（交換雙方身體）'):''),()=>select(id));el.dataset.skill=String(id);body.append(el);}body.scrollTop=0;};
 const select=async id=>{
  if(busy||!saved||!Number.isInteger(id)||id<0||id>=names.length)return;
  busy=true;
  try{
   const current=inspect();if(!eligible(current.ram)||current.ram[0x9a]!==slot)throw Error('The battle has moved on. Open All Skills again.');
   const gm=api.gm();if(typeof gm.simulateInput!=='function')throw Error('Native confirmation input is unavailable.');
   // Run the native command first: it restores the portrait CHR banks and
   // target UI. A RAM phase jump cannot perform that graphics setup.
   api.release();api.resume();let phase=current.ram[0x30],pressed=true,pulses=1;
   gm.simulateInput(0,8,1);
   const deadline=performance.now()+2000;let pulseAt=performance.now(),releasedAt=0,confirmed=false;
   while(performance.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,8));const live=inspect(),next=live.ram[0x30];
    if(live.ram[0x2e]!==1||live.ram[0x9a]!==slot)throw Error('The battle changed during confirmation.');
    if(next===8){gm.simulateInput(0,8,0);api.pause();confirmed=true;break;}
    if(pressed&&performance.now()-pulseAt>=30){gm.simulateInput(0,8,0);pressed=false;releasedAt=performance.now();}
    if(!pressed&&phase===6&&next===7&&pulses===1&&performance.now()-releasedAt>=40){phase=7;pulses++;gm.simulateInput(0,8,1);pressed=true;pulseAt=performance.now();}
   }
   gm.simulateInput(0,8,0);if(!confirmed){api.pause();await Promise.resolve(gm.loadState(current.state));throw Error('The native command could not be confirmed. Please choose a battle card and try again.');}
   const native=inspect();native.ram[0x210+slot]=0xc0+id;native.ram[0x6d]|=16;
   await Promise.resolve(gm.loadState(native.state));api.resetFrame();
   close();api.status(english?`${names[id]} selected. Choose a target, then press A.`:`已選擇「${hkMoves[id]}」。請選擇目標，然後按 A。`);
  }catch(error){api.gm()?.simulateInput?.(0,8,0);api.status(error.message);close();}finally{busy=false;}
 };
 const open=()=>{
  if(!api||!dialog.hidden)return;
  try{
   api.release();const info=inspect();
   if(!eligible(info.ram)){api.status(english?'Choose a fighter and battle card first, then open All Skills when choosing an attack.':'請先選擇戰士及戰鬥卡，在選擇攻擊時開啟「全部招式」。');return;}
   api.pause();saved=inspect();slot=saved.ram[0x9a];focusBefore=document.activeElement;root();dialog.hidden=false;body.querySelector('button')?.focus();
  }catch(error){api.status(error.message);api.resume();}
 };
 const start=options=>{
  if(api)return;api=options;english=!!options.english;
  dialog=document.createElement('section');dialog.id='dbz-skills';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','dbz-skills-title');
  const header=document.createElement('header');back=button(english?'‹ Characters':'‹ 角色目錄',root);title=document.createElement('h2');title.id='dbz-skills-title';header.append(back,title,button(english?'Back to game':'返回遊戲',()=>{if(!busy)close();}));
  const hint=document.createElement('p');hint.textContent=english?'Choose a character folder, then a super skill. Your current fighter will use it.':'先選擇角色目錄，再選擇必殺技；目前的戰士便會使用該招式。';body=document.createElement('div');body.className='dbz-skill-list';dialog.append(header,hint,body);document.body.append(dialog);
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(!busy)close();}if(event.key==='Tab'){const items=[...dialog.querySelectorAll('button')].filter(x=>!x.hidden),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  setInterval(()=>{if(!api.active()||!dialog.hidden)return;try{const {ram}=inspect(),phase=ram[0x2e]*256+ram[0x30];if(phase!==lastPhase){lastPhase=phase;suppressed=false;}if(eligible(ram)&&ram[0x30]===7&&!suppressed)open();}catch{/* Loading a state may briefly make snapshots unavailable. */}},250);
 };
 window.DreamSkills={start,open,reset:()=>{close(false);suppressed=false;lastPhase=-1;},catalog:folders.map(([name,moves])=>({name,label:characterLabel(name),moves:moves.map(id=>({id,name:names[id],label:moveLabel(id)}))}))};
})();
