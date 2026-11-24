// Point d'entrée unique pour les retours sensoriels (son + vibration).
// Les écrans appellent `feedback.found()` etc. sans se soucier des préférences.
import * as Haptics from 'expo-haptics';

import { playSound, type SoundName } from '@/services/sounds';
import { usePreferences } from '@/store/preferencesStore';

const safe = (fn: () => Promise<unknown>) => {
  fn().catch(() => {});
};

function emit(sound: SoundName | null, haptic: (() => Promise<unknown>) | null) {
  const { soundEnabled, hapticsEnabled } = usePreferences.getState();
  if (sound && soundEnabled) playSound(sound);
  if (haptic && hapticsEnabled) safe(haptic);
}

export const feedback = {
  found: () => emit('found', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  skip: () => emit('skip', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Tic-tac alterné sur les dernières secondes. */
  tick: (secondsLeft: number) =>
    emit(secondsLeft % 2 === 0 ? 'tick' : 'tock', () => Haptics.selectionAsync()),
  timeUp: () => emit('timeUp', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  turnStart: () => emit('start', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  roundEnd: () => emit('roundEnd', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  victory: () => emit('victory', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  tap: () => emit(null, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Seuil de swipe franchi : petit « clic » pour confirmer. */
  threshold: () => emit(null, () => Haptics.selectionAsync()),
};
