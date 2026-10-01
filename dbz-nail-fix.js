/* Native blank-label fix and narrowly detected interrupted-draw recovery. */
(()=>{'use strict';
const ROMS=['5300803a3f7481ccbe31e28959bfa1ae0831492581c4d79131d9b9d95d334414','e16062d3cabe3c7c84be496c401ee4b5d0e333129be2fda3d70c9898dd2595b8'];
const patches=[{"offset":262539,"old":[255,255,255,255],"bytes":[1,1,1,0]},{"offset":257499,"old":[253,236],"bytes":[125,255]},{"offset":257645,"old":[253,236],"bytes":[123,255]},{"offset":257647,"old":[253,236],"bytes":[125,255]},{"offset":257655,"old":[253,236],"bytes":[125,255]},{"offset":257669,"old":[253,236],"bytes":[125,255]},{"offset":257671,"old":[253,236],"bytes":[125,255]}];
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function prepareRom(b){
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('The English menu repair does not match this game.');
 for(const p of patches)b.set(p.bytes,p.offset);
}
function locate(b,tag,size){
 const a=[...tag].map(c=>c.charCodeAt(0)).concat([0,size&255,size>>8&255,0,0]);
 for(let i=0;i+a.length+size<=b.length;i++)if(same(b,i,a))return i+8;
 return -1;
}
function upgradeState(input){
 const b=new Uint8Array(input).slice(),r0=locate(b,'RAM',2049),w0=locate(b,'WRM',8193),g=locate(b,'REG',7),nt0=locate(b,'NMT',2049),ppu=locate(b,'PPU',2628);
 if([r0,w0,g,nt0,ppu].some(x=>x<0)||b[r0]!==0||b[w0]!==0||b[nt0]!==0)return b;
 const r=r0+1,w=w0+1,nt=nt0+1,pc=b[g]|b[g+1]<<8;
 // Exact reproduced freeze: single-Nail story, menu substep $8B, stuck inside
 // NMI's malformed PPU copy with its native return stack still intact.
 if(b[r+0x2e]!==1||b[r+0x30]!==2||b[r+0x31]!==0x8b||b[r+0xd9]!==66||b[r+0x200]!==8||b[r+0x91]!==2||b[r+0x37]!==7||pc<0xd290||pc>0xd2a6||b[g+2]!==0xf3||!same(b,r+0x1f4,[0x72,0xcb,0x0c]))return b;
 // Rebuild only display state. Party stats, cards, inventory, script progress,
 // chosen count and all enemy records remain byte-for-byte untouched.
 for(const [a,v] of [[0x600,0],[0x30,0],[0x31,0],[0x55,255],[0x59,128]])b[r+a]=v;
 for(const page of [0,1024]){b.fill(3,nt+page,nt+page+960);b.fill(255,nt+page+960,nt+page+1024);}
 b.fill(0,nt+12*32,nt+20*32);
 // Rebuild enemy sprite descriptors, then finish the interrupted native NMI.
 b.set([0x20,0x6a,0xb9,0x4c,0x9d,0xcb],w+0xe00);
 b.set([0x00,0x6e,0xf5],g);b[g+6]=0x24;
 const pg=ppu+8;if(!same(b,ppu,[82,69,71,0,11,0,0,0]))return new Uint8Array(input).slice();
 b[pg]=b[r+0x46];b[pg+1]=b[r+0x47];
 return b;
}
window.DreamNailFix={ROMS,prepareRom,upgradeState};
})();
