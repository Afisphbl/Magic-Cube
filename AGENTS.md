# Magic Cube: AGENTS.md

AI agent context for the Magic Cube project. Read this before touching any code.
Update it only via `/sync` after a feature lands or `/audit` after a scaffold build.

## Project

A mobile Rubik's Cube puzzle game for casual players, built with Expo and React Native.
Offline only. No account. No backend.
Source of truth for the product plan: `docs/scope/scope.md`.

## Build approach

Tracer Bullet (prove the render, cube state, and interaction loop end to end in one real working slice, then thicken each segment).

## Stack

| Layer | Choice | Version or notes |
|---|---|---|
| Language | TypeScript | 5.8 |
| Framework | Expo (managed workflow) + React Native | Expo SDK 54, React Native 0.81.5, React 19 |
| 3D rendering | Three.js via @react-three/fiber + expo-gl | Three 0.170, R3F 9.0, expo-gl 16.0 |
| State | Zustand | 5.0 |
| Navigation | Expo Router (file based) | 6.0 |
| Testing | Node test runner + React Native Testing Library | `test/*.test.mjs` |
| Code quality | ESLint + TypeScript check | expo lint, tsc --noEmit |

Spec: `docs/specs/0002-stack-and-architecture/index.md`

## Commands

```bash
# Start dev server
npm start

# Dev server in browser
npm run web

# Dev server for Android
npm run android

# Dev server for iOS
npm run ios

# Lint check
npm run lint

# Type check
npm run typecheck

# Unit tests
npm test

# End to end tests
npm run test:e2e
```

## Rules

- Keep logical cube state in the Zustand store (`src/store/useCubeStore.ts`).
- The 3D scene reads cube state; it never mutates it directly.
- Pure game logic and move permutations live in `src/logic/` with unit tests in `test/`.
- Use TypeScript strict types for all move definitions and state structures.
- Scene interactions use React Three Fiber pointer events on cubie meshes and background sphere.
- Design system: build all UI to `docs/design.md` (art direction and the maximalist product bar); token values live in `src/theme/`.

## Agent skills

Skills installed for this project (`.agents/skills/`):
- [/architect](.agents/skills/architect/): design a feature and write a spec
- [/develop](.agents/skills/develop/): build from a spec
- [/check](.agents/skills/check/): verify behavior or review code
- [/test](.agents/skills/test/): write tests
- [/scope](.agents/skills/scope/): manage product scope
- [/sync](.agents/skills/sync/): update AGENTS.md after feature lands
- [/audit](.agents/skills/audit/): bootstrap AI context
- [/debug](.agents/skills/debug/): root cause and fix bugs
- [/document](.agents/skills/document/): write release notes or changelogs
- [expo-router](.agents/skills/expo-router/): navigation and routing for Expo Router

## Context files

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
