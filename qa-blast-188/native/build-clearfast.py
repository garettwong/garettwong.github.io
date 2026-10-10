from pathlib import Path
import subprocess,hashlib
q=Path(__file__).parent;t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((q/'candidate-glyphfast.nes').read_bytes())
for name,addr in [('clearfast',0x9200),('cleanupfast',0x9c00)]:
 (q/(name+'.cfg')).write_text(f'MEMORY {{ CODE:start=${addr:04x},size=$200,file="{name}.bin"; }} SEGMENTS {{ CODE:load=CODE,type=ro; }}')
 subprocess.run([str(t/'ca65.exe'),str(q/(name+'.s')),'-o',str(q/(name+'.o'))],check=True);subprocess.run([str(t/'ld65.exe'),'-C',str(q/(name+'.cfg')),str(q/(name+'.o'))],cwd=q,check=True)
 code=(q/(name+'.bin')).read_bytes();a=528+19*16384+addr-0x8000
 if name=='cleanupfast':assert b[a:a+len(code)]==b'\xff'*len(code)
 b[a:a+len(code)]=code
# PHP + returning far call + PLP / ORA #0 sets only N/Z from returned original timer.
a=528+12*16384+0x1e57;code=bytes.fromhex('08205e9e4c649e20cf6513009c28090060');assert len(code)==17;assert b[a:a+17]==b'\xff'*17;b[a:a+17]=code
a=528+12*16384+0x2c11;assert b[a:a+6].hex()=='a5311033e631';b[a:a+6]=bytes.fromhex('20579e1032ea')
(q/'candidate-clearfast.nes').write_bytes(b);print(hashlib.sha256(b).hexdigest())
