import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { SwipeCard, type SwipeCardHandle } from '@/components/game/swipe-card';
import { Button, Screen } from '@/components/ui';
import { useCountdown } from '@/hooks/use-countdown';
import { ROUNDS } from '@/game/rounds';
import { currentCard, currentTeam } from '@/game/selectors';
import type { CardResult, GameState } from '@/game/types';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store/gameStore';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function PlayingScreen({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const team = currentTeam(game);
  const card = currentCard(game);
  const rule = ROUNDS[game.round];
  const totalMs = game.settings.turnSeconds * 1000;

  const cardRef = useRef<SwipeCardHandle>(null);
  // Si le chrono expire pendant qu'une carte s'envole, on attend la fin de
  // l'animation : le geste du joueur a été fait à temps, il doit compter.
  const flying = useRef(false);
  const timeUpPending = useRef(false);

  const endTurn = () => {
    feedback.timeUp();
    dispatch({ type: 'TIME_UP' });
  };

  const { msLeft, secondsLeft } = useCountdown(game.turnEndsAt, {
    onSecond: (s) => {
      if (s > 0 && s <= 5) feedback.tick(s);
    },
    onExpire: () => {
      if (!flying.current) return endTurn();
      timeUpPending.current = true;
      // Filet de sécurité si l'animation ne se termine jamais.
      setTimeout(() => {
        if (timeUpPending.current) {
          timeUpPending.current = false;
          endTurn();
        }
      }, 600);
    },
  });

  const onResult = (result: CardResult) => {
    flying.current = false;
    if (result === 'found') {
      feedback.found();
      dispatch({ type: 'FOUND', now: Date.now() });
    } else {
      feedback.skip();
      dispatch({ type: 'SKIP' });
    }
    if (timeUpPending.current) {
      timeUpPending.current = false;
      endTurn();
    }
  };

  const ratio = Math.min(1, msLeft / totalMs);
  const timerColor = ratio > 0.5 ? colors.found : ratio > 0.2 ? colors.warning : colors.danger;
  const found = game.currentTurn.filter((e) => e.result === 'found').length;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.rule}>
          {rule.emoji} {rule.short}
        </Text>
        <Animated.Text
          key={found}
          entering={found > 0 ? ZoomIn.springify() : undefined}
          style={[styles.counter, { color: team.color }]}>
          ✅ {found}
        </Animated.Text>
      </View>

      <View style={styles.timerBlock}>
        <Text style={[styles.timer, { color: timerColor }]}>{secondsLeft}</Text>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${ratio * 100}%`, backgroundColor: timerColor }]} />
        </View>
      </View>

      <SwipeCard
        ref={cardRef}
        card={card}
        borderColor={team.color}
        onFlingStart={() => {
          flying.current = true;
        }}
        onResult={onResult}
      />

      <View style={styles.actions}>
        <Button
          label="Passer"
          variant="skip"
          size="lg"
          style={styles.flex}
          onPress={() => cardRef.current?.fling('skipped')}
        />
        <Button
          label="Trouvé !"
          variant="found"
          size="lg"
          style={styles.flexBig}
          onPress={() => cardRef.current?.fling('found')}
        />
      </View>
      <Button
        label="↩︎ Annuler la dernière action"
        variant="ghost"
        disabled={game.currentTurn.length === 0}
        onPress={() => {
          if (flying.current) return;
          dispatch({ type: 'UNDO' });
          cardRef.current?.enter();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rule: { color: colors.textMuted, fontSize: font.body, fontWeight: '700' },
  counter: { fontSize: font.title, fontWeight: '900' },
  timerBlock: { alignItems: 'center', gap: spacing.sm },
  timer: { fontSize: font.timer, fontWeight: '900', fontVariant: ['tabular-nums'] },
  track: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  flex: { flex: 1 },
  flexBig: { flex: 1.6 },
});
