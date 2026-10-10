from pathlib import Path
import json
q=Path(__file__).parent;ns={'__file__':str(q/'test-regression.py')};exec((q/'test-regression.py').read_text().split('def at(i):')[0],ns)
def cpu(file,mode,active,kind,ad):
 ns['b']=(q/file).read_bytes();ns['p']=ns['b'][528:];c=ns['CPU']();m=c.m;m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.memory[0x505]=128|kind;m.memory[0xad]=ad;m.memory[0x140:0x144]=[17,18,19,20];return c
def step(c,a,phase):
 m=c.m;m.a=a;m.memory[0x31]=phase+a+1;m.memory[0x600:0x670]=[0]*112;c.call(0x802b,6)
def snapshot(c):
 m=c.m;return {'effect':m.memory[0x505],'timer':m.memory[0x31],'camera':[m.memory[0x48],m.memory[0x4a]],'palette':m.memory[0x100:0x120],'chr':m.memory[0x137:0x14b]}
normal=fast=0
for mode,active in [(0,0),(0,1),(0xb5,0),(0xb5,1)]:
 for kind in range(2,8):
  for ad in [0,1]:
   for phase in [0x50,0x60]:
    old=cpu('candidate-clearfast.nes',mode,active,kind,ad);new=cpu('candidate-effectfast.nes',mode,active,kind,ad)
    for i in range(15):
     # Set global code image before each run because CPU bank mapper uses it.
     ns['b']=(q/'candidate-clearfast.nes').read_bytes();ns['p']=ns['b'][528:];step(old,i,phase)
     if i<2 or not(mode==0xb5 and active):
      ns['b']=(q/'candidate-effectfast.nes').read_bytes();ns['p']=ns['b'][528:];step(new,i,phase)
     if not(mode==0xb5 and active):assert snapshot(old)==snapshot(new),(mode,active,kind,ad,phase,i,snapshot(old),snapshot(new));normal+=1
     if old.m.memory[0x31]&15==15:break
    if mode==0xb5 and active:
     assert snapshot(old)==snapshot(new),(kind,ad,phase,snapshot(old),snapshot(new));fast+=1
(q/'effectfast-tests.json').write_text(json.dumps({'ordinaryFrameCases':normal,'fastEffectEndpoints':fast,'firstFrameAndCleanupPreserved':True}));print('PASS',normal,fast)
