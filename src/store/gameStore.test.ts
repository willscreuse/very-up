import { createGame } from '@/game/engine';
import type { Team } from '@/game/types';
import { DEFAULT_SETTINGS, selectActiveGame, sortedGames, useGameStore } from '@/store/gameStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const teams: Team[] = [
  { id: 'A', name: 'Rouges', color: '#f00', players: [{ id: 'a1', name: 'Alice' }] },
  { id: 'B', name: 'Bleus', color: '#00f', players: [{ id: 'b1', name: 'Bob' }] },
];

const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState({ games: {}, activeId: null, lastSetup: null, recentCards: [] });
});

describe('plusieurs parties', () => {
  it('garde chaque partie séparément et reprend la bonne', () => {
    store().newGame(teams, DEFAULT_SETTINGS);
    const first = store().activeId!;
    store().dispatch({ type: 'START_TURN', now: 0 });

    store().newGame(teams, DEFAULT_SETTINGS);
    const second = store().activeId!;
    expect(second).not.toBe(first);
    expect(Object.keys(store().games)).toHaveLength(2);
    expect(selectActiveGame(store())!.phase).toBe('turnIntro');

    store().resumeGame(first);
    expect(selectActiveGame(store())!.phase).toBe('playing');
  });

  it('n’agit que sur la partie active', () => {
    store().newGame(teams, DEFAULT_SETTINGS);
    const first = store().activeId!;
    store().newGame(teams, DEFAULT_SETTINGS);
    store().dispatch({ type: 'START_TURN', now: 0 });
    expect(store().games[first].game.phase).toBe('turnIntro');
  });

  it('supprime une partie, et désactive l’écran de jeu si c’était la partie active', () => {
    store().newGame(teams, DEFAULT_SETTINGS);
    const id = store().activeId!;
    store().deleteGame(id);
    expect(store().games[id]).toBeUndefined();
    expect(store().activeId).toBeNull();
  });

  it('supprime uniquement les parties terminées', () => {
    store().newGame(teams, DEFAULT_SETTINGS);
    const ongoing = store().activeId!;
    store().newGame(teams, DEFAULT_SETTINGS);
    const done = store().activeId!;
    useGameStore.setState((s) => ({
      games: { ...s.games, [done]: { ...s.games[done], game: { ...s.games[done].game, phase: 'finished' } } },
    }));
    store().deleteFinishedGames();
    expect(Object.keys(store().games)).toEqual([ongoing]);
  });

  it('trie de la plus récente à la plus ancienne', () => {
    const g = createGame({ teams, settings: DEFAULT_SETTINGS, pool: [{ text: 'x' }], seed: 1 });
    const list = sortedGames({
      a: { id: 'a', createdAt: 0, updatedAt: 10, game: g },
      b: { id: 'b', createdAt: 0, updatedAt: 30, game: g },
    });
    expect(list.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('paquets et anti-répétition', () => {
  it('ne pioche que dans les paquets choisis', () => {
    store().newGame(teams, { ...DEFAULT_SETTINGS, packIds: ['animaux'], cardCount: 20 });
    const deck = selectActiveGame(store())!.deck;
    expect(deck).toHaveLength(20);
    expect(deck.every((c) => c.category === '🦒 Animaux')).toBe(true);
  });

  it('évite de ressortir les cartes de la partie précédente', () => {
    const settings = { ...DEFAULT_SETTINGS, packIds: ['animaux'], cardCount: 30 };
    store().newGame(teams, settings);
    const first = new Set(selectActiveGame(store())!.deck.map((c) => c.text));
    store().newGame(teams, settings);
    const second = selectActiveGame(store())!.deck.map((c) => c.text);
    expect(second.filter((t) => first.has(t))).toHaveLength(0);
    expect(store().recentCards).toHaveLength(60);
  });
});

describe('migration depuis la version à partie unique', () => {
  it('range l’ancienne partie dans la liste', () => {
    const migrate = useGameStore.persist.getOptions().migrate!;
    const old = createGame({ teams, settings: DEFAULT_SETTINGS, pool: [{ text: 'x' }], seed: 1 });
    const migrated = migrate({ game: old, lastSetup: null }, 1) as ReturnType<typeof store>;
    const saved = Object.values(migrated.games);
    expect(saved).toHaveLength(1);
    expect(saved[0].game).toEqual(old);
    expect(migrated.activeId).toBeNull();
  });

  it('ne crée rien s’il n’y avait pas de partie', () => {
    const migrate = useGameStore.persist.getOptions().migrate!;
    const migrated = migrate({ game: null, lastSetup: null }, 1) as ReturnType<typeof store>;
    expect(migrated.games).toEqual({});
  });
});
