import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ALL_ERAS,
  type EraRange,
  ERAS,
  eraCounts,
  isAllEras,
  type Pack,
  rangeLabel,
  tapEra,
} from '@/data/packs';
import { feedback } from '@/services/feedback';
import { colors, font, radius, spacing } from '@/theme/tokens';

/** Frise des époques d'un paquet daté : on y choisit une période continue. */
export function EraTimeline({
  pack,
  range,
  onChange,
}: {
  pack: Pack;
  range: EraRange | undefined;
  onChange: (range: EraRange | undefined) => void;
}) {
  const counts = eraCounts(pack);
  const [a, b] = range ?? ALL_ERAS;
  const all = isAllEras(range);
  const selectedCount = counts.slice(a, b + 1).reduce((s, n) => s + n, 0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {pack.emoji} {pack.name}
        </Text>
        <Text style={[styles.range, !all && styles.rangeActive]}>{rangeLabel(range)}</Text>
      </View>

      <View style={styles.timeline}>
        {ERAS.map((era, i) => {
          const on = i >= a && i <= b;
          const empty = counts[i] === 0;
          return (
            <Pressable
              key={era.label}
              disabled={empty}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: empty }}
              accessibilityLabel={`${era.label}, ${counts[i]} cartes`}
              onPress={() => {
                feedback.tap();
                const next = tapEra(range, i);
                onChange(isAllEras(next) ? undefined : next);
              }}
              style={[
                styles.segment,
                on && !empty && styles.segmentOn,
                on && !empty && !all && styles.segmentChosen,
                i === 0 && styles.first,
                i === ERAS.length - 1 && styles.last,
                empty && styles.segmentEmpty,
              ]}>
              <Text style={[styles.segmentLabel, on && !all && !empty && styles.textChosen]}>
                {era.short}
              </Text>
              <Text style={[styles.segmentCount, on && !all && !empty && styles.textChosen]}>
                {counts[i]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.count}>
          {selectedCount} carte{selectedCount > 1 ? 's' : ''}
        </Text>
        {!all && (
          <Pressable
            hitSlop={8}
            onPress={() => {
              feedback.tap();
              onChange(undefined);
            }}>
            <Text style={styles.reset}>Toutes les époques</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontWeight: '800', fontSize: font.body, flexShrink: 1 },
  range: { color: colors.textMuted, fontWeight: '700', fontSize: font.caption },
  rangeActive: { color: colors.primary },
  timeline: { flexDirection: 'row', gap: 2 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    gap: 2,
  },
  first: { borderTopLeftRadius: radius.sm, borderBottomLeftRadius: radius.sm },
  last: { borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.sm },
  segmentOn: { backgroundColor: colors.border },
  segmentChosen: { backgroundColor: colors.primary },
  segmentEmpty: { opacity: 0.3 },
  segmentLabel: { color: colors.text, fontSize: 11, fontWeight: '800' },
  segmentCount: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  textChosen: { color: colors.primaryText },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  count: { color: colors.textMuted, fontSize: font.caption },
  reset: { color: colors.primary, fontWeight: '800', fontSize: font.caption },
});
