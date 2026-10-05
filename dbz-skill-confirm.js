/* Consume the requested skill before native single/group target confirmation. */
(()=>{'use strict';
const patches=[{"offset": 199777, "old": [157, 16, 2], "bytes": [32, 159, 109]}, {"offset": 199990, "old": [157, 16, 2], "bytes": [32, 159, 109]}, {"offset": 196015, "old": [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "bytes": [8, 72, 173, 254, 126, 201, 165, 208, 30, 236, 253, 126, 208, 25, 173, 252, 126, 201, 192, 144, 18, 201, 227, 176, 14, 157, 16, 2, 141, 255, 126, 169, 0, 141, 254, 126, 104, 40, 96, 104, 157, 16, 2, 40, 96]}],code=Uint8Array.from(patches[2].bytes);
const same=(b,p,a)=>a.every((v,i)=>b[p+i]===v);
function wrm(b){const h=[87,82,77,0,1,32,0,0,0];for(let i=0;i+8201<=b.length;i++)if(same(b,i,h))return i+9;return -1;}
function prepareRom(b){
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('Native skill confirmation does not match this game.');
 for(const p of patches)b.set(p.bytes,p.offset);
}
function upgradeState(input,upgrade){
 let b=new Uint8Array(input).slice(),w=wrm(b),installed=w>=0&&same(b,w+0xd9f,code);
 if(installed)b.fill(255,w+0xd9f,w+0xd9f+code.length);
 b=upgrade(b);w=wrm(b);
 if(w>=0&&same(b,w,[76,0,104])){
  if(!same(b,w+0xd9f,new Uint8Array(code.length).fill(255)))throw Error('Unknown skill confirmation code in this save.');
  b.set(code,w+0xd9f);
  if(!installed)b.fill(0,w+0x1efc,w+0x1f00);
 }
 return b;
}
function queue(state,slot,id){
 const w=wrm(state);if(w<0||!same(state,w+0xd9f,code))throw Error('Native skill confirmation is not ready. Reload this save.');
 if(!Number.isInteger(slot)||slot<0||slot>=162||slot%18||!Number.isInteger(id)||id<0||id>=35)throw Error('Invalid skill selection.');
 state.set([192+id,slot,165,0],w+0x1efc);
}
function consumed(state,slot,id){const w=wrm(state);return w>=0&&state[w+0x1efd]===slot&&state[w+0x1efe]===0&&state[w+0x1eff]===192+id;}
function pending(state,slot,id){const w=wrm(state);return w>=0&&same(state,w+0x1efc,[192+id,slot,165,0]);}
window.DreamSkillConfirm={prepareRom,upgradeState,queue,consumed,pending};
})();
