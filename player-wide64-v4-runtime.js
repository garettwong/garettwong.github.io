/* Adapter pinned to the bundled EmulatorJS 4.2.3 API. */

(()=>{

 const origin=location.origin;
 const WIDE64_ID=window.DreamWide64.ROM,WIDE64_NAME="Wide64 NG+ v4 · New Super Saiyan art",WIDE64_RELEASE=168;

 const send=(type,extra={},transfer)=>parent.postMessage({channel:"nes-dream",type,...extra},origin,transfer||[]);

 let menuPaused=false,backgroundPaused=false,trainingPauseRequest=0;
 let loaded=false,engine=null,romUrl=null,started=false,selectedSpeed=1,specialBusy=false,specialMode="normal",specialPending=null;
 // iOS may suspend EmulatorJS audio after asynchronous startup. A real tap
 // carries the user activation needed to resume the AudioContext.
 const unlockMobileAudio=()=>{const audio=window.EJS_emulator?.Module?.AL?.currentCtx?.audioCtx;if(audio?.state==='suspended'){const resumed=audio.resume?.();resumed?.catch?.(()=>{});}};
 document.addEventListener('pointerdown',unlockMobileAudio,true);
 document.addEventListener('touchstart',unlockMobileAudio,{capture:true,passive:true});
 document.addEventListener('click',unlockMobileAudio,true);
 const specialGames={ [window.DreamWide64.ROM]:{name:"Dragon Ball Z II Wide64 v4",trick:"dbz-card-editor",english:true,enemyChoice:true,hundred:true,turbo:true,wide64:true} };
 let specialGame=null,zeldaEnabled=false;
 const specialButton=document.getElementById("special-button");
 const showSpecialMode=()=>{if(specialButton){specialButton.textContent=zeldaEnabled?"ZELDA TRICKS":specialGame?.trick==="dbz-card-editor"?"EDIT CARDS":specialGame?.trick==="dbz-skills"?(specialGame.english?"ALL SKILLS":"全部招式"):specialGame?.trick==="bullet-settings"?"SPECIAL · BULLETS":specialGame?.trick==="skill-upgrade"?"Open LIVE Power edition":specialPending?"SUPER · WAIT":specialMode==="unknown"?"SUPER · TOGGLE":`SUPER · ${specialMode==="high"?"ON":"OFF"}`;specialButton.setAttribute('aria-label',zeldaEnabled?'Zelda Tricks':specialGame?.trick==='dbz-card-editor'?'Edit card attack, defense and middle symbol':'Use this game special trick');}};
 // The browser core wraps its Nestopia state, unlike standalone Nestopia.
 // Find the NES RAM chunk instead of relying on a fixed save-state offset.
 // The final three internal RAM bytes are reserved for SUPER. Music owns $07FC.
 const superRamStart=state=>{if(!state||state.length<2200)return -1;let nestopia=-1;for(let i=0;i<Math.min(64,state.length-4);i++)if(state[i]===78&&state[i+1]===83&&state[i+2]===84&&state[i+3]===26){nestopia=i;break;}if(nestopia<0)return -1;for(let i=nestopia+8;i<Math.min(nestopia+512,state.length-2057);i++)if(state[i]===82&&state[i+1]===65&&state[i+2]===77&&state[i+3]===0&&state[i+4]===1&&state[i+5]===8&&state[i+6]===0&&state[i+7]===0)return i+9;return -1;};
 const readSuperMode=gm=>{try{const state=gm.getState(),start=superRamStart(state);return start<0?null:state[start+0x7fd]===165?"high":"normal";}catch{return null;}};
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const runSpecial=async()=>{
  if(!started||window.DreamEnemies?.isOpen()||(!specialGame&&!zeldaEnabled)||specialBusy||specialPending)return;
  if(zeldaEnabled){window.DreamZelda.open();return;}
  if(specialGame.trick==="dbz-card-editor"){try{await window.DreamWide64Training?.reset();window.DreamCards?.open();}catch(error){send("operation-error",{text:error.message||"Resume training before editing cards."});}return;}
  if(specialGame.trick==="dbz-skills"){window.DreamSkills?.open();return;}
  if(specialGame.trick==="bullet-settings"){send("special-settings");return;}
  if(specialGame.trick==="skill-upgrade"){document.getElementById("special-help-upgrade").hidden=false;return;}
  const gm=window.EJS_emulator?.gameManager;
  if(!gm?.getState||!gm?.setCheat||!gm?.resetCheat){send("operation-error",{text:"The game is not ready yet."});return;}
  specialBusy=true;specialButton?.classList.add("busy");
  try{
    window.DreamTouch?.releaseAll();
    const before=readSuperMode(gm);
    if(before===null)throw new Error("Cannot read SUPER state from this NES core.");
   const target=before==="high"?"normal":"high",code=target==="high"?"07FD:A5":"07FD:00";
   // Nestopia's raw RAM cheats apply on every emulated frame, including
   // cutscenes. Briefly mark the open stat panel dirty, then keep only mode.
   gm.resetCheat();
   gm.setCheat(0,true,code);
   gm.setCheat(1,true,"07FE:01");
   const frame=gm.getFrameNum?.();
   for(let i=0;i<20;i++){await delay(25);if(Number.isFinite(frame)&&gm.getFrameNum?.()-frame>=2)break;}
   gm.resetCheat();
   gm.setCheat(0,true,code);
   let after=readSuperMode(gm);
   for(let i=0;i<20&&after!==target;i++){await delay(25);after=readSuperMode(gm);}
   specialMode=after??"unknown";
   if(after!==target){specialPending=target;send("status",{text:"SUPER is ready and will apply when play resumes."});const watch=()=>{if(!specialPending)return;const current=readSuperMode(gm);if(current===target){specialMode=target;specialPending=null;showSpecialMode();send("status",{text:`Team super ability ${target==="high"?"ON":"OFF"}.`});}else setTimeout(watch,500);};setTimeout(watch,500);}
   else send("status",{text:`Team super ability ${target==="high"?"ON":"OFF"}.`});
  }catch(error){send("operation-error",{text:error.message||"Could not switch team ability."});}
  finally{specialBusy=false;specialButton?.classList.remove("busy");showSpecialMode();}
 };
 specialButton?.addEventListener("click",runSpecial);
 document.getElementById("special-help-upgrade-close")?.addEventListener("click",()=>{document.getElementById("special-help-upgrade").hidden=true;});
 document.getElementById("special-upgrade-open")?.addEventListener("click",()=>send("special-upgrade"));

 // Native uploads supply artwork pixels; do not force costly GPU buffer preservation.

 const fail=message=>{send("error",{text:message});const status=document.getElementById("status");if(status)status.textContent=message;};

 const thumbnailCanvas=()=>{
  if(engine&&window.DreamFrameSource?.pixels?.byteLength===256*240*4){const canvas=document.createElement("canvas"),frame=window.DreamFrameSource;canvas.width=256;canvas.height=240;canvas.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(frame.pixels),256,240),0,0);return canvas;}
  if(!window.EJS_emulator?.Module)return window.EJS_emulator?.canvas||null;
  return null;
 };
 const nativeThumbnail=async()=>{
  const gm=window.EJS_emulator?.gameManager;
  const canvas=thumbnailCanvas();if(canvas){const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob||blob.size>512*1024)return null;return new Uint8Array(await blob.arrayBuffer());}
  // The bundled native helper polls forever if its paused core never writes a file.
  // Bound that polling here so a missing preview cannot leave a timer running.
  if(gm?.functions?.screenshot&&gm.FS){try{gm.FS.unlink('/screenshot.png');}catch{}gm.functions.screenshot();const end=performance.now()+650;do{try{return gm.FS.readFile('/screenshot.png');}catch{}await new Promise(resolve=>setTimeout(resolve,50));}while(performance.now()<end);return null;}
  if(!gm?.screenshot)return null;const raw=await gm.screenshot(),bytes=raw instanceof Uint8Array?raw:new Uint8Array(raw);return bytes.byteLength&&bytes.byteLength<=512*1024?bytes:null;
 };
 const snapshot=async(reason,slot,requestId)=>{

  if(!started)return;

  try{await window.DreamWide64Training?.whenSettled();await window.DreamCards?.whenSettled();const rawState=window.EJS_emulator?.gameManager?.getState();const state=rawState&&window.DreamWide64Training?window.DreamWide64Training.sanitize(rawState):rawState;if(!state?.byteLength)throw new Error("No save data available yet");const bytes=state.buffer.slice(state.byteOffset,state.byteOffset+state.byteLength);let thumbnail=null;try{thumbnail=await Promise.race([nativeThumbnail(),new Promise(resolve=>setTimeout(()=>resolve(null),750))]);}catch{}const payload={reason,slot,requestId,bytes};const transfers=[bytes];if(thumbnail&&thumbnail.byteLength<=512*1024){payload.thumbnail=thumbnail.buffer.slice(thumbnail.byteOffset,thumbnail.byteOffset+thumbnail.byteLength);transfers.push(payload.thumbnail);}send("state",payload,transfers);}

  catch{send("operation-error",{text:"Could not save this state. Start the game and try again."});}

 };

 const screenShot=async()=>{try{if(!started)throw new Error('Start the game first.');const gm=window.EJS_emulator?.gameManager;if(!gm?.screenshot)throw new Error('Screenshot is not ready.');let raw;if(engine&&window.DreamFrameSource){const captured=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{window.DreamFrameSource.captureCanvasOnce=null;reject(new Error("Screenshot timed out. Resume the game and try P again."));},2000);window.DreamFrameSource.captureCanvasOnce=value=>{clearTimeout(timeout);resolve(value);};});const canvas=document.createElement("canvas");canvas.width=captured.width;canvas.height=captured.height;const context=canvas.getContext("2d");context.putImageData(new ImageData(captured.pixels,captured.width,captured.height),0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));raw=new Uint8Array(await blob.arrayBuffer());}else raw=await gm.screenshot();let bytes=raw instanceof Uint8Array?raw:new Uint8Array(raw);if(engine?.overlay&&getComputedStyle(engine.overlay).display!=="none"){const bitmap=await createImageBitmap(new Blob([bytes],{type:"image/png"}));const out=document.createElement("canvas");out.width=Math.max(bitmap.width,engine.overlay.width);out.height=Math.max(bitmap.height,engine.overlay.height);const ctx=out.getContext("2d");ctx.drawImage(bitmap,0,0,out.width,out.height);ctx.drawImage(engine.overlay,0,0,out.width,out.height);bitmap.close();const blob=await new Promise(resolve=>out.toBlob(resolve,"image/png"));bytes=new Uint8Array(await blob.arrayBuffer());}const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);send("screenshot",{bytes:buffer},[buffer]);}catch(error){send("operation-error",{text:error.message||"Could not take a screenshot."});}};
 const editable=target=>!!target?.closest?.('input,textarea,[contenteditable="true"]');
 // Game-wide selection and core keyboard handlers must not own form input.
 for(const type of ['selectstart','contextmenu','dragstart'])addEventListener(type,event=>{if(!editable(event.target))event.preventDefault();});
 addEventListener('selectionchange',()=>{if(editable(document.activeElement))return;const selection=window.getSelection?.();if(selection?.rangeCount)selection.removeAllRanges();});
 for(const type of ['keydown','keyup','keypress'])addEventListener(type,event=>{
  if(!event.target?.closest?.('#dbz-card-editor input')||event.key==='Escape')return;
  event.stopImmediatePropagation();
  if(type==='keydown'&&event.key==='Enter'){event.preventDefault();event.target.blur();}
 },true);
 for(const button of document.querySelectorAll?.('[data-action]')||[])button.addEventListener('click',()=>{if(button.dataset.action==='screenshot')screenShot();else if(started)send('save-menu');});


 let speedRequest=0,directionHeld=false,directionTimer=null,confirmationLocks=0;
 const beginConfirmation=()=>{confirmationLocks++;++speedRequest;const e=window.EJS_emulator;e.gameManager.toggleFastForward(0);e.isFastForward=false;return ()=>{confirmationLocks=Math.max(0,confirmationLocks-1);};};
 const applySpeed=async value=>{const request=++speedRequest,emulator=window.EJS_emulator,gm=emulator?.gameManager;if(!gm)throw new Error("The game is not ready yet.");selectedSpeed=value;gm.toggleSlowMotion(0);emulator.isSlowMotion=false;gm.toggleFastForward(0);emulator.isFastForward=false;gm.setFastForwardRatio(value);send("speed",{value});if(value>1){await new Promise(resolve=>setTimeout(resolve,34));if(request!==speedRequest||menuPaused||backgroundPaused||emulator.paused||confirmationLocks||directionHeld||directionTimer!==null)return;emulator.isFastForward=true;gm.toggleFastForward(1);}};
 // Switch before asserting the direction in the native core. This prevents a
 // brief physical press being interpreted as a long hold during fast-forward.
 const guardDirection=down=>{directionHeld=down;if(directionTimer!==null){clearTimeout(directionTimer);directionTimer=null;}const emulator=window.EJS_emulator,gm=emulator?.gameManager;if(!gm)return;if(down){++speedRequest;gm.toggleFastForward(0);emulator.isFastForward=false;}else{directionTimer=setTimeout(()=>{directionTimer=null;void applySpeed(selectedSpeed).catch(()=>{});},150);}};
 // The core must process one normal frame before re-enabling a changed ratio.
 const resumeGame=(allowChoice=false)=>{if(!allowChoice&&window.DreamEnemies?.isOpen())return;window.EJS_emulator?.play?.();void applySpeed(selectedSpeed).catch(()=>{});};

 addEventListener("error",event=>{if(!loaded)return;console.error("Player error",event.message);send("error",{text:"The player encountered an error. Return to your library and reopen the game."});});

 addEventListener("message",async event=>{

  if(event.origin!==origin||event.source!==parent||event.data?.channel!=="nes-dream")return;

  const d=event.data;

  if(d.type==="wide64-panel"){if(started)window.DreamWide64Panel.open();return;}
  if(d.type==="touch-settings"){const rates=d.rates?window.DreamTouch?.settings(d.rates):window.DreamTouch?.getSettings();send("touch-settings",{rates});return;}
  if(d.type==="zelda-tricks"){if(started&&zeldaEnabled)window.DreamZelda.open();return;}
  if(d.type==="power-info"){send("power-info",window.EJS_emulator?.gameManager?.getPowerInfo?.()||{});return;}
  if(d.type==="power-options"){window.EJS_emulator?.gameManager?.setPowerOptions?.(d.options||{});send("power-info",window.EJS_emulator?.gameManager?.getPowerInfo?.()||{});return;}
  if(d.type==="resume-play"){++trainingPauseRequest;menuPaused=false;backgroundPaused=false;resumeGame();engine?.resume();return;}
  if(d.type==="screenshot"){await screenShot();return;}
  if(d.type==="snapshot"){if(d.reason==="export"){snapshot("export");return;}if(d.reason==="manual"&&Number.isInteger(d.slot)&&d.slot>=1&&d.slot<=100)snapshot("manual",d.slot);return;}

  if(d.type==="load-state"){if(!started||specialGame?.wide64!==true){send("operation-error",{text:"Open Wide64 v4 before loading its saves."});return;}try{if(!(d.bytes instanceof ArrayBuffer)||d.bytes.byteLength<16||d.bytes.byteLength>16*1024*1024)throw Error("Invalid");const validated=await window.DreamWide64.upgradeState(d.bytes);await window.DreamWide64Training?.reset({discard:true});window.DreamWide64Panel.reset();window.DreamEnemies?.reset();window.DreamInput?.reset();window.DreamLargeBattle?.reset();window.DreamSkills?.reset();window.DreamCards?.reset();window.DreamTouch?.releaseAll();await Promise.resolve(window.EJS_emulator.gameManager.loadState(validated));engine?.resetFrame();specialMode=readSuperMode(window.EJS_emulator.gameManager)??"unknown";showSpecialMode();send("loaded-state",{slot:d.slot});}catch{send("operation-error",{text:"Could not load that save state. It may not belong to this game."});}return;}

  if(d.type==="speed"){try{await applySpeed([1,2,3,4,5,6,7,8].includes(d.value)||([16,32].includes(d.value)&&specialGame?.hundred)||([64,128,256,512,1024].includes(d.value)&&specialGame?.turbo)?d.value:1);}catch{send("operation-error",{text:"Could not change speed before the game is ready."});}return;}

  if(d.type==="retry-art"){if(engine){engine.metrics.recoveries=0;await engine.retry();}return;}

  if(d.type==="art"){engine?.setEnabled(d.value===true);return;}

  if(d.type==="pause"){const request=++trainingPauseRequest;try{await window.DreamCards?.whenSettled();await window.DreamWide64Training?.reset();}catch(error){send("operation-error",{text:error.message||"Resume the game before saving this training choice."});}if(request!==trainingPauseRequest)return;menuPaused=true;window.DreamTouch?.releaseAll();window.EJS_emulator?.pause?.();return;}

  if(d.type!=="load"||loaded)return;

  loaded=true;

  try{

   const incoming=d.game;
   if(incoming?.id!==WIDE64_ID)throw Error("Open this edition in its matching player.");
   const game=incoming;if(!(game.bytes instanceof ArrayBuffer))throw Error("Invalid ROM bytes.");const romBytes=new Uint8Array(game.bytes).slice();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",romBytes)),v=>v.toString(16).padStart(2,"0")).join("");
   if(hash!==WIDE64_ID)throw Error("The ROM does not match this Wide64 revision.");
   if(window.DreamWide64Training?.ROM!==WIDE64_ID)throw Error("The A-training helper did not load.");
   window.DreamEnemies=window.DreamWide64;window.DreamCards=window.DreamWide64Cards;window.DreamLargeBattle.ROM=game.id;
   window.DreamWide64.prepareRom(romBytes);const recoverNail=false;
   document.body.dataset.wide64Rom=WIDE64_ID;document.body.dataset.wide64Release="168";
   send("edition-verified",{romId:WIDE64_ID,release:168,name:WIDE64_NAME});
   romUrl=URL.createObjectURL(new Blob([romBytes]));
   specialGame=specialGames[game.id]||null;document.body.classList.toggle("special-enabled",!!specialGame);document.body.classList.toggle("dbz-wide64-edition",specialGame?.wide64===true);showSpecialMode();

   if((await import("/power-core/contra.js?v=67")).isPowerRom(game.id)){
    const {startPowerPlayer}=await import("/power-player.js?v=120");
    await startPowerPlayer(game,(type,extra)=>{if(type==="started"){started=true;}send(type,extra);});if(d.diagnostics)setInterval(()=>send('diagnostics',{value:{sampledAt:performance.now(),coreFrame:window.EJS_emulator.gameManager.getFrameNum(),audio:window.EJS_emulator.gameManager.getAudioInfo()}}),1000);return;
   }

   engine=new (game.id===window.DBZSourceEnglish?.ROM||game.id===window.DreamCards?.ROM||game.id===window.DreamLargeBattle?.ROM?window.DBZSourceEnglish.EnglishPlayer:game.id===window.DBZEnglish?.ROM?window.DBZEnglish.EnglishPlayer:game.id===window.CT2English?.ROM?window.CT2English.EnglishPlayer:window.DreamArtwork)({gameId:game.id,turboPerformance:!!specialGame?.turbo,battleThrottle:()=>!!specialGame?.turbo&&selectedSpeed>=256&&window.EJS_emulator?.isFastForward&&!window.EJS_emulator?.paused&&!menuPaused&&!backgroundPaused&&!confirmationLocks&&!!window.DreamLargeBattle?.animation(),overlay:document.getElementById("art-layer"),canvas:null,onDisplay:state=>send("art-state",state),onStatus:text=>{send("status",{text});const el=document.getElementById("status");if(el)el.textContent=text;}});engine.enabled=d.art!==false;window.dreamArtwork=engine;

   await engine.prepare();

   const ordinaryCore=await import('/standard-player.js?v=120');
   const mapper=(romBytes[6]>>4)|(romBytes[7]&240);
   if(!engine.rules.length&&!specialGame&&ordinaryCore.supportedSoftwareMapper(mapper)&&new URLSearchParams(location.search).get('video')!=='legacy'){
    engine=null;window.dreamArtwork=null;zeldaEnabled=!!window.DreamZelda?.supports(game.id);if(zeldaEnabled){document.body.classList.add("special-enabled");showSpecialMode();}const {startStandardPlayer}=ordinaryCore;
    await startStandardPlayer(game,(type,extra)=>{if(type==='started'){started=true;}send(type,extra);});return;
   }


   // Edition-only binaries plus database bypass prevent original-key/buildStart cache reuse.
   window.EJS_disableDatabases=true;
   window.EJS_paths={"nestopia-wasm.data":"/emulator/data/cores/nestopia-wide64-wasm.data","nestopia-legacy-wasm.data":"/emulator/data/cores/nestopia-wide64-legacy-wasm.data"};
   Object.assign(window,{EJS_player:"#game",EJS_core:"nestopia",EJS_pathtodata:"/emulator/data/",EJS_gameUrl:romUrl,EJS_gameName:game.name+"-"+game.id.slice(0,12),EJS_gameID:parseInt(game.id.slice(0,7),16),EJS_color:"#ff684f",EJS_backgroundColor:"#080a10",EJS_language:"en-US",EJS_disableAutoLang:false,EJS_startOnLoaded:false,EJS_startButtonName:"Play game",EJS_VirtualGamepadSettings:[{"type":"button","text":"B","id":"b","location":"right","right":75,"top":70,"bold":true,"input_value":0},{"type":"button","text":"A","id":"a","location":"right","right":5,"top":70,"bold":true,"input_value":8},{"type":"dpad","id":"dpad","location":"left","left":"50%","right":"50%","joystickInput":false,"inputValues":[4,5,6,7]},{"type":"button","text":"Start","id":"start","location":"center","left":60,"fontSize":15,"block":true,"input_value":3},{"type":"button","text":"Select","id":"select","location":"center","left":-5,"fontSize":15,"block":true,"input_value":2}],EJS_threads:false,EJS_volume:.6,EJS_defaultOptions:{"vsync":"disabled","virtual-gamepad":"disabled","ff-ratio":"2","fastForward":"disabled","slowMotion":"disabled","shader":"disabled","nestopia_overscan_v_top":"0","nestopia_overscan_v_bottom":"0","nestopia_palette":"canonical"},EJS_Buttons:{volume:false,saveState:false,loadState:false,saveSavFiles:false,loadSavFiles:false,gamepad:false,settings:false,fullscreen:false,exitEmulation:false,screenRecord:false,cheat:false,netplay:false}});

   window.EJS_ready=()=>{if(specialGame?.trick==='dbz-card-editor'&&window.EJS_emulator)window.EJS_emulator.checkStarted=()=>{};const launch=document.querySelector('.ejs_start_button');if(launch){launch.setAttribute('role','button');launch.tabIndex=0;launch.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();launch.click();}});}send("status",{text:"Tap Play game to start"});};

   window.EJS_onGameStart=async()=>{window.DreamWide64Panel.start({gm:()=>window.EJS_emulator.gameManager,release:()=>window.DreamTouch?.releaseAll(),pause:()=>window.EJS_emulator.pause(),resume:()=>{if(!menuPaused&&!backgroundPaused)resumeGame();},settle:()=>window.DreamWide64Training.reset(),beginConfirmation,resetFrame:()=>engine?.resetFrame()});window.DreamWide64Training.start({rom:WIDE64_ID,showToggle:false,gm:()=>window.EJS_emulator.gameManager,ramStart:superRamStart,active:()=>started&&!menuPaused&&!backgroundPaused&&!document.hidden&&document.getElementById("dbz-card-editor")?.hidden!==false&&!window.DreamEnemies?.isOpen()&&!window.DreamWide64Panel?.isOpen(),getCardCheats:()=>window.DreamCards?.inspect?.().gameCheats||[],settleCards:()=>window.DreamCards?.whenSettled(),beginConfirmation,resume:()=>{if(!menuPaused&&!backgroundPaused&&!document.hidden)resumeGame();},resetFrame:()=>engine?.resetFrame(),status:text=>send("status",{text})});window.DreamInput?.attach(window.EJS_emulator.gameManager);window.DreamInput?.setDirectionListener(specialGame?.trick==="dbz-card-editor"?guardDirection:null);started=true;if(game.id===window.DreamEnemies?.ROM)window.DreamEnemies.start({gm:()=>window.EJS_emulator.gameManager,active:()=>started&&!menuPaused&&!backgroundPaused,release:()=>window.DreamTouch?.releaseAll(),pause:()=>window.EJS_emulator.pause(),resume:()=>{if(!menuPaused&&!backgroundPaused)resumeGame(true);},settle:()=>window.DreamCards?.whenSettled(),resetFrame:()=>engine?.resetFrame(),status:text=>send("status",{text})});if(game.id===window.DreamLargeBattle?.ROM)window.DreamLargeBattle.start({gm:()=>window.EJS_emulator.gameManager,active:()=>started&&!menuPaused&&!backgroundPaused&&!window.DreamEnemies?.isOpen()&&!window.DreamWide64Panel?.isOpen()});if(specialGame?.trick==="dbz-card-editor")window.DreamCards?.start({isPaused:()=>!!window.EJS_emulator?.paused,gm:()=>window.EJS_emulator.gameManager,ramStart:superRamStart,release:()=>window.DreamTouch?.releaseAll(),pause:()=>window.EJS_emulator.pause(),resume:()=>{if(!menuPaused&&!backgroundPaused)resumeGame();},active:()=>started&&!menuPaused&&!backgroundPaused&&!window.DreamEnemies?.isOpen()&&!window.DreamWide64Panel?.isOpen()&&!window.DreamWide64Training?.ownsCards(),resetFrame:()=>engine?.resetFrame(),status:text=>send("status",{text})});if(specialGame?.trick==="dbz-skills"||specialGame?.trick==="dbz-card-editor")window.DreamSkills?.start({beginConfirmation,nativeConfirmation:(recoverNail||specialGame?.limit256||specialGame?.wide64)?window.DreamSkillConfirm:null,english:!!specialGame.english,gm:()=>window.EJS_emulator.gameManager,ramStart:superRamStart,release:()=>window.DreamTouch?.releaseAll(),pause:()=>window.EJS_emulator.pause(),resume:()=>{if(!menuPaused&&!backgroundPaused)resumeGame();},active:()=>started&&!menuPaused&&!backgroundPaused&&!window.DreamEnemies?.isOpen()&&!window.DreamWide64Panel?.isOpen(),resetFrame:()=>engine?.resetFrame(),status:text=>send("status",{text})});specialMode=readSuperMode(window.EJS_emulator?.gameManager)??"unknown";showSpecialMode();setTimeout(()=>{const gm=window.EJS_emulator?.gameManager;const width=gm?.getVideoDimensions("width");document.body.dataset.coreWidth=String(width);window.DreamTouch?.resize();if(Number(width)>0&&Number(width)!==256){window.EJS_emulator?.pause?.();engine?.stop();fail("This ROM could not run in the current NES core. Return to Library and try another .nes file.");}},1200);window.EJS_emulator?.toggleVirtualGamepad?.(false);applySpeed(specialGame?.turbo?64:specialGame?.hundred?16:1);window.DreamTouch?.start({tapActions:engine.rules.length>0,rapidLocks:true,singleA:specialGame?.trick==="dbz-card-editor"});engine.canvas=window.EJS_emulator?.canvas||document.querySelector("#game canvas");engine.setEnabled(d.art!==false);await engine.start();if(d.diagnostics)setInterval(()=>send('diagnostics',{value:{sampledAt:performance.now(),speed:selectedSpeed,directionGuard:directionHeld||directionTimer!==null,fastForward:window.EJS_emulator?.isFastForward,coreFrame:window.EJS_emulator?.gameManager?.getFrameNum(),metrics:engine.metrics,uploads:window.DreamFrameSource?.uploads,colors:window.DreamFrameSource?.colors,seq:window.DreamFrameSource?.seq,firstPixel:window.DreamFrameSource?.pixels?Array.from(window.DreamFrameSource.pixels.slice(0,4)):null,canvas:{width:engine.canvas.width,height:engine.canvas.height,rect:engine.canvas.getBoundingClientRect().toJSON()},worker:!!engine.worker,overlay:engine.overlay.style.cssText}}),1000);send("touch-settings",{rates:window.DreamTouch?.getSettings()});send("started");};

   const script=document.createElement("script");script.src="/emulator/data/loader.js";script.onerror=()=>fail("Could not load the emulator. Check your connection and reopen the game.");document.body.appendChild(script);

  }catch(error){fail(error.message||"Could not load this game.");}

 });

 addEventListener("pagehide",event=>{if(event.persisted){backgroundPaused=!menuPaused;engine?.suspend();return;}engine?.stop();if(romUrl)URL.revokeObjectURL(romUrl);});

 function resumeInterrupted(){if(!started||document.hidden||menuPaused)return;if(backgroundPaused||window.EJS_emulator?.paused){backgroundPaused=false;resumeGame();engine?.resume();}}
 addEventListener("pageshow",event=>{if(event.persisted){backgroundPaused=true;resumeInterrupted();}});
 for(const event of ["pointerdown","click"])document.getElementById("touch-controls")?.addEventListener(event,resumeInterrupted,true);

 addEventListener("visibilitychange",()=>{if(document.hidden){backgroundPaused=started&&!menuPaused;engine?.suspend();window.EJS_emulator?.pause?.();}else{resumeInterrupted();}});send("ready");

})();

