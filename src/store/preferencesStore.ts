import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/store/storage';

interface PreferencesStore {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  toggleSound: () => void;
  toggleHaptics: () => void;
}

/** Préférences de l'appareil, indépendantes de la partie en cours. */
export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
    }),
    {
      name: 'very-up/preferences',
      storage: persistStorage,
      partialize: ({ soundEnabled, hapticsEnabled }) => ({ soundEnabled, hapticsEnabled }),
    },
  ),
);
