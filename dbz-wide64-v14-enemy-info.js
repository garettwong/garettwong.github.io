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
 const waveOffset=b[w+0x13b5]===0xb8?b[w+0x139a]+256*b[w+0x139b]-total:0;
 return {index,globalIndex:index+waveOffset,id:id&63,bp:bp.toString(),hp,invulnerable:hp===65535,dead:!!(id&64)||hp===0,stage,y:(88+shift)&255,moving:shift!==0};
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
 if(role===0&&((actor===1&&forms&1)||(actor===3&&forms&2))){const factor=forms&(actor===1?4:8)?10000n:100n;bp=bp*factor>((1n<<64n)-1n)?((1n<<64n)-1n):bp*factor;}
 const hp=b[shown+2]+256*b[shown+3];
 return {index,side,role,bp:bp.toString(),hp,invulnerable:hp===65535};
}
// Keep every decimal digit, including values above Number.MAX_SAFE_INTEGER.
function hudNumber(n){return String(n);}
function numberLines(n){const s=hudNumber(n);return s.length<=10?[s]:[s.slice(0,-10),s.slice(-10)];}
function exactNumber(ctx,n,x,y,width,height=16){
 const lines=numberLines(n),size=lines.length===1?8:7.5;
 ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();
 ctx.textAlign='right';ctx.textBaseline='top';ctx.font=`700 ${size}px Arial,sans-serif`;
 for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x+width-1,y+i*8,width-2);
 ctx.restore();
}
const names={Goku:1,Piccolo:2,Gohan:3,Krillin:4,Yamcha:5,Tien:6,Chaozu:7,Chiaotzu:7,Nail:8,Vegeta:42};
function rewardHint(p,engine){
 if(!engine.text?.scan)return null;
 const cells=engine.text.scan(p).cells;
 const line=y=>cells.filter(c=>c.y===y).map(c=>c.text).join('');
 const first=cells.find(c=>c.y===48&&c.x===32);
 return first&&line(32).endsWith('gained')&&line(48).endsWith('BP!')?{x:32,y:48,bg:first.bg,ink:first.ink}:null;
}
function decodeReward(input){
 const c=window.DreamWide64,b=new Uint8Array(input),r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);
 if(r<0||w<0||![3,4,5,12].includes(b[r+0x2e]))return null;c.validateNative(b);
 let n=0n;const at=w+c.memory.rewardAddress-0x6000;
 for(let i=7;i>=0;i--)n=n*256n+BigInt(b[at+i]);return n.toString();
}
function drawReward(ctx,pixels,width,height,hint,value){
 if(!hint||value===null)return false;
 const color=n=>`rgb(${n&255},${n>>>8&255},${n>>>16&255})`;
 ctx.save();ctx.scale(width/256,height/240);ctx.fillStyle=color(hint.bg);ctx.fillRect(32,48,200,8);
 ctx.fillStyle=color(hint.ink);ctx.font='600 8px Arial,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
 ctx.fillText(`${value} BP!`,32.3,48,199);ctx.restore();return true;
}
function menuHints(p,engine){
 const list=glyph(p,80,16,H,true)&&glyph(p,88,16,P,true)&&glyph(p,136,16,B,true)&&glyph(p,144,16,P,true);
 const battle=glyph(p,24,32,H,true)&&glyph(p,32,32,P,true)&&glyph(p,24,56,B,true)&&glyph(p,32,56,P,true);
 if((!list&&!battle)||!engine.text?.scan)return[];
 const cells=engine.text.scan(p).cells,rows=[];
 for(const [x,y] of list?Array.from({length:9},(_,i)=>[24,32+i*24]):[[48,24],[112,24],[176,24]]){
  const text=cells.filter(c=>c.y===y&&c.x>=x&&c.x<x+56).sort((a,b)=>a.x-b.x).map(c=>c.text).join('');
  const found=Object.entries(names).find(([name])=>text===name);
  if(found)rows.push({actor:found[1],combat:!list,x:list?136:x,y:list?y:56,width:56,height:16});
 }return rows;
}
function decodeMenu(input,hints){
 const c=window.DreamWide64,b=new Uint8Array(input),r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);
 if(r<0||w<0)return[];c.validateNative(b);
 const forms=b[w+c.memory.formsAddress-0x6000],max=(1n<<64n)-1n,rows=[];
 for(const h of hints){const slot=c.memory.partyActorIds.indexOf(h.actor);
  if(slot<0||!Array.from({length:9},(_,i)=>b[r+0x200+i*18]&63).includes(h.actor))continue;
  let bp=0n;const p=w+c.memory.partyBpStart-0x6000+slot*8;
  for(let i=7;i>=0;i--)bp=bp*256n+BigInt(b[p+i]);
  const baseBp=bp.toString(),superSaiyan=!!(h.combat&&((h.actor===1&&(forms&1))||(h.actor===3&&(forms&2))));
  const stageII=superSaiyan&&!!(forms&(h.actor===1?4:8)),factor=stageII?10000n:100n;if(superSaiyan)bp=bp*factor>max?max:bp*factor;
  rows.push({...h,bp:bp.toString(),baseBp,superSaiyan,stageII});
 }return rows;
}
function drawMenu(ctx,pixels,width,height,rows){
 ctx.save();ctx.scale(width/256,height/240);
 for(const row of rows){const at=(row.y*256+row.x)*4;
  ctx.fillStyle=`rgb(${pixels[at]},${pixels[at+1]},${pixels[at+2]})`;ctx.fillRect(row.x,row.y,row.width,row.height);
  ctx.fillStyle='#000';exactNumber(ctx,row.bp,row.x,row.y,row.width,row.height);
  if(row.superSaiyan){ctx.font='700 6px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(row.stageII?'SSJ II ×10,000':'SSJ I ×100',row.x+row.width/2,row.y-8,row.width-2);}
 }ctx.restore();return rows.length>0;
}
function drawHud(ctx,pixels,width,height,v){
 const x=v?.side===0?48:160;if(!v||!nativeHud(pixels,x))return false;
 // Each stat panel ends at the adjacent card/portrait. Replace the whole
 // native HP/BP area, including the old digits on the label rows; the former
 // 66px strips missed those digits and painted across the neighbouring art.
 const at=(176*256+x)*4;
 ctx.save();ctx.scale(width/256,height/240);
 ctx.fillStyle=`rgb(${pixels[at]},${pixels[at+1]},${pixels[at+2]})`;
 ctx.fillRect(x,176,48,32);
 ctx.fillStyle='#000';ctx.textBaseline='top';ctx.font='700 7px Arial,sans-serif';
 // BP occupies two eight-pixel lines for 11–20 digits. Keep HP on one row.
 ctx.fillStyle='#000';ctx.textAlign='left';ctx.fillText('HP',x+1,176);
 ctx.textAlign='right';ctx.fillText(v.invulnerable?'INVULN':group(v.hp),x+46,176,33);
 ctx.textAlign='left';ctx.fillText('BP',x+1,184);
 exactNumber(ctx,v.bp,x,192,48);ctx.restore();return true;
}
function draw(ctx,pixels,width,height,v){
 if(!v||!nativeDigits(pixels,v.y))return false;
 ctx.save();ctx.scale(width/256,height/240);ctx.fillStyle='#000';
 if(v.moving){ctx.fillRect(96,v.y,64,8);if(v.y+64<=240)ctx.fillRect(100,v.y+56,56,8);ctx.restore();return true;}
 ctx.fillRect(24,86,208,13);ctx.fillRect(24,142,208,14);
 ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#d7ff66';ctx.font='700 7px Arial,sans-serif';
 ctx.fillText(`Enemy ${(v.globalIndex??v.index)+1} · BP ${group(v.bp)}`,128,88,204);
 const hp=v.invulnerable?'Invulnerable (65,535)':group(v.hp);
 ctx.fillText(`Current HP ${hp}${v.dead?' · defeated':''}`,128,144,204);
 ctx.restore();return true;
}
// The native upload callback is inside emulation. Read state only after it
// returns, and only for the latest frame containing a recognized stat panel.
function attach(proto){
 const original=proto.present;let pending=false,latest=null;
 proto.present=function(pixels){
  original.call(this,pixels);
  const eligible=this.gameId===window.DreamWide64?.ROM&&this.overlay.style.display!=='none',hints=eligible?menuHints(pixels,this):[],reward=eligible?rewardHint(pixels,this):null;
  latest=eligible&&(reward||hints.length||nativeHud(pixels)||nativeHud(pixels,48)||possibleScene(pixels))?{engine:this,pixels,hints,reward}:null;
  if(!latest||pending)return;pending=true;
  queueMicrotask(()=>{pending=false;const frame=latest;latest=null;if(!frame)return;
   const e=frame.engine;if(e.stopped||e.suspended||e.lastPixels!==frame.pixels||e.overlay.style.display==='none')return;
   try{const gm=window.EJS_emulator?.gameManager;if(!gm?.getState)return;const state=gm.getState();if(frame.reward)drawReward(e.out,frame.pixels,e.overlay.width,e.overlay.height,frame.reward,decodeReward(state));else if(frame.hints.length)drawMenu(e.out,frame.pixels,e.overlay.width,e.overlay.height,decodeMenu(state,frame.hints));else if(nativeHud(frame.pixels)||nativeHud(frame.pixels,48)){for(const side of [0,32])if(nativeHud(frame.pixels,side===0?48:160))drawHud(e.out,frame.pixels,e.overlay.width,e.overlay.height,decodeHud(state,side));}else draw(e.out,frame.pixels,e.overlay.width,e.overlay.height,decode(state));}catch{/* Leave the native display if the edition/state is unavailable. */}
  });
 };
}
window.DreamWide64EnemyInfo={decode,draw,decodeHud,drawHud,nativeHud,hudNumber,numberLines,exactNumber,menuHints,decodeMenu,drawMenu,rewardHint,decodeReward,drawReward,nativeDigits,possibleScene,attach};
if(window.DBZSourceEnglish?.EnglishPlayer)attach(window.DBZSourceEnglish.EnglishPlayer.prototype);
})();
