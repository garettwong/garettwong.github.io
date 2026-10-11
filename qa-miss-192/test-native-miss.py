from pathlib import Path
from py65.devices.mpu6502 import MPU
import json
q=Path(__file__).parent;r=q.parent if (q.parent/'games').exists() else q.parent/'NES-Wide64-HPBP169';old=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v19.nes').read_bytes();new=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v20.nes').read_bytes()
def run(rom,slot,hit,eligible,exp):
 m=MPU();p=rom[528:];m.memory[0x8000:0xc000]=p[18*16384:19*16384];m.memory[0xc000:]=p[0x3c000:0x40000];m.memory[0x6000:0x6900]=p[0x17600:0x17f00];m.memory[0x6900:0x7000]=p[0x2f700:0x2fe00];m.memory[0x7000:0x7200]=rom[16:528]
 m.memory[0x73fe]=0xb5;m.memory[0x34d]=slot*18;m.memory[0x7370]=7;m.memory[0x718f]=7;m.memory[0x718e]=31;m.memory[0x7175+slot*6]=exp;m.memory[0xa7]=hit
 if eligible==1:m.memory[0x7e62]=1
 if eligible==2:m.memory[0x718f]=6
 if eligible==3:m.memory[0x718e]=0
 m.a=23;m.x=45;m.y=67;m.sp=255;m.stPushWord(0x4ff);m.pc=0x83a2
 for _ in range(20000):
  m.step()
  if m.pc==0x500:return m
 raise AssertionError(hex(m.pc))
rows=[]
for slot in range(5):
 for hit in [0,128]:
  for eligible in range(4):
   for exp in [0,7,255]:
    a=run(old,slot,hit,eligible,exp);b=run(new,slot,hit,eligible,exp);at=0x7175+slot*6
    assert (a.a,a.x,a.y,a.sp,a.p)==(b.a,b.x,b.y,b.sp,b.p)
    assert all(a.memory[j]==b.memory[j] for j in range(0x8000) if j!=at and not 0x100<=j<0x200)
    assert b.memory[at]==((exp&63)|64|(128 if hit==0 else 0) if eligible==0 else exp)
    rows.append(dict(slot=slot,nativeHit=bool(hit),guard=eligible,originalExponent=exp,record=b.memory[at]))
(q/'native-miss.json').write_text(json.dumps({'cases':len(rows),'combatUnchanged':True,'nativeFinalHitCaptured':True,'casesSummary':rows},indent=2));print('PASS',len(rows),'native final-hit capture / unchanged post-damage state cases')
