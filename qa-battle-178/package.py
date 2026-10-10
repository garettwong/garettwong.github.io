from pathlib import Path
import json,hashlib,zlib,re,shutil
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169')
source=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v7.nes').read_bytes();old=hashlib.sha256(source).hexdigest();prior=json.loads((r/'dbz-wide64-v6-edition.json').read_text())['romId'];b=bytearray((q/'candidate.nes').read_bytes())
assert b[0x2f8ef]==ord('7');b[0x2f8ef]=ord('8')
b[0x300ab:0x300cb]=hashlib.sha256(b'Wide64 v8 Player178 native 180-200 and 380-400 opponents, strength through128'+source+(q/'battle.s').read_bytes()).digest()
new=hashlib.sha256(b).hexdigest();crc=zlib.crc32(b[528:528+524288]);(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v8.nes').write_bytes(b)
def convert(s):
 s=s.replace('v7','v8').replace('V7','V8').replace(old,new).replace(old[:12],new[:12]).replace('3118833174',str(crc))
 s=s.replace('Battle graphics repair','400-enemy battles').replace('graphics-repair edition','expanded-battle edition')
 s=s.replace('/dbz-large-battle.js','/dbz-wide64-v8-large-battle.js')
 for before,after in [('Player 176','Player 178'),('Player 173','Player 178'),('?v=176','?v=178'),('?v=173','?v=178'),('RELEASE=176','RELEASE=178'),('release===176','release===178'),('release:176','release:178'),('wide64Release="176"','wide64Release="178"'),('A training','400 enemies / 128×')]:s=s.replace(before,after)
 return s
def resident(at):
 return b[528+0x17600+at] if at<0x900 else b[528+0x2f700+at-0x900] if at<0x1000 else b[16+at-0x1000]
srcdesc=json.loads((r/'dbz-wide64-v7-edition.json').read_text())
for p in [*r.glob('dbz-wide64-v7*'),*r.glob('player-wide64-v7*'),r/'touch-controls-wide64-v7.js']:
 if '-source-' in p.name:continue
 s=convert(p.read_text(encoding='utf8'))
 if p.name.endswith(('host.mjs','copy.mjs','copy-contract.mjs')):s=s.replace('v6','v7').replace('V6','V7').replace(prior,old)
 if p.name.endswith('host.mjs'):
  s=s.replace('V8 repairs battle graphics and clears unused card digits while keeping quick impacts.','V8 adds battles with up to 400 enemies and strength up to 128×.').replace('Shorter fighter entrances · Quick skill impacts · Super Saiyan artwork · 100× combat BP.','Up to 400 enemies · Strength up to 128× · Super Saiyan combat BP 100×.')
 if p.name.endswith('selected-save-copy.mjs'):
  s=s.replace('v6','v7').replace('V6','V7').replace('graphics-repair','expanded-battle').replace('graphics checkpoint','battle checkpoint')
  s=s.replace("assert(same(target.rom,528+0x40000,source.rom.subarray(528+0x40000,528+0x44000)),'Target changed bank16 progression code');", "for(let i=0x40000;i<0x44000;i++)if(source.rom[528+i]!==target.rom[528+i])assert(i===0x4189c||i===0x41b36||inRange(i,0x42e00,0x42e00+BATTLE_CODE_BYTES-1),'Target changed unaudited bank16 code');")
  s=s.replace("const enc = new TextEncoder();",f"const BATTLE_CODE_BYTES={len((q/'battle.bin').read_bytes())};\nconst enc = new TextEncoder();")
  s=s.replace('inRange(at,0x75e,0x7ff)||inRange(at,0xccf,0xcff)||inRange(at,5,0x41)||inRange(at,0x10f0,0x10fb)||inRange(at,0x1166,0x116b)', 'inRange(at,0x303,0x308)||at===0x81b||inRange(at,0x879,0x87f)||inRange(at,0x91b,0x91d)||inRange(at,0xbde,0xbfd)||inRange(at,0x1082,0x1083)')
  s=s.replace('Only the audited card renderer ranges and NFO identity change; progression stays exact.','Only the audited encounter code ranges and NFO identity change; progression stays exact.')
 if p.name.endswith('copy-contract.mjs'):
  s=re.sub(r'export const SOURCE_RESIDENT_SPANS_JSON = .*?;',f'export const SOURCE_RESIDENT_SPANS_JSON = {json.dumps(json.dumps([[at,len(data)] for at,data in srcdesc["residentChecks"]],separators=(",",":")))};',s)
  s=re.sub(r'export const BASELINE_FINGERPRINT_BYTES = .*?;',f'export const BASELINE_FINGERPRINT_BYTES = {list(b[0x300ab:0x300cb])};',s)
 if p.name.endswith('adapter.js'):
  match=re.search(r'const config=(\{.*?\});',s);cfg=json.loads(match.group(1));cfg['residentChecks']=[[at,[resident(at+i) for i in range(len(data))]] for at,data in cfg['residentChecks']];s=s[:match.start(1)]+json.dumps(cfg,separators=(',',':'))+s[match.end(1):]
 if p.name.endswith('enemies.js'):
  s=s.replace("[3,'80–100','Random count from 80 to 100']", "[3,'80–100','Random count from 80 to 100'],[5,'180–200','Random count from 180 to 200'],[6,'380–400','Random count from 380 to 400']").replace('n<=3','n<=7').replace('[0,1,2,3].map','[0,1,2,3,4,5,6,7].map')
  s=s.replace('Choose again before each battle.','Choose again before each battle. Larger battles continue in groups of up to 100, with victory after the full total is defeated.')
 if p.name.endswith('panel.js'):
  s=s.replace('Math.min(3,','Math.min(7,').replace('exponent<=3','exponent<=7')
  s=s.replace('if(battle&&total<=100)for', 'const waveOffset=b[w+0x13b5]===0xb8?b[w+0x139a]+256*b[w+0x139b]-total:0;\n if(battle&&total<=100)for')
  s=s.replace('Enemy ${i+1}','Enemy ${i+1+waveOffset}').replace('Enemy ${live.index+1}','Enemy ${live.index+1+waveOffset}')
 if p.name.endswith('enemy-info.js'):
  s=s.replace('return {index,id:id&63,bp:', 'const waveOffset=b[w+0x13b5]===0xb8?b[w+0x139a]+256*b[w+0x139b]-total:0;\n return {index,globalIndex:index+waveOffset,id:id&63,bp:')
  s=s.replace('Enemy ${v.index+1}', 'Enemy ${(v.globalIndex??v.index)+1}')
 (r/p.name.replace('v7','v8')).write_text(s,encoding='utf8')
large=(r/'dbz-large-battle.js').read_text(encoding='utf8')
large=large.replace('const total=wram[0x1372],page=wram[0x1370];','const total=wram[0x1372],page=wram[0x1370];\n const full=wram[0x1398]+256*wram[0x1399],pending=wram[0x1396]+256*wram[0x1397],loaded=wram[0x139a]+256*wram[0x139b],waves=wram[0x13b5]===0xb8&&full>100&&full<=400&&pending+loaded===full&&loaded>=total;')
large=large.replace('if(total<10||','if(total<(waves?1:10)||')
large=large.replace('return {total,page,phase:ram[0x30],selected:ram[0x30]===8?page*5+ram[0x70]:-1,enemies,remaining:enemies.filter(e=>e.alive).length};','return {total:waves?full:total,batch:total,pending:waves?pending:0,offset:waves?loaded-total:0,page,phase:ram[0x30],selected:ram[0x30]===8?page*5+ram[0x70]:-1,enemies,remaining:enemies.filter(e=>e.alive).length+(waves?pending:0)};')
large=large.replace('rows=Math.ceil(b.total/columns)','rows=Math.ceil(b.enemies.length/columns)').replace('Math.min(columns,b.total-row*columns)','Math.min(columns,b.enemies.length-row*columns)').replace('enemy.index+1','enemy.index+1+(b.offset||0)')
(r/'dbz-wide64-v8-large-battle.js').write_text(large,encoding='utf8')
edition=json.loads((r/'dbz-wide64-v8-edition.json').read_text());edition.update(release=178,status='QA_PENDING',selectedSaveCopySourceRomId=old,selectedSaveCopySourceEditionUrl='/dbz-wide64-v8-source-v7.json',battleWaves={'pendingAddress':0x7396,'totalAddress':0x7398,'loadedAddress':0x739a,'templateHighStart':0x739c,'markerAddress':0x73b5,'marker':0xb8,'maximumActive':100,'maximumTotal':400,'maximumStrength':128});edition['residentChecks']=[[at,[resident(at+i) for i in range(len(data))]] for at,data in edition['residentChecks']]
(r/'dbz-wide64-v8-edition.json').write_text(json.dumps(edition,indent=2)+'\n');shutil.copyfile(r/'dbz-wide64-v7-edition.json',r/'dbz-wide64-v8-source-v7.json');shutil.copyfile(r/'packs/wide64-v7-nameplates-v2.png',r/'packs/wide64-v8-nameplates-v2.png')
idx=(r/'index.html').read_text();oldhome=re.search(r'assets/index-home173[^\"]+\.js',idx).group();home=convert((r/oldhome).read_text(encoding='utf8')).replace('Latest / Battle Graphics Fix','Latest / 400-enemy Battles');newhome='assets/index-home178-wide64v8-'+hashlib.sha256(home.encode()).hexdigest()[:12]+'.js';(r/newhome).write_text(home,encoding='utf8');(q/'index178.html').write_text(idx.replace(oldhome,newhome).replace('data-home-release="173"','data-home-release="178"'))
patches=[]
for i,(a,z) in enumerate(zip(source,b)):
 if a!=z:
  if patches and patches[-1]['offset']+len(patches[-1]['new'])==i:patches[-1]['old'].append(a);patches[-1]['new'].append(z)
  else:patches.append(dict(offset=i,old=[a],new=[z]))
report=dict(sourceSha256=old,sha256=new,prgCrc32=crc,homeAsset=newhome,release=178,patches=patches,changedBytes=sum(len(p['new']) for p in patches));(q/'release.json').write_text(json.dumps(report,indent=2));print({k:v for k,v in report.items() if k!='patches'})
