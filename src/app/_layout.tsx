import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Deep per-weight imports keep Metro from bundling every weight/italic.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';

import { getThemes, tokens } from '@/theme';
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

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  const dark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const { paper, navigation } = getThemes(dark);
  const appReady = ready && fontsLoaded;

  useEffect(() => {
    if (appReady || error) SplashScreen.hideAsync().catch(() => {});
  }, [appReady, error]);

  let content: React.ReactNode;
  if (error) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text variant="titleMedium" style={{ color: paper.colors.error, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  } else if (!appReady) {
    content = (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: paper.colors.background,
        }}
      >
        <ActivityIndicator color={paper.colors.primary} />
      </View>
    );
  } else if (lockEnabled && !unlocked) {
    content = <LockScreen onUnlock={() => setUnlocked(true)} />;
  } else {
    // Detail/modal screens get a header (title + back/close) by default; the
    // tab group manages its own headers. Each route refines its own options.
    content = (
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: paper.colors.background },
          headerShadowVisible: false,
          headerTintColor: paper.colors.onSurface,
          headerTitleStyle: {
            fontFamily: tokens.font.serif.semibold,
            fontSize: 20,
            color: paper.colors.onSurface,
          },
          contentStyle: { backgroundColor: paper.colors.background },
        }}
      >
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
