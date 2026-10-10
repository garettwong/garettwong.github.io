from pathlib import Path
import json
q=Path(__file__).parent
ns={'__file__':str(q/'test-regression.py')};exec((q/'test-regression.py').read_text().split('def at(i):')[0],ns)
roms={name:(q/file).read_bytes() for name,file in [('old','candidate.nes'),('new','candidate-scriptwait.nes')]}
def run(name,fn,mode,active,raw,x,command=5,vec=(0x1234,0xfffd),script=1):
 ns['b']=roms[name];ns['p']=roms[name][528:];c=ns['CPU']();m=c.m;m.x=x;m.a=0x71;m.y=0x44;m.p=0x61
 m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.memory[0x2e]=1;m.memory[0x7371]=0xa5;m.memory[0x7372]=100;m.memory[0x30]=34;m.memory[0x321+x]=script
 m.memory[0:2]=[0,0x74];m.memory[0x322+x]=5 if fn==0xbf47 else 10;m.memory[0x323+x]=0;m.memory[0x32c+x]=0x10;m.memory[0x7405]=raw;m.memory[3]=7;m.memory[0x17]=command
 m.memory[4:8]=[vec[0]&255,vec[0]>>8,vec[1]&255,vec[1]>>8];m.memory[8:12]=[42,51,87,79]
 c.call(fn,13);return {'regs':(m.a,m.x,m.y,m.p&~0x10,m.sp),'ptr':m.memory[0x322+x],'vec':m.memory[4:8],'scratch':m.memory[8:12],'bank':c.bank}
rows=[]
for mode,active in [(0,0),(0,1),(0xb5,0),(0xb5,1)]:
 for x in [0,32]:
  for raw in range(256):
   for script in [1,0x10,0x27]:
    old=run('old',0xbf47,mode,active,raw,x,script=script);new=run('new',0xbf47,mode,active,raw,x,script=script)
    if mode==0xb5 and active:assert new['regs'][0]==0,(mode,active,raw,x,new)
    else:
     old['regs']=tuple(v&~1 if i==3 else v for i,v in enumerate(old['regs']));new['regs']=tuple(v&~1 if i==3 else v for i,v in enumerate(new['regs']));assert old==new,('ordinary duration mismatch',mode,active,raw,x,script,old,new)
    assert new['ptr']==6 and new['bank']==13
rows.append({'durationGuardCases':4*2*256*3,'ordinaryExact':True,'activeZero':True,'oneScriptRead':True})
for x in [0,32]:
 for raw in [0,1,2,3,7,15,29,30,31,32,63,127,255]:
  for pair in [(0,0),(1,1),(0xffff,0xfffe),(0x1234,0xabcd),(256,512),(255,32768)]:
   for cmd in [3,4,5,6]:
    new=run('new',0xbf95,0xb5,1,raw,x,command=cmd,vec=pair)
    expected=pair if cmd==4 else tuple(v*(raw+1)&65535 for v in pair)
    actual=(new['vec'][0]+new['vec'][1]*256,new['vec'][2]+new['vec'][3]*256)
    assert actual==expected,(raw,x,pair,cmd,new,expected)
    assert new['scratch']==[42,51,87,79] and new['regs'][1]==x and new['regs'][4]==255 and new['bank']==13,new
rows.append({'motionCases':2*13*6*4,'exactEndpoint':True,'scratchAndXStackBankPreserved':True})
for mode,active in [(0,0),(0,1),(0xb5,0)]:
 for raw in [0,1,7,29,30,31,255]:
  for cmd in [3,4,5,6]:
   for script in [1,0x10,0x27]:
    old=run('old',0xbf95,mode,active,raw,0,command=cmd,script=script);new=run('new',0xbf95,mode,active,raw,0,command=cmd,script=script);assert old==new,('ordinary motion',mode,active,raw,cmd,script,old,new)
rows.append({'ordinaryMotionCases':3*7*4*3,'exact':True})
(q/'scriptwait-tests.json').write_text(json.dumps(rows,indent=2));print('PASS',rows)
