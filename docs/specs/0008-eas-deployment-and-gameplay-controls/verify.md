# Verify: EAS deployment and gameplay controls · spec 0008 · updated 2026-09-24
_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Load the game screen and observe the bottom HUD controls gives only Start and Record buttons without obsolete view or scramble buttons (AC-4)
- [x] Tap Start button gives a rapid 20 move shuffle animation running at 50ms per move, locking the Start button and displaying Shuffling status (AC-5)
- [x] Observe the exact moment the 20th shuffle move resolves gives gamePhase transition to PLAYING, move count resetting to zero, and timer immediately running from 0.00 (AC-5)
- [x] Tap Start while a solve attempt is active gives immediate reset of active attempt and begins a fresh 20 move shuffle (AC-5)
- [x] Complete a full solve gives automatic time evaluation against the top 5 records and saves qualifying records to device storage (AC-6)
- [x] Tap Record button when no records exist gives RecordsModal overlay with title No Solves Yet and subtitle Tap Start to complete your first solve and set a record (AC-7)
- [x] Tap Record button after completed solves gives RecordsModal overlay with top 5 fastest records sorted ascending by solve time, displaying rank badges, formatted times, moves, and turns per second (AC-7)
- [x] Reload or restart the application gives top records loaded automatically from persistent local storage without data corruption (AC-8)

## Commands
- [x] `npm run typecheck` gives exit code 0 with clean TypeScript validation (AC-1, AC-6, AC-7, AC-8)
- [x] `npm run lint` gives exit code 0 with clean lint status across project files (AC-1, AC-4, AC-7)
- [x] `npm test` gives exit code 0 with 143 passing unit and integration tests (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8)

## Acceptance criteria coverage
- AC-1 covered by commands step 3 (app.json configuration test)
- AC-2 covered by commands step 3 (asset metadata test)
- AC-3 covered by commands step 3 (eas.json preview profile test)
- AC-4 covered by UI step 1 and commands step 3
- AC-5 covered by UI steps 2, 3, 4 and commands step 3
- AC-6 covered by UI step 5 and commands step 3
- AC-7 covered by UI steps 6, 7 and commands step 3
- AC-8 covered by UI step 8 and commands step 3
