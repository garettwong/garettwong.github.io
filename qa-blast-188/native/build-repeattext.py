from pathlib import Path
import subprocess,hashlib
q=Path(__file__).parent;t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((q/'candidate-approachfast.nes').read_bytes())
(q/'repeattext.cfg').write_text('MEMORY { CODE:start=$9200,size=$200,file="repeattext.bin"; } SEGMENTS { CODE:load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'repeattext.s'),'-o',str(q/'repeattext.o')],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/'repeattext.cfg'),str(q/'repeattext.o')],cwd=q,check=True)
code=(q/'repeattext.bin').read_bytes();a=528+19*16384+0x1200;b[a:a+len(code)]=code
(q/'candidate-repeattext.nes').write_bytes(b);print(hashlib.sha256(b).hexdigest())
