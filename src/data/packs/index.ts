// Registre des paquets de cartes.
// Pour ajouter un paquet : créer un fichier sur le modèle des autres, puis l'ajouter à PACKS.
import { cardKey } from '@/game/text';
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

/** Libellé affiché pour la catégorie d'un paquet (« 🎬 Films & séries »). */
export const packLabel = (pack: Pack) => `${pack.emoji} ${pack.name}`;

/** Carte créée par un joueur et rangée dans un paquet (voir le store des cartes perso). */
export interface PlayerCard {
  text: string;
  packId: string;
}

/**
 * Réunit les cartes des paquets choisis, filtrées par période, et les cartes
 * créées par les joueurs dans ces paquets, sans doublon (une même carte peut
 * figurer dans deux paquets). Les cartes des joueurs n'ont pas de date :
 * elles sont gardées quelle que soit la période.
 */
export function buildPool(
  packIds: string[],
  eras?: PackEras,
  playerCards: PlayerCard[] = [],
): Omit<Card, 'id'>[] {
  const seen = new Set<string>();
  const pool: Omit<Card, 'id'>[] = [];
  const add = (card: Omit<Card, 'id'>) => {
    const key = cardKey(card.text);
    if (seen.has(key)) return;
    seen.add(key);
    pool.push(card);
  };
  for (const pack of PACKS) {
    if (!packIds.includes(pack.id)) continue;
    for (const text of packCards(pack, eras)) add({ text, category: packLabel(pack) });
    for (const c of playerCards) {
      if (c.packId === pack.id) add({ text: c.text, category: packLabel(pack), custom: true });
    }
  }
  return pool;
}

let packIndex: Map<string, Pack> | null = null;

/**
 * Cherche une carte déjà existante (même texte, aux accents, majuscules et
 * articles près) dans les paquets puis dans les cartes des joueurs.
 * Renvoie où elle se trouve, ou null si la carte est nouvelle.
 */
export function findExisting(
  text: string,
  playerCards: PlayerCard[] = [],
): { pack: Pack; byPlayer: boolean } | null {
  const key = cardKey(text);
  if (!key) return null;
  if (!packIndex) {
    packIndex = new Map();
    for (const pack of PACKS) {
      for (const c of pack.cards) {
        const k = cardKey(cardText(c));
        if (!packIndex.has(k)) packIndex.set(k, pack);
      }
    }
  }
  const pack = packIndex.get(key);
  if (pack) return { pack, byPlayer: false };
  const mine = playerCards.find((c) => cardKey(c.text) === key);
  const minePack = mine && packById(mine.packId);
  return minePack ? { pack: minePack, byPlayer: true } : null;
}
