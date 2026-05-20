import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createLeague } from '@engine/data/factories.js';
import { updateStrategy, setDepthChart, releasePlayer, signPlayer, extendContract, scheduleTrainingSession, resolveTrainingSession, scoutProspectGroup, draftProspect, processUndraftedFreeAgents, proposeTrade, completeTrade, castHallOfFameVotes } from '@engine/data/actions.js';
import { simulateWeek } from '@engine/simulation/engine.js';
import { cpuPickProspect, convertProspectToPlayer } from '@engine/simulation/cpu-ai.js';
import { makeContractOffer, resolvePendingOffers } from '@engine/simulation/free-agency.js';
import { calculateTradeValue, evaluateCpuTradeResponse } from '@engine/simulation/trade-value.js';
import { createRng } from '@engine/data/random.js';
import { bridgeLeague } from '../data/bridge.js';

const LeagueContext = createContext(null);

export function LeagueProvider({ children, seed = 'afm26-mvp', playerTeamIndex = 0, initialLeague = null }) {
  const [league, setLeague] = useState(() =>
    initialLeague ? structuredClone(initialLeague) : createLeague(seed, { playerTeamIndex, playerPrestige: 4.25 })
  );
  const [rev, setRev] = useState(0);

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
    getRawLeague() {
      return league;
    },
  }), [league, bump]);

  const bridged = useMemo(() => bridgeLeague(league), [league, rev]);

  return (
    <LeagueContext.Provider value={{ ...bridged, actions }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}
