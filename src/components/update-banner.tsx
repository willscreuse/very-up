import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, font, radius, spacing } from '@/theme/tokens';

const supported = Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

/**
 * Version web uniquement : quand une nouvelle version du site a été téléchargée
 * en arrière-plan, propose de l'utiliser tout de suite au lieu d'attendre que
 * l'app soit complètement fermée. Les parties et les cartes sont enregistrées
 * sur l'appareil : le rechargement ne les perd pas.
 */
export function UpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const sw = navigator.serviceWorker;
    let reg: ServiceWorkerRegistration | null = null;
    let cancelled = false;

    // Seulement une mise à jour : au tout premier chargement, il n'y a pas d'ancienne version.
    const offer = (worker: ServiceWorker | null) => {
      if (worker && sw.controller && !cancelled) setWaiting(worker);
    };
    const watch = (worker: ServiceWorker | null) => {
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') offer(worker);
      });
    };
    const onUpdateFound = () => watch(reg?.installing ?? null);
    // L'app revient au premier plan (souvent restée ouverte des jours) : on cherche une mise à jour.
    const onVisible = () => {
      if (document.visibilityState === 'visible') reg?.update().catch(() => {});
    };

    sw.ready.then((r) => {
      if (cancelled) return;
      reg = r;
      offer(r.waiting);
      watch(r.installing);
      r.addEventListener('updatefound', onUpdateFound);
      r.update().catch(() => {});
    });
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      reg?.removeEventListener('updatefound', onUpdateFound);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!waiting) return null;

  const update = () => {
    if (updating) return;
    setUpdating(true);
    // La nouvelle version prend la main : on recharge la page pour l'afficher.
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
    waiting.postMessage('SKIP_WAITING');
    // Filet de sécurité si l'événement n'arrive jamais.
    setTimeout(() => window.location.reload(), 3000);
  };

  return (
    <Animated.View entering={FadeInDown} style={styles.box}>
      <View style={styles.texts}>
        <Text style={styles.title}>✨ Nouvelle version disponible</Text>
        <Text style={styles.body}>Tes parties et tes cartes sont conservées.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={update}
        disabled={updating}
        style={[styles.button, updating && styles.disabled]}>
        <Text style={styles.buttonText}>{updating ? 'Mise à jour…' : 'Mettre à jour'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  texts: { flex: 1, gap: 2 },
  title: { color: colors.primaryText, fontWeight: '900', fontSize: font.body },
  body: { color: colors.primaryText, fontSize: font.caption, opacity: 0.8 },
  button: {
    backgroundColor: colors.primaryText,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: colors.primary, fontWeight: '900', fontSize: font.caption + 1 },
});
