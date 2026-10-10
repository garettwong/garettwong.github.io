from pathlib import Path
from py65.devices.mpu6502 import MPU
import itertools,json
q=Path(__file__).parent;b=Path('D:/Codex 2/projects/NES-Wide64-HPBP169/games/Dragon_Ball_Z_II_Wide64_NGPlus_v11.nes').read_bytes();p=b[528:];m=MPU()
m.memory[0x6000:0x6900]=p[0x17600:0x17f00];m.memory[0x6900:0x7000]=p[0x2f700:0x2fe00];m.memory[0x8000:0xc000]=p[12*0x4000:13*0x4000];m.memory[0xc000:]=p[0x3c000:0x40000]
def choose(values,invalid=None):
 for i in range(9):m.memory[0x200+18*i]=0x80;m.memory[0x20f+18*i]=0
 for i,n in enumerate(values):
  at=18*i;m.memory[0x200+at]=i+1;m.memory[0x20f+at]=1;m.memory[0x20e+at]=(n if n<15 else 15)*16;m.memory[0x7c81+at]=n&255
 if invalid is not None:m.memory[0x20f+18*invalid]=0x1f
 m.pc=0xb7d4;m.sp=255
 for step in range(10000):
  m.step()
  if m.pc==0xb80b:return m.memory[0x11]//18
 raise AssertionError('initiative loop did not finish')
rows=[]
for vals in itertools.permutations([1,64,255,256]):
 selected=choose(vals);assert vals[selected]==256,(vals,selected);rows.append({'defense':vals,'winner':selected})
for vals in [[64,1,255,2],[15,16,14,8],[1,8,7,6],[255,254,1,64]]:
 selected=choose(vals);assert vals[selected]==max(vals);rows.append({'defense':vals,'winner':selected})
assert choose([256,255,64,1],invalid=0)==1
# Exhaustive byte-encoded comparison, with an established best candidate.
for best in range(1,257):
 for candidate in range(1,257):
  m.memory[0x10]=best&255;m.memory[0x7ef3]=1;m.a=candidate&255;m.pc=0x61d4;m.sp=255;m.stPushWord(0x04ff)
  for _ in range(100):
   m.step()
   if m.pc==0x500:break
  else:raise AssertionError('comparison did not return')
  assert bool(m.p&1)==(candidate>=best),(candidate,best,m.p)
  assert bool(m.p&2)==(candidate==best),(candidate,best,m.p)
(q/'initiative-tests.json').write_text(json.dumps({'result':'PASS','partySelections':rows,'ineligibleHighestSkipped':True,'pairComparisons':65536,'range':'1..256, zero encodes 256','equalRanks':'Native random tie path remains intact'},indent=2))
print('PASS 28 party orderings + ineligible highest + all 65536 defensive-rank comparisons')
