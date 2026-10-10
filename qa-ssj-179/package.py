from pathlib import Path
import json,hashlib,zlib,re,shutil
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');source=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v8.nes').read_bytes();old=hashlib.sha256(source).hexdigest();prior=json.loads((r/'dbz-wide64-v7-edition.json').read_text())['romId'];b=bytearray((q/'candidate.nes').read_bytes())
assert b[0x2f8ef]==ord('8');b[0x2f8ef]=ord('9');b[0x300ab:0x300cb]=hashlib.sha256(b'Wide64 v9 Player179 SSJII individual10kills 100xSSJI, ship palette isolation'+b).digest();new=hashlib.sha256(b).hexdigest();crc=zlib.crc32(b[528:528+524288]);(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v9.nes').write_bytes(b)
def convert(s):
 return s.replace('v8','v9').replace('V8','V9').replace(old,new).replace(old[:12],new[:12]).replace('3087365842',str(crc)).replace('Player 178','Player 179').replace('?v=178','?v=179').replace('RELEASE=178','RELEASE=179').replace('release===178','release===179').replace('release:178','release:179').replace('wide64Release="178"','wide64Release="179"').replace('400-enemy battles','Super Saiyan II').replace('expanded-battle edition','Super Saiyan II edition')
def resident(at):return b[528+0x17600+at] if at<0x900 else b[528+0x2f700+at-0x900] if at<0x1000 else b[16+at-0x1000]
srcdesc=json.loads((r/'dbz-wide64-v8-edition.json').read_text());patch=json.loads((q/'patch.json').read_text())
for p in [*r.glob('dbz-wide64-v8*'),*r.glob('player-wide64-v8*'),r/'touch-controls-wide64-v8.js']:
 if '-source-' in p.name:continue
 s=convert(p.read_text(encoding='utf8'))
 # Only save-copy source references retain previous edition version numbers.
 if p.name.endswith(('host.mjs','copy.mjs','copy-contract.mjs','selected-save-copy.mjs')):s=s.replace('v7','v8').replace('V7','V8').replace(prior,old)
 if p.name.endswith('host.mjs'):
  s=s.replace('V9 adds battles with up to 400 enemies and strength up to 128×.','V9 adds automatic Super Saiyan II after10 personal defeats in one battle.').replace('Super Saiyan combat BP 100×.','Super Saiyan I 100× · Super Saiyan II 10,000× normal BP.')
 if p.name.endswith('selected-save-copy.mjs'):
  start=s.index('  for(let i=0x40000;');end=s.index('  for(const [cpu,length]',start)
  allowed=[(x['offset']-528,x['offset']-528+len(bytes.fromhex(x['new']))-1) for x in patch['patches'] if 528+0x40000<=x['offset']<528+0x44000]
  s=s[:start]+"  for(let i=0x40000;i<0x44000;i++)if(source.rom[528+i]!==target.rom[528+i])assert("+'||'.join(f'inRange(i,{a},{z})' for a,z in allowed)+",'Target changed unaudited bank16 code');\n"+s[end:]
  old_allowed='inRange(at,0x303,0x308)||at===0x81b||inRange(at,0x879,0x87f)||inRange(at,0x91b,0x91d)||inRange(at,0xbde,0xbfd)||inRange(at,0x1082,0x1083)'
  s=s.replace(old_allowed,'inRange(at,0x1058,0x1059)||inRange(at,0x105e,0x105f)||inRange(at,0x1082,0x1083)')
  s=s.replace('Only the audited encounter code ranges and NFO identity change; progression stays exact.','Only the audited transformation trampolines and NFO identity change; progression stays exact.')
 if p.name.endswith('copy-contract.mjs'):
  s=re.sub(r'export const SOURCE_RESIDENT_SPANS_JSON = .*?;',f'export const SOURCE_RESIDENT_SPANS_JSON = {json.dumps(json.dumps([[at,len(data)] for at,data in srcdesc["residentChecks"]],separators=(",",":")))};',s)
  s=re.sub(r'export const BASELINE_FINGERPRINT_BYTES = .*?;',f'export const BASELINE_FINGERPRINT_BYTES = {list(b[0x300ab:0x300cb])};',s)
 if p.name.endswith('adapter.js'):
  match=re.search(r'const config=(\{.*?\});',s);cfg=json.loads(match.group(1));cfg['residentChecks']=[[at,[resident(at+i) for i in range(len(data))]] for at,data in cfg['residentChecks']];s=s[:match.start(1)]+json.dumps(cfg,separators=(',',':'))+s[match.end(1):]
 (r/p.name.replace('v8','v9')).write_text(s,encoding='utf8')
edition=json.loads((r/'dbz-wide64-v9-edition.json').read_text());edition.update(release=179,status='QA_PENDING',selectedSaveCopySourceRomId=old,selectedSaveCopySourceEditionUrl='/dbz-wide64-v9-source-v8.json',superSaiyanII={'killsAddress':0x73bb,'usedAddress':0x73bd,'bannerQueueAddress':0x73be,'threshold':10,'stageIIMultiplier':'10000','relativeToStageI':'100'});edition['residentChecks']=[[at,[resident(at+i) for i in range(len(data))]] for at,data in edition['residentChecks']]
(r/'dbz-wide64-v9-edition.json').write_text(json.dumps(edition,indent=2)+'\n');shutil.copyfile(r/'dbz-wide64-v8-edition.json',r/'dbz-wide64-v9-source-v8.json');shutil.copyfile(r/'packs/wide64-v8-nameplates-v2.png',r/'packs/wide64-v9-nameplates-v2.png')
report=dict(sourceSha256=old,sha256=new,prgCrc32=crc,release=179);(q/'release.json').write_text(json.dumps(report,indent=2));print(report)
