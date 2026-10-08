"""Deterministic, hash-locked WebAssembly constructor patch for Wide64 only.

The original 7z archives and every original member remain unchanged. This is
not a global byte replacement: parse WebAssembly sections and code bodies,
require one disassembled Board::Type constructor expression, insert an i32
select at that expression, and recalculate only its body/section lengths.
The WABT 1.0.39 disassembly identifies functions 2079/2071 respectively.
"""
from pathlib import Path
import hashlib,json,shutil,sys
from archive import unpack,pack
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'work/nestopia-wide64';CORES=ROOT/'public/emulator/data/cores'
HASHES={
 'wasm':('051de1b67a5b582b8a1bac6b99471d4f9f883ce3b3603d00330c1a066e546375','451f19e14419c607f1ab654103c176a7ad002065a5214ceed8bcd3a51a00dfc0',2079),
 'legacy-wasm':('d3b1e6d3f0abd55a174d666303e51e06a208c257207ebeb734982a32595e1ac7','20f79301776c0529437c70113d7a802f64055da8c3d226ce6a8bf71309091ce6',2071),
}
sha=lambda b:hashlib.sha256(b).hexdigest()
def uleb(b,p):
 n=shift=0
 while True:
  v=b[p];p+=1;n|=(v&127)<<shift
  if v<128:return n,p
  shift+=7;assert shift<35

def enc(n):
 b=[]
 while n>=128:b.append((n&127)|128);n>>=7
 return bytes(b+[n])
# i32.const 8192; local.get 1; i32.const 20; i32.shr_u;
# i32.const 15; i32.and; i32.shl.
OLD=bytes.fromhex('4180c0002001411476410f7174')
# Stack equivalent to id == CUSTOM_FFE8 ? 524288 : original_capacity.
# The existing board ID remains 0x11568000 (290881536), hence mapper
# dispatch/reset/save identities and all CHR behavior remain unchanged.
NEW=bytes.fromhex('41808020')+OLD+bytes.fromhex('2001418080da8a01461b')
CONTEXT_BEFORE=bytes.fromhex('20022802082205')
CONTEXT_AFTER=bytes.fromhex('2206492108')
def patch(b):
 assert b[:8]==b'\0asm\x01\0\0\0'
 out=bytearray(b[:8]);p=8;changes=[]
 while p<len(b):
  start=p;sid=b[p];size,p=uleb(b,p+1);end=p+size;payload=b[p:end]
  if sid==10:
   n,q=uleb(payload,0);newcode=bytearray(enc(n))
   for index in range(n):
    sz,z=uleb(payload,q);body=payload[z:z+sz];at=body.find(OLD)
    if at>=0:
     assert body.count(OLD)==1
     assert body[at-len(CONTEXT_BEFORE):at]==CONTEXT_BEFORE
     assert body[at+len(OLD):at+len(OLD)+len(CONTEXT_AFTER)]==CONTEXT_AFTER
     changes.append(dict(codeBodyIndex=index,absoluteOffset=p+z+at,bodyOffset=at,oldBodySize=sz,newBodySize=sz+len(NEW)-len(OLD),before=OLD.hex(),after=NEW.hex()))
     body=body[:at]+NEW+body[at+len(OLD):]
    newcode+=enc(len(body))+body;q=z+sz
   assert q==len(payload);out+=bytes([sid])+enc(len(newcode))+newcode
  else:out+=b[start:end]
  p=end
 assert len(changes)==1,changes
 return bytes(out),changes[0]

def main():
 reports=[]
 for variant,(ah,wh,fn) in HASHES.items():
  original=CORES/f'nestopia-{variant}.data';assert sha(original.read_bytes())==ah
  source=WORK/f'input-{variant}';members=unpack(original,source)
  assert sorted(x[0] for x in members)==sorted(['nestopia_libretro.js','nestopia_libretro.wasm','build.json','core.json','license.txt'])
  dest=WORK/f'patched-{variant}';dest.mkdir(parents=True,exist_ok=True)
  for name,_ in members:shutil.copyfile(source/name,dest/name)
  wasm=(source/'nestopia_libretro.wasm').read_bytes();assert sha(wasm)==wh
  revised,detail=patch(wasm);(dest/'nestopia_libretro.wasm').write_bytes(revised)
  # Keep original source metadata and license verbatim. Supplemental provenance
  # is a separate member, and does not impersonate an upstream release.
  provenance=dict(edition='Wide64 NG+ candidate',scope='Mapper 17 CUSTOM_FFE8 PRG capacity 256 KiB -> 512 KiB only',baseArchiveSHA256=ah,baseWasmSHA256=wh,patchedWasmSHA256=sha(revised),decodedFunction=fn,patch=detail,sourcePatch='scripts/nestopia-wide64/nestopia-512k.patch',notice='Locally modified experimental core; not an official upstream build. Exact Emscripten upstream build source/toolchain provenance has not yet been established; do not redistribute as a source-reproducible build.')
  (dest/'wide64-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
  output=CORES/f'nestopia-wide64-{variant}.data';pack(dest,output)
  check=WORK/f'verified-{variant}';checked=unpack(output,check)
  assert {n:sha((dest/n).read_bytes()) for n,_ in checked}=={n:sha((check/n).read_bytes()) for n,_ in checked}
  assert sha(original.read_bytes())==ah
  reports.append(dict(**provenance,output=str(output.relative_to(ROOT)),outputSHA256=sha(output.read_bytes())))
 (WORK/'browser-build.json').write_text(json.dumps(reports,indent=2)+'\n');print(json.dumps(reports,indent=2))
if __name__=='__main__':main()
