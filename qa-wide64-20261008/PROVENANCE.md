# Wide64 isolated Nestopia capacity extension

Status: local experimental candidate. Nothing has been published or substituted
for the accepted player, ROMs, cores, or saves. Browser UI integration has not
passed yet. The game itself is still under development; this is core-capacity
work, not a completed game/playthrough claim.

## Change and isolation

This core raises only mapper 17 CUSTOM_FFE8 PRG capacity from 256 KiB to 512 KiB.
The original board ID `0x11568000` is retained; all other boards, CHR capacity,
mapper registers, WRAM and save-state formats are unchanged. It is intended
only for the new edition. It must never replace the shared stock core.

Original native checkout `/workspace/shared/nestopia` remains unmodified.
Original browser archives remain byte-for-byte unchanged:

- `nestopia-wasm.data`: `051de1b67a5b582b8a1bac6b99471d4f9f883ce3b3603d00330c1a066e546375`
- `nestopia-legacy-wasm.data`: `d3b1e6d3f0abd55a174d666303e51e06a208c257207ebeb734982a32595e1ac7`
- Original native core: `5413dcd467a178f22c2e7a04a87ce1287c3ee356832b70fc1478f1a120cba082`

New filenames, relative to the game workspace:

- `work/nestopia-wide64/nestopia-wide64_libretro.so`
- `public/emulator/data/cores/nestopia-wide64-wasm.data`
- `public/emulator/data/cores/nestopia-wide64-legacy-wasm.data`

The new native core SHA-256 is
`95f852ae9fa782b6b55113ed13132a5987ff92f6c9d78b148282b79f9fc3b456`.
The new browser archive SHA-256 values are in
`work/nestopia-wide64/browser-build.json`, together with every input/output
WASM hash and patch offset. The browser builds are deterministic: repeat
repacking produced the same archive hashes.

## Native source and reproducibility

Native source: https://github.com/libretro/nestopia , exact commit
`b9fdc9c4e6d374abacd1a678ae46ec7f963ef59a`.

`nestopia-512k.patch` adds a two-line conditional to
`Board::Type::GetMaxPrg()` in `source/core/board/NstBoard.cpp`.
`build-native.sh` exports that exact commit into a new directory, applies the
patch and builds with the installed GNU compiler. It refuses an existing
output directory and does not build in the baseline checkout. A fresh source
export and complete rebuild produced the exact same .so hash above.

Run from the game workspace:

```
scripts/nestopia-wide64/build-native.sh /workspace/shared/nestopia NEW_OUTPUT_DIRECTORY
```

The complete modified native source is also retained as
`work/nestopia-wide64/nestopia-wide64-native-source.tar.gz` (no object files,
compiled libraries or .git metadata). `COPYING` is retained in this directory
and the full source archive.

## Browser format, patch and provenance

The `.data` files are actual 7-Zip archives, not raw WASM. Original members are
`nestopia_libretro.js`, `nestopia_libretro.wasm`, `build.json`, `core.json`,
and `license.txt`. Installed `libarchive.so.13` reads/repackages these bundles.
`archive.py` rejects absolute paths, parent traversal, symlinks and other
non-regular archive entries. `build-browser.py` retains original JS/metadata/
license bytes and adds `wide64-provenance.json`.

No Emscripten C++ toolchain is installed. Therefore these browser outputs are
explicitly **binary-patched existing bundles**, not source-compiled builds.
WABT 1.0.39 was installed from the npm registry, with install scripts disabled,
in `work/nestopia-wide64/tools`; its package lock is retained there. WABT
successfully disassembled both original modules and validated both outputs.
The older preinstalled @webassemblyjs parser did not understand opcode 0xfc04
and was not used to validate or mutate the modules.

The disassembly identifies the inlined `Board::Type` constructor as function
2079 (modern) / 2071 (legacy), code-body index 1619 in both. Source-equivalent
capacity calculation starts at absolute byte 1762157 / 1762243 respectively.
Original constructor excerpts are retained in `constructor-*-before.wat`.

`build-browser.py` checks exact input SHA-256 values, parses WASM sections and
code bodies, requires one precise instruction sequence plus its immediate
context, and inserts a conditional select of 524288 only when the board ID is
0x11568000. It updates only that function body's length and code-section
length. There is no global byte substitution. The actual edit is 14 additional
instruction bytes; all other function bodies, sections and data are preserved.

Rebuild: `python3 scripts/nestopia-wide64/build-browser.py`.

Base bundle metadata identifies https://github.com/EmulatorJS/nestopia,
core-bundle version 2.0.2 and minimum EmulatorJS version 4.2.2. The actual
runtime reports RetroArch 1.21.0, Git 6dd4353, built June 14, 2025. The exact
Nestopia source commit and Emscripten toolchain/build recipe that produced
those original browser bundles have **not** been established. The separate
2026 native checkout must not be represented as exact corresponding source
for the 2025 browser bundle.

Nestopia is GPL-2.0-or-later (see COPYING); the source also identifies the
nes_ntsc component as LGPL-2.1-or-later. Preserve upstream notices and supply
appropriate corresponding source with any redistribution. The unresolved
browser-source provenance remains a release/distribution review item; the
native source archive plus binary patch is not a claim that the full browser
bundle has been source-reproduced or that its complete corresponding-source
requirements have been fulfilled.

## Capacity assumptions checked

- iNES header byte 4 uses 16 KiB units; value 32 represents 512 KiB without
  changing mapper identity. `NstCartridgeInes.cpp` already supports it.
- Truncation occurred at `min(actualPrg, GetMaxPrg())` during board creation.
  The FFE8 ID encodes a 256 KiB limit. The override avoids changing the ID.
- FFE mapper registers $4504-$4507 pass the full write value to generic
  8 KiB PRG-bank handlers. 512 KiB needs banks 0-63, within the existing byte.
- `NstMemory` uses dword bank offsets and the `Ram` source mask. Retaining
  512 KiB produces mask 0x7ffff; no 32-bank mask exists in the FFE handlers.
- `NstMemory` state bank data already has three bytes per mapped page.
  Save-state serialization was not changed.
- CHR remains 256 KiB. $4510-$4517 select 1 KiB banks with 8-bit values;
  expanding CHR beyond 256 banks would require a separate mapper design.
- The game has its own bank-preservation convention: NMI reads the first byte
  of the mapped $8000 bank as its bank ID. The ROM worker handles that header
  and relocates vectors/fixed-bank content; it is not an emulator alteration.

## Tests retained

1. Clean native source rebuild reproduced the .so hash exactly.
2. Native boot of expanded snapshot SHA
   `a24010d2d6696790cb9bd02a32cf4640951ff807295c28e5aed630e0d434d87f`
   ran 300 frames, yielded W64A and canonical BP values
   10000, 50000, 1700, 1500, 1300, 1800, 1100, 42000, 1300.
3. Native 8 KiB WRAM survives save/reload. Immediate whole-state byte identity
   is not expected: unmodified Nestopia also omits transient audio IRQ chunks
   after restore, shifting later chunks. The test locates each WRAM chunk.
4. Accepted 256 KiB ROM SHA
   `d2ebb440b82fef758eca7c4afbab73f188aecb2f012691d74c91842fddffcc5e`
   produces byte-identical native state and rendered PNG on stock vs extended
   core at 300 frames.
5. `test-wasm-constructor.cjs` executes each actual compiled constructor in
   Emscripten/WASM, using a test-only extra export (not present in production
   output): 96 cases across both original and both extended modules check
   256/512/1024 KiB PRG input, board identity, retained bank data, masks,
   unchanged unrelated boards, and unchanged 256 KiB CHR ceiling even for
   oversized input.
6. `test-wasm-game.cjs` loads real ROM bytes into the actual complete
   Emscripten/RetroArch runtime and executes exactly 300 frames with null
   video/audio/input drivers. Both extended variants produce identical
   expanded-ROM states and W64A/expected BP. All four original/extended
   modern/legacy variants produce the exact same accepted-ROM state hash:
   `637f2f7fca544f2cd5e8b92e0d782079362aab5dfae0d53a8f1e1d62aec6fa72`.
   Expanded state hash is
   `4b1896c809b30912e4ccc061ba9c4c095c2af1bfecb313bf3aa5e482726ca95c`.
   A stronger `test-wasm-save-load.cjs` separately verifies all six cases:
   load an intentionally changed WRAM sentinel, wait for an actual emulation
   tick, observe the change, restore the original state and observe restoration.
   EJS load_state is deferred; immediate post-load reads return old state.
   Null-driver audio/menu warnings are expected, not browser audio tests.

JSON reports, binary states, PNGs and runtime/build logs live under
`work/nestopia-wide64/`. These are capacity/boot tests on a pinned snapshot,
not validation of subsequent ROM builds, battles, late story or NG+ loops.

## Browser probe and required integration checks

`build-browser-probe.py` prepares `work/nestopia-wide64/browser-qa-stage/` with
relative paths and a file/hash manifest. It does not publish. This is suitable
for a separate unlinked staging directory after parent approval and source/
distribution review. It contains no production player entry changes. The
probe offers expanded modern/legacy plus four stock/extended baseline cases,
and prints loaded core URLs, frame count, WRAM marker and party BP in the DOM.

The cloud browser could not reach the shell's server:
- `http://localhost:8765/...` -> `net::ERR_CONNECTION_REFUSED`
- `http://127.0.0.1:8765/...` -> `net::ERR_CONNECTION_REFUSED`
- `file:///workspace/...` -> browser URL policy rejected the file protocol.

No security policy was bypassed, no local browser configuration was changed,
and no browser gameplay/UI/audio pass is claimed. The distinct browser/shell
network environment requires an approved accessible staging route.

For only the new edition, set `EJS_paths` for BOTH original request keys to
new archive filenames before loading EmulatorJS:

```
EJS_paths['nestopia-wasm.data'] = '.../nestopia-wide64-wasm.data';
EJS_paths['nestopia-legacy-wasm.data'] = '.../nestopia-wide64-legacy-wasm.data';
EJS_disableDatabases = true;
```

The cache bypass is important: EmulatorJS caches cores under the original core
filename and buildStart. Path overrides alone could reuse a stock cached core.
`EJS_disableDatabases` bypasses its ROM/BIOS/core cache; it does not disable its
separate save-state store. Keep the new edition's ROM hash, game name and all
player save/backup namespaces unique, and reject cross-ROM saves. Never load
an old-edition save automatically. No existing save file was modified here.

## Independently booted browser-state seed

`create-wasm-first-map.cjs` accepts the same variant/ROM/output arguments as
the headless game test. It uses the actual `rwebinput` driver (null input
silently ignores simulate_input), holds START on frames 180-187, then pulses
A four frames per 40 after frame 200. It imports no saved state and stops
only when RAM $2e..$31 is [6,6,1,0] and WRAM marker is W64A.
The a24010d2 snapshot reached that first-map condition at frame 1050.
The output state is an EJS RASTATE wrapper containing the browser core's NST
MEM payload; it must not be confused with the newer native core's state.
Each JSON proof pins ROM SHA-256, WASM SHA-256 and state SHA-256. Re-run for
the final frozen ROM; do not reuse a seed whose ROM hash differs.

Example from the game root (output files are `.state`, `.json`, `.log`):

```
node scripts/nestopia-wide64/create-wasm-first-map.cjs patched-wasm path/to/FROZEN_ROM.nes work/wide64/browser-fresh
```

A new-edition seed is not permission to import or convert user progress. The
player must retain explicit conversion controls, fresh-state bounds checks
and old/new ROM identity separation under the user's instructions.
