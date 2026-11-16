import { useState, useCallback, useMemo } from 'react';
import { createLeague } from '@engine/data/factories.js';
import { updateStrategy, setDepthChart, releasePlayer, signPlayer, extendContract, scheduleTrainingSession, resolveTrainingSession, scoutProspectGroup, draftProspect, processUndraftedFreeAgents, proposeTrade, completeTrade, castHallOfFameVotes, generatePlayoffBracket, advanceSeasonPhase } from '@engine/data/actions.js';
import { simulateWeek, generatePlayoffSeeds, simulatePlayoffRound } from '@engine/simulation/engine.js';
import { runSeasonReview, runOffseason, advanceToNextSeason } from '@engine/simulation/season.js';
import { cpuPickProspect, convertProspectToPlayer } from '@engine/simulation/cpu-ai.js';
import { makeContractOffer, resolvePendingOffers, runFreeAgencyPeriod } from '@engine/simulation/free-agency.js';
import { calculateTradeValue, evaluateCpuTradeResponse } from '@engine/simulation/trade-value.js';
import { createRng } from '@engine/data/random.js';
import { bridgeLeague } from '../data/bridge.js';
import { LeagueContext } from './league-context.js';

function setDraftStatus(league, status) {
  if (league.draft) league.draft.status = status;
}

function markFreeAgencyComplete(league) {
  league.offseasonEvents = { ...(league.offseasonEvents || {}), freeAgencyComplete: true };
}

function incrementCoach(league, key, amount = 1) {
  league.coach ||= {};
  league.coach.frontOffice ||= { draftSelections: 0, firstRoundPicks: 0, tradesCompleted: 0, freeAgentSignings: 0 };
  league.coach.frontOffice[key] = (league.coach.frontOffice[key] || 0) + amount;
}

function updateCoachProfile(league, patch) {
  league.coach = { ...(league.coach || {}), ...patch };
}

export function LeagueProvider({ children, initialLeague = null, seed = 'afm26-mvp', playerTeamIndex = 0 }) {
  const [league] = useState(() =>
    initialLeague ?? createLeague(seed, { playerTeamIndex, playerPrestige: 4.25 })
  );
  const [rev, setRev] = useState(0);

  const bump = useCallback(() => setRev(r => r + 1), []);

  const actions = useMemo(() => ({
    updateCoachIdentity(patch) {
      updateCoachProfile(league, patch);
      bump();
    },
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
      if (league.teams.find(t => t.id === teamId)?.isPlayerControlled) incrementCoach(league, 'freeAgentSignings');
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
        if (team.isPlayerControlled) { incrementCoach(league, 'draftSelections'); if (pick.round === 1) incrementCoach(league, 'firstRoundPicks'); }
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
        if (team.isPlayerControlled) { incrementCoach(league, 'draftSelections'); if (pick.round === 1) incrementCoach(league, 'firstRoundPicks'); }
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
    startDraft() {
      setDraftStatus(league, 'in_progress');
      bump();
    },
    finalizeDraft() {
      try {
        processUndraftedFreeAgents(league);
        setDraftStatus(league, 'completed');
      } catch (e) {
        console.error('[finalizeDraft]', e);
        setDraftStatus(league, 'completed');
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
      const userId = league.teams.find(t => t.isPlayerControlled)?.id;
      incrementCoach(league, 'freeAgentSignings', result.signings.filter(signing => signing.teamId === userId).length);
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
        const trade = league.trades?.find(t => t.id === tradeId);
        const userId = league.teams.find(t => t.isPlayerControlled)?.id;
        if (result && trade && (trade.fromTeamId === userId || trade.toTeamId === userId)) incrementCoach(league, 'tradesCompleted');
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
        const userId = league.teams.find(t => t.isPlayerControlled)?.id;
        incrementCoach(league, 'freeAgentSignings', [...pending.signings, ...cpu.signings].filter(signing => signing.teamId === userId).length);
        markFreeAgencyComplete(league);
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

        advanceToNextSeason(league);
        bump();
        return true;
      } catch (e) {
        console.error('[startNextSeason]', e);
        bump();
        return false;
      }
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

  const bridged = useMemo(() => ({ ...bridgeLeague(league), revision: rev }), [league, rev]);

  return (
    <LeagueContext.Provider value={{ ...bridged, actions }}>
      {children}
    </LeagueContext.Provider>
  );
}
