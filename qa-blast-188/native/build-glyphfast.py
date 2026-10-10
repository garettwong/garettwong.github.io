from pathlib import Path
import subprocess,hashlib
q=Path(__file__).parent;t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly')
(q/'glyphfast.cfg').write_text('MEMORY { CODE:start=$9800,size=$200,file="glyphfast.bin"; } SEGMENTS { CODE:load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'glyphfast.s'),'-o',str(q/'glyphfast.o')],check=True)
subprocess.run([str(t/'ld65.exe'),'-C',str(q/'glyphfast.cfg'),str(q/'glyphfast.o')],cwd=q,check=True)
b=bytearray((q/'candidate-scriptwait.nes').read_bytes());code=(q/'glyphfast.bin').read_bytes();a=528+19*16384+0x1800;assert b[a:a+len(code)]==b'\xff'*len(code);b[a:a+len(code)]=code
a=528+15*16384+0x26ea;assert b[a:a+32].hex()=='20aed2a90220ccd2a9049d0106a5569d0206a5579d0306b15ac9e0b04620c1ea';b[a:a+32]=bytes.fromhex('20f0e64cf6e620cf65130098c9e0b053c900f00c20c1ea4c0ae7eaeaeaeaeaea')
b[528+31*16384+0x26ea:528+31*16384+0x270a]=b[528+15*16384+0x26ea:528+15*16384+0x270a]
(q/'candidate-glyphfast.nes').write_bytes(b);print(hashlib.sha256(b).hexdigest())
