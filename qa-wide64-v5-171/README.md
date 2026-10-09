# Wide64 v5 / Player 171 — quick skill impacts

The accepted v4 player applied the direct impact path only to Explosive Wave. Other ki skills still used the full charge and travelling projectile scripts. This separate edition extends successful blast impacts to the audited projectile families and action 17 repeat attacks.

The new reader completes the existing five-stage native hit/damage calculator before choosing the animation. It preserves the interpreter's X register and script pointer, then uses the existing direct explosion and native reaction. Original miss scripts remain available. Explosive Wave retains its existing entry behavior. The calculator, BP arithmetic, HP writeback and CHR artwork are unchanged. Native random hit decisions can differ from an identical pre-animation checkpoint because they now run earlier; they are not forced to succeed.

## Verification

- 140 fresh-core skill cases (35 skills, both directions, two initial hit flags): all completed; calculated damage words matched v4 in all cases.
- 50 successful cases among the newly accelerated blast families: zero active projectile frames, 62 frames to native reaction. Gohan's Super Energy Wave previously took 385 frames in the comparable successful case.
- Four action 17 repeat cases: successful hits fell from 181/183 frames to 58/57, with zero projectile frames. Damage, next action and reaction matched. Miss cases retained their original 148-frame behavior.
- Assisted five-opponent Explosive Wave battle: five opponents defeated, mode 14 reached, zero projectile events. This preserves the existing group-attack behavior; it is not an unassisted playthrough.
- Actual Gohan Super Wave battle inspected through impact and shrinking/falling enemy reaction. Approved golden Super Saiyan artwork and the v4 HP/BP overlay are retained.
- Production browser core, real phone viewport: impact and touch controls inspected; the explicit copy button was tested through the Load dialog.
- Selected v4 map save copied to a new v5 slot: only the four NFO ROM-CRC bytes can change. The source, RAM, progression and wrapper remain exact. Unapproved, battle-state and foreign-ROM inputs are rejected.

`release.json` pins both full ROM hashes and every changed byte range. `apply-patch.py` reproduces the final ROM from the exact v4 source. No previous edition is rewritten. The v5 page has its own ROM identity and manual save slots; existing progress is copied only with the visible **Load → Copy v4 save to v5** action, from the native Move / Card / Stats menu.

The test snapshots are isolated QA fixtures, not production browser saves. Candidate-native test ROMs differ from the shipped ROM only in the edition label and source-fingerprint metadata, recorded in the final manifest.
