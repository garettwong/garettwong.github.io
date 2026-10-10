from pathlib import Path
import json
q=Path(__file__).parent
p=q.parent/'NES-Blast188-QA/native/test-regression.py'
s=p.read_text().split('rows=[]')[0].replace("b=(q/'candidate.nes').read_bytes()","b=Path('D:/Codex 2/projects/NES-Wide64-HPBP169/games/Dragon_Ball_Z_II_Wide64_NGPlus_v16.nes').read_bytes()")
ns={'__file__':str(p)};exec(compile(s,str(p),'exec'),ns)
fixture=ns['fixture'];at=ns['at'];L=ns['L'];u16=ns['u16'];rows=[]
for total in range(1,401):
 for lethal in [False,True]:
  c=fixture();m=c.m
  m.memory[0x7372]=min(100,total);m.memory[0x7373]=(min(100,total)+4)//5
  for addr,value in [(0x7398,total),(0x739a,min(100,total)),(0x7396,max(0,total-100))]:m.memory[addr:addr+2]=[value&255,value>>8]
  for i in range(total,100):m.memory[at(i)]=128;m.memory[at(i)+2:at(i)+4]=[0,0]
  m.a=0;c.call(L['load'])
  m.memory[0x31e]=0xe2;m.memory[0x30e]=1;m.memory[0x32d]=0;m.memory[0x7b]=0
  visited=[];target=0
  for step in range(410):
   page=m.memory[0x7370];number=u16(m,0x739a)-m.memory[0x7372]+page*5+target;m.memory[0x34d]=target*18
   assert number not in visited and number<total,(total,number,visited)
   visited.append(number);off=0x2a2+target*18
   m.memory[off+2:off+4]=[0 if lethal else 123,0]
   if lethal:m.memory[off]|=64
   c.call(L['post']);c.call(L['next'])
   if not m.memory[0x10]:break
   target=m.memory[0x20f]&7
  assert visited==list(range(total)),(total,visited)
  assert m.memory[0x73c0]==0,(total,'ACTIVE stuck')
  c.call(L['count']);assert (m.y==0)==lethal,(total,lethal,m.y)
  rows.append({'total':total,'lethal':lethal,'allVisitedOnce':True,'actualCountCorrect':True})
 print('PASS native small',total,flush=True)
(q/'native-all-results.json').write_text(json.dumps(rows,indent=2))
