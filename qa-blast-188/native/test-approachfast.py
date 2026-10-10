from pathlib import Path
import json
q=Path(__file__).parent;ns={'__file__':str(q/'test-regression.py')};exec((q/'test-regression.py').read_text().split('def at(i):')[0],ns)
def run(file,mode,active,side,pos):
 ns['b']=(q/file).read_bytes();ns['p']=ns['b'][528:];c=ns['CPU']();m=c.m;m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.memory[0x7c]=side;m.memory[0x7e]=1;m.memory[0x32d]=m.memory[0x34d]=0;m.memory[0x32b]=m.memory[0x34b]=1;m.memory[0x30e]=3;m.memory[0x32e]=16;y=0 if side else 16;m.memory[0x679+y:0x67b+y]=list((pos&65535).to_bytes(2,'little'));m.memory[0x67f+y]=177
 steps=0
 while True:
  c.call(0x8d6f,13);steps+=1
  if not(m.memory[0x88]&0xc0):break
  assert steps<400,(side,pos,hex(m.pc))
 return {'coords':m.memory[0x677:0x698],'work':m.memory[0x320:0x34d],'flags':m.memory[0x7b:0x8b],'steps':steps}
rows=[]
for mode,active in [(0,0),(0,1),(0xb5,0),(0xb5,1)]:
 for side,poses in [(1,list(range(-96,-84))+[0,1,2,3,127,255,350]),(0,list(range(338,352))+[-100,-1,0,1,2,3,127,255])]:
  for pos in poses:
   old=run('candidate-mathfast.nes',mode,active,side,pos);new=run('candidate-approachfast.nes',mode,active,side,pos);steps=(old.pop('steps'),new.pop('steps'));assert old==new,(mode,active,side,pos,old,new);rows.append(steps)
(q/'approachfast-tests.json').write_text(json.dumps({'endpointCases':len(rows),'ordinaryExact':True,'allWorkingSpriteStatePreserved':True,'steps':rows}));print('PASS',len(rows))
