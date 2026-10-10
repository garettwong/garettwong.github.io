from pathlib import Path
import json
q=Path(__file__).parent;o=q.parent/'NES-Blast188-QA/native';ns={'__file__':str(o/'test-regression.py')};exec((o/'test-regression.py').read_text().split('def at(i):')[0],ns)
roms=[(q.parent/'NES-Wide64-HPBP169/games/Dragon_Ball_Z_II_Wide64_NGPlus_v16.nes').read_bytes(),(q/'candidate.nes').read_bytes()]
protected=list(range(0x200,0x300))+list(range(0x30e,0x321))+list(range(0x32e,0x341))+list(range(0xa7,0xae))+[a for a in range(0x7200,0x8000) if a not in range(0x73cc,0x73cf)]
rows=[]
for mode,active in [(0,0),(0,1),(0xb5,0),(0xb5,1)]:
 for kind in [0,28,29,30,31,32,36]:
  for ad in range(3):
   for x in [0,32]:
    outputs=[]
    for b in roms:
     ns['b']=b;ns['p']=b[528:];c=ns['CPU']();m=c.m;m.memory[0x73fe]=mode;m.memory[0x73c0]=active;m.memory[0xad]=ad;m.memory[0x321]=m.memory[0x341]=kind;m.memory[0x32c]=0;m.memory[0x34c]=16
     for steps in range(2000):
      m.x=x;m.memory[0x600:0x670]=[0]*112;c.call(0x8185,13)
      if m.memory[0x7d]&(128 if x==0 else 64):break
     else:raise AssertionError(('unfinished visual script',mode,active,kind,ad,x))
     outputs.append(([m.memory[a]for a in protected],steps+1,m.memory[:0x100]+m.memory[0x200:0x8000],m.sp))
    a,b=outputs
    assert a[0]==b[0],('combat data changed',mode,active,kind,ad,x,[(hex(addr),av,bv)for addr,av,bv in zip(protected,a[0],b[0])if av!=bv][:10])
    assert a[3]==b[3]==255
    if not(mode==0xb5 and active):assert a==b,('ordinary path differs',mode,active,kind,ad,x)
    rows.append({'mode':mode,'active':active,'script':kind,'side':x,'variant':ad,'oldFrames':a[1],'newFrames':b[1],'combatDataUnchanged':True})
(q/'native-visual-results.json').write_text(json.dumps({'status':'PASS','cases':len(rows),'rows':rows},indent=2));print('PASS',len(rows),'real native script endpoints, persistent combat data unchanged; inactive paths exact')
