import { useCustomCards } from '@/store/customCardsStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const store = () => useCustomCards.getState();

beforeEach(() => useCustomCards.setState({ cards: [] }));

describe('bibliothèque des cartes des joueurs', () => {
  it('enregistre les nouvelles cartes dans leur catégorie', () => {
    const added = store().addCards([
      { text: '  Tonton   Michel ', packId: 'personnages' },
      { text: 'Shrek 2', packId: 'films' },
    ]);
    expect(added.map((c) => c.text)).toEqual(['Tonton Michel', 'Shrek 2']);
    expect(store().cards.map((c) => c.packId)).toEqual(['personnages', 'films']);
  });

  it('refuse les cartes déjà présentes dans les paquets ou la bibliothèque', () => {
    store().addCards([{ text: 'Tonton Michel', packId: 'personnages' }]);
    const added = store().addCards([
      { text: 'tonton michel', packId: 'celebrites' }, // déjà créée
      { text: 'Le Roi Lion', packId: 'films' }, // déjà dans un paquet
      { text: 'Titanic', packId: 'personnages' }, // déjà dans un autre paquet
      { text: 'Mamie Jeanne', packId: 'personnages' },
      { text: 'mamie jeanne', packId: 'personnages' }, // doublon dans le même envoi
      { text: '   ', packId: 'films' },
    ]);
    expect(added.map((c) => c.text)).toEqual(['Mamie Jeanne']);
    expect(store().cards).toHaveLength(2);
  });

  it('supprime une carte', () => {
    const [card] = store().addCards([{ text: 'Mamie Jeanne', packId: 'personnages' }]);
    store().removeCard(card.id);
    expect(store().cards).toEqual([]);
  });
});
