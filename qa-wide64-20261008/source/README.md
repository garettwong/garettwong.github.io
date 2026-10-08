# Wide64 experimental browser core source and notices

This isolated test uses binary-patched existing EmulatorJS bundles. It does not claim a source-to-byte rebuild. The change raises mapper 17 CUSTOM_FFE8 PRG capacity from 256 KiB to 512 KiB and leaves other boards unchanged.

The source identities embedded in both original WASMs are Nestopia 1.53.1 commit 6b08ec9148bd4cedc893ed0c97bc64061d044399 and RetroArch 1.21.0 commit 6dd4353937ef48b6ec0bfbdbb15d1c5992d86927. The inferred historical wrapper is EmulatorJS/build b24e5b535034dc7c3428d76f236d4793881969b6; this is not an attestation of the original CI run. LLVM 21.0.0git commit 23e3cbb2e82b62586266116c8ab77ce68e412cf8 matches Emscripten 4.0.8 compiler metadata.

## Source access

- [Complete modified 2025 Nestopia source](nestopia-wide64-2025-modified-source.tar.gz), including component notices
- [Exact capacity source patch](nestopia-6b08ec9-wide64.patch), apply with GNU patch --binary -p1
- [Original pinned Nestopia source](https://github.com/EmulatorJS/nestopia/archive/6b08ec9148bd4cedc893ed0c97bc64061d044399.tar.gz)
- [Complete pinned RetroArch source](https://github.com/EmulatorJS/RetroArch/archive/6dd4353937ef48b6ec0bfbdbb15d1c5992d86927.tar.gz)
- [Historical wrapper source and build scripts](https://github.com/EmulatorJS/build/archive/b24e5b535034dc7c3428d76f236d4793881969b6.tar.gz)
- [Binary patcher](build-browser.py) and [archive helper](archive.py)

Both pinned source archives were checked file-by-file and mode-by-mode against their full upstream Git trees, with no mismatch. The complete modified Nestopia tree supplies the preferred-form source counterpart for this capacity change, but has not been compiled to reproduce the distributed WASM bytes. The 2026 native source is a separate build and is not represented as the original browser source.

## Licences

Original bundled licence.txt files remain unchanged. Nestopia is GPL-2.0-or-later; its nes_ntsc component is LGPL-2.1-or-later. RetroArch includes GPL version 3. Full source archives above retain all component-specific notices.

- [Nestopia COPYING](COPYING)
- [Nestopia README](https://github.com/EmulatorJS/nestopia/blob/6b08ec9148bd4cedc893ed0c97bc64061d044399/README)
- [nes_ntsc licence](https://github.com/EmulatorJS/nestopia/blob/6b08ec9148bd4cedc893ed0c97bc64061d044399/source/nes_ntsc/license.txt)
- [RetroArch COPYING](https://github.com/EmulatorJS/RetroArch/blob/6dd4353937ef48b6ec0bfbdbb15d1c5992d86927/COPYING)

This fixture tests pinned ROM a24010d2d6696790cb9bd02a32cf4640951ff807295c28e5aed630e0d434d87f, not the latest gameplay candidate or a completed game. No existing player, menu, save or shared core was replaced.
