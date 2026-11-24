import { type Ref, useEffect, useImperativeHandle } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Card, CardResult } from '@/game/types';
import { feedback } from '@/services/feedback';
import { colors, font, radius, spacing } from '@/theme/tokens';

export interface SwipeCardHandle {
  /** Fait s'envoler la carte (utilisé par les boutons). */
  fling: (result: CardResult) => void;
  /** Rejoue l'animation d'entrée (après une annulation). */
  enter: () => void;
}

interface Props {
  ref?: Ref<SwipeCardHandle>;
  card: Card | null;
  borderColor: string;
  /** Appelé dès que la carte commence à s'envoler. */
  onFlingStart: () => void;
  /** Appelé une fois la carte sortie de l'écran. */
  onResult: (result: CardResult) => void;
}

const FLY_DURATION = 170;

/** `adjustsFontSizeToFit` n'existe pas sur le web : on y adapte la taille à la longueur. */
function webFontSize(text: string): number | undefined {
  if (Platform.OS !== 'web') return undefined;
  const longestWord = Math.max(...text.split(/\s+/).map((w) => w.length));
  if (text.length > 30 || longestWord > 12) return font.title + 4;
  if (text.length > 18 || longestWord > 9) return font.heading + 2;
  return font.display;
}
const VELOCITY_TRIGGER = 900;
const SPRING = { damping: 14, stiffness: 180, mass: 0.8 };

export function SwipeCard({ ref, card, borderColor, onFlingStart, onResult }: Props) {
  const { width } = useWindowDimensions();
  const threshold = width * 0.28;

  const dragX = useSharedValue(0);
  const entrance = useSharedValue(0);
  const busy = useSharedValue(false);
  const crossed = useSharedValue(false);

  const finish = (result: CardResult) => {
    onResult(result);
    // La nouvelle carte arrive au centre, invisible, puis « pop ».
    dragX.set(0);
    entrance.set(0);
    entrance.set(withSpring(1, SPRING));
    busy.set(false);
  };

  const flyAway = (result: CardResult) => {
    'worklet';
    if (busy.get()) return;
    busy.set(true);
    crossed.set(false);
    scheduleOnRN(onFlingStart);
    const target = (result === 'found' ? 1 : -1) * width * 1.4;
    dragX.set(
      withTiming(target, { duration: FLY_DURATION }, (done) => {
        if (done) scheduleOnRN(finish, result);
      }),
    );
  };

  const enter = () => {
    if (busy.get()) return; // ne jamais interrompre un envol en cours
    dragX.set(0);
    entrance.set(0);
    entrance.set(withSpring(1, SPRING));
  };

  useImperativeHandle(ref, () => ({ fling: (r) => flyAway(r), enter }));

  useEffect(() => {
    entrance.set(withSpring(1, SPRING));
  }, [entrance]);

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-40, 40],
    onUpdate: (e) => {
      'worklet';
      if (busy.get()) return;
      dragX.set(e.translationX);
      const isPast = Math.abs(e.translationX) > threshold;
      if (isPast !== crossed.get()) {
        crossed.set(isPast);
        if (isPast) scheduleOnRN(feedback.threshold);
      }
    },
    onDeactivate: (e) => {
      'worklet';
      if (busy.get()) return;
      const fast = Math.abs(e.velocityX) > VELOCITY_TRIGGER;
      if (Math.abs(e.translationX) > threshold || fast) {
        const dir = (fast ? e.velocityX : e.translationX) > 0 ? 'found' : 'skipped';
        flyAway(dir);
      } else {
        crossed.set(false);
        dragX.set(withSpring(0, SPRING));
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateX: dragX.value },
      { rotate: `${interpolate(dragX.value, [-width, 0, width], [-14, 0, 14])}deg` },
      { scale: interpolate(entrance.value, [0, 1], [0.82, 1]) },
    ],
  }));

  const foundStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const skipStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [-threshold, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.zone}>
      <View style={[styles.hint, styles.hintLeft]} pointerEvents="none">
        <Text style={[styles.hintText, { color: colors.skip }]}>← Passer</Text>
      </View>
      <View style={[styles.hint, styles.hintRight]} pointerEvents="none">
        <Text style={[styles.hintText, { color: colors.found }]}>Trouvé →</Text>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, { borderColor }, cardStyle]}>
          <Animated.View style={[styles.stamp, styles.stampFound, foundStampStyle]}>
            <Text style={[styles.stampText, { color: colors.found }]}>TROUVÉ</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampSkip, skipStampStyle]}>
            <Text style={[styles.stampText, { color: colors.skip }]}>PASSE</Text>
          </Animated.View>

          {card && (
            <>
              {card.category && <Text style={styles.category}>{card.category}</Text>}
              <Text
                style={[styles.cardText, { fontSize: webFontSize(card.text) ?? font.display }]}
                adjustsFontSizeToFit
                numberOfLines={3}>
                {card.text}
              </Text>
            </>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { flex: 1, justifyContent: 'center' },
  hint: { position: 'absolute', bottom: -spacing.lg, opacity: 0.6 },
  hintLeft: { left: spacing.xs },
  hintRight: { right: spacing.xs },
  hintText: { fontSize: font.caption, fontWeight: '800' },
  card: {
    flex: 1,
    userSelect: 'none',
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  category: {
    color: '#6B5FA0',
    fontSize: font.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    color: colors.primaryText,
    fontSize: font.display,
    fontWeight: '900',
    textAlign: 'center',
  },
  stamp: {
    position: 'absolute',
    top: spacing.lg,
    borderWidth: 4,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stampFound: { left: spacing.lg, borderColor: colors.found, transform: [{ rotate: '-14deg' }] },
  stampSkip: { right: spacing.lg, borderColor: colors.skip, transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: font.title, fontWeight: '900', letterSpacing: 2 },
});
