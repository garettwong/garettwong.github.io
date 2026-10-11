from pathlib import Path
from py65.devices.mpu6502 import MPU
import random,json
q=Path(__file__).parent;r=q.parent if (q.parent/'games').exists() else q.parent/'NES-Wide64-HPBP169';old=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v18.nes').read_bytes();new=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v19.nes').read_bytes();rng=random.Random(191)
def run(rom,n,d,slot,active):
 m=MPU();p=rom[528:];m.memory[0x8000:0xc000]=p[16*16384:17*16384];m.memory[0xc000:]=p[0x3c000:0x40000]
 m.memory[0x7eb8:0x7ec4]=n.to_bytes(12,'little');m.memory[0x7ec4:0x7ed0]=d.to_bytes(12,'little');m.memory[0x73c0]=active;m.memory[0x73fe]=0xb5 if active else 0;m.memory[0x34d]=slot*18;m.memory[0x7370]=7
 m.a=35;m.x=89;m.y=67;m.sp=255;m.stPushWord(0x4ff);m.pc=0x9260
 for _ in range(30000):
  m.step()
  if m.pc==0x500:return m
 raise AssertionError('timeout')
cases=[(a,b) for a in [0,1,255,65535,65536,2**40-1,2**40,2**64-1,2**96-1] for b in [0,1,3,65535,2**60+1]]+[(rng.getrandbits(96),rng.getrandbits(rng.randrange(1,97))) for _ in range(120)]
for i,(n,d) in enumerate(cases):
 slot=i%5;active=int(i%11!=0);a=run(old,n,d,slot,active);b=run(new,n,d,slot,active)
 assert (a.a,a.x,a.y,a.sp,a.p)==(b.a,b.x,b.y,b.sp,b.p)
 assert all(a.memory[j]==b.memory[j] for j in range(0x8000) if not (0x100<=j<0x200 or 0x7170<=j<0x7190)),i
 assert b.memory[0xa8]+256*b.memory[0xa9]==(min(65535,n//d) if d else 65535)
 if active:
  assert b.memory[0x718e]==1<<slot and b.memory[0x718f]==7
  at=0x7170+slot*6;exp=b.memory[at+5];mantissa=int.from_bytes(bytes(b.memory[at:at+5]),'little')
  if not d:assert exp==255
  else:
   lower=mantissa<<(8*exp);assert lower<=n//d<=lower+(1<<(8*exp))-1
 else:assert b.memory[0x718e]==0
(q/'test-potential.json').write_text(json.dumps({'cases':len(cases),'nativeCombatUnchanged':True,'quotientIntervalCorrect':True,'zeroDenominatorExplicit':True},indent=2));print('PASS',len(cases),'native telemetry / unchanged damage cases')
