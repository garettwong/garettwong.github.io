// The original underwater crouch hides the player and blocks diagonal swimming.
// Ignore Down only after entering water; land drop-through remains native.
export function waterInput(nes){
 const restored=[];
 for(let p=0;p<2;p++){
  const m=nes.cpu.mem,state=nes.controllers[p+1].state;
  if(m[0x18]===5&&!m[0x1c]&&m[0x90+p]===1&&m[0xb2+p]&&state[5]===0x41){restored.push(state);state[5]=0x40;}
 }
 return ()=>{for(const state of restored)state[5]=0x41;};
}
