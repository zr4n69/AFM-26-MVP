# Stage 2: Data Layer

## Scope

Stage 2 creates the first executable data foundation for the American Football GM Simulation MVP. The goal is not to simulate games yet; it is to make the league, teams, players, strategy, playbooks, contracts, schedules, and saves concrete enough for the Stage 3 simulation engine to consume.

The implementation is dependency-free Node.js so the project can run immediately with the built-in test runner.

## Implemented Modules

- `src/data/constants.js`: league rules, phases, roster limits, strategy systems, tendency ranges, contract bonus types, award types, training/trade constants, position-change groups, and named offensive/defensive concepts.
- `src/data/random.js`: deterministic seedable random helpers used by data factories.
- `src/data/factories.js`: `createLeague(seed)`, team generation, 55-player rosters, cap-tuned contracts, standings, 10-week schedule, strategy profiles, draft classes, draft picks, scouting state, trade market state, training state, playoff state, awards, and Hall of Fame state.
- `src/data/actions.js`: public data mutations for strategy, depth charts, sign/release, extensions, scouting, draft picks, trades, training, position changes, playoff bracket creation, awards, Hall of Fame voting, season phase changes, and autosave event recording.
- `src/data/save-store.js`: JSON save snapshot creation plus file-based `saveGame` and `loadSave`.
- `src/index.js`: public exports for later simulation and UI stages.

## Core Data Shapes

`League` stores:

- `teams`
- `schedule`
- `currentWeek`
- `currentSeason`
- `phase`
- `rules`
- `standings`
- `draftClass`
- `draft`
- `scouting`
- `trades`
- `tradeMarket`
- `training`
- `playoff`
- `awards`
- `hallOfFame`
- `seasonHistory`
- `freeAgents`
- `prospectFreeAgents`
- `games`
- `autosaveLog`

`Team` stores:

- identity and division
- prestige and salary cap
- roster
- depth chart
- strategy
- contract summary
- standings summary
- draft picks
- roster needs
- CPU management plan
- morale notes
- storylines

`Player` stores:

- identity, position, position group, age, rookie status
- ratings, overall, potential stars
- contract
- health, fatigue, traits, awards
- development and position-change state
- injury history
- offensive and defensive stat buckets

`Strategy` stores:

- offensive system
- defensive system
- tendencies for tempo, aggression, run/pass lean, deep passing, blitz rate, and coverage risk

`PlaybookConcept` stores:

- id and display name
- category
- rating dependencies
- risk/reward profile
- preferred systems

## Public Actions

- `createLeague(seed)`
- `saveGame(league, filePath, reason)`
- `loadSave(filePath)`
- `setDepthChart(league, teamId, position, playerIds)`
- `updateStrategy(league, teamId, patch)`
- `signPlayer(league, teamId, player)`
- `releasePlayer(league, teamId, playerId)`
- `extendContract(league, teamId, playerId, terms)`
- `addScoutingCurrency(league, teamId, amount, reason)`
- `scoutProspectGroup(league, teamId, group, spend)`
- `draftProspect(league, pickId, prospectId)`
- `processUndraftedFreeAgents(league)`
- `proposeTrade(league, fromTeamId, toTeamId, offer)`
- `completeTrade(league, tradeId)`
- `changePlayerPosition(league, teamId, playerId, newPosition)`
- `scheduleTrainingSession(league, teamId, playerPlans, options)`
- `generatePlayoffBracket(league, seedTeamIds)`
- `recordAwardWinner(league, awardType, playerId, teamId, metadata)`
- `castHallOfFameVotes(league, teamId, playerIds)`
- `advanceSeasonPhase(league, phase)`

Stage 3 will add simulation behavior:

- `simulateGame`
- `simulateWeek`
- drive-level concept selection
- drive outcome resolution
- event-based stat attribution
- CPU lineup/contract/trade/scouting decision logic

## Autosave Events

Autosave event recording now exists for:

- roster changes
- contract changes
- lineup changes
- strategy changes
- scouting changes
- draft changes
- trade changes
- training changes
- position changes
- awards
- Hall of Fame voting
- game/week/playoff/season events as reserved event types

The current data layer records autosave events in `league.autosaveLog`. File persistence is available through `saveGame`, while later UI work can decide whether autosaves are local files, browser storage, or server-backed saves.

## Acceptance Criteria

Stage 2 is complete when:

- League generation creates 16 fictional teams.
- Every generated team has a 55-player roster.
- Players include ratings, contracts, health, fatigue, offensive stats, and defensive stats.
- Strategy stores offensive system, defensive system, and all MVP tendencies.
- Named offensive and defensive football concepts are available as data.
- The regular season schedule stores 10 weeks of game shells.
- Draft class data exists for 160 fictional prospects.
- Draft pick ownership exists for 5 rounds and 80 total drafted players.
- Rookie contract scale exists from 25 million for pick 1 to 1.5 million for pick 80.
- Undrafted prospect state exists for post-draft free agency.
- Group scouting currency and reveal state exist for human and CPU teams.
- Trade market state and trade proposal/completion actions exist.
- Position-change and training state/actions exist.
- Playoff bracket state and 6-team bracket generation exist.
- Season awards and All-Pro state/actions exist.
- Hall of Fame eligibility, ballots, vote totals, and induction state/actions exist.
- CPU roster/management intent state exists for later AI logic.
- Contract summaries and salary cap data are stored per team.
- Generated rosters are cap-tuned so normal teams fit their prestige-based cap.
- Public roster, contract, lineup, strategy, save, and load actions exist.
- Autosave event hooks exist for the MVP mutation categories.
- Unit tests verify the core generated shapes and mutation behavior.

## Explicit Stage 3 Boundaries

The data layer now stores the structures needed by Stage 1, but it does not yet perform football simulation or CPU intelligence. These remain Stage 3 responsibilities:

- Drive-level game simulation.
- Concept selection by field position, score, time, fatigue, and matchup.
- Drive outcome math.
- Defensive stat attribution during drives.
- CPU trade evaluation and roster repair decision logic.
- Award scoring formulas.
- Hall of Fame candidate scoring formulas.
