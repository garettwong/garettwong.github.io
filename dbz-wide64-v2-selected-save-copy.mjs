/** Explicit selected-save copy from frozen Wide64 v1 to Wide64 v2.
 * No filesystem, storage, emulator or network side effects. Ordinary backup
 * import must never call this function. Inputs are read-only and output is new.
 * Only a verified quiescent native map menu can cross the changed bank16 ABI.
 */
export const WIDE64_V1_ROM_ID = '8ab31326e0e0112fe16ab4530dc3e76299e85378af375098c182a2b23a8ce881';
const encoder = new TextEncoder(), SHA = /^[a-f0-9]{64}$/;
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const bytes = value => {
  assert(value instanceof Uint8Array || value instanceof ArrayBuffer, 'Expected binary bytes');
  return value instanceof Uint8Array ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value);
};
const same = (b, p, expected) => p >= 0 && p + expected.length <= b.length && expected.every((v, i) => b[p + i] === v);
const u32 = (b, p) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(p, true);
const put32 = (b, p, n) => new DataView(b.buffer, b.byteOffset, b.byteLength).setUint32(p, n, true);
const tag = (b, p) => String.fromCharCode(...b.subarray(p, p + 4));
export async function sha256(input) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(input)));
  return Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
}
export function crc32(input) {
  let crc = 0xffffffff;
  for (const byte of bytes(input)) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function sections(b, start, end) {
  const out = new Map();
  for (let p = start; p < end;) {
    assert(p + 8 <= end, 'Truncated native section header');
    const name = tag(b, p), size = u32(b, p + 4), data = p + 8;
    assert(size <= end - data, 'Truncated native section');
    assert(!out.has(name), `Duplicate native section ${name.slice(0,3)}`);
    out.set(name, { start: data, size, end: data + size }); p = data + size;
  }
  return out;
}
function need(parts, name, size) {
  const part = parts.get(name + '\0');
  assert(part && (size === undefined || part.size === size), `Missing or incompatible ${name} state section`);
  return part;
}
export function unpackSelectedState(input) {
  const state = bytes(input);
  assert(state.length >= 16 && state.length <= 16 * 1024 * 1024, 'Invalid selected-save size');
  if (same(state, 0, [78,83,84,26])) return { native: state.slice(), wrapper: null };
  assert(same(state, 0, [...encoder.encode('RASTATE'), 1]), 'Unsupported emulator save wrapper');
  let native = null, ended = false, parts = [];
  for (let p = 8; p + 8 <= state.length;) {
    const name = tag(state,p), size = u32(state,p+4), begin = p + 8, end = begin + size, padded = begin + Math.ceil(size/8)*8;
    assert(end <= state.length && padded <= state.length && /^[A-Z0-9 ]{4}$/.test(name), 'Invalid emulator save section');
    const item = { name, raw: state.slice(p,padded) }; parts.push(item);
    if (name === 'END ') { assert(size === 0 && padded === state.length, 'Invalid save terminator'); ended = true; break; }
    if (name === 'MEM ') { assert(!native && same(state,begin,[78,83,84,26]), 'Invalid or duplicate native save'); native = state.slice(begin,end); }
    p = padded;
  }
  assert(ended && native, 'Missing native save or terminator');
  return { native, wrapper: { header: state.slice(0,8), parts } };
}
function rewrap(native, wrapper) {
  if (!wrapper) return native.slice();
  const parts = [wrapper.header, ...wrapper.parts.map(part => {
    if (part.name !== 'MEM ') return part.raw;
    const b = new Uint8Array(8 + Math.ceil(native.length/8)*8);
    b.set(encoder.encode('MEM ')); put32(b,4,native.length); b.set(native,8); return b;
  })];
  const out = new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0)); let offset=0;
  for (const part of parts) { out.set(part,offset); offset+=part.length; }
  return out;
}
export function inspectNativeLayout(input) {
  const b=bytes(input); assert(same(b,0,[78,83,84,26]),'Expected an uncompressed Nestopia state');
  const end=8+u32(b,4); assert(end<=b.length && end>=16,'Invalid native container length');
  const root=sections(b,8,end), cpuPart=need(root,'CPU'), imagePart=need(root,'IMG');
  const cpu=sections(b,cpuPart.start,cpuPart.end), img=sections(b,imagePart.start,imagePart.end), mapperPart=need(img,'MPR');
  const mapper=sections(b,mapperPart.start,mapperPart.end), prgPart=need(mapper,'PRG');
  const prg=sections(b,prgPart.start,prgPart.end), ram=need(cpu,'RAM',2049), wram=need(mapper,'WRM',8193);
  assert(b[ram.start]===0 && b[wram.start]===0,'Compressed RAM/WRAM is unsupported');
  return { ram:ram.start+1,wram:wram.start+1,registers:need(cpu,'REG',7).start,
    frame:need(cpu,'FRM',5).start,prgBanks:need(prg,'BNK',12).start,nfo:need(root,'NFO',8).start };
}
function validateQuiescent(b,p) {
  assert(same(b,p.ram+0x2e,[6,6,1,0]),'Open Wide64 v1, return to the Move/Card/Stats map menu, and save before copying.');
  assert(same(b,p.registers,[0xd7,0xdc,0xfc]),'Save is inside an active CPU call. Return to the v1 map menu and save again.');
  assert(same(b,p.ram+0x1fd,[0x5f,0xd1,0x08]),'Save contains an unrecognized live return stack; copy refused.');
  assert(b[p.ram+0x4c]===5,'Save is not in the native map bank; copy refused.');
  assert(same(b,p.prgBanks,[0,10,0,0,11,0,0,62,0,0,63,0]),'Save mapper banks differ from the verified map checkpoint.');
  assert(!(b[p.frame]&0x40),'Jammed CPU states cannot be copied.');
}
const canonical = value => value && typeof value==='object' ? Array.isArray(value) ? value.map(canonical) : Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
function validateLayouts(source,target) {
  const a={...source.memory},b={...target.memory};delete a.format;delete b.format;
  delete b.minQuarterFormsAddress;
  assert(JSON.stringify(canonical(a))===JSON.stringify(canonical(b)),'Edition memory layouts differ; a lossless copy is not supported.');
  assert(target.memory.minQuarterFormsAddress===0x7c53,'Missing v2 form-refresh latch contract');
}
function romInfo(input) {
  const rom=bytes(input);
  assert(same(rom,0,[78,69,83,26]) && rom[4]===32 && (rom[6]&4),'Expected the trainer-bearing 512KiB Wide64 ROM');
  const prgStart=528,prgEnd=prgStart+32*16384;
  assert(rom.length>=prgEnd,'Truncated Wide64 ROM');
  return {rom,prgStart,prgEnd,prgCrc32:crc32(rom.subarray(prgStart,prgEnd))};
}
function residentByte(info,offset) {
  if (offset>=0 && offset<0x900) return info.rom[528+0x17600+offset];
  if (offset>=0x900 && offset<0x1000) return info.rom[528+0x2f700+offset-0x900];
  if (offset>=0x1000 && offset<0x1200) return info.rom[16+offset-0x1000];
  throw new Error('Resident check is outside immutable code/trainer memory');
}
function checkedResidentMap(edition,info) {
  const out=new Map();assert(Array.isArray(edition.residentChecks) && edition.residentChecks.length,'Missing immutable resident checks');
  for(const [offset,data]of edition.residentChecks){
    assert(Number.isInteger(offset)&&Array.isArray(data)&&data.length,'Invalid resident check');
    for(let i=0;i<data.length;i++){
      const at=offset+i;
      const allowed=at<0x200||(at>=0x300&&at<0x1000)||(edition.memory.trampolineRanges||[]).some(([lo,hi])=>at>=lo-0x6000&&at<=hi-0x6000);
      assert(allowed,'Resident check overlaps mutable game data');
      assert(Number.isInteger(data[i])&&data[i]===residentByte(info,at),'Resident signature differs from its verified ROM');
      assert(!out.has(at)||out.get(at)===data[i],'Conflicting resident checks');out.set(at,data[i]);
    }
  }
  for(let i=0;i<0x1000;i++)if(i<0x200||i>=0x300)assert(out.has(i),'Incomplete resident-code coverage');
  return out;
}
function read64(b,at){let n=0n;for(let i=7;i>=0;i--)n=n<<8n|BigInt(b[at+i]);return n.toString();}
function progressSummary(b,p,m){
  return {actors:m.partyActorIds.map((id,i)=>({actorId:id,bp:read64(b,p.wram+m.partyBpStart-0x6000+i*8)})),
    round:u32(b,p.wram+m.ngPlusRoundAddress-0x6000),forms:b[p.wram+m.formsAddress-0x6000],
    frozenRoundScale:read64(b,p.wram+m.roundScaleAddress-0x6000),roundStartBaseline:read64(b,p.wram+m.ngPlusBaselineAddress-0x6000)};
}
/** Strict preflight: source bytes, ROM identity, immutable code, idle CPU/stack. */
export async function inspectWide64V1CopySource({state,romId,sourceRom,sourceEdition}) {
  assert(romId===WIDE64_V1_ROM_ID && sourceEdition?.romId===romId && sourceEdition.marker==='W64A','Only the frozen Wide64 v1 edition is supported');
  const info=romInfo(sourceRom);assert(await sha256(info.rom)===romId,'Source ROM SHA-256 mismatch');
  const unpacked=unpackSelectedState(state),p=inspectNativeLayout(unpacked.native),b=unpacked.native;
  const resident=checkedResidentMap(sourceEdition,info);
  assert(same(b,p.wram+0x1ef8,encoder.encode('W64A')),'Selected save has a foreign edition marker');
  for(const [at,value]of resident)assert(b[p.wram+at]===value,'Selected save belongs to a different Wide64 revision');
  assert(u32(b,p.nfo)===info.prgCrc32,'Selected save ROM checksum differs from Wide64 v1');
  validateQuiescent(b,p);
  return {romId,sourceStateSha256:await sha256(bytes(state)),nativeStateSha256:await sha256(b),safePoint:'native-map-menu-idle-DCD7',...progressSummary(b,p,sourceEdition.memory)};
}
/** Explicit manual selected-save copy; never invoke this from ordinary load. */
export async function copyWide64V1SelectedSave({state,romId,sourceRom,targetRom,sourceEdition,targetEdition,approval}) {
  assert(targetEdition && SHA.test(targetEdition.romId) && targetEdition.romId!==WIDE64_V1_ROM_ID && targetEdition.marker==='W64B','A distinct finalized Wide64 v2 identity is required');
  assert(approval?.manual===true && approval.operation==='copy-wide64-v1-to-v2' && approval.sourceRomId===romId && approval.targetRomId===targetEdition.romId,'Explicit manual selected-save copy approval is required');
  const sourceSummary=await inspectWide64V1CopySource({state,romId,sourceRom,sourceEdition});
  const source=romInfo(sourceRom),target=romInfo(targetRom);assert(await sha256(target.rom)===targetEdition.romId,'Target ROM SHA-256 mismatch');
  validateLayouts(sourceEdition,targetEdition);
  // Fixed-bank idle instruction and the live far-call return must be unchanged.
  for(const [cpu,length]of [[0xdcd0,10],[0xd136,0x33],[0xfffa,6]]){
    const at=528+0x7c000+cpu-0xc000;
    assert(same(target.rom,at,source.rom.subarray(at,at+length)),'Target changed the verified native resume ABI');
  }
  const sourceCode=checkedResidentMap(sourceEdition,source),targetCode=checkedResidentMap(targetEdition,target);
  const unpacked=unpackSelectedState(state),before=unpacked.native,b=before.slice(),p=inspectNativeLayout(b);
  const changed=new Set(),codeOffsets=new Set([...sourceCode.keys(),...targetCode.keys()]);
  for(const at of codeOffsets){
    // For added/removed stubs, verify the reserved trainer byte against v1 too.
    assert(before[p.wram+at]===residentByte(source,at),'New trampoline overlaps noncanonical source data');
    b[p.wram+at]=residentByte(target,at);changed.add(p.wram+at);
  }
  b.set(encoder.encode('W64B'),p.wram+0x1ef8);for(let i=0;i<4;i++)changed.add(p.wram+0x1ef8+i);
  put32(b,p.nfo,target.prgCrc32);for(let i=0;i<4;i++)changed.add(p.nfo+i);
  const formLatch=p.wram+targetEdition.memory.minQuarterFormsAddress-0x6000;
  b[formLatch]=b[p.wram+targetEdition.memory.formsAddress-0x6000]&3;changed.add(formLatch);
  // Audited proof: CPU, stack, PPU, all game data and external wrapper metadata
  // survive exactly. The permitted writes are immutable code/identity/latch only.
  for(let i=0;i<b.length;i++)if(!changed.has(i))assert(b[i]===before[i],'Copy changed persistent game data');
  validateQuiescent(b,p);
  const summary=progressSummary(b,p,targetEdition.memory);
  for(const key of ['actors','round','forms','frozenRoundScale','roundStartBaseline'])assert(JSON.stringify(summary[key])===JSON.stringify(sourceSummary[key]),`Copy changed ${key}`);
  const output=rewrap(b,unpacked.wrapper);
  return {state:output,nativeState:b,receipt:{format:'wide64-selected-save-copy-v1',operation:'copy-wide64-v1-to-v2',sourceRomId:romId,targetRomId:targetEdition.romId,
    sourceStateSha256:sourceSummary.sourceStateSha256,stateSha256:await sha256(output),sourceNativeSha256:sourceSummary.nativeStateSha256,nativeSha256:await sha256(b),
    safePoint:sourceSummary.safePoint,storyAndCardsPreserved:true,originalUnchanged:true,automatic:false,...summary}};
}
