from pathlib import Path
import json
q=Path(__file__).parent
ns={'__file__':str(q/'test-regression.py')};exec((q/'test-regression.py').read_text().split('def at(i):')[0],ns)
def run(file,mode,active,text):
 ns['b']=(q/file).read_bytes();ns['p']=ns['b'][528:];c=ns['CPU']();m=c.m;m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.memory[0x53]=13;m.memory[0x5a:0x5c]=[0,0x74];m.memory[0x7400:0x7400+len(text)]=text;m.memory[0x7400+len(text)]=0;m.memory[0x56:0x5a]=[0,0x20,0,0xa0];m.memory[0x6b]=1;m.memory[0x5f]=7;m.memory[0x61]=0;m.memory[0x64]=1
 frames=0;peak=0
 while m.memory[0x55]!=255:
  m.memory[0x600:0x678]=[0]*120;m.memory[0x678:0x680]=[0x5a]*8;m.memory[0x5f]=7;c.call(0xe60f,13);frames+=1;assert m.memory[0x678:0x680]==[0x5a]*8,(file,mode,active,len(text),text[0],frames,m.memory[0x678:0x680])
  assert frames<100
 return {'state':m.memory[0x53:0x6c]+m.memory[0x440:0x458], 'frames':frames,'ppu':m.memory[0x600:0x678]}
rows=[]
for mode,active in [(0,0),(0,1),(0xb5,0),(0xb5,1)]:
 for length in [1,6,7,8,20,80,200]:
  for char in [3,33,0x89,0x90,0xdf]:
   text=[char]*length
   if length>8:text[4]=2
   old=run('candidate-scriptwait.nes',mode,active,text);new=run('candidate-glyphfast.nes',mode,active,text)
   if mode!=0xb5 or not active:assert old==new,(mode,active,length,char,old,new)
   else:
    # character budget is deliberately larger; all parser/layout/side-effect state stays equal.
    a=old['state'];b=new['state'];a[0x5f-0x53]=b[0x5f-0x53]=0;assert a==b,(length,char,old,new);assert new['frames']==1
rows.append({'cases':140,'ordinaryExact':True,'fastParserStatePreserved':True,'bufferCanaryIntact':True,'fastMessageFrames':1})
(q/'glyphfast-tests.json').write_text(json.dumps(rows,indent=2));print(rows)
