// Générateur pseudo-aléatoire déterministe (mulberry32).
// L'état est un simple nombre stocké dans GameState : la partie reste
// sérialisable et les tests sont reproductibles.

export function nextRandom(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Mélange de Fisher-Yates. Ne modifie pas le tableau d'origine. */
export function shuffle<T>(items: readonly T[], rng: number): [T[], number] {
  const out = items.slice();
  let state = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const [r, next] = nextRandom(state);
    state = next;
    const j = Math.floor(r * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, state];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
