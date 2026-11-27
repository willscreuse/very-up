import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { packLabel, PACKS } from '@/data/packs';
import { confirmAction } from '@/services/confirm';
import { type CustomCard, useCustomCards } from '@/store/customCardsStore';
import { colors, font, radius, spacing } from '@/theme/tokens';

/** Cartes créées par les joueurs, rangées par catégorie, avec suppression. */
export default function MyCards() {
  const cards = useCustomCards((s) => s.cards);
  const removeCard = useCustomCards((s) => s.removeCard);

  const groups = PACKS.map((pack) => ({
    pack,
    cards: cards
      .filter((c) => c.packId === pack.id)
      .sort((a, b) => a.text.localeCompare(b.text, 'fr')),
  })).filter((g) => g.cards.length > 0);
  // Carte rangée dans un paquet qui n'existe plus : on la montre quand même pour pouvoir la supprimer.
  const orphans = cards.filter((c) => !PACKS.some((p) => p.id === c.packId));

  const confirmDelete = (card: CustomCard) =>
    confirmAction({
      title: `Supprimer « ${card.text} » ?`,
      message: 'Elle ne sortira plus dans les prochaines parties.',
      confirmLabel: 'Supprimer',
      onConfirm: () => removeCard(card.id),
    });

  return (
    <Screen scroll>
      <Title>Mes cartes</Title>
      <Muted>
        Les cartes créées par les joueurs. Elles sont mélangées aux paquets de leur catégorie
        dans les prochaines parties.
      </Muted>

      {cards.length === 0 && (
        <Card>
          <Muted>
            Aucune carte pour l’instant. Active « Cartes écrites par les joueurs » en créant une
            partie : chaque nouvelle carte sera rangée ici.
          </Muted>
        </Card>
      )}

      {groups.map(({ pack, cards: list }) => (
        <Section key={pack.id} title={packLabel(pack)} cards={list} onDelete={confirmDelete} />
      ))}
      {orphans.length > 0 && <Section title="Autres" cards={orphans} onDelete={confirmDelete} />}

      <Button label="Retour" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

function Section({
  title,
  cards,
  onDelete,
}: {
  title: string;
  cards: CustomCard[];
  onDelete: (card: CustomCard) => void;
}) {
  return (
    <Card>
      <Text style={styles.section}>
        {title} · {cards.length}
      </Text>
      {cards.map((card) => (
        <Animated.View key={card.id} exiting={FadeOut} layout={LinearTransition} style={styles.item}>
          <Text style={styles.text} numberOfLines={2}>
            {card.text}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Supprimer ${card.text}`}
            hitSlop={12}
            onPress={() => onDelete(card)}
            style={styles.trash}>
            <Text style={styles.trashText}>🗑️</Text>
          </Pressable>
        </Animated.View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  text: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '700' },
  trash: { padding: spacing.xs },
  trashText: { fontSize: font.title - 4 },
});
