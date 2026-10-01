// Ordinary NES games use the existing JS NES core and Canvas 2D on iPhone.
// No Contra timing, bullet, collision or ROM modifications are applied here.
import {NES,Controller} from './power-core/src/index.js';
import Mappers from './power-core/src/mappers/index.js';
import {createAudioOutput} from './power-core/audio-output.js?v=82';
export const supportedSoftwareMapper=mapper=>Object.hasOwn(Mappers,mapper);
export async function startStandardPlayer(game,send){
 const host=document.getElementById('game');host.replaceChildren();
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=240;canvas.dataset.renderer='software';canvas.style.cssText='width:100%;height:100%;object-fit:contain;image-rendering:pixelated';host.append(canvas);
 const play=document.createElement('button');play.textContent='Play game';play.style.cssText='position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);padding:16px 24px;background:#ff684f;color:#fff;border:0;border-radius:12px;font:bold 18px sans-serif;z-index:8';host.append(play);
 const ctx=canvas.getContext('2d',{alpha:false}),image=ctx.createImageData(256,240),pixels=new Uint32Array(image.data.buffer);
 let left=[],right=[],running=false,started=false,timer=0,last=0,acc=0,speed=1,fastRatio=2,frameCount=0;
 const nes=new NES({sampleRate:48000,onFrame(frame){for(let i=0;i<frame.length;i++)pixels[i]=frame[i]|0xff000000;},onAudioSample(l,r){left.push(l);right.push(r);}});
 nes.loadROM(new Uint8Array(game.bytes));
 const audio=createAudioOutput(rate=>{nes.opts.sampleRate=rate;nes.papu.sampleRate=rate;nes.papu.setFrameRate(60*speed);});
 const downFrames=new Map(),pendingUp=new Map();
 const codes={0:Controller.BUTTON_B,8:Controller.BUTTON_A,2:Controller.BUTTON_SELECT,3:Controller.BUTTON_START,4:Controller.BUTTON_UP,5:Controller.BUTTON_DOWN,6:Controller.BUTTON_LEFT,7:Controller.BUTTON_RIGHT};
 function input(player,code,value){const mapped=codes[code];if(mapped===undefined)return;const key=(player+1)+':'+mapped;if(value){pendingUp.delete(key);downFrames.set(key,frameCount);nes.buttonDown(player+1,mapped);}else if(frameCount-(downFrames.get(key)??-99)<1){pendingUp.set(key,(downFrames.get(key)??frameCount)+1);}else{pendingUp.delete(key);nes.buttonUp(player+1,mapped);}}
 function clearInput(){downFrames.clear();pendingUp.clear();for(let p=1;p<=2;p++)for(let c=0;c<8;c++)nes.buttonUp(p,c);}
 function tick(time){if(!running)return;acc+=Math.min(50,time-last);last=time;let steps=0;try{while(acc>=1000/60&&steps<3){for(let i=0;i<speed;i++){nes.frame();frameCount++;window.DreamTouch?.clockFrame(1000/(60*speed));for(const [key,at]of pendingUp)if(frameCount>=at){const[p,c]=key.split(':').map(Number);nes.buttonUp(p,c);pendingUp.delete(key);}}acc-=1000/60;steps++;}if(steps){ctx.putImageData(image,0,0);audio.push(left,right);left=[];right=[];}timer=setTimeout(()=>tick(performance.now()),Math.max(1,1000/60-acc));}catch(error){pause();send('error',{text:error.message||'This game could not run. Try another ROM.'});}}
 function pause(){running=false;window.EJS_emulator.paused=true;clearTimeout(timer);window.DreamTouch?.releaseAll();clearInput();audio.pause();play.textContent='Resume game';play.hidden=false;}
 function resume(){if(running)return;running=true;window.EJS_emulator.paused=false;play.hidden=true;last=performance.now();acc=0;audio.unlock();timer=setTimeout(()=>tick(performance.now()),1);if(!started){started=true;window.EJS_emulator.started=true;window.DreamTouch?.start({rapidLocks:true,frameDriven:true});send('touch-settings',{rates:window.DreamTouch?.getSettings()});send('started',{core:'software'});send('status',{text:'Playing '+game.name});}}
 window.EJS_emulator={canvas,started:false,paused:true,pause,play:resume,isSlowMotion:false,gameManager:{
  simulateInput:input,getVideoDimensions:kind=>kind==='width'?256:kind==='aspect'?256/240:240,getFrameNum:()=>frameCount,getAudioInfo:()=>audio.info(),getPowerInfo:()=>({}),
  screenshot:async()=>new Uint8Array(await(await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer()),
  getState:()=>new TextEncoder().encode(JSON.stringify({format:'nes-software-1',rom:game.id,state:nes.toJSON()})),
  loadState:data=>{const saved=JSON.parse(new TextDecoder().decode(data));if(saved.format!=='nes-software-1'||saved.rom!==game.id)throw Error('This save belongs to a different player core. Existing saves are preserved.');nes.fromJSON(saved.state);nes.papu.sampleRate=nes.opts.sampleRate;nes.papu.setFrameRate(60*speed);clearInput();audio.clear();left=[];right=[];},
  toggleSlowMotion(){},setFastForwardRatio:value=>{fastRatio=[1,2,3,4,6,8].includes(value)?value:2;},toggleFastForward:value=>{speed=value?fastRatio:1;nes.papu.setFrameRate(60*speed);left=[];right=[];audio.clear();}
 }};
 const keyboard={ArrowUp:4,ArrowDown:5,ArrowLeft:6,ArrowRight:7,KeyZ:0,KeyX:8,Enter:3,ShiftRight:2};
 for(const type of ['keydown','keyup'])addEventListener(type,event=>{if(keyboard[event.code]===undefined)return;event.preventDefault();input(0,keyboard[event.code],type==='keydown'?1:0);});
 addEventListener('blur',clearInput);for(const type of ['pointerdown','touchend','keydown','click'])addEventListener(type,()=>{if(running)audio.unlock();},{passive:true});
 addEventListener('pagehide',()=>{running=false;clearTimeout(timer);clearInput();audio.pause();});
 play.addEventListener('click',resume);send('art-state',{active:false,reason:'off'});send('status',{text:'Tap Play game to start'});
 return {nes,pause};
}
