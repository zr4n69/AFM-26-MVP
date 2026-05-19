// AFL — American Football League
// Fictional data for AFM-26 prototype. All names, teams, stats are invented.
// Loaded as a global script: window.AFL = { ... }

(function () {
  // ---------- Teams: 16 teams, 4 conferences (West/North/East/South), 4 each ----------
  const TEAMS = [
    // WEST
    { id: 'SF',  city: 'San Francisco', name: 'Miners',     abbr: 'SF',  conf: 'West',  primary: '#A8322B', secondary: '#5A5754', tertiary: '#7A4B2A', logo: 'logos/SF.svg', prestige: 4.5  },
    { id: 'LA',  city: 'Los Angeles',   name: 'Stars',      abbr: 'LA',  conf: 'West',  primary: '#3E1F6B', secondary: '#0B0B12', tertiary: '#7DC8E8', logo: 'logos/LA.svg', prestige: 4.75 },
    { id: 'SD',  city: 'San Diego',     name: 'Suns',       abbr: 'SD',  conf: 'West',  primary: '#E8851A', secondary: '#F2C94C', tertiary: '#C0392B', logo: 'logos/SD.svg', prestige: 3.5  },
    { id: 'LV',  city: 'Las Vegas',     name: 'Gamblers',   abbr: 'LV',  conf: 'West',  primary: '#0E0E10', secondary: '#F2F2F2', tertiary: '#D4AF37', logo: 'logos/LV.svg', prestige: 4.25 },

    // NORTH
    { id: 'WYO', city: 'Wyoming',       name: 'Grizzlies',  abbr: 'WYO', conf: 'North', primary: '#5A3A22', secondary: '#1F3B2D', tertiary: '#F4EFE6', logo: 'logos/WYO.svg', prestige: 2.5  },
    { id: 'SLC', city: 'Salt Lake',     name: 'Preachers',  abbr: 'SLC', conf: 'North', primary: '#F4EFE6', secondary: '#C9A227', tertiary: '#F2C94C', logo: 'logos/SLC.svg', prestige: 3.25 },
    { id: 'NM',  city: 'New Mexico',    name: 'Oilers',     abbr: 'NM',  conf: 'North', primary: '#0E0E10', secondary: '#E8C547', tertiary: '#C0392B', logo: 'logos/NM.svg', prestige: 3.0  },
    { id: 'PHX', city: 'Phoenix',       name: 'Firebirds',  abbr: 'PHX', conf: 'North', primary: '#B11226', secondary: '#E8B042', tertiary: '#1A1A1A', logo: 'logos/PHX.svg', prestige: 3.5  },

    // EAST
    { id: 'NYC', city: 'New York',      name: 'Rockets',    abbr: 'NYC', conf: 'East',  primary: '#E8631A', secondary: '#6B6F76', tertiary: '#F4F4F4', logo: 'logos/NYC.svg', prestige: 5.0  },
    { id: 'PA',  city: 'Pennsylvania',  name: 'Patriots',   abbr: 'PA',  conf: 'East',  primary: '#13294B', secondary: '#A8322B', tertiary: '#F4F4F4', logo: 'logos/PA.svg', prestige: 4.5  },
    { id: 'PHI', city: 'Philadelphia',  name: 'Bells',      abbr: 'PHI', conf: 'East',  primary: '#7A4B2A', secondary: '#F4EAD2', tertiary: '#8B2E1F', logo: 'logos/PHI.svg', prestige: 3.5  },
    { id: 'AUS', city: 'Austin',        name: 'Cowboys',    abbr: 'AUS', conf: 'East',  primary: '#D9C9A8', secondary: '#1B3A6B', tertiary: '#A8A8AC', logo: 'logos/AUS.svg', prestige: 3.0  },

    // SOUTH
    { id: 'TB',  city: 'Tampa',         name: 'Pirates',    abbr: 'TB',  conf: 'South', primary: '#A8322B', secondary: '#E8851A', tertiary: '#F4F4F4', logo: 'logos/TB.svg', prestige: 3.75 },
    { id: 'MIA', city: 'Miami',         name: 'Sharks',     abbr: 'MIA', conf: 'South', primary: '#0F4C81', secondary: '#3FB8AF', tertiary: '#F4F4F4', logo: 'logos/MIA.svg', prestige: 4.0  },
    { id: 'HOU', city: 'Houston',       name: 'Astronauts', abbr: 'HOU', conf: 'South', primary: '#0B1F3A', secondary: '#A8A8AC', tertiary: '#F4F4F4', logo: 'logos/HOU.svg', prestige: 3.0  },
    { id: 'JAX', city: 'Jacksonville',  name: 'Gators',     abbr: 'JAX', conf: 'South', primary: '#2F5233', secondary: '#F4F4F4', tertiary: '#E8C547', logo: 'logos/JAX.svg', prestige: 2.75 },
  ];

  // Cap is clamped between 150M and 200M; +12.5M per star above 1.
  function capForPrestige(stars) {
    return Math.min(200, Math.max(150, 150 + (stars - 1) * 12.5));
  }
  TEAMS.forEach(t => { t.cap = capForPrestige(t.prestige); });

  // ---------- Standings — week 8 of a 10-game season ----------
  // Distribute realistic 8-game records that sum sensibly.
  const RECORDS = {
    SF:[5,3,0], LA:[6,2,0],  SD:[5,3,0],  LV:[6,2,0],
    WYO:[3,5,0], SLC:[4,4,0], NM:[4,4,0],  PHX:[7,1,0],
    NYC:[7,1,0], PA:[6,2,0],  PHI:[3,5,0], AUS:[2,6,0],
    TB:[5,3,0],  MIA:[6,2,0], HOU:[2,6,0], JAX:[1,7,0],
  };
  const POINTS = {
    SF:[201,182], LA:[228,170], SD:[210,189], LV:[221,178],
    WYO:[164,193], SLC:[188,184], NM:[192,188], PHX:[244,158],
    NYC:[241,151], PA:[218,170], PHI:[171,196], AUS:[152,210],
    TB:[208,184],  MIA:[225,180], HOU:[155,219], JAX:[129,232],
  };
  TEAMS.forEach(t => {
    t.w = RECORDS[t.id][0]; t.l = RECORDS[t.id][1]; t.tie = RECORDS[t.id][2];
    t.pf = POINTS[t.id][0]; t.pa = POINTS[t.id][1];
    t.pct = t.w / (t.w + t.l + t.tie);
    t.diff = t.pf - t.pa;
  });

  // ---------- Player names: pools used to generate roster ----------
  const FIRST = ['Marcus','Tyrell','Jamal','DeShawn','Andre','Kendrick','Maurice','Trey','Jalen','Cameron','Anthony','Brandon','Marquise','Dontrell','Calvin','Devonte','Isaiah','Reggie','Demarcus','Jermaine','Kyler','Caleb','Bryce','Tanner','Logan','Hunter','Cooper','Wyatt','Connor','Grayson','Aiden','Mason','Carson','Easton','Brody','Blake','Hayden','Tyson','Liam','Owen','Beau','Knox','Asher','Silas','Sebastian','Jaxon','Diego','Mateo','Santiago','Andres','Rafael','Emilio','Joaquin','Rashad','Xavier','Cyril','Devon','Quincy','Tariq','Malik','Jabari','Khalil','Amari','Darius','Kai','Tua','Sione','Penei','Vita','Akil','Donatello','Wesley','Theo','Jasper','Otis','August','Dax','Reed','Jett','Rowan','Cade','Pierce','Beckham','Saquon','Patrick','Aaron','Russell','Lamar','Justin','Joe','Trevor','Dak','Davante','Stefon','Cooper','Tyreek','Travis','George','Mark','Najee','Nick','Joey','TJ','Micah','Fred','Bobby','Roquan','Quinnen','Jeffery','Jalen','Trent','Quenton','Tristan'];
  const LAST = ['Walker','Bennett','Carter','Thompson','Robinson','Bryant','Harris','Mitchell','Coleman','Edwards','Sanders','Reed','Patterson','Holloway','Goodwin','Pickett','Mosley','Wallace','Brooks','Curtis','Lawson','McCoy','Calloway','Whitfield','Caldwell','Pearson','Greer','Sutton','Whitmore','Spence','Givens','Bracey','Holcomb','Ridley','Brockman','Westbrook','Ferrell','Murray','Patterson','Dawkins','Faulk','Harden','Gilmore','Toomer','Joyner','Riggins','Akins','Burdette','Beasley','Pickens','Worthy','Jeudy','Sutton','Olave','Aiyuk','Higgins','Smith','Brown','Williams','Davis','Jones','Hughes','Clark','Owens','Ramsey','Hill','Gibbs','Robinson','Achane','Etienne','Pollard','Mostert','Henderson','Gainwell','Singletary','Wright','Spears','Pacheco','Akers','Conner','Hubbard','Allgeier','Charbonnet','Dobbins','Mattison','Edmonds','White','Foreman','Sermon','Hines','Harris','Penny','Williams','Vaughn','Peterson','Lacy','Murray','Lewis','Charles','Faulk','Sanders','Allen','Tomlinson','Dickerson','Brown','Smith','Payton','Sayers','Brown','Campbell','Sayers','Kelce','Andrews','Pitts','Goedert','Engram','Hockenson','Schultz','Knox','Gesicki','Higbee','Smith','Conklin','Henry','Cook','Otton','LaPorta','Kraft','Mayer','Musgrave','Sampson','Stover','Fant','Dulcich','Ferguson','Ridzik','Callahan'];

  // Deterministic PRNG
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260507);
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function ri(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
  function rf(min, max) { return rand() * (max - min) + min; }
  function gauss(mean, sd) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------- Position structure ----------
  // Each team gets ~55 players. Realistic position distribution:
  const POS_TEMPLATE = [
    ['QB', 3], ['RB', 4], ['WR', 6], ['TE', 3],
    ['LT', 2], ['LG', 2], ['C', 2], ['RG', 2], ['RT', 2],
    ['EDGE', 4], ['DT', 4], ['LB', 5], ['CB', 5], ['S', 4],
    ['K', 1], ['P', 1], ['LS', 1],
    // 4 extra utility/depth rotated
    ['WR', 1], ['LB', 1], ['CB', 1], ['DT', 1],
  ];

  const POS_GROUP = {
    QB:'Passers', RB:'Rushers', WR:'Receivers', TE:'Receivers',
    LT:'Blockers', LG:'Blockers', C:'Blockers', RG:'Blockers', RT:'Blockers',
    EDGE:'Pass Rushers', DT:'Pass Rushers',
    LB:'Tacklers', CB:'Coverage', S:'Coverage',
    K:'Specialists', P:'Specialists', LS:'Specialists',
  };

  const TRAITS_POS = ['Iron Prime','Clutch','Film Junkie','Leader','Big Play Spark','High Motor','Red Zone Threat','Ball Hawk','Pocket Artist','Breakaway Speed','Technician','Durable'];
  const TRAITS_NEG = ['Early Decline','Shrinks in Moment','Poor Study Habits','Locker Room Risk','Conservative','Takes Plays Off','Red Zone Liability','Hands of Stone','Panic Under Pressure','Limited Burst','Raw Tools','Fragile'];

  // Salary band by overall + position
  function salaryFor(ovr, pos, age, years) {
    // ovr-driven base (scaled to keep 55-man payroll under $190M cap)
    let base;
    if (ovr >= 92) base = rf(18, 28);
    else if (ovr >= 85) base = rf(9, 16);
    else if (ovr >= 78) base = rf(4.5, 9);
    else if (ovr >= 72) base = rf(2, 4.5);
    else if (ovr >= 65) base = rf(0.9, 2);
    else base = rf(0.4, 0.9);

    // QB bump
    if (pos === 'QB') base *= 1.25;
    if (pos === 'EDGE' || pos === 'CB') base *= 1.08;
    if (pos === 'K' || pos === 'P' || pos === 'LS') base *= 0.45;
    if (age >= 32) base *= 0.85;
    if (age <= 23) base *= 0.8;

    return Math.round(base * 10) / 10;
  }

  function makePlayer(team, pos, idx) {
    const first = pick(FIRST), last = pick(LAST);
    const age = ri(21, 35);
    const potential = pick([1,2,2,3,3,3,4,4,5]); // weighted
    const ceiling = [70,76,82,91,99][potential - 1];

    // overall: starters higher than depth, position-relative
    let baseOvr;
    if (idx === 0) baseOvr = ri(74, 94);            // starter
    else if (idx === 1) baseOvr = ri(66, 80);       // backup
    else baseOvr = ri(55, 72);                       // depth

    // QB1 might be elite
    if (pos === 'QB' && idx === 0 && rand() < 0.4) baseOvr = ri(86, 96);

    const ovr = Math.min(ceiling, Math.max(50, baseOvr));

    const years = ri(1, 5);
    const salary = salaryFor(ovr, pos, age, years);
    const guaranteed = Math.round(salary * years * rf(0.3, 0.7) * 10) / 10;

    // Per-position attributes
    const attrs = {};
    if (pos === 'QB') {
      attrs.accuracy = clip(gauss(ovr, 6));
      attrs.armStrength = clip(gauss(ovr, 7));
      attrs.decision = clip(gauss(ovr, 6));
      attrs.mobility = clip(gauss(ovr - 4, 9));
      attrs.poise = clip(gauss(ovr, 5));
    } else if (pos === 'RB') {
      attrs.rushing = clip(gauss(ovr, 5));
      attrs.burst = clip(gauss(ovr, 7));
      attrs.power = clip(gauss(ovr, 7));
      attrs.receiving = clip(gauss(ovr - 4, 8));
      attrs.ballSecurity = clip(gauss(ovr, 5));
    } else if (pos === 'WR' || pos === 'TE') {
      attrs.routes = clip(gauss(ovr, 6));
      attrs.catching = clip(gauss(ovr, 5));
      attrs.speed = clip(gauss(pos === 'TE' ? ovr - 6 : ovr, 7));
      attrs.contested = clip(gauss(pos === 'TE' ? ovr + 2 : ovr, 6));
      attrs.blocking = clip(gauss(pos === 'TE' ? ovr + 4 : ovr - 14, 8));
    } else if (['LT','LG','C','RG','RT'].includes(pos)) {
      attrs.passBlock = clip(gauss(ovr, 5));
      attrs.runBlock = clip(gauss(ovr, 5));
      attrs.strength = clip(gauss(ovr, 6));
      attrs.discipline = clip(gauss(ovr, 6));
    } else if (pos === 'EDGE' || pos === 'DT') {
      attrs.passRush = clip(gauss(pos === 'EDGE' ? ovr + 2 : ovr - 2, 6));
      attrs.runDefense = clip(gauss(pos === 'DT' ? ovr + 2 : ovr - 2, 6));
      attrs.strength = clip(gauss(ovr, 6));
      attrs.pursuit = clip(gauss(ovr, 7));
    } else if (pos === 'LB') {
      attrs.tackling = clip(gauss(ovr, 5));
      attrs.coverage = clip(gauss(ovr - 3, 8));
      attrs.blitzing = clip(gauss(ovr, 6));
      attrs.runDefense = clip(gauss(ovr, 5));
      attrs.awareness = clip(gauss(ovr, 5));
    } else if (pos === 'CB' || pos === 'S') {
      attrs.coverage = clip(gauss(ovr, 5));
      attrs.ballSkills = clip(gauss(ovr, 7));
      attrs.tackling = clip(gauss(pos === 'S' ? ovr + 2 : ovr - 4, 7));
      attrs.speed = clip(gauss(ovr, 6));
      attrs.awareness = clip(gauss(ovr, 5));
    } else { // ST
      attrs.kicking = clip(gauss(ovr, 5));
      attrs.punting = clip(gauss(ovr, 5));
      attrs.coverage = clip(gauss(ovr, 6));
    }

    // Traits 0-2
    const traits = [];
    if (rand() < 0.5) traits.push(pick(TRAITS_POS));
    if (rand() < 0.2) traits.push(pick(TRAITS_NEG));

    const fatigue = ri(0, 35);
    const injStatus = rand() < 0.08
      ? pick(['Q','D','O'])
      : null;

    return {
      id: `${team.id}-${pos}-${idx}-${Math.floor(rand()*99999)}`,
      first, last,
      name: `${first} ${last}`,
      teamId: team.id,
      pos,
      group: POS_GROUP[pos],
      age,
      ovr,
      potential,
      ceiling,
      attrs,
      traits,
      fatigue,
      injStatus, // null | 'Q' | 'D' | 'O'
      years,
      salary,         // M per year
      cap: salary,    // simple MVP cap hit = current salary
      guaranteed,
      isStarter: idx === 0,
      depth: idx,
    };
  }

  function clip(v) { return Math.max(40, Math.min(99, Math.round(v))); }

  // Generate full league rosters
  TEAMS.forEach(team => {
    const roster = [];
    POS_TEMPLATE.forEach(([pos, count]) => {
      for (let i = 0; i < count; i++) {
        const existingAtPos = roster.filter(p => p.pos === pos).length;
        roster.push(makePlayer(team, pos, existingAtPos));
      }
    });
    team.roster = roster;
    team.payroll = roster.reduce((s, p) => s + p.cap, 0);
    team.capSpace = team.cap - team.payroll;
    // team rating: avg of top-22 starters by ovr
    const starters = [...roster].sort((a, b) => b.ovr - a.ovr).slice(0, 22);
    team.ovr = Math.round(starters.reduce((s, p) => s + p.ovr, 0) / starters.length);
    team.offRating = Math.round(roster.filter(p => ['QB','RB','WR','TE','LT','LG','C','RG','RT'].includes(p.pos)).sort((a,b)=>b.ovr-a.ovr).slice(0,11).reduce((s,p)=>s+p.ovr,0)/11);
    team.defRating = Math.round(roster.filter(p => ['EDGE','DT','LB','CB','S'].includes(p.pos)).sort((a,b)=>b.ovr-a.ovr).slice(0,11).reduce((s,p)=>s+p.ovr,0)/11);
  });

  // ---------- User team: Las Vegas Gamblers ----------
  const USER_TEAM_ID = 'LV';

  // ---------- Schedule for user team (10 games, week 9 upcoming) ----------
  const SCHEDULE_LV = [
    { wk: 1,  opp: 'SF',  home: true,  result: 'W', us: 27, them: 17 },
    { wk: 2,  opp: 'SD',  home: false, result: 'L', us: 20, them: 24 },
    { wk: 3,  opp: 'LA',  home: true,  result: 'W', us: 31, them: 23 },
    { wk: 4,  opp: 'PHX', home: false, result: 'L', us: 14, them: 28 },
    { wk: 5,  opp: 'NYC', home: true,  result: 'W', us: 24, them: 21 },
    { wk: 6,  opp: 'HOU', home: true,  result: 'W', us: 34, them: 13 },
    { wk: 7,  opp: 'MIA', home: false, result: 'W', us: 27, them: 24 },
    { wk: 8,  opp: 'SF',  home: false, result: 'W', us: 30, them: 20 },
    { wk: 9,  opp: 'SD',  home: true,  result: null }, // upcoming
    { wk: 10, opp: 'LA',  home: false, result: null },
  ];

  // ---------- League leaders (regular season through week 8) ----------
  const LEADERS = {
    passYds: [
      { name: 'Aaron Whitfield',  team: 'NYC', pos: 'QB', val: 2541 },
      { name: 'Marcus Reed',      team: 'PA',  pos: 'QB', val: 2418 },
      { name: 'Tyrell Brooks',    team: 'PHX', pos: 'QB', val: 2376 },
      { name: 'Bryce Calloway',   team: 'LV',  pos: 'QB', val: 2289 },
      { name: 'Jalen Pearson',    team: 'MIA', pos: 'QB', val: 2204 },
    ],
    rushYds: [
      { name: 'Najee Walker',     team: 'PHX', pos: 'RB', val: 988 },
      { name: 'Kendrick Pickett', team: 'LV',  pos: 'RB', val: 921 },
      { name: 'Saquon Holloway',  team: 'NYC', pos: 'RB', val: 884 },
      { name: 'DeShawn Goodwin',  team: 'PHI', pos: 'RB', val: 812 },
      { name: 'Maurice Mosley',   team: 'PA',  pos: 'RB', val: 798 },
    ],
    recYds: [
      { name: 'Davante Wallace',  team: 'NYC', pos: 'WR', val: 1024 },
      { name: 'Stefon Curtis',    team: 'LV',  pos: 'WR', val: 921 },
      { name: 'Tyreek Lawson',    team: 'PHX', pos: 'WR', val: 894 },
      { name: 'Cooper McCoy',     team: 'PA',  pos: 'WR', val: 854 },
      { name: 'Amari Sutton',     team: 'MIA', pos: 'WR', val: 821 },
    ],
    sacks: [
      { name: 'Micah Spence',     team: 'LV',  pos: 'EDGE', val: 11.5 },
      { name: 'TJ Givens',        team: 'PHX', pos: 'EDGE', val: 10.0 },
      { name: 'Quinnen Bracey',   team: 'PA',  pos: 'EDGE', val: 9.5  },
      { name: 'Nick Holcomb',     team: 'NYC', pos: 'EDGE', val: 9.0  },
      { name: 'Joey Ridley',      team: 'MIA', pos: 'EDGE', val: 8.5  },
    ],
    ints: [
      { name: 'Patrick Murray',   team: 'NYC', pos: 'CB',   val: 5 },
      { name: 'Jalen Brockman',   team: 'PHX', pos: 'S',    val: 5 },
      { name: 'Devon Westbrook',  team: 'LV',  pos: 'CB',   val: 4 },
      { name: 'Roquan Ferrell',   team: 'PA',  pos: 'LB',   val: 4 },
      { name: 'Quincy Faulk',     team: 'PHI', pos: 'S',    val: 4 },
    ],
    tackles: [
      { name: 'Fred Beasley',     team: 'HOU', pos: 'LB',   val: 78 },
      { name: 'Bobby Pickens',    team: 'JAX', pos: 'LB',   val: 74 },
      { name: 'Roquan Ferrell',   team: 'PA',  pos: 'LB',   val: 71 },
      { name: 'Jermaine Worthy',  team: 'LV',  pos: 'LB',   val: 69 },
      { name: 'Khalil Joyner',    team: 'WYO', pos: 'S',    val: 67 },
    ],
  };

  // ---------- Recent news / story feed ----------
  const NEWS = [
    { wk: 8, type: 'injury', text: 'WR Stefon Curtis (LV) limited in practice — questionable for Week 9.' },
    { wk: 8, type: 'milestone', text: 'EDGE Micah Spence (LV) leads the league with 11.5 sacks through 8 games.' },
    { wk: 8, type: 'trade-rumor', text: 'Cleveland reportedly listening on veteran LB Bobby Pickens. Trade window closes after Week 4 — already shut.' },
    { wk: 8, type: 'standings', text: 'Chicago Ironworks clinch above-.500 record at 7–1, leads North.' },
    { wk: 7, type: 'award-watch', text: 'MVP race: Whitfield (NYC), Reed (BOS), and Spence (LV) headline midseason ballots.' },
    { wk: 7, type: 'injury', text: 'CB Patrick Murray (NYC) cleared from concussion protocol.' },
    { wk: 7, type: 'contract', text: 'TE Travis Bracey (BOS) extension talks reported. 2 years remaining.' },
  ];

  // ---------- Draft class preview (top 10 of 160) ----------
  const DRAFT_CLASS = [
    { rk: 1, name: 'Devonte Akins',   pos: 'QB',   age: 21, college: 'Texas State', proj: 'R1.1',  ovr: '88–94', stars: 5, scouted: false },
    { rk: 2, name: 'Tariq Riggins',   pos: 'EDGE', age: 22, college: 'Florida A&M', proj: 'R1.2',  ovr: '85–91', stars: 5, scouted: true },
    { rk: 3, name: 'Cyril Beasley',   pos: 'WR',   age: 21, college: 'Oregon Tech', proj: 'R1.3',  ovr: '83–89', stars: 5, scouted: false },
    { rk: 4, name: 'Sione Vaughn',    pos: 'LT',   age: 22, college: 'Hawaii Pac.', proj: 'R1.4',  ovr: '82–88', stars: 4, scouted: true },
    { rk: 5, name: 'Knox Patterson',  team: null,  pos: 'CB', age: 21, college: 'Alabama St.', proj: 'R1.5', ovr: '80–86', stars: 4, scouted: false },
    { rk: 6, name: 'Diego Calloway',  pos: 'QB',   age: 22, college: 'Miami Bay',   proj: 'R1.6',  ovr: '79–85', stars: 4, scouted: false },
    { rk: 7, name: 'Otis Penny',      pos: 'RB',   age: 21, college: 'Georgia So.', proj: 'R1.7',  ovr: '79–85', stars: 4, scouted: true },
    { rk: 8, name: 'Asher Bracey',    pos: 'S',    age: 22, college: 'Penn West',   proj: 'R1.8',  ovr: '78–84', stars: 4, scouted: false },
    { rk: 9, name: 'Beau Worthington',pos: 'TE',   age: 21, college: 'BYU',         proj: 'R1.9',  ovr: '77–83', stars: 4, scouted: false },
    { rk:10, name: 'Tua Pickens',     pos: 'DT',   age: 22, college: 'LSU',         proj: 'R1.10', ovr: '77–83', stars: 4, scouted: true },
  ];

  // ---------- Free agent pool (small sample) ----------
  const FREE_AGENTS = [
    { name: 'Xavier Mosley',    pos: 'EDGE', age: 30, ovr: 79, ask: 9.5,  yrs: 2 },
    { name: 'Trent Holcomb',    pos: 'LG',   age: 31, ovr: 77, ask: 6.0,  yrs: 2 },
    { name: 'Quincy Murray',    pos: 'CB',   age: 28, ovr: 76, ask: 7.5,  yrs: 3 },
    { name: 'Wesley Pickens',   pos: 'WR',   age: 32, ovr: 74, ask: 4.5,  yrs: 1 },
    { name: 'Jasper Ridley',    pos: 'LB',   age: 27, ovr: 78, ask: 8.0,  yrs: 3 },
    { name: 'Beckham Caldwell', pos: 'TE',   age: 29, ovr: 75, ask: 5.0,  yrs: 2 },
    { name: 'Liam Conklin',     pos: 'C',    age: 33, ovr: 72, ask: 3.0,  yrs: 1 },
    { name: 'Emilio Sanders',   pos: 'S',    age: 26, ovr: 73, ask: 4.0,  yrs: 2 },
    { name: 'Hunter Engram',    pos: 'K',    age: 30, ovr: 78, ask: 2.5,  yrs: 2 },
    { name: 'Tyson Pollard',    pos: 'RB',   age: 28, ovr: 73, ask: 3.5,  yrs: 2 },
  ];

  // ---------- Public surface ----------
  window.AFL = {
    TEAMS,
    USER_TEAM_ID,
    SCHEDULE_LV,
    LEADERS,
    NEWS,
    DRAFT_CLASS,
    FREE_AGENTS,
    POS_GROUP,
    capForPrestige,
  };
  window.AFL.userTeam = TEAMS.find(t => t.id === USER_TEAM_ID);
  window.AFL.byId = id => TEAMS.find(t => t.id === id);
})();
