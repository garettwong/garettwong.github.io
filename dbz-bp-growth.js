/* Seven-digit BP panels, native growth, and Player154 drawing-loop recovery. */
(()=>{'use strict';
const patches=[{"offset": 255601, "old": [109, 157, 0], "bytes": [32, 134, 228]}, {"offset": 255633, "old": [192, 87, 144, 40, 136, 136, 189, 4, 2, 56, 241, 3, 200, 189, 5, 2, 241, 3, 200, 189, 6, 2, 41, 127, 241, 3, 144, 0, 136, 136, 177, 3, 133, 5, 200, 177, 3, 133, 6, 200, 177, 3, 133, 7], "bytes": [76, 173, 228, 234, 234, 109, 157, 0, 176, 2, 16, 8, 169, 255, 133, 5, 133, 6, 169, 127, 96, 176, 2, 16, 10, 169, 255, 141, 4, 2, 141, 5, 2, 169, 127, 141, 6, 2, 96, 234, 234, 234, 234, 234]}, {"offset": 118102, "old": [141, 6, 2], "bytes": [32, 150, 228]}, {"offset": 209163, "old": [141, 6, 2], "bytes": [32, 150, 228]}, {"offset": 208850, "old": [201, 40, 144, 14], "bytes": [76, 212, 173, 234]}, {"offset": 122541, "old": [201, 40, 208, 5], "bytes": [76, 166, 156, 234]}, {"offset": 116416, "old": [201, 40, 144, 4], "bytes": [76, 184, 132, 234]}, {"offset": 65399, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [185, 8, 0, 208, 14, 169, 1, 157, 4, 6, 232, 200, 192, 6, 144, 240, 185, 8, 0, 9, 128, 157, 4, 6, 232, 200, 192, 7, 144, 242, 96]}, {"offset": 129587, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [185, 8, 0, 208, 14, 169, 1, 157, 4, 6, 232, 200, 192, 6, 144, 240, 185, 8, 0, 9, 128, 157, 4, 6, 232, 200, 192, 7, 144, 242, 96]}, {"offset": 64266, "old": [6], "bytes": [7]}, {"offset": 64296, "old": [32, 120, 185], "bytes": [32, 103, 189]}, {"offset": 65440, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [10, 0, 19, 39, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 0, 255]}, {"offset": 64736, "old": [206], "bytes": [144]}, {"offset": 64738, "old": [187], "bytes": [189]}, {"offset": 64745, "old": [11], "bytes": [12]}, {"offset": 64771, "old": [32, 120, 185], "bytes": [32, 103, 189]}, {"offset": 126873, "old": [6], "bytes": [7]}, {"offset": 126926, "old": [32, 33, 174], "bytes": [32, 35, 184]}, {"offset": 129632, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [6, 0, 212, 34, 138, 141, 1, 1, 1, 1, 6, 0, 244, 34, 1, 1, 1, 1, 1, 1, 6, 0, 20, 35, 140, 141, 1, 1, 1, 1, 7, 0, 52, 35, 1, 1, 1, 1, 1, 1, 1, 6, 0, 84, 35, 140, 139, 1, 1, 1, 1, 6, 0, 116, 35, 1, 1, 1, 1, 1, 1, 0, 255]}, {"offset": 127640, "old": [59], "bytes": [80]}, {"offset": 127642, "old": [177], "bytes": [184]}, {"offset": 127714, "old": [32, 33, 174], "bytes": [32, 35, 184]}, {"offset": 127730, "old": [52], "bytes": [53]}, {"offset": 129712, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [6, 0, 198, 34, 138, 141, 1, 1, 1, 1, 6, 0, 230, 34, 1, 1, 1, 1, 1, 1, 6, 0, 6, 35, 140, 141, 1, 1, 1, 1, 7, 0, 38, 35, 1, 1, 1, 1, 1, 1, 1, 6, 0, 70, 35, 140, 139, 1, 1, 1, 1, 6, 0, 102, 35, 1, 1, 1, 1, 1, 1, 0, 255]}, {"offset": 127615, "old": [253], "bytes": [160]}, {"offset": 127617, "old": [176], "bytes": [184]}, {"offset": 255502, "old": [9], "bytes": [8]}, {"offset": 255508, "old": [5], "bytes": [6]}, {"offset": 255514, "old": [9], "bytes": [8]}, {"offset": 255522, "old": [6], "bytes": [7]}];
const battleScreen=Uint8Array.from(atob("AwM7PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw9AwMDA3sBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAX8DAwMDewEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBfwMDAwN7AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQF/AwMDA3sBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAX8DAwMDewEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBfwMDAwN7AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQF/AwMDAz4/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/PzUDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD/////////////////////w8PDw8PDw8PAAAAAAAAAABVVVVVVVVVVb/v/////7/v+/7/////+/7//////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="),c=>c.charCodeAt(0));
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function prepareRom(b){
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('BP growth does not match this game.');
 for(const p of patches)b.set(p.bytes,p.offset);
}
function chunk(b,tag,size){
 const h=[...tag].map(c=>c.charCodeAt(0)).concat([0,size&255,size>>8,0,0]);
 for(let i=0;i+h.length+size<=b.length;i++)if(same(b,i,h))return i+8;
 return -1;
}
function upgradeState(input,upgrade=b=>b){
 const b=new Uint8Array(upgrade(new Uint8Array(input))).slice();
 const ram=chunk(b,'RAM',2049),reg=chunk(b,'REG',7),wrm=chunk(b,'WRM',8193),nmt=chunk(b,'NMT',2049);
 if(ram<0||reg<0||wrm<0||nmt<0)return b;
 const r=ram+1,w=wrm+1,pc=b[reg]|b[reg+1]<<8,q=r+0x600;
 // Player154's left panel had a six-tile packet but its shared writer emitted
 // seven tiles. The extra BP digit replaced the next packet's length; the BE
 // writer also replaced the terminator. No party, damage, pool or story data
 // is changed. Only this exact malformed native drawing state is recoverable.
 const inUpload=pc>=0xd26b&&pc<0xd2ae || pc>=0x7100&&pc<0x711a&&same(b,w+0x1100,[0x4a,0x6a,0x10,2,9,0x10]);
 if(!inUpload||b[r+0x2e]!==1||b[r+0x30]!==35||b[r+0x31]!==134)return b;
 if(!same(b,q,[6,0,0xc6,0x22,0x8a,0x8d])||!same(b,q+10,[6,0,0xe6,0x22])||!same(b,q+20,[6,0,6,0x23,0x8c,0x8d])||!same(b,q+30,[6,0,0x26,0x23])||!same(b,q+41,[0,0x46,0x23,0x8c,0x8b])||!same(b,q+50,[6,0,0x66,0x23]))return b;
 const bp=b.slice(q+34,q+41);
 if(!bp.every(x=>x===1||x>=0x80&&x<=0x89))return b;
 const template=patches.find(p=>p.offset===528+0x1f8a0).bytes.slice(0,-1);
 template.splice(14,6,...b.slice(q+14,q+20));
 template.splice(34,7,...bp);
 const be=b[r+0x318]|b[r+0x319]<<8;
 const digits=be===65535?[0x34,0x34,0x34,0x34]:String(be).slice(-4).padStart(4,' ').split('').map(c=>c===' '?1:0x80+Number(c));
 template.splice(57,4,...digits);
 b.set(template,q);
 // The unbounded upload has already overwritten nametable memory. Restore
 // the native battle canvas, then let the native drawing stages repopulate
 // the party panels from current RAM. Gameplay state is preserved.
 b.set(battleScreen,nmt+1);b[r+0x31]=128;
 // Restart the interrupted upload using its existing return stack. The
 // native entry resets the PPU address latch and X before reading the queue.
 b[reg]=0x6b;b[reg+1]=0xd2;
 return b;
}
window.DreamBPGrowth={prepareRom,upgradeState,maximum:8388607};
})();
