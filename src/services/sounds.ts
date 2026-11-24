import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SOURCES = {
  found: require('@/assets/sounds/found.wav'),
  skip: require('@/assets/sounds/skip.wav'),
  tick: require('@/assets/sounds/tick.wav'),
  tock: require('@/assets/sounds/tock.wav'),
  timeUp: require('@/assets/sounds/timeup.wav'),
  start: require('@/assets/sounds/start.wav'),
  roundEnd: require('@/assets/sounds/roundend.wav'),
  victory: require('@/assets/sounds/victory.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

let players: Partial<Record<SoundName, AudioPlayer>> | null = null;

/** Précharge tous les sons une fois, pour une lecture sans latence. */
export function initSounds() {
  if (players) return;
  players = {};
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      players[name] = createAudioPlayer(SOURCES[name]);
    } catch {
      // Un son manquant ne doit jamais bloquer la partie.
    }
  }
}

export function playSound(name: SoundName) {
  if (!players) initSounds();
  const player = players?.[name];
  if (!player) return;
  try {
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // idem : on ignore silencieusement
  }
}
