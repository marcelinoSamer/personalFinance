import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

import { getThemes } from '@/theme';
import { useBootstrap } from '@/state/bootstrap';
import { useSettings } from '@/state/settings';
import { LockScreen } from '@/components/LockScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const paperSettings = {
  icon: ({ name, color, size }: { name: string; color?: string; size?: number }) => (
    <MaterialCommunityIcons name={name as never} color={color} size={size} />
  ),
};

export default function RootLayout() {
  const { ready, error } = useBootstrap();
  const systemScheme = useColorScheme();
  const themeMode = useSettings((s) => s.themeMode);
  const lockEnabled = useSettings((s) => s.lockEnabled);
  const [unlocked, setUnlocked] = useState(false);

  const dark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const { paper, navigation } = getThemes(dark);

  useEffect(() => {
    if (ready || error) SplashScreen.hideAsync().catch(() => {});
  }, [ready, error]);

  let content: React.ReactNode;
  if (error) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text variant="titleMedium" style={{ color: paper.colors.error, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  } else if (!ready) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  } else if (lockEnabled && !unlocked) {
    content = <LockScreen onUnlock={() => setUnlocked(true)} />;
  } else {
    // Detail/modal screens get a header (title + back/close) by default; the
    // tab group manages its own headers. Each route refines its own options.
    content = (
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paper} settings={paperSettings}>
          <ThemeProvider value={navigation}>
            <StatusBar style={dark ? 'light' : 'dark'} />
            {content}
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
