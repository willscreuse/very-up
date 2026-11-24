import { StyleSheet, Text, View } from 'react-native';

import { scoreboard } from '@/game/selectors';
import type { GameState } from '@/game/types';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function ScoreboardList({ game, detailed = false }: { game: GameState; detailed?: boolean }) {
  const rows = scoreboard(game);
  return (
    <View style={styles.list}>
      {rows.map((row, i) => (
        <View key={row.team.id} style={[styles.row, { borderLeftColor: row.team.color }]}>
          <Text style={styles.rank}>{i + 1}</Text>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {row.team.name}
            </Text>
            {detailed && (
              <Text style={styles.detail}>
                {row.perRound.map((p, r) => `M${r + 1} : ${p}`).join('   ')}
              </Text>
            )}
          </View>
          <Text style={[styles.total, { color: row.team.color }]}>{row.total}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderLeftWidth: 6,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  rank: { color: colors.textMuted, fontSize: font.body, fontWeight: '800', width: 20 },
  flex: { flex: 1 },
  name: { color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  detail: { color: colors.textMuted, fontSize: font.caption, marginTop: 2 },
  total: { fontSize: font.title + 4, fontWeight: '900' },
});
