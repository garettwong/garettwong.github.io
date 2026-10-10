from pathlib import Path
import subprocess,hashlib
q=Path(__file__).parent;t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((q/'candidate-clearfast.nes').read_bytes())
(q/'effectfast.cfg').write_text('MEMORY { CODE:start=$9E00,size=$200,file="effectfast.bin"; } SEGMENTS { CODE:load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'effectfast.s'),'-o',str(q/'effectfast.o')],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/'effectfast.cfg'),str(q/'effectfast.o')],cwd=q,check=True)
code=(q/'effectfast.bin').read_bytes();a=528+19*16384+0x1e00;assert b[a:a+len(code)]==b'\xff'*len(code);b[a:a+len(code)]=code
a=528+6*16384+0x3ff6;code=bytes.fromhex('20cf6513009e');assert b[a:a+len(code)]==b'\xff'*len(code);b[a:a+len(code)]=code
a=528+6*16384+0x2b;assert b[a:a+3].hex()=='4c1b96';b[a:a+3]=bytes.fromhex('4cf6bf')
(q/'candidate-effectfast.nes').write_bytes(b);print(hashlib.sha256(b).hexdigest())
