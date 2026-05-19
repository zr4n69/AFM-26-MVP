# AFM-26 UI Spec

Companion to `AFM-26 Prototype.html`. Captures the visual & interaction contract of every screen so engineering can implement against it without re-litigating layout decisions.

## Global

### App shell
- **Sidebar (232 px, sticky):** AFL brand mark, user team card (color block + record + division rank), 4 nav sections (Team / Game Week / Front Office / League), autosave indicator + version in footer.
- **Topbar (sticky, 56 px):** crumb (small caps), screen title (Archivo 700 / 20px), week pill (`Wk 9 · vs SD Surge · Sun 1:00`), action buttons right-aligned.
- **Page container:** 28px horizontal padding, max-width 1480.

### Tokens
Defined in `styles/app.css`. Cool-gray neutrals + AFL deep green (`#0B6E4F`). Numeric typography always tabular (`font-variant-numeric: tabular-nums`) and JetBrains Mono. OVR pills: elite/gold/silver/bronze tiered by rating.

### Cross-screen components
- **`<OvrPill ovr={N} />`** — colored numeric pill.
- **`<Stars n={1..5} />`** — potential indicator.
- **`<ColorBlock team />`** — diagonal-split team identity swatch (replaces logo).
- **`<TeamBlock team />`** — color block + city/name.
- **`<Avatar player team />`** — initials in team colors.
- **`<InjBadge status />`** — Healthy / Q / D / O.
- **`<FatigueBar value />`** — green→yellow→red gradient.
- **`<FieldDiagram losYard possessionLeft />`** — abstract football field with ball marker.
- **Stat tile** — label / large value / delta line. Used in 4-up rows.
- **Card** — bordered surface with `card-h` (uppercase Archivo title) + `card-b` (content). `tight` modifier removes inner padding for tables.
- **Tabs** — segmented underline; lighter tab pattern for filter bars.

---

## 1. Dashboard
**Purpose:** at-a-glance state of the franchise this week.

- 4 stat tiles: Record / Team Rating / Cap Space / Prestige.
- Next-Game card: gradient banner (us → opp colors), spread, total, edge call-out, "Play Week 9" CTA.
- Recent Results table (last 3 weeks).
- Team Leaders table (top 5 by OVR with status + season line).
- Right rail: West Conference standings (user highlighted), Injury Report, Around the League news ticker.

---

## 2. Roster
**Purpose:** manage all 55 players.

- 4-up: Roster Size / Avg Age / Top OVR / Cap Hit.
- Filter tabs: All / Offense / Defense / ST / Injured.
- Sort chips: OVR / POS / AGE / CAP.
- Table cols: Player+role / Pos / Age / OVR / Pot / Status / Fatigue / Traits / Yrs / Cap.
- Row click → player detail (not yet designed — see open questions).

---

## 3. Depth Chart
**Purpose:** visualize starters by position.

- 3 sections: Offense / Defense / Special. Each is a card with one row per position.
- Columns: Pos / Starter / Backup / 3rd / 4th / 5th.
- Each cell shows OVR pill + name + age + potential stars + injury badge.
- Injured players reduced to 0.5 opacity.
- Header note: "Drag to reorder" (interaction stubbed).

---

## 4. Strategy
**Purpose:** set system + tendencies.

- 5 offensive system cards (West Coast / Power Run / Spread RPO / Vertical Air Raid / Balanced Pro). Selected card has dark border + inset shadow.
- 5 defensive system cards (4-3 Zone / 3-4 Pressure / Nickel Match / Man Blitz / Bend But Do Not Break).
- Tendencies card: 6 sliders 0–100 (Tempo / Aggression / Run-Pass / Deep Pass / Blitz / Coverage Risk) with left/right anchor labels.
- Concept Library card: chip cloud of weighted offensive + defensive concepts (% next to each).
- Scheme Fit card: 5 fit lines with green/amber dots.

---

## 5. Contracts & Cap
**Purpose:** manage payroll under prestige-based cap.

- 4-up: Salary Cap / Active Cap Hit (% used) / Cap Space (red if negative) / Dead Money.
- Top Cap Hits table (10 players, with bonus expectation column).
- Right rail: Cap Allocation by skill group with horizontal bars; Extension-Eligible list (≤2 yrs left, OVR ≥75).

---

## 6. Training
**Purpose:** focus-train up to 5 players in a window.

- 3-up: Current Window / Camp Schedule / Intensity Effects.
- Focus table: checkbox + player + Pos + Age + OVR + Pot + Headroom (ceiling − ovr) + Intensity chip group (Light/Standard/Aggressive) + Inj Risk + Expected Gain.
- Footer card: non-focused camp gain rules (4–5★ → +3, 1–3★ → +2) + age-based decline reminder.

---

## 7. Game Week
**Purpose:** play the week, drive-by-drive.

Three modes (single screen, internal state machine):

### 7a. Preview
- Big matchup banner (gradient stitching team primary colors).
- Two cards: Your Strategy (current systems + tendencies, link to Strategy) + Inactives.
- Matchup Edges table (5 rows: side / matchup / edge winner / note).
- Primary CTA: "Start Sim →".

### 7b. Live (drive ticker)
- Dark scoreboard: team color blocks, scores (64px), Q + clock + dots, possession indicator.
- FieldDiagram showing current LOS + possession arrow.
- Two cards side-by-side:
  - **Drive Log** (newest first, animated fade-in): #, team, Q, plays, yds, time, result chip, score.
  - **Key Plays** ticker with LIVE indicator (pulse). Tag (TD/FG/TURNOVER), Q+clock, descriptive line.
- Topbar actions: Pause / Skip to End.

### 7c. Recap
- Final scoreboard + chip with margin.
- Scoring by quarter row.
- Two-column: Team Stats (yards / 1st downs / 3rd down% / RZ% / sacks / TOs / penalties / TOP) + Top Performers (split by team, position-led).
- Drive Chart full-width (every drive with concept emphasis).
- Game Injuries card.
- Primary CTA: "Continue to Week 10 →".

---

## 8. Standings
- 4 conference cards (West / North / East / South); each shows W/L/PCT/PF/PA/DIFF/Streak with user team highlighted.
- Playoff Bracket Projection card: 3 columns (Wild Card / Semis / Championship), seeds 1-2 in bye section, AFL Championship card with accent border + "Champion: TBD" capstone.
- Your Schedule card: all 10 weeks, upcoming game highlighted.

---

## 9. League Leaders
6 stat-category cards (Pass Yds / Rush Yds / Rec Yds / Sacks / INTs / Tackles). Each lists top 5 with rank, team color block, name + position + team, value, and proportional bar.

---

## 10. Scouting
- 4-up: Scouting Pts / Pts Allocated / Class Size / Your Picks.
- Allocate Scouting card (left): 9 position groups, each with team-need note + 0–100 slider (snap to None/Light/Standard/Heavy/Saturated tick labels).
- Draft Class — Top 10 (right): rk, name, pos, age, college, proj slot, OVR range, potential (hidden if not scouted), Scouted/Hidden chip.
- "What scouting reveals" card: 2-column visible vs revealed list (per spec).

---

## 11. Draft
- 4-up: Round / Your Pick / Elite Talents (3–16 per class) / Rookie Pool.
- Round 1 Order table (16 picks, worst record first, slot $ value, projected need).
- Right rail: Rookie Contract Scale (#1: $25M → R5 #16: $1.5M) + Draft Logic explainer.

---

## 12. Free Agency
- 4-up: Cap Space / Roster Spots / Free Agents / Position Needs.
- Filter tabs: All / Offense / Defense / ST / Watchlist.
- FA pool table: name, pos, age, OVR pill, last team, asking $/yr, years wanted, scouting note, "Offer →" button.
- Two explainer cards: How Negotiations Work + In-Season vs Offseason.

---

## 13. Trade Center
- Window-status banner: red strip showing "trades closed" status during weeks 5–10 / playoffs (per spec).
- Build a Trade card: two columns (You Give / You Get), dashed-border slot lists with TradeChip rows. Cap impact per side.
- Trade Value vs CPU Likelihood vs Action 3-up summary.
- Right rail: Trade Window timeline, CPU Urgency Triggers list, Recent League Trades feed.

---

## 14. Awards
- 5 Major Awards cards (MVP / OPOY / DPOY / ORoY / DRoY) with winner avatar, line, summary stat.
- First Team All-Pro Offense + Defense (10 each, by position).
- "How Awards Are Decided" card: 4-column factor breakdown.

---

## 15. Hall of Fame
- 4-up: Class size (≥4 votes) / Total Votes (32 = 2 × 16) / Threshold / Your Votes.
- 2026 Ballot table: retiring players only, awards summary, championships, vote count, Inducted/Falls Short outcome chip.
- Two explainer cards: Voting Considerations + Induction Effects.

---

## Interaction states implemented vs stubbed

**Live & functional:**
- Sidebar nav (all 15 screens reachable).
- Roster filters + sort chips.
- Strategy system selection + sliders.
- Scouting allocation sliders.
- Training focus selection + intensity toggles.
- Game Week full state machine (preview → live → recap → replay).

**Stubbed (visible UI, no behavior):**
- Drag-to-reorder depth chart.
- Trade builder (display only — window closed, demo trade preset).
- Free agency "Offer" button.
- Extension button.
- "Cast My Votes" on HoF.
- All Topbar action buttons that don't navigate.

These are intentional — the spec is for visual/structural decisions; engineering wires up real behavior in Stage 4+.

---

## Notes on adherence to game design rules

- **Cap formula** (`150 + (prestige − 1) × 12.5M`, clamped 150–200) is implemented in `data/league.js` (`capForPrestige`).
- **Roster size** 55, **draft** 5 rounds × 16 teams = 80 picks, class size 160, undrafted → FA pool — reflected in counts shown.
- **Scouting reveals** match the spec's visible/hidden split.
- **Trade window** reflected as Wks 1–4 only.
- **Awards / HoF** use the spec's exact list, eligibility, and vote threshold (4).
- **Conferences** named West/North/East/South (no NFL-style branding).

## Unresolved by spec / proposed for Stage 1.5

Listed in `README.md` Open Questions. Most important to resolve before Stage 4 build:
1. Player detail page shape.
2. Negotiation modal flow (offers + counters).
3. Position-change UI workflow.
4. Game-plan vs season-strategy split.
