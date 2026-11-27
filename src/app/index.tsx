import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { InstallHint } from '@/components/install-hint';
import { UpdateBanner } from '@/components/update-banner';
import { Button, Muted, Screen } from '@/components/ui';
import { ROUNDS } from '@/game/rounds';
import { useCustomCards } from '@/store/customCardsStore';
import { sortedGames, useGameStore } from '@/store/gameStore';
import { usePreferences } from '@/store/preferencesStore';
import { colors, font, spacing } from '@/theme/tokens';

export default function Home() {
  const games = useGameStore((s) => s.games);
  const lastSetup = useGameStore((s) => s.lastSetup);
  const newGame = useGameStore((s) => s.newGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const saved = sortedGames(games);
  const latest = saved.find((g) => g.game.phase !== 'finished');
  const canResume = latest !== undefined;
  const prefs = usePreferences();
  const myCardsCount = useCustomCards((s) => s.cards.length);

  return (
    <Screen style={styles.container}>
      <View style={styles.hero}>
        <Animated.View entering={ZoomIn.springify().damping(10)}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.mark}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
        <Animated.Text entering={ZoomIn.delay(120).springify().damping(12)} style={styles.logo}>
          Very <Text style={styles.logoAccent}>Up</Text>
        </Animated.Text>
        <Muted style={styles.tagline}>3 manches · 1 paquet · fous rires garantis</Muted>
        <View style={styles.rounds}>
          {ROUNDS.map((r, i) => (
            <Animated.Text
              key={r.title}
              entering={FadeInDown.delay(250 + i * 120).springify()}
              style={styles.roundEmoji}>
              {r.emoji}
            </Animated.Text>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <UpdateBanner />
        <InstallHint />
        {canResume && (
          <Button
            label="Reprendre la dernière partie"
            size="lg"
            onPress={() => {
              resumeGame(latest.id);
              router.push('/game');
            }}
          />
        )}
        <Button
          label="Nouvelle partie"
          size="lg"
          variant={canResume ? 'secondary' : 'primary'}
          onPress={() => router.push('/setup')}
        />
        {saved.length > 0 && (
          <Button
            label={`Mes parties (${saved.length})`}
            variant="secondary"
            onPress={() => router.push('/games')}
          />
        )}
        {lastSetup && !canResume && (
          <Button
            label="Rejouer avec les mêmes équipes"
            variant="secondary"
            onPress={() => {
              newGame(lastSetup.teams, lastSetup.settings);
              router.push('/game');
            }}
          />
        )}
        {myCardsCount > 0 && (
          <Button
            label={`✍️ Mes cartes (${myCardsCount})`}
            variant="secondary"
            onPress={() => router.push('/my-cards')}
          />
        )}
        <Button label="Règles du jeu" variant="ghost" onPress={() => router.push('/rules')} />
        <View style={styles.prefs}>
          <PrefToggle
            label={prefs.soundEnabled ? '🔊 Son' : '🔇 Son'}
            on={prefs.soundEnabled}
            onPress={prefs.toggleSound}
          />
          {canVibrate && (
            <PrefToggle
              label="📳 Vibrations"
              on={prefs.hapticsEnabled}
              onPress={prefs.toggleHaptics}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

/** Sur le web, seuls certains navigateurs savent faire vibrer (pas Safari sur iPhone). */
const canVibrate = Platform.OS !== 'web' || 'vibrate' in navigator;

function PrefToggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.pref, !on && styles.prefOff]}>
      <Text style={styles.prefText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  prefs: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  pref: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  prefOff: { opacity: 0.45 },
  prefText: { color: colors.text, fontWeight: '700', fontSize: font.caption + 1 },
  container: { justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  mark: { width: 150, height: 150, marginBottom: -spacing.md },
  logo: { color: colors.text, fontSize: 72, fontWeight: '900', letterSpacing: -2 },
  logoAccent: { color: colors.primary },
  tagline: { textAlign: 'center' },
  rounds: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  roundEmoji: { fontSize: font.display },
  actions: { gap: spacing.md },
});
