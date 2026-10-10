from pathlib import Path
import subprocess,hashlib
q=Path(__file__).parent;t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((q/'candidate-effectfast.nes').read_bytes())
(q/'mathfast.cfg').write_text('MEMORY { CODE:start=$B200,size=$200,file="mathfast.bin"; } SEGMENTS { CODE:load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'mathfast.s'),'-o',str(q/'mathfast.o')],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/'mathfast.cfg'),str(q/'mathfast.o')],cwd=q,check=True)
code=(q/'mathfast.bin').read_bytes();a=528+16*16384+0x3200;assert b[a:a+len(code)]==b'\xff'*len(code);b[a:a+len(code)]=code
a=528+16*16384+0x12b5;assert b[a:a+4].hex()=='a960850f';b[a:a+4]=bytes.fromhex('2000b2ea')
(q/'candidate-mathfast.nes').write_bytes(b);print(hashlib.sha256(b).hexdigest())
