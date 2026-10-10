from pathlib import Path
import json,subprocess,hashlib,zlib
q=Path(__file__).parent;r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169')
b=bytearray((r/'games/Dragon_Ball_Z_II_Wide64_NGPlus_v9.nes').read_bytes())
def roff(a):return 528+(0x17600+a-0x6000 if a<0x6900 else 0x2f700+a-0x6900)
holes=json.loads((q/'candidate-memory.json').read_text())['legacyHoles']+[[0x60e0,0x60f4],[0x60fd,0x612e],[0x613d,0x6168],[0x6539,0x658b],[0x65cf,0x663b]]
slots=[a for lo,hi in holes[:-1] for a in range(lo,hi-2,3)][:285]+list(range(0x73d0,0x73fd,3))
assert len(slots)==300,len(slots)
(q/'slots.json').write_text(json.dumps(slots))
(q/'slots.inc').write_text('slotlo:\n.byte '+','.join(str(a&255) for a in slots[:256])+'\nslothi:\n.byte '+','.join(str(a>>8) for a in slots[:256])+'\nslotlo1:\n.byte '+','.join(str(a&255) for a in slots[256:])+'\nslothi1:\n.byte '+','.join(str(a>>8) for a in slots[256:])+'\n')
# Relocate the native page indicator, adjusting its two internal absolute references.
indicator=bytearray(b[roff(0x65d3):roff(0x663b)])
(q/'indicator.bin').write_bytes(indicator)
t=Path('C:/Users/garet/OneDrive/Documents/ChatGPT/NES Game/tsubasa-disassembly')
(q/'aoe.cfg').write_text('MEMORY { CODE: start=$8000,size=$4000,file="aoe.bin"; } SEGMENTS { CODE: load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'aoe.s'),'-o',str(q/'aoe.o')],check=True)
subprocess.run([str(t/'ld65.exe'),'-C',str(q/'aoe.cfg'),str(q/'aoe.o'),'-Ln',str(q/'aoe.lbl')],cwd=q,check=True)
labels={l.split()[2].lstrip('.'):int(l.split()[1],16) for l in (q/'aoe.lbl').read_text().splitlines()}
(q/'bridge.cfg').write_text('MEMORY { CODE: start=$65CF,size=$6C,file="bridge.bin"; } SEGMENTS { CODE: load=CODE,type=ro; }')
subprocess.run([str(t/'ca65.exe'),str(q/'bridge.s'),'-o',str(q/'bridge.o')],check=True)
subprocess.run([str(t/'ld65.exe'),'-C',str(q/'bridge.cfg'),str(q/'bridge.o'),'-Ln',str(q/'bridge.lbl')],cwd=q,check=True)
bridge_labels={l.split()[2].lstrip('.'):int(l.split()[1],16) for l in (q/'bridge.lbl').read_text().splitlines()}
code=bytearray((q/'aoe.bin').read_bytes());base=labels['indicator']+18
for at in range(len(indicator)-2):
 if indicator[at] in [0x20,0xb9]:
  a=int.from_bytes(indicator[at+1:at+3],'little')
  if 0x65d3<=a<0x663b:code[base-0x8000+at+1:base-0x8000+at+3]=(base+a-0x65d3).to_bytes(2,'little')
patches=[]
def patch(at,data):
 old=b[at:at+len(data)];b[at:at+len(data)]=data;patches.append(dict(offset=at,old=old.hex(),new=bytes(data).hex()))
def resident(a,data):patch(roff(a),data)
def far(name):return b'\x20\xcf\x65\x12'+labels[name].to_bytes(2,'little')
patch(528+18*0x4000,code)
for a in slots:
 if a<0x7000:resident(a,b'\0\0\0')
bridge=bytearray((q/'bridge.bin').read_bytes());bridge[-2:]=labels['save'].to_bytes(2,'little');resident(0x65cf,bridge)
resident(0x60d7,far('load')+b'\x60')
resident(0x6136,far('cards')+b'\x60')
resident(0x6532,far('next')+b'\x60')
resident(0x65c8,far('indicator')+b'\x60')
resident(0x6303,far('count'))
resident(0x6be5,far('total')+b'\x60')
# post-writeback must establish the cast guard before the normal victory count.
resident(0x64eb,bytes.fromhex('20fdbe'))
resident(0x60f4,b'\x08\x20'+bridge_labels['save_stub'].to_bytes(2,'little')+b'\x28\x60')
# BEF3 returns Z for all-target commands; C749 restores A-derived flags.
patch(528+12*0x4000+0x3ef3,far('group')+bytes.fromhex('c90060'))
patch(528+12*0x4000+0x3efd,far('post'))
# Enemy high-BP helpers require virtual-page routing before the old 100-entry tables.
for at,name,stub,original in [(0x8245,'getbp',0xb100,bytes.fromhex('bda6028d987e4c4b82')),(0x82c4,'putbp',0xb130,bytes.fromhex('ad987e9da6024cca82'))]:
 patch(528+16*0x4000+at-0x8000,b'\x4c'+stub.to_bytes(2,'little'))
 # Physical calls retain their native scratch-register contract. Only virtual
 # pages need a bank crossing (and cannot index the 100-entry high-BP tables).
 guard=bytes.fromhex('ad7173c9a5d008ad7073cd7373b009')+original+far(name)
 patch(528+16*0x4000+stub-0x8000,guard)
# Old initializer copies native 5-record templates before total() is called.
# Refill applies the persisted health and cards before selecting the next batch.
patch(528+16*0x4000+0x2f23,bytes.fromhex('2060b1'))
patch(528+16*0x4000+0x3160,far('refilled')+b'\x60')
needle=bytes.fromhex('2049c71050af');hits=[i for i in range(528) if b[i:i+6]==needle];assert len(hits)==1,hits
patch(hits[0],far('reset'))
(q/'candidate.nes').write_bytes(b)
(q/'patch.json').write_text(json.dumps(dict(labels=labels,slots=slots,patches=patches,sha256=hashlib.sha256(b).hexdigest(),prgCrc32=zlib.crc32(b[528:528+524288])),indent=2))
print('built',len(code),'bytes;',len(slots),'persistent reserve records')
