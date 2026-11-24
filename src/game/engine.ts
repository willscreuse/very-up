import { shuffle } from './random';
import {
  type Card,
  CUSTOM_CATEGORY,
  CUSTOM_CARD_MAX_LENGTH,
  type GameAction,
  type GameState,
  type Settings,
  type Team,
  MIN_CARRY_OVER_MS,
  ROUND_COUNT,
} from './types';

export interface NewGameInput {
  teams: Team[];
  settings: Settings;
  /** Réserve de cartes dans laquelle on pioche le paquet de la partie. */
  pool: Omit<Card, 'id'>[];
  seed: number;
  /**
   * Textes des cartes jouées récemment (du plus ancien au plus récent).
   * Elles ne sont piochées qu'en dernier, les plus anciennes d'abord.
   */
  recent?: string[];
}

export function createGame({ teams, settings, pool, seed, recent = [] }: NewGameInput): GameState {
  if (teams.length < 2) throw new Error('Il faut au moins 2 équipes.');
  if (teams.some((t) => t.players.length === 0)) {
    throw new Error('Chaque équipe doit avoir au moins un joueur.');
  }

  const [shuffledPool, rng1] = shuffle(pool, seed);
  const recentRank = new Map(recent.map((text, i) => [text, i]));
  const fresh = shuffledPool.filter((c) => !recentRank.has(c.text));
  const seenBefore = shuffledPool
    .filter((c) => recentRank.has(c.text))
    .sort((a, b) => recentRank.get(a.text)! - recentRank.get(b.text)!);
  const deck: Card[] = [...fresh, ...seenBefore]
    .slice(0, Math.min(settings.cardCount, pool.length))
    .map((c, i) => ({ ...c, id: `c${i}` }));
  const [pile, rng2] = shuffle(
    deck.map((c) => c.id),
    rng1,
  );
  const writing = (settings.customCardsPerPlayer ?? 0) > 0;

  return {
    phase: writing ? 'writing' : 'turnIntro',
    writing: writing ? { playerIndex: 0, cards: [] } : null,
    settings,
    teams,
    deck,
    round: 0,
    pile,
    teamIndex: 0,
    playerCursor: teams.map(() => 0),
    currentTurn: [],
    turnEndsAt: null,
    carryOverMs: null,
    history: [],
    rng: rng2,
  };
}

/** Ordre d'écriture : les joueurs de chaque équipe, équipe après équipe. */
export function writingOrder(state: GameState) {
  return state.teams.flatMap((team) => team.players.map((player) => ({ team, player })));
}

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');
const key = (text: string) => normalize(text).toLocaleLowerCase('fr');

/** Assemble le paquet final : cartes des joueurs, complétées par celles des paquets. */
function finishWriting(state: GameState, cards: { authorId: string; text: string }[]): GameState {
  const seen = new Set<string>();
  const custom: Omit<Card, 'id'>[] = [];
  for (const c of cards) {
    if (seen.has(key(c.text))) continue; // deux joueurs ont eu la même idée
    seen.add(key(c.text));
    custom.push({ text: normalize(c.text), category: CUSTOM_CATEGORY, authorId: c.authorId });
  }
  const fillCount = Math.max(0, state.settings.cardCount - custom.length);
  const fill = state.deck.filter((c) => !seen.has(key(c.text))).slice(0, fillCount);
  const deck: Card[] = [...custom, ...fill].map((c, i) => ({ ...c, id: `c${i}` }));
  const [pile, rng] = shuffle(
    deck.map((c) => c.id),
    state.rng,
  );
  return { ...state, deck, pile, rng, writing: null, phase: 'turnIntro' };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SUBMIT_CUSTOM_CARDS': {
      if (state.phase !== 'writing' || !state.writing) return state;
      const order = writingOrder(state);
      const author = order[state.writing.playerIndex];
      const texts = action.texts
        .map((t) => normalize(t).slice(0, CUSTOM_CARD_MAX_LENGTH))
        .filter(Boolean);
      if (!author || texts.length === 0) return state;
      const cards = [...state.writing.cards, ...texts.map((text) => ({ authorId: author.player.id, text }))];
      const playerIndex = state.writing.playerIndex + 1;
      if (playerIndex >= order.length) return finishWriting(state, cards);
      return { ...state, writing: { playerIndex, cards } };
    }

    case 'START_TURN': {
      if (state.phase !== 'turnIntro' || state.pile.length === 0) return state;
      const durationMs = state.carryOverMs ?? state.settings.turnSeconds * 1000;
      return {
        ...state,
        phase: 'playing',
        currentTurn: [],
        turnEndsAt: action.now + durationMs,
        carryOverMs: null,
      };
    }

    case 'FOUND': {
      if (state.phase !== 'playing' || state.pile.length === 0) return state;
      const [cardId, ...rest] = state.pile;
      const currentTurn = [...state.currentTurn, { cardId, result: 'found' as const }];
      // Plus aucune carte : la manche est terminée, le tour s'arrête
      // et on mémorise le temps restant pour la manche suivante.
      if (rest.length === 0) {
        const left = state.turnEndsAt === null ? 0 : Math.max(0, state.turnEndsAt - action.now);
        return {
          ...state,
          pile: rest,
          currentTurn,
          phase: 'turnSummary',
          turnEndsAt: null,
          carryOverMs: left,
        };
      }
      return { ...state, pile: rest, currentTurn };
    }

    case 'SKIP': {
      if (state.phase !== 'playing' || state.pile.length === 0) return state;
      const [cardId, ...rest] = state.pile;
      return {
        ...state,
        pile: [...rest, cardId], // la carte retourne sous le paquet
        currentTurn: [...state.currentTurn, { cardId, result: 'skipped' }],
      };
    }

    case 'UNDO': {
      if (state.phase !== 'playing' || state.currentTurn.length === 0) return state;
      const last = state.currentTurn[state.currentTurn.length - 1];
      const currentTurn = state.currentTurn.slice(0, -1);
      const pile =
        last.result === 'found'
          ? [last.cardId, ...state.pile]
          : [last.cardId, ...state.pile.slice(0, -1)];
      return { ...state, pile, currentTurn };
    }

    case 'TIME_UP': {
      if (state.phase !== 'playing') return state;
      return { ...state, phase: 'turnSummary', turnEndsAt: null, carryOverMs: null };
    }

    case 'TOGGLE_EVENT': {
      // Correction dans le récap (litige, swipe raté…).
      if (state.phase !== 'turnSummary') return state;
      const event = state.currentTurn[action.index];
      if (!event) return state;
      const toFound = event.result === 'skipped';
      // Une même carte peut avoir été passée plusieurs fois : on n'autorise
      // le passage en « trouvée » que si elle est encore dans le paquet.
      if (toFound && !state.pile.includes(event.cardId)) return state;
      const currentTurn = state.currentTurn.map((e, i) =>
        i === action.index ? { ...e, result: toFound ? ('found' as const) : ('skipped' as const) } : e,
      );
      const pile = toFound
        ? state.pile.filter((id) => id !== event.cardId)
        : [...state.pile, event.cardId];
      return { ...state, currentTurn, pile };
    }

    case 'CONFIRM_TURN': {
      if (state.phase !== 'turnSummary') return state;
      const team = state.teams[state.teamIndex];
      const player = team.players[state.playerCursor[state.teamIndex] % team.players.length];
      const history = [
        ...state.history,
        { round: state.round, teamId: team.id, playerId: player.id, events: state.currentTurn },
      ];
      const roundOver = state.pile.length === 0;
      const gameOver = roundOver && state.round + 1 >= ROUND_COUNT;
      const phase = !roundOver ? 'turnIntro' : gameOver ? 'finished' : 'roundSummary';

      // Paquet vidé avant la fin du chrono : la même équipe (et le même joueur)
      // enchaîne la manche suivante avec le temps qui lui restait.
      const carryOverMs =
        roundOver && !gameOver && (state.carryOverMs ?? 0) >= MIN_CARRY_OVER_MS
          ? state.carryOverMs
          : null;
      if (carryOverMs !== null) {
        return { ...state, history, currentTurn: [], phase, carryOverMs };
      }

      const playerCursor = state.playerCursor.map((c, i) => (i === state.teamIndex ? c + 1 : c));
      const teamIndex = (state.teamIndex + 1) % state.teams.length;
      return { ...state, history, playerCursor, teamIndex, currentTurn: [], phase, carryOverMs: null };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'roundSummary') return state;
      const [pile, rng] = shuffle(
        state.deck.map((c) => c.id),
        state.rng,
      );
      return { ...state, round: state.round + 1, pile, rng, phase: 'turnIntro' };
    }

    default:
      return state;
  }
}
