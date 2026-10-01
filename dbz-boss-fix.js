/* Preserve Zarbon's native two-stage story battle in the 10–20 edition. */
(()=>{'use strict';
const ROM='5300803a3f7481ccbe31e28959bfa1ae0831492581c4d79131d9b9d95d334414';
const patches=[{"offset":96272,"old":[169,0,141,113,115],"bytes":[76,0,109,234,234]},{"offset":97112,"old":[32,244,96],"bytes":[76,35,109]},{"offset":195856,"old":[255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255],"bytes":[169,0,141,113,115,162,0,189,162,2,41,63,201,23,240,18,201,25,240,14,138,24,105,18,170,201,90,144,234,169,0,76,5,96,96,173,113,115,240,6,32,244,96,76,75,99,162,0,189,162,2,201,64,176,3,32,115,180,138,24,105,18,170,201,90,144,237,76,132,164]},{"offset":207553,"old":[76,139,101],"bytes":[76,49,143]}];
const same=(bytes,at,expected)=>expected.every((v,i)=>bytes[at+i]===v);
function prepareRom(bytes){
 for(const p of patches)if(!same(bytes,p.offset,p.old)&&!same(bytes,p.offset,p.bytes))throw Error('Zarbon story fix does not match this game.');
 for(const p of patches)bytes.set(p.bytes,p.offset);
}
function upgradeState(input){
 // Save files also contain the expanded-battle resident code in cartridge RAM.
 // Keep all gameplay data intact, updating only the three matching code regions.
 const state=new Uint8Array(input),tag=[87,82,77,0,1,32,0,0,0];let start=-1;
 for(let i=0;i+8201<=state.length;i++)if(same(state,i,tag)){start=i+9;break;}
 if(start<0)return state;
 const code=patches.slice(0,3).map((p,i)=>({...p,at:start+[0,0x348,0xd00][i]}));
 // States saved before the first expanded encounter have no resident code yet.
 if(!same(state,start,code[0].old)&&!same(state,start,code[0].bytes))return state;
 if(!code.every(p=>same(state,p.at,p.old)||same(state,p.at,p.bytes)))throw Error('This saved battle uses an unknown resident-code revision.');
 for(const p of code)state.set(p.bytes,p.at);
 return state;
}
window.DreamBossFix={ROM,prepareRom,upgradeState};
})();
