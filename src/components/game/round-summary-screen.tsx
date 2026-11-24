import { StyleSheet, Text } from 'react-native';

import { ScoreboardList } from '@/components/game/scoreboard-list';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { ROUNDS } from '@/game/rounds';
import { currentPlayer, currentTeam } from '@/game/selectors';
import type { GameState } from '@/game/types';
import { useGameStore } from '@/store/gameStore';
import { colors, font } from '@/theme/tokens';

export function RoundSummaryScreen({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const next = ROUNDS[game.round + 1];
  const starter = currentPlayer(game);
  const starterTeam = currentTeam(game);

  return (
    <Screen scroll>
      <Title>Fin de la {ROUNDS[game.round].title.toLowerCase()} !</Title>
      <ScoreboardList game={game} detailed />

      <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
        <Text style={styles.emoji}>{next.emoji}</Text>
        <Text style={styles.nextTitle}>
          {next.title} : {next.short}
        </Text>
        <Muted>{next.description}</Muted>
        <Muted>On reprend les mêmes {game.deck.length} cartes, remélangées.</Muted>
        <Text style={[styles.starter, { color: starterTeam.color }]}>
          {starter.name} commence
          {game.carryOverMs !== null ? ` avec ${Math.ceil(game.carryOverMs / 1000)} s` : ''} !
        </Text>
      </Card>

      <Button
        label={`Lancer la ${next.title.toLowerCase()}`}
        size="lg"
        onPress={() => dispatch({ type: 'NEXT_ROUND' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: font.display },
  nextTitle: { color: colors.text, fontSize: font.title, fontWeight: '900' },
  starter: { fontSize: font.body + 1, fontWeight: '900' },
});
