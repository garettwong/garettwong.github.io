from pathlib import Path
from py65.devices.mpu6502 import MPU
import json
q=Path(__file__).parent;p=(q/'candidate.nes').read_bytes()[528:];rows=[]
for mode in [0,181]:
 for phase in [6,32,34,39,40]:
  for cmd in [0xc0,0x40,0xdb,0xe2]:
   for auto in [0,1]:
    m=MPU();m.memory[0x8000:0xc000]=p[19*0x4000:20*0x4000];m.memory[0x73fe]=mode;m.memory[46]=1;m.memory[48]=phase;m.memory[0x31e]=cmd;m.memory[0x6b]=auto;m.sp=255;m.stPushWord(0x4ff);m.pc=0x9200;seen=[]
    for i in range(100):
     if m.pc in [0xc7f1,0x6c56]:seen.append((m.pc,m.memory[0x6b],m.memory[0x6a],m.memory[0x5f]));m.pc=m.stPopWord()+1
     else:m.step()
     if m.pc==0x500:break
    expected=mode==181 and 34<=phase<40 and cmd in [64,219,226]
    assert seen[0][0]==(0xc7f1 if expected else 0x6c56),(mode,phase,cmd,seen)
    if expected:assert seen[0][1:]==(1,30,7)
    assert m.memory[0x6b]==auto and m.sp==255
    rows.append({'mode':mode,'phase':phase,'cmd':cmd,'auto':auto,'fast':expected})
for mode in [0,181]:
 for active in [0,1]:
  for wait in [0,1,6,30,255]:
   m=MPU();m.memory[0x8000:0xc000]=p[13*0x4000:14*0x4000];m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.x=32;m.y=47;m.sp=255;m.stPushWord(0x4ff);m.pc=0xbaf2
   for i in range(100):
    if m.pc==0x87c8:m.a=wait;m.pc=m.stPopWord()+1
    else:m.step()
    if m.pc==0x500:break
   assert m.a==(0 if mode==181 and active else wait) and (m.x,m.y,m.sp)==(32,47,255)
(q/'timing-tests.json').write_text(json.dumps({'textCases':len(rows),'waitCases':20,'result':'PASS','cases':rows},indent=2));print('PASS timing guards, native writer call, text policy restored, stack and wait registers preserved')
