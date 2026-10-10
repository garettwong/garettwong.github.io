from pathlib import Path
import subprocess,json,hashlib,zlib
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v10.nes').read_bytes());old=bytes(b)
(q/'addon.cfg').write_text('MEMORY { CODE: start=$8000,size=$4000,file="addon.bin"; } SEGMENTS { CODE: load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'addon.s'),'-o',str(q/'addon.o')],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/'addon.cfg'),str(q/'addon.o'),'-Ln',str(q/'addon.lbl')],cwd=q,check=True)
L={l.split()[2].lstrip('.'):int(l.split()[1],16) for l in (q/'addon.lbl').read_text().splitlines()};patches=[]
def patch(at,data):
 patches.append({'offset':at,'old':b[at:at+len(data)].hex(),'new':data.hex()});b[at:at+len(data)]=data
def far(name):return b'\x20\xcf\x65\x13'+L[name].to_bytes(2,'little')
patch(528+19*0x4000,(q/'addon.bin').read_bytes());patch(528+12*0x4000+0x28bc,far('finish_check')+b'\x60');patch(528+0x2f700+0x610,far('step')+b'\x60')
needle=bytes.fromhex('20cf65124886');hits=[i for i in range(528) if b[i:i+6]==needle];assert len(hits)==1,hits;patch(hits[0],far('reset'))
# Fingerprint is in an unused tag region, not executable game code.
patch(0x300ab,hashlib.sha256(b'Player182 victory and five-target blasts'+b).digest())
assert b[528+18*0x4000:528+19*0x4000]==old[528+18*0x4000:528+19*0x4000]
(q/'candidate.nes').write_bytes(b);(q/'addon-patch.json').write_text(json.dumps({'labels':L,'patches':patches,'sha256':hashlib.sha256(b).hexdigest(),'prgCrc32':zlib.crc32(b[528:528+524288])},indent=2));print('ADDON BUILT',len((q/'addon.bin').read_bytes()),hashlib.sha256(b).hexdigest())
