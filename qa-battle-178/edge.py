from pathlib import Path
from py65.devices.mpu6502 import MPU
import json
q=Path(__file__).parent;b=(q/'candidate.nes').read_bytes();p=b[528:];labels=json.loads((q/'patch.json').read_text())['labels']
def machine():
 m=MPU();m.memory[0x6000:0x6900]=p[0x17600:0x17f00];m.memory[0x6900:0x7000]=p[0x2f700:0x2fe00];m.memory[0x7000:0x7200]=b[16:528];m.memory[0x8000:0xc000]=p[0x40000:0x44000];m.memory[0xc000:]=p[0x3c000:0x40000]
 for at,fn in [(0x6bde,'range'),(0x6be5,'total'),(0x6303,'count')]:m.memory[at:at+4]=[0x20,labels[fn]&255,labels[fn]>>8,0x60]
 for at,addr in [(0x7084,0x988e),(0x708a,0x9a5f),(0x7060,0x83e8)]:m.memory[at:at+4]=[0x20,addr&255,addr>>8,0x60]
 m.memory[0x7371]=0;m.memory[0x7c4b]=0xa5;m.memory[0x75aa]=1;m.memory[0x7c6f]=1
 for i in range(5):m.memory[0x2a2+i*18:0x2b4+i*18]=[16 if i==0 else 128,20,50,0,76,4,0,0,0,0,255,255,16 if i==0 else 128,0,0,0,0,0]
 return m
def call(m,pc,choice=None,limit=150000):
 m.sp=0xff;m.stPushWord(0x04ff);m.pc=pc
 for i in range(limit):
  if choice is not None and m.memory[0x7390]==0xa5:m.memory[0x7391]=choice
  m.step()
  if m.pc==0x500:return i
 raise AssertionError(('hung',hex(m.pc)))
def u16(m,at):return m.memory[at]+256*m.memory[at+1]
def at(i):return 0x7200+i*18 if i<20 else 0x7600+(i-20)*18
def kill_batch(m):
 for i in range(m.memory[0x7372]):m.memory[at(i)]|=64;m.memory[at(i)+2]=0;m.memory[at(i)+3]=0
 for i in range(5):m.memory[0x2a2+i*18]|=64;m.memory[0x2a4+i*18]=0;m.memory[0x2a5+i*18]=0

rows=[]
for exponent in [4,5,6,7]:
 m=machine();m.memory[0x7c60]=exponent;m.memory[0x2a4:0x2a6]=[0x40,0x9c];m.memory[0x2a6:0x2a9]=[255]*3
 call(m,0x988e);assert u16(m,0x2a4)==65534
 bp=int.from_bytes(bytes(m.memory[0x2a6:0x2a9]+m.memory[0x7ea0:0x7ea5]),'little');assert bp==0xffffff*2**exponent,(exponent,bp)
 m.memory[0x2a4:0x2a6]=[255]*2;call(m,0x988e);assert u16(m,0x2a4)==65535
 rows.append({'strength':2**exponent,'hpCap':65534,'scriptedHp':65535,'bp':bp})
m=machine();m.memory[0x7391]=6;m.memory[0x7393]=0;m.a=20
pattern=list(range(1,26));m.memory[0x7ea0:0x7eb9]=pattern;call(m,labels['total']);assert u16(m,0x7398)==400
assert m.memory[0x739c:0x73b5]==pattern
# Generate the initial pool and exhaust all groups; saved high-byte template is persistent.
m.memory[0x7500:0x755a]=m.memory[0x2a2:0x2fc]
call(m,0x688f)
m.memory[0x9b:0x9e]=[57,48,0]
for remaining in [300,200,100,0]:
 kill_batch(m);call(m,labels['count']);assert u16(m,0x7396)==max(0,remaining-100);assert m.memory[0x739c:0x73b5]==pattern
 assert m.memory[0x9b:0x9e]==[57,48,0]
 if remaining:
  for i in range(m.memory[0x7372]):
   for j,(lo,hi) in enumerate([(0x9b86,0x9bea),(0x9c4e,0x9cb2),(0x9d16,0x9d7a),(0x9dde,0x9e42),(0x9ea6,0x9f0a)]):
    ptr=m.memory[lo+i]+256*m.memory[hi+i];assert m.memory[ptr]==pattern[j],(remaining,i,j,ptr,m.memory[ptr])
m.memory[0x2e]=1;m.memory[0x2f]=1;m.memory[0x7c61]=7;call(m,0x9b15)
assert int.from_bytes(bytes(m.memory[0x75b0:0x75b8]),'little')==12345*128
# A new encounter clears all reserve bookkeeping and resets the strength selection.
call(m,labels['reset']);assert m.memory[0x7396:0x739c]==[0]*6 and m.memory[0x73b5]==0 and m.memory[0x7c60]==0
rows.append({'highBpReserveTemplate':'PASS','newEncounterReset':'PASS','highBpEveryRefilledRecord':'PASS','accumulatedRewardPreservedAndScaled':1580160})
(q/'edge-tests.json').write_text(json.dumps(rows,indent=2));print(rows)
