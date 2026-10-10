from pathlib import Path
import json
q=Path(__file__).parent;ns={'__file__':str(q/'test-regression.py')};exec((q/'test-regression.py').read_text().split('def at(i):')[0],ns)
ns['b']=(q/'candidate-clearfast.nes').read_bytes();ns['p']=ns['b'][528:];cases=0
for mode,active in [(0,0),(0,1),(0xb5,0),(0xb5,1)]:
 for timer in range(256):
  for carry in [0,1]:
   c=ns['CPU']();m=c.m;m.a=45;m.x=32;m.y=81;m.p=0x68|carry;m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.memory[0x31]=timer;c.call(0x9e57,12)
   old=0x87 if mode==0xb5 and active and timer>=128 else timer
   assert (m.a,m.x,m.y,m.sp,c.bank)==(old,32,81,255,12)
   assert m.memory[0x31]==((old+1)&255 if timer>=128 else timer)
   assert m.p&0x41==0x40|carry
   assert m.p&0x82==old&128|2*int(old==0)
   cases+=1
(q/'clearfast-tests.json').write_text(json.dumps({'cleanupCases':cases,'normalExact':True,'fastCleanupTimerOnly':True}));print('PASS',cases)
