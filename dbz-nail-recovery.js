/* Native zero-HP Nail command recovery; preserve ROM and save identities. */
(()=>{'use strict';
const patches=[{"offset": 198040, "old": [173, 93, 1], "bytes": [76, 16, 111]}, {"offset": 196384, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [8, 138, 72, 165, 217, 201, 66, 208, 93, 165, 145, 201, 2, 208, 87, 173, 0, 2, 41, 191, 201, 8, 208, 78, 173, 2, 2, 13, 3, 2, 208, 70, 165, 48, 201, 2, 240, 12, 201, 3, 240, 8, 201, 34, 240, 4, 201, 37, 208, 52, 162, 18, 189, 0, 2, 201, 64, 176, 8, 189, 2, 2, 29, 3, 2, 208, 35, 138, 24, 105, 18, 170, 224, 162, 144, 232, 169, 8, 141, 0, 2, 169, 1, 141, 2, 2, 165, 48, 201, 34, 240, 4, 201, 37, 208, 6, 104, 170, 40, 76, 159, 166, 104, 170, 40, 173, 93, 1, 76, 139, 131]}],code=Uint8Array.from(patches[1].bytes);
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function wrm(b){const h=[87,82,77,0,1,32,0,0,0];for(let i=0;i+8201<=b.length;i++)if(same(b,i,h))return i+9;return -1;}
function prepareRom(b){
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('Nail recovery does not match this game revision.');
 for(const p of patches)b.set(p.bytes,p.offset);
}
function upgradeState(input,upgrade){
 let b=new Uint8Array(input).slice(),w=wrm(b);
 if(w>=0&&same(b,w+0xf10,code))b.fill(255,w+0xf10,w+0xf10+code.length);
 b=upgrade(b);w=wrm(b);
 if(w>=0&&same(b,w,[76,0,104])){
  if(!same(b,w+0xf10,new Uint8Array(code.length).fill(255)))throw Error('Unknown Nail recovery code in this save.');
  b.set(code,w+0xf10);
 }
 return b;
}
window.DreamNailRecovery={prepareRom,upgradeState};
})();
