import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  icon: string;
  text: string;
}

export function EmptyState({ icon, text }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as never} size={48} color={theme.colors.outline} />
      <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  text: { textAlign: 'center' },
});
