/* DBZ2 All Skills v9: character folders, native targeting, guarded save-state writes. */
(()=>{
 const names=['Energy Wave','Demon Flash','Dodon Ray','Mouth Energy Wave','Energy Barrage','Super Energy Wave','Explosive Demon Flash','Masenko','Kamehameha','Solar Flare','Destructo Disc','Spirit Ball','Crusher Ball','Kaio-ken','Kaio-ken Kamehameha','Kaio-ken ×3','Kaio-ken ×3 Kamehameha','Kaio-ken ×10','Kaio-ken ×10 Kamehameha','Kaio-ken ×20 Kamehameha','Galick Gun','Speed Attack','Spirit Bomb','Super Spirit Bomb','Mouth Beam','Eraser Gun','Special Beam Cannon','Scatter Energy Wave','Tri-Beam','Four-Body Technique','Four-Body Tri-Beam','Psychic Power','Time Stop','Body Change','Explosive Wave'];
 const hkMoves=['氣功波','魔光炮','洞洞波','口部氣功波','連續氣功波','超級氣功波','爆裂魔光炮','魔閃光','龜波氣功','太陽拳','氣元斬','操氣彈','殛光球','界王拳','界王拳龜波氣功','三倍界王拳','三倍界王拳龜波氣功','十倍界王拳','十倍界王拳龜波氣功','二十倍界王拳龜波氣功','沖天炮','高速攻擊','元氣彈','超級元氣彈','口部光線','力高破壞炮','魔貫光殺炮','擴散氣功波','氣功炮','四身之拳','四身氣功炮','超能力','時間停止','身體交換','爆發波'];
 const hkActors={'Goku':'孫悟空','Piccolo':'魔童','Gohan':'孫悟飯','Krillin':'無限','Yamcha':'阿樂','Tien':'天津飯','Chiaotzu':'餃子','Vegeta':'比達','Frieza':'菲利','Captain Ginyu':'傑紐','Jeice':'捷斯','Burter':'畢特','Recoome':'力高','Guldo':'古杜','Nail':'尼爾','Frieza’s soldiers':'菲利軍團士兵'};
 let english=false;
 const characterLabel=name=>english?name:`${hkActors[name]||name} · ${name}`;
 const moveLabel=id=>english?names[id]:`${hkMoves[id]} · ${names[id]}`;
 const folders=[['Frieza',[0,5,34]],['Vegeta',[0,4,34,20]],['Goku',[0,8,13,14,15,16,17,18,19,22,23]],['Piccolo',[1,4,6,24,26]],['Gohan',[0,7]],['Krillin',[8,10,27,9]],['Yamcha',[8,11]],['Tien',[0,28,29,30,9]],['Chiaotzu',[2,31]],['Captain Ginyu',[0,5,34,33]],['Jeice',[0,12]],['Burter',[0,21]],['Recoome',[0,4,25]],['Guldo',[0,32]],['Nail',[0]],['Frieza’s soldiers',[0,3]]];
 const actors={1:'Goku',2:'Piccolo',3:'Gohan',4:'Krillin',5:'Yamcha',6:'Tien',7:'Chiaotzu',8:'Nail',9:'Vegeta',36:'Frieza',42:'Vegeta'};
 let api=null,dialog=null,body=null,title=null,back=null,saved=null,slot=-1,suppressed=false,lastPhase=-1,busy=false,focusBefore=null,notice=null,launcher=null,stateSequence=0;
 const inspect=()=>{const state=new Uint8Array(api.gm().getState()),offset=api.ramStart(state);if(offset<0)throw Error('Cannot read this game state.');return {state,offset,ram:state.subarray(offset,offset+2048)};};
 const eligible=ram=>ram[0x2e]===1&&[6,7].includes(ram[0x30])&&ram[0x9a]<162&&ram[0x9a]%18===0&&ram[0x200+ram[0x9a]]<64;
 const button=(label,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=fn;return el;};
 const close=(resume=true)=>{if(!dialog||dialog.hidden)return;dialog.hidden=true;saved=null;suppressed=true;if(resume)api.resume();focusBefore?.focus();};
 const root=()=>{title.textContent=`${characterLabel(actors[saved.ram[0x200+slot]&63]||(english?'Fighter':'戰士'))} · ${english?'Choose skills':'選擇角色招式'}`;back.hidden=true;body.replaceChildren();for(const [name,moves] of folders)body.append(button(`${characterLabel(name)}  ›`,()=>branch(name,moves)));};
 const branch=(name,moves)=>{notice.textContent='';title.textContent=characterLabel(name)+(english?' · Super skills':' · 必殺技');back.hidden=false;body.replaceChildren();for(const id of moves){const el=button(moveLabel(id)+(id===33?(english?' (swap bodies)':'（交換雙方身體）'):''),()=>select(id));el.dataset.skill=String(id);body.append(el);}body.scrollTop=0;};
 const waitFrame=()=>new Promise(resolve=>setTimeout(resolve,8));
 const waitUntil=async(test,timeout=5000)=>{const until=performance.now()+timeout;while(performance.now()<until){if(test())return true;await waitFrame();}return false;};
 // EmulatorJS loadState() reuses game.state and schedules an uncancelled
 // deletion five seconds later. An earlier load can delete a newer pending one.
 const queueState=(gm,state)=>{
  if(!gm.FS||!gm.functions?.loadState){gm.loadState(state);return ()=>{};}
  const name=`dbz-skill-${++stateSequence}.state`,path='/'+name;
  gm.FS.writeFile(path,state);try{gm.functions.loadState(name,0);}catch(error){gm.FS.unlink(path);throw error;}
  return ()=>{try{gm.FS.unlink(path);}catch{/* Already consumed or removed. */}};
 };
 const setBusy=value=>{busy=value;for(const el of dialog.querySelectorAll('button'))el.disabled=value;};
 const confirmNative=async(current,id,gm,cleanups)=>{
  const native=api.nativeConfirmation,actor=current.ram[0x200+slot];
  current.ram[0x6f]=0;current.ram[0x71]=0;native.queue(current.state,slot,id);
  const loadedFrame=gm.getFrameNum();cleanups.push(queueState(gm,current.state));api.resume();
  const ready=await waitUntil(()=>{const check=inspect();return gm.getFrameNum()>loadedFrame&&eligible(check.ram)&&check.ram[0x9a]===slot&&native.pending(check.state,slot,id);});
  api.pause();if(!ready)throw Error('The attack menu is not ready. Tap the skill again to retry.');
  api.resume();gm.simulateInput(0,8,1);let pressed=true,pulseFrame=gm.getFrameNum(),confirmed=false;
  const deadline=performance.now()+10000;
  while(performance.now()<deadline){
   await waitFrame();const live=inspect();
   // One remaining enemy and group moves auto-confirm within a single frame.
   // The original fighter's consumed command is the durable confirmation.
   if(native.consumed(live.state,slot,id)&&live.ram[0x200+slot]===actor&&live.ram[0x210+slot]===192+id){confirmed=true;break;}
   if(live.ram[0x2e]!==1||live.ram[0x9a]!==slot)throw Error('The battle changed before the skill was confirmed.');
   if(gm.getFrameNum()-pulseFrame>=2){pressed=!pressed;gm.simulateInput(0,8,pressed?1:0);pulseFrame=gm.getFrameNum();}
  }
  gm.simulateInput(0,8,0);if(!confirmed)throw Error('The game did not confirm the command. Tap the skill again to retry.');
  const releaseFrame=gm.getFrameNum();
  if(!await waitUntil(()=>gm.getFrameNum()-releaseFrame>=2))throw Error('The game is not advancing. Tap the skill again to retry.');
  api.pause();const final=inspect();
  if(!native.consumed(final.state,slot,id)||final.ram[0x200+slot]!==actor||final.ram[0x210+slot]!==192+id)throw Error('The chosen skill could not be applied. Tap it again to retry.');
 };
 const select=async id=>{
  if(busy||!saved||!Number.isInteger(id)||id<0||id>=names.length)return;
  setBusy(true);notice.textContent=english?'Confirming your skill…':'正在確認招式…';let endConfirmation=null,rollback=null;const cleanups=[];
  try{
   const current=inspect();if(!eligible(current.ram)||current.ram[0x9a]!==slot)throw Error('The battle has moved on. Open All Skills again.');
   rollback=current.state.slice();const gm=api.gm();if(typeof gm.simulateInput!=='function')throw Error('Native confirmation input is unavailable.');
   // Use a single-target native command as the graphics/setup handshake.
   // The cursor can still point at Defend or a group move from an earlier
   // selection; those legitimately skip phase8 and advance the fighter.
   // Normalize only the cursor, then let the original game set up its CHR
   // banks and target UI. Never jump the native phase to manufacture it.
   api.release();endConfirmation=api.beginConfirmation?.();
   gm.simulateInput(0,8,0);
   if(api.nativeConfirmation){
    await confirmNative(current,id,gm,cleanups);api.resetFrame();rollback=null;
    endConfirmation?.();endConfirmation=null;close();
    api.status(english?`${names[id]} selected. ${inspect().ram[0x30]===8?'Choose a target, then press A.':'Continue choosing your battle commands.'}`:`已選擇「${hkMoves[id]}」。${inspect().ram[0x30]===8?'請選擇目標，然後按 A。':'請繼續選擇戰鬥指令。'}`);
    return;
   }
   if(current.ram[0x6f]!==0||current.ram[0x71]!==0){
    current.ram[0x6f]=0;current.ram[0x71]=0;
    const frame=gm.getFrameNum();cleanups.push(queueState(gm,current.state));api.resume();
    const ready=await waitUntil(()=>{const r=inspect().ram;return gm.getFrameNum()>frame&&eligible(r)&&r[0x9a]===slot&&r[0x6f]===0&&r[0x71]===0;});
    api.pause();if(!ready)throw Error('The attack menu is not ready. Tap the skill again to retry.');
   }
   api.resume();let pressed=true;
   gm.simulateInput(0,8,1);
   const deadline=performance.now()+10000;let pulseFrame=gm.getFrameNum(),confirmed=false;
   while(performance.now()<deadline){
    await waitFrame();const live=inspect(),next=live.ram[0x30];
    if(live.ram[0x2e]!==1||live.ram[0x9a]!==slot)throw Error('The battle changed during confirmation.');
    if(next===8){
     gm.simulateInput(0,8,0);
     // A press/release must be consumed by the emulator, even on a slow phone.
     const frame=gm.getFrameNum();
     if(!await waitUntil(()=>gm.getFrameNum()-frame>=2))throw Error('The game is not advancing. Tap the skill again to retry.');
     api.pause();if(inspect().ram[0x30]!==8)throw Error('Target selection moved on. Tap the skill again to retry.');
     confirmed=true;break;
    }
    if(gm.getFrameNum()-pulseFrame>=2){pressed=!pressed;gm.simulateInput(0,8,pressed?1:0);pulseFrame=gm.getFrameNum();}
   }
   gm.simulateInput(0,8,0);if(!confirmed)throw Error('The game did not confirm the command. Tap the skill again to retry.');
   const native=inspect();native.ram[0x210+slot]=0xc0+id;native.ram[0x6d]|=16;
   const beforeLoad=gm.getFrameNum();cleanups.push(queueState(gm,native.state));api.resume();
   // EmulatorJS queues state loads; verify the native result before restoring turbo.
   // Group attacks can auto-confirm their targets immediately after the load.
   // Verify the chosen fighter's command, not a transient targeting phase.
   const applied=await waitUntil(()=>{const check=inspect().ram;return gm.getFrameNum()>beforeLoad&&check[0x2e]===1&&check[0x200+slot]===native.ram[0x200+slot]&&check[0x210+slot]===0xc0+id;});
   api.pause();if(!applied)throw Error('The chosen skill could not be applied. Tap it again to retry.');api.resetFrame();rollback=null;
   endConfirmation?.();endConfirmation=null;close();api.status(english?`${names[id]} selected. ${inspect().ram[0x30]===8?'Choose a target, then press A.':'Continue choosing your battle commands.'}`:`已選擇「${hkMoves[id]}」。${inspect().ram[0x30]===8?'請選擇目標，然後按 A。':'請繼續選擇戰鬥指令。'}`);
  }catch(error){
   api.pause();const gm=api.gm();gm?.simulateInput?.(0,8,0);
   if(rollback){
    const original=rollback.subarray(api.ramStart(rollback)),before=gm.getFrameNum();
    cleanups.push(queueState(gm,rollback));api.resume();
    await waitUntil(()=>{const r=inspect().ram;return gm.getFrameNum()>before&&eligible(r)&&r[0x9a]===original[0x9a]&&r[0x30]===original[0x30];});
    api.pause();saved=inspect();
   }
   endConfirmation?.();endConfirmation=null;
   // Keep the user's selected character folder open; only Back to game dismisses it.
   notice.textContent=error.message;api.status(error.message);
  }finally{endConfirmation?.();for(const cleanup of cleanups)cleanup();setBusy(false);}

 };
 const open=()=>{
  if(!api||!dialog.hidden||busy)return;
  try{
   api.release();const info=inspect();
   if(!eligible(info.ram)){api.status(english?'Choose a fighter and battle card first, then open All Skills when choosing an attack.':'請先選擇戰士及戰鬥卡，在選擇攻擊時開啟「全部招式」。');return;}
   api.pause();saved=inspect();slot=saved.ram[0x9a];focusBefore=document.activeElement;notice.textContent='';root();dialog.hidden=false;body.querySelector('button')?.focus();
  }catch(error){api.status(error.message);api.resume();}
 };
 const start=options=>{
  if(api)return;api=options;english=!!options.english;
  dialog=document.createElement('section');dialog.id='dbz-skills';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','dbz-skills-title');
  const header=document.createElement('header');back=button(english?'‹ Characters':'‹ 角色目錄',root);title=document.createElement('h2');title.id='dbz-skills-title';header.append(back,title,button(english?'Back to game':'返回遊戲',()=>{if(!busy)close();}));
  const hint=document.createElement('p');hint.textContent=english?'Choose a character folder, then a super skill. Your current fighter will use it.':'先選擇角色目錄，再選擇必殺技；目前的戰士便會使用該招式。';body=document.createElement('div');body.className='dbz-skill-list';notice=document.createElement('p');notice.setAttribute('role','status');notice.className='dbz-skill-notice';dialog.append(header,hint,notice,body);document.body.append(dialog);
  launcher=button(english?'ALL SKILLS':'全部招式',open);launcher.id='dbz-skills-open';launcher.hidden=true;const row=document.getElementById?.('special-row');if(row)row.append(launcher);
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(!busy)close();}if(event.key==='Tab'){const items=[...dialog.querySelectorAll('button')].filter(x=>!x.hidden),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  setInterval(()=>{if(!api.active()){launcher.hidden=true;return;}if(!dialog.hidden||busy)return;try{const {ram}=inspect(),phase=`${ram[0x2e]}:${ram[0x30]}:${ram[0x9a]}`;launcher.hidden=!eligible(ram);if(phase!==lastPhase){lastPhase=phase;suppressed=false;}if(eligible(ram)&&ram[0x30]===7&&!suppressed)open();}catch{/* Loading a state may briefly make snapshots unavailable. */}},100);
 };
 window.DreamSkills={start,open,reset:()=>{close(false);suppressed=false;lastPhase=-1;},catalog:folders.map(([name,moves])=>({name,label:characterLabel(name),moves:moves.map(id=>({id,name:names[id],label:moveLabel(id)}))}))};
})();
