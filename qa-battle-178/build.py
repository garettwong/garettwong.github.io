from pathlib import Path
import subprocess,hashlib,json,zlib
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169')
raw=(r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v7.nes').read_bytes();b=bytearray(raw)
t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly')
(q/'battle.cfg').write_text('MEMORY { CODE: start=$AE00,size=$1200,file="battle.bin"; } SEGMENTS { CODE: load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'battle.s'),'-o',str(q/'battle.o')],check=True)
subprocess.run([str(t/'ld65.exe'),'-C',str(q/'battle.cfg'),str(q/'battle.o'),'-Ln',str(q/'battle.lbl')],cwd=q,check=True)
labels={l.split()[2].lstrip('.'):int(l.split()[1],16) for l in (q/'battle.lbl').read_text().splitlines()}
def patch(at,data,old=None):
 if old is not None:assert b[at:at+len(data)]==old,(hex(at),bytes(b[at:at+len(data)]).hex())
 b[at:at+len(data)]=data
def resident(addr,data):
 at=528+(0x17600+addr-0x6000 if addr<0x6900 else 0x2f700+addr-0x6900)
 patch(at,data)
def far(label):return b'\x20\x49\xc7\x10'+labels[label].to_bytes(2,'little')+b'\x60'
code=(q/'battle.bin').read_bytes();patch(528+0x42e00,code,b'\xff'*len(code))
resident(0x681b,b'\x07')
resident(0x6bde,far('range'))
resident(0x6be5,far('total'))
resident(0x6879,bytes.fromhex('20e56b8d7273ea'))
# The bank-switch tail call restores A, thereby changing N/Z. Re-establish the
# original count routine's Y-derived flags in a resident wrapper before return.
resident(0x6303,far('count')[:6])
resident(0x6bef,bytes.fromhex('ad7173d0034cd1bc200363c00060'))
resident(0x691b,bytes.fromhex('4cef6b'))
# Existing strength routines already shift and saturate; extend validated domain.
patch(528+0x4189c,b'\x08',b'\x04')
patch(528+0x41b36,b'\x08',b'\x04')
# Reset reserve metadata at every encounter, including Original and native duels.
# Find the exact trampoline that calls the original reset, without guessing.
needle=bytes.fromhex('2049c7107498');hits=[i for i in range(len(b)) if b[i:i+6]==needle]
assert len(hits)==1,hits
patch(hits[0]+4,labels['reset'].to_bytes(2,'little'))
(q/'candidate.nes').write_bytes(b)
report={'sha256':hashlib.sha256(b).hexdigest(),'prgCrc32':zlib.crc32(b[528:528+524288]),'labels':labels,'codeBytes':len(code),'resetTrampolineFileOffset':hits[0]}
(q/'patch.json').write_text(json.dumps(report,indent=2));print(report)
