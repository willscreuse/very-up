import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, font, radius, spacing } from '@/theme/tokens';

const DISMISS_KEY = 'very-up/install-hint-dismissed';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme un Mac avec écran tactile.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Web uniquement, app pas encore installée et bandeau pas encore masqué. */
function shouldOffer(): boolean {
  return Platform.OS === 'web' && !isStandalone() && !wasDismissed();
}

/**
 * Version web uniquement : explique comment installer Very Up sur l'écran d'accueil.
 * - iPhone / iPad (Safari) : pas de bouton d'installation possible, on montre la marche à suivre.
 * - Android / ordinateur (Chrome, Edge…) : vrai bouton « Installer » quand le navigateur le propose.
 */
export function InstallHint() {
  const [mode, setMode] = useState<'ios' | 'prompt' | null>(() =>
    shouldOffer() && isIos() ? 'ios' : null,
  );
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (!shouldOffer() || isIos()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
      setMode('prompt');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // stockage indisponible (navigation privée) : le bandeau reviendra, tant pis
    }
    setMode(null);
  };

  return (
    <Animated.View entering={FadeInDown.delay(400)} style={styles.box}>
      <View style={styles.texts}>
        <Text style={styles.title}>📲 Installe Very Up</Text>
        {mode === 'ios' ? (
          <Text style={styles.body}>
            Dans Safari, touche <Text style={styles.strong}>Partager</Text> (le carré avec une
            flèche ↑), puis <Text style={styles.strong}>« Sur l’écran d’accueil »</Text>. L’app
            s’ouvrira en plein écran, même sans réseau.
          </Text>
        ) : (
          <Text style={styles.body}>Ajoute l’app à ton écran d’accueil : elle marche aussi hors ligne.</Text>
        )}
      </View>
      <View style={styles.actions}>
        {mode === 'prompt' && promptEvent && (
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await promptEvent.prompt();
              setMode(null);
            }}
            style={styles.install}>
            <Text style={styles.installText}>Installer</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Masquer" hitSlop={10} onPress={dismiss}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  texts: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, fontWeight: '900', fontSize: font.body },
  body: { color: colors.textMuted, fontSize: font.caption + 1, lineHeight: 20 },
  strong: { color: colors.text, fontWeight: '800' },
  actions: { alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  install: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  installText: { color: colors.primaryText, fontWeight: '900', fontSize: font.caption + 1 },
  close: { color: colors.textMuted, fontSize: font.body + 2 },
});
