# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Cacifes" is a React PWA for tracking poker buy-ins (*cacifes*), balances and end-of-night
settlement during a home poker night. Auth and persistence are Supabase; there is no other
backend. Data belongs to a **group**, not to a person: hosts run the nights, members follow
along, and players who never sign up are just names in the group's roster.

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

Seven Supabase tables, all **group**-scoped by RLS. `players`/`poker_tables` filter on
`is_group_member(group_id)` to read and `is_group_host(group_id)` to write;
`table_players`/`settlements` inherit that through the table. Those two predicates are
`security definer` on purpose — a `group_members` policy that queried `group_members` would
recurse. `owner_id` survives on `players`/`poker_tables` but is now only a record of who
created the row; it grants nothing.

- `groups` — the crew. Holds `name`, a short `invite_code` and an optional `image_url` (null
  falls back to the bundled `/default_image.png` via `groupImage()` in `utils.js`). That column
  stores the photo **inline as a `data:` URI**, not a link to somewhere else — an external link
  dies when that host does and forces people to upload the image elsewhere first. `lib/photo.js`
  shrinks and re-encodes in the browser to fit ~150 KB (dropping JPEG quality first, then
  dimensions, so sharpness goes last), and a `CHECK` on the column caps it at 300 000 chars so no
  row can ever become a multi-megabyte monster. Raising one limit means raising the other —
  `photo.test.js` fails if the client cap passes the database one.
- `group_members` — one row per person in the group: `role` (`owner` created it and is the only
  one who changes permissions, `host` runs tables, `member` follows) and the `player_id` they
  represent in the roster. That link is what answers "which of these names is me" — a group
  creator starts with it null, and sets it from the groups screen. `set_member_player` enforces
  that you can only reassign yourself unless you're a host, and that two members never claim the
  same player.
- `group_join_requests` — pending asks made with an invite code, waiting on a host.
- `profiles` — one row per account (`id` is the `auth.users` id): `first_name`, `last_name`, an
  optional `pix_key`, and a `photo` stored the same inline way as the group image. Created by the `on_auth_user_created`
  trigger rather than by the app, because Google sign-in never passes through the sign-up form —
  the trigger reads `raw_user_meta_data`, splitting Google's `full_name` on the first space.
  Readable by anyone who shares a group with you (`shares_group_with`, security definer);
  writable only by yourself.
- `players` — the group's roster of recurring people, unique per
  `(group_id, lower(name), lower(nickname))`. The optional `nickname` exists because every group
  has two Andrés and the stats aggregate **by name** — without it the second one either couldn't
  be added or would silently merge into the first. `playerLabel()` in `utils.js` renders
  `André (Careca)`, and that label is what gets snapshotted into `table_players.name` when
  someone sits down, so history stays unambiguous forever. The nickname input only appears when
  the typed name already exists in the roster.
  A roster player is **not** an account: the bridge is `group_members.player_id`. A player nobody
  claimed is a **visitor** — it still has a page and the full night-by-night history, because the
  stats hang off the player, not off the account. It becomes someone's the moment a member links
  to it.
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
`saveRow` in `src/lib/syncQueue.js`, which retries a failing write up to three times (only for
network errors — RLS and bad data never improve on repetition) before parking it in
localStorage (last write per row wins). Undo is an in-memory stack of player snapshots; undoing
diffs the snapshot against current state and issues the matching insert/delete/update.

`syncQueue` also owns the connection state, which is *"did the database answer?"*, not
`navigator.onLine` — the phone can be on the house wi-fi and still not reach Supabase. Every
call feeds it through `reportResult(error)`, and `SyncStatusBar` (mounted once in `AppChrome`)
turns that into the persistent "you're offline, keep playing" banner and the transient "back
online, table synced" one, which only fires once the parked queue has actually drained.

Two data hooks own scope. `useAuth.jsx` holds the session; `GroupProvider` in `useGroups.jsx`
holds the memberships and which group is open (localStorage, falling back to the first
membership when the stored id is stale). Everything below reads `activeGroupId` from it:
`useRoster.js` (the group's roster), `useTables.js` (list + creation + delete),
`useGroupAdmin.js` (members and join requests — deliberately outside the provider, since only
the groups screen needs those two queries). `useLocalStorage` survives only for device-local
preferences (theme, "copy ends game").

Deleting a table confirms with the server (`.delete().select()`): an empty result means RLS
refused in silence, which is reported instead of the row quietly reappearing on next load.

### Screens & routing

`react-router-dom`, with `App.jsx` holding the routes and two gates: `RequireAuth`, then
`RequireGroup`, which sends anyone without a group to `/grupos` to create one or join with a
code. Members who are not hosts never get links into the editing screens — they're pointed at
the public `/ao-vivo` and `/acerto` views instead, which already handle read-only viewers, and
`TableScreen`/`SettlementScreen` redirect them there if they arrive anyway.

| Route | Screen |
| --- | --- |
| `/login` | `LoginScreen` — email+password or Google |
| `/grupos` | `GroupsScreen` — group list, the open group, invite code, "I play as" |
| `/entrar/:code` | same screen, opening the join modal with the code prefilled |
| `/perfil`, `/perfil/:userId` | `ProfileScreen` — a person, entered from the account side |
| `/jogador/:playerId` | same screen from the roster side, for players with no account (visitors) |
| `/` | `TablesScreen` — every active table + finished ones with payment status |
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

Pix keys ride along that same read: `get_shared_settlement` resolves each seat's key through
`group_members` → `profiles`, so a guest holding the link can copy the key of whoever they owe
without an account. That is deliberate — the link already goes to the group, and the copied
summary carries the keys anyway — but it does mean **the key is readable by anyone with the
share token**, so treat a leaked link accordingly. Authenticated screens get the same map from
`usePixKeys`, which walks the chain in the app instead.

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
go through `lib/alerts.js` — a single sound preference in localStorage, read at fire time so
toggling it applies to an alert that is already looping. Vibration was tried and removed: browsers
drop `navigator.vibrate()` whenever the tab is backgrounded or the screen is off, which is exactly
when a blinds timer needs to reach someone, so it never fired when it mattered.

`TableScreen` redirects to the settlement screen when the table is `finished`. Modals are
mounted unconditionally and self-hide via an `open`/data prop — follow that pattern rather than
conditionally mounting new ones. The player list supports column sort and drag reorder; drag is
only enabled with no active sort (`dragEnabled = !sort.key`).

`GroupsScreen` is a thin shell over six modals (`GroupFormModal` for both create and edit,
`JoinGroupModal`, `GroupMembersModal`, `GroupRosterModal`, `GroupRequestsModal`,
`PickPlayerModal`) so the page stays a list of groups plus the open one. `useGroupAdmin` is
instantiated for **every** member, not just hosts — plain members need the member list to know
which roster players are already claimed, and RLS already hides the join requests from them. It
also loads the members' profiles in a separate query, since PostgREST can't hop from
`group_members` to `profiles` through `auth.users`.

Profile identity shows up in the group screens and never on the cacifes table: mid-game the row
needs a name and a number, not an avatar. `ProfileScreen` serves one page from two directions —
`/perfil/:userId` starts at an account and walks to its player, `/jogador/:playerId` starts at a
roster player and looks for the account that claims it. Either way the numbers come from the
**player** name via `computePlayerStats` over the open group's finished tables, so an unclaimed
player (badged "visitante") has a full history and an account with no player linked has none.
Names in `StatsScreen` link to whichever of the two routes applies.

`AdjustModal` (cashing a player out) ships its own keypad instead of a text input, and does not
close on a backdrop click. All three are scars from a real night: the iPhone numeric keyboard has
no comma so the amount was unenterable, the system keyboard covered the confirm button, and
tapping near the edge to dismiss the keyboard threw the typed value away. The amount is held as a
digit string and filled right-to-left like a card machine (`pushMoneyDigit`/`moneyDigitsToNumber`
in `utils.js`) — never reintroduce a `type="number"` field here. Physical keyboards still work via
a `keydown` listener, which is also the only way to close with Escape.

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
three dictionaries** — `i18n.test.js` flattens each locale and fails on any key the others don't
have, so a forgotten translation shows up as a red test rather than silent Portuguese.

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

The manifest **must keep a PNG icon of at least 192px**. Chrome on Android only mints a WebAPK
from a raster icon; with an SVG-only icon set it installs a plain shortcut and shows a permanent
"tap to copy site URL" notification for as long as the app is open. `icon-192/512`,
`icon-maskable-512` and `apple-touch-icon` are generated from the same drawing as `icon.svg` by
`tools/make-icons.ps1` (standalone, like `slice-cards.ps1`); rerun it and bump `CACHE` in `sw.js`
if the artwork changes.

### Card assets

`public/cards/deck/` contains one PNG per playing card, named by rank+suit (e.g. `AS.png`,
`10D.png`). `tools/slice-cards.ps1` is a standalone PowerShell script (not wired into npm scripts)
that slices a full deck sprite sheet into these images — only needed when regenerating card art.
