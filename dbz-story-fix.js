/* Preserve the original encounter identity when an expanded battle finishes. */
(()=>{'use strict';
const ROMS=['cec2b5c219d64cc624c6a6a4e77d349ea4b24a57e977177a9d9c1030f672a7b9','7bd22dd6ef86431e47cb01cf711cb122279c9eb14735c1da23d37282e1bfd9ae'];
const patches=[{"offset": 201025, "old": [32, 86, 144], "bytes": [32, 0, 108]}, {"offset": 195600, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [173, 113, 115, 201, 165, 208, 34, 36, 123, 112, 30, 32, 27, 105, 192, 0, 208, 23, 162, 0, 189, 0, 117, 201, 64, 176, 2, 9, 64, 157, 162, 2, 138, 24, 105, 18, 170, 224, 90, 144, 235, 76, 86, 144]}];
const code=Uint8Array.from(patches[1].bytes);
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function chunk(b,tag,size){const head=[...tag].map(c=>c.charCodeAt(0)).concat([0,(size+1)&255,(size+1)>>8,0,0,0]);for(let i=0;i+size+9<=b.length;i++)if(same(b,i,head))return i+9;return -1;}
function prepareRom(b){
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('Story completion repair does not match this game revision.');
 for(const p of patches)b.set(p.bytes,p.offset);
}
function upgradeState(input,upgrade){
 let b=new Uint8Array(input).slice();let w=chunk(b,'WRM',8192);
 // Normalize only our exact helper before the existing full resident validation.
 if(w>=0&&same(b,w+0xc00,code))b.fill(255,w+0xc00,w+0xc00+code.length);
 b=upgrade(b);w=chunk(b,'WRM',8192);
 if(w>=0&&same(b,w,[0x4c,0,0x68])){
  if(!same(b,w+0xc00,new Uint8Array(code.length).fill(255)))throw Error('Unknown story completion code in this save.');
  b.set(code,w+0xc00);
  recoverZarbon(b,w);
 }
 return b;
}
function recoverZarbon(b,w){
 const r=chunk(b,'RAM',2048);if(r<0||b[r+0x2e]!==6||b[r+0x7b]&64||b[r+0xe3]&64||b[w+0x1371]!==165||b[w+0x1500]!==23)return;
 const total=b[w+0x1372],page=b[w+0x1370];
 if(total<80||total>100||page>=Math.ceil(total/5))return;
 if(!Array.from({length:5},(_,i)=>r+0x511+i*8).some(a=>b[a]===14&&(b[a+1]&127)===0))return;
 for(let i=0;i<total;i++)if(b[Math.floor(i/5)===page?r+0x2a2+(i%5)*18:i<20?w+0x1200+i*18:w+0x1600+(i-20)*18]<64)return;
 // This exact older-save signature completed form one but missed its event.
 // Enter the original mode dispatcher and transformation script. The player
 // keeps earned progress and still has to defeat the genuine second form.
 const head=[82,69,71,0,7,0,0,0];let g=-1;
 for(let i=0;i+15<=b.length;i++)if(same(b,i,head)){g=i+8;break;}
 if(g<0)return;
 for(let i=0;i<5;i++){const id=b[w+0x1500+i*18];b[r+0x2a2+i*18]=id<64?id|64:id;}
 b[r+0xd9]=49;b[g]=12;b[g+1]=203;b[g+3]=0;
}
window.DreamStoryFix={ROMS,prepareRom,upgradeState};
})();
