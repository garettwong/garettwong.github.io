from pathlib import Path
import json,hashlib,concurrent.futures,urllib.request,time
r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');q=Path(__file__).parent
manifest=json.loads((r/'qa-blast-189/asset-manifest.json').read_text());base='https://garettwong.github.io/'
def check(x):
 url=base+x['path']+'?verify189='+str(time.time_ns())
 with urllib.request.urlopen(url,timeout=60) as s: data=s.read();status=s.status
 sha=hashlib.sha256(data).hexdigest();return dict(path=x['path'],status=status,bytes=len(data),sha256=sha,match=sha==x['sha256'])
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(check,manifest))
(q/'live-assets.json').write_text(json.dumps(dict(base=base,checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),files=results),indent=2))
failed=[x for x in results if not x['match']];print('Public assets',len(results),'matched',len(results)-len(failed),'failures',failed);assert not failed
