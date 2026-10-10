from pathlib import Path
import json,random
q=Path(__file__).parent;ns={'__file__':str(q/'test-regression.py')};exec((q/'test-regression.py').read_text().split('def at(i):')[0],ns)
roms={name:(q/file).read_bytes() for name,file in [('old','candidate-effectfast.nes'),('new','candidate-mathfast.nes')]}
def run(which,n,d,mode=0xb5,active=1):
 ns['b']=roms[which];ns['p']=ns['b'][528:];c=ns['CPU']();m=c.m;m.a=91;m.x=32;m.y=17;m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.memory[0x7eb8:0x7ec4]=list(n.to_bytes(12,'little'));m.memory[0x7ec4:0x7ed0]=list(d.to_bytes(12,'little'));c.call(0x9260,16)
 return {'result':m.memory[0xa8]+256*m.memory[0xa9],'number':m.memory[0x7eb8:0x7edc],'regs':(m.a,m.x,m.y,m.p&~0x10,m.sp),'zp':m.memory[:24],'cycles':m.processorCycles}
rng=random.Random(188);pairs=[(n,d) for n in [0,1,255,256,65535,65536,2**32-1,2**64-1,2**96-1] for d in [0,1,255,2**16,2**64-1,2**95,2**96-1]]
for bits in [8,16,24,32,48,64,80,96]:
 for _ in range(12):pairs.append((rng.getrandbits(bits),max(1,rng.getrandbits(rng.choice([8,16,32,64,96])))))
rows=[]
for n,d in pairs:
 old=run('old',n,d);new=run('new',n,d);cycles=(old.pop('cycles'),new.pop('cycles'));assert old==new,(n,d,old,new)
 assert new['result']==(min(65535,n//d) if d else 65535),(n,d,new)
 if d:assert int.from_bytes(bytes(new['number'][24:]),'little')==n%d
 rows.append({'bits':n.bit_length(),'oldCycles':cycles[0],'newCycles':cycles[1]})
for mode,active in [(0,0),(0,1),(0xb5,0)]:
 for n,d in pairs[:63]:
  old=run('old',n,d,mode,active);new=run('new',n,d,mode,active);old.pop('cycles');new.pop('cycles');assert old==new,(mode,active,n,d,old,new)
(q/'mathfast-tests.json').write_text(json.dumps({'exact96BitDivisionCases':len(rows),'ordinaryCases':189,'rows':rows},indent=2));print('PASS',len(rows),189,'low-value cycle ratio',sum(r['newCycles'] for r in rows if r['bits']<=32)/sum(r['oldCycles'] for r in rows if r['bits']<=32))
