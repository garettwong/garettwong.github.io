from pathlib import Path
import subprocess,json,hashlib,zlib
q=Path(__file__).parent;t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');b=bytearray((q/'candidate.nes').read_bytes());base=bytes(b)
for name,bank,addr in [('duration',19,0x9600),('motion',13,0xbf51),('multiply',19,0x9400)]:
 stem='scriptwait-'+name;(q/(stem+'.cfg')).write_text(f'MEMORY {{ CODE: start=${addr:04x},size=$200,file="{stem}.bin"; }} SEGMENTS {{ CODE: load=CODE,type=ro; }}')
 subprocess.run([str(t/'ca65.exe'),str(q/(stem+'.s')),'-o',str(q/(stem+'.o'))],check=True)
 subprocess.run([str(t/'ld65.exe'),'-C',str(q/(stem+'.cfg')),str(q/(stem+'.o'))],cwd=q,check=True)
 code=(q/(stem+'.bin')).read_bytes();at=528+bank*16384+addr-0x8000;assert name=='motion' or b[at:at+len(code)]==b'\xff'*len(code),(name,len(code));b[at:at+len(code)]=code;print(name,hex(addr),len(code))
for addr,old,new in [(0xbf47,'20c8874820306c9043bd','20c88720cf6513009660'),(0xbf95,'a517c904f05e','4c51bfeaeaea')]:
 at=528+13*16384+addr-0x8000;assert b[at:at+len(bytes.fromhex(old))]==bytes.fromhex(old);b[at:at+len(bytes.fromhex(new))]=bytes.fromhex(new)
(q/'candidate-scriptwait.nes').write_bytes(b);result={'sha256':hashlib.sha256(b).hexdigest(),'baseSha256':hashlib.sha256(base).hexdigest(),'prgCrc32':zlib.crc32(b[528:528+524288]),'scope':'Only MODE B5 and ACTIVE all-target cast: duration zero with exact full original displacement, original script opcodes retained'};(q/'scriptwait-build.json').write_text(json.dumps(result,indent=2));print(result)
