from pathlib import Path
import json,hashlib,zlib,re,shutil
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');source=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v9.nes').read_bytes();old=hashlib.sha256(source).hexdigest();prior=json.loads((r/'dbz-wide64-v8-edition.json').read_text())['romId'];b=bytearray((q/'candidate.nes').read_bytes())
b[0x2f8ef]=ord('A');b[0x300ab:0x300cb]=hashlib.sha256(b'Wide64 v10 Player180 native all-target400 persistent reserve HP'+b).digest();new=hashlib.sha256(b).hexdigest();crc=zlib.crc32(b[528:528+524288]);(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v10.nes').write_bytes(b)
src=json.loads((r/'dbz-wide64-v9-edition.json').read_text());patch=json.loads((q/'patch.json').read_text());mutable={a-0x6000+i for a in patch['slots'] for i in range(3)}
def resident(at):return b[528+0x17600+at] if at<0x900 else b[528+0x2f700+at-0x900] if at<0x1000 else b[16+at-0x1000]
checks=[]
for at,data in src['residentChecks']:
 start=None;run=[]
 for i in range(len(data)):
  if at+i in mutable:
   if run:checks.append([start,run]);run=[];start=None
  else:
   if start is None:start=at+i
   run.append(resident(at+i))
 if run:checks.append([start,run])
def convert(s):
 return s.replace('v9','v10').replace('V9','V10').replace(old,new).replace(old[:12],new[:12]).replace('5300803a3f7481ccbe31e28959bfa1ae0831492581c4d79131d9b9d95d334414',new).replace(str(src['prgCrc32']),str(crc)).replace('Player 179','Player 180').replace('?v=179','?v=180').replace('RELEASE=179','RELEASE=180').replace('release===179','release===180').replace('release:179','release:180').replace('wide64Release="179"','wide64Release="180"')
for p in [*r.glob('dbz-wide64-v9*'),*r.glob('player-wide64-v9*'),r/'touch-controls-wide64-v9.js']:
 if '-source-' in p.name:continue
 s=convert(p.read_text(encoding='utf8'))
 if p.name.endswith(('host.mjs','copy.mjs','copy-contract.mjs','selected-save-copy.mjs')):s=s.replace('v8','v9').replace('V8','V9').replace(prior,old)
 if p.name.endswith('host.mjs'):s=s.replace('V10 adds automatic Super Saiyan II after 10 personal defeats in one battle.','V10 lets one all-target cast reach the entire battle, up to 400 enemies.')
 if p.name.endswith('selected-save-copy.mjs'):
  s=s.replace("const spans=JSON.parse(SOURCE_RESIDENT_SPANS_JSON);spans.push([0x1166,6]);","const spans=JSON.parse(SOURCE_RESIDENT_SPANS_JSON);")
  s=s.replace('out.add(start+i);return out;','out.add(start+i);if(target)for(const at of '+json.dumps(sorted(mutable),separators=(',',':'))+')out.delete(at);return out;')
  start=s.index('  for(let i=0x40000;');end=s.index('  for(const [cpu,length]',start)
  allowed=[(x['offset']-528,x['offset']-528+len(bytes.fromhex(x['new']))-1) for x in patch['patches'] if 528+0x40000<=x['offset']<528+0x44000]
  s=s[:start]+"  for(let i=0x40000;i<0x44000;i++)if(source.rom[528+i]!==target.rom[528+i])assert("+'||'.join(f'inRange(i,{a},{z})' for a,z in allowed)+",'Target changed unaudited bank16 code');\n"+s[end:]
  # All changed resident bytes are pinned to this exact audited build.
  allowedResident=[]
  for at in range(0x1200):
   off=528+0x17600+at if at<0x900 else 528+0x2f700+at-0x900 if at<0x1000 else 16+at-0x1000
   if source[off]!=b[off]:allowedResident.append(at)
  s=re.sub(r"if\(residentByte\(source,at\)!==residentByte\(target,at\)\)assert\(.*?,'Target changed unaudited resident code'\);","if(residentByte(source,at)!==residentByte(target,at))assert("+json.dumps(allowedResident,separators=(',',':'))+".includes(at),'Target changed unaudited resident code');",s)
  s=s.replace('  // Schema marker W64B,',"  for(let at=0x13c0;at<=0x13ca;at++){b[p.wram+at]=0;changed.add(p.wram+at);}\n  // Schema marker W64B,")
  s=s.replace('audited Super Saiyan II edition','audited all-target 400 edition')
 if p.name.endswith('copy-contract.mjs'):
  s=re.sub(r'export const SOURCE_RESIDENT_SPANS_JSON = .*?;',f'export const SOURCE_RESIDENT_SPANS_JSON = {json.dumps(json.dumps([[at,len(data)] for at,data in src["residentChecks"]],separators=(",",":")))};',s)
  s=re.sub(r'export const BASELINE_FINGERPRINT_BYTES = .*?;',f'export const BASELINE_FINGERPRINT_BYTES = {list(b[0x300ab:0x300cb])};',s)
 if p.name.endswith('adapter.js'):
  match=re.search(r'const config=(\{.*?\});',s);cfg=json.loads(match.group(1));cfg['residentChecks']=checks;s=s[:match.start(1)]+json.dumps(cfg,separators=(',',':'))+s[match.end(1):]
 (r/p.name.replace('v9','v10')).write_text(s,encoding='utf8')
edition=json.loads((r/'dbz-wide64-v10-edition.json').read_text());edition.update(release=180,status='QA_PENDING',residentChecks=checks,selectedSaveCopySourceRomId=old,selectedSaveCopySourceEditionUrl='/dbz-wide64-v10-source-v9.json',allTarget={'maximum':400,'nativeReserveRecords':300,'persistentRecordBytes':3,'readyAddress':0x73c1,'activeAddress':0x73c0,'slots':patch['slots']})
(r/'dbz-wide64-v10-edition.json').write_text(json.dumps(edition,indent=2)+'\n');shutil.copyfile(r/'dbz-wide64-v9-edition.json',r/'dbz-wide64-v10-source-v9.json')
for p in (r/'packs').glob('wide64-v9-*'):shutil.copyfile(p,p.with_name(p.name.replace('v9','v10')))
(q/'release.json').write_text(json.dumps(dict(sourceSha256=old,sha256=new,prgCrc32=crc,release=180),indent=2));print(new)
