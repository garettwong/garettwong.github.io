from pathlib import Path
from py65.devices.mpu6502 import MPU
import json
q=Path(__file__).parent;r=q.parent if (q.parent/'games').exists() else q.parent/'NES-Wide64-HPBP169';p=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v19.nes').read_bytes()[528:];maximum=(1<<64)-1;rows=[]
for actor,flags,factor in [(1,0,1),(1,1,100),(1,5,10000),(3,2,100),(3,10,10000),(2,15,1),(1,10,1),(3,5,1)]:
 for bp in [0,1,12345,2**53+7,maximum//10000,maximum//10000+1,maximum//100,maximum]:
  m=MPU();m.memory[0x8000:0xc000]=p[16*0x4000:17*0x4000];m.memory[0xc000:]=p[0x3c000:0x40000];m.memory[:8]=bp.to_bytes(8,'little');m.memory[0x75ae]=flags;m.a=actor;m.x=37;m.y=55;m.memory[0x12]=147;m.sp=255;m.stPushWord(0x04ff);m.pc=0xaccb
  for step in range(50000):
   m.step()
   if m.pc==0x500:break
  else:raise AssertionError('Native multiplier did not return')
  got=int.from_bytes(bytes(m.memory[:8]),'little');assert got==min(maximum,bp*factor);assert (m.x,m.y,m.memory[0x12])==(37,55,147);rows.append(dict(actor=actor,forms=flags,earnedBp=str(bp),nativeCombatBp=str(got),factor=factor))
(q/'native-bp-check.json').write_text(json.dumps(rows,indent=2));print('PASS 64 native form-adjusted combat BP cases')
