import {drawProjectiles} from './power-core/bullets.js';
import {attachBombCollisions} from './power-core/bombs.js';
import {NES,Controller} from './power-core/src/index.js';
import {attachPowerTiming,projectiles,POWER_ROM,isPowerRom} from './power-core/contra.js';
export async function startPowerPlayer(game,send){
 if(!isPowerRom(game.id))throw new Error('This Power profile does not match the ROM.');
 const host=document.getElementById('game');host.replaceChildren();
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=240;canvas.style.cssText='width:100%;height:100%;object-fit:contain;image-rendering:pixelated';host.append(canvas);
 const play=document.createElement('button');play.textContent='Play Contra Power';play.style.cssText='position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);padding:16px 24px;background:#ff684f;color:#fff;border:0;border-radius:12px;font:bold 18px sans-serif;z-index:8';host.append(play);
 const ctx=canvas.getContext('2d',{alpha:false}),image=ctx.createImageData(256,240);
 let audio=null,node=null,left=[],right=[],running=false,started=false,raf=0,last=0,acc=0,speed=1,frameCount=0;
 const nes=new NES({sampleRate:48000,onFrame(pixels){for(let i=0;i<pixels.length;i++){const c=pixels[i],j=i*4;image.data[j]=c&255;image.data[j+1]=(c>>8)&255;image.data[j+2]=(c>>16)&255;image.data[j+3]=255;}},onAudioSample(l,r){left.push(l);right.push(r);}});
 let binary='';const bytes=new Uint8Array(game.bytes);for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));nes.loadROM(binary);attachPowerTiming(nes,game.id===POWER_ROM?8:12);attachBombCollisions(nes);
 function draw(){ctx.putImageData(image,0,0);drawProjectiles(ctx,nes,game.id!==POWER_ROM);const m=nes.cpu.mem;if(m[0x18]===5){ctx.fillStyle='#000b';ctx.fillRect(4,226,130,12);ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText('R '+(m[0x7e6]+256*m[0x7e8]+65536*m[0x7ea]),7,235);}}
 function flushAudio(){if(node&&left.length&&speed===1){const l=Float32Array.from(left),r=Float32Array.from(right);node.port.postMessage({left:l,right:r},[l.buffer,r.buffer]);}left=[];right=[];}
 const inputFrames=new Map(),releaseFrames=new Map();
 function tick(time){if(!running)return;acc+=Math.min(50,time-last);last=time;let steps=0;while(acc>=1000/60&&steps<3){for(let i=0;i<speed;i++){nes.frame();frameCount++;for(const [key,at] of releaseFrames){if(frameCount>=at){const [p,c]=key.split(":").map(Number);nes.buttonUp(p,c);releaseFrames.delete(key);}}}acc-=1000/60;steps++;}if(steps){draw();flushAudio();}raf=requestAnimationFrame(tick);}
 function clearInput(){inputFrames.clear();releaseFrames.clear();for(let p=1;p<=2;p++)for(let c=0;c<8;c++)nes.buttonUp(p,c);}
 function pause(){running=false;cancelAnimationFrame(raf);window.DreamTouch?.releaseAll();clearInput();audio?.suspend();node?.port.postMessage({clear:true});play.textContent='Resume game';play.hidden=false;}
 async function resume(){
  // Video and controls must never wait for Safari's audio permission or worklet download.
  if(!running){running=true;play.hidden=true;last=performance.now();acc=0;raf=requestAnimationFrame(tick);if(!started){started=true;window.EJS_emulator.started=true;window.DreamTouch?.start();send('started');send('status',{text:'Contra Power · hold B to fire'});}}
  if(!audio){try{audio=new AudioContext({sampleRate:48000,latencyHint:'interactive'});await audio.audioWorklet.addModule('/power-core/audio.js');node=new AudioWorkletNode(audio,'power-audio',{outputChannelCount:[2]});node.connect(audio.destination);}catch{send('status',{text:'Playing · audio unavailable'});}}
  void audio?.resume().catch(()=>{});
 }

 const codes={0:Controller.BUTTON_B,8:Controller.BUTTON_A,2:Controller.BUTTON_SELECT,3:Controller.BUTTON_START,4:Controller.BUTTON_UP,5:Controller.BUTTON_DOWN,6:Controller.BUTTON_LEFT,7:Controller.BUTTON_RIGHT};
 function input(player,code,value){const mapped=codes[code];if(mapped===undefined)return;const key=(player+1)+":"+mapped;if(value){releaseFrames.delete(key);inputFrames.set(key,frameCount);nes.buttonDown(player+1,mapped);}else if(frameCount-(inputFrames.get(key)??-99)<2){releaseFrames.set(key,(inputFrames.get(key)??frameCount)+2);}else{releaseFrames.delete(key);nes.buttonUp(player+1,mapped);}}
 const keyboard={ArrowUp:4,ArrowDown:5,ArrowLeft:6,ArrowRight:7,KeyZ:0,KeyX:8,Enter:3,ShiftRight:2};
 for(const type of ['keydown','keyup'])addEventListener(type,event=>{if(keyboard[event.code]===undefined)return;event.preventDefault();input(0,keyboard[event.code],type==='keydown'?1:0);});
 addEventListener('blur',clearInput);
 window.EJS_emulator={canvas,started:false,pause,play:resume,isSlowMotion:false,gameManager:{
  simulateInput:input,getVideoDimensions:kind=>kind==='width'?256:kind==='aspect'?256/240:240,getFrameNum:()=>frameCount,
  screenshot:async()=>{const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));return new Uint8Array(await blob.arrayBuffer());},
  getState:()=>new TextEncoder().encode(JSON.stringify({format:'contra-power-1',rom:game.id,state:nes.toJSON()})),
  loadState:data=>{const saved=JSON.parse(new TextDecoder().decode(data));if(saved.format!=='contra-power-1'||saved.rom!==game.id)throw new Error('Wrong save format');nes.fromJSON(saved.state);clearInput();attachPowerTiming(nes,game.id===POWER_ROM?8:12);node?.port.postMessage({clear:true});left=[];right=[];},
  toggleSlowMotion(){},setFastForwardRatio(){},toggleFastForward:value=>{speed=value?2:1;node?.port.postMessage({clear:true});}
 }};
 play.addEventListener('click',()=>resume().catch(()=>send('operation-error',{text:'Could not start audio. Tap Play again.'})));
 send('art-state',{active:false,reason:'off'});send('status',{text:'Starting Contra…'});
 addEventListener('pointerdown',()=>{void audio?.resume().catch(()=>{});});
 void resume();
 return {nes,pause};
}
