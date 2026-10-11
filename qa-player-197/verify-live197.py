import concurrent.futures, hashlib, json, urllib.request
from pathlib import Path
root=Path('D:/Codex 2/projects/NES-Wide64-HPBP169/qa-player-197')
manifest=json.loads((root/'asset-manifest.json').read_text())
def check(row):
 url='https://garettwong.github.io/'+row['path']+'?verify=197-final'
 with urllib.request.urlopen(url,timeout=45) as response: data=response.read()
 actual=hashlib.sha256(data).hexdigest()
 return {'path':row['path'],'expected':row['sha256'],'actual':actual,'match':actual==row['sha256'],'bytes':len(data)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: result=list(pool.map(check,manifest))
(root/'live-assets.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'assets':len(result),'matching':sum(r['match'] for r in result),'mismatches':[r['path'] for r in result if not r['match']]}))
assert all(r['match'] for r in result)

