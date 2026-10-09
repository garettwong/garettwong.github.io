# Player 173 / Wide64 v7

- Restores 18 valid native pose operands so skipped preparation still initializes fighter graphics, CHR banks and drawing caches. The left preparation hook discards only the new OAM entries; short motion durations remain.
- Fixes the native BP HUD upload: seven tiles were written into a six-tile panel, overwriting the adjacent card/portrait. Both panels now upload six tiles, with a bounded native BP writer and adjusted BE offset. The browser continues displaying the exact working HP/BP from state.
- Card drawing restores both optional hundreds cells before drawing current 1-256 values.
- Home displays only the latest DBZ alongside Contra and Captain Tsubasa; original DBZ II title-screen thumbnail replaces the custom artwork. Old ROMs and saves remain intact.
- Explicit v6 map-save copy validates pinned ROMs, code and idle CPU/mapper state. Only audited card renderer code and the NFO identity change. No automatic save migration.

Validation: all 65,536 attack/defense pairs pass exact native digit and unused-cell checks; all six rows of both native stat panels stay six tiles wide. Normal battle exits after 3,611 frames; assisted 89-enemy repeated battle exits after 14,223 frames. Actual 390x844 player, native card comparison and title-screen library screenshots inspected; no page errors/missing resources. Explicit selected-save copy preserves progression and rejects unapproved, battle and foreign ROM inputs.

Scope: these are targeted graphics repairs and battle regression tests, not a complete game playthrough. The exact full corrupted state from the user's video was not available. No changes to damage, HP/BP arithmetic or rewards.
