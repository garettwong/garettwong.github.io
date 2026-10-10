/* Wide64 v8 presentation only. Native RAM, ROM, BP and saves are read-only. */
(()=>{'use strict';
const URL='/packs/wide64-v8-nameplates-v2.png';
const rects=[[84,97,552,523],[741,166,387,452],[91,674,545,511],[750,719,400,467]];
const H=[0,102,102,102,126,102,102,102],B=[0,124,102,102,124,102,102,124],P=[0,124,102,102,102,124,96,96];
let atlas=null,patterns=[];
const ready=Promise.all([
 new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Nameplate image unavailable'));img.src=URL;}),
 fetch('/dbz-wide64-v8-nameplate-patterns.json?v=178-nameplates-2').then(r=>{if(!r.ok)throw Error('Nameplate patterns unavailable');return r.json();})
]).then(([img,rows])=>{if(img.naturalWidth!==1254||img.naturalHeight!==1254)throw Error('Unexpected nameplate image');atlas=img;patterns=rows;return true;}).catch(()=>false);
function glyph(p,x,y,rows){
 if(!p||p.length!==256*240*4)return false;
 for(let dy=0;dy<8;dy++)for(let dx=0;dx<8;dx++){const at=((y+dy)*256+x+dx)*4,dark=Math.max(p[at],p[at+1],p[at+2])<=100;if(dark!==!!(rows[dy]&(128>>dx)))return false;}return true;
}
function panel(p,x){return glyph(p,x,176,H)&&glyph(p,x+8,176,P)&&glyph(p,x,192,B)&&glyph(p,x+8,192,P);}
function hints(p,engine){
 if(!atlas)return[];const found=[];
 if(panel(p,48))found.push({kind:'battle',side:0,x:16,y:176});
 if(panel(p,160))found.push({kind:'battle',side:32,x:128,y:176});
 if(!found.length&&engine.text?.scan){
  const cells=engine.text.scan(p).cells||[],title=cells.filter(c=>c.y===32&&c.x>=80&&c.x<=168).sort((a,b)=>a.x-b.x).map(c=>c.text).join('').toLowerCase();
  if(title==='superskill')found.push({kind:'skill',x:32,y:32});
 }
 if(window.DreamPatternTools&&patterns.length)for(const match of window.DreamPatternTools.findMatches(p,patterns)){
  const [x,y]=match.region;if(!found.some(h=>h.x===x&&h.y===y))found.push({kind:'pattern',actor:match.actor,x,y});
 }
 return found;
}
function decode(input,found){
 const c=window.DreamWide64,b=new Uint8Array(input),r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);c.validateNative(b);
 if(r<0||w<0)return[];const forms=b[w+c.memory.formsAddress-0x6000],faces=[];
 for(const hint of found){let actor;
  if(hint.kind==='battle'){
   // Native role markers follow attacker/defender swaps. Never replace an enemy
   // because its numeric enemy ID happens to equal a party actor ID.
   if(b[r+0x2e]!==1||b[w+0x1e62+hint.side]!==0)continue;
   actor=b[r+0x30e+hint.side];
  }else if(hint.kind==='skill'){
   const slot=b[r+0x9a];if(b[r+0x2e]!==1||![6,7].includes(b[r+0x30])||slot>144||slot%18)continue;actor=b[r+0x200+slot];
  }else if(hint.kind==='pattern')actor=hint.actor;
  if(![1,3].includes(actor))continue;const on=!!(forms&(actor===1?1:2));
  faces.push({x:hint.x,y:hint.y,actor,on,cell:(actor===1?0:1)+(on?2:0)});
 }return faces;
}
function draw(ctx,width,height,faces){
 if(!atlas||!faces.length)return false;ctx.save();ctx.scale(width/256,height/240);
 for(const face of faces){const [sx,sy,sw,sh]=rects[face.cell],scale=Math.min(29/sw,29/sh),dw=sw*scale,dh=sh*scale;
  ctx.save();ctx.beginPath();ctx.rect(face.x,face.y,32,32);ctx.clip();
  ctx.fillStyle='#111c31';ctx.fillRect(face.x,face.y,32,32);
  ctx.strokeStyle=face.on?'#f5ce6a':'#809abb';ctx.lineWidth=.8;ctx.strokeRect(face.x+.4,face.y+.4,31.2,31.2);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(atlas,sx,sy,sw,sh,face.x+(32-dw)/2,face.y+(32-dh)/2,dw,dh);ctx.restore();
 }ctx.restore();return true;
}
function attach(proto){const original=proto.present;let pending=false,latest=null;
 proto.present=function(pixels){original.call(this,pixels);
  const found=this.gameId===window.DreamWide64?.ROM&&this.overlay.style.display!=='none'?hints(pixels,this):[];
  latest=found.length?{engine:this,pixels,found}:null;if(!latest||pending)return;pending=true;
  queueMicrotask(()=>{pending=false;const frame=latest;latest=null;if(!frame)return;const e=frame.engine;
   if(e.stopped||e.suspended||e.lastPixels!==frame.pixels||e.overlay.style.display==='none')return;
   try{const gm=window.EJS_emulator?.gameManager;if(gm?.getState)draw(e.out,e.overlay.width,e.overlay.height,decode(gm.getState(),frame.found));}catch{/* Keep the native portrait if state or art is unavailable. */}
  });
 };
}
window.DreamWide64Nameplates={ready,hints,decode,draw,attach,rects};
if(window.DBZSourceEnglish?.EnglishPlayer)attach(window.DBZSourceEnglish.EnglishPlayer.prototype);
})();
