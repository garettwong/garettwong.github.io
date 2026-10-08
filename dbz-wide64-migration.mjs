/**
 * Explicit, one-way ES28 -> Wide64 conversion and same-edition NG+ snapshots.
 * This module never loads an emulator, mutates a ROM, writes storage, accepts a
 * foreign backup, or changes an input array. The host owns a separately booted,
 * hash-pinned first-map destination and the final edition/native memory contract.
 */
export const ES28_ROM_ID = 'd2ebb440b82fef758eca7c4afbab73f188aecb2f012691d74c91842fddffcc5e';
export const U64_MAX = (1n << 64n) - 1n;
export const ES28_BP_MAX = 0x7fffffn;
export const FIRST_MAP_MODE = Object.freeze([6, 6, 1, 0]);
export const FIRST_MAP_ROSTER = Object.freeze([3, 4, 5, 6, 7, 129, 130, 136, 170]);
const RECORD_START = 0x200, RECORD_SIZE = 18, RECORD_COUNT = 9;
const CARRY_FIELDS = Object.freeze([1, 2, 3, 10, 11]);
const HEX_SHA = /^[a-f0-9]{64}$/;
const SIGNATURE = new Uint8Array([0x4e, 0x53, 0x54, 0x1a]);
const encoder = new TextEncoder();
function assert(ok, message) { if (!ok) throw new Error(message); }
function asBytes(value, name = 'bytes') {
  assert(value instanceof Uint8Array || value instanceof ArrayBuffer, `${name} must be bytes`);
  return value instanceof Uint8Array ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value);
}
function same(bytes, offset, expected) {
  return offset >= 0 && offset + expected.length <= bytes.length && expected.every((v, i) => bytes[offset + i] === v);
}
function asUInt(value, bits, name) {
  assert(typeof value === 'bigint' || (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) ||
    (typeof value === 'number' && Number.isSafeInteger(value)), `${name} must be an exact non-negative integer`);
  const n = BigInt(value);
  assert(n >= 0n && n < (1n << BigInt(bits)), `${name} is outside UInt${bits}`);
  return n;
}
export function encodeUInt64LE(value) {
  let n = asUInt(value, 64, 'BP');
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++, n >>= 8n) out[i] = Number(n & 255n);
  return out;
}
export function decodeUInt64LE(value) {
  const bytes = asBytes(value);
  assert(bytes.length === 8, 'UInt64 must contain exactly eight bytes');
  let out = 0n;
  for (let i = 7; i >= 0; i--) out = (out << 8n) | BigInt(bytes[i]);
  return out;
}
export async function sha256(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', asBytes(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function chunk(bytes, tag, size) {
  const header = [...encoder.encode(tag), 0, (size + 1) & 255, (size + 1) >> 8, 0, 0, 0];
  let found = -1;
  for (let i = 0; i + header.length <= bytes.length; i++) {
    if (!same(bytes, i, header)) continue;
    assert(found === -1, `Ambiguous ${tag} state chunk`);
    assert(i + header.length + size <= bytes.length, `Truncated ${tag} state chunk`);
    found = i + header.length;
  }
  assert(found >= 0, `Missing ${tag} state chunk`);
  return found;
}
export function stateChunks(input) {
  const state = asBytes(input, 'state');
  assert(same(state, 0, SIGNATURE), 'Unsupported state container; expected uncompressed Nestopia state');
  const ram = chunk(state, 'RAM', 0x800), wram = chunk(state, 'WRM', 0x2000);
  assert(ram + 0x800 <= wram || wram + 0x2000 <= ram, 'Overlapping state chunks');
  return { ram, wram };
}
function cpuOffset(chunks, address, length = 1) {
  assert(Number.isInteger(address) && Number.isInteger(length) && length > 0, 'Invalid native address');
  if (address >= 0 && address + length <= 0x800) return chunks.ram + address;
  if (address >= 0x6000 && address + length <= 0x8000) return chunks.wram + address - 0x6000;
  throw new Error('Native address falls outside RAM/WRAM');
}
function readNative(state, chunks, address, length) { return state.slice(cpuOffset(chunks, address, length), cpuOffset(chunks, address, length) + length); }
function writeNative(state, chunks, address, bytes) { state.set(bytes, cpuOffset(chunks, address, bytes.length)); }
function nativeNumber(state, chunks, address, length) {
  return Array.from(readNative(state, chunks, address, length)).reduceRight((sum, b) => (sum << 8n) | BigInt(b), 0n);
}
function writeNumber(state, chunks, address, length, value) {
  let n = asUInt(value, length * 8, 'native integer');
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++, n >>= 8n) bytes[i] = Number(n & 255n);
  writeNative(state, chunks, address, bytes);
}
function residentChecksFromEs28(rom) {
  assert(rom.length >= 528 + 0x40000, 'Invalid ES28 ROM length');
  const resident = new Uint8Array(0x1000);
  resident.set(rom.subarray(528 + 0x17600, 528 + 0x17f00));
  resident.set(rom.subarray(528 + 0x2f700, 528 + 0x2fe00), 0x900);
  return [[0, resident.slice(0, 0x200)], [0x300, resident.slice(0x300, 0x1000)]];
}
function verifyResident(state, chunks, marker, checks, markerAddress = 0x7ef8) {
  const markerBytes = typeof marker === 'string' ? encoder.encode(marker) : asBytes(marker);
  assert(markerBytes.length === 4, 'Edition marker must be four bytes');
  assert(same(state, cpuOffset(chunks, markerAddress, 4), markerBytes), 'State belongs to a different edition');
  assert(Array.isArray(checks) && checks.length > 0, 'Missing immutable resident-code checks');
  for (const [offset, values] of checks) {
    const expected = values instanceof Uint8Array ? values : Uint8Array.from(values);
    assert(expected.length > 0 && offset >= 0 && offset + expected.length <= 0x2000, 'Invalid resident-code check');
    assert(same(state, chunks.wram + offset, expected), 'State resident code belongs to a different ROM revision');
  }
}
export function canonicalActorId(rawId) {
  const id = rawId & 0x3f;
  // Native story command PRG $21524..$2157F transforms42 into9.
  return id === 9 ? 42 : id;
}
function readActors(state, chunks, canonicalBp) {
  const actors = [], seen = new Set();
  for (let slot = 0; slot < RECORD_COUNT; slot++) {
    let record = readNative(state, chunks, RECORD_START + slot * RECORD_SIZE, RECORD_SIZE);
    const displacedByGuest = (record[0] & 0x3f) === 10;
    if (displacedByGuest) {
      // Native bank12:$9087/$A80B backs up the replaced actor at$02FC.
      record = readNative(state, chunks, 0x2fc, RECORD_SIZE);
      assert([1,2,3,4,5,6,7,8,42].includes(canonicalActorId(record[0])), 'Temporary actor10 has no valid displaced-actor record');
    }
    const actorId = canonicalActorId(record[0]);
    if (actorId === 0 || actorId === 63) continue;
    assert(!seen.has(actorId), `Duplicate actor identity ${actorId}`); seen.add(actorId);
    const legacyBp = BigInt(record[4] | record[5] << 8 | record[6] << 16);
    const bp = canonicalBp ? canonicalBp(actorId, legacyBp) : legacyBp;
    assert(bp >= 0n && bp <= U64_MAX, 'Invalid canonical BP');
    actors.push({ actorId, sourceSlot: slot, displacedByGuest, status: record[0] & 0xc0, level: record[1],
      hp: record[2] | record[3] << 8, ki: record[10] | record[11] << 8,
      bp: bp.toString(), bpLE: Array.from(encodeUInt64LE(bp)), record: Array.from(record) });
  }
  assert(actors.length > 0, 'State contains no identifiable party actors');
  return actors;
}
function validateEdition(edition) {
  assert(edition && HEX_SHA.test(edition.romId) && edition.romId !== ES28_ROM_ID, 'A distinct finalized NEW ROM identity is required');
  assert(typeof edition.marker === 'string' && edition.marker.length === 4 && edition.marker !== 'ES28', 'A distinct NEW edition marker is required');
  const memory = edition.memory;
  assert(memory && Array.isArray(memory.partyActorIds) && memory.partyActorIds.length > 0, 'Missing actor-keyed UInt64 memory contract');
  assert(new Set(memory.partyActorIds).size === memory.partyActorIds.length && memory.partyActorIds.every(id => Number.isInteger(id) && id > 0 && id < 63), 'Invalid actor identity table');
  assert(memory.format === edition.marker, 'Memory format differs from edition marker');
  assert(Number.isInteger(memory.partyBpStart) && Number.isInteger(memory.ngPlusBaselineAddress) && Number.isInteger(memory.ngPlusRoundAddress), 'Missing NG+ native addresses');
  return memory;
}
function bpAddress(memory, actorId) {
  const index = memory.partyActorIds.indexOf(actorId);
  return index < 0 ? null : memory.partyBpStart + index * 8;
}
function verifyNew(input, romId, edition) {
  validateEdition(edition);
  assert(romId === edition.romId, 'Foreign ROM identity is not accepted');
  const state = asBytes(input, 'state'), chunks = stateChunks(state);
  verifyResident(state, chunks, edition.marker, edition.residentChecks, edition.markerAddress);
  return { state, chunks };
}
function demandManual(approval, operation, sourceRomId, targetRomId) {
  assert(approval && approval.manual === true && approval.operation === operation &&
    approval.sourceRomId === sourceRomId && approval.targetRomId === targetRomId,
    `Explicit manual ${operation} approval for these exact ROM identities is required`);
}
async function freshDestination(input, edition) {
  const { state, chunks } = verifyNew(input, edition.romId, edition);
  assert(HEX_SHA.test(edition.freshStartSha256 || ''), 'A verified fresh-start snapshot SHA-256 is required');
  assert(await sha256(state) === edition.freshStartSha256, 'Destination is not the pinned fresh-map snapshot');
  assert(same(state, chunks.ram + 0x2e, FIRST_MAP_MODE), 'Destination is not at the first-map ready checkpoint');
  const expected = edition.freshStartRoster || FIRST_MAP_ROSTER;
  assert(expected.length === RECORD_COUNT && expected.every((id, i) => state[chunks.ram + RECORD_START + i * RECORD_SIZE] === id), 'Destination party differs from the native fresh-start roster');
  return { state: state.slice(), chunks };
}
export async function extractES28Progress({ state: input, romId, sourceRom }) {
  assert(romId === ES28_ROM_ID, 'Only the explicitly supported ES28 source can be converted');
  const rom = asBytes(sourceRom, 'source ROM');
  assert(await sha256(rom) === ES28_ROM_ID, 'Source ROM SHA-256 does not match accepted ES28');
  const state = asBytes(input, 'state'), chunks = stateChunks(state);
  verifyResident(state, chunks, 'ES28', residentChecksFromEs28(rom));
  const actors = readActors(state, chunks);
  assert(actors.every(a => BigInt(a.bp) <= ES28_BP_MAX), 'ES28 BP exceeds its native signed 24-bit ceiling');
  return { format: 'dbz-progression-carry-v1', sourceRomId: ES28_ROM_ID, sourceStateSha256: await sha256(state),
    sourceMode: Array.from(state.slice(chunks.ram + 0x2e, chunks.ram + 0x32)), actors };
}
export async function extractWide64Progress({ state: input, romId, edition }) {
  const { state, chunks } = verifyNew(input, romId, edition), memory = edition.memory;
  const actors = readActors(state, chunks, (actorId, legacyBp) => {
    const address = bpAddress(memory, actorId);
    assert(address !== null, `Actor ${actorId} has no authoritative UInt64 storage`);
    const bp = decodeUInt64LE(readNative(state, chunks, address, 8));
    assert(bp > 0n || legacyBp === 0n, `Actor ${actorId} has uninitialized UInt64 BP`);
    return bp;
  });
  return { format: 'dbz-progression-carry-v1', sourceRomId: edition.romId, sourceStateSha256: await sha256(state),
    sourceMode: Array.from(state.slice(chunks.ram + 0x2e, chunks.ram + 0x32)),
    round: nativeNumber(state, chunks, memory.ngPlusRoundAddress, 4).toString(),
    forms: Number(nativeNumber(state, chunks, memory.formsAddress, 1)), actors };
}
function verifyCarry(carry) {
  assert(carry && carry.format === 'dbz-progression-carry-v1' && Array.isArray(carry.actors), 'Invalid carry vault');
  const seen = new Set();
  for (const actor of carry.actors) {
    assert(Number.isInteger(actor.actorId) && actor.actorId > 0 && actor.actorId < 63 && !seen.has(actor.actorId), 'Invalid or duplicate carry identity');
    seen.add(actor.actorId);
    const value = asUInt(actor.bp, 64, 'carry BP');
    assert(Array.isArray(actor.record) && actor.record.length === 18 && actor.record.every(v => Number.isInteger(v) && v >= 0 && v <= 255) && canonicalActorId(actor.record[0]) === actor.actorId, 'Carry record identity mismatch');
    assert(Array.isArray(actor.bpLE) && actor.bpLE.length === 8 && same(encodeUInt64LE(value), 0, actor.bpLE), 'Carry BP encoding mismatch');
  }
}
function writeActorProgress(state, chunks, destination, actor, memory) {
  const address = bpAddress(memory, actor.actorId);
  assert(address !== null, `Actor ${actor.actorId} has no authoritative UInt64 storage`);
  const base = RECORD_START + destination.sourceSlot * RECORD_SIZE;
  for (const offset of CARRY_FIELDS) writeNative(state, chunks, base + offset, new Uint8Array([actor.record[offset]]));
  const bp = asUInt(actor.bp, 64, 'actor BP');
  writeNative(state, chunks, address, encodeUInt64LE(bp));
  // Native compatibility fields hold the exact low24 bits; full64 is authoritative.
  writeNumber(state, chunks, base + 4, 3, bp & 0xffffffn);
}
function writeCarryVault(state, chunks, carry, memory) {
  const addresses = (memory.carryRecordRanges || []).flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));
  assert(addresses.length === memory.partyActorIds.length * RECORD_SIZE, 'Native carry vault must contain one 18-byte record per canonical actor');
  const actors = new Map(carry.actors.map(a => [a.actorId, a]));
  memory.partyActorIds.forEach((actorId, index) => {
    const record = new Uint8Array(RECORD_SIZE), actor = actors.get(actorId);
    if (actor) {
      record[0] = actorId;
      for (const field of CARRY_FIELDS) record[field] = actor.record[field];
      record.set(encodeUInt64LE(actor.bp).slice(0, 3), 4);
    }
    for (let i = 0; i < RECORD_SIZE; i++) writeNative(state, chunks, addresses[index * RECORD_SIZE + i], record.slice(i, i + 1));
  });
  // The first native map tick applies the same checked restore and HP heal
  // as a natural new round. BP remains exact before and after that tick.
  writeNative(state, chunks, memory.flagsAddress, new Uint8Array([3]));
}
function configuredWrites(state, chunks, edition) {
  for (const [address, values] of edition.ngPlusInitializationWrites || []) {
    assert(Array.isArray(values) && values.every(v => Number.isInteger(v) && v >= 0 && v <= 255), 'Invalid NG+ initialization bytes');
    writeNative(state, chunks, address, Uint8Array.from(values));
  }
}
async function graft({ freshState, carry, edition, round, operation }) {
  verifyCarry(carry);
  const roundValue = asUInt(round, 32, 'NG+ round'); assert(roundValue >= 1n, 'Round must be at least one');
  const { state, chunks } = await freshDestination(freshState, edition), memory = edition.memory;
  const before = state.slice(), destination = readActors(state, chunks), byId = new Map(destination.map(a => [a.actorId, a]));
  const restored = [], pending = [];
  // Initialize every native actor bank to the fresh record BP before applying carry.
  for (const actor of destination) {
    const address = bpAddress(memory, actor.actorId);
    assert(address !== null, `Fresh actor ${actor.actorId} lacks canonical storage`);
    writeNative(state, chunks, address, encodeUInt64LE(actor.bp));
  }
  for (const actor of carry.actors) {
    const target = byId.get(actor.actorId);
    if (target) { writeActorProgress(state, chunks, target, actor, memory); restored.push(actor.actorId); }
    else {
      pending.push(actor.actorId);
      const address = bpAddress(memory, actor.actorId);
      if (address !== null) writeNative(state, chunks, address, encodeUInt64LE(actor.bp));
    }
  }
  const baseline = carry.actors.reduce((max, actor) => BigInt(actor.bp) > max ? BigInt(actor.bp) : max, 0n);
  writeNative(state, chunks, memory.ngPlusBaselineAddress, encodeUInt64LE(baseline));
  writeNumber(state, chunks, memory.ngPlusRoundAddress, 4, roundValue);
  if (carry.forms !== undefined) {
    assert(Number.isInteger(carry.forms) && carry.forms >= 0 && carry.forms <= 255, 'Invalid persistent form flags');
    writeNumber(state, chunks, memory.formsAddress, 1, carry.forms);
  }
  writeCarryVault(state, chunks, carry, memory);
  const frozenRoundScale = roundValue === 1n ? 1n : (baseline / 1000n > 1n ? baseline / 1000n : 1n);
  if (memory.roundScaleAddress !== undefined) writeNumber(state, chunks, memory.roundScaleAddress, 8, frozenRoundScale);
  configuredWrites(state, chunks, edition);
  // Proof that native identity/status flags and transient record bytes survive.
  for (let slot = 0; slot < RECORD_COUNT; slot++) for (const byte of [0, 7, 8, 9, 12, 13, 14, 15, 16, 17]) {
    const at = chunks.ram + RECORD_START + slot * RECORD_SIZE + byte;
    assert(state[at] === before[at], 'NG+ write changed a native party/story flag');
  }
  verifyResident(state, chunks, edition.marker, edition.residentChecks, edition.markerAddress);
  const destinationStateSha256 = await sha256(state);
  const receipt = { format: 'dbz-wide64-round-start-v1', operation, romId: edition.romId,
    sourceRomId: carry.sourceRomId, sourceStateSha256: carry.sourceStateSha256,
    freshStateSha256: edition.freshStartSha256, stateSha256: destinationStateSha256,
    round: roundValue.toString(), baselineBp: baseline.toString(), frozenRoundScale: frozenRoundScale.toString(), restoredActorIds: restored,
    pendingActorIds: pending, actors: carry.actors.map(a => ({ actorId: a.actorId, bp: a.bp })),
    originalsUnchanged: true, conversionIsAutomatic: false };
  return { state, receipt, carryVault: { ...structuredClone(carry), targetRomId: edition.romId } };
}
/** Explicit one-way conversion. This is intentionally separate from load/import. */
export async function convertES28ToWide64({ state, romId, sourceRom, freshState, edition, approval, round = 2 }) {
  validateEdition(edition);
  demandManual(approval, 'convert-es28-to-wide64', romId, edition.romId);
  const carry = await extractES28Progress({ state, romId, sourceRom });
  return graft({ freshState, carry, edition, round, operation: 'convert-es28-to-wide64' });
}
/** New round uses a fresh native map/CPU state, never the ending CPU stack. */
export async function createNewGamePlus({ state, romId, freshState, edition, approval, carryVault }) {
  demandManual(approval, 'start-next-round', romId, edition.romId);
  const carry = await extractWide64Progress({ state, romId, edition });
  assert(carry.sourceMode[0] === 14 && carry.sourceMode[2] === 16, 'NG+ requires the native completed-ending checkpoint');
  if (carryVault) {
    verifyCarry(carryVault);
    assert(carryVault.targetRomId === edition.romId, 'Carry vault belongs to another edition');
    const current = new Set(carry.actors.map(a => a.actorId));
    for (const actor of carryVault.actors) if (!current.has(actor.actorId)) carry.actors.push(structuredClone(actor));
  }
  const currentRound = asUInt(carry.round, 32, 'current round');
  assert(currentRound > 0n && currentRound < 0xffffffffn, 'NG+ round cannot increment safely');
  return graft({ freshState, carry, edition, round: currentRound + 1n, operation: 'start-next-round' });
}
/** Ordinary backups remain strict same-ROM imports; this never invokes conversion. */
export async function validateSameEditionBackup({ backup, edition }) {
  assert(backup && backup.romId === edition.romId, 'Backup ROM identity differs from the active edition');
  const { state } = verifyNew(backup.state, backup.romId, edition);
  if (backup.stateSha256) assert(await sha256(state) === backup.stateSha256, 'Backup checksum does not match its state');
  return state.slice();
}
