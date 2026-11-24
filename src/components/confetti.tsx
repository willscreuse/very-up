import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, teamPalette } from '@/theme/tokens';

/** Durée totale de l'animation, en secondes. */
const DURATION = 4;

interface Particle {
  delay: number;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  gravity: number;
  sway: number;
  w: number;
  h: number;
  round: boolean;
  color: string;
  rot0: number;
  vrot: number;
  flip: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

function makeParticles(width: number, height: number, palette: string[]): Particle[] {
  const piece = (): Pick<Particle, 'w' | 'h' | 'round' | 'color' | 'rot0' | 'vrot' | 'flip'> => {
    const round = Math.random() < 0.2;
    const w = round ? rand(7, 10) : rand(7, 12);
    return {
      w,
      h: round ? w : w * rand(1.4, 2.2),
      round,
      color: pick(palette),
      rot0: rand(0, 360),
      vrot: rand(-540, 540),
      flip: rand(4, 12),
    };
  };

  // Deux canons dans les coins bas qui tirent vers le centre.
  const cannons = Array.from({ length: 70 }, (_, i): Particle => {
    const left = i % 2 === 0;
    return {
      ...piece(),
      delay: rand(0, 0.15),
      x0: left ? -10 : width + 10,
      y0: height * 0.8,
      vx: (left ? 1 : -1) * rand(120, width * 0.9),
      vy: -rand(height * 0.9, height * 1.45),
      gravity: height * 1.6,
      sway: rand(5, 20),
    };
  });

  // Pluie douce depuis le haut de l'écran.
  const rain = Array.from({ length: 50 }, (): Particle => ({
    ...piece(),
    delay: rand(0.4, 1.8),
    x0: rand(0, width),
    y0: -20,
    vx: rand(-20, 20),
    vy: rand(height * 0.18, height * 0.3),
    gravity: rand(20, 60),
    sway: rand(15, 40),
  }));

  return [...cannons, ...rain];
}

function Piece({ p, t }: { p: Particle; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const time = Math.max(0, t.value - p.delay);
    const x = p.x0 + p.vx * time + p.sway * Math.sin(time * 3 + p.rot0);
    const y = p.y0 + p.vy * time + 0.5 * p.gravity * time * time;
    const fade = interpolate(t.value, [DURATION - 0.8, DURATION], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: time > 0 ? fade : 0,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${p.rot0 + p.vrot * time}deg` },
        { scaleX: Math.cos(time * p.flip) }, // effet « papier qui tourne »
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: p.w, height: p.h, backgroundColor: p.color, borderRadius: p.round ? p.w / 2 : 2 },
        style,
      ]}
    />
  );
}

/**
 * Explosion de confettis plein écran, sans bloquer les appuis.
 * Pour relancer, changer la `key` du composant.
 */
export function Confetti({ colors: palette }: { colors?: string[] }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [particles] = useState(() =>
    makeParticles(width, height, [...(palette ?? []), ...teamPalette, colors.primary, colors.text]),
  );
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(withTiming(DURATION, { duration: DURATION * 1000, easing: Easing.linear }));
  }, [t]);

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <Piece key={i} p={p} t={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
});
