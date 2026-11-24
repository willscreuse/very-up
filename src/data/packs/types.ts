/**
 * Une carte de paquet : un simple texte, ou un texte daté.
 * L'année est celle où la personne, le personnage ou l'œuvre est devenu célèbre
 * auprès du grand public (sortie du film, début de la série, pic de notoriété…).
 */
export type PackCard = string | { text: string; year: number };

export interface Pack {
  /** Identifiant stable : il est sauvegardé dans les parties, ne pas le renommer. */
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Petite étiquette facultative (« Facile », « 16+ »…). */
  badge?: string;
  cards: PackCard[];
}

export const cardText = (card: PackCard) => (typeof card === 'string' ? card : card.text);
export const cardYear = (card: PackCard) => (typeof card === 'string' ? null : card.year);
