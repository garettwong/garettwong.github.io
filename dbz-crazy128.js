/* Native unsigned 1..128 Crazy Cards runtime.  It retains Crazy64's ROM and
   save identity, layering only after the existing Crazy64 baseline is ready. */
(()=>{'use strict';
const ROM='33dcd04bc98e1d8031bba512c82086d2fcc010509227af52e3facf25f32cba67';
const FACTORS=[96,5,6,7,8,9,10,11,14,16,18,20,22,24,26,28,...Array.from({length:113},(_,i)=>2*(i+15))];
const TILES=[[]];
for(let n=1;n<=128;n++){
 const tens=Math.floor(n/10)%10,units=n%10;
 TILES[n]=n<100?[n<10?0x9a:0x90+tens,n<10?0xaa:0xa0+tens,0x90+units,0xa0+units]:[0x91,0xa1,0x90+tens,0xa0+tens,0x90+units,0xa0+units];
}
const patches=[
 {offset:528+0x17d5e,old:Array(160).fill(255),bytes:[138, 133, 0, 169, 6, 133, 1, 169, 4, 133, 5, 169, 14, 133, 6, 169, 24, 133, 7, 165, 13, 32, 171, 103, 169, 18, 133, 5, 169, 28, 133, 6, 169, 38, 133, 7, 165, 14, 32, 171, 103, 166, 16, 76, 216, 182, 160, 0, 201, 10, 144, 6, 56, 233, 10, 200, 208, 246, 96, 9, 144, 145, 0, 24, 73, 48, 200, 145, 0, 169, 0, 96, 169, 10, 76, 153, 103, 133, 2, 201, 100, 144, 32, 56, 233, 100, 133, 2, 169, 1, 164, 5, 32, 153, 103, 165, 2, 32, 140, 103, 133, 2, 152, 164, 6, 32, 153, 103, 165, 2, 164, 7, 76, 153, 103, 165, 5, 201, 18, 208, 8, 165, 6, 133, 5, 165, 7, 133, 6, 165, 2, 32, 140, 103, 133, 2, 152, 208, 8, 164, 5, 32, 166, 103, 76, 247, 103, 152, 164, 5, 32, 153, 103, 165, 2, 164, 6, 76, 153, 103]},
 {offset:528+0x769e,old:[0xa5,13,0x20],bytes:[0x4c,0x5e,0x67]},
 {offset:528+0x177a1,old:[0x41],bytes:[0x81]},
 {offset:528+0x2fd7f,old:Array(129).fill(255),bytes:FACTORS},
 {offset:528+0x37773,old:[0xb9,0x46,0x6d],bytes:[0xb9,0x7f,0x6f]},
 {offset:528+0x3780d,old:[0xb9,0x46,0x6d],bytes:[0xb9,0x7f,0x6f]},
 {offset:528+0x147dd,old:[0xb9,0,0x7c],bytes:[0xb9,0,0x7f]},
 {offset:528+0x17f36,old:[0x99,0,0x7c,0x48,0xa9,0x43,0x8d,0x44,0x7c,0xa9,0x52,0x8d,0x45,0x7c,0xa9,0x54,0x8d,0x46,0x7c,0xa9,0x32,0x8d,0x47,0x7c,0x68,0x60],bytes:[0x99,0,0x7f,0x48,0xa9,0x43,0x8d,0x44,0x7c,0xa9,0x52,0x8d,0x45,0x7c,0xa9,0x54,0x8d,0x46,0x7c,0xa9,0x33,0x8d,0x47,0x7c,0x68,0x60]}
];
const CRT2=[67,82,84,50],CRT3=[67,82,84,51];
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function chunk(b,tag,size){const h=[...tag].map(c=>c.charCodeAt(0)).concat([0,(size+1)&255,(size+1)>>8,0,0,0]);for(let i=0;i+size+9<=b.length;i++)if(same(b,i,h))return i+9;return-1;}
function residentOffset(offset){const p=offset-528;if(p>=0x17600&&p<0x17f00)return p-0x17600;if(p>=0x2f700&&p<0x2fe00)return 0x900+p-0x2f700;return-1;}
function prepareRom(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('Crazy128 does not match the verified Crazy64 ROM.');
 for(const p of patches)b.set(p.bytes,p.offset);
 return b;
}
function mapPhase(b,r){return r>=0&&b[r+0x2e]===6&&[3,4].includes(b[r+0x30])&&[1,3].includes(b[r+0x31]);}
function upgradeState(input,parent){
 let b=new Uint8Array(input).slice(),w=chunk(b,'WRM',8192),r=chunk(b,'RAM',2048),had128=false;
 if(w>=0){
  had128=same(b,w+0x1c44,CRT3);
  // Present the exact native64 resident image to older wrappers.
  for(const p of patches){const at=residentOffset(p.offset);if(at>=0&&same(b,w+at,p.bytes))b.set(p.old,w+at);}
  if(had128)b.set(CRT2,w+0x1c44);
 }
 b=(parent||((x)=>x))(b); w=chunk(b,'WRM',8192);r=chunk(b,'RAM',2048);
 if(w<0)return b;
 for(const p of patches){const at=residentOffset(p.offset);if(at>=0){if(!same(b,w+at,p.old)&&!same(b,w+at,p.bytes))throw Error('Unknown native card code in this save.');b.set(p.bytes,w+at);}}
 // Only a live map route is migrated. Training owns $7F00 transiently.
 if(!had128&&mapPhase(b,r)&&same(b,w+0x1c44,CRT2)){
  const count=Math.min(68,b[r+0x72]); b.set(b.slice(w+0x1c00,w+0x1c00+count),w+0x1f00);
 }
 if(had128||mapPhase(b,r)||same(b,w+0x1c44,CRT2))b.set(CRT3,w+0x1c44);
 return b;
}
window.DreamCrazy128={ROM,MAX_ATTACK:128,MAX_DEFENSE:128,TILES,FACTORS,patches,prepareRom,prepareCards:prepareRom,upgradeState};
})();
