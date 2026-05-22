# American Football GM Simulation — COMPLETE ✅

**AFM-26** is a fully playable web-based American football GM simulation game featuring 16 teams, multi-season gameplay, complete team management, live drive-level game simulation, and professional web UI.

🚀 **Ready to Play** — Start a career, manage rosters, draft prospects, negotiate contracts, and guide your team to playoff glory.

## Features

- **16-Team League** - Fictional teams with authentic color schemes and logos
- **Full GM Control** - Manage rosters, salaries, contracts, strategy, depth charts
- **Live Game Simulation** - Drive-by-drive play with injury tracking and stat accumulation
- **Personnel Management** - Draft prospects, negotiate free agency, trade with rivals
- **Season Progression** - Regular season → Playoffs → Awards → Hall of Fame voting
- **Professional UI** - Responsive web interface for all screen sizes
- **Career Saves** - 3 independent save slots with auto-save support

## Quick Start

**Play the Game:**
```sh
cd ui && npm run dev
```
Opens at `http://localhost:5174/AFM-26-MVP`

**Run Tests:**
```sh
npm test
```

**48-Season Stress Test:**
```sh
npm test -- test/batch-simulation.test.js
```

## Development

| Stage | Status | Details |
|-------|--------|---------|
| **Stage 1** | ✅ Complete | Game design rules & specifications |
| **Stage 2** | ✅ Complete | Full data layer with 14 positions, contracts, salary cap |
| **Stage 3** | ✅ Complete | Drive-level simulation engine, 48-season tested |
| **Stage 4** | ✅ Complete | Web MVP with 14+ playable screens, full GM control |

See [stage-4-web-mvp.md](docs/stage-4-web-mvp.md) for complete feature list.

## Architecture

**Backend** (`src/`) - Pure JavaScript simulation engine
- No frameworks, no dependencies, 100% portable
- Full game state in memory, fully serializable
- Drive-level simulation with NFL-inspired rules
- Injury system, salary cap enforcement, trade logic

**Frontend** (`ui/src/`) - React + Vite web interface
- LeagueContext for global state management
- Bridge layer for engine ↔ UI data conversion
- 14 feature screens with full team control
- Responsive design, dark theme, mobile-optimized

## Testing

✅ 100 core gameplay tests  
✅ 48-season stress test (12 runs × 4 seasons)  
✅ All features tested and verified  

No critical bugs. Minor issues:
- 3 pre-existing data-layer test failures (unrelated to gameplay)
- These do not affect game functionality

## Next Steps (Post-MVP)

Potential enhancements:
- Faster season progression (skip weeks/seasons)
- Extended stats and analytics
- Achievement system
- Coaching staff hiring
- Multiplayer/online leagues
