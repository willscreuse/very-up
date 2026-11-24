// Registre des paquets de cartes.
// Pour ajouter un paquet : créer un fichier sur le modèle des autres, puis l'ajouter à PACKS.
import type { Card } from '@/game/types';

import { animaux } from './animaux';
import { celebrites } from './celebrites';
import { cuisine } from './cuisine';
import { enfants } from './enfants';
import { films } from './films';
import { metiers } from './metiers';
import { objets } from './objets';
import { personnages } from './personnages';
import { soiree } from './soiree';
import { type EraRange, inRange } from './eras';
import { cardText, cardYear, type Pack } from './types';

export * from './eras';
export { cardText, cardYear, type Pack, type PackCard } from './types';

/** Période choisie pour chaque paquet daté (absent = toutes les époques). */
export type PackEras = Record<string, EraRange>;

export const PACKS: Pack[] = [
  celebrites,
  personnages,
  films,
  animaux,
  metiers,
  objets,
  cuisine,
  enfants,
  soiree,
];

export const DEFAULT_PACK_IDS = ['celebrites', 'personnages', 'films'];

export function packById(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

/** Cartes d'un paquet restant dans la période choisie. */
export function packCards(pack: Pack, eras?: PackEras): string[] {
  const range = eras?.[pack.id];
  return pack.cards.filter((c) => !range || inRange(cardYear(c), range)).map(cardText);
}

/**
 * Réunit les cartes des paquets choisis, filtrées par période,
 * sans doublon (une même carte peut figurer dans deux paquets).
 */
export function buildPool(packIds: string[], eras?: PackEras): Omit<Card, 'id'>[] {
  const seen = new Set<string>();
  const pool: Omit<Card, 'id'>[] = [];
  for (const pack of PACKS) {
    if (!packIds.includes(pack.id)) continue;
    for (const text of packCards(pack, eras)) {
      const key = text.toLocaleLowerCase('fr');
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ text, category: `${pack.emoji} ${pack.name}` });
    }
  }
  return pool;
}
