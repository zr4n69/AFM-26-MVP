import { LEAGUE_RULES } from "./constants.js";
import { makeId } from "./random.js";

const DIVISION_WEEK_INDEXES = new Set([0, 4, 9]);

export function createRegularSeasonSchedule(teams, season = 1) {
  const divisions = groupTeamsByDivision(teams);
  if (divisions.length !== LEAGUE_RULES.divisions
    || divisions.some((division) => division.length !== LEAGUE_RULES.teamsPerDivision)) {
    throw new Error("Cannot create schedule without four complete four-team divisions.");
  }

  const divisionalRounds = createDivisionalRounds(divisions);
  const crossDivisionRounds = createCrossDivisionRounds(divisions);
  const crossDivisionOffset = ((season - 1) * 7) % crossDivisionRounds.length;
  const selectedCrossDivisionRounds = Array.from({ length: 7 }, (_, index) =>
    crossDivisionRounds[(crossDivisionOffset + index) % crossDivisionRounds.length]
  );

  let divisionIndex = (season - 1) % divisionalRounds.length;
  let crossDivisionIndex = 0;
  const matchupsByWeek = Array.from({ length: LEAGUE_RULES.regularSeasonWeeks }, (_, weekIndex) => {
    if (DIVISION_WEEK_INDEXES.has(weekIndex)) {
      const round = divisionalRounds[divisionIndex % divisionalRounds.length];
      divisionIndex += 1;
      return round;
    }
    const round = selectedCrossDivisionRounds[crossDivisionIndex];
    crossDivisionIndex += 1;
    return round;
  });

  const orientedMatchups = orientForBalancedHomeGames(teams, matchupsByWeek);
  return orientedMatchups.map((matchups, weekIndex) => ({
    week: weekIndex + 1,
    games: matchups.map((matchup, gameIndex) => ({
      id: makeId("game", [season, weekIndex + 1, gameIndex + 1]),
      week: weekIndex + 1,
      awayTeamId: matchup.awayTeamId,
      homeTeamId: matchup.homeTeamId,
      played: false,
      driveLog: [],
      boxScore: null,
      injuries: [],
      keyEvents: []
    }))
  }));
}

function groupTeamsByDivision(teams) {
  const divisions = new Map();
  for (const team of teams) {
    const members = divisions.get(team.division) ?? [];
    members.push(team.id);
    divisions.set(team.division, members);
  }
  return [...divisions.values()];
}

function createDivisionalRounds(divisions) {
  const localRounds = [
    [[0, 3], [1, 2]],
    [[0, 2], [3, 1]],
    [[0, 1], [2, 3]]
  ];
  return localRounds.map((round) => divisions.flatMap((division) =>
    round.map(([first, second]) => [division[first], division[second]])
  ));
}

function createCrossDivisionRounds(divisions) {
  const divisionPairings = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]]
  ];
  return divisionPairings.flatMap((pairing) =>
    Array.from({ length: LEAGUE_RULES.teamsPerDivision }, (_, offset) =>
      pairing.flatMap(([firstDivision, secondDivision]) =>
        divisions[firstDivision].map((teamId, index) => [
          teamId,
          divisions[secondDivision][(index + offset) % LEAGUE_RULES.teamsPerDivision]
        ])
      )
    )
  );
}

function orientForBalancedHomeGames(teams, matchupsByWeek) {
  const edges = matchupsByWeek.flatMap((matchups, weekIndex) =>
    matchups.map(([firstTeamId, secondTeamId], gameIndex) => ({
      id: `${weekIndex}-${gameIndex}`,
      weekIndex,
      gameIndex,
      firstTeamId,
      secondTeamId
    }))
  );
  const adjacency = new Map(teams.map((team) => [team.id, []]));
  for (const edge of edges) {
    adjacency.get(edge.firstTeamId).push(edge);
    adjacency.get(edge.secondTeamId).push(edge);
  }

  const usedEdges = new Set();
  const directions = new Map();
  for (const team of teams) {
    if (adjacency.get(team.id).every((edge) => usedEdges.has(edge.id))) continue;
    const vertexStack = [team.id];
    const edgeStack = [];
    while (vertexStack.length > 0) {
      const current = vertexStack.at(-1);
      const edge = adjacency.get(current).find((candidate) => !usedEdges.has(candidate.id));
      if (edge) {
        usedEdges.add(edge.id);
        const next = edge.firstTeamId === current ? edge.secondTeamId : edge.firstTeamId;
        vertexStack.push(next);
        edgeStack.push({ edge, awayTeamId: current, homeTeamId: next });
      } else {
        vertexStack.pop();
        const traversal = edgeStack.pop();
        if (traversal) directions.set(traversal.edge.id, traversal);
      }
    }
  }

  return matchupsByWeek.map((matchups, weekIndex) => matchups.map((_, gameIndex) => {
    const direction = directions.get(`${weekIndex}-${gameIndex}`);
    return { awayTeamId: direction.awayTeamId, homeTeamId: direction.homeTeamId };
  }));
}
