from pathlib import Path
import json,itertools
q=Path(__file__).parent
s=(q.parent/'NES-Blast182-QA/test-regression.py').read_text().split('rows=[]')[0]
exec(s)
newp=p;oldp=(q.parent/'NES-Wide64-HPBP169/games/Dragon_Ball_Z_II_Wide64_NGPlus_v11.nes').read_bytes()[528:]
def run(values,enemy=None,total=400,invalid=None):
 c=fixture(total);m=c.m
 for i in range(9):m.memory[0x200+18*i]=128;m.memory[0x20f+18*i]=0;m.memory[0x7400+18*i]=0
 for i,v in enumerate(values):
  n=18*i;m.memory[0x200+n]=i+1;m.memory[0x20f+n]=1;m.memory[0x20e+n]=min(15,v)<<4;m.memory[0x7c81+n]=v&255
 if invalid is not None:m.memory[0x20f+18*invalid]=0x1f
 for i in range(100):m.memory[at(i)]=128;m.memory[at(i)+15]=0
 for i in range(5):m.memory[0x2a2+18*i]=128;m.memory[0x2b1+18*i]=0
 if enemy:
  gid,v=enemy;a=at(gid);m.memory[a]=16;m.memory[a+14]=min(15,v)<<4;m.memory[a+15]=1;m.memory[0x7d81+2*gid]=v&255
  if gid<5:m.memory[0x2a2+18*gid:0x2b4+18*gid]=m.memory[a:a+18]
 m.memory[0x12]=0x37;m.memory[0x13]=0x49;c.call(0x6b1f,bank=12)
 assert m.memory[0x12:0x14]==[0x37,0x49]
 return {'winner':m.memory[0x11],'found':m.memory[0x10],'page':m.memory[0x7370],'bank':c.bank}
p=oldp;before=run([256,255,64,16]);assert before['winner']==54,before
p=newp;rows=[]
for vals in itertools.permutations([1,64,255,256]):
 got=run(vals);assert got['winner']==vals.index(256)*18,(vals,got);assert got['found']!=0;rows.append({'defense':vals,'result':got})
for vals in [[256,255],[255,256],[16,17],[17,16],[15,16],[1,8,7]]:
 got=run(vals);assert got['winner']==vals.index(max(vals))*18,(vals,got)
assert run([256,255],invalid=0)['winner']==18
for gid in [0,4,5,19,20,49,99]:
 got=run([255,64],enemy=(gid,256));assert got['winner']==(gid%5)*18+1 and got['page']==gid//5,(gid,got)
 got=run([256,64],enemy=(gid,255));assert got['winner']==0 and got['page']==0,(gid,got)
assert run([])['found']==0
(q/'initiative-results.json').write_text(json.dumps({'result':'PASS','reproducedOldBug':{'defenses':[256,255,64,16],'oldResult':before,'oldWrongWinnerDefense':16},'newPartyPermutations':rows,'additionalDistinctPairs':6,'ineligibleSkipped':True,'enemyFullRankChecks':14,'emptyRoster':True},indent=2))
print('PASS old bug reproduced, 24 corrected permutations, 6 pairs, 14 enemy full-rank/page cases, eligibility, empty roster')
