# Player 189 / Wide64 v17 acceptance evidence

Published entry: https://garettwong.github.io/dbz-wide64-v17-play.html

All-target attacks support 1-400 enemies. Each visible cohort uses actual encounter types, with synchronized impact and fall, then one count change based on native deaths. Cohorts contain five to seven targets, except smaller remainders. Native survivors and misses are retained. Existing single-target attacks, skill selection, controls and save-copy paths were checked.

- Native iterator: 800 cases covering every count 1-400, lethal and nonlethal.
- Native visual fast path: 168 cases; persistent combat data and inactive paths preserved.
- Browser: 24 casts covering boundaries, mixed encounters, sparse/dead records, nonlethal attacks, and both group attack commands. See battle-acceptance.json for exact build provenance.
- Final ROM: current-400-result.json, video-100-result.json and complete active-copy-ui.json passed after the final state-acknowledgement fix. Copy retained original v16 save bytes.
- Recorded mixed 100-enemy cast: 19 groups in 4.2322 seconds (4.49 groups/sec), with six native survivors. player189-phone-battle.mp4 is a continuous Chrome recording at 390 x 844; impact-contact.png shows simultaneous impact, fall and delayed count change.
- A 400-enemy cast includes the separate SSJ2 transformation pause. Typical active burst throughput on this computer was about 4-5 groups/sec; physical-phone speed is unmeasured.
- Skills: all 35 commands selectable. Controls: directions, drag and cancel verified. Single-target regression retained 99 of 100 enemies and did not open the group overlay.

Run `python qa-blast-189/rebuild-native.py` from this checkout to reproduce the exact v17 ROM from immutable v16 and the documented patch bytes. asset-manifest.json records all release files. Raw save fixtures and failed experiments are not published.

Live verification: all 80 published asset hashes match. Homepage opens Player189 with the expected ROM and no HTTP/page errors. Mixed 400-enemy cast completes with 12 actual survivors; complete v16 save-copy cast preserves source bytes, returns to normal controls, and visibly shows its 30 actual survivors. See live-acceptance.json and live-copy-final.png.
