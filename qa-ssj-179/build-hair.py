from pathlib import Path
q=Path(__file__).parent;b=Path('D:/Codex 2/projects/NES-Wide64-HPBP169/games/Dragon_Ball_Z_II_Wide64_NGPlus_v8.nes').read_bytes()[528:];p=b[0x44000:0x48000];lines=[]
for actor,name,lo,hi in [(1,'goku',0x45d,0x48f),(3,'gohan',0x4c1,0x4f3)]:
 for part,operator in [('low','<'),('high','>')]:lines.append(name+'_'+part+': .byte '+','.join(operator+name+'_'+str(i) for i in range(50)))
 for pose in range(50):
  at=p[lo+pose]+p[hi+pose]*256-0x8000;bank,n=p[at:at+2];records=[list(p[at+2+i*4:at+6+i*4]) for i in range(n)];extra=[]
  # Keep each pose's authored root and rotation. Extend the crown upwards,
  # preserving the original foreground tiles over the added sharper tips.
  if n>=3:
   signed=lambda y:y-256 if y>=128 else y
   top=min(signed(rec[1]) for rec in records)
   for rec in records:
    if signed(rec[1])==top:
     added=rec.copy();added[1]=(signed(added[1])-(3 if actor==1 else 5))&255;extra.append(added)
  data=[bank,n+len(extra)]+sum(records+extra,[])
  lines.append(name+'_'+str(pose)+': .byte '+','.join('$%02x'%v for v in data))
(q/'hair-data.inc').write_text('\n'.join(lines))
