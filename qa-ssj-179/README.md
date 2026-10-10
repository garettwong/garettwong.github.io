# Player 179 / Wide64 v9

Goku and Gohan each count their own defeated enemies across every group in one battle. After 10 defeats, a fighter in Super Saiyan I automatically becomes Super Saiyan II. II has 100 times I's combat BP (10,000 times normal), subject to the existing unsigned 64-bit BP ceiling. Earned BP remains unchanged. The next battle clears individual counters and stage II, retaining stage I. Transform disappears after use; Return Normal cannot be used to transform a second time in the same fight.

The 4.2-second awakening has a long animated strip, angry portraits, taller stage-II hair, and blue arcs. Native combat waits for the animation acknowledgement, including the last-defeat path. Hidden tabs suspend animation time; saves wait for completion. Reduced-motion rendering stops streak movement and flashes. The portraits were created with the built-in ImageGen tool; the exact prompt is in portrait-prompt.txt. The new asset is ../packs/wide64-v9-ssj2-portraits.png. Fighting poses use separate native stage-II crown metadata.

The spaceship shared palette 0 with the previous Super Saiyan map overlay. The new overlay only borrows an unused palette 2 and restores it. Original ship graphics and palette 0 remain unchanged. This fixes the reproduced palette-sharing defect; a separately injected stale CHR latch was a synthetic diagnostic, not a confirmed user bug, and is not claimed fixed.

## Verification

- 64 native BP cases, including saturation and values above JavaScript's safe integer range. Individual 9/10 thresholds, no duplicate defeat credit, new-battle reset, and native wait-until-both-ACK gate pass.
- All 100 stage-II pose pointers validated; actual native Gohan fighting sprite and phone/landscape banner screenshots inspected.
- Full production-browser 400-opponent QA battle completed through loaded totals 89, 189, 289, 389, 400, then post-battle Frieza story. Gohan naturally reached 10 first; Goku later reached 10 independently. Both banners acknowledged and battle resumed. No browser errors. The QA fixture has ordinary one-HP enemies; it is not a benchmark of normal battle balance.
- Direct two-banner queue test, single-byte-only acknowledgement, and save-during-animation/reload checks pass. Reload keeps both stage-II forms and counters without replaying acknowledged animations.
- Actual skills-menu rendering hides both form actions after returning to normal once used. Native-state form tests reject repeats and preserve the other fighter during failed-attempt rollback.
- Fresh production emulator map screenshots: ship crop (80,80)-(96,96) is pixel-identical with normal forms, Gohan SSJ, and both SSJ. Palette-ownership and restore execution checks pass.
- Enemy generator exhaustive check: 11,008 cases retain values 1–8. Player card editing remains through 256.
- Explicit selected v8 map-save copy preserves all gameplay RAM and progression exactly; the source bytes stay unchanged. Unapproved, mid-battle, and foreign states are rejected. Original v8 files and save identity remain available.

The native source and patch offsets are included. Browser harnesses use isolated local QA fixtures and never access a user's browser profile. Full400 uses the actual skill picker to select Explosive Wave as needed. Release hash is recorded in release.json. The runtime source files at the site root are the final deployed UI; the initial package/ui scripts document construction and require the final follow-up edits in those sources.
