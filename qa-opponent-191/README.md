# Player 191 / Wide64 v19

Entry: https://garettwong.github.io/dbz-wide64-v19-play.html

The compact gold panel shows fighter combat BP, each displayed group's average enemy HP before the attack and average enemy BP, then two average damage values. Potential is the native final damage quotient before its 65,535 saturation and target-HP limit, assuming the calculated hit lands. Actual is HP lost divided by all targets in the group, including misses as zero. Both are group averages. Large values use K/M/B/T or scientific notation; Exact BP still provides full BP digits.

The cartridge records its existing quotient into otherwise unused WRAM $7170-$718F. Five 40-significant-bit mantissas plus byte exponents bound the original 96-bit quotient. The display only claims a rounded value when both interval endpoints round identically; otherwise it adds ~. Zero denominator is explicitly MAX. Telemetry preserves CPU registers, flags, operands and damage outputs. 165 emulator cases compare old/new execution, including zero and maximum 96-bit operands. A separate 64-case audit confirms the native form multiplier.

Native battles of 2 and 396 enemies validate every displayed group's readings, counts and actual HP loss. The large-BP native gameplay fixture uses Gohan II at 25,169,000,000 combat BP against 10,240 HP / 140,800 BP opponents: potential exceeds current HP, while actual damage remains HP-limited. This is a QA fixture, not a user save. Speed 1 and speed 64 reward exits are exercised. Maximum uint64/fractional rendering has a separate labelled display fixture.

One manual A on the real reward panel starts the remaining native reward confirmations, then stops on return to the map. Native code still determines party eligibility and grants every BP reward once. No JavaScript reward arithmetic or BP writes. A 400-enemy v18 battle was copied through the visible Load interface, completed its first cast, and the original save bytes were verified unchanged.

Run python qa-opponent-191/rebuild-native.py to reproduce the exact ROM from immutable v18. Browser replay scripts require the local QA save fixtures. Prior edition assets remain unchanged. Asset and live-browser verification is recorded separately after publication.
