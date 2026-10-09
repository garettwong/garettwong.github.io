# Player 175: exact BP presentation

The party Stats table, battle selection table, and both action HUD panels now draw every decimal BP digit directly from W64B 64-bit memory. Values never pass through JavaScript Number. Up to ten digits fit on one line; 11–20 digits use two lines within the existing stat field. Stats retains earned BP; the battle selection display applies the native Super Saiyan multiplier with uint64 saturation. Action panels retain their live working BP source.

No ROM, native instructions, damage, progression, saved-state format or save identity changed. v7 SHA-256 remains e8fdfe2e0a56dbafae48d67484f1ac12aceb6a466d4a03de800b3ac0a78a7b8e. Player 175 is a browser presentation release.

## Verification

- Generated native v7 Stats and battle-menu frames with isolated high-BP QA fixtures. The native Stats fixture itself displays 1589E04; the renderer displays the stored 15891234, retaining the digits that the native abbreviation dropped.
- Exact values tested include 744300, 15891234, 1589123400, 9007199254740993, 10000000000000000000 and 18446744073709551615; number-line boundary checks include zero, one, six, seven, ten, eleven and twenty digits.
- Played both fixtures through the real production core using the existing Load > Slot 1 UI, with no mocked state reads. Both remained running for about 100 displayed frames, decoded the expected digits and generated no page errors. See native-running screenshots and JSON.
- Replayed actual native action frames through the production renderer to verify both live combat panels at uint64 maximum. See hud-result-phone.png. The fixture roster includes a historical duplicated Gohan; this is isolated QA input, not a gameplay change.
- Inspected fresh 390px phone screenshots of all three layouts. Full numbers fit within their fields without touching HP, BE, cards or adjacent portraits.
- JavaScript syntax checks and git diff whitespace checks passed. This is focused display/save compatibility verification, not a new whole-game playthrough.

QA scripts and isolated native fixtures: D:/Codex 2/projects/NES-FullDigits175-QA.
