from pathlib import Path
import json
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');p=r/'dbz-wide64-v10-large-battle.js';s=p.read_text();slots=json.loads((q/'slots.json').read_text())
s=s.replace("const portraits=new Map();","const portraits=new Map();\nconst reserveSlots="+json.dumps(slots,separators=(',',':'))+";")
s=s.replace('page>=Math.ceil(total/5)','page>=Math.ceil((waves?full-loaded+total:total)/5)')
s=s.replace('const current=Math.floor(i/5)===page;','const current=Math.floor(i/5)===page&&(!waves||wram[0x13cf]===page);')
before=' return {total:waves?full:total,batch:total,pending:waves?pending:0,offset:waves?loaded-total:0,page,phase:ram[0x30],selected:ram[0x30]===8?page*5+ram[0x70]:-1,enemies,remaining:enemies.filter(e=>e.alive).length+(waves?pending:0)};'
after=''' const reserve=[];
 if(waves&&wram[0x13c1]===0xa0){
  for(let global=loaded;global<full;global++){
   const current=Math.floor((global-(loaded-total))/5)===page&&wram[0x13cf]===page,slot=(global-(loaded-total))%5;
   const at=reserveSlots[global-100]-0x6000,hp=current?ram[0x2a4+slot*18]+256*ram[0x2a5+slot*18]:wram[at]+256*wram[at+1];
   reserve.push({index:global,hp,alive:hp>0});
  }
 }
 return {total:waves?full:total,batch:total,pending:waves?pending:0,offset:waves?loaded-total:0,page,phase:ram[0x30],selected:ram[0x30]===8?page*5+ram[0x70]:-1,enemies,reserve,remaining:enemies.filter(e=>e.alive).length+(waves?(wram[0x13c1]===0xa0?reserve.filter(e=>e.alive).length:pending):0)};'''
assert before in s;s=s.replace(before,after);p.write_text(s)
