/* Read-only current enemy stats for Scouter and native battle panels. */
(()=>{'use strict';
const B=[0,124,102,102,124,102,102,124],P=[0,124,102,102,102,124,96,96],H=[0,102,102,102,126,102,102,102];
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
function glyph(p,x,y,rows,dark=false){
 if(y<0||y+8>240||!p||p.length!==256*240*4)return false;
 for(let dy=0;dy<8;dy++)for(let dx=0;dx<8;dx++){
  const at=((y+dy)*256+x+dx)*4,lit=Math.max(p[at],p[at+1],p[at+2])>100;
  if((dark?!lit:lit)!==!!(rows[dy]&(128>>dx)))return false;
 }return true;
}
function nativeDigits(p,y){return glyph(p,96,y,B)&&glyph(p,104,y,P);}
function possibleScene(p){for(let y=0;y<=232;y++)if(nativeDigits(p,y))return true;return false;}
function nativeHud(p,x=160){return glyph(p,x,176,H,true)&&glyph(p,x+8,176,P,true)&&glyph(p,x,192,B,true)&&glyph(p,x+8,192,P,true);}
function decodeHud(input,side=32){
 const c=window.DreamWide64,b=new Uint8Array(input),r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);
 if(r<0||w<0||![0,32].includes(side)||b[r+0x2e]!==1||b[w+0x1390]===165)return null;
 c.validateNative(b);
 const shown=r+0x30e+side,id=b[shown],role=b[w+0x1e62+side];
 if(id>=128||role>1)return null;let index;
 if(role===1){
  const offset=b[r+0x34d],expanded=b[w+0x1371]===165,total=expanded?b[w+0x1372]:5,page=expanded?b[w+0x1370]:0;
  if(offset>72||offset%18||total<1||total>100||page>=Math.ceil(total/5))return null;
  const stored=b[r+0x2a2+offset];index=page*5+offset/18;if(index>=total||stored>=128||(stored&63)!==(id&63))return null;
 }else if(!c.memory.partyActorIds.includes(id&63))return null;
 // The native HUD's $B087/$70D2 writers read this displayed combat record's
 // HP and the corresponding 64-bit working BP, NOT the stored enemy roster.
 // Temporary damage and battle modifiers can precede roster writeback.
 const working=w+c.memory.workingBpAddresses[side===0?0:1]-0x6000;
 let bp=0n;for(let j=7;j>=0;j--)bp=bp*256n+BigInt(b[working+j]);
 const actor=id&63,forms=b[w+c.memory.formsAddress-0x6000];
 if(role===0&&((actor===1&&forms&1)||(actor===3&&forms&2)))bp=bp*100n>((1n<<64n)-1n)?((1n<<64n)-1n):bp*100n;
 const hp=b[shown+2]+256*b[shown+3];
 return {index,side,role,bp:bp.toString(),hp,invulnerable:hp===65535};
}
function hudNumber(n){const s=String(n);return s.length<=9?group(s):`${s.slice(0,1)}.${s.slice(1,4)}E${s.length-1}`;}
function drawHud(ctx,pixels,width,height,v){
 const x=v?.side===0?48:160;if(!v||!nativeHud(pixels,x))return false;
 ctx.save();ctx.scale(width/256,height/240);ctx.fillStyle='#f7d8a5';
 ctx.fillRect(x-2,183,66,9);ctx.fillRect(x-2,199,66,9);
 ctx.fillStyle='#000';ctx.textAlign='right';ctx.textBaseline='top';ctx.font='700 7px Arial,sans-serif';
 ctx.fillText(v.invulnerable?'INVULN':group(v.hp),x+62,184,64);
 ctx.fillText(hudNumber(v.bp),x+62,200,64);ctx.restore();return true;
}
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
  latest=this.gameId===window.DreamWide64?.ROM&&this.overlay.style.display!=='none'&&(nativeHud(pixels)||nativeHud(pixels,48)||possibleScene(pixels))?{engine:this,pixels}:null;
  if(!latest||pending)return;pending=true;
  queueMicrotask(()=>{pending=false;const frame=latest;latest=null;if(!frame)return;
   const e=frame.engine;if(e.stopped||e.suspended||e.lastPixels!==frame.pixels||e.overlay.style.display==='none')return;
   try{const gm=window.EJS_emulator?.gameManager;if(!gm?.getState)return;const state=gm.getState();if(nativeHud(frame.pixels)||nativeHud(frame.pixels,48)){for(const side of [0,32])if(nativeHud(frame.pixels,side===0?48:160))drawHud(e.out,frame.pixels,e.overlay.width,e.overlay.height,decodeHud(state,side));}else draw(e.out,frame.pixels,e.overlay.width,e.overlay.height,decode(state));}catch{/* Leave the native display if the edition/state is unavailable. */}
  });
 };
}
window.DreamWide64EnemyInfo={decode,draw,decodeHud,drawHud,nativeHud,hudNumber,nativeDigits,possibleScene,attach};
if(window.DBZSourceEnglish?.EnglishPlayer)attach(window.DBZSourceEnglish.EnglishPlayer.prototype);
})();

