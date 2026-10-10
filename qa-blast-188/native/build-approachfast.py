from pathlib import Path
import subprocess,hashlib
q=Path(__file__).parent;t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((q/'candidate-mathfast.nes').read_bytes())
(q/'approachfast.cfg').write_text('MEMORY { CODE:start=$A400,size=$200,file="approachfast.bin"; } SEGMENTS { CODE:load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'approachfast.s'),'-o',str(q/'approachfast.o')],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/'approachfast.cfg'),str(q/'approachfast.o')],cwd=q,check=True)
code=(q/'approachfast.bin').read_bytes();a=528+19*16384+0x2400;assert b[a:a+len(code)]==b'\xff'*len(code);b[a:a+len(code)]=code
a=528+13*16384+0x3d52;code=bytes.fromhex('20cf651300a4');assert b[a:a+len(code)]==b'\xff'*len(code);b[a:a+len(code)]=code
a=528+13*16384+0xdde;assert b[a:a+3].hex()=='4cca8f';b[a:a+3]=bytes.fromhex('4c52bd')
(q/'candidate-approachfast.nes').write_bytes(b);print(hashlib.sha256(b).hexdigest())
