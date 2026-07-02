import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppTheme } from '@/theme';

interface Props {
  icon: string;
  text: string;
}

export function EmptyState({ icon, text }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  return (
    <View style={[styles.container, { paddingVertical: spacing.xxxl, gap: spacing.lg }]}>
      <View
        style={[
          styles.chip,
          { backgroundColor: theme.colors.surfaceVariant, borderRadius: radius.pill },
        ]}
      >
        <MaterialCommunityIcons name={icon as never} size={34} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="bodyMedium" style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  chip: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  text: { textAlign: 'center', maxWidth: 280 },
});
