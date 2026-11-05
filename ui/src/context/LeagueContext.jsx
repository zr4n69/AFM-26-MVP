import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createLeague } from '@engine/data/factories.js';
import { ROSTER_TEMPLATE } from '@engine/data/constants.js';
import { updateStrategy, setDepthChart, releasePlayer, signPlayer, extendContract, scheduleTrainingSession, resolveTrainingSession, scoutProspectGroup, draftProspect, processUndraftedFreeAgents, proposeTrade, completeTrade, castHallOfFameVotes, generatePlayoffBracket, advanceSeasonPhase, refreshContractSummary } from '@engine/data/actions.js';
import { simulateWeek, generatePlayoffSeeds, simulatePlayoffRound } from '@engine/simulation/engine.js';
import { runSeasonReview, runOffseason, advanceToNextSeason } from '@engine/simulation/season.js';
import { cpuPickProspect, convertProspectToPlayer } from '@engine/simulation/cpu-ai.js';
import { makeContractOffer, resolvePendingOffers, runFreeAgencyPeriod } from '@engine/simulation/free-agency.js';
import { calculateTradeValue, evaluateCpuTradeResponse } from '@engine/simulation/trade-value.js';
import { createRng } from '@engine/data/random.js';
import { bridgeLeague } from '../data/bridge.js';

const LeagueContext = createContext(null);

export function LeagueProvider({ children, initialLeague = null, seed = 'afm26-mvp', playerTeamIndex = 0 }) {
  const [league] = useState(() =>
    initialLeague ?? createLeague(seed, { playerTeamIndex, playerPrestige: 4.25 })
  );
  const [rev, setRev] = useState(0);
  const [actionError, setActionError] = useState(null);

  const bump = useCallback(() => setRev(r => r + 1), []);

  const actions = useMemo(() => ({
    updateStrategy(teamId, patch) {
      updateStrategy(league, teamId, patch);
      bump();
    },
    setDepthChart(teamId, position, playerIds) {
      setDepthChart(league, teamId, position, playerIds);
      bump();
    },
    releasePlayer(teamId, playerId) {
      releasePlayer(league, teamId, playerId);
      bump();
    },
    signPlayer(teamId, player) {
      signPlayer(league, teamId, player);
      bump();
    },
    extendContract(teamId, playerId, terms) {
      extendContract(league, teamId, playerId, terms);
      bump();
    },
    simulateWeek(week) {
      try {
        if (league.phase === 'preseason' && !league.training?.camp?.completed) {
          throw new Error('Complete training camp before Week 1.');
        }
        const games = simulateWeek(league, week);
        bump();
        return games;
      } catch (e) {
        console.error('[simulateWeek]', e);
        bump();
        return [];
      }
    },
    scheduleTraining(teamId, playerPlans, options) {
      try {
        const session = scheduleTrainingSession(league, teamId, playerPlans, options);
        bump();
        return session;
      } catch (e) {
        console.error('[scheduleTraining]', e);
        throw e;
      }
    },
    resolveTraining(sessionId) {
      try {
        const results = resolveTrainingSession(league, sessionId);
        bump();
        return results;
      } catch (e) {
        console.error('[resolveTraining]', e);
        bump();
        return [];
      }
    },
    scoutGroup(teamId, group, spend) {
      const result = scoutProspectGroup(league, teamId, group, spend);
      bump();
      return result;
    },
    draftPick(pickId, prospectId) {
      try {
        const result = draftProspect(league, pickId, prospectId);
        const rng = createRng(`draft-convert-${prospectId}-${league.currentSeason}`);
        const pick = league.draft.picks.find(p => p.id === pickId);
        if (!pick) return null;
        const team = league.teams.find(t => t.id === pick.currentTeamId);
        if (!team) return null;
        const player = convertProspectToPlayer(league, result.prospect, team.id, rng);
        if (team.roster.length < 55) {
          team.roster.push(player);
          refreshContractSummary(team);
        } else {
          league.freeAgents.push(player);
        }
        bump();
        return { pick: result.pick, prospect: result.prospect, player };
      } catch (e) {
        console.error('[draftPick]', e);
        bump();
        return null;
      }
    },
    runCpuPick(pickId) {
      try {
        const pick = league.draft?.picks?.find(p => p.id === pickId);
        if (!pick || pick.prospectId) return null;
        const prospect = cpuPickProspect(league, pick.currentTeamId);
        if (!prospect) return null;
        const result = draftProspect(league, pick.id, prospect.id);
        const rng = createRng(`draft-convert-${prospect.id}-${league.currentSeason}`);
        const team = league.teams.find(t => t.id === pick.currentTeamId);
        if (!team) return null;
        const player = convertProspectToPlayer(league, result.prospect, team.id, rng);
        if (team.roster.length < 55) {
          team.roster.push(player);
          refreshContractSummary(team);
        } else {
          league.freeAgents.push(player);
        }
        bump();
        return { pick: result.pick, prospect: result.prospect, player };
      } catch (e) {
        console.error('[runCpuPick]', e);
        bump();
        return null;
      }
    },
    finalizeDraft() {
      try {
        processUndraftedFreeAgents(league);
        league.draft.status = 'completed';
      } catch (e) {
        console.error('[finalizeDraft]', e);
        league.draft.status = 'completed';
      }
      bump();
    },
    makeOffer(teamId, playerId, salary, years) {
      const result = makeContractOffer(league, teamId, playerId, salary, years);
      bump();
      return result;
    },
    resolveOffers(options) {
      const result = resolvePendingOffers(league, options);
      bump();
      return result;
    },
    proposeTrade(fromTeamId, toTeamId, offer) {
      try {
        const trade = proposeTrade(league, fromTeamId, toTeamId, offer);
        bump();
        return trade;
      } catch (e) {
        console.error('[proposeTrade]', e);
        throw e;
      }
    },
    evaluateTrade(tradeId) {
      try {
        const trade = (league.trades || []).find(t => t.id === tradeId);
        if (!trade) return null;
        return evaluateCpuTradeResponse(league, trade);
      } catch (e) {
        console.error('[evaluateTrade]', e);
        return { response: 'rejected', reason: 'Evaluation error' };
      }
    },
    completeTrade(tradeId) {
      try {
        const result = completeTrade(league, tradeId);
        bump();
        return result;
      } catch (e) {
        console.error('[completeTrade]', e);
        bump();
        return null;
      }
    },
    getTradeValue(teamId, assets) {
      return calculateTradeValue(league, teamId, assets);
    },
    castHofVotes(teamId, playerIds) {
      const result = castHallOfFameVotes(league, teamId, playerIds);
      bump();
      return result;
    },
    generatePlayoffs() {
      try {
        const seeds = generatePlayoffSeeds(league);
        const bracket = generatePlayoffBracket(league, seeds);
        bump();
        return bracket;
      } catch (e) {
        console.error('[generatePlayoffs]', e);
        bump();
        return null;
      }
    },
    simulatePlayoffRound(roundName) {
      try {
        const games = simulatePlayoffRound(league, roundName);
        bump();
        return games;
      } catch (e) {
        console.error('[simulatePlayoffRound]', e);
        bump();
        return [];
      }
    },
    advancePhase(phase) {
      try {
        advanceSeasonPhase(league, phase);
        bump();
      } catch (e) {
        console.error('[advancePhase]', e);
        bump();
      }
    },
    finalizeSeasonReview() {
      try {
        if (!league.awards.regularSeasonProcessed) runSeasonReview(league);
        bump();
        return true;
      } catch (e) {
        console.error('[finalizeSeasonReview]', e);
        bump();
        return false;
      }
    },
    beginOffseason() {
      try {
        if (!league.awards.regularSeasonProcessed) runSeasonReview(league);
        if (league.phase !== 'offseason') {
          runOffseason(league, { skipDraft: true, skipFreeAgency: true });
        }
        bump();
        return true;
      } catch (e) {
        console.error('[beginOffseason]', e);
        bump();
        return false;
      }
    },
    resolveOffseasonFreeAgency() {
      try {
        const pending = resolvePendingOffers(league, { seed: `player-fa-${league.seed}-${league.currentSeason}` });
        const cpu = runFreeAgencyPeriod(league, { seed: `cpu-fa-${league.seed}-${league.currentSeason}` });
        league.offseasonEvents = { ...(league.offseasonEvents || {}), freeAgencyComplete: true };
        bump();
        return { pending, cpu };
      } catch (e) {
        console.error('[resolveOffseasonFreeAgency]', e);
        bump();
        return null;
      }
    },
    updateMockDraftBoard(orderedProspectIds) {
      const team = league.teams.find(t => t.isPlayerControlled);
      if (team) team.mockDraftBoard = [...orderedProspectIds];
      bump();
    },
    startNextSeason() {
      try {
        setActionError(null);
        if (league.phase !== 'offseason') {
          if (!league.awards.regularSeasonProcessed) runSeasonReview(league);
          runOffseason(league, { skipDraft: true, skipFreeAgency: true });
        }

        const userTeam = league.teams.find(t => t.isPlayerControlled);
        const freeAgencyComplete = !!league.offseasonEvents?.freeAgencyComplete;
        const draftComplete = league.draft?.status === 'completed';
        const hofEligible = league.hallOfFame?.eligiblePlayers || [];
        const userHofBallot = userTeam ? (league.hallOfFame?.ballotsByTeamId?.[userTeam.id] || []) : [];
        const hofComplete = hofEligible.length === 0 || userHofBallot.length > 0;

        if (!freeAgencyComplete) throw new Error('Resolve offseason free agency before starting the next season.');
        if (!draftComplete) throw new Error('Complete the offseason draft before starting the next season.');
        if (!hofComplete) throw new Error('Cast your Hall of Fame ballot before starting the next season.');
        const missingPositions = Object.keys(ROSTER_TEMPLATE)
          .filter((position) => !userTeam?.roster.some((player) => player.position === position));
        if (missingPositions.length > 0) {
          throw new Error(`Sign a player at these required positions before starting the next season: ${missingPositions.join(', ')}.`);
        }
        if (userTeam?.contractSummary?.capSpace < 0) {
          const overBy = Math.ceil(-userTeam.contractSummary.capSpace / 100_000) / 10;
          throw new Error(`Release or restructure contracts to clear $${overBy.toFixed(1)}M in cap space before starting the next season.`);
        }

        advanceToNextSeason(league);
        bump();
        return true;
      } catch (e) {
        console.error('[startNextSeason]', e);
        setActionError(e.message || 'Unable to start the next season.');
        bump();
        return false;
      }
    },
    clearActionError() {
      setActionError(null);
    },
    getPlayoff() {
      return league.playoff || null;
    },
    getStandings() {
      return league.standings || [];
    },
    getRawLeague() {
      return league;
    },
  }), [league, bump]);

  const bridged = useMemo(() => {
    void rev;
    return bridgeLeague(league);
  }, [league, rev]);

  return (
    <LeagueContext.Provider value={{ ...bridged, actions, revision: rev, actionError }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}
