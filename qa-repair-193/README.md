# Player 193 repair validation

Native v20 ROM and save key are unchanged. Repairs are in the browser player.

- Original cartridge terrain is captured before the fast path hides frame uploads. A full native strip fingerprint identifies the actual arena; that strip scrolls behind the grouped battle and resets between encounters. No replacement art or default arena is invented.
- All NES buttons temporarily use normal native input sampling, including overlapping inputs, before restoring selected speed. The shared controller used by other editions is preserved.
- Group previews require an active native group instead of stale skill fields. Failed acknowledgements close the presentation. Resume restarts a pending final native acknowledgement, and explicit return-to-game resumes grouped attacks.
- A synthetic visibility interruption after the final native state write reproduced “could not continue” on Player192. The same test passed with Player193 and returned through one reward confirmation to the map.
- 68 card-navigation/input assertions across 1x/4x/16x/64x; 20 additional assertions selecting every card at64x; overlapping A+Right release checked. Touch and controller input are browser emulated.
- Full386 battle at128x strength, Gohan II17M, background interruption, native hit/miss accounting and reward verification passed. Ordinary386 also passed. Distinct rendered terrain offsets verify motion.

See acceptance.json, card reports and screenshots. QA scripts use Node/Playwright Chrome. Fixture saves are in local NES-Environment193-QA, never user save slots. Public byte verification and live screenshots follow deployment. No claim of exhaustive correctness or physical iPhone validation.
