import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Sur le web, l'export (rendu côté serveur) exécute l'app dans Node.js, où `window`
 * n'existe pas : AsyncStorage y plante. On utilise alors un stockage vide.
 */
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const persistStorage = createJSONStorage(() => (isServer ? noopStorage : AsyncStorage));
