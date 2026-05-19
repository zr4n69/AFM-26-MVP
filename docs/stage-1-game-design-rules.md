# Stage 1: Game Design Rules

## Product Direction

The game is a web-based GM season simulation for American football. The player runs a fictional franchise in a compressed league, manages roster and contracts, chooses team identity, sets weekly strategy, simulates games, and tries to win the championship.

The MVP should feel semi-realistic and semi-arcade:

- Realistic enough that ratings, roster construction, systems, fatigue, contracts, and injuries matter.
- Arcade enough that seasons move quickly, outcomes are readable, and dramatic storylines can emerge without requiring expert football knowledge.
- Strategic enough that the player can see why a team is winning or losing.
- Fast enough that a season can be played in a short session.

## Core Loop

1. Review team dashboard, record, standings, injuries, morale/story notes, and cap/contract pressure.
2. Inspect roster, contracts, ratings, fatigue, and positional strengths.
3. Set depth chart and weekly strategy.
4. Choose offensive and defensive systems.
5. Tune tendencies such as tempo, aggression, run/pass lean, deep passing, blitz rate, and coverage risk.
6. Simulate one game or one full week.
7. Earn weekly scouting currency during the regular season.
8. Review results through score, drive summaries, box score, key plays, injuries, and player stat leaders.
9. Make roster, contract, lineup, strategy, scouting, free-agent, or trade decisions when the calendar allows.
10. Advance through the regular season, playoffs, championship, offseason, free agency, draft, training camp, and new season transition.

## MVP League Format

The MVP uses fictional teams, fictional players, fictional contracts, and fictional storylines.

Default compressed league:

- 16 teams.
- 4 divisions.
- 10-game regular season.
- 6 playoff teams.
- Seeds 1 and 2 receive first-round byes.
- First round: seed 3 vs seed 6, seed 4 vs seed 5.
- Semifinals reseed the 4 remaining teams, highest seed vs lowest seed.
- Championship decides the league winner.

This compressed structure reduces simulation load while preserving familiar football stakes.

## Player Role

The player is the GM with strategic influence over coaching identity. The player does not call individual plays during games in the MVP.

The player can:

- View roster, ratings, contracts, health, fatigue, and stats.
- Set starters and depth chart.
- Choose offensive system.
- Choose defensive system.
- Tune strategy tendencies.
- Sign players.
- Release players.
- Extend contracts.
- Scout college prospects by position or skill group.
- Draft college players before each new season.
- Sign free agents in the offseason or during the season.
- Trade players and/or draft picks during the offseason and the first 4 weeks of the regular season.
- Change player positions within the same skill group, or into closely related skill groups, before week 1 of a new season.
- Run training camp after the draft and before week 1.
- Run limited regular-season training sessions.
- Simulate game or week.
- Review team, player, and league performance.
- Progress through playoffs and season transition.

MVP player control should avoid micromanagement. Decisions should be broad, meaningful, and easy to understand.

## Team Strategy

Each team has a strategy profile made of systems and tendencies.

Offensive systems for MVP:

- West Coast: efficient short passing, timing routes, YAC, lower volatility.
- Power Run: inside runs, gap schemes, clock control, physical identity.
- Spread RPO: spacing, option looks, QB mobility, faster tempo.
- Vertical Air Raid: deep passing, explosive plays, higher turnover and sack risk.
- Balanced Pro: flexible concept mix, lower extremes, easier roster fit.

Defensive systems for MVP:

- 4-3 Zone: balanced front, zone coverage, stable against run and pass.
- 3-4 Pressure: blitz variety, sacks, negative plays, higher coverage risk.
- Nickel Match: pass defense, coverage flexibility, lighter box.
- Man Blitz: aggressive pressure, interceptions and sacks, vulnerable to explosives.
- Bend But Do Not Break: limits explosives, allows yards, stronger red-zone resistance.

Strategy tendencies:

- Tempo: slower teams shorten games; faster teams create more drives and fatigue.
- Aggression: higher aggression increases explosive outcomes and mistakes.
- Run/pass lean: changes concept weights.
- Deep passing: increases vertical concepts, explosives, sacks, and interceptions.
- Blitz rate: increases sacks, TFLs, QB pressure, and coverage risk.
- Coverage risk: increases interceptions and pass deflections, but also explosive completions.

## Playbook Concept Library

Games use named football concepts rather than pure random box-score generation. Concepts are not full real-life play sheets, but they are inspired by real football.

Offensive concepts:

- Inside zone.
- Outside zone.
- Power run.
- Counter.
- RPO glance.
- Play action.
- Mesh.
- Stick.
- Slants.
- Four verticals.
- Flood.
- Screen.
- Draw.
- QB option.

Defensive concepts:

- Man coverage.
- Cover 2.
- Cover 3.
- Cover 4 / quarters.
- Match zone.
- Fire zone blitz.
- Double A-gap pressure.
- Edge blitz.
- Simulated pressure.
- Run blitz.
- Spy.
- Prevent.

Each system weights concepts differently. Each drive selects concepts using system, tendencies, field position, score, time, fatigue, and opponent profile.

## Drive-Level Simulation Rules

The MVP simulation resolves games by drives, not by individual playable snaps. Each drive should still produce concept-level events so the game feels grounded and stats are meaningful.

Each drive tracks:

- Possession team.
- Starting field position.
- Time used.
- Offensive concept emphasis.
- Defensive concept emphasis.
- Yards gained.
- Outcome: touchdown, field goal attempt, punt, turnover, turnover on downs, safety, end of half/game.
- Offensive stat events.
- Defensive stat events.
- Fatigue changes.
- Injury checks.
- Key play notes.

Drive outcomes are based on:

- Offensive system and concept fit.
- Defensive system and concept counter.
- Player ratings.
- Positional matchup strength.
- Fatigue.
- Injuries.
- Home advantage.
- Game situation.
- Tendencies and risk settings.
- Seeded randomness.

Randomness should add drama, not replace football logic.

## Defensive Statistics

Defensive production is a first-class part of player value.

Required defensive stats:

- Tackles.
- Tackles for loss.
- Sacks.
- Interceptions.
- Pass deflections.
- Punt deflections.
- Kick deflections.

Defensive stat generation should happen during drive events rather than only after the game. This makes defensive leaders feel tied to actual game flow.

Defensive stats affect:

- Player value.
- Contract expectations.
- Awards.
- Team identity.
- Game recaps.
- Season review.

## Season Awards and All-Pro Teams

Awards are decided after the regular season and before or after the championship presentation, depending on UI flow. For MVP implementation, awards can be calculated at the end of the regular season so playoff simulation does not distort regular-season awards.

MVP awards:

- Season MVP.
- Offensive Player of the Year.
- Defensive Player of the Year.
- Offensive Rookie of the Year.
- Defensive Rookie of the Year.
- First Team All-Pro.
- Second Team All-Pro.

Award eligibility:

- Any player can earn an award if he meets the award's position, role, and season-status requirements.
- Rookie awards require the player to be in his first season.
- Offensive awards prioritize offensive positions and offensive production.
- Defensive awards prioritize defensive positions and defensive production.
- Season MVP can include any player, but should strongly favor high-impact quarterbacks and truly exceptional non-QB seasons.
- All-Pro teams should select by position/role so different player types can be recognized.

Award evaluation factors:

- Individual statistics.
- Efficiency.
- Team success.
- Snap/usage volume.
- Positional value.
- Clutch or high-leverage performance.
- Overall influence beyond box-score stats.
- Defensive pressure created.
- Double-team or triple-team attention created.
- Turnovers forced or prevented.
- Scheme importance and role difficulty.

Awards affect player value:

- Receiving one or more awards increases contract value, trade value, reputation, and player storyline weight.
- Multiple awards in the same season stack value impact, with diminishing returns to avoid runaway pricing.
- Recent awards should matter more than older awards, but career award history should remain visible.
- Rookie awards should increase perceived potential and future market value.

Awards should make players more memorable without overriding ratings, age, contract, health, and recent production.

## Hall of Fame

The Hall of Fame is processed at the end of each season after retirements are determined.

Hall of Fame rules:

- Only retiring players are eligible in the MVP.
- Each team receives 2 Hall of Fame votes per season.
- Teams vote from the pool of retiring players.
- Any retiring player who receives 4 or more total votes is elected into the Hall of Fame.
- Players below the vote threshold retire without Hall of Fame induction.

Hall of Fame voting should consider:

- Career awards.
- Career statistics.
- Championships.
- Playoff success.
- Peak seasons.
- Positional value.
- Franchise importance.
- Longevity.
- Notable traits or storylines.

Hall of Fame induction affects:

- Player legacy records.
- Franchise history.
- Team prestige presentation.
- Long-term league storytelling.

Hall of Fame should not directly change current roster strength, but it should make league history feel persistent and meaningful.

## Ratings Philosophy

Ratings should be simple enough for the player to understand and rich enough for simulation.

Every player attribute is rated from 1 to 100. Overall rating is derived from position-weighted attributes, scheme fit, health, fatigue, and development state.

Suggested MVP rating groups:

- Quarterback: accuracy, arm strength, decision making, mobility, poise.
- Running back: rushing, burst, power, receiving, ball security.
- Receiver/tight end: route running, catching, speed, contested catch, blocking.
- Offensive line: pass block, run block, strength, discipline.
- Defensive line/edge: pass rush, run defense, strength, pursuit.
- Linebacker: tackling, coverage, blitzing, run defense, awareness.
- Defensive back: coverage, ball skills, tackling, speed, awareness.
- Special teams: kicking, punting, return, coverage.

Team strength should come from player ratings, scheme fit, depth, health, fatigue, and strategy.

Player potential uses a 1-to-5 star scale:

- 1 star: can develop up to 70 overall.
- 2 stars: can develop up to 76 overall.
- 3 stars: can develop up to 82 overall.
- 4 stars: can develop up to 91 overall.
- 5 stars: can develop up to 99 overall.

A player can only reach his full potential before age 31. From age 31 onward, age-based decline begins to counteract or exceed development.

Standard age decline:

- Ages 31 through 35: -1 overall per season.
- Older than 35: -2.5 overall per season.

Playtime affects decline:

- Meaningful playtime reduces age-based rating decline by 20%.
- Low playtime does not provide this reduction.

Development and decline can be modified by traits. Traits can be positive or negative, and each positive trait should have a negative counterpart when practical.

Longevity trait examples:

- Iron Prime: reduces yearly age decline by 50%.
- Early Decline: increases yearly age decline by 50%.

Clutch trait examples:

- Clutch: triples the chance of big or unlikely positive plays. Example: 2% becomes 6%.
- Shrinks in Moment: reduces the chance of big or unlikely positive plays by 50%. Example: 2% becomes 1%.

Additional MVP trait families:

- Durable / Fragile: modifies injury chance.
- Film Junkie / Poor Study Habits: modifies awareness, scouting reliability, and game-to-game consistency.
- Leader / Locker Room Risk: modifies morale, late-season stability, and teammate performance variance.
- Big Play Spark / Conservative: modifies explosive play chance and turnover-risk tradeoffs.
- High Motor / Takes Plays Off: modifies fatigue resistance, defensive pursuit, and effort-based events.
- Red Zone Threat / Red Zone Liability: modifies scoring-area performance.
- Ball Hawk / Hands of Stone: modifies interception and pass-deflection conversion.
- Pocket Artist / Panic Under Pressure: modifies QB performance under blitz and pressure.
- Breakaway Speed / Limited Burst: modifies long-play chance.
- Technician / Raw Tools: modifies scheme fit and development curve.

## Position Changes and Training

Players can change position before week 1 of a new season.

Position-change rules:

- Position changes are allowed inside the same skill group.
- Position changes can also be allowed into closely related skill groups when the attributes make sense.
- Examples: guard to center, tackle to guard, outside linebacker to edge, safety to cornerback, wide receiver to tight end only when size/blocking supports it.
- Position changes should update scheme fit, depth chart eligibility, and position-weighted overall.
- Riskier position changes should carry lower immediate overall, lower scheme familiarity, or slower development until the player adapts.

Training camp occurs after the draft and before week 1 of the new season.

Training camp rules:

- Training camp lasts 3 days.
- The GM can focus-train up to 5 roster players.
- Each focused player uses one of 3 intensity levels.
- Higher intensity creates higher expected rating gains and higher injury risk.
- Injury risk ranges from 1% to 10%, depending on intensity, age, fatigue, durability, and injury history.
- Rating-gain expectation depends on intensity, potential, age, current rating versus potential ceiling, traits, and playtime history.
- All non-focused roster players also participate in normal camp and can gain rating based on potential and age.
- For 4-to-5-star potential players, normal camp can create gains up to +3.
- For 1-to-3-star potential players, normal camp can create gains up to +2.

Suggested focus-training intensity levels:

- Light: lowest injury risk, small rating expectation, best for veterans or fragile players.
- Standard: balanced injury risk and rating expectation.
- Aggressive: highest rating expectation and highest injury risk.

Regular-season training:

- The GM can train up to 5 players per session.
- There are 3 regular-season training windows.
- MVP default windows: after week 3, after week 6, and after week 9.
- Regular-season training should have smaller gains than training camp and should consider fatigue and injury risk.
- CPU teams should use training on young, high-potential, scheme-important, or underperforming players.

## Fatigue and Injuries

Fatigue should create meaningful week-to-week management without becoming tedious.

Fatigue rules:

- Faster tempo creates more fatigue.
- Physical systems create more fatigue in relevant position groups.
- Injured or low-stamina players fatigue faster.
- Fatigue reduces effectiveness and slightly increases injury risk.
- Bye weeks and rest reduce fatigue.

Injury rules:

- Injuries can occur during drives.
- Injury chance increases with fatigue, physical plays, prior injury status, and high usage.
- Injuries should range from minor in-game knocks to multi-week absences.
- MVP injuries should be visible, readable, and strategically important.

## Contracts and Roster Rules

The MVP includes full contracts, but the first implementation should keep financial rules understandable.

Contract model:

- Salary.
- Years remaining, from 1 to 7 years.
- Guaranteed amount.
- Bonus compensation.
- Contract expectations attached to bonus compensation.
- Cap hit.
- Extension eligibility.
- Release impact.

Salaries must be balanced so a team can afford a 55-player roster under the prestige-based cap system. Minimum viable salary tuning should keep stars expensive, starters meaningful, and backups affordable.

Suggested salary bands for MVP tuning:

- Minimum/depth player: 0.5 to 1.5 million per season.
- Backup/rotation player: 1.5 to 4 million per season.
- Low-end starter: 4 to 8 million per season.
- Quality starter: 8 to 15 million per season.
- Star player: 15 to 25 million per season.
- Elite franchise player: 25 to 35 million per season.

These bands should be position-adjusted, but the generated economy must allow a 55-player roster to fit under a 150 million cap if the team avoids too many stars.

Bonus compensation is tied to contract expectations that can be selected when negotiating. Examples:

- Win a championship.
- Reach the playoffs.
- Win the division.
- Finish with a top offense.
- Finish with a top defense.
- Reach a stat threshold.
- Make an award list.

Bonuses can apply for each season left on the contract. They should affect cap planning enough to matter, but should not make the first MVP financially unreadable.

Cap hit is the amount of a player's contract that counts against the current season's salary cap. For MVP purposes, cap hit should include salary plus the current season's relevant guaranteed/bonus cost.

Release impact is the cap and roster consequence of cutting a player:

- The player leaves the roster and becomes a free agent unless retiring or otherwise unavailable.
- The team removes future base salary obligations.
- The team may keep a dead-money charge from guaranteed money and earned/locked bonuses.
- Release impact should show both immediate cap savings and dead money so the player understands whether cutting someone helps or hurts.

Players can also be traded to clear cap space. Trades should be allowed when they reduce a team's cap deficit, even if the team remains over the cap after the trade. Example: a trade that moves a team from -10 million cap space to -1 million cap space is valid because it improves the deficit.

Extension eligibility determines whether the team can offer a new contract before the current deal expires. MVP eligibility can be simple: players become extension-eligible when they have 1 or 2 years remaining, unless blocked by age, retirement intent, or contract status.

Roster model:

- Active roster limit: 55 players.
- No practice squad in the MVP.
- Position minimums.
- Starters and backups.
- Formation-dependent lineup requirements.
- CPU teams can repair invalid rosters automatically.

Position minimums should ensure every team can field required formations and backups. Exact minimums can vary by offensive and defensive system, but all teams must have enough quarterbacks, offensive linemen, eligible receivers, defensive front players, linebackers, defensive backs, kickers, and punters to play a game.

CPU roster repair:

- CPU teams identify invalid roster positions.
- CPU teams sign available free agents that fill those needs.
- CPU teams prefer affordable players when near or over the cap.
- CPU teams can release fringe players if needed to create roster or cap room.

Contract decisions should matter, but the MVP should avoid complex edge cases that slow the core loop.

## Franchise Prestige and Salary Cap

Each team has a franchise prestige rating from 1 to 5 stars. Prestige represents long-term reputation, fan interest, ownership strength, and a franchise's ability to support a higher payroll.

Salary cap is based on prestige:

- Minimum salary cap: 150 million.
- Maximum salary cap: 200 million.
- Each full prestige star above 1 adds 12.5 million to the next season's salary cap.
- Example caps:
  - 1 star: 150 million.
  - 2 stars: 162.5 million.
  - 3 stars: 175 million.
  - 4 stars: 187.5 million.
  - 5 stars: 200 million.

Prestige can use quarter-star or smaller fractional values internally, but salary cap should still be clamped between 150 million and 200 million.

Prestige is updated once per season, after the championship game.

Prestige gains:

- Championship: +0.5 stars.
- Playoff participation: +0.125 stars.
- Best regular-season record: +0.125 stars.
- Highest overall team rating in the season: +0.125 stars.
- Best offense: +0.125 stars.
- Best defense: +0.125 stars.

Prestige loss:

- Finishing bottom 4 in the league standings: -0.25 stars.

Prestige cannot fall below 1 star or rise above 5 stars.

The updated prestige determines the team's salary cap for the next season. This means successful teams gain more financial flexibility, while struggling teams face a tougher climb without being permanently doomed.

## Player Acquisition

There are 3 player acquisition paths: draft, free agency, and trades. Each path has its own time window and information rules.

### Draft and Scouting

The draft happens before each new season and introduces fictional college players.

The next draft class is visible from week 1 of the current season onward. This is required so scouting choices matter throughout the season.

Draft class rules:

- Each draft class contains 160 draftable talents.
- The draft has 5 rounds.
- Each of the 16 teams owns 1 pick per round by default.
- 80 total players are drafted each year.
- The 80 undrafted players enter free agency after the draft.
- Draft class strength and positional variety vary each year.
- Every draft class must include at least 3 elite franchise-talent players.
- Every draft class can include at most 16 elite franchise-talent players.
- Later rounds should generally depreciate in current quality and/or certainty, while still allowing occasional sleepers.

Rookie contract size is defined by draft position:

- The number 1 overall pick starts at 25 million per season.
- Rookie salary decreases by pick slot.
- Round 5, pick 16 starts at 1.5 million per season.
- Rookie contract scale should be deterministic and visible before draft day.
- Rookie contract length should follow the normal 1-to-7-year contract rules unless a later stage defines a special rookie deal length.

Scouting uses a separate currency earned weekly throughout the season. This currency should be limited enough that scouting choices feel meaningful.

The player spends scouting currency on groups, not individual prospects. Valid scouting targets:

- Position groups, such as quarterback, running back, wide receiver, offensive line, defensive line, linebacker, defensive back, and special teams.
- Skill groups, such as passers, rushers, receivers, blockers, pass rushers, coverage defenders, tacklers, and specialists.

Unscouted prospects show:

- Name.
- Position.
- Age.
- Rating range.
- College history.
- Combine results.
- Expected draft position.

Unscouted prospects hide:

- Exact rating.
- Detailed ratings.
- Special traits.
- Player potential.
- Combine ranking.
- Full scheme fit.

Scouted prospect groups reveal more precise information for players in that group. The exact reveal depth can scale with scouting investment.

CPU scouting:

- CPU teams do not have perfect draft information.
- Each CPU team has roughly 75% of the draft class scouted.
- CPU scouting coverage is random per team, with bias toward team needs and preferred systems if practical.
- Different CPU teams can value and misread prospects differently.

Draft value is based on:

- Current rating.
- Potential.
- Age.
- Positional value.
- College production and awards.
- Combine results.
- Expected draft position.
- Scheme fit.

Draft decision logic:

- Teams consider best player available, roster need, scheme/playstyle synergy, talent, current rating, and scouting confidence.
- Teams can reach for a player expected to go later if that player fills a major roster need or has strong scheme fit.
- Teams should not always draft the highest overall player.
- Teams with incomplete scouting information can make mistakes, miss hidden traits, or overvalue combine/college production.

### Free Agency

Free agents can be signed during the offseason and throughout the regular season.

At the beginning of each offseason, the league runs a major free-agency event:

- Expired contracts are processed.
- Teams decide who to retain, release, or let test the market.
- Released players and unsigned expired-contract players enter the free-agent pool.
- CPU teams evaluate roster needs, cap space, age, performance, and value.

In-season free agency should focus on injury replacements, depth fixes, and short-term needs.

### Trades

Trades are allowed:

- During the whole offseason.
- During regular-season weeks 1 through 4.

Trades can include:

- Players.
- Draft picks.
- Player-and-pick packages.

Trade participants:

- The player can propose trades to CPU teams.
- CPU teams can propose trades to the player.
- CPU teams can trade with each other during valid trade windows.

Trade value is based on:

- Current rating.
- Potential.
- Age.
- Contract value.
- Positional value.
- Past success and awards.
- Most recent stats from the prior 2 seasons.
- Health and fatigue risk.
- Team need.
- Draft pick value.
- College prospect value when attached to draft picks.
- Urgency and importance for the receiving team.

CPU urgency can raise or lower trade willingness. Examples:

- Missing starter at a required position.
- Missing key player for a chosen scheme.
- Need for a talented backup behind an injury-prone starter.
- Desire to acquire a rookie or young player with high potential.
- Need to reduce a cap deficit.
- Contender seeking immediate production.
- Rebuilding team seeking draft picks or younger players.

CPU trade logic should reject obviously unfair offers and should value its competitive window, roster needs, scheme fit, scouting confidence, urgency, and cap situation.

## CPU Team Behavior

CPU teams need simple but believable AI.

CPU teams should:

- Maintain legal rosters.
- Fill injuries or positional gaps.
- Set depth charts by rating, health, fatigue, and fit.
- Use a coherent offensive and defensive system.
- Make basic sign/release decisions.
- Sign available free agents to repair invalid rosters.
- Use trades to reduce cap deficits or rebalance the roster when inside the trade window.
- Propose trades to the player when the CPU has a meaningful need or cap motivation.
- Complete CPU-to-CPU trades when both teams improve according to their value models.
- Prefer keeping high-value players when possible.
- Avoid obviously self-destructive contract behavior.

CPU AI should be predictable enough to debug and varied enough to create league personality.

## What Makes It Fun

The MVP should emphasize:

- Clear cause and effect between GM decisions and results.
- Fast season progression.
- Fictional players who become memorable through stats, injuries, contracts, and clutch games.
- Strategy identity: teams should feel different.
- Defensive stars that matter as much as offensive stars.
- Contract pressure that creates hard choices.
- Franchise prestige that turns long-term success into higher cap flexibility.
- Playoff stakes with a short, readable format.
- Enough randomness for surprises, but enough logic that losses feel explainable.

## MVP Boundaries

Included in MVP:

- Fictional league generation.
- GM roster and contract control.
- Franchise prestige and prestige-based salary caps.
- 55-player roster and 1-to-7-year contract rules.
- 160-player draft classes, 5-round draft, rookie contract scale, and undrafted free agents.
- Group scouting, free agency, trade windows, position changes, and training sessions.
- Strategy systems and tendencies.
- Drive-level game simulation.
- Event-based defensive stats.
- Season awards and All-Pro teams that affect player value.
- Hall of Fame voting for retiring players.
- Standings.
- 6-team playoffs.
- Autosave.
- Basic CPU team management, including CPU-initiated and CPU-to-CPU trades.
- Web UI for the core loop.

Deferred until after MVP:

- Real teams or real player data.
- Full play-by-play play calling.
- Multiplayer.
- Complex collective bargaining rules.
- Individual-player scouting.
- Advanced draft presentation and draft-day trade logic.
- Full coaching staff management.
- Advanced trade AI.
- Historical stat archive beyond what is needed for current season.

## Stage 1 Acceptance Criteria

Stage 1 is complete when:

- The MVP gameplay loop is defined.
- The player role and available actions are defined.
- League and playoff format are defined.
- Strategy systems and tendencies are defined.
- Playbook concept approach is defined.
- Drive-level simulation expectations are defined.
- Defensive stat categories and purpose are defined.
- Season award categories, eligibility, evaluation factors, and value impact are defined.
- Hall of Fame eligibility, voting, and induction threshold are defined.
- Draft/scouting, free agency, and trade acquisition rules are defined.
- CPU-to-CPU and CPU-initiated trade behavior is defined.
- Rookie contract scale, draft class size, draft AI, position changes, and training rules are defined.
- Franchise prestige and salary cap rules are defined.
- Player rating, potential, decline, trait, roster, and contract rules are defined.
- Fatigue, injuries, contracts, and CPU behavior have MVP rules.
- MVP boundaries are clear enough to begin the data layer.
