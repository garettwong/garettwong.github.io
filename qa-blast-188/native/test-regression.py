from pathlib import Path
from py65.devices.mpu6502 import MPU
import json
q=Path(__file__).parent;b=(q/'candidate.nes').read_bytes();p=b[528:];d=json.loads(Path('D:/Codex 2/projects/NES-AoE180-QA/patch.json').read_text());L=d['labels'];slots=d['slots']
class CPU:
 def __init__(self):
  self.m=MPU();self.bank=18;self.frames=[];m=self.m
  m.memory[0x6000:0x6900]=p[0x17600:0x17f00];m.memory[0x6900:0x7000]=p[0x2f700:0x2fe00];m.memory[0x7000:0x7200]=b[16:528];m.memory[0xc000:]=p[0x3c000:0x40000];self.map(18)
 def map(self,n):self.bank=n;self.m.memory[76]=n;self.m.memory[0x8000:0xc000]=p[n*0x4000:(n+1)*0x4000]
 def call(self,pc,bank=18,choice=None,limit=2000000):
  m=self.m;self.map(bank);m.sp=255;m.stPushWord(0x04ff);m.pc=pc
  for i in range(limit):
   if choice and m.memory[0x7390]==0xa5:m.memory[0x7391]=choice
   if m.pc==0xd12f:
    self.map(m.a);m.pc=m.stPopWord()+1
   else:m.step()
   if m.pc==0x500:return i
  raise AssertionError(('hung',hex(m.pc),self.bank,self.frames[-3:]))
def at(i):return 0x7200+18*i if i<20 else 0x7600+18*(i-20)
def u16(m,a):return m.memory[a]+256*m.memory[a+1]
def fixture(total=400,hp=500):
 c=CPU();m=c.m;m.memory[0x7c6f]=1;m.memory[0x75aa]=1;m.memory[0x7371]=0xa5;m.memory[0x7372]=100;m.memory[0x7373]=20;m.memory[0x7391]=6;m.memory[0x7393]=0
 for i in range(5):m.memory[0x7500+i*18:0x7512+i*18]=[16+i,20,hp&255,hp>>8,76,4,0,0,0,0,255,255,16,0xf1,0x41,0,0,0]
 m.a=total-380;c.call(L['total']);c.call(0x688f,16)
 assert u16(m,0x7398)==total
 for a in slots:assert u16(m,a)==hp
 return c
rows=[]
assert p[18*0x4000]==18,'NMI bank identifier'
for choice in [5,6]:
 totals=set()
 for seed in range(24):
  c=CPU();m=c.m;m.memory[0x7c4b]=0xa5;m.memory[0x7c6f]=1;m.memory[0x75aa]=1;m.memory[0x6c]=seed
  for i in range(5):m.memory[0x2a2+18*i:0x2b4+18*i]=[16 if i<2 else 128,20,250+i,1,76,4,0,0,0,0,255,255,16 if i<2 else 128,0,0,0,0,0]
  m.a=0;c.call(0x6805,12,choice=choice);total=u16(m,0x7398);totals.add(total)
  assert (180<=total<=200) if choice==5 else (380<=total<=400)
  assert m.memory[0x73c1]==0xa0 and m.memory[0x7372]==100 and m.memory[0x73cf]==0
  for i,a in enumerate(slots):assert u16(m,a)==506+(i%100)%2
 rows.append(dict(sizeChoice=choice,nativeEncounters=24,totals=sorted(totals),reserveInitialized=True))
for total in [180,199,380,394,400]:
 c=fixture(total) if total>=380 else None
 if c is None:continue
 m=c.m
 for page in range(20,(total+4)//5):
  m.a=page;c.call(0x60d7)
  for j in range(min(5,total-page*5)):
   assert u16(m,0x2a4+j*18)==500,(page,j)
   m.memory[0x2a4+j*18]=123;m.memory[0x2a5+j*18]=0
  c.call(0x60f4)
 for i in range(total-100):assert u16(m,slots[i])==123,(total,i,u16(m,slots[i]))
 m.a=0;c.call(0x60d7)
 for i in range(100):m.memory[at(i)]|=64;m.memory[at(i)+2:at(i)+4]=[0,0]
 for i in range(5):m.memory[0x2a2+i*18]|=64;m.memory[0x2a4+i*18:0x2a6+i*18]=[0,0]
 c.call(L['count']);assert u16(m,0x739a)==200
 for i in range(100):assert u16(m,at(i)+2)==123,(i,u16(m,at(i)+2))
 rows.append(dict(total=total,nonlethalReserveDamage=True,refillPreservedHP=True))
for command in [0x40,0xdb,0xe2]:
 for lethal in [False,True]:
  c=fixture();m=c.m;m.memory[0x31e]=command;m.memory[0x30e]=1;m.memory[0x32d]=0;m.memory[0x7b]=0
  visited=[];target=0
  for step in range(450):
   page=m.memory[0x7370];m.memory[0x34d]=target*18
   number=page*5+target
   assert number not in visited,('duplicate',command,lethal,number)
   visited.append(number)
   off=0x2a2+18*target
   m.memory[off+2:off+4]=[0 if lethal else 123,0]
   if lethal:m.memory[off]|=64
   c.call(L['post']);c.call(L['count']);assert m.y!=0
   c.call(L['next'])
   if not m.memory[0x10]:break
   target=m.memory[0x20f]&7
  assert visited==list(range(400)),(command,lethal,len(visited),visited[-10:])
  if lethal:
   assert u16(m,0x739a)==400 and u16(m,0x7396)==0
   c.call(L['count']);assert m.y==0
  else:
   assert u16(m,0x739a)==100
   for i in range(100):assert u16(m,at(i)+2)==123
   for a in slots:assert u16(m,a)==123
  rows.append(dict(command=command,lethal=lethal,visitedOnce=len(visited),passFinished=True))
c=fixture();m=c.m
for i in range(25):m.memory[0x739c+i]=i+1
for index in [100,101,104,199,255,256,299,399]:
 m.a=index//5;c.call(0x60d7,12);m.x=index%5*18;c.call(0x8245,16)
 expected=[76,4,0]+list(range((index%5)*5+1,(index%5)*5+6))
 assert m.memory[0x7e98:0x7ea0]==expected,(index,m.memory[0x7e98:0x7ea0],expected)
rows.append(dict(virtualBp64Cases=8,passed=True))
for command in [0xc0,0xd8,0xda,0xe1]:
 c=fixture();m=c.m;m.memory[0x31e]=command;m.memory[0x30e]=1;m.memory[0x32d]=0;m.memory[0x34d]=0
 c.call(L['post']);assert m.memory[0x73c0]==0
 c.call(L['next']);assert m.memory[0x10]==0 and m.memory[0x7370]==0
 assert all(u16(m,a)==500 for a in slots)
rows.append(dict(singleTargetCommands=[0xc0,0xd8,0xda,0xe1],reserveUnchanged=True))
c=fixture();m=c.m
for a in slots:m.memory[a:a+3]=[123,0,0x41]
c.call(L['cards']);assert all(u16(m,a)==123 and m.memory[a+2]==0 for a in slots)
rows.append(dict(nextTurnCardsResetWithoutHealing=True))
(q/'native-tests.json').write_text(json.dumps(rows,indent=2));print(rows)
