import { createGame, gameReducer, writingOrder } from './engine';
import { currentPlayer, currentTeam, scoreboard } from './selectors';
import type { GameAction, GameState, Team } from './types';

const teams: Team[] = [
  { id: 'A', name: 'Rouges', color: '#f00', players: [{ id: 'a1', name: 'Alice' }, { id: 'a2', name: 'Arthur' }] },
  { id: 'B', name: 'Bleus', color: '#00f', players: [{ id: 'b1', name: 'Bob' }] },
];
const pool = Array.from({ length: 10 }, (_, i) => ({ text: `Carte ${i}` }));

function newGame(cardCount = 4, skipPenalty = 0): GameState {
  return createGame({ teams, pool, seed: 42, settings: { turnSeconds: 30, cardCount, skipPenalty } });
}

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

const start: GameAction = { type: 'START_TURN', now: 1000 };

describe('createGame', () => {
  it('pioche le bon nombre de cartes et prépare la manche 1', () => {
    const g = newGame(4);
    expect(g.deck).toHaveLength(4);
    expect(g.pile).toHaveLength(4);
    expect(g.round).toBe(0);
    expect(g.phase).toBe('turnIntro');
  });

  it('est déterministe pour une même graine', () => {
    expect(newGame().pile).toEqual(newGame().pile);
  });

  it('pioche d’abord les cartes qui n’ont pas été jouées récemment', () => {
    const recent = pool.slice(0, 7).map((c) => c.text); // Carte 0 … Carte 6
    const g = createGame({ teams, pool, seed: 3, recent, settings: { turnSeconds: 30, cardCount: 5, skipPenalty: 0 } });
    const texts = g.deck.map((c) => c.text);
    // Les 3 cartes jamais jouées, puis les 2 plus anciennes parmi les récentes.
    expect(texts.slice(0, 3).sort()).toEqual(['Carte 7', 'Carte 8', 'Carte 9']);
    expect(texts.slice(3)).toEqual(['Carte 0', 'Carte 1']);
  });

  it('refuse une équipe vide', () => {
    expect(() =>
      createGame({ teams: [teams[0], { ...teams[1], players: [] }], pool, seed: 1, settings: { turnSeconds: 30, cardCount: 4, skipPenalty: 0 } }),
    ).toThrow();
  });
});

describe('déroulé d’un tour', () => {
  it('démarre le chrono', () => {
    const g = run(newGame(), start);
    expect(g.phase).toBe('playing');
    expect(g.turnEndsAt).toBe(31000);
  });

  it('retire une carte trouvée et remet une carte passée sous le paquet', () => {
    const g0 = run(newGame(), start);
    const [first, second] = g0.pile;
    const g1 = run(g0, { type: 'SKIP' });
    expect(g1.pile[0]).toBe(second);
    expect(g1.pile[g1.pile.length - 1]).toBe(first);
    const g2 = run(g1, { type: 'FOUND', now: 2000 });
    expect(g2.pile).not.toContain(second);
    expect(g2.currentTurn.map((e) => e.result)).toEqual(['skipped', 'found']);
  });

  it('annule la dernière action', () => {
    const g0 = run(newGame(), start);
    const afterUndo = run(g0, { type: 'FOUND', now: 2000 }, { type: 'SKIP' }, { type: 'UNDO' }, { type: 'UNDO' });
    expect(afterUndo.pile).toEqual(g0.pile);
    expect(afterUndo.currentTurn).toEqual([]);
  });

  it('termine le tour quand le temps est écoulé', () => {
    const g = run(newGame(), start, { type: 'FOUND', now: 2000 }, { type: 'TIME_UP' });
    expect(g.phase).toBe('turnSummary');
    expect(g.turnEndsAt).toBeNull();
  });

  it('passe à l’équipe suivante puis fait tourner les joueurs', () => {
    let g = run(newGame(), start, { type: 'TIME_UP' }, { type: 'CONFIRM_TURN' });
    expect(currentTeam(g).id).toBe('B');
    g = run(g, start, { type: 'TIME_UP' }, { type: 'CONFIRM_TURN' });
    expect(currentTeam(g).id).toBe('A');
    expect(currentPlayer(g).id).toBe('a2');
  });
});

describe('récapitulatif modifiable', () => {
  it('transforme une carte passée en trouvée (et inversement)', () => {
    const g0 = run(newGame(), start, { type: 'SKIP' }, { type: 'TIME_UP' });
    const skippedId = g0.currentTurn[0].cardId;
    const g1 = run(g0, { type: 'TOGGLE_EVENT', index: 0 });
    expect(g1.currentTurn[0].result).toBe('found');
    expect(g1.pile).not.toContain(skippedId);
    const g2 = run(g1, { type: 'TOGGLE_EVENT', index: 0 });
    expect(g2.pile).toContain(skippedId);
  });
});

describe('manches et score', () => {
  const findAll = (g: GameState) => {
    let s = run(g, start);
    while (s.phase === 'playing') s = run(s, { type: 'FOUND', now: 2000 });
    return run(s, { type: 'CONFIRM_TURN' });
  };

  it('enchaîne les 3 manches avec le même paquet puis termine', () => {
    let g = newGame(4);
    g = findAll(g);
    expect(g.phase).toBe('roundSummary');
    g = run(g, { type: 'NEXT_ROUND' });
    expect(g.round).toBe(1);
    expect([...g.pile].sort()).toEqual(g.deck.map((c) => c.id).sort());
    g = findAll(g);
    g = findAll(run(g, { type: 'NEXT_ROUND' }));
    expect(g.phase).toBe('finished');
    const board = scoreboard(g);
    expect(board.reduce((s, r) => s + r.total, 0)).toBe(12);
  });

  it('garde le temps restant pour la manche suivante quand le paquet est vidé', () => {
    let g = run(newGame(2), start); // fin du tour prévue à 31000
    g = run(g, { type: 'FOUND', now: 5000 }, { type: 'FOUND', now: 11000 });
    expect(g.carryOverMs).toBe(20000);
    g = run(g, { type: 'CONFIRM_TURN' }, { type: 'NEXT_ROUND' });
    expect(currentTeam(g).id).toBe('A');
    expect(currentPlayer(g).id).toBe('a1');
    g = run(g, { type: 'START_TURN', now: 50000 });
    expect(g.turnEndsAt).toBe(70000);
    expect(g.carryOverMs).toBeNull();
    // Le tour suivant revient à une durée normale et passe à l'équipe B.
    g = run(g, { type: 'TIME_UP' }, { type: 'CONFIRM_TURN' }, { type: 'START_TURN', now: 0 });
    expect(currentTeam(g).id).toBe('B');
    expect(g.turnEndsAt).toBe(30000);
  });

  it('ne garde pas de reliquat inférieur à 1 seconde', () => {
    let g = run(newGame(1), start, { type: 'FOUND', now: 30500 });
    g = run(g, { type: 'CONFIRM_TURN' });
    expect(g.carryOverMs).toBeNull();
    expect(currentTeam(g).id).toBe('B');
  });

  it('abandonne le reliquat si une correction remet une carte dans le paquet', () => {
    let g = run(newGame(1), start, { type: 'FOUND', now: 5000 });
    g = run(g, { type: 'TOGGLE_EVENT', index: 0 }, { type: 'CONFIRM_TURN' });
    expect(g.phase).toBe('turnIntro');
    expect(g.carryOverMs).toBeNull();
    expect(currentTeam(g).id).toBe('B');
  });

  it('applique la pénalité de passe', () => {
    const g = run(newGame(4, 1), start, { type: 'SKIP' }, { type: 'SKIP' }, { type: 'FOUND', now: 2000 }, { type: 'TIME_UP' }, { type: 'CONFIRM_TURN' });
    const a = scoreboard(g).find((r) => r.team.id === 'A')!;
    expect(a.total).toBe(-1);
  });
});

describe('cartes écrites par les joueurs', () => {
  // 3 joueurs au total : Alice, Arthur (équipe A) puis Bob (équipe B).
  const withCustom = (cardCount: number, perPlayer = 2, customPool = pool) =>
    createGame({
      teams,
      pool: customPool,
      seed: 5,
      settings: { turnSeconds: 30, cardCount, skipPenalty: 0, customCardsPerPlayer: perPlayer },
    });
  const submit = (texts: string[]): GameAction => ({ type: 'SUBMIT_CUSTOM_CARDS', texts });

  it('commence par l’étape d’écriture, joueur après joueur', () => {
    let g = withCustom(10);
    expect(g.phase).toBe('writing');
    expect(writingOrder(g).map((w) => w.player.id)).toEqual(['a1', 'a2', 'b1']);
    g = run(g, submit(['Zidane', 'Une licorne']));
    expect(g.writing!.playerIndex).toBe(1);
    expect(g.writing!.cards.every((c) => c.authorId === 'a1')).toBe(true);
    // On ne peut pas démarrer de tour pendant l'écriture.
    expect(run(g, start).phase).toBe('writing');
  });

  it('assemble le paquet : cartes perso complétées par les paquets', () => {
    const g = run(withCustom(10), submit(['A1', 'A2']), submit(['B1', 'B2']), submit(['C1', 'C2']));
    expect(g.phase).toBe('turnIntro');
    expect(g.writing).toBeNull();
    expect(g.deck).toHaveLength(10);
    const custom = g.deck.filter((c) => c.authorId);
    expect(custom.map((c) => c.text).sort()).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(custom.find((c) => c.text === 'C1')!.authorId).toBe('b1');
    expect([...g.pile].sort()).toEqual(g.deck.map((c) => c.id).sort());
  });

  it('garde toutes les cartes perso même au-delà du nombre de cartes choisi', () => {
    const g = run(withCustom(4), submit(['A1', 'A2']), submit(['B1', 'B2']), submit(['C1', 'C2']));
    expect(g.deck).toHaveLength(6);
    expect(g.deck.every((c) => c.authorId)).toBe(true);
  });

  it('fonctionne sans aucun paquet', () => {
    const g = run(withCustom(40, 2, []), submit(['A1', 'A2']), submit(['B1', 'B2']), submit(['C1', 'C2']));
    expect(g.deck).toHaveLength(6);
  });

  it('fusionne les doublons et nettoie les espaces', () => {
    const g = run(
      withCustom(6, 2, []),
      submit(['  Zinédine   Zidane ', 'Pizza']),
      submit(['zinédine zidane', 'Tour Eiffel']),
      submit(['Chat', '']),
    );
    expect(g.deck.map((c) => c.text).sort()).toEqual(['Chat', 'Pizza', 'Tour Eiffel', 'Zinédine Zidane']);
  });

  it('ignore une soumission vide', () => {
    const g = withCustom(10);
    expect(run(g, submit(['  ', '']))).toBe(g);
  });
});
