# ES28 UI163 development layout fixture

This is a development-only responsive layout and interaction fixture. Every battle, card-editor, and skills overlay node is created by the actual frozen JavaScript modules and their real `start`/`open` methods. UI163 then adapts those real nodes. There is no copied overlay HTML and no running NES core. This is **not native gameplay, battle-completion, or physical iPhone proof**.

The reference phone screenshots were inspected at their original pixels: `IMG_1093.jpeg` cuts the battle's footer explanation, `IMG_1092.jpeg` cuts card actions below the lock/help text, and `IMG_1094.png` leaves the 16-folder skills menu as a long one-column scroll.

## Prepare locally

From the repository root:

```sh
node work/es28-ui163-publication/qa/build.mjs
python -m http.server 8765 --bind 127.0.0.1 --directory work/es28-ui163-publication/qa
```

Open `http://127.0.0.1:8765/` in a permitted browser. The first cloud-browser attempt on 2026-10-08 returned `net::ERR_BLOCKED_BY_CLIENT`; no alternate host/proxy or other bypass was attempted. Local layout/interaction execution is therefore not claimed until a supported browser can reach it.

`build.mjs` copies the actual source bytes without rewriting them. `manifest.json` gives each source path, byte size, and SHA-256. Run the builder again whenever the UI163 addon changes. `--baseline` permits preparation while the addon is absent, but then turn off “Apply UI163 overlay styles.”

## Scoped staging payload (parent coordinates publication)

For `/enemy-strength/qa163/`, copy only:

- `index.html`, `frame.html`, `harness.css`, `harness.js`, `fixture.js`
- `manifest.json`, `report.schema.json`, `README.md`

The staged fixture detects that exact pathname prefix and loads the real shared modules from `/dbz-*.js/css`, the real edition modules from `/enemy-strength/dbz-enemy-strength*.js/css`, and the unreferenced candidate addons from `/enemy-strength/ui163.css` and `/enemy-strength/ui163.js`. Locally it uses byte-identical copies under `assets/`. No ROM binary is included or requested.

Keep this route unlinked from production. Remove the QA route after checks. This harness never publishes itself.

## Storage and mock state boundary

Before loading any game module, the fixture replaces **only its own window's** `localStorage` property with a fresh memory-only adapter. It never reads or clears real origin storage. Every iframe reload starts an empty fixture store. No IndexedDB, production runtime, game loader, ROM, network write, or real save API is used.

The fixture procedurally creates a zero-filled minimal RAM/WRAM interface mock and independently sets only the tag headers, required adapter markers, two opponent IDs, and UI eligibility values. No ROM or saved-state payload is fetched, copied, embedded, decoded, uploaded, or loaded. Battle mode calls the real `DreamEnemyStrength.start`, including its ES28 startup guard, against those minimal markers. Cards get five synthetic display records. The mock API stores in-memory byte copies on `loadState`. Its battle acknowledgment is synthetic and logged as such. Native skill input is intentionally unsupported, so selecting a move can only show the real adapter's error handling; it cannot masquerade as native confirmation.

## Render matrix

Use the controls in the outer page; they create true iframe viewport sizes without requiring a browser viewport API. No CSS transform scales the inner content.

| Outer size | Game iframe | Use |
| --- | --- | --- |
| 390 × 844 | 390 × 580 | Requested portrait |
| 430 × 932 | 430 × 668 | Requested portrait |
| 390 × 844 | 390 × 570 | Extra browser-chrome pressure |
| 430 × 932 | 430 × 640 | Extra browser-chrome pressure |
| 844 × 390 | 844 × 300 | Landscape |
| 932 × 430 | 932 × 340 | Larger landscape |

“Keyboard resize” reduces the actual iframe height by 260 px, down to a minimum of 180 px, while keeping its window and DOM alive. This exercises resize handling and focus retention; it does **not** emulate Safari's visualViewport keyboard offset or prove iOS keyboard behavior.

“Measure visible layout” only reads actual DOM bounds, scroll metrics, computed font sizes, selected/invalid states, and the active element. It does not reposition or focus anything. Reports appear in the outer page and follow `report.schema.json`. Press the measurement button again after each important interaction. The outer measurement and resize buttons suppress pointer focus changes so they can inspect a still-focused iframe input.

## Required interactions via normal CUA/browser controls

Do not call handlers, inject state, dispatch synthetic input, or mutate DOM with browser evaluation. Use the outer fixture radio buttons/dimension inputs, then click real overlay controls. Browser evaluation may read the resulting DOM only.

1. Battle: at each portrait size check all four count and all four strength choices, the summary, and Start battle. Confirm target dimensions ≥44 px, no horizontal overflow, and all controls visible without scrolling. Exercise radio arrow/Home/End navigation and Tab/Shift+Tab trap. Starting only verifies the mock UI flow, not gameplay. Reload reopens the fixture.
2. Cards: exercise all five tabs. Set Attack to 256 and Defence to 1 using text input and Enter/change, select each limit button, change the middle symbol, lock/unlock, Apply to all 5, Original values, and Back to game. Check input/select text ≥16 px, all tabs and all three bottom actions visible at portrait sizes, no horizontal clipping, and touch targets ≥44 px. Reopen and test Escape and focus return. Enter an invalid value and confirm the real validation message stays usable.
3. Skills: verify the real root has 16 folders. Open Goku; the frozen source has **11 moves, not 12**. No fake move is appended. Verify every label, Characters back navigation, Back to game, Escape, Tab/Shift+Tab, and focus return. Repeat opening/closing. If a 12-entry synthetic stress test is desired, keep it separate and explicitly label it non-catalog; this fixture intentionally does not alter the real list.
4. Resize: with a card field focused, use Keyboard resize, measure retained focus and font size, and use ordinary keyboard navigation to reach the footer. Restore the size and confirm inputs/actions recover. Repeat in landscape. Internal scrolling is acceptable at these short heights only if every control remains reachable and the footer remains visible.
5. Evidence: retain screenshots of the real inner DOM at 390×580 and 430×668, plus compact/landscape/input focus states. Save measurements alongside them. Compare baseline/candidate at the same dimensions. Screenshots alone do not prove the whole control list or navigation.

## Current verification status

- Complete: actual module source/call inspection, phone reference image inspection, source copy manifest, fixture isolation by construction, JavaScript syntax checks.
- Blocked locally: browser render/interaction checks, because localhost is blocked by this cloud browser.
- Awaiting supported scoped staging: responsive measurements, real CUA interactions, screenshots, and candidate layout verdict.
