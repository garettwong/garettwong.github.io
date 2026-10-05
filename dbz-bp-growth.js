/* Remove per-character BP caps; preserve the engine's reserved high bit. */
(()=>{'use strict';
const patches=[{"offset": 255606, "old": [160, 87, 165, 5], "bytes": [32, 134, 228, 234]}, {"offset": 255633, "old": [192, 87, 144, 40, 136, 136, 189, 4, 2, 56, 241, 3, 200, 189, 5, 2, 241, 3, 200, 189, 6, 2, 41, 127, 241, 3, 144, 0, 136, 136, 177, 3, 133, 5, 200, 177, 3, 133, 6, 200, 177, 3, 133, 7], "bytes": [76, 173, 228, 234, 234, 176, 4, 165, 7, 16, 10, 169, 255, 133, 5, 133, 6, 169, 127, 133, 7, 160, 87, 165, 5, 96, 176, 2, 16, 10, 169, 255, 141, 4, 2, 141, 5, 2, 169, 127, 141, 6, 2, 96]}, {"offset": 118102, "old": [141, 6, 2], "bytes": [32, 155, 228]}, {"offset": 209163, "old": [141, 6, 2], "bytes": [32, 155, 228]}];
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function prepareRom(b){
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('BP growth does not match this game.');
 for(const p of patches)b.set(p.bytes,p.offset);
}
window.DreamBPGrowth={prepareRom,maximum:8388607};
})();
