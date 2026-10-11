# Player194 validation

Fixes button-driven speed/audio timing changes introduced in193: manual fast-forward inputs are bounded by visible native frame uploads without toggling game speed. Rapid A/B uses its own input source. Skill dialogs retain rapid-lock intent and resume it after confirmation/back. A selected lock says A/B paused while choosing.

Native v20 ROM and save identity are unchanged. Counter uses actual native defeats, not number attacked. Footer reports ATTACKED / KO / ALIVE. 71 verified original NES pose crops across31 types are loaded; type34 retains its original fallback.23 types have multiple captured poses. Native pose plus mirrored orientation, three formations and entry/miss movement provide variation without substituting enemy identities. Native scrolling terrain is captured once at battle start.

Production input QA:52 speed/navigation assertions at1x/4x/16x/64x,25 all-five-card assertions at64x,2 overlap assertions,4 rapid-lock assertions, plus4 targeted paused-label/resume assertions. Zero input-triggered fast-forward toggles outside the existing native skill confirmation.

SS-I386 first cast verifies all386 unique targets, actual native damage/KO accounting,5 one-KO groups, moving field and multiple native poses. Full SSII128x-strength386 battle checks victory, interruptions and single reward. Final native lone-survivor path can lack potential/miss telemetry: UI shows unknown, never fabricated damage potential or hit/miss. This explicit availability exception is checked separately from known native telemetry.

Headless mobile Chrome390x844 with touch input. Physical iPhone Safari, physical controller and audible speaker output were not tested. No claim of exhaustive correctness. Native audio assets are unchanged; timing fix verified through fast-forward instrumentation. Prior reports and unverified pose candidates are preserved outside this release.

Fresh public-load QA caught missing scenery with the original500ms capture window. The corrected version requests capture at native battle-transition phase9, allows up to2seconds for the genuine field, and restores selected speed immediately on a match. This runs once per encounter, not on menu button presses. Local normal-strength386 replay verifies a field from the first group and full reward/map completion.

## Final public verification

Runtime68199bd, Pages38113431960 success. All159 public assets match the committed manifest. Fresh mobile390x844 live386-enemy replay passes full victory, background resume, native counter/damage/miss checks, field from first group, moving terrain and one-A reward/map return. Fresh live A-lock preserved/resumed successfully. Live screenshots inspected. See live-acceptance.json and live-phone194.png.
