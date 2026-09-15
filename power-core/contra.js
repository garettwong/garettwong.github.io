// Enhanced timing is deliberately restricted to the matching Power ROM.
export const POWER_ROM='c1e9b8c73218d9fd9c79b0f04f9d6bc947473f377dc44e7b09e2bda189d42c2a';
export function attachPowerTiming(nes,factor=8){
 const advance=nes.ppu.advanceDots.bind(nes.ppu),clock=nes.papu.clockFrameCounter.bind(nes.papu);
 let dotsCredit=0,audioCredit=0;
 const busy=()=>nes.cpu.mem[0x18]===5&&nes.cpu.mem[0x1b]!==0;
 nes.ppu.advanceDots=dots=>{const scaled=busy()?dots:dots*factor;dotsCredit+=scaled;const actual=Math.floor(dotsCredit/factor);dotsCredit%=factor;if(actual)advance(actual);};
 nes.papu.clockFrameCounter=(cycles,catchup=0)=>{audioCredit+=busy()?cycles:cycles*factor;const actual=Math.floor(audioCredit/factor);audioCredit%=factor;if(actual)clock(actual,Math.min(catchup,actual));};
}
export function projectiles(nes){
 const mem=nes.cpu.mem,result=[];if(mem[0x18]!==5)return result;
 for(let i=0;i<255;i++){const sprite=mem[0x6000+i];if(!mem[0x6200+i]||!sprite)continue;result.push({slot:i,x:mem[0x6600+i]-4,y:mem[0x6500+i]-7,hit:sprite===0x47,owner:mem[0x6e00+i],kind:mem[0x7500+i],vx:(mem[0x6a00+i]>127?mem[0x6a00+i]-256:mem[0x6a00+i])+mem[0x6800+i]/256,vy:(mem[0x6900+i]>127?mem[0x6900+i]-256:mem[0x6900+i])+mem[0x6700+i]/256});}
 return result;
}

export const POWER_PROFILES={"cef266590489ed7364851da22da3db20b14ffd72d610f1815da271a9ae8b0533": "S64", "8f43fe2960615a0aaf8af307acbb9773767e90edb7fc58d2e604d4455327a59a": "F64", "c83cc1874bbc4b0ceb333d9fafbdc49f9e45a0b5fa60f9289d22ef998408eef6": "L64", "ff8bd1e19d95494edaa7973fc5a2060b70a32d171be3bfa3d37b034d51175f12": "SFL64"};
export const isPowerRom=id=>id===POWER_ROM||Object.hasOwn(POWER_PROFILES,id);
