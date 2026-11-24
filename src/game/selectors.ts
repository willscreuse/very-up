import { type Card, type GameState, type Player, type Team, type TurnEvent, ROUND_COUNT } from './types';

export function currentTeam(state: GameState): Team {
  return state.teams[state.teamIndex];
}

export function currentPlayer(state: GameState): Player {
  const team = currentTeam(state);
  return team.players[state.playerCursor[state.teamIndex] % team.players.length];
}

export function currentCard(state: GameState): Card | null {
  const id = state.pile[0];
  return id ? cardById(state, id) : null;
}

export function cardById(state: GameState, id: string): Card | null {
  return state.deck.find((c) => c.id === id) ?? null;
}

export function turnPoints(events: TurnEvent[], skipPenalty: number): number {
  return events.reduce(
    (sum, e) => sum + (e.result === 'found' ? 1 : -skipPenalty),
    0,
  );
}

export interface TeamScore {
  team: Team;
  perRound: number[];
  total: number;
}

/** Scores dérivés de l'historique, triés du meilleur au moins bon. */
export function scoreboard(state: GameState): TeamScore[] {
  const rows = state.teams.map((team) => {
    const perRound = Array.from({ length: ROUND_COUNT }, () => 0);
    for (const turn of state.history) {
      if (turn.teamId === team.id) {
        perRound[turn.round] += turnPoints(turn.events, state.settings.skipPenalty);
      }
    }
    return { team, perRound, total: perRound.reduce((a, b) => a + b, 0) };
  });
  return rows.sort((a, b) => b.total - a.total);
}

export interface PlayerStat {
  player: Player;
  team: Team;
  found: number;
}

/** Joueur ayant fait deviner le plus de cartes sur la partie. */
export function mvp(state: GameState): PlayerStat | null {
  const stats = new Map<string, PlayerStat>();
  for (const turn of state.history) {
    const team = state.teams.find((t) => t.id === turn.teamId);
    const player = team?.players.find((p) => p.id === turn.playerId);
    if (!team || !player) continue;
    const stat = stats.get(player.id) ?? { player, team, found: 0 };
    stat.found += turn.events.filter((e) => e.result === 'found').length;
    stats.set(player.id, stat);
  }
  let best: PlayerStat | null = null;
  for (const s of stats.values()) if (!best || s.found > best.found) best = s;
  return best;
}
