/* Read-only live-v2 enemy Scouter digits. No gameplay or save changes. */
(()=>{'use strict';
const B=[0,124,102,102,124,102,102,124],P=[0,124,102,102,124,96,96,96];
const group=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
function decode(input){
 const c=window.DreamWide64,b=new Uint8Array(input),r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);
 if(r<0||w<0||b[r+0x2e]!==1||b[r+0x30]!==19)return null;
 c.validateNative(b);
 const stage=b[r+0x70],offset=b[r+0x9a],expanded=b[w+0x1371]===165,total=expanded?b[w+0x1372]:5,page=expanded?b[w+0x1370]:0;
 if(stage<1||stage>4||offset>72||offset%18||total<1||total>100||page>=Math.ceil(total/5))return null;
 // $AB is reset by the original six-digit overflow animation. $9A remains
 // the selected enemy's latched record offset, including that animation.
 const index=page*5+offset/18,at=r+0x2a2+offset,id=b[at];
 if(index>=total||id>=128)return null;
 let bp=BigInt(b[at+4])+BigInt(b[at+5])*256n+BigInt(b[at+6])*65536n;
 for(let j=0;j<5;j++)bp|=BigInt(b[w+c.enemyHighByteAddresses[index*5+j]-0x6000])<<(24n+8n*BigInt(j));
 const hp=b[at+2]+256*b[at+3],shift=b[r+0x4c8];
 return {index,id:id&63,bp:bp.toString(),hp,invulnerable:hp===65535,dead:!!(id&64)||hp===0,stage,y:(88+shift)&255,moving:shift!==0};
}
function glyph(p,x,y,rows){
 if(y<0||y+8>240||!p||p.length!==256*240*4)return false;
 for(let dy=0;dy<8;dy++)for(let dx=0;dx<8;dx++){
  const at=((y+dy)*256+x+dx)*4,lit=Math.max(p[at],p[at+1],p[at+2])>100;
  if(lit!==!!(rows[dy]&(128>>dx)))return false;
 }return true;
}
function nativeDigits(p,y){return glyph(p,96,y,B)&&glyph(p,104,y,P);}
function possibleScene(p){for(let y=40;y<=104;y+=2)if(nativeDigits(p,y))return true;return false;}
function draw(ctx,pixels,width,height,v){
 if(!v||!nativeDigits(pixels,v.y))return false;
 ctx.save();ctx.scale(width/256,height/240);ctx.fillStyle='#000';
 if(v.moving){ctx.fillRect(96,v.y,64,8);if(v.y+64<=240)ctx.fillRect(100,v.y+56,56,8);ctx.restore();return true;}
 ctx.fillRect(24,86,208,13);ctx.fillRect(24,142,208,14);
 ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#d7ff66';ctx.font='700 7px Arial,sans-serif';
 ctx.fillText(`Enemy ${v.index+1} · BP ${group(v.bp)}`,128,88,204);
 const hp=v.invulnerable?'Invulnerable (65,535)':group(v.hp);
 ctx.fillText(`Current HP ${hp}${v.dead?' · defeated':''}`,128,144,204);
 ctx.restore();return true;
}
// The native upload callback is inside emulation. Read state only after it
// returns, and only for the latest frame that actually contains Scouter digits.
function attach(proto){
 const original=proto.present;let pending=false,latest=null;
 proto.present=function(pixels){
  original.call(this,pixels);
  latest=this.gameId===window.DreamWide64?.ROM&&this.overlay.style.display!=='none'&&possibleScene(pixels)?{engine:this,pixels}:null;
  if(!latest||pending)return;pending=true;
  queueMicrotask(()=>{pending=false;const frame=latest;latest=null;if(!frame)return;
   const e=frame.engine;if(e.stopped||e.suspended||e.lastPixels!==frame.pixels||e.overlay.style.display==='none')return;
   try{const gm=window.EJS_emulator?.gameManager;if(!gm?.getState)return;const v=decode(gm.getState());draw(e.out,frame.pixels,e.overlay.width,e.overlay.height,v);}catch{/* Leave the native display if the edition/state is unavailable. */}
  });
 };
}
window.DreamWide64EnemyInfo={decode,draw,nativeDigits,possibleScene,attach};
if(window.DBZSourceEnglish?.EnglishPlayer)attach(window.DBZSourceEnglish.EnglishPlayer.prototype);
})();
