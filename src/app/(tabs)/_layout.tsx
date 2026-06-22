import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { t } from '@/i18n';

function icon(name: string) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name as never} color={color as string} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.dashboard'), tabBarIcon: icon('view-dashboard') }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: t('tabs.transactions'), tabBarIcon: icon('swap-vertical') }}
      />
      <Tabs.Screen
        name="accounts"
        options={{ title: t('tabs.accounts'), tabBarIcon: icon('wallet') }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: t('tabs.analytics'), tabBarIcon: icon('chart-arc') }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t('tabs.more'), tabBarIcon: icon('dots-horizontal') }}
      />
    </Tabs>
  );
}
