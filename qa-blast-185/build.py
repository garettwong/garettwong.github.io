from pathlib import Path
import subprocess,hashlib,zlib,json
q=Path(__file__).parent;r=q.parent/'NES-Wide64-HPBP169';t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v12.nes').read_bytes())
(q/'text.cfg').write_text('MEMORY { CODE: start=$9200,size=$100,file="text.bin"; } SEGMENTS { CODE: load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'text.s'),'-o',str(q/'text.o')],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/'text.cfg'),str(q/'text.o')],cwd=q,check=True)
code=(q/'text.bin').read_bytes();at=528+19*0x4000+0x1200;assert b[at:at+len(code)]==b'\xff'*len(code);b[at:at+len(code)]=code
at=528+12*0x4000+0x1e50;assert b[at:at+7]==b'\xff'*7;b[at:at+7]=bytes.fromhex('20cf6513009260')
at=528+0x3230b;assert b[at:at+3]==bytes.fromhex('20566c');b[at:at+3]=bytes.fromhex('20509e')
# Only completed all-target casts using the browser gate shorten script waits.
# Still execute every native animation opcode and damage/miss/writeback command.
at=528+13*0x4000+0x3af2;code=bytes.fromhex('20c88748adfe73c9b5d00cadc073f00768a900606860')
# fix branch destinations by assembled wrapper below
(q/'wait.s').write_text('.setcpu "6502"\n.segment "CODE"\njsr $87c8\npha\nlda $73fe\ncmp #$b5\nbne old\nlda $73c0\nbeq old\npla\nlda #0\nrts\nold: pla\nrts\n')
(q/'wait.cfg').write_text('MEMORY { CODE: start=$BAF2,size=$1e,file="wait.bin"; } SEGMENTS { CODE: load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'wait.s'),'-o',str(q/'wait.o')],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/'wait.cfg'),str(q/'wait.o')],cwd=q,check=True)
code=(q/'wait.bin').read_bytes();assert b[at:at+len(code)]==b'\xff'*len(code);b[at:at+len(code)]=code
at=528+13*0x4000+0x3f00;assert b[at:at+3]==bytes.fromhex('20c887');b[at:at+3]=bytes.fromhex('20f2ba')
b[0x300ab:0x300cb]=hashlib.sha256(b'Player185 instant grouped blast count'+b).digest()
(q/'candidate.nes').write_bytes(b);(q/'build.json').write_text(json.dumps({'release':185,'sha256':hashlib.sha256(b).hexdigest(),'prgCrc32':zlib.crc32(b[528:528+524288])},indent=2));print((q/'build.json').read_text())
