/** Explicit selected v4 -> v5 quick-impact edition copy.
 * This module has no filesystem, storage, emulator, DOM, or network side effects.
 * It must never be called by ordinary save import/load. No source-save writes.
 * W64B is the progression schema; the distinct ROM hashes remain save identities.
 */
import {SOURCE_ROM_ID, GRAPHICS_BASELINE_ROM_ID, BASELINE_FINGERPRINT_BYTES, PROGRESS_LAYOUT_JSON, SOURCE_RESIDENT_SPANS_JSON} from './dbz-wide64-v5-copy-contract.mjs';
export {SOURCE_ROM_ID, GRAPHICS_BASELINE_ROM_ID};
export const OPERATION = 'copy-wide64-v4-to-v5';
const enc = new TextEncoder();
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const same = (b, p, expected) => p >= 0 && p + expected.length <= b.length && expected.every((v, i) => b[p+i] === v);
const u32 = (b, p) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(p, true);
const put32 = (b, p, n) => new DataView(b.buffer, b.byteOffset, b.byteLength).setUint32(p, n, true);
const tag = (b, p) => String.fromCharCode(...b.subarray(p, p+4));
const inRange = (at, lo, hi) => at >= lo && at <= hi;
function bytes(value) {
  assert(value instanceof Uint8Array || value instanceof ArrayBuffer, 'Expected binary bytes');
  return value instanceof Uint8Array ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value);
}
const snapshot = value => bytes(value).slice();
export async function sha256(input) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(input)));
  return Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
}
export function crc32(input) {
  let crc = 0xffffffff;
  for (const byte of bytes(input)) {
    crc ^= byte;
    for (let i=0; i<8; i++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function canonical(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
const equalJson = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function sections(b, start, end) {
  const result = new Map();
  for (let p=start; p<end;) {
    assert(p+8 <= end, 'Truncated native section header');
    const name=tag(b,p), size=u32(b,p+4), data=p+8;
    assert(/^[A-Z0-9]{3}\0$/.test(name), 'Invalid native section tag');
    assert(size <= end-data, 'Truncated native section');
    assert(!result.has(name), `Duplicate native section ${name.slice(0,3)}`);
    result.set(name,{start:data,size,end:data+size}); p=data+size;
  }
  return result;
}
function need(parts, name, size) {
  const part=parts.get(name+'\0');
  assert(part && (size === undefined || part.size === size), `Missing or incompatible ${name} state section`);
  return part;
}
function checkShape(parts, spec) {
  assert(parts.size === Object.keys(spec).length, 'Partial or unsupported native state layout');
  for (const [name,size] of Object.entries(spec)) need(parts,name,size);
}
function children(b, part) { return sections(b,part.start,part.end); }
export function unpackSelectedState(input) {
  const state=snapshot(input);
  assert(state.length >= 16 && state.length <= 16*1024*1024, 'Invalid selected-save size');
  if (same(state,0,[78,83,84,26])) return {native:state,wrapper:null};
  assert(same(state,0,[...enc.encode('RASTATE'),1]), 'Unsupported emulator save wrapper');
  let native=null, ended=false; const parts=[],seen=new Set();
  for(let p=8; p+8<=state.length;) {
    const name=tag(state,p),size=u32(state,p+4),begin=p+8,end=begin+size,padded=begin+Math.ceil(size/8)*8;
    assert(end<=state.length && padded<=state.length && /^[A-Z0-9 ]{4}$/.test(name), 'Invalid emulator save section');
    assert(!seen.has(name), 'Duplicate emulator save section'); seen.add(name);
    parts.push({name,raw:state.slice(p,padded)});
    if(name==='END ') { assert(size===0 && padded===state.length,'Invalid save terminator'); ended=true; break; }
    if(name==='MEM ') { assert(!native && same(state,begin,[78,83,84,26]),'Invalid native save'); native=state.slice(begin,end); }
    p=padded;
  }
  assert(ended && native, 'Missing native save or terminator');
  return {native,wrapper:{header:state.slice(0,8),parts}};
}
function rewrap(native, wrapper) {
  if(!wrapper) return native.slice();
  const parts=[wrapper.header,...wrapper.parts.map(part=> {
    if(part.name!=='MEM ') return part.raw;
    // Keep MEM header and padding too: the native payload length never changes.
    const b=part.raw.slice(); assert(u32(b,4)===native.length,'Native payload length changed'); b.set(native,8); return b;
  })];
  const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let at=0;
  for(const part of parts){out.set(part,at);at+=part.length;} return out;
}
/** Deliberately accepts only the two fully audited uncompressed core layouts.
 * The native core's serialized allocation has a 12-byte input footer plus up to
 * 20 zero slack bytes; the verified WASM build has an 8-byte footer plus optional 20 zero slack bytes.
 */
export function inspectNativeLayout(input) {
  const b=bytes(input);assert(b.length>=16 && same(b,0,[78,83,84,26]),'Expected an uncompressed Nestopia state');
  const end=8+u32(b,4); assert(end>=16 && end<=b.length,'Invalid native container length');
  const root=sections(b,8,end),cpu=children(b,need(root,'CPU'));
  const native=cpu.has('BUS\0');
  checkShape(root,native ? {NFO:8,CPU:2123,APU:345,PPU:2628,IMG:8383,STB:5,PRT:20} : {NFO:8,CPU:2101,APU:311,PPU:2391,IMG:8383,PRT:20});
  checkShape(cpu,native ? {REG:7,BUS:1,RAM:2049,FRM:5,CLK:8,IBP:5} : {REG:7,RAM:2049,FRM:5,CLK:8});
  const apu=children(b,need(root,'APU')),ppu=children(b,need(root,'PPU'));
  checkShape(apu,native ? {FRM:4,FIW:6,SQ0:53,SQ1:53,TRI:38,NOI:43,DMC:52,DCB:20,S00:4} : {FRM:4,SQ0:53,SQ1:53,TRI:38,NOI:43,DMC:32,DCB:20,S00:4});
  checkShape(ppu,native ? {REG:11,PAL:33,OAM:257,NMT:2049,DCY:72,SOM:131,OMC:1,O2A:1,FRM:1} : {REG:11,PAL:33,OAM:257,NMT:2049,FRM:1});
  const img=children(b,need(root,'IMG'));checkShape(img,{MPR:8375});
  const mapper=children(b,need(img,'MPR'));checkShape(mapper,{WRM:8193,PRG:30,CHR:42,NMT:30,WRK:21,FFE:11});
  const prg=children(b,need(mapper,'PRG')),chr=children(b,need(mapper,'CHR')),nmt=children(b,need(mapper,'NMT')),wrk=children(b,need(mapper,'WRK')),ffe=children(b,need(mapper,'FFE'));
  checkShape(prg,{ACC:2,BNK:12});checkShape(chr,{ACC:2,BNK:24});checkShape(nmt,{ACC:2,BNK:12});checkShape(wrk,{ACC:2,BNK:3});checkShape(ffe,{IRQ:3});
  checkShape(children(b,need(root,'PRT')),{PD0:2,PD1:2});
  const ram=need(cpu,'RAM'),wram=need(mapper,'WRM');
  for(const part of [ram,wram,need(ppu,'PAL'),need(ppu,'OAM'),need(ppu,'NMT')])assert(b[part.start]===0,'Compressed native memory is unsupported');
  const footer=b.length-end;
  assert(native ? footer===12 || footer===32 : (footer===8 || footer===28),'Partial or unsupported native core footer');
  if(!native && footer===28)assert(b.subarray(end+8).every(n=>n===0),'Nonzero unsupported WASM padding');
  if(native && footer===32)assert(b.subarray(end+12).every(n=>n===0),'Nonzero unsupported native core padding');
  return {profile:native?'native-extended':'wasm-legacy',ram:ram.start+1,wram:wram.start+1,
    registers:need(cpu,'REG').start,frame:need(cpu,'FRM').start,prgBanks:need(prg,'BNK').start,
    prgAccess:need(prg,'ACC').start,wramAccess:need(wrk,'ACC').start,wramBanks:need(wrk,'BNK').start,
    mapperIrq:need(ffe,'IRQ').start,nfo:need(root,'NFO').start,declaredEnd:end,footerBytes:footer};
}
function validateQuiescent(b,p) {
  assert(same(b,p.ram+0x2e,[6,6,1,0]),'Return to the v4 Move/Card/Stats map menu and save before copying.');
  assert(same(b,p.registers,[0xd7,0xdc,0xfc]),'Save is inside an active CPU call; return to the v4 map menu and save again.');
  assert(same(b,p.ram+0x1fd,[0x5f,0xd1,0x08]),'Unrecognized live return stack; copy refused.');
  assert(b[p.ram+0x4c]===5,'Save is not in native map bank 5; copy refused.');
  assert(same(b,p.prgBanks,[0,10,0,0,11,0,0,62,0,0,63,0]),'Save mapper banks differ from the verified map checkpoint.');
  assert(same(b,p.prgAccess,[1,3]) && same(b,p.wramAccess,[3,1]) && same(b,p.wramBanks,[0,0,0]),'Save mapper memory access differs from the verified map checkpoint.');
  assert(same(b,p.mapperIrq,[0,0,0]),'An active mapper IRQ is not a verified copy checkpoint.');
  assert(!(b[p.frame]&0x40),'Jammed CPU states cannot be copied.');
}
function romInfo(input) {
  const rom=bytes(input),prgStart=528,prgEnd=528+32*16384;
  assert(same(rom,0,[78,69,83,26]) && rom[4]===32 && rom[5]===32 && (rom[6]&4),'Expected trainer-bearing 512KiB PRG Wide64 ROM');
  assert(rom.length===prgEnd+rom[5]*8192,'Truncated or oversized Wide64 ROM');
  return {rom,prgCrc32:crc32(rom.subarray(prgStart,prgEnd))};
}
function residentByte(info,offset) {
  if(offset>=0 && offset<0x900)return info.rom[528+0x17600+offset];
  if(offset>=0x900 && offset<0x1000)return info.rom[528+0x2f700+offset-0x900];
  if(offset>=0x1000 && offset<0x1200)return info.rom[16+offset-0x1000];
  throw new Error('Resident check is outside immutable code/trainer memory');
}
function requiredResidentOffsets(target) {
  const spans=JSON.parse(SOURCE_RESIDENT_SPANS_JSON);spans.push([0x1166,6]);
  const out=new Set();for(const [start,length]of spans)for(let i=0;i<length;i++)out.add(start+i);return out;
}
function checkedResidentMap(edition,info,target=false) {
  const required=requiredResidentOffsets(target),out=new Map();
  assert(Array.isArray(edition.residentChecks) && edition.residentChecks.length,'Missing immutable resident checks');
  for(const item of edition.residentChecks) {
    assert(Array.isArray(item) && item.length===2,'Invalid resident check');const [offset,data]=item;
    assert(Number.isInteger(offset) && offset>=0 && Array.isArray(data) && data.length>0,'Invalid resident check');
    for(let i=0;i<data.length;i++) {
      const at=offset+i;
      assert(required.has(at),'Resident check overlaps mutable or unaudited memory');
      assert(Number.isInteger(data[i]) && data[i]>=0 && data[i]<=255,'Invalid resident signature byte');
      assert(!out.has(at),'Duplicate or overlapping resident check');
      assert(data[i]===residentByte(info,at),'Resident signature differs from its verified ROM');out.set(at,data[i]);
    }
  }
  assert(out.size===required.size,'Incomplete immutable resident-code coverage');return out;
}
function checkedLayout(edition,target=false) {
  assert(edition && edition.marker==='W64B' && equalJson(edition.memory,JSON.parse(PROGRESS_LAYOUT_JSON)),'Complete matching W64B progression memory layout is required');
  if(target)assert(equalJson(edition.graphicsVolatile,{pendingBanksStart:0x7c54,pendingBanksCount:4,validAddress:0x7c58,reset:0}),'Exactly five audited graphics-latch bytes are required');
}
/** Additional target checks are kept even though this private converter pins SHA.
 * The immutable graphics baseline remains pinned; final edition metadata may vary.
 */
export function verifyRomCompatibility(sourceRom,targetRom) {
  const source=romInfo(sourceRom),target=romInfo(targetRom);
  assert(same(target.rom,0,source.rom.subarray(0,16)),'ROM mapper/header layout changed');
  assert(same(target.rom,528+0x40000,source.rom.subarray(528+0x40000,528+0x44000)),'Target changed bank16 progression code');
  for(const [cpu,length]of [[0xdcd0,10],[0xd136,0x33],[0xfffa,6]]) {
    const at=528+0x7c000+cpu-0xc000;
    assert(same(target.rom,at,source.rom.subarray(at,at+length)),'Target changed the verified native idle/return ABI');
  }
  for(const at of requiredResidentOffsets(true)) {
    if(residentByte(source,at)!==residentByte(target,at))assert(inRange(at,5,0x41)||inRange(at,0x10f0,0x10fb)||inRange(at,0x1166,0x116b),'Target changed unaudited resident code');
  }
  return {sourcePrgCrc32:source.prgCrc32,targetPrgCrc32:target.prgCrc32};
}
/** Final packaging may change only the primary version digit and 32 source-
 * fingerprint bytes. Normalize precisely those 33 bytes, then demand the full
 * audited graphics checkpoint hash, including every native and CHR byte.
 * This verifies a final target config/hash without hardcoding its new identity.
 */
export async function verifyGraphicsBaseline(input) {
  assert(await sha256(input)===GRAPHICS_BASELINE_ROM_ID,'Target differs from the audited quick-impact edition');
  return GRAPHICS_BASELINE_ROM_ID;
}

function read64(b,at){let n=0n;for(let i=7;i>=0;i--)n=n<<8n|BigInt(b[at+i]);return n.toString();}
function progressSummary(b,p) {
  const m=JSON.parse(PROGRESS_LAYOUT_JSON);
  return {actors:m.partyActorIds.map((actorId,i)=>({actorId,bp:read64(b,p.wram+m.partyBpStart-0x6000+i*8)})),
    round:u32(b,p.wram+m.ngPlusRoundAddress-0x6000),forms:b[p.wram+m.formsAddress-0x6000],
    frozenRoundScale:read64(b,p.wram+m.roundScaleAddress-0x6000),roundStartBaseline:read64(b,p.wram+m.ngPlusBaselineAddress-0x6000)};
}
function cloneConfig(value) {assert(value && typeof value==='object','Missing edition configuration');return structuredClone(value);}
async function inspectSource({state,romId,sourceRom,sourceEdition}) {
  assert(romId===SOURCE_ROM_ID && sourceEdition.romId===SOURCE_ROM_ID,'Only the frozen accepted Wide64 v4 ROM identity is supported');checkedLayout(sourceEdition);
  const source=romInfo(sourceRom);assert(await sha256(source.rom)===SOURCE_ROM_ID,'Source ROM SHA-256 mismatch');
  const unpacked=unpackSelectedState(state),b=unpacked.native,p=inspectNativeLayout(b),code=checkedResidentMap(sourceEdition,source);
  assert(same(b,p.wram+0x1ef8,enc.encode('W64B')),'Selected save has a foreign progression marker');
  for(const [at,value]of code)assert(b[p.wram+at]===value,'Selected save belongs to a different Wide64 revision');
  assert(u32(b,p.nfo)===source.prgCrc32,'Selected save NFO PRGCRC differs from accepted Wide64 v4');validateQuiescent(b,p);
  return {unpacked,p,code,summary:{romId,sourceStateSha256:await sha256(state),nativeStateSha256:await sha256(b),safePoint:'native-map-menu-idle-DCD7',coreLayout:p.profile,...progressSummary(b,p)}};
}
export async function inspectWide64V4CopySource(args) {
  const stable={state:snapshot(args.state),romId:args.romId,sourceRom:snapshot(args.sourceRom),sourceEdition:cloneConfig(args.sourceEdition)};
  return (await inspectSource(stable)).summary;
}
export async function copyWide64V4SelectedSave(args) {
  // Own every input before the first await; callers cannot alter an in-flight copy.
  const state=snapshot(args.state),sourceRom=snapshot(args.sourceRom),targetRom=snapshot(args.targetRom),
    sourceEdition=cloneConfig(args.sourceEdition),targetEdition=cloneConfig(args.targetEdition),approval=structuredClone(args.approval),romId=args.romId;
  assert(typeof targetEdition.romId==='string' && /^[a-f0-9]{64}$/.test(targetEdition.romId) && targetEdition.romId!==SOURCE_ROM_ID && targetEdition.marker==='W64B','A distinct verified next-graphics ROM/save identity is required');
  assert(approval?.manual===true && approval.operation===OPERATION && approval.sourceRomId===romId && approval.targetRomId===targetEdition.romId,'Explicit manual selected-save copy approval is required');
  const found=await inspectSource({state,romId,sourceRom,sourceEdition});
  assert(await sha256(targetRom)===targetEdition.romId,'Target ROM SHA-256 mismatch');
  await verifyGraphicsBaseline(targetRom);
  checkedLayout(targetEdition,true);verifyRomCompatibility(sourceRom,targetRom);
  const source=romInfo(sourceRom),target=romInfo(targetRom),targetCode=checkedResidentMap(targetEdition,target,true),sourceCode=found.code;
  const before=found.unpacked.native,b=before.slice(),p=found.p,changed=new Set(),codeChanges=[];
  for(const at of new Set([...sourceCode.keys(),...targetCode.keys()])) {
    const a=residentByte(source,at),z=residentByte(target,at);
    assert(before[p.wram+at]===a,'New trampoline overlaps noncanonical source data');
    if(a!==z){b[p.wram+at]=z;changed.add(p.wram+at);codeChanges.push(0x6000+at);}
  }
  // Schema marker W64B, form-refresh latch $7C53 and all persistent data stay exact.
  // Resident code and graphics latches are identical; only NFO identity changes.
  put32(b,p.nfo,target.prgCrc32);for(let i=0;i<4;i++)changed.add(p.nfo+i);
  for(let i=0;i<b.length;i++)if(!changed.has(i))assert(b[i]===before[i],'Copy changed persistent game or native core data');
  for(const [at,value]of targetCode)assert(b[p.wram+at]===value,'Copied immutable code differs from target ROM');
  validateQuiescent(b,p);const summary=progressSummary(b,p);
  for(const key of ['actors','round','forms','frozenRoundScale','roundStartBaseline'])assert(equalJson(summary[key],found.summary[key]),`Copy changed ${key}`);
  assert(u32(b,p.nfo+4)===u32(before,p.nfo+4),'Copy changed NFO frame counter');
  const output=rewrap(b,found.unpacked.wrapper);
  return {state:output,nativeState:b,receipt:{status:'VERIFIED_MANUAL_COPY',format:'wide64-selected-save-copy-v4-to-v5',operation:OPERATION,
    sourceRomId:SOURCE_ROM_ID,targetRomId:targetEdition.romId,sourceStateSha256:found.summary.sourceStateSha256,sourceNativeSha256:found.summary.nativeStateSha256,
    stateSha256:await sha256(output),nativeSha256:await sha256(b),safePoint:found.summary.safePoint,coreLayout:p.profile,
    sourcePrgCrc32:source.prgCrc32,targetPrgCrc32:target.prgCrc32,nfoFrame:u32(b,p.nfo+4),codeChangedAddresses:codeChanges,
    graphicsResetAddresses:[],progressFormat:'W64B',fullRamAndProgressPreserved:true,
    nonMemWrapperSectionsPreserved:true,sourceUnchanged:true,automatic:false,...summary}};
}
