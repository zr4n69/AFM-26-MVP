# Handoff: AFM-26 — American Football League GM Sim (UI)

A complete UI prototype for **AFM-26**, a single-player NFL-style football GM/franchise simulation game. This bundle contains the design references and is the source of truth for the visual layer of Stage 1 (UI/UX) of the project.

---

## About the design files

The files in this bundle are **design references created in HTML/React (Babel-transpiled in-browser)** — high-fidelity prototypes showing intended look, layout, and interaction patterns. They are **not production code to ship as-is**.

Your task as the implementing developer is to **recreate these designs in the target codebase's environment** (the game's actual frontend), using its established framework, state management, design system, and component library. If no frontend environment exists yet, choose the most appropriate framework for a desktop-first single-player simulation game and implement there.

The HTML prototype runs entirely client-side: data is generated in-memory by `data/league.js` (seeded PRNG, deterministic across reloads). In the real game these values come from the simulation engine; the UI shape stays the same.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, component anatomy, and interactions are decided. Recreate pixel-perfectly using the codebase's libraries and patterns. Where the prototype uses placeholders (e.g., generated player initials in avatars), replace with the real asset of the same shape and size.

---

## What's in this bundle

```
claude-code-handoff/
├── AFM-26 Prototype.html        # Entry point; open in any modern browser
├── README.md                    # This file
├── components/
│   └── chrome.jsx               # Sidebar, Topbar, OvrPill, Stars, ColorBlock, Avatar, FatigueBar, InjBadge, FieldDiagram
├── screens/
│   ├── screens-team.jsx         # Dashboard, Roster, Depth Chart, Strategy, Contracts & Cap
│   ├── screens-game.jsx         # Game Week (preview→live→recap), Standings, League Leaders
│   └── screens-front-office.jsx # Scouting, Draft, Free Agency, Trades, Training, Awards, Hall of Fame
├── data/
│   └── league.js                # Fictional league data (16 teams, ~880 players, schedule, draft class, FA pool, news, leaders)
├── styles/
│   └── app.css                  # Design tokens + component CSS
├── logos/                       # 16 inline-SVG team logos (200×200 viewBox, badge-style)
│   ├── SF.svg   LA.svg   SD.svg   LV.svg
│   ├── WYO.svg  SLC.svg  NM.svg   PHX.svg
│   ├── NYC.svg  PA.svg   PHI.svg  AUS.svg
│   └── TB.svg   MIA.svg  HOU.svg  JAX.svg
└── docs/
    ├── UI-SPEC.md                       # Per-screen layout & interaction spec (annotated)
    └── stage-1-game-design-rules.md     # Original game design rules (source of truth for product behavior)
```

To open the prototype: open `AFM-26 Prototype.html` directly in a modern browser. No build step.

---

## Game scope (from `docs/stage-1-game-design-rules.md`)

- **Genre:** single-player, turn-based GM/franchise sim (Football Manager / Madden Franchise mode in feel).
- **Season:** 10-game regular season, 4-conference 16-team league (West / North / East / South), 4 teams per conference.
- **Teams:** 16. See "Team Identity" below.
- **Roster:** 55 players per team.
- **Salary cap:** `150 + (prestige − 1) × 12.5M`, clamped 150–200M.
- **Draft:** 5 rounds × 16 teams = 80 picks per year. Class of 160 prospects; undrafted go to FA pool.
- **Trade window:** weeks 1–4 only (closed weeks 5–10 and through playoffs).
- **Awards:** MVP, OPOY, DPOY, Offensive Rookie of the Year, Defensive Rookie of the Year, plus First-Team All-Pro Offense (10) + Defense (10).
- **Hall of Fame:** retiring-only ballot; 32 voters (2 × 16); induction threshold = 4 votes.
- **Stat tracking:** offensive (pass yds/rush yds/rec yds), defensive (sacks, INTs, tackles).

The full rules doc lives at `docs/stage-1-game-design-rules.md` — read it before implementing systems behavior.

---

## Screens (15 total)

See `docs/UI-SPEC.md` for full per-screen anatomy. Quick map:

| Nav id      | Section       | File                          | Purpose |
|-------------|---------------|-------------------------------|---------|
| dashboard   | Team          | screens-team.jsx              | Weekly state at-a-glance |
| roster      | Team          | screens-team.jsx              | Manage 55-player roster |
| depth       | Team          | screens-team.jsx              | Starter→5th by position |
| strategy    | Team          | screens-team.jsx              | Off/Def systems + 6 tendency sliders |
| contracts   | Team          | screens-team.jsx              | Cap, payroll, top hits, extensions |
| training    | Front Office  | screens-front-office.jsx      | Camp + 3 in-season windows, 5 focus slots, 3 intensities |
| gameweek    | Game Week     | screens-game.jsx              | Preview → live drive ticker → recap |
| standings   | Game Week     | screens-game.jsx              | 4 conferences + playoff bracket projection |
| leaders     | Game Week     | screens-game.jsx              | League stat leaders (incl. defensive) |
| scouting    | Front Office  | screens-front-office.jsx      | Per-position-group point allocation |
| draft       | Front Office  | screens-front-office.jsx      | 5 rounds × 16 teams, rookie scale |
| fa          | Front Office  | screens-front-office.jsx      | Free agent pool, asking price |
| trades      | Front Office  | screens-front-office.jsx      | Trade builder, value calculator, window status |
| awards      | League        | screens-front-office.jsx      | Major awards + 1st team All-Pro |
| hof         | League        | screens-front-office.jsx      | Retiring ballot, 4-vote threshold |

---

## Layout & app shell

- **Viewport:** desktop-only, 1440px design width. No mobile breakpoint (the game is desktop-first).
- **Sidebar:** sticky-left, 232px wide. Contains AFL brand mark (32px logo + "AFM-26" wordmark + season/week subtitle), user team card, 4 nav sections (Team / Game Week / Front Office / League), autosave indicator + version footer.
- **Main column:** Topbar (sticky, 56px) + Page (28px horizontal padding, max-width 1480).
- **Topbar:** breadcrumb (small caps) → screen title (Archivo 700 / 20px) → week pill → action buttons right-aligned.

---

## Design tokens

All defined in `styles/app.css`. Light mode only.

### Color

| Token | Hex | Usage |
|---|---|---|
| `--bg`            | `#F6F7F9` | Page background |
| `--surface`       | `#FFFFFF` | Card surface |
| `--surface-2`     | `#FAFBFC` | Subtle elevated surface (table headers, etc.) |
| `--ink-1`         | `#0E1116` | Primary text |
| `--ink-2`         | `#3B414A` | Secondary text |
| `--ink-3`         | `#6B7280` | Muted text / labels |
| `--ink-4`         | `#9AA1AB` | Subtle text |
| `--line`          | `#E3E6EA` | Card / table borders |
| `--line-soft`     | `#EEF0F3` | Inner dividers |
| `--accent`        | `#0B6E4F` | AFL deep green; primary brand |
| `--accent-ink`    | `#063B2B` | Accent text on light bg |
| `--pos`           | `#1F8A5B` | Wins, positive deltas |
| `--neg`           | `#C0392B` | Losses, negative deltas, red flags |
| `--warn`          | `#B7791F` | Cautions (questionable injury, cap warnings) |
| `--field`         | `#5A8C5A` | Football field green (FieldDiagram) |

### OVR pill tiers
| OVR | Tier | Background | Ink |
|---|---|---|---|
| ≥ 90 | elite  | `#1F8A5B` | white |
| ≥ 85 | gold   | `#D4A53A` | `#3A2A0A` |
| ≥ 78 | silver | `#9AA1AB` | white |
| ≥ 70 | bronze | `#A26F3A` | white |
| < 70 |  —     | `#E3E6EA` | `#3B414A` |

### Typography

| Family | Source | Weights | Use |
|---|---|---|---|
| **Inter**         | Google Fonts | 400/500/600/700 | UI body, tables, labels |
| **Archivo**       | Google Fonts | 500/600/700/800 | Display: page titles, card headers, scoreboard, h1–h2 |
| **JetBrains Mono**| Google Fonts | 400/500/700     | All numeric values (OVR, cap, scores, %) — use `.mono` class |

Tabular figures everywhere stats appear: `font-variant-numeric: tabular-nums`.

### Sizing & rhythm

- Card padding: **16px** (header), **14–16px** (body); use `tight` modifier to remove inner table padding.
- Border radius: **4 / 6 / 10 px** (small chips / cards / hero scoreboard).
- Shadow (cards): `0 1px 2px rgba(14,17,22,0.04)`; only deepen for modals.
- Spacing scale: 2 / 4 / 6 / 8 / 12 / 14 / 18 / 24 / 28 / 36 / 48.
- Icon sizes: **16/20/28/32/40/56** px (color-block badges scale 28→56).

### Component patterns

- **Card:** white surface + 1px line border + 6px radius. Sub-parts: `.card-h` (uppercase Archivo title), `.card-b` (content). Use `<div className="card">`.
- **Stat tile:** label (uppercase / muted / 11px) + large value (Archivo 700 / 28px) + delta line (12px, color = pos/neg/muted).
- **Tabs:** segmented underline (filter rails); active = ink-1 with `border-bottom: 2px var(--accent)`.
- **Tables:** zebra rows on hover, header row in `--surface-2`, all numeric columns right-aligned + `.mono`.
- **Color block:** team identity badge — primary fill, rounded-square, `inset 0 0 0 1px rgba(0,0,0,0.08)` outline, with team logo SVG centered at 82% scale.

---

## Team identity

Per the design rules, **no NFL-style logos or branding** — these are fictional teams. Each has its own logo (in `logos/`) and a primary/secondary/tertiary palette.

| ID | City | Name | Conf | Primary | Secondary | Tertiary | Prestige |
|---|---|---|---|---|---|---|---|
| **SF**  | San Francisco | Miners      | West  | `#A8322B` | `#5A5754` | `#7A4B2A` | 4.5  |
| **LA**  | Los Angeles   | Stars       | West  | `#3E1F6B` | `#0B0B12` | `#7DC8E8` | 4.75 |
| **SD**  | San Diego     | Suns        | West  | `#E8851A` | `#F2C94C` | `#C0392B` | 3.5  |
| **LV**  | Las Vegas     | Gamblers    | West  | `#0E0E10` | `#F2F2F2` | `#D4AF37` | 4.25 |
| **WYO** | Wyoming       | Grizzlies   | North | `#5A3A22` | `#1F3B2D` | `#F4EFE6` | 2.5  |
| **SLC** | Salt Lake     | Preachers   | North | `#F4EFE6` | `#C9A227` | `#F2C94C` | 3.25 |
| **NM**  | New Mexico    | Oilers      | North | `#0E0E10` | `#E8C547` | `#C0392B` | 3.0  |
| **PHX** | Phoenix       | Firebirds   | North | `#B11226` | `#E8B042` | `#1A1A1A` | 3.5  |
| **NYC** | New York      | Rockets     | East  | `#E8631A` | `#6B6F76` | `#F4F4F4` | 5.0  |
| **PA**  | Pennsylvania  | Patriots    | East  | `#13294B` | `#A8322B` | `#F4F4F4` | 4.5  |
| **PHI** | Philadelphia  | Bells       | East  | `#7A4B2A` | `#F4EAD2` | `#8B2E1F` | 3.5  |
| **AUS** | Austin        | Cowboys     | East  | `#D9C9A8` | `#1B3A6B` | `#A8A8AC` | 3.0  |
| **TB**  | Tampa         | Pirates     | South | `#A8322B` | `#E8851A` | `#F4F4F4` | 3.75 |
| **MIA** | Miami         | Sharks      | South | `#0F4C81` | `#3FB8AF` | `#F4F4F4` | 4.0  |
| **HOU** | Houston       | Astronauts  | South | `#0B1F3A` | `#A8A8AC` | `#F4F4F4` | 3.0  |
| **JAX** | Jacksonville  | Gators      | South | `#2F5233` | `#F4F4F4` | `#E8C547` | 2.75 |

**Default user team:** `LV` (Las Vegas Gamblers).

Logos are inline SVGs at 200×200 viewBox, designed as badge-friendly icons. They render inside a primary-color rounded square via the `<ColorBlock>` component.

---

## Data model

Defined in `data/league.js`. The shape your real data layer must produce:

```ts
type Team = {
  id: string;            // 'LV', 'SF', etc.
  city: string;
  name: string;
  abbr: string;
  conf: 'West' | 'North' | 'East' | 'South';
  primary: string;       // hex
  secondary: string;
  tertiary: string;
  logo: string;          // path to SVG
  prestige: number;      // 1.0 – 5.0
  // computed:
  w: number; l: number; tie: number;
  pf: number; pa: number; pct: number; diff: number;
  cap: number;           // capForPrestige(prestige)
  payroll: number;
  capSpace: number;
  ovr: number;           // team rating
  offRating: number; defRating: number;
  roster: Player[];
};

type Player = {
  id: string;
  name: string; first: string; last: string;
  teamId: string;
  pos: string;           // 'QB','RB','WR','TE','OT','OG','C','EDGE','DT','LB','CB','S','K','P','LS'
  group: 'OFF' | 'DEF' | 'ST';
  age: number;           // 21–35
  ovr: number;           // 50–99
  potential: 1|2|3|4|5;  // star tier
  ceiling: 70|76|82|91|99;
  attrs: Record<string, number>; // per-position attribute set
  traits: string[];      // 0–2 from positive/negative pools
  fatigue: number;       // 0–100
  injStatus: 'Healthy'|'Questionable'|'Doubtful'|'Out';
  years: number;         // contract years remaining
  salary: number;        // $M / yr
  cap: number;           // current-year cap hit
  guaranteed: number;
  isStarter: boolean;
  depth: number;         // 0 = starter, 1 = backup, …
};
```

The prototype attaches everything to `window.AFL`:
```js
window.AFL = { TEAMS, USER_TEAM_ID, userTeam, byId, SCHEDULE_LV, LEADERS, NEWS, DRAFT_CLASS, FREE_AGENTS, POS_GROUP, capForPrestige }
```
In the real app, replace with a proper store (Zustand / Redux / a server cache hook).

### Salary scaling

`data/league.js → salaryFor()` produces realistic $M/yr:
- OVR ≥ 92: `$18–28M` (×1.25 if QB)
- OVR ≥ 85: `$9–16M`
- OVR ≥ 78: `$4.5–9M`
- OVR ≥ 72: `$2–4.5M`
- OVR ≥ 65: `$0.9–2M`
- else: `$0.4–0.9M`

QB +25%, EDGE/CB +8%, K/P/LS −55%. Age 32+: −15%. Age ≤23: −20%.
55-man payroll lands ~$160–185M for a typical team — under the prestige-derived cap.

This is **placeholder logic for visualization**. The real cap/contract simulation should follow the rules doc.

---

## Interactions implemented vs. stubbed

**Live in the prototype:**
- Sidebar nav routes between all 15 screens.
- Roster filters (All/Off/Def/ST/Inj) and sort chips (OVR/POS/AGE/CAP).
- Strategy: system selection (10 cards) and tendency sliders (6).
- Scouting: per-position-group allocation sliders.
- Training: focus selection + 3-intensity toggle per row.
- Game Week: full state machine (preview → live ticker animating drives via `setTimeout` chain → recap → "play next week" reset).

**Stubbed (visible UI, no behavior — wire these up):**
- Drag-to-reorder depth chart.
- Trade builder buttons (window-closed banner is intentional).
- "Offer →" on Free Agency.
- "Extend" on Contracts.
- "Cast My Votes" on HoF.
- Topbar action buttons that don't navigate.

---

## Components reference

All in `components/chrome.jsx`. Names and signatures:

```jsx
<Sidebar active onNav />               // 232px sticky left, brand + user-team card + nav groups + footer
<Topbar crumb title pill actions />    // sticky 56px
<OvrPill ovr={number} />               // tiered colored chip
<Stars n={1..5} />                     // potential indicator
<ColorBlock team size={28} />          // team primary fill + logo SVG (82% inset)
<TeamBlock team showName compact />    // ColorBlock + city/name
<Avatar player team size={36} />       // initials in team colors
<InjBadge status />                    // Healthy / Q / D / O chip
<FatigueBar value={0..100} />          // green→yellow→red gradient bar
<FieldDiagram losYard={0..100} possessionLeft />  // abstract football field
```

---

## Animations / motion

Minimal in this prototype. Where present:

- **Live drive ticker** (Game Week → live state): each drive fades in (`opacity 0 → 1, translateY 4px → 0`, 240ms ease-out) and shifts older drives down.
- **LIVE pulse:** red dot, 1.4s ease-in-out infinite at the Key Plays card header.
- **Card hover:** background lightens to `--surface-2` over 120ms.
- **Tab/segmented control active:** instant accent underline (no slide animation in this prototype; spec is open to slide).

For the real game, add: scoreboard score increments (count-up), drive marker move on FieldDiagram (not jump), screen transitions (don't blink between Game Week states — cross-fade 200ms).

---

## What's NOT covered (open questions for product/design)

These are flagged but not specified by the design rules and were stubbed with reasonable defaults. Confirm before implementation:

1. **Player detail page** — drilldown per player (career stats, contract history, attribute radar, performance graphs). Hooked from any roster-row click; the modal/page itself is not designed.
2. **Position change UI** — the rule exists in the design doc; the workflow (select player → pick new position → preview new OVR) is not designed.
3. **Negotiation modal** — both Free Agency and Contract Extension need a salary/years/guaranteed/bonus form with counter-offer cycle. Today both are buttons that go nowhere.
4. **Game plan modal** — pre-game tweaks of tendencies for one game without changing season strategy. Spec doesn't require it; the "Game Plan" button is currently inert.
5. **CPU trade proposals inbox** — spec calls for CPU-initiated trades; needs a notifications surface.
6. **Settings / autosave UI** — autosave is mentioned but manual save/load slots aren't specified.
7. **Onboarding** — new-game flow (pick team, league name confirm, season year) is undefined. Currently the prototype boots straight into Week 9 of the user team's dashboard.
8. **Mobile / smaller breakpoints** — explicitly out of scope; design is desktop-first per requirements.
9. **Localization** — all copy is English-only.
10. **Accessibility** — color contrast meets AA in light mode but keyboard nav, focus rings, ARIA roles for the table-heavy screens, and screen-reader labels for color-only signals (OVR pills, injury chips) need a pass.

---

## How to use this bundle in Claude Code

1. **Open `AFM-26 Prototype.html`** in a browser to see exactly what's being built. Click through every screen — it's the visual contract.
2. **Read `docs/stage-1-game-design-rules.md`** for product behavior (cap math, draft rules, awards, etc.).
3. **Read `docs/UI-SPEC.md`** for per-screen anatomy.
4. **Use `styles/app.css` as the source of truth for tokens** — translate to your codebase's token system.
5. **Lift values from the source files** — exact hex, exact pixel padding, exact OVR pill thresholds. Don't approximate.
6. **Replace `data/league.js`** with your real data layer; keep the `Team`/`Player` shape (or use it as a type-translation target).
7. **For the simulation engine integration:**
   - `ScreenStrategy` produces `{ off, def, tendencies, conceptWeights }` — feed to drive resolver.
   - `ScreenGameWeek` consumes a `drives[]` array with shape: `{ team, q, plays, yards, time, start, concepts, result, scoreUs, scoreThem, keyPlay? }`.
   - `LEADERS`, `NEWS`, `DRAFT_CLASS`, `FREE_AGENTS` are shaped exactly as the UI consumes them — your engine should produce the same.

---

## File-by-file inventory

| File | Lines | Purpose |
|---|---|---|
| `AFM-26 Prototype.html` | ~75 | App entry, loads React + Babel, mounts router |
| `styles/app.css` | ~600 | Tokens + component CSS |
| `data/league.js` | ~370 | Generated league data (seeded PRNG) |
| `components/chrome.jsx` | ~210 | Shared chrome + helpers |
| `screens/screens-team.jsx` | ~595 | 5 team screens |
| `screens/screens-game.jsx` | ~700 | 3 game screens (with live ticker) |
| `screens/screens-front-office.jsx` | ~720 | 7 front-office screens |
| `logos/*.svg` × 16 | ~1.0–1.9k each | 16 hand-drawn team logos |

Total: ~3,300 LOC of design source — reflects the surface area you're recreating, not the simulation engine itself.
