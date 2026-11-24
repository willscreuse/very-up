import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { ScoreboardList } from '@/components/game/scoreboard-list';
import { Button, Muted, Screen } from '@/components/ui';
import { ROUNDS } from '@/game/rounds';
import { currentPlayer, currentTeam } from '@/game/selectors';
import type { GameState } from '@/game/types';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store/gameStore';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function TurnIntroScreen({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const team = currentTeam(game);
  const player = currentPlayer(game);
  const rule = ROUNDS[game.round];
  const bonusSeconds = game.carryOverMs === null ? null : Math.ceil(game.carryOverMs / 1000);
  const seconds = bonusSeconds ?? game.settings.turnSeconds;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <View style={styles.roundPill}>
          <Text style={styles.roundPillText}>
            {rule.emoji} {rule.title} · {rule.short}
          </Text>
        </View>
        <Button label="Menu" variant="ghost" onPress={() => router.replace('/')} />
      </View>

      <Animated.View
        key={`${game.round}-${player.id}`}
        entering={ZoomIn.springify().damping(14)}
        style={[styles.hero, { backgroundColor: team.color }]}>
        <Text style={styles.heroSmall}>Passe le téléphone à</Text>
        <Text style={styles.heroName} numberOfLines={1} adjustsFontSizeToFit>
          {player.name}
        </Text>
        <Text style={styles.heroTeam}>{team.name}</Text>
      </Animated.View>

      {bonusSeconds !== null && (
        <Animated.View entering={FadeInDown.delay(150)} style={styles.bonus}>
          <Text style={styles.bonusText}>⚡ Tu continues avec ton temps restant : {bonusSeconds} s</Text>
        </Animated.View>
      )}

      <Muted style={styles.center}>{rule.description}</Muted>
      <Muted style={styles.center}>
        {game.pile.length} carte{game.pile.length > 1 ? 's' : ''} restante
        {game.pile.length > 1 ? 's' : ''} · {seconds} secondes
      </Muted>

      <Button
        label="Je suis prêt·e !"
        size="lg"
        onPress={() => {
          feedback.turnStart();
          dispatch({ type: 'START_TURN', now: Date.now() });
        }}
      />

      {game.history.length > 0 && <ScoreboardList game={game} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexShrink: 1,
  },
  roundPillText: { color: colors.text, fontWeight: '800', fontSize: font.caption + 1 },
  hero: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroSmall: { color: colors.primaryText, fontSize: font.body, fontWeight: '700', opacity: 0.8 },
  heroName: { color: colors.primaryText, fontSize: font.display + 8, fontWeight: '900' },
  heroTeam: { color: colors.primaryText, fontSize: font.title, fontWeight: '800' },
  center: { textAlign: 'center' },
  bonus: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bonusText: { color: colors.primaryText, fontWeight: '900', fontSize: font.body, textAlign: 'center' },
});
