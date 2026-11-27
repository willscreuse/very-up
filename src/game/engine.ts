import { shuffle } from './random';
import {
  type Card,
  CUSTOM_CATEGORY,
  CUSTOM_CARD_MAX_LENGTH,
  type GameAction,
  type GameState,
  type Settings,
  type Team,
  ROUND_COUNT,
  type WrittenCard,
} from './types';
import { cardKey, normalizeText } from './text';

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
    keepsTurn: false,
    history: [],
    rng: rng2,
  };
}

/** Ordre d'écriture : les joueurs de chaque équipe, équipe après équipe. */
export function writingOrder(state: GameState) {
  return state.teams.flatMap((team) => team.players.map((player) => ({ team, player })));
}

/** Assemble le paquet final : cartes des joueurs, complétées par celles des paquets. */
function finishWriting(state: GameState, cards: WrittenCard[]): GameState {
  const seen = new Set<string>();
  const custom: Omit<Card, 'id'>[] = [];
  for (const c of cards) {
    const k = cardKey(c.text);
    if (seen.has(k)) continue; // deux joueurs ont eu la même idée
    seen.add(k);
    custom.push({
      text: normalizeText(c.text),
      category: c.category ?? CUSTOM_CATEGORY,
      authorId: c.authorId,
      custom: true,
    });
  }
  const fillCount = Math.max(0, state.settings.cardCount - custom.length);
  const fill = state.deck.filter((c) => !seen.has(cardKey(c.text))).slice(0, fillCount);
  const deck: Card[] = [...custom, ...fill].map((c, i) => ({ ...c, id: `c${i}` }));
  const [pile, rng] = shuffle(
    deck.map((c) => c.id),
    state.rng,
  );
  return { ...state, deck, pile, rng, writing: null, phase: 'turnIntro' };
}

/** Remélange le paquet en s'assurant que la carte du dessus change. */
function reshuffle(pile: string[], rng: number): [string[], number] {
  const [out, next] = shuffle(pile, rng);
  if (out.length > 1 && out[0] === pile[0]) [out[0], out[out.length - 1]] = [out[out.length - 1], out[0]];
  return [out, next];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SUBMIT_CUSTOM_CARDS': {
      if (state.phase !== 'writing' || !state.writing) return state;
      const order = writingOrder(state);
      const author = order[state.writing.playerIndex];
      const written: WrittenCard[] = action.cards
        .map((c) => ({
          authorId: author?.player.id ?? '',
          text: normalizeText(c.text).slice(0, CUSTOM_CARD_MAX_LENGTH),
          ...(c.category ? { category: c.category } : {}),
        }))
        .filter((c) => c.text);
      if (!author || written.length === 0) return state;
      const cards = [...state.writing.cards, ...written];
      const playerIndex = state.writing.playerIndex + 1;
      if (playerIndex >= order.length) return finishWriting(state, cards);
      return { ...state, writing: { playerIndex, cards } };
    }

    case 'START_TURN': {
      if (state.phase !== 'turnIntro' || state.pile.length === 0) return state;
      // Chaque tour dure le temps complet, même pour l'équipe qui enchaîne une nouvelle manche.
      return {
        ...state,
        phase: 'playing',
        currentTurn: [],
        turnEndsAt: action.now + state.settings.turnSeconds * 1000,
        keepsTurn: false,
      };
    }

    case 'FOUND': {
      if (state.phase !== 'playing' || state.pile.length === 0) return state;
      const [cardId, ...rest] = state.pile;
      const currentTurn = [...state.currentTurn, { cardId, result: 'found' as const }];
      // Plus aucune carte : la manche est terminée, le tour s'arrête et
      // cette équipe commencera la manche suivante.
      if (rest.length === 0) {
        return {
          ...state,
          pile: rest,
          currentTurn,
          phase: 'turnSummary',
          turnEndsAt: null,
          keepsTurn: true,
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
      return { ...state, phase: 'turnSummary', turnEndsAt: null, keepsTurn: false };
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
      // Une correction qui remet une carte dans le paquet : la manche continue.
      return { ...state, currentTurn, pile, keepsTurn: state.keepsTurn && pile.length === 0 };
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
      // commence la manche suivante, avec un chrono complet.
      if (roundOver && !gameOver && state.keepsTurn) {
        return { ...state, history, currentTurn: [], phase, keepsTurn: true };
      }

      // La carte que le joueur avait en main (ni trouvée ni passée) ne doit pas
      // arriver directement à l'équipe suivante : on remélange le paquet.
      const [pile, rng] = roundOver ? [state.pile, state.rng] : reshuffle(state.pile, state.rng);
      const playerCursor = state.playerCursor.map((c, i) => (i === state.teamIndex ? c + 1 : c));
      const teamIndex = (state.teamIndex + 1) % state.teams.length;
      return {
        ...state,
        history,
        pile,
        rng,
        playerCursor,
        teamIndex,
        currentTurn: [],
        phase,
        keepsTurn: false,
      };
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
