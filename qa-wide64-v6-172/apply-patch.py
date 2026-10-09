"""Reproduce v6 from the exact accepted v5 ROM; refuse unrelated inputs/overwrites."""
from pathlib import Path
import hashlib,json,sys
manifest=json.loads(Path(__file__).with_name('release.json').read_text())
source,destination=map(Path,sys.argv[1:3])
raw=source.read_bytes()
assert hashlib.sha256(raw).hexdigest()==manifest['sourceSha256'],'Wrong source edition'
out=bytearray(raw)
for patch in manifest['patches']:
 at=patch['offset'];before=bytes(patch['old']);after=bytes(patch['new'])
 assert len(before)==len(after) and out[at:at+len(before)]==before
 out[at:at+len(after)]=after
assert hashlib.sha256(out).hexdigest()==manifest['sha256']
assert not destination.exists() or destination.read_bytes()==out,'Refusing to replace another file'
destination.write_bytes(out)
print(manifest['sha256'])
