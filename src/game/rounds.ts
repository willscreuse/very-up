export interface RoundRule {
  title: string;
  short: string;
  description: string;
  emoji: string;
}

export const ROUNDS: RoundRule[] = [
  {
    title: 'Manche 1',
    short: 'Description libre',
    description: 'Décris la carte avec autant de mots que tu veux, sans prononcer le mot lui-même.',
    emoji: '🗣️',
  },
  {
    title: 'Manche 2',
    short: 'Un seul mot',
    description: 'Un seul mot pour faire deviner. Ton équipe n’a droit qu’à une proposition !',
    emoji: '☝️',
  },
  {
    title: 'Manche 3',
    short: 'Mimes uniquement',
    description: 'Aucun mot, aucun son : uniquement des gestes et des mimes.',
    emoji: '🤫',
  },
];
