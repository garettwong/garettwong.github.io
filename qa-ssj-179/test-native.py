from pathlib import Path
from py65.devices.mpu6502 import MPU
import json,random
q=Path(__file__).parent;b=(q/'candidate.nes').read_bytes();p=b[528:];L=json.loads((q/'patch.json').read_text())['labels']
def machine(bank=16):
 m=MPU();m.memory[0x8000:0xc000]=p[bank*0x4000:(bank+1)*0x4000];m.memory[0xc000:]=p[0x3c000:0x40000];return m
def call(m,a,stop=None):
 m.sp=255;m.stPushWord(0x04ff);m.pc=a
 for i in range(50000):
  if stop and m.pc==stop:return
  m.step()
  if m.pc==0x500:return
 raise AssertionError(hex(m.pc))
max64=(1<<64)-1
for actor,flags,factor in [(1,0,1),(1,1,100),(1,5,10000),(3,2,100),(3,10,10000),(2,15,1),(1,10,1),(3,5,1)]:
 for bp in [0,1,12345,2**53+7,max64//10000,max64//10000+1,max64//100,max64]:
  m=machine();m.memory[0:8]=bp.to_bytes(8,'little');m.memory[0x75ae]=flags;m.a=actor;m.x=37;m.y=55;m.memory[0x12]=147;call(m,0xaccb)
  got=int.from_bytes(bytes(m.memory[:8]),'little');assert got==min(max64,bp*factor),(actor,flags,bp,got);assert (m.x,m.y,m.memory[0x12])==(37,55,147)
for actor,bit,high,idx in [(1,1,4,0),(3,2,8,1)]:
 m=machine();m.memory[0x2e]=1;m.memory[0x75ae]=bit;m.memory[0x030e]=actor;m.memory[0x7e62]=0;m.memory[0x034d]=18
 m.memory[0x8e0b]=0x60;m.memory[0x8e55]=0x60
 for n in range(1,13):
  m.memory[0x2b4]=16;m.memory[0x2b6]=1;m.memory[0x2b7]=0
  call(m,L['snapshot_target']);m.memory[0x330]=0;m.memory[0x331]=0;call(m,L['credit_kill'])
  assert m.memory[0x73bb+idx]==min(10,n)
  assert m.memory[0x75ae]==(bit if n<10 else bit|high)
  assert m.memory[0x73be]==(0 if n<10 else bit)
  call(m,L['credit_kill']);assert m.memory[0x73bb+idx]==min(10,n)
 assert m.memory[0x73bb+(1-idx)]==0
 m.memory[0xae00]=0x60;call(m,L['reset_forms']);assert m.memory[0x75ae]==bit and m.memory[0x73bb:0x73c0]==[0,0,bit,0,0]
# Palette2 allocation cannot recolour ship palette0 and cannot steal palette2.
m=machine(17);m.memory[0x010e:0x011a]=list(range(12));m.memory[0x2e]=6;m.memory[0x38]=4;m.memory[0x700:0x704]=[70,220,0,80]
call(m,L['palette_allocate'],0x831d);assert m.memory[0x17]==2 and m.memory[0x010e:0x0111]==[0,1,2] and m.memory[0x73b8:0x73bb]==[6,7,8]
m.memory[0x0114:0x0117]=[56,15,39];call(m,L['palette_restore'],0x8298);assert m.memory[0x0114:0x0117]==[6,7,8] and m.memory[0x73b6]==0
m.memory[0x702]=2;m.memory[0x17]=0;call(m,L['palette_allocate']);assert m.memory[0x17]==0 and m.memory[0x73b6]==0
# Hosted native loop holds battle progression until each queued actor is acknowledged.
m=machine();m.memory[0x2e]=1;m.memory[0x75ae]=3;m.memory[0x73bb:0x73bd]=[10,10];m.memory[0x7c4b]=0xa5;m.pc=L['menu_upgrade'];m.sp=255
for i in range(1000):m.step()
assert m.memory[0x73be]==3 and m.memory[0x75ae]==15 and m.pc!=0xa3ba
m.memory[0x73be]=2
for i in range(1000):m.step()
assert m.pc!=0xa3ba
m.memory[0x73be]=0
for i in range(1000):
 if m.pc==0xa3ba:break
 m.step()
else:raise AssertionError('Banner acknowledgement did not release native gate')
# Verify every SSJII pose selects its own well-formed metadata within the free bank.
for actor,bit,lo,hi in [(1,4,0x845d,0x848f),(3,8,0x84c1,0x84f3)]:
 for pose in range(50):
  m=machine(17);m.y=pose;m.memory[2]=actor;m.memory[0x75ae]=bit;m.memory[0]=m.memory[lo+pose];m.a=m.memory[hi+pose];call(m,L['select_hair'],0x80c7);pointer=m.memory[0]+256*m.memory[1];assert 0x9000<=pointer<0xbe00
  bank,count=m.memory[pointer:pointer+2];assert count<=64 and pointer+2+4*count<0xbe00 and m.y==0
report={'result':'PASS','bpCases':64,'multiplierSSJ1':100,'multiplierSSJ2':10000,'individualKillThreshold':10,'duplicateCreditGuard':True,'encounterReset':True,'paletteOwnershipAndRestore':True,'hostGateWaitsForBothAcknowledgements':True,'stageIIPosePointers':100};(q/'native-tests.json').write_text(json.dumps(report,indent=2));print(report)
