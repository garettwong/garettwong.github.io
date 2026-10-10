from pathlib import Path
import json,hashlib
q=Path(__file__).parent;r=q.parent;d=json.loads((q/'native/native-patch-proof.json').read_text());b=bytearray((r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v16.nes').read_bytes())
assert hashlib.sha256(b).hexdigest()==d['sourceSha256']
for c in d['regions']:
 a=c['offset'];old=bytes.fromhex(c['before']);new=bytes.fromhex(c['after']);assert b[a:a+len(old)]==old;b[a:a+len(new)]=new
assert hashlib.sha256(b).hexdigest()==d['targetSha256']
assert b==(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v17.nes').read_bytes()
print('PASS reproducible Player189 ROM',d['targetSha256'])
