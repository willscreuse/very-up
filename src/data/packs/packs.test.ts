import {
  ALL_ERAS,
  buildPool,
  findExisting,
  cardText,
  cardYear,
  ERAS,
  eraCounts,
  isDated,
  PACKS,
  packById,
  rangeLabel,
  tapEra,
} from '@/data/packs';

describe('données des paquets', () => {
  it.each(PACKS.map((p) => [p.id, p] as const))('%s : pas de doublon', (_id, pack) => {
    const texts = pack.cards.map((c) => cardText(c).toLocaleLowerCase('fr'));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('les paquets datés sont Célébrités, Personnages et Films, avec une année pour chaque carte', () => {
    const dated = PACKS.filter(isDated);
    expect(dated.map((p) => p.id).sort()).toEqual(['celebrites', 'films', 'personnages']);
    for (const pack of dated) {
      for (const card of pack.cards) {
        const year = cardYear(card);
        expect(year).not.toBeNull();
        expect(year!).toBeLessThanOrEqual(new Date().getFullYear());
      }
    }
  });

  it('chaque époque utilisée contient de quoi jouer', () => {
    for (const pack of PACKS.filter(isDated)) {
      eraCounts(pack).forEach((n, i) => {
        // Les films n'existent pas avant 1900 : seule exception autorisée.
        if (pack.id === 'films' && i === 0) return;
        expect(n).toBeGreaterThanOrEqual(10);
      });
    }
  });
});

describe('frise des époques', () => {
  it('choisit une époque, puis étend la période', () => {
    let r = tapEra(undefined, 2); // depuis « toutes » : une seule époque
    expect(r).toEqual([2, 2]);
    r = tapEra(r, 4);
    expect(r).toEqual([2, 4]);
    r = tapEra(r, 1);
    expect(r).toEqual([1, 4]);
  });

  it('réduit à une époque si on touche dans la période, puis revient à toutes', () => {
    let r = tapEra([1, 4], 3);
    expect(r).toEqual([3, 3]);
    r = tapEra(r, 3);
    expect(r).toEqual(ALL_ERAS);
  });

  it('affiche des libellés lisibles', () => {
    expect(rangeLabel(undefined)).toBe('Toutes les époques');
    expect(rangeLabel([2, 3])).toBe('1960 – 1999');
    expect(rangeLabel([0, 1])).toBe('Avant 1960');
    expect(rangeLabel([3, ERAS.length - 1])).toBe('Depuis 1980');
    expect(rangeLabel([5, 5])).toBe('Depuis 2015');
  });
});

describe('construction de la pioche', () => {
  it('filtre les paquets datés par période et garde les autres intacts', () => {
    const films = packById('films')!;
    const pool = buildPool(['films', 'animaux'], { films: [2, 2] });
    const filmTexts = pool.filter((c) => c.category?.includes('Films')).map((c) => c.text);
    const expected = films.cards.filter((c) => {
      const y = cardYear(c)!;
      return y >= 1960 && y <= 1979;
    });
    expect(filmTexts).toHaveLength(expected.length);
    expect(pool.filter((c) => c.category?.includes('Animaux'))).toHaveLength(packById('animaux')!.cards.length);
  });

  it('sans période choisie, prend tout le paquet', () => {
    expect(buildPool(['celebrites'])).toHaveLength(packById('celebrites')!.cards.length);
  });
});

describe('cartes créées par les joueurs', () => {
  const playerCards = [
    { text: 'Shrek 2', packId: 'films' },
    { text: 'Tonton Michel', packId: 'personnages' },
  ];

  it('rejoignent la pioche de leur catégorie, marquées comme créées par un joueur', () => {
    const pool = buildPool(['films'], undefined, playerCards);
    const shrek = pool.find((c) => c.text === 'Shrek 2')!;
    expect(shrek.custom).toBe(true);
    expect(shrek.category).toContain('Films');
    // Pas de carte d'un paquet non choisi.
    expect(pool.some((c) => c.text === 'Tonton Michel')).toBe(false);
  });

  it('restent dans la pioche quelle que soit la période choisie', () => {
    const pool = buildPool(['films'], { films: [0, 0] }, playerCards);
    expect(pool.some((c) => c.text === 'Shrek 2')).toBe(true);
  });

  it('repère une carte qui existe déjà, aux accents, majuscules et articles près', () => {
    expect(findExisting('roi lion')?.pack.id).toBe('films');
    expect(findExisting('LE ROI-LION !')?.byPlayer).toBe(false);
    expect(findExisting('zinedine zidane')?.pack.id).toBe('celebrites');
    expect(findExisting('tonton michel', playerCards)).toEqual({ pack: packById('personnages'), byPlayer: true });
    expect(findExisting('Une carte toute neuve', playerCards)).toBeNull();
  });
});
