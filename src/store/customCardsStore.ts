import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { findExisting } from '@/data/packs';
import { CUSTOM_CARD_MAX_LENGTH } from '@/game/types';
import { normalizeText } from '@/game/text';
import { persistStorage } from '@/store/storage';

/** Carte créée par un joueur, rangée dans la catégorie d'un paquet. */
export interface CustomCard {
  id: string;
  text: string;
  packId: string;
  createdAt: number;
}

interface CustomCardsStore {
  cards: CustomCard[];
  /**
   * Ajoute des cartes à la bibliothèque. Celles qui existent déjà (dans un paquet
   * ou parmi les cartes des joueurs) sont ignorées. Renvoie les cartes ajoutées.
   */
  addCards: (cards: { text: string; packId: string }[]) => CustomCard[];
  removeCard: (id: string) => void;
}

const newId = () => `u${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export const useCustomCards = create<CustomCardsStore>()(
  persist(
    (set, get) => ({
      cards: [],

      addCards: (input) => {
        const added: CustomCard[] = [];
        const now = Date.now();
        for (const { text, packId } of input) {
          const clean = normalizeText(text).slice(0, CUSTOM_CARD_MAX_LENGTH);
          if (!clean) continue;
          if (findExisting(clean, [...get().cards, ...added])) continue;
          added.push({ id: newId(), text: clean, packId, createdAt: now });
        }
        if (added.length > 0) set((s) => ({ cards: [...s.cards, ...added] }));
        return added;
      },

      removeCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),
    }),
    {
      name: 'very-up/custom-cards',
      storage: persistStorage,
      partialize: ({ cards }) => ({ cards }),
    },
  ),
);
