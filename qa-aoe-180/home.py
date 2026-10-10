from pathlib import Path
import json,re
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');release=json.loads((q/'release.json').read_text());new=release['sha256'];old=release['sourceSha256']
src='assets/index-home179-wide64v9-cf2e6b9aef36.js';out=f'assets/index-home180-wide64v10-{new[:12]}.js';s=(r/src).read_text(encoding='utf8')
s=s.replace(old,new).replace('dbz-wide64-v9-play.html','dbz-wide64-v10-play.html').replace('NGPlus_v9.nes','NGPlus_v10.nes').replace('Dragon Ball Z II · Latest / Super Saiyan II · 10,000×','Dragon Ball Z II · Latest / All-target 400').replace('Latest · SSJ II after 10 personal defeats · animated awakening · copy a v8 map save','Latest · one group attack reaches all 400 · Super Saiyan II · copy a v9 map save')
for expr in ['e?.id','a']:
 before=f'if({expr}===WIDE64_LATEST_ID)'
 s=s.replace(before,f'if({expr}===`{old}`){{location.assign(`/dbz-wide64-v9-play.html`);return}}'+before)
(r/out).write_text(s,encoding='utf8')
p=r/'index.html';s=p.read_text(encoding='utf8');s=re.sub(r'assets/index-home\d+-wide64v\d+-[a-f0-9]+\.js',out,s);s=re.sub(r'data-home-release="\d+"','data-home-release="180"',s);p.write_text(s,encoding='utf8')
for name in ['dbz-wide64-v10-play.html','dbz-wide64-v10-shell.js','player-wide64-v10.html']:
 p=r/name;s=p.read_text(encoding='utf8').replace('Wide64 NG+ v10 · Super Saiyan II','Wide64 NG+ v10 · All-target 400')
 s=s.replace('New standalone edition · enemy BP & HP 1× / 2× / 4× / 8× · matching victory BP · cards 1–256 · fresh saves','Full-battle group attacks · up to 400 enemies · Super Saiyan II · copy a v9 map save')
 p.write_text(s,encoding='utf8')
(q/'home.json').write_text(json.dumps({'asset':out,'label':'Dragon Ball Z II · Latest / All-target 400'},indent=2));print(out)
