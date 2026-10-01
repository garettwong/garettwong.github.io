/* Read-only full-roster view for the selectable-size battle ROM. */
(function(global){
'use strict';
const ROM='5300803a3f7481ccbe31e28959bfa1ae0831492581c4d79131d9b9d95d334414';
let api=null,timer=null,battle=null,lastError='',portraits=new Map();

function chunk(bytes,tag,size){
 for(let i=0;i+size+9<=bytes.length;i++){
  if(bytes[i]!==tag.charCodeAt(0)||bytes[i+1]!==tag.charCodeAt(1)||bytes[i+2]!==tag.charCodeAt(2)||bytes[i+3]!==0)continue;
  const length=bytes[i+4]+bytes[i+5]*256+bytes[i+6]*65536+bytes[i+7]*16777216;
  if(length===size+1&&bytes[i+8]===0)return bytes.subarray(i+9,i+9+size);
 }
 return null;
}

function decode(bytes){
 const ram=chunk(bytes,'RAM',2048),wram=chunk(bytes,'WRM',8192);
 if(!ram||!wram||ram[0x2e]!==1||wram[0x1371]!==0xa5)return null;
 const total=wram[0x1372],page=wram[0x1370];
 if(total<10||total>40||page>=Math.ceil(total/5)||(total>20&&wram[0x1394]!==0x81))return null;
 const enemies=[];
 for(let i=0;i<total;i++){
  // The current page can have newer combat results than its stored pool copy.
  const current=Math.floor(i/5)===page;
  const data=current?ram:wram,at=current?0x2a2+(i%5)*18:i<20?0x1200+i*18:0x1600+(i-20)*18;
  const id=data[at],hp=data[at+2]+256*data[at+3];
  enemies.push({index:i,id,type:data[at+12]&0x3f,hp,alive:id<0x40&&hp>0});
 }
 return {total,page,phase:ram[0x30],selected:ram[0x30]===8?page*5+ram[0x70]:-1,enemies,remaining:enemies.filter(e=>e.alive).length};
}

function poll(){
 if(!api?.active())return;
 try{battle=decode(new Uint8Array(api.gm().getState()));lastError='';}
 catch(error){battle=null;lastError=String(error.message||error);}
}

function start(options){
 api=options;if(timer)clearInterval(timer);
 // Poll outside the emulator's rendering callback: save-state reads are not reentrant.
 timer=setInterval(poll,125);poll();
}
function reset(){battle=null;portraits.clear();}

function cachePortraits(pixels,b){
 if(b.phase<2||b.phase>9)return;
 for(let slot=0;slot<5;slot++){
  const enemy=b.enemies[b.page*5+slot];if(!enemy?.alive||portraits.has(enemy.type))continue;
  const sx=48+slot*32,sy=112,rgba=new Uint8ClampedArray(32*32*4);let lit=0;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   const from=((sy+y)*256+sx+x)*4,to=(y*32+x)*4;
   rgba.set(pixels.subarray(from,from+4),to);
   if(Math.max(rgba[to],rgba[to+1],rgba[to+2])>80)lit++;
  }
  if(lit<100)continue;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  canvas.getContext('2d').putImageData(new ImageData(rgba,32,32),0,0);
  portraits.set(enemy.type,canvas);
 }
}

function draw(ctx,pixels,width,height){
 const b=battle;if(!b||b.phase<2||b.phase>9)return;
 cachePortraits(pixels,b);
 ctx.save();ctx.scale(width/256,height/240);
 ctx.fillStyle='#05070c';ctx.fillRect(0,94,256,68);
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='700 7px Arial,sans-serif';
 ctx.fillStyle='#ffe29a';ctx.fillText(`${b.total} OPPONENTS · ${b.remaining} REMAINING`,128,102);
 const rows=Math.ceil(b.total/10);
 for(const enemy of b.enemies){
  const row=Math.floor(enemy.index/10),column=enemy.index%10;
  const inRow=Math.min(10,b.total-row*10),left=(256-inRow*24)/2;
  const compact=rows>2,size=compact?10:18,step=compact?14:27;
  const x=left+column*24+(24-size)/2,y=106+row*step;
  const selected=enemy.index===b.selected,portrait=portraits.get(enemy.type);
  ctx.globalAlpha=enemy.alive?1:.3;
  if(portrait){ctx.imageSmoothingEnabled=false;ctx.drawImage(portrait,x,y,size,size);}
  else{ctx.fillStyle='#415272';ctx.fillRect(x,y,size,size);ctx.fillStyle='#fff';ctx.font='700 8px Arial';ctx.fillText(String(enemy.index+1),x+size/2,y+size*.75);}
  ctx.globalAlpha=1;
  if(selected){ctx.strokeStyle='#ffd45e';ctx.lineWidth=1.5;ctx.strokeRect(x-1,y-1,size+2,size+2);}
  if(!enemy.alive){ctx.strokeStyle='#f47272';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+size-2,y+size-2);ctx.moveTo(x+size-2,y+3);ctx.lineTo(x+3,y+size-2);ctx.stroke();}
  ctx.font='600 5.5px Arial,sans-serif';ctx.fillStyle=selected?'#ffd45e':enemy.alive?'#f0f3fa':'#8b91a0';
  ctx.fillText(`${enemy.index+1}`,compact?x+size+4:x+size/2,compact?y+8:y+24);
 }
 ctx.restore();
}

global.DreamLargeBattle={ROM,start,reset,draw,decode,inspect:()=>battle?{...battle,enemies:battle.enemies.map(e=>({...e})),portraits:portraits.size,error:lastError}:null};
})(typeof window==='undefined'?globalThis:window);
