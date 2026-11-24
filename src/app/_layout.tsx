import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initSounds } from '@/services/sounds';
import { useGameStore } from '@/store/gameStore';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
initSounds();

export default function RootLayout() {
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}>
        <Stack.Screen name="game" options={{ gestureEnabled: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
