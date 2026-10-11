# Player 192 / Wide64 v20

Entry: https://garettwong.github.io/dbz-wide64-v20-play.html

The gold result panel is fully inset on a uniform black background. Player name, combat BP and potential damage are in the left column. Average opponent HP/BP and actual HP loss are in the right column. Both damage values remain group averages; the underlying damage and reward rules are unchanged.

MISS STREAK appears below the enemy count at the top left. It follows native target order, increases for each native miss and resets on a native hit. The displayed value advances with the completed group; a new battle or loaded save starts a new count. This is a presentation counter and is not inferred from HP loss. Unknown historical results in an imported mid-attack checkpoint remain unknown until a native hit establishes zero.

The native post-damage save hook records the final $A7 hit/miss flag into two spare bits in each existing quotient record. The original save routine still runs first; registers, flags and all combat state remain identical. 120 native old/new comparisons cover hit/miss, all five target slots, quotient exponents and guard conditions. Eight counter tests include zero-damage hits and unknown records. Full 2- and 396-enemy native victories, the 25.169B BP fixture, and a miss-heavy native battle verify all recorded counter transitions. Rewards still require one manual confirmation. A 400-enemy v19 save was copied via Load and its original bytes were verified unchanged.

Raw replay fixtures remain in local QA storage. Reproduce the ROM using python qa-miss-192/rebuild-native.py. Prior v19 files, ROM and save identity are preserved. Live publication evidence is added after deployment.

Live verification: all 84 runtime assets matched; homepage entry booted the expected ROM. The phone layout and panel margins were inspected. A native 2-enemy high-BP battle ended on the map after one A, with rewards once. The 396-target low-BP/low-attack-card fixture produced a maximum visible miss streak of 18; every group transition was checked against native flags. A v19 400-enemy save copied successfully, completed its first cast, and its source bytes remained unchanged. See live-acceptance.json and live-miss-trace.json.
