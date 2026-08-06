# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Cacifes" is a React PWA for tracking poker buy-ins (*cacifes*), balances and end-of-night
settlement during a home poker night. Auth and persistence are Supabase; there is no other
backend. Only the host has an account — the other players are just names in the host's roster.

## Commands

```bash
npm install      # install deps
npm run dev      # Vite dev server, http://localhost:5173
npm run build    # production build -> dist/
npm run preview  # preview the production build locally
npm run test     # vitest
npm run lint     # eslint
```

Setup (schema, OAuth, env vars, Vercel) is documented in `SETUP.md`; the SQL lives in
`supabase/schema.sql`.

## Architecture

### Data model

Four Supabase tables, all owner-scoped by RLS (`players`/`poker_tables` filter on
`owner_id = auth.uid()`; `table_players`/`settlements` inherit ownership through the table):

- `players` — the host's roster of recurring people.
- `poker_tables` — one night. Holds `buy_in`, `status` (`active`/`finished`), the settlement
  config (`settlement_mode` = `top_winner` | `fixed_player`, plus `settlement_player_id`), and
  the public-link pair `share_token` / `allow_guest_payments`.
- `table_players` — who sat at that table, with `cacifes` and `adjustment`. `name` is a
  snapshot, so deleting a roster player never rewrites history.
- `settlements` — one row per payment (`from_table_player_id` → `to_table_player_id`,
  `amount`, `paid`).

Balance is always **derived**, never stored. The first buy-in costs `buy_in`; every later one
costs `rebuy_value` (null = same as `buy_in`, which is how older tables keep computing):
`saldo = adjustment − cacifesCost(cacifes, buy_in, rebuy)` — `cacifesCost`/`computeSaldo` in
`src/utils.js`. Both amounts are fixed when the table is created and are **not** editable during
the night, since changing them would silently rewrite everyone's balance. Anything computing a
balance must pass `rebuy` through: `settlement.js`, `summary.js`, `useTable`, `useSortedPlayers`,
and the three screens that render players.

### State ownership

Supabase is the source of truth. `src/hooks/useTable.js` owns the live table: it updates React
state optimistically, then persists per-row with a ~500ms debounce. Writes go through
`saveRow` in `src/lib/syncQueue.js`, which parks failed writes in localStorage (last write per
row wins) and flushes them on `online` or on a 20s interval. Undo is an in-memory stack of
player snapshots; undoing diffs the snapshot against current state and issues the matching
insert/delete/update.

Other data hooks: `useAuth.jsx` (session), `useRoster.js` (the roster), `useTables.js` (list +
creation). `useLocalStorage` survives only for device-local preferences (theme, "copy ends game").

### Screens & routing

`react-router-dom`, with `App.jsx` holding the routes and the auth gate (`RequireAuth`):

| Route | Screen |
| --- | --- |
| `/login` | `LoginScreen` — email+password or Google |
| `/` | `TablesScreen` — active table + finished ones with payment status |
| `/nova` | `CreateTableScreen` — buy-in, roster picks, who collects |
| `/mesa/:id` | `TableScreen` — the cacifes table |
| `/mesa/:id/acerto` | `SettlementScreen` — who owes whom, marking payments, reopen |
| `/estatisticas` | `StatsScreen` — podium, diverging saldo bars, highlight tiles |
| `/acerto/:token` | `SharedSettlementScreen` — **public**, sits outside `RequireAuth` |
| `/ao-vivo/:token` | `SharedTableScreen` — **public** read-only live table |
| `/ranking` | `HandRankingScreen` — static reference, also public |

The public screens never touch the tables directly: `anon` has no grants on them. They call the
two `security definer` functions in `schema.sql` — `get_shared_settlement(token)` and
`set_shared_payment(token, id, paid)` — which scope everything to the row matching the token and
refuse writes unless that table has `allow_guest_payments`. Both public views share one token;
the live view polls the same read function every 10s.

The blinds timer is otherwise browser-local, so `poker_tables.timer_state` (jsonb) carries a
snapshot for guests. It stores `endsAt`, not a countdown — `useBlindsTimer(onSync)` fires only on
transitions (start/pause/reset/next level), and each viewer derives the remaining seconds itself.

Stats visuals follow the `dataviz` skill: the saldo bars are a diverging encoding whose green/red
pair (`#4ADE80`/`#F87171`) sits in the validator's 6–8 deutan band, which is legal *only* because
bar direction and the signed value repeat the information. Don't swap those hexes without
re-running `scripts/validate_palette.js`.

Mid-game actions live in `TableActionsBar` (sticky bottom): add player, timer, time bank, and
"Encerrar" last. The hamburger holds navigation and settings, grouped into sections built from a
declarative array — a falsy item drops out and its section disappears if it empties. Player names
are set when seating someone and are not editable on the table screen. Timer and time bank alerts
respect `lib/alerts.js` (sound + vibration prefs in localStorage, read at fire time so a toggle
applies to the alert already looping); vibration is hidden where `navigator.vibrate` is absent.

`TableScreen` redirects to the settlement screen when the table is `finished`. Modals are
mounted unconditionally and self-hide via an `open`/data prop — follow that pattern rather than
conditionally mounting new ones. The player list supports column sort and drag reorder; drag is
only enabled with no active sort (`dragEnabled = !sort.key`).

### Settlement

`src/lib/settlement.js` is pure and unit-tested (`settlement.test.js`). `buildSettlement` does a
hub-and-spoke split: losers pay one collector, who pays the winners — at most (n-1) transfers.
The collector is the biggest winner unless the table pins a specific player.

Balances must sum to zero for that split to mean anything; when they don't (typically nobody
entered their final chip count), `EndGameModal` blocks and asks how to close the gap.
`balancePlayers(players, buyIn, mode)` applies the answer — `even` splits the difference across
everyone, `top` takes it off the leader(s), `ignore` leaves it to land on the collector — and
`endGame` writes the resolved saldos back into `table_players.adjustment` so history matches the
settlement. `src/lib/summary.js` builds the shareable text from the same balanced numbers;
ending a game copies it automatically, and the table screen's button copies the mid-game version.

### Blinds timer

`useBlindsTimer` is a self-contained, non-persisted countdown: `setInterval`, blind doubling per
level (`baseBlind * 2^level`), and on zero it pauses and beeps (Web Audio `OscillatorNode`) until
`confirmNext()`. `TableScreen` mirrors it in the sticky `timer-bar`.

### i18n

`src/lib/i18n.js` holds three dictionaries (`pt`/`en`/`es`) and the locale resolution: the stored
preference is `auto` (default), which follows `navigator.languages`, or a pinned code. Components
read strings via `useI18n()`'s `t('area.key', { param })`; a missing key falls back to Portuguese
and then to the key itself, so gaps are visible instead of blank. **Every new string goes in all
three dictionaries** — the scratch check in `scripts`-less form: compare `flatten()` of each locale.

Two gotchas: never name a `.map()` callback parameter `t` in a component that translates (it
shadows the function), and hand-ranking/theme names come from the dictionary (`hands.<id>.name`,
`themes.<id>`), not from the data files. Currency stays `R$` in pt-BR format regardless of locale —
the table is played in reais whoever is reading; only `fmtDate` follows the chosen language.

`AppChrome` wraps `Header` plus the theme and language modals, so every screen with a menu (login
included) gets both without repeating state.

### Theming

`useTheme` sets `document.documentElement.dataset.theme`, selecting a CSS custom-property palette
in `src/index.css` (`[data-theme="..."]` blocks). Adding a theme requires both a `THEMES` entry in
`useTheme.js` and a matching CSS block. The `pride` theme additionally has a block of rainbow
border/glow overrides at the bottom of `index.css`, driven by `--pride-arc` and `--pride-glow*`.

### PWA / offline support

`public/sw.js` is hand-written: cross-origin requests (i.e. every Supabase call) are left alone,
navigations are network-first falling back to a cached `index.html` so router deep links work
offline, and same-origin assets are cache-first. Requests carrying `__update` bypass it entirely.
Bump the `CACHE` constant when cached asset paths change.

Auto-update lives in `src/lib/appUpdate.js`, not in the service worker: `sw.js` is byte-identical
between deploys, so the browser never sees a "new" worker and `registration.update()` finds
nothing. Instead it fetches `index.html?__update=<ts>`, compares the hashed entry script against
the one this document loaded, and reloads when they differ — on startup, on returning to the
foreground, and every 30 min while visible. A `sessionStorage` marker stops reload loops if a
stale cache keeps reporting a mismatch.

`public/manifest.webmanifest` declares `id`/`scope`/`start_url` at `/` plus
`launch_handler: navigate-existing` and `handle_links: preferred`, which is what lets an installed
Android/desktop PWA capture in-scope links (e.g. the settlement link) into the app window. iOS
does not implement link capturing — there it always opens in Safari. `useInstallPrompt` captures
`beforeinstallprompt` for the in-app install button. `vercel.json` rewrites all non-asset routes
to `index.html`.

### Card assets

`public/cards/deck/` contains one PNG per playing card, named by rank+suit (e.g. `AS.png`,
`10D.png`). `tools/slice-cards.ps1` is a standalone PowerShell script (not wired into npm scripts)
that slices a full deck sprite sheet into these images — only needed when regenerating card art.
