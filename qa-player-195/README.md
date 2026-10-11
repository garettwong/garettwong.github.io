# Player 195 verification

Map movement runs at native 1x regardless of selected battle speed. Holding manual A enables 2x; releasing A returns to 1x. Rapid A lock does not enable map boost. A visible map pace label reports actual movement speed.

The counter deducts actual native defeats together. Surviving targets show remaining HP, dodges show EVADED without a hit explosion, and ESCAPED accumulates confirmed native dodge events throughout the encounter. MISS STREAK remains separately visible. No damage or defeat counts are fabricated.

Group animation duration is 80ms, with a 100ms first-group introduction. Native group acknowledgement polling is shorter. Native scenery capture can retry at the active attack phase if the first capture missed the field. The cartridge, emulator core and save identity remain unchanged.

83 card/button assertions passed at 1x/4x/16x/64x, including all five card selections and rapid-lock restoration. Nine map assertions passed, including one grid per short tap, no release drift, manual A boost and automatic A exclusion. Full 400-enemy runs passed native HP/damage/defeat accounting, cumulative dodges, background resume, final-gate resume, reward once and one-A return to map. SS-I 170000 BP versus 128x enemies verified actual one-KO groups and full victory.

The requested 20-second total is NOT achieved. Normal-strength 400 completed in 22.264s over two casts. SS-I versus 128x-strength 400 at selected64x completed in 54.230s over six casts; weaker damage requires more native turns. Timings include a deliberate 300ms background interruption. Scheduling/core experiments were not published. The old generic native repeat shortcut has no safely free original patch location in v20 and lacks live result-equivalence proof; it was not inserted into this cartridge.

Browser QA uses isolated Chrome mobile390x844 contexts and synthetic saved fixtures, never the user browser save store. Physical iPhone Safari, physical controllers and audible speaker output were not tested. Full source logs and experimental candidates remain in D:/Codex 2/projects/NES-Player195-QA. Only verified production assets are published.
