import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle }: Props) {
  const theme = useTheme();
  const bg = { backgroundColor: theme.colors.background };

  if (!scroll) {
    return <View style={[styles.flex, bg, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={bg}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 96, gap: 16 },
});
