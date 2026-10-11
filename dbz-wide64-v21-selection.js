/* Make the native card choice clear without changing input or game memory. */
(()=>{'use strict';
let latest=null,pending=false,last=null;
function decode(input){
 const b=new Uint8Array(input),c=window.DreamWide64,r=c.chunk(b,'RAM',2048);
 if(r<0||b[r+0x2e]!==1||b[r+0x30]!==5)return null;
 const slot=b[r+0x6e];if(slot>4)return null;
 const at=r+0x3f5+slot*8,address=(b[at]|b[at+1]<<8)&1023;
 if(b[at+1]<0x20||b[at+1]>0x2b||b[at+2]!==2)return null;
 const x=(address&31)*8,y=(address>>5)*8;
 // This is the native five-card battle strip, beside the action choices.
 if(x!==80+slot*32||y!==176)return null;
 return {slot,x,y};
}
function draw(engine,pixels,choice){
 if(!choice)return false;
 const p=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),bg=p[170*256+244];
 // Do not paint over a transition, a different menu, or scrolling scenery.
 if(![164,170,174].every(y=>[240,244,248].every(x=>p[y*256+x]===bg)))return false;
 const ctx=engine.out;ctx.save();ctx.scale(engine.overlay.width/256,engine.overlay.height/240);
 ctx.fillStyle=`rgb(${bg&255},${bg>>>8&255},${bg>>>16&255})`;
 ctx.fillRect(80,164,160,12);
 ctx.strokeStyle='#061323';ctx.lineWidth=2;ctx.strokeRect(choice.x-.5,choice.y-.5,32,48);
 ctx.strokeStyle='#77f4ff';ctx.lineWidth=1;ctx.strokeRect(choice.x-.5,choice.y-.5,32,48);
 const center=choice.x+16;
 ctx.beginPath();ctx.moveTo(center-4,167);ctx.lineTo(center+4,167);ctx.lineTo(center,173);ctx.closePath();
 ctx.fillStyle='#77f4ff';ctx.fill();ctx.strokeStyle='#061323';ctx.lineWidth=1;ctx.stroke();ctx.restore();
 last={...choice,pointerX:center,pointerY:173};return true;
}
const proto=window.DBZSourceEnglish?.EnglishPlayer?.prototype;
if(proto){const original=proto.present;proto.present=function(pixels,...args){
 original.call(this,pixels,...args);
 latest=this.gameId===window.DreamWide64?.ROM?{engine:this,pixels}:null;
 if(!latest||pending)return;pending=true;
 // Native save-state reads must stay outside the core's upload callback.
 queueMicrotask(()=>{pending=false;const frame=latest;latest=null;last=null;if(!frame)return;
  const {engine,pixels}=frame;if(engine.stopped||engine.suspended||engine.lastPixels!==pixels||engine.overlay.style.display==='none')return;
  try{draw(engine,pixels,decode(window.EJS_emulator.gameManager.getState()));}catch{}
 });
};}
window.DreamCardSelection={decode,inspect:()=>last?{...last}:null};
})();
