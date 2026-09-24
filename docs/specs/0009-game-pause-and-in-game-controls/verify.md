# Verify: Game pause and in game controls (spec 0009, updated 2026-09-24)
_Steps derived from spec 0009 acceptance criteria. /check verify runs these, and /test locks the durable ones._

## UI / manual
- [x] Tap Start from idle main screen -> 20 move shuffle runs, timer activates, and Start and Record buttons disappear -> AC-1, AC-2
- [x] During active play while unpaused -> Pause button appears in the top bar next to HUD stats -> AC-3
- [x] Tap Pause button during active play -> Timer freezes, cube touches do not rotate faces or orbit view, and Pause modal appears -> AC-4, AC-5
- [x] Inspect Pause modal -> Darkened backdrop obscures the cube, showing elapsed time, moves, and three buttons for Resume, Restart, and Main Page -> AC-5
- [x] Tap Resume in Pause modal -> Modal closes, cube gestures unlock, and timer resumes without time penalty -> AC-6
- [x] Tap Restart in Pause modal -> Modal closes, time and moves reset to zero, and fresh 20 move shuffle begins -> AC-7
- [x] Tap Main Page in Pause modal -> Modal closes, cube resets to solved, time and moves clear, and centered Start and Record buttons return -> AC-8
- [x] Send app to background or switch apps during active solve -> App pauses automatically and displays Pause modal upon return -> AC-9
- [x] Pause and resume twice during a solve -> Total solve duration equals sum of active segments with zero time added from pause -> Value sourcing
- [x] Solve the cube after pausing -> Result record accurately records active duration plus move count -> Value sourcing

## Commands
- [x] `npm run typecheck` -> Exits with code 0 -> AC-1 to AC-9
- [x] `npm test` -> All 163 tests pass including 9 pause suite tests -> AC-1 to AC-9
- [x] `npm run lint` -> Exits with code 0 clean -> AC-1 to AC-9

## Acceptance criteria coverage
- AC-1 covered by Start and Record centered on idle or solved
- AC-2 covered by Start and Record hidden during active play
- AC-3 covered by Pause button visible in header during active unpaused play
- AC-4 covered by Pause action freezing timer and locking cube gestures
- AC-5 covered by Pause modal rendering darkened backdrop, stats, and three action buttons
- AC-6 covered by Resume button dismiss, gesture restore, and timer resume
- AC-7 covered by Restart button reset and immediate fresh 20 move shuffle
- AC-8 covered by Main Page button solve reset and return to main screen
- AC-9 covered by AppState background and inactive automatic pause
