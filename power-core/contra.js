// Enhanced timing is deliberately restricted to the matching Power ROM.
export const POWER_ROM='c1e9b8c73218d9fd9c79b0f04f9d6bc947473f377dc44e7b09e2bda189d42c2a';
export function attachPowerTiming(nes,factor=8){
 const ppu=nes.ppu,papu=nes.papu,mem=nes.cpu.mem,advance=ppu.advanceDots.bind(ppu),clock=papu.clockFrameCounter.bind(papu);
 let dotsCredit=0,audioCredit=0;
 ppu.advanceDots=dots=>{dotsCredit+=mem[0x18]===5&&mem[0x1b]!==0?dots:dots*factor;if(dotsCredit>=factor){const actual=(dotsCredit/factor)|0;dotsCredit-=actual*factor;advance(actual);}};
 papu.clockFrameCounter=(cycles,catchup=0)=>{audioCredit+=mem[0x18]===5&&mem[0x1b]!==0?cycles:cycles*factor;if(audioCredit>=factor){const actual=(audioCredit/factor)|0;audioCredit-=actual*factor;clock(actual,catchup<actual?catchup:actual);}};

}
export function projectiles(nes){
 const mem=nes.cpu.mem,result=[];if(mem[0x18]!==5)return result;
 for(let i=0;i<255;i++){const sprite=mem[0x6000+i];if(!mem[0x6200+i]||!sprite)continue;result.push({slot:i,x:mem[0x6600+i]-4,y:mem[0x6500+i]-7,hit:sprite===0x47,owner:mem[0x6e00+i],kind:mem[0x7500+i],vx:(mem[0x6a00+i]>127?mem[0x6a00+i]-256:mem[0x6a00+i])+mem[0x6800+i]/256,vy:(mem[0x6900+i]>127?mem[0x6900+i]-256:mem[0x6900+i])+mem[0x6700+i]/256});}
 return result;
}

export const POWER_PROFILES={"cef266590489ed7364851da22da3db20b14ffd72d610f1815da271a9ae8b0533": "S64", "8f43fe2960615a0aaf8af307acbb9773767e90edb7fc58d2e604d4455327a59a": "F64", "c83cc1874bbc4b0ceb333d9fafbdc49f9e45a0b5fa60f9289d22ef998408eef6": "L64", "ff8bd1e19d95494edaa7973fc5a2060b70a32d171be3bfa3d37b034d51175f12": "SFL64"};
export const RUSH_PROFILES={"40585e61078c87bc0050e15637e7366e36a97654c0267c8c5e925d7f44e23bf7":"S64","a3b7a62c1efd380731ce3a88a44cf409c69972ac800caadf53917cdd617cd470":"F64","e49d8167d759023e72c91a399d7d8f1732436bfa76d19f8d9f99e70d71644146":"L64","831ba05a05318fc92d1569a18afae40eb061e0fd1597594638c357f1b410a41d":"SFL64"};
export const CHAOS_PROFILES={"dbc70fade29e34e3ce0e8e2c62a21aca3892aff4f588821de74c332e1153447a":"SFL","20ef74f425436d8aed7f32e0bcd962a39c485012fd6b18ce24d6154401120080":"L","4b81d15321e81b4a55605f63f6f4afb781b7ec7b1ef08b8c86c4361c4102741d":"F","9d69ede4534252c358d5d2ce5bcd40dc03d2b9e9c30e61aaff4f07cf13661811":"S","e589f40062a559f57d630a19f731c99afe9e08c6aa84f43f2e140070d97f9907": "S", "29afc7725db69cea92d57ed639e119acc3808fe5f2e749a0462b2b5401a96f34": "F", "e0432d1d1fdc4f3768713f64fa25a4be315bd0491c9c0cf6557a5bb61ac8222e": "L", "374deefbc1ac794fe03138ca1295f9dc3cbf91e6980db77522b577a931f03f2c": "SFL"};
export const isPowerRom=id=>id===POWER_ROM||Object.hasOwn(POWER_PROFILES,id)||Object.hasOwn(RUSH_PROFILES,id)||Object.hasOwn(CHAOS_PROFILES,id);
