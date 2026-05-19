# AFM-26 — UI Prototype

A hi-fi clickable prototype for the AFM-26 American Football League GM simulation, built per `docs/stage-1-game-design-rules.md`.

## Run

Open `AFM-26 Prototype.html` in any modern browser. No build step.

## What's here

- **`AFM-26 Prototype.html`** — entry point; loads React + Babel + all screens.
- **`styles/app.css`** — design tokens (light mode, AFL deep-green accent) and component styles.
- **`data/league.js`** — fictional league data: 16 teams across 4 conferences (West / North / East / South), ~880 players, contracts, ratings, schedule, news, draft class, free agents. Deterministic PRNG (seeded), so data is stable across reloads.
- **`components/chrome.jsx`** — shared UI: `Sidebar`, `Topbar`, `OvrPill`, `Stars`, `TeamBlock`, `ColorBlock`, `Avatar`, `FatigueBar`, `InjBadge`, `FieldDiagram`.
- **`screens/screens-team.jsx`** — Dashboard, Roster, Depth Chart, Strategy, Contracts & Cap.
- **`screens/screens-game.jsx`** — Game Week (preview → live ticker → recap), Standings + playoff bracket, League Leaders.
- **`screens/screens-front-office.jsx`** — Scouting, Draft, Free Agency, Trade Center, Training, Awards, Hall of Fame.
- **`docs/UI-SPEC.md`** — annotated spec describing each screen, components, and data contracts.

## Screens (15)

| Nav id      | File                        | Notes                                              |
|-------------|-----------------------------|----------------------------------------------------|
| dashboard   | screens-team.jsx            | Record, cap, prestige, next game, leaders, news    |
| roster      | screens-team.jsx            | 55-player roster, filters, OVR/age/cap sort        |
| depth       | screens-team.jsx            | Starter→5th by position, injury-aware              |
| strategy    | screens-team.jsx            | 5 OFF + 5 DEF systems, 6 tendency sliders, concept weights |
| contracts   | screens-team.jsx            | Cap, payroll, top hits, allocation, extensions     |
| training    | screens-front-office.jsx    | Camp + 3 in-season windows, 5 focus slots, 3 intensities |
| gameweek    | screens-game.jsx            | Preview → live drive ticker → recap (drive chart, box score, key plays) |
| standings   | screens-game.jsx            | 4 conferences, playoff bracket projection, schedule |
| leaders     | screens-game.jsx            | League stat leaders incl. defensive |
| scouting    | screens-front-office.jsx    | Per-group point allocation, hidden vs revealed info |
| draft       | screens-front-office.jsx    | 5 rounds × 16 teams, rookie scale, draft order     |
| fa          | screens-front-office.jsx    | Free-agent pool, asking price, in-season vs offseason |
| trades      | screens-front-office.jsx    | Trade builder, value calculator, window status     |
| awards      | screens-front-office.jsx    | MVP/OPOY/DPOY/ROY×2 + 1st team All-Pro OFF/DEF     |
| hof         | screens-front-office.jsx    | Retiring ballot, 4-vote threshold, eligibility     |

## Design system (quick reference)

**Type:** Inter (UI), Archivo (display), JetBrains Mono (numerics).
**Color:** light mode. Neutrals `#F6F7F9` → `#0E1116`. Accent: AFL deep green `#0B6E4F`. Positive `#1F8A5B`, negative `#C0392B`, warn `#B7791F`.
**Radii:** 4 / 6 / 10 px. **Shadows:** very soft (`0 1px 2px rgba(14,17,22,0.04)`).
**OVR pill colors:** elite ≥90 (green), gold ≥85, silver ≥78, bronze ≥70.
**Team identity:** color-block only — primary/secondary diagonal split, no logo marks (per spec).

## Data shape (key types)

See `data/league.js`. Highlights:

```js
Team = { id, city, name, abbr, conf, primary, secondary, prestige,
         cap, w, l, tie, pf, pa, pct, diff, roster: Player[],
         payroll, capSpace, ovr, offRating, defRating }

Player = { id, name, first, last, teamId, pos, group, age,
           ovr, potential, ceiling, attrs, traits, fatigue, injStatus,
           years, salary, cap, guaranteed, isStarter, depth }
```

`window.AFL` exposes `{ TEAMS, USER_TEAM_ID, userTeam, byId, SCHEDULE_LV, LEADERS, NEWS, DRAFT_CLASS, FREE_AGENTS, POS_GROUP, capForPrestige }`.

## For Claude Code: extending this

The prototype is **presentation-layer only**. Drop-in points for real systems:

1. **Replace `data/league.js`** with a real data layer (Stage 2 in the design doc). Keep `window.AFL` shape OR swap screens to consume a hook (e.g. `useLeague()`).
2. **Game sim**: `GameLive` consumes a `drives[]` array; today driven by `buildDriveScript()` in `screens-game.jsx`. Replace with output from the simulation engine (Stage 3). Each drive needs `{ team, q, plays, yards, time, start, concepts, result, scoreUs, scoreThem, keyPlay? }`.
3. **Strategy → Sim**: `ScreenStrategy` holds local React state (`off`, `def`, `tendencies`). Lift to a store and pipe into the sim's drive-resolution function.
4. **Trades / FA / Draft** are static today — wire to backend actions, the UI is already shaped for it (selection lists, builder, slot scale).
5. **Awards / HoF** show data structures; in production these are computed at end-of-season per the rules.

## Open questions / not yet specified

These aren't in the design doc and were stubbed with reasonable defaults. Confirm before implementation:

- **Player detail page** — drilldown per player (career stats, contract history, attribute radar). Hooked from Roster row click; modal/page not yet designed.
- **Position change UI** — the rule exists; the workflow (select player → pick new pos → preview new OVR) is not designed.
- **Negotiation modal** — Free Agency and Extensions both need a salary/years/guaranteed/bonus form with counter-offer cycle.
- **Game plan modal** — pre-game tweaks of tendencies for one game without changing season strategy. Spec doesn't require it; useful for "Game Plan" button.
- **CPU trade proposals inbox** — spec calls for CPU-initiated trades; needs a notifications surface.
- **Settings / autosave UI** — autosave is mentioned; manual save/load slots aren't specified.
- **Onboarding** — new-game flow (pick team, league name confirm, season year) is undefined.
- **Mobile / smaller breakpoints** — design is desktop-only (1440+) per requirements.

## Tech notes

- Pure React 18 via UMD + `<script type="text/babel">`. No bundler.
- Each `.jsx` file exports its components onto `window` so other Babel scripts can pick them up (script-tag scope isolation workaround).
- All screens are functional components; state is component-local.
- The live game-sim ticker runs on a `setTimeout` chain driven by `drives.length` — easy to swap for real async sim events.
