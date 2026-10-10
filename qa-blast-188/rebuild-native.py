from pathlib import Path
import json,hashlib
q=Path(__file__).parent;r=q.parent;d=json.loads((q/'native-patch.json').read_text());b=bytearray((r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v15.nes').read_bytes())
assert hashlib.sha256(b).hexdigest()==d['baseSha256']
for c in d['changes']:
 a=c['offset'];before=bytes.fromhex(c['before']);after=bytes.fromhex(c['after']);assert b[a:a+len(before)]==before;b[a:a+len(after)]=after
assert hashlib.sha256(b).hexdigest()==d['sha256']
assert b==(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v16.nes').read_bytes()
print('PASS reproducible Player188 ROM',d['sha256'])
