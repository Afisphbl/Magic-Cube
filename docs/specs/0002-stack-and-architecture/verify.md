# Verify: Stack and Architecture · spec 0002

## UI / Browser
- [x] Web export builds cleanly (`npx expo export --platform web`) → bundles generated without errors
- [x] Initial game screen loads in Chrome at `http://localhost:8081` → title, status, and control buttons visible (screenshot in scratch)
- [x] Scramble button tapped → phase transitions to PLAYING and move counter resets
- [x] Reset Game button tapped → phase transitions back to SOLVED and moves counter resets to 0
- [x] Top face toggle button tapped → button text alternates between Yellow Top and White Top

## Automated Commands
- [x] `npm test` → 27 unit and regression tests pass (permutations, 18 moves, camera bounds, store invariants)
- [x] `npm run typecheck` → TypeScript compilation passes with zero errors
- [x] `npx playwright test` → 4 browser automation flow tests pass in Chrome

## Acceptance Criteria Coverage
- AC-1: Expo managed workflow scaffold with TypeScript and Expo Router boots in web browser
- AC-2: Three.js and react-three-fiber scene with 26 cubies, lighting, and camera bounds
- AC-3: Zustand store maintains 54-element sticker state, game phase, and move count
- AC-4: HUD overlay displays stats and controls (Scramble, Reset, Orientation presets)
