/** Nettoie les espaces superflus. */
export const normalizeText = (text: string) => text.trim().replace(/\s+/g, ' ');

/**
 * Clé de comparaison tolérante, pour repérer deux cartes identiques :
 * sans majuscules, accents, ponctuation ni article de tête.
 * « Le Roi Lion », « roi lion » et « Le roi-lion ! » donnent la même clé.
 */
export function cardKey(text: string): string {
  return normalizeText(text)
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(le|la|les|l|un|une|des|the) /, '')
    .replace(/ /g, '');
}
