import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button, Muted, Screen, Title } from '@/components/ui';
import { cardById, currentPlayer, currentTeam, turnPoints } from '@/game/selectors';
import { type GameState, ROUND_COUNT } from '@/game/types';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store/gameStore';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function TurnSummaryScreen({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const team = currentTeam(game);
  const player = currentPlayer(game);
  const points = turnPoints(game.currentTurn, game.settings.skipPenalty);
  const roundOver = game.pile.length === 0;
  const keepsTurn = roundOver && game.round + 1 < ROUND_COUNT && game.keepsTurn === true;

  // Écran figé une seconde : évite qu'un appui de trop valide le tour par erreur.
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setLocked(false), 1000);
    return () => clearTimeout(id);
  }, []);

  return (
    <Screen scroll>
      <Text style={[styles.over, { color: team.color }]}>
        {roundOver ? '🎉 Paquet terminé !' : '⏰ Temps écoulé !'}
      </Text>
      <Title>
        {player.name} : {points > 0 ? '+' : ''}
        {points} point{Math.abs(points) > 1 ? 's' : ''}
      </Title>
      {keepsTurn && (
        <Muted>
          ⚡ {player.name} commencera la manche suivante avec un chrono complet (
          {game.settings.turnSeconds} s).
        </Muted>
      )}
      <Muted>Touchez une carte pour corriger son résultat.</Muted>

      <View style={styles.list}>
        {game.currentTurn.length === 0 && <Muted>Aucune carte jouée pendant ce tour.</Muted>}
        {game.currentTurn.map((event, index) => {
          const card = cardById(game, event.cardId);
          const isFound = event.result === 'found';
          return (
            <Animated.View key={`${event.cardId}-${index}`} entering={FadeInUp.delay(index * 40)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${card?.text}, ${isFound ? 'trouvée' : 'passée'}`}
              disabled={locked}
              onPress={() => {
                feedback.tap();
                dispatch({ type: 'TOGGLE_EVENT', index });
              }}
              style={[styles.item, { borderColor: isFound ? colors.found : colors.skip }]}>
              <Text style={styles.itemText} numberOfLines={1}>
                {card?.text}
              </Text>
              <Text style={[styles.badge, { color: isFound ? colors.found : colors.skip }]}>
                {isFound ? '✅ Trouvée' : '⏭️ Passée'}
              </Text>
            </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Button
        label={roundOver ? 'Voir les scores' : 'Valider le tour'}
        size="lg"
        disabled={locked}
        onPress={() => {
          if (roundOver) {
            if (game.round + 1 >= ROUND_COUNT) feedback.victory();
            else feedback.roundEnd();
          }
          dispatch({ type: 'CONFIRM_TURN' });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  over: { fontSize: font.title, fontWeight: '900' },
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  itemText: { flex: 1, color: colors.text, fontSize: font.body + 1, fontWeight: '700' },
  badge: { fontSize: font.caption + 1, fontWeight: '800' },
});
