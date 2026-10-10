from pathlib import Path
import json
q=Path(__file__).parent;ns={'__file__':str(q/'test-regression.py')};exec((q/'test-regression.py').read_text().split('def at(i):')[0],ns)
def run(file,msg,active):
 ns['b']=(q/file).read_bytes();ns['p']=ns['b'][528:];c=ns['CPU']();m=c.m;s=(q.parent/'phase35.state').read_bytes();r=s.find(b'RAM\0')+9;w=s.find(b'WRM\0')+9;m.memory[:2048]=s[r:r+2048];m.memory[0x6000:0x8000]=s[w:w+8192];m.memory[0x73c0]=active;m.memory[0x30]=36;m.memory[0x31e]=0xe2;m.a=msg;c.call(0x8037,12);before=m.memory[0x200:0x440]+m.memory[0x7200:0x8000];frames=0
 while m.memory[0x55]!=255:
  m.memory[0x600:0x678]=[0]*120;m.memory[0x678:0x680]=[0x5a]*8;c.call(0x9200,19);frames+=1
  assert m.memory[0x678:0x680]==[0x5a]*8,('buffer',msg,file,frames)
  assert frames<200,(file,msg,m.memory[0x53:0x6c])
 after=m.memory[0x200:0x440]+m.memory[0x7200:0x8000]
 # Only resident long-call scratch $73CB..CE changes in WRAM.
 for a in range(0x73cb,0x73cf):before[0x240+a-0x7200]=after[0x240+a-0x7200]=0
 assert before==after,('battle state mutated',file,msg)
 state=m.memory[0x53:0x6c];state[0x5f-0x53]=0
 return {'parser':state,'objects':m.memory[0x440:0x458],'frames':frames}
rows=[]
for active in [0,1]:
 for msg in [1,2,3,4,13,87,93,94,95,96,97]:
  old=run('candidate-approachfast.nes',msg,active);new=run('candidate-repeattext.nes',msg,active);frames=(old.pop('frames'),new.pop('frames'));assert old==new,(active,msg,old,new);rows.append({'active':active,'message':msg,'oldFrames':frames[0],'newFrames':frames[1]})
(q/'repeattext-tests.json').write_text(json.dumps({'actualBattleTextMessages':rows,'nativeBattleStateUnchanged':True,'parserStateEquivalent':True,'ppuCanaryIntact':True},indent=2));print('PASS',len(rows),rows)
