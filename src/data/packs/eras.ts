import { cardYear, type Pack } from './types';

export interface Era {
  label: string;
  /** Libellé court pour la frise. */
  short: string;
  from: number;
  to: number;
}

/**
 * Époques proposées pour les paquets datés. Des tranches plutôt que des années
 * libres : chaque époque contient assez de cartes pour une partie.
 */
export const ERAS: Era[] = [
  { label: 'Avant 1900', short: '< 1900', from: -Infinity, to: 1899 },
  { label: '1900 – 1959', short: '1900-59', from: 1900, to: 1959 },
  { label: '1960 – 1979', short: '60-70s', from: 1960, to: 1979 },
  { label: '1980 – 1999', short: '80-90s', from: 1980, to: 1999 },
  { label: '2000 – 2014', short: '2000-14', from: 2000, to: 2014 },
  { label: 'Depuis 2015', short: '2015+', from: 2015, to: Infinity },
];

/** Plage d'époques [première, dernière] (index dans ERAS, bornes incluses). */
export type EraRange = [number, number];

export const ALL_ERAS: EraRange = [0, ERAS.length - 1];

export function isDated(pack: Pack): boolean {
  return pack.cards.some((c) => cardYear(c) !== null);
}

export function eraIndexOf(year: number): number {
  return ERAS.findIndex((e) => year >= e.from && year <= e.to);
}

/** Nombre de cartes du paquet dans chaque époque. */
export function eraCounts(pack: Pack): number[] {
  const counts = ERAS.map(() => 0);
  for (const card of pack.cards) {
    const year = cardYear(card);
    if (year !== null) counts[eraIndexOf(year)]++;
  }
  return counts;
}

/** Une carte sans date est toujours gardée. */
export function inRange(year: number | null, range: EraRange): boolean {
  if (year === null) return true;
  const i = eraIndexOf(year);
  return i >= range[0] && i <= range[1];
}

export function isAllEras(range: EraRange | undefined): boolean {
  return !range || (range[0] === ALL_ERAS[0] && range[1] === ALL_ERAS[1]);
}

/** « 1960 – 1999 », « Depuis 1980 », « Avant 1960 », « Toutes les époques »… */
export function rangeLabel(range: EraRange | undefined): string {
  if (isAllEras(range)) return 'Toutes les époques';
  const [a, b] = range!;
  if (a === b) return ERAS[a].label;
  if (a === 0) return `Avant ${ERAS[b].to + 1}`;
  if (b === ERAS.length - 1) return `Depuis ${ERAS[a].from}`;
  return `${ERAS[a].from} – ${ERAS[b].to}`;
}

/**
 * Toucher une époque sur la frise :
 * - hors de la plage → on étend la plage jusqu'à elle ;
 * - dans une plage de plusieurs époques → on ne garde que celle-ci ;
 * - si c'est la seule époque choisie → on revient à toutes les époques.
 */
export function tapEra(range: EraRange | undefined, index: number): EraRange {
  const [a, b] = range ?? ALL_ERAS;
  if (isAllEras(range)) return [index, index];
  if (index < a) return [index, b];
  if (index > b) return [a, index];
  if (a === b) return ALL_ERAS;
  return [index, index];
}
