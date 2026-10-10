from pathlib import Path
import re,hashlib,json,shutil
r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');q=Path('D:/Codex 2/projects/NES-Pad181-QA');out=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/Updated NES/Player 181 - Restored D-pad');out.mkdir(exist_ok=True)
paths=['player-wide64-v10.html','player-wide64-v10-runtime.js','dbz-wide64-v10-shell.js','dbz-wide64-v10-host.mjs','dbz-wide64-v10-play.html']
changes={p:p.replace('v10','v10-pad181') for p in paths}
original={p:hashlib.sha256((r/p).read_bytes()).hexdigest() for p in paths+['games/Dragon_Ball_Z_II_Wide64_NGPlus_v10.nes','index.html']}
correct=re.search(r'<path d="([^"]+)"',(r/'player-wide64-v6.html').read_text()).group(1)
wrong=re.search(r'<path d="([^"]+)"',(r/'player-wide64-v10.html').read_text()).group(1)
for p,dest in changes.items():
 s=(r/p).read_text(encoding='utf8')
 for a,b in changes.items():s=s.replace(a,b)
 for a,b in [('WIDE64_RELEASE=180','WIDE64_RELEASE=181'),('wide64Release="180"','wide64Release="181"'),('release:180','release:181'),('release===180','release===181'),('Player 180','Player 181'),('?v=180','?v=181')]:s=s.replace(a,b)
 s=s.replace('Wide64 NG+ v10 · All-target 400','Wide64 NG+ v10 · Restored D-pad').replace('Wide64 NG+ v10 · Super Saiyan II','Wide64 NG+ v10 · Restored D-pad')
 if p.endswith('shell.js'):s=s.replace('"data-release":`168`','"data-release":`181`').replace('Dragon_Ball_Z_II_Wide64_NGPlus_v10.nes','Dragon_Ball_Z_II_Wide64_NGPlus_v10_Player181.nes')
 if p=='player-wide64-v10.html':
  assert wrong in s;s=s.replace(wrong,correct)
 (r/dest).write_text(s,encoding='utf8')
rom='Dragon_Ball_Z_II_Wide64_NGPlus_v10_Player181.nes'
shutil.copyfile(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v10.nes',r/'games'/rom);shutil.copyfile(r/'games'/rom,out/rom)
url='https://garettwong.github.io/dbz-wide64-v10-pad181-play.html'
(out/'Play Player 181.url').write_text('[InternetShortcut]\nURL='+url+'\n')
(out/'READ ME.txt').write_text('Player 181 - restored symmetrical D-pad\n\nOpen Play Player 181.url when you finish playing.\nThe controller drawing lives in the web player. The included NES file has identical gameplay bytes to v10 Player 180, preserving 400-target attacks and save compatibility.\nYour existing v10 save slots appear in Player 181 on the same browser. Save in Player 180, then open Player 181 and load that slot when ready.\nNo running game or personal save was accessed during this repair. Previous player files remain unchanged.\n')
(q/'build.json').write_text(json.dumps({'files':list(changes.values())+['games/'+rom],'oldHashes':original,'previousPath':wrong,'restoredPath':correct,'romSha256':hashlib.sha256((r/'games'/rom).read_bytes()).hexdigest(),'url':url,'localFolder':str(out)},indent=2))
print(json.dumps({'files':list(changes.values()),'restoredPath':correct,'output':str(out)}))
