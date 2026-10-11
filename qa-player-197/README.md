# Player197 / Wide64 v21

Confirmed map-speed boundary fix: destination selection is phase3:1; one A starts autonomous ship motion in phase3:3. The old >=4 check kept the actual movement at1x. In the same isolated Chrome trace, phase3:3 took1334.7ms before and159.7ms after atselected64x. All18 selection/release/return checks at4x and1024x pass.

Transformation cut-in reduced from4200ms to750ms with compressed fades. This existing cut-in is the SSJ-II awakening. Normal-to-SSJ-I itself was already an immediate form edit. When transforming after10kills, the queued awakening can now play during the skill confirmation instead of waiting behind its own open dialog; it renders above that dialog. Real menu test:760ms final frame, no error, returned to attack choice.

Each5/6/7enemy cohort now holds its entrance pose200ms longer before impact. Native damage, KO counts and rewards are unchanged. Full400 stronger-enemy/SSJ-I test completed in one activation,67groups, all400unique targets,21.9s combat, reward20000BP once, background pause/resume and return to map. All measured cohort entrances lasted199ms or longer (frame scheduling tolerance).

The two reported intermittent graphics issues are NOT claimed fixed: no ship/card image corruption reproduced. Map raw frame sets and screenshots are identical with forms0,2,15 (35frames each). Locked-card selection and a real assignment cycle caused zero editor state reloads; sampled changes were confined to the native blinking8x8cursor. Native hair hook is already guarded to battle phases32..39, actor1/3 and pose<50. Sprite-limit diagnostic did not change the symptom. An affected user save/screenshot is needed to trace the remaining case.

ROM/save identity remains v21/d7f13a72b663. Older editions and saved slots are preserved. QA uses isolated Chrome mobile390x844 contexts, not the user's browser storage. Raw evidence and additional source scripts: D:/Codex 2/projects/NES-Player197-QA.
