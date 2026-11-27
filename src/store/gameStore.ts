import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildPool, DEFAULT_PACK_IDS } from '@/data/packs';
import { createGame, gameReducer } from '@/game/engine';
import { randomSeed } from '@/game/random';
import type { GameAction, GameState, Settings, Team } from '@/game/types';
import { useCustomCards } from '@/store/customCardsStore';
import { persistStorage } from '@/store/storage';

export const DEFAULT_SETTINGS: Settings = {
  turnSeconds: 30,
  cardCount: 40,
  skipPenalty: 0,
  packIds: DEFAULT_PACK_IDS,
};

/** Nombre de cartes mémorisées pour éviter de les ressortir trop vite. */
const RECENT_LIMIT = 400;

export interface SavedGame {
  id: string;
  createdAt: number;
  updatedAt: number;
  game: GameState;
}

interface GameStore {
  /** Toutes les parties sauvegardées, en cours ou terminées. */
  games: Record<string, SavedGame>;
  /** Partie affichée sur l'écran de jeu. */
  activeId: string | null;
  /** Dernière configuration, pour « Rejouer avec les mêmes équipes ». */
  lastSetup: { teams: Team[]; settings: Settings } | null;
  /** Cartes piochées lors des dernières parties, de la plus ancienne à la plus récente. */
  recentCards: string[];
  hydrated: boolean;
  newGame: (teams: Team[], settings: Settings) => void;
  resumeGame: (id: string) => void;
  /** Quitte l'écran de jeu sans supprimer la partie. */
  leaveGame: () => void;
  deleteGame: (id: string) => void;
  deleteFinishedGames: () => void;
  dispatch: (action: GameAction) => void;
}

const newId = () => `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      games: {},
      activeId: null,
      lastSetup: null,
      recentCards: [],
      hydrated: false,

      newGame: (teams, settings) =>
        set((s) => {
          const id = newId();
          const now = Date.now();
          const pool = buildPool(
            settings.packIds ?? DEFAULT_PACK_IDS,
            settings.packEras,
            useCustomCards.getState().cards,
          );
          const game = createGame({ teams, settings, pool, seed: randomSeed(), recent: s.recentCards });
          const drawn = new Set(game.deck.map((c) => c.text));
          const recentCards = [
            ...s.recentCards.filter((t) => !drawn.has(t)),
            ...drawn,
          ].slice(-RECENT_LIMIT);
          return {
            games: { ...s.games, [id]: { id, createdAt: now, updatedAt: now, game } },
            activeId: id,
            lastSetup: { teams, settings },
            recentCards,
          };
        }),

      resumeGame: (id) => set((s) => (s.games[id] ? { activeId: id } : s)),

      leaveGame: () => set({ activeId: null }),

      deleteGame: (id) =>
        set((s) => {
          const { [id]: _removed, ...games } = s.games;
          return { games, activeId: s.activeId === id ? null : s.activeId };
        }),

      deleteFinishedGames: () =>
        set((s) => ({
          games: Object.fromEntries(
            Object.entries(s.games).filter(([, g]) => g.game.phase !== 'finished'),
          ),
        })),

      dispatch: (action) =>
        set((s) => {
          const saved = s.activeId ? s.games[s.activeId] : null;
          if (!saved) return s;
          const game = gameReducer(saved.game, action);
          if (game === saved.game) return s;
          return {
            games: { ...s.games, [saved.id]: { ...saved, game, updatedAt: Date.now() } },
          };
        }),
    }),
    {
      name: 'very-up/game',
      version: 2,
      storage: persistStorage,
      partialize: ({ games, activeId, lastSetup, recentCards }) => ({
        games,
        activeId,
        lastSetup,
        recentCards,
      }),
      migrate: (persisted, version) => {
        // v1 : une seule partie sous la clé `game` → on la range dans la liste.
        if (version < 2) {
          const old = persisted as { game?: GameState | null; lastSetup?: GameStore['lastSetup'] };
          const games: Record<string, SavedGame> = {};
          if (old.game) {
            const id = newId();
            const now = Date.now();
            games[id] = { id, createdAt: now, updatedAt: now, game: old.game };
          }
          return { games, activeId: null, lastSetup: old.lastSetup ?? null, recentCards: [] };
        }
        return persisted as GameStore;
      },
      onRehydrateStorage: () => () => useGameStore.setState({ hydrated: true }),
    },
  ),
);

/** Partie active (ou null). */
export const selectActiveGame = (s: GameStore) =>
  s.activeId ? (s.games[s.activeId]?.game ?? null) : null;

/** Parties triées de la plus récemment jouée à la plus ancienne. */
export const sortedGames = (games: Record<string, SavedGame>) =>
  Object.values(games).sort((a, b) => b.updatedAt - a.updatedAt);
