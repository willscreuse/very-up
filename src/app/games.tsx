import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button, Muted, Screen, Title } from '@/components/ui';
import { packById } from '@/data/packs';
import { writingOrder } from '@/game/engine';
import { ROUNDS } from '@/game/rounds';
import { currentPlayer, scoreboard } from '@/game/selectors';
import { confirmAction } from '@/services/confirm';
import { type SavedGame, sortedGames, useGameStore } from '@/store/gameStore';
import { colors, font, radius, spacing } from '@/theme/tokens';

function timeAgo(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function status({ game }: SavedGame): string {
  if (game.phase === 'finished') {
    const board = scoreboard(game);
    const winners = board.filter((r) => r.total === board[0].total);
    return winners.length > 1 ? '🏆 Égalité' : `🏆 ${winners[0].team.name}`;
  }
  if (game.phase === 'writing') {
    const writer = writingOrder(game)[game.writing?.playerIndex ?? 0];
    return `✍️ Écriture des cartes · au tour de ${writer.player.name}`;
  }
  const round = `${ROUNDS[game.round].emoji} Manche ${game.round + 1}/3`;
  if (game.phase === 'roundSummary') return `${round} terminée`;
  return `${round} · au tour de ${currentPlayer(game).name}`;
}

export default function Games() {
  const games = useGameStore((s) => s.games);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const deleteGame = useGameStore((s) => s.deleteGame);
  const deleteFinishedGames = useGameStore((s) => s.deleteFinishedGames);
  const list = sortedGames(games);
  const finishedCount = list.filter((g) => g.game.phase === 'finished').length;

  const confirmDelete = (saved: SavedGame) =>
    confirmAction({
      title: 'Supprimer cette partie ?',
      message: `${saved.game.teams.map((t) => t.name).join(' · ')}\nCette action est définitive.`,
      confirmLabel: 'Supprimer',
      onConfirm: () => deleteGame(saved.id),
    });

  const confirmDeleteFinished = () =>
    confirmAction({
      title: `Supprimer ${finishedCount} partie${finishedCount > 1 ? 's' : ''} terminée${finishedCount > 1 ? 's' : ''} ?`,
      message: 'Les parties en cours sont conservées.',
      confirmLabel: 'Supprimer',
      onConfirm: deleteFinishedGames,
    });

  return (
    <Screen scroll>
      <Title>Mes parties</Title>
      {list.length === 0 && <Muted>Aucune partie sauvegardée pour l’instant.</Muted>}

      {list.map((saved, i) => {
        const finished = saved.game.phase === 'finished';
        const board = scoreboard(saved.game);
        const packs = (saved.game.settings.packIds ?? [])
          .map((id) => packById(id)?.emoji)
          .filter(Boolean)
          .join(' ');
        return (
          <Animated.View
            key={saved.id}
            entering={FadeInUp.delay(i * 50)}
            exiting={FadeOut}
            layout={LinearTransition}>
            <Pressable
              accessibilityRole="button"
              accessibilityHint={finished ? 'Voir les résultats' : 'Reprendre la partie'}
              onPress={() => {
                resumeGame(saved.id);
                router.push('/game');
              }}
              style={({ pressed }) => [styles.item, finished && styles.itemFinished, pressed && styles.pressed]}>
              <View style={styles.itemHeader}>
                <Text style={styles.status} numberOfLines={1}>
                  {status(saved)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer la partie"
                  hitSlop={14}
                  onPress={() => confirmDelete(saved)}
                  style={styles.trash}>
                  <Text style={styles.trashText}>🗑️</Text>
                </Pressable>
              </View>

              <View style={styles.scores}>
                {board.map((row) => (
                  <View key={row.team.id} style={[styles.scorePill, { borderColor: row.team.color }]}>
                    <Text style={styles.scoreName} numberOfLines={1}>
                      {row.team.name}
                    </Text>
                    <Text style={[styles.scoreValue, { color: row.team.color }]}>{row.total}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.meta}>
                {finished ? 'Terminée' : 'En cours'} · {timeAgo(saved.updatedAt)}
                {packs ? ` · ${packs}` : ''}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}

      {finishedCount > 0 && (
        <Button
          label="Supprimer les parties terminées"
          variant="ghost"
          onPress={confirmDeleteFinished}
        />
      )}
      <Button label="Retour" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemFinished: { opacity: 0.75 },
  pressed: { transform: [{ scale: 0.98 }] },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  status: { flex: 1, color: colors.text, fontSize: font.body + 1, fontWeight: '800' },
  trash: { padding: spacing.xs },
  trashText: { fontSize: font.title },
  scores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    maxWidth: '100%',
  },
  scoreName: { color: colors.text, fontWeight: '700', fontSize: font.caption + 1, flexShrink: 1 },
  scoreValue: { fontWeight: '900', fontSize: font.body + 1 },
  meta: { color: colors.textMuted, fontSize: font.caption },
});
