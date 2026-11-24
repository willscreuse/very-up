import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { feedback } from '@/services/feedback';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function Screen({
  children,
  scroll = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, style]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'found' | 'skip';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.buttonText, size === 'lg' && styles.buttonTextLg, { color: v.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: colors.primary, text: colors.primaryText, border: colors.primary },
  secondary: { bg: colors.surface, text: colors.text, border: colors.border },
  ghost: { bg: 'transparent', text: colors.textMuted, border: 'transparent' },
  found: { bg: colors.found, text: colors.primaryText, border: colors.found },
  skip: { bg: colors.skip, text: colors.text, border: colors.skip },
};

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  format = String,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={String(o)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              feedback.tap();
              onChange(o);
            }}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{format(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  fill: { flex: 1 },
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonLg: { minHeight: 84, borderRadius: radius.lg },
  buttonText: { fontSize: font.body + 1, fontWeight: '800' },
  buttonTextLg: { fontSize: font.title },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
  title: { color: colors.text, fontSize: font.heading, fontWeight: '900' },
  muted: { color: colors.textMuted, fontSize: font.body, lineHeight: 24 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '700', fontSize: font.body },
  chipTextActive: { color: colors.primaryText },
});
