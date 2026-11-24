import { router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Button, Muted, Screen, Title } from '@/components/ui';
import { cardText, PACKS } from '@/data/packs';
import { writingOrder } from '@/game/engine';
import { CUSTOM_CARD_MAX_LENGTH, type GameState } from '@/game/types';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store/gameStore';
import { colors, font, radius, spacing } from '@/theme/tokens';

const PLACEHOLDERS = [
  'Une célébrité…',
  'Un personnage…',
  'Un objet, un animal…',
  'Un film, une série…',
  'Ce que tu veux !',
];

const ALL_IDEAS = PACKS.filter((p) => !p.badge).flatMap((p) => p.cards.map(cardText));

function randomIdea(exclude: string[]): string {
  const taken = new Set(exclude.map((t) => t.trim().toLocaleLowerCase('fr')));
  for (let i = 0; i < 20; i++) {
    const idea = ALL_IDEAS[Math.floor(Math.random() * ALL_IDEAS.length)];
    if (!taken.has(idea.toLocaleLowerCase('fr'))) return idea;
  }
  return ALL_IDEAS[0];
}

/**
 * Chaque joueur écrit ses cartes en secret.
 * Le composant est recréé (via `key`) pour chaque joueur : les brouillons
 * ne restent jamais à l'écran pour le joueur suivant.
 */
export function WritingScreen({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const order = writingOrder(game);
  const index = game.writing?.playerIndex ?? 0;
  const { team, player } = order[index];
  const perPlayer = game.settings.customCardsPerPlayer ?? 0;

  const [ready, setReady] = useState(false);
  const [texts, setTexts] = useState<string[]>(() => Array.from({ length: perPlayer }, () => ''));
  const inputs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);

  const cleaned = texts.map((t) => t.trim().toLocaleLowerCase('fr'));
  const filled = cleaned.filter(Boolean).length;
  const hasDuplicate = new Set(cleaned.filter(Boolean)).size !== filled;
  const complete = filled === perPlayer && !hasDuplicate;

  const setText = (i: number, value: string) =>
    setTexts((ts) => ts.map((t, j) => (j === i ? value : t)));

  if (!ready) {
    return (
      <Screen scroll>
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              ✍️ Écriture des cartes · {index + 1}/{order.length}
            </Text>
          </View>
          <Button label="Menu" variant="ghost" onPress={() => router.replace('/')} />
        </View>

        <Animated.View
          entering={ZoomIn.springify().damping(14)}
          style={[styles.hero, { backgroundColor: team.color }]}>
          <Text style={styles.heroSmall}>Passe le téléphone à</Text>
          <Text style={styles.heroName} numberOfLines={1} adjustsFontSizeToFit>
            {player.name}
          </Text>
          <Text style={styles.heroTeam}>{team.name}</Text>
        </Animated.View>

        <Muted style={styles.center}>
          Écris {perPlayer} cartes en secret : des célébrités, des personnages, des objets… Tout ce
          que les autres pourront deviner. 🤫 Les autres, on ne regarde pas !
        </Muted>

        <Button label="C’est moi, je suis prêt·e !" size="lg" onPress={() => setReady(true)} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <Screen scroll>
        <Title>{player.name}, à toi d’écrire !</Title>
        <Muted>
          Touche 💡 si tu manques d’inspiration. Tes cartes reviendront dans les 3 manches : choisis
          des choses faciles à mimer.
        </Muted>

        {texts.map((text, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(i * 60)} style={styles.row}>
            <Text style={styles.number}>{i + 1}</Text>
            <TextInput
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={text}
              onChangeText={(v) => setText(i, v)}
              placeholder={PLACEHOLDERS[i % PLACEHOLDERS.length]}
              placeholderTextColor={colors.textMuted}
              maxLength={CUSTOM_CARD_MAX_LENGTH}
              autoCapitalize="sentences"
              autoCorrect={false}
              autoFocus={i === 0}
              returnKeyType={i < texts.length - 1 ? 'next' : 'done'}
              submitBehavior={i < texts.length - 1 ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={() => inputs.current[i + 1]?.focus()}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Proposer une idée"
              hitSlop={8}
              onPress={() => {
                feedback.tap();
                setText(i, randomIdea(texts));
              }}
              style={styles.idea}>
              <Text style={styles.ideaText}>💡</Text>
            </Pressable>
          </Animated.View>
        ))}

        {hasDuplicate && <Muted>Deux de tes cartes sont identiques.</Muted>}

        <Button
          label={complete ? 'Valider mes cartes' : `Encore ${perPlayer - filled} carte${perPlayer - filled > 1 ? 's' : ''}`}
          size="lg"
          disabled={!complete}
          onPress={() => {
            feedback.found();
            dispatch({ type: 'SUBMIT_CUSTOM_CARDS', texts });
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexShrink: 1,
  },
  pillText: { color: colors.text, fontWeight: '800', fontSize: font.caption + 1 },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  number: { color: colors.primary, fontWeight: '900', fontSize: font.title, width: 24 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.body + 1,
    fontWeight: '700',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  idea: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideaText: { fontSize: font.title },
});
