# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Cacifes" is a single-page React PWA for tracking poker buy-ins (*cacifes*) and running balances during a home poker night. All state lives in the browser's `localStorage` — there is no backend, API, or database.

## Commands

```bash
npm install      # install deps
npm run dev      # Vite dev server, http://localhost:5173
npm run build    # production build -> dist/
npm run preview  # preview the production build locally
```

There is no lint, type-check, or test suite configured in this repo.

## Architecture

### State ownership

All app state is owned by `src/App.jsx`, backed by two localStorage hooks:

- `useUndoableLocalStorage` (`src/hooks/useUndoableLocalStorage.js`), key `poker-dos-meninos-v1` — holds `{ buyIn, players[] }`, the live table state. Every `setState` call is pushed onto an undo stack (max 40 entries) surfaced via the floating "Desfazer" button.
- `useLocalStorage` (`src/hooks/useLocalStorage.js`) — plain persisted state, used for `history` (past nights, key `poker-dos-meninos-history-v1`) and the `copyEndsGame` preference.

Everything under `src/components/` is presentational: components receive data and callbacks as props and hold no persistence logic. README.md's "Evoluindo para banco de dados" section describes the intended migration path to a real backend: swap the two hooks above for remote-backed equivalents; the component tree doesn't need to change.

### Core domain model

A player is `{ id, name, cacifes, adjustment }`. `cacifes` is the count of buy-ins taken (new players start at 1); `adjustment` is a manually entered cash correction. Balance is always **derived**, never stored:

```
saldo = adjustment - (cacifes × buyIn)
```

— `computeSaldo` in `src/utils.js`. Changing the table's buy-in value recomputes every player's balance instantly; there's no migration/backfill step.

"Ending the night" (`endGame` in `App.jsx`) snapshots every player's computed saldo into `history`, then resets each player's `cacifes` to 1 and `adjustment` to 0 — it does **not** clear the player list. `ResetModal`'s "keep players" option does the same reset without writing history; "reset full" wipes the table back to `{ buyIn: DEFAULT_BUYIN, players: [] }`.

### View & modal structure

`App.jsx` renders one of two top-level views (`view` state: `'home' | 'ranking'`), plus a stack of modals toggled by boolean/nullable state (`deletingPlayer`, `adjustingPlayer`, `exportOpen`, `resetOpen`, `themeOpen`, `historyOpen`, `statsOpen`, `timerOpen`, `endGameOpen`). Every modal is mounted unconditionally at the bottom of `App.jsx` and self-hides via an `open`/data prop — follow this pattern (don't conditionally mount new modals).

- `HandRankingScreen` — static Texas Hold'em hand-ranking reference (data in `src/data/handRankings.js`), swapped in for the whole home view.
- The player list supports column sort (`sort` state / `toggleSort`) and native drag-and-drop reordering; drag is only enabled when no sort column is active (`dragEnabled = !sort.key`).

### Blinds timer

`useBlindsTimer` (`src/hooks/useBlindsTimer.js`) is a self-contained, non-persisted countdown for blind levels. It counts down via `setInterval`, doubles the blind each level (`baseBlind * 2^level`), and on hitting zero pauses and beeps (Web Audio `OscillatorNode`) on a loop until `confirmNext()` advances the level. `App.jsx` mirrors its state in the sticky `timer-bar` whenever `timer.active` is true.

### Theming

`useTheme` (`src/hooks/useTheme.js`) sets `document.documentElement.dataset.theme`, which selects a CSS custom-property palette in `src/index.css` (`[data-theme="..."]` blocks). Themes are declared in `useTheme.js`'s `THEMES` array — adding a theme requires both a `THEMES` entry and a matching CSS block.

### PWA / offline support

`public/sw.js` is a hand-written service worker (cache-first, falls back to network, then to cache on network failure) registered from `src/main.jsx`. `public/manifest.webmanifest` supplies install metadata. `useInstallPrompt` (`src/hooks/useInstallPrompt.js`) captures `beforeinstallprompt` to drive the in-app install button in `Header.jsx`. When changing cached asset paths, bump the `CACHE` constant in `sw.js` to invalidate old caches.

### Card assets

`public/cards/deck/` contains one PNG per playing card, named by rank+suit (e.g. `AS.png`, `10D.png`). `tools/slice-cards.ps1` is a standalone PowerShell script (not wired into npm scripts) that slices a full deck sprite sheet into these individual images — only needed when regenerating card art.
