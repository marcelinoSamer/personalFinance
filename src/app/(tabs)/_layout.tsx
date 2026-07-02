import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { t } from '@/i18n';
import { tokens, type AppTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useTheme<AppTheme>();

  // The active tab sits in a small gold "ingot" — gold marks value, and the
  // tab you're on is where you're spending attention.
  const renderIcon =
    (name: string) =>
    ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
      <View
        style={[
          styles.ingot,
          focused && { backgroundColor: theme.semantic.goldDim },
        ]}
      >
        <MaterialCommunityIcons name={name as never} color={color as string} size={size - 2} />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: tokens.font.serif.semibold,
          fontSize: 22,
          color: theme.colors.onSurface,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.semantic.gold,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarItemStyle: { paddingTop: 4 },
        tabBarLabelStyle: {
          fontFamily: tokens.font.sans.medium,
          fontSize: 11,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.dashboard'), headerShown: false, tabBarIcon: renderIcon('view-dashboard') }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: t('tabs.transactions'), tabBarIcon: renderIcon('swap-vertical') }}
      />
      <Tabs.Screen
        name="accounts"
        options={{ title: t('tabs.accounts'), tabBarIcon: renderIcon('wallet') }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: t('tabs.analytics'), tabBarIcon: renderIcon('chart-arc') }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t('tabs.more'), tabBarIcon: renderIcon('dots-horizontal') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  ingot: {
    minWidth: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
  },
});
