from pathlib import Path
import subprocess,hashlib,json,zlib
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169');b=bytearray((r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v8.nes').read_bytes());t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly');patches=[];labels={}
subprocess.run(['python',str(q/'build-hair.py')],check=True)
def patch(at,new,old=None):
 if old is not None:assert b[at:at+len(new)]==old,(hex(at),b[at:at+len(new)].hex())
 patches.append(dict(offset=at,old=b[at:at+len(new)].hex(),new=new.hex()));b[at:at+len(new)]=new
for name,start,bank in [('map',0x8f40,17),('ssj',0xaf50,16),('hair',0x9000,17)]:
 (q/(name+'.cfg')).write_text(f'MEMORY {{ CODE: start=${start:04X},size=$1000,file="{name}.bin"; }} SEGMENTS {{ CODE: load=CODE,type=ro; }}')
 subprocess.run([str(t/'ca65.exe'),str(q/(name+'.s')),'-o',str(q/(name+'.o')),'-I',str(q)],check=True)
 subprocess.run([str(t/'ld65.exe'),'-C',str(q/(name+'.cfg')),str(q/(name+'.o')),'-Ln',str(q/(name+'.lbl'))],cwd=q,check=True)
 labels.update({l.split()[2].lstrip('.'):int(l.split()[1],16) for l in (q/(name+'.lbl')).read_text().splitlines()})
 code=(q/(name+'.bin')).read_bytes();patch(528+bank*0x4000+start-0x8000,code,b'\xff'*len(code))
def jmp(name):return b'\x4c'+labels[name].to_bytes(2,'little')
patch(528+0x440c3,jmp('select_hair')+b'\xea',bytes.fromhex('8501a000'))
patch(528+0x44294,jmp('palette_restore')+b'\xea',bytes.fromhex('a52ec906'))
patch(528+0x44319,jmp('palette_allocate')+b'\xea',bytes.fromhex('a9018515'))
patch(528+0x44256,bytes.fromhex('4c6a82'),bytes.fromhex('adae75'))
patch(528+0x42ccb,jmp('scale_forms'),bytes.fromhex('293fc9'))
patch(528+0x423b6,jmp('menu_upgrade')+b'\xea',bytes.fromhex('a52ec901'))
for offset in [0x423c9,0x42718]:patch(528+offset+1,b'\x0f',b'\x03')
for at,name,old in [(16+0x58,'snapshot_target',0x8e0b),(16+0x5e,'credit_kill',0x8e55),(16+0x82,'reset_forms',0xae00)]:patch(at,labels[name].to_bytes(2,'little'),old.to_bytes(2,'little'))
(q/'candidate.nes').write_bytes(b);report=dict(sha256=hashlib.sha256(b).hexdigest(),prgCrc32=zlib.crc32(b[528:528+524288]),labels=labels,patches=patches);(q/'patch.json').write_text(json.dumps(report,indent=2));print(report['sha256'],labels)
