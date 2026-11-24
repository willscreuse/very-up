import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

import { Confetti } from '@/components/confetti';

import { ScoreboardList } from '@/components/game/scoreboard-list';
import { Button, Card, Muted, Screen } from '@/components/ui';
import { mvp, scoreboard } from '@/game/selectors';
import type { GameState } from '@/game/types';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store/gameStore';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function FinalScreen({ game }: { game: GameState }) {
  const newGame = useGameStore((s) => s.newGame);
  const leaveGame = useGameStore((s) => s.leaveGame);
  const board = scoreboard(game);
  const winners = board.filter((r) => r.total === board[0].total);
  const star = mvp(game);
  // Les couleurs des gagnants dominent les confettis.
  const confettiColors = winners.flatMap((w) => [w.team.color, w.team.color, w.team.color]);
  const [burst, setBurst] = useState(0);

  return (
    <View style={styles.flex}>
      <Screen scroll>
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[styles.hero, { backgroundColor: winners[0].team.color }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Relancer les confettis"
            onPress={() => {
              feedback.found();
              setBurst((b) => b + 1);
            }}>
            <Animated.Text key={burst} entering={ZoomIn.springify().damping(8)} style={styles.trophy}>
              🏆
            </Animated.Text>
          </Pressable>
          <Text style={styles.heroSmall}>{winners.length > 1 ? 'Égalité !' : 'Victoire de'}</Text>
          <Text style={styles.heroName} adjustsFontSizeToFit numberOfLines={2}>
            {winners.map((w) => w.team.name).join(' & ')}
          </Text>
          <Text style={styles.heroSmall}>{board[0].total} points</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)}>
          <ScoreboardList game={game} detailed />
        </Animated.View>

        {star && star.found > 0 && (
          <Card>
            <Text style={styles.mvpTitle}>⭐ Meilleur·e joueur·se</Text>
            <Muted>
              {star.player.name} ({star.team.name}) a fait deviner {star.found} carte
              {star.found > 1 ? 's' : ''}.
            </Muted>
          </Card>
        )}

        <Button
          label="Rejouer avec les mêmes équipes"
          size="lg"
          onPress={() => newGame(game.teams, game.settings)}
        />
        <Button
          label="Accueil"
          variant="secondary"
          onPress={() => {
            leaveGame();
            router.replace('/');
          }}
        />
      </Screen>
      <Confetti key={burst} colors={confettiColors} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  trophy: { fontSize: 72 },
  heroSmall: { color: colors.primaryText, fontSize: font.body + 1, fontWeight: '800' },
  heroName: { color: colors.primaryText, fontSize: font.display, fontWeight: '900', textAlign: 'center' },
  mvpTitle: { color: colors.text, fontSize: font.body + 2, fontWeight: '900' },
});
