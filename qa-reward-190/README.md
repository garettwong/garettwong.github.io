# Player 190 / Wide64 v18

Published entry: https://garettwong.github.io/dbz-wide64-v18-play.html

Restores the end-of-battle BP result, and adds the attacking fighter's exact form-adjusted BP and actual average HP loss to the gold all-target attack box. Preparing next group means the native game is calculating the next targets. Average damage is total actual HP lost divided by all targets in that displayed group, including misses as zero; it is rounded to one decimal. It is not a BP-only damage prediction.

Root cause: the native fast-text handler accepted stale all-target commands during victory phase 38 even when the damage iterator was inactive. The new ACTIVE guard returns inactive calls to the original text handler. The read-only victory panel displays the native 64-bit reward when the genuine BP reward prompt is active. Native code credits BP on A; JavaScript never grants rewards. Later item and story prompts remain native.

Verified on the final ROM:
- 71 native text cases: 60 inactive cases match the original native routine; 11 active cases preserve Player189 behavior.
- Fresh native encounters of 2 and 396 enemies played through complete victory, including a second cast for survivors. Rewards of 100 and 19,800 BP held for over four seconds, then credited once after A. Native party eligibility is preserved.
- All recorded group frames checked for exact BP strings, actual mean damage, unique targets within each cast and native count changes.
- Maximum uint64 display, SSJ2 multiplier, fractional average with a miss, and rejection of later/non-reward phases verified. display-max64.png is an explicit display fixture, not a claimed gameplay achievement.

Run `python qa-reward-190/rebuild-native.py` to reproduce the exact ROM from immutable v17. native-patch-proof.json documents every changed byte (only the ACTIVE guard cave and edition fingerprint). Raw save fixtures remain in local QA storage; browser scripts document the replay procedure and require those fixtures. Prior editions and their saves remain preserved.

Selected v17 save copy through the actual Load dialog completed an 80-group attack against a 400-enemy encounter, returning to normal play with 10 survivors. Source save bytes were compared and remained identical. All 25 release JavaScript/module files passed syntax checks; homepage and entry ran without page or HTTP errors.
