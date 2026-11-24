import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EraTimeline } from '@/components/era-timeline';
import { isDated, PACKS, type PackEras, packCards, rangeLabel } from '@/data/packs';
import { feedback } from '@/services/feedback';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function PackPicker({
  selected,
  onChange,
  eras,
  onErasChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  eras: PackEras;
  onErasChange: (eras: PackEras) => void;
}) {
  const allSelected = selected.length === PACKS.length;
  const datedSelected = PACKS.filter((p) => selected.includes(p.id) && isDated(p));

  const toggle = (id: string) => {
    feedback.tap();
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>Paquets de cartes</Text>
        <Pressable
          hitSlop={8}
          onPress={() => {
            feedback.tap();
            onChange(allSelected ? [] : PACKS.map((p) => p.id));
          }}>
          <Text style={styles.link}>{allSelected ? 'Tout retirer' : 'Tout choisir'}</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {PACKS.map((pack) => {
          const on = selected.includes(pack.id);
          return (
            <Pressable
              key={pack.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${pack.name}, ${pack.cards.length} cartes. ${pack.description}`}
              onPress={() => toggle(pack.id)}
              style={({ pressed }) => [styles.tile, on && styles.tileOn, pressed && styles.pressed]}>
              {on && (
                <View style={styles.check}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
              <Text style={styles.emoji}>{pack.emoji}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {pack.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.count}>{packCards(pack, eras).length} cartes</Text>
                {pack.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pack.badge}</Text>
                  </View>
                )}
              </View>
              {eras[pack.id] && <Text style={styles.period}>📅 {rangeLabel(eras[pack.id])}</Text>}
            </Pressable>
          );
        })}
      </View>

      {datedSelected.length > 0 && (
        <View style={styles.periods}>
          <Text style={styles.label}>📅 Périodes</Text>
          <Text style={styles.help}>
            Adapte les cartes à la culture de chacun. Touche une époque pour la choisir, puis une
            autre pour étendre la période. Une carte est datée de l’époque où elle est devenue
            célèbre.
          </Text>
          {datedSelected.map((pack) => (
            <EraTimeline
              key={pack.id}
              pack={pack}
              range={eras[pack.id]}
              onChange={(range) => {
                const { [pack.id]: _old, ...rest } = eras;
                onErasChange(range ? { ...rest, [pack.id]: range } : rest);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.text, fontWeight: '800', fontSize: font.body },
  link: { color: colors.primary, fontWeight: '800', fontSize: font.caption + 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
    opacity: 0.6,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.bgElevated, opacity: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  check: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: colors.primaryText, fontWeight: '900', fontSize: font.caption },
  emoji: { fontSize: font.heading },
  name: { color: colors.text, fontWeight: '800', fontSize: font.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  count: { color: colors.textMuted, fontSize: font.caption },
  badge: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  period: { color: colors.primary, fontSize: font.caption - 1, fontWeight: '800', marginTop: 2 },
  periods: {
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  help: { color: colors.textMuted, fontSize: font.caption, lineHeight: 19 },
  badgeText: { color: colors.text, fontSize: font.caption - 2, fontWeight: '800' },
});
