# Player 178: larger battles and strength choices

Added 180–200 and 380–400 opponents, plus 16×, 32×, 64× and 128× enemy BP/HP and victory-BP multipliers. Counts above 100 use successive native groups, retaining one full-battle counter and completing after all groups. Old v7 assets and saves remain separate; explicit map-save copying preserves all RAM and progression.

## Verification

- Native 6502 execution: 256 seeds per range covers every total 180–200 and 380–400; every group exhausts to zero. All eight strength exponents verified for HP, BP and reward.
- High BP survives every refilled record. Ordinary HP saturates at 65,534; native scripted 65,535 invulnerability remains. Accumulated reward 12,345 survives refills and becomes 1,580,160 at 128×. New encounters clear reserve bookkeeping.
- Real production UI: six Start-battle selections verify native count/strength, HP, BP and full counters. Phone portrait and landscape screenshots inspected. No browser errors.
- Real production emulator: isolated QA battle starts with 89 active opponents and 311 reserved, traverses loaded totals 189, 289, 389, 400, then a reloaded save reaches zero opponents and the native post-battle story scene. This controlled one-HP fixture carries zero reward; reward arithmetic is verified separately above. No user saves are changed by QA.
- Safe v7 map-copy test preserves source bytes and all gameplay RAM; rejects unapproved, mid-battle and foreign states. Existing training, forms and combat code remain cloned from Player 176 except the audited encounter/strength changes.

Sources and exact ROM hashes are in release.json; native patch offsets and code are included. The test harnesses reference local QA fixtures and are evidence, not browser runtime files.
