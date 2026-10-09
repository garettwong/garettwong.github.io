# Wide64 v6 / Player 172

Skips the fighter approach and pose before skill impacts. Separate ROM and save identity; accepted v5 remains available. Explicit selected v5 map save can be copied to an empty v6 slot.

Native changes only affect presentation bytecode for actions 1, 34 and 36 across all four direction variants. Pose operands hide the actors; timed movement runs in one step with the same 16-bit displacement; presentation waits are shortened. Other motion settings and side effects remain intact. Damage, BP, HP, reaction, and defeat routines are unchanged. Random outcomes may vary because animation timing changes.

Gohan Super Wave fixture: approach plus pose 233 -> 13 native frames. First impact action reached at frame 100 instead of 330 from the same saved pre-entrance checkpoint. Both sequences defeat the target and proceed to the next opponent. Complete battle test 3611 frames; no stall. Assisted five-enemy repeated attack fixture completes in 2613 frames with zero projectile-state flags. Final production phone UI tested at 390x844; native explosion visible and Player 172 identity verified. Explicit v5 save copy tested through the actual Load modal and loaded successfully; byte test confirms only native ROM identity changes, with original state and all progress preserved. Unapproved, battle, and wrong-ROM copies rejected.

Reproduce the exact ROM with apply-patch.py SOURCE_V5.nes NEW_V6.nes. Manifest pins source and final hashes and refuses replacement of an unrelated output.
