from pathlib import Path
from py65.devices.mpu6502 import MPU
import json
q=Path(__file__).parent;b=(q/'candidate.nes').read_bytes();p=b[528:];d=json.loads(Path('D:/Codex 2/projects/NES-AoE180-QA/patch.json').read_text());L=d['labels'];slots=d['slots']
class CPU:
 def __init__(self):
  self.m=MPU();self.bank=18;self.frames=[];self.routes=[];m=self.m
  m.memory[0x6000:0x6900]=p[0x17600:0x17f00];m.memory[0x6900:0x7000]=p[0x2f700:0x2fe00];m.memory[0x7000:0x7200]=b[16:528];m.memory[0xc000:]=p[0x3c000:0x40000];self.map(18)
 def map(self,n):self.bank=n;self.m.memory[76]=n;self.m.memory[0x8000:0xc000]=p[n*0x4000:(n+1)*0x4000]
 def call(self,pc,bank=18,choice=None,limit=2000000):
  m=self.m;self.map(bank);m.sp=255;m.stPushWord(0x04ff);m.pc=pc
  for i in range(limit):
   if choice and m.memory[0x7390]==0xa5:m.memory[0x7391]=choice
   if self.bank==12 and m.pc in [0xaed6,0xa8ec,0xa8c3,0x838b,0xa69f]:
    self.routes.append(m.pc);m.pc=m.stPopWord()+1
   elif m.pc==0xd12f:
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

A=json.loads((q/'addon-patch.json').read_text())['labels'];rows=[]
for total in range(380,401):
 c=fixture(total);m=c.m
 for i in range(100):m.memory[at(i)]|=64;m.memory[at(i)+2:at(i)+4]=[0,0]
 for a in slots:m.memory[a:a+2]=[0,0]
 m.a=(total-1)//5;c.call(L['load']);m.memory[0x73c0]=1;m.memory[0x73fe]=0xb5;m.memory[0x31e]=0xe2;m.memory[0x30e]=1;m.memory[0x32d]=0;m.memory[0x34d]=((total-1)%5)*18
 c.call(A['finish_check'],19)
 assert c.routes==[0xaed6],(total,c.routes)
 assert m.memory[0x73fd]==1 and m.memory[0x73ff]==(total-1)//5,(total,m.memory[0x73ff])
 assert u16(m,0x739a)==total and u16(m,0x7396)==0
 # While display is held, native battle processing must be inert.
 m.memory[0x30]=38;before=m.memory[0x200:0x35c];c.routes=[];c.call(A['step'],19);assert not c.routes and before==m.memory[0x200:0x35c]
 m.memory[0x73fd]=0;c.call(A['step'],19);assert c.routes==[0x838b]
 rows.append({'total':total,'victoryRoutedOnce':True,'groupGate':True,'lastGroup':(total-1)//5})
# A menu save with zero enemies recovers to native victory without inputs.
c=fixture(382);m=c.m
for i in range(100):m.memory[at(i)]|=64;m.memory[at(i)+2:at(i)+4]=[0,0]
for a in slots:m.memory[a:a+2]=[0,0]
m.a=0;c.call(L['load']);m.memory[0x30]=2;m.memory[0x7b]=0;c.call(A['step'],19);assert c.routes==[0xaed6]
(q/'victory-native.json').write_text(json.dumps(rows,indent=2));print('PASS',len(rows),'native final-group victories, group gates, and zero-enemy menu recovery')
