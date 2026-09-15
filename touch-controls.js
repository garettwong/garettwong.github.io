/* Pointer capture and explicit release prevent stuck buttons. */
(()=>{
 const active=new Map(),timers=new Map(),pressedAt=new Map(),buttons=()=>document.querySelectorAll('#touch-controls button[data-code],#touch-controls button[data-codes]');
 const padPointers=new Map(),locked=new Set(),lockButtons=()=>document.querySelectorAll('[data-lock-code]');
 let tapActions=false;
 const input=(code,value)=>window.EJS_emulator?.gameManager?.simulateInput(0,code,value);
 const codes=b=>(b.dataset.codes||b.dataset.code).split(',').map(Number),held=new Set();
 function sync(){const next=new Set(locked);for(const b of active.values())for(const code of codes(b))next.add(code);for(const values of padPointers.values())for(const code of values)next.add(code);for(const code of held)if(!next.has(code))input(code,0);for(const code of next)if(!held.has(code))input(code,1);held.clear();for(const code of next)held.add(code);for(const b of buttons())b.classList[codes(b).every(code=>held.has(code))?'add':'remove']('pressed');for(const arrow of document.querySelectorAll('[data-direction]'))arrow.classList[next.has(Number(arrow.dataset.direction))?'add':'remove']('pressed');for(const b of lockButtons()){const on=locked.has(Number(b.dataset.lockCode)),name=b.dataset.lockCode==='0'?'B':'A';b.setAttribute('aria-pressed',String(on));b.textContent=on?name+' locked':name+' lock';b.classList[on?'add':'remove']('locked');}}
 function release(id){if(!active.has(id)&&!padPointers.has(id))return;padPointers.delete(id);clearTimeout(timers.get(id));timers.delete(id);active.delete(id);pressedAt.delete(id);sync();}
 function releaseAll(){locked.clear();for(const id of new Set([...active.keys(),...padPointers.keys()]))release(id);sync();}
 for(const b of lockButtons())b.addEventListener('click',()=>{if(!window.EJS_emulator?.started)return;const code=Number(b.dataset.lockCode);if(locked.has(code))locked.delete(code);else locked.add(code);sync();});
 window.DreamTouch={start(options={}){tapActions=options.tapActions===true;if(!(navigator.maxTouchPoints>0||innerWidth<650))return;document.body.classList.add('touch-ready');document.body.style.setProperty('--game-aspect',String(window.EJS_emulator?.gameManager?.getVideoDimensions('aspect')||4/3));window.EJS_emulator?.handleResize?.();},resize(){document.body.style.setProperty('--game-aspect',String(window.EJS_emulator?.gameManager?.getVideoDimensions('aspect')||4/3));window.EJS_emulator?.handleResize?.();},releaseAll};
 for(const b of buttons()){
 b.addEventListener('pointerdown',event=>{event.preventDefault();if(!window.EJS_emulator?.started)return;release(event.pointerId);b.setPointerCapture(event.pointerId);active.set(event.pointerId,b);pressedAt.set(event.pointerId,performance.now());sync();
 if(tapActions&&codes(b).length===1&&[0,8,2,3].includes(codes(b)[0]))timers.set(event.pointerId,setTimeout(()=>release(event.pointerId),90));});
 b.addEventListener('pointerup',event=>{event.preventDefault();const remaining=codes(b).some(code=>[4,5,6,7].includes(code))?0:70-(performance.now()-(pressedAt.get(event.pointerId)||0));if(remaining>0){clearTimeout(timers.get(event.pointerId));timers.set(event.pointerId,setTimeout(()=>release(event.pointerId),remaining));}else release(event.pointerId);});
 for(const name of ['pointercancel'])b.addEventListener(name,event=>{event.preventDefault();release(event.pointerId);});
 b.addEventListener('lostpointercapture',event=>{if(!timers.has(event.pointerId))release(event.pointerId);});
 b.addEventListener('contextmenu',event=>event.preventDefault());
 }
 // Cancel Safari's native long-touch selection before its magnifier opens.
 // Pointer events still drive movement; P/S and lock clicks remain separate.
 const blockNativeHold=element=>{for(const type of ['touchstart','touchmove'])element.addEventListener(type,event=>{if(event.cancelable!==false)event.preventDefault();},{passive:false});element.addEventListener('selectstart',event=>event.preventDefault());element.addEventListener('dragstart',event=>event.preventDefault());};
 for(const b of buttons())blockNativeHold(b);
 const pad=document.querySelector?.('#direction-pad');
 if(pad){
  blockNativeHold(pad);
  const update=event=>{const box=pad.getBoundingClientRect(),x=event.clientX-box.left-box.width/2,y=event.clientY-box.top-box.height/2;let values=[];if(Math.hypot(x,y)>box.width*.065){const sector=(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8;values=[[7],[5,7],[5],[5,6],[6],[4,6],[4],[4,7]][sector];}padPointers.set(event.pointerId,values);sync();};
  pad.addEventListener('pointerdown',event=>{event.preventDefault();if(!window.EJS_emulator?.started)return;release(event.pointerId);pad.setPointerCapture(event.pointerId);update(event);});
  pad.addEventListener('pointermove',event=>{if(!padPointers.has(event.pointerId))return;event.preventDefault();update(event);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,event=>{event.preventDefault();release(event.pointerId);});
  pad.addEventListener('contextmenu',event=>event.preventDefault());
 }
 addEventListener('blur',releaseAll);addEventListener('pagehide',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
})();
