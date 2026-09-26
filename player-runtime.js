/* Adapter pinned to the bundled EmulatorJS 4.2.3 API. */

(()=>{

 const origin=location.origin;

 const send=(type,extra={},transfer)=>parent.postMessage({channel:"nes-dream",type,...extra},origin,transfer||[]);

 let menuPaused=false,backgroundPaused=false;
 let loaded=false,engine=null,romUrl=null,autosaveTimer=0,started=false,selectedSpeed=1,specialBusy=false,specialMode="normal",specialPending=null;
 const specialGames={
  "874d7f2dfbc06c3d67d87fdeb5523772b9e00dc1e7af065a7583f351c25355c7":{name:"Captain Tsubasa II",trick:"skill-direct"},
  "adc2d3e1327c8419f13228740e290e88c8557b0f8b4f134d8cd337f41ce3053e":{name:"Captain Tsubasa II LIVE Power Previous",trick:"skill-upgrade"},
  "a22e58d15433bac26d07078fec1a22c188fa99c2e24d5a94a81e4d92fb756d86":{name:"Captain Tsubasa II LIVE Stats Previous",trick:"skill-upgrade"},
  "85f070c32efb46295a23ab182bd51c670a9b0defbf2e817025817a697ad028e2":{name:"Captain Tsubasa II Direct Previous",trick:"skill-upgrade"},
  "274d07edf49ab8064ddf2de5c16c6f2c71aa13614b561ee473079ab97f5dcf17":{name:"Captain Tsubasa II Live Skills",trick:"skill-upgrade"},
  "696c3cba4590cd3470148f1c1f8c16e2bb9f8079316a6c9f1a05f1459250d508":{name:"Captain Tsubasa II SPECIAL Legacy",trick:"skill-upgrade"},
  "e2591b9ea48d7f65e4e64779b5c23a0da6bc4126d7c80dd149c6b21849dfa10c":{name:"Captain Tsubasa II Classic",trick:"skill-upgrade"},
  "dbc70fade29e34e3ce0e8e2c62a21aca3892aff4f588821de74c332e1153447a":{name:"Contra Super Final",trick:"bullet-settings"},
  "1da4a85d61803e64df61c743a6253e02c0639ee7b68a72a4dfe815779622ca7f":{name:"Contra Arsenal Pro",trick:"bullet-settings"}
 };
 let specialGame=null;
 const specialButton=document.getElementById("special-button");
 const showSpecialMode=()=>{if(specialButton)specialButton.textContent=specialGame?.trick==="bullet-settings"?"SPECIAL · BULLETS":specialGame?.trick==="skill-upgrade"?"Open LIVE Power edition":specialPending?"SUPER · WAIT":specialMode==="unknown"?"SUPER · TOGGLE":`SUPER · ${specialMode==="high"?"ON":"OFF"}`;};
 // The browser core wraps its Nestopia state, unlike standalone Nestopia.
 // Find the NES RAM chunk instead of relying on a fixed save-state offset.
 // The final three internal RAM bytes are reserved for SUPER. Music owns $07FC.
 const superRamStart=state=>{if(!state||state.length<2200)return -1;let nestopia=-1;for(let i=0;i<Math.min(64,state.length-4);i++)if(state[i]===78&&state[i+1]===83&&state[i+2]===84&&state[i+3]===26){nestopia=i;break;}if(nestopia<0)return -1;for(let i=nestopia+8;i<Math.min(nestopia+512,state.length-2057);i++)if(state[i]===82&&state[i+1]===65&&state[i+2]===77&&state[i+3]===0&&state[i+4]===1&&state[i+5]===8&&state[i+6]===0&&state[i+7]===0)return i+9;return -1;};
 const readSuperMode=gm=>{try{const state=gm.getState(),start=superRamStart(state);return start<0?null:state[start+0x7fd]===165?"high":"normal";}catch{return null;}};
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const runSpecial=async()=>{
  if(!started||!specialGame||specialBusy||specialPending)return;
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

 const snapshot=(reason,slot,requestId)=>{

  if(!started)return;

  try{const state=window.EJS_emulator?.gameManager?.getState();if(!state?.byteLength)throw new Error("No save data available yet");const bytes=state.buffer.slice(state.byteOffset,state.byteOffset+state.byteLength);send("state",{reason,slot,requestId,bytes},[bytes]);}

  catch{if(reason!=="auto")send("operation-error",{text:"Could not save this state. Start the game and try again."});}

 };

 const screenShot=async()=>{try{if(!started)throw new Error('Start the game first.');const gm=window.EJS_emulator?.gameManager;if(!gm?.screenshot)throw new Error('Screenshot is not ready.');let raw;if(engine&&window.DreamFrameSource){const captured=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{window.DreamFrameSource.captureCanvasOnce=null;reject(new Error("Screenshot timed out. Resume the game and try P again."));},2000);window.DreamFrameSource.captureCanvasOnce=value=>{clearTimeout(timeout);resolve(value);};});const canvas=document.createElement("canvas");canvas.width=captured.width;canvas.height=captured.height;const context=canvas.getContext("2d");context.putImageData(new ImageData(captured.pixels,captured.width,captured.height),0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));raw=new Uint8Array(await blob.arrayBuffer());}else raw=await gm.screenshot();let bytes=raw instanceof Uint8Array?raw:new Uint8Array(raw);if(engine?.overlay&&getComputedStyle(engine.overlay).display!=="none"){const bitmap=await createImageBitmap(new Blob([bytes],{type:"image/png"}));const out=document.createElement("canvas");out.width=bitmap.width;out.height=bitmap.height;const ctx=out.getContext("2d");ctx.drawImage(bitmap,0,0);ctx.drawImage(engine.overlay,0,0,out.width,out.height);bitmap.close();const blob=await new Promise(resolve=>out.toBlob(resolve,"image/png"));bytes=new Uint8Array(await blob.arrayBuffer());}const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);send("screenshot",{bytes:buffer},[buffer]);}catch(error){send("operation-error",{text:error.message||"Could not take a screenshot."});}};
 for(const type of ['selectstart','contextmenu','dragstart'])addEventListener(type,event=>event.preventDefault());
 addEventListener('selectionchange',()=>{const selection=window.getSelection?.();if(selection?.rangeCount)selection.removeAllRanges();});
 for(const button of document.querySelectorAll?.('[data-action]')||[])button.addEventListener('click',()=>{if(button.dataset.action==='screenshot')screenShot();else if(started)send('save-menu');});
 const stopAutosave=()=>{if(autosaveTimer){clearInterval(autosaveTimer);autosaveTimer=0;}};

 const applySpeed=value=>{const gm=window.EJS_emulator?.gameManager;if(!gm)throw new Error("The game is not ready yet.");gm.toggleSlowMotion(0);window.EJS_emulator.isSlowMotion=false;gm.setFastForwardRatio(value);gm.toggleFastForward(value>1?1:0);selectedSpeed=value;send("speed",{value});};

 addEventListener("error",event=>{if(!loaded)return;console.error("Player error",event.message);send("error",{text:"The player encountered an error. Return to your library and reopen the game."});});

 addEventListener("message",async event=>{

  if(event.origin!==origin||event.source!==parent||event.data?.channel!=="nes-dream")return;

  const d=event.data;

  if(d.type==="power-info"){send("power-info",window.EJS_emulator?.gameManager?.getPowerInfo?.()||{});return;}
  if(d.type==="power-options"){window.EJS_emulator?.gameManager?.setPowerOptions?.(d.options||{});send("power-info",window.EJS_emulator?.gameManager?.getPowerInfo?.()||{});return;}
  if(d.type==="resume-play"){menuPaused=false;backgroundPaused=false;window.EJS_emulator?.play?.();engine?.resume();return;}
  if(d.type==="screenshot"){await screenShot();return;}
  if(d.type==="snapshot"){snapshot(d.reason==="manual"||d.reason==="export"?d.reason:"auto",Number.isInteger(d.slot)?d.slot:undefined);return;}

  if(d.type==="load-state"){window.DreamTouch?.releaseAll();try{if(!(d.bytes instanceof ArrayBuffer)||d.bytes.byteLength<16||d.bytes.byteLength>16*1024*1024)throw new Error("Invalid");if(specialGame?.trick==="skill-direct"){specialPending=null;window.EJS_emulator?.gameManager?.resetCheat?.();}await Promise.resolve(window.EJS_emulator?.gameManager?.loadState(new Uint8Array(d.bytes)));engine?.resetFrame();specialMode=readSuperMode(window.EJS_emulator?.gameManager)??"unknown";showSpecialMode();send("loaded-state",{slot:d.slot});}catch{send("operation-error",{text:"Could not load that save state. It may not belong to this game."});}return;}

  if(d.type==="speed"){try{applySpeed([1,2,3,4,6,8].includes(d.value)?d.value:1);}catch{send("operation-error",{text:"Could not change speed before the game is ready."});}return;}

  if(d.type==="retry-art"){if(engine){engine.metrics.recoveries=0;await engine.retry();}return;}

  if(d.type==="art"){engine?.setEnabled(d.value===true);return;}

  if(d.type==="pause"){menuPaused=true;window.DreamTouch?.releaseAll();snapshot("auto",undefined,typeof d.requestId==="string"?d.requestId:undefined);window.EJS_emulator?.pause?.();return;}

  if(d.type!=="load"||loaded)return;

  loaded=true;

  try{

   const {game}=d;if(!(game?.bytes instanceof ArrayBuffer)||typeof game.id!=="string"||!/^[a-f0-9]{64}$/.test(game.id))throw new Error("Invalid local game data.");romUrl=URL.createObjectURL(new Blob([game.bytes]));
   specialGame=specialGames[game.id]||null;document.body.classList.toggle("special-enabled",!!specialGame);showSpecialMode();

   if((await import("/power-core/contra.js?v=67")).isPowerRom(game.id)){
    const {startPowerPlayer}=await import("/power-player.js?v=67");
    await startPowerPlayer(game,(type,extra)=>{if(type==="started"){started=true;autosaveTimer=window.setInterval(()=>snapshot("auto"),60000);}send(type,extra);});return;
   }

   engine=new window.DreamArtwork({gameId:game.id,overlay:document.getElementById("art-layer"),canvas:null,onDisplay:state=>send("art-state",state),onStatus:text=>{send("status",{text});const el=document.getElementById("status");if(el)el.textContent=text;}});engine.enabled=d.art!==false;window.dreamArtwork=engine;

   await engine.prepare();

   Object.assign(window,{EJS_player:"#game",EJS_core:"nestopia",EJS_pathtodata:"/emulator/data/",EJS_gameUrl:romUrl,EJS_gameName:game.name+"-"+game.id.slice(0,12),EJS_gameID:parseInt(game.id.slice(0,7),16),EJS_color:"#ff684f",EJS_backgroundColor:"#080a10",EJS_language:"en-US",EJS_disableAutoLang:false,EJS_startOnLoaded:false,EJS_startButtonName:"Play game",EJS_VirtualGamepadSettings:[{"type":"button","text":"B","id":"b","location":"right","right":75,"top":70,"bold":true,"input_value":0},{"type":"button","text":"A","id":"a","location":"right","right":5,"top":70,"bold":true,"input_value":8},{"type":"dpad","id":"dpad","location":"left","left":"50%","right":"50%","joystickInput":false,"inputValues":[4,5,6,7]},{"type":"button","text":"Start","id":"start","location":"center","left":60,"fontSize":15,"block":true,"input_value":3},{"type":"button","text":"Select","id":"select","location":"center","left":-5,"fontSize":15,"block":true,"input_value":2}],EJS_threads:false,EJS_volume:.6,EJS_defaultOptions:{"virtual-gamepad":"disabled","ff-ratio":"2","fastForward":"disabled","slowMotion":"disabled","shader":"disabled","nestopia_overscan_v_top":"0","nestopia_overscan_v_bottom":"0","nestopia_palette":"canonical"},EJS_Buttons:{volume:false,saveState:false,loadState:false,saveSavFiles:false,loadSavFiles:false,gamepad:false,settings:false,fullscreen:false,exitEmulation:false,screenRecord:false,cheat:false,netplay:false}});

   window.EJS_ready=()=>send("status",{text:"Tap Play game to start"});

   window.EJS_onGameStart=async()=>{started=true;specialMode=readSuperMode(window.EJS_emulator?.gameManager)??"unknown";showSpecialMode();setTimeout(()=>{const gm=window.EJS_emulator?.gameManager;const width=gm?.getVideoDimensions("width");document.body.dataset.coreWidth=String(width);window.DreamTouch?.resize();if(Number(width)>0&&Number(width)!==256){window.EJS_emulator?.pause?.();engine?.stop();fail("This ROM could not run in the current NES core. Return to Library and try another .nes file.");}},1200);window.EJS_emulator?.toggleVirtualGamepad?.(false);applySpeed(1);window.DreamTouch?.start({tapActions:engine.rules.length>0});autosaveTimer=window.setInterval(()=>snapshot("auto"),60000);engine.canvas=window.EJS_emulator?.canvas||document.querySelector("#game canvas");engine.setEnabled(d.art!==false);await engine.start();if(d.diagnostics)setInterval(()=>send('diagnostics',{value:{sampledAt:performance.now(),coreFrame:window.EJS_emulator?.gameManager?.getFrameNum(),metrics:engine.metrics,uploads:window.DreamFrameSource?.uploads,colors:window.DreamFrameSource?.colors,seq:window.DreamFrameSource?.seq,firstPixel:window.DreamFrameSource?.pixels?Array.from(window.DreamFrameSource.pixels.slice(0,4)):null,canvas:{width:engine.canvas.width,height:engine.canvas.height,rect:engine.canvas.getBoundingClientRect().toJSON()},worker:!!engine.worker,overlay:engine.overlay.style.cssText}}),1000);send("started");};

   const script=document.createElement("script");script.src="/emulator/data/loader.js";script.onerror=()=>fail("Could not load the emulator. Check your connection and reopen the game.");document.body.appendChild(script);

  }catch(error){fail(error.message||"Could not load this game.");}

 });

 addEventListener("pagehide",event=>{snapshot("auto");if(event.persisted){backgroundPaused=!menuPaused;engine?.suspend();return;}stopAutosave();engine?.stop();if(romUrl)URL.revokeObjectURL(romUrl);});

 function resumeInterrupted(){if(!started||document.hidden||menuPaused)return;if(backgroundPaused||window.EJS_emulator?.paused){backgroundPaused=false;window.EJS_emulator?.play?.();engine?.resume();}}
 addEventListener("pageshow",event=>{if(event.persisted){backgroundPaused=true;resumeInterrupted();}});
 for(const event of ["pointerdown","click"])document.getElementById("touch-controls")?.addEventListener(event,resumeInterrupted,true);

 addEventListener("visibilitychange",()=>{if(document.hidden){backgroundPaused=started&&!menuPaused;snapshot("auto");engine?.suspend();window.EJS_emulator?.pause?.();}else{resumeInterrupted();}});send("ready");

})();
