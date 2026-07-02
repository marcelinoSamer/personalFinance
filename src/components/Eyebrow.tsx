import type { ReactNode } from 'react';
import { Text } from 'react-native-paper';
import type { StyleProp, TextStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

import { getLocale } from '@/i18n';
import type { AppTheme } from '@/theme';

interface Props {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Engraved section label — tiny, wide-tracked, uppercase. The wide tracking and
 * casing are skipped in Arabic, where they would break cursive joining.
 */
export function Eyebrow({ children, color, style }: Props) {
  const theme = useTheme<AppTheme>();
  const e = theme.tokens.type.eyebrow;
  const ar = getLocale() === 'ar';

  return (
    <Text
      style={[
        {
          fontFamily: e.fontFamily,
          fontSize: e.fontSize,
          lineHeight: e.lineHeight,
          color: color ?? theme.colors.onSurfaceVariant,
        },
        ar ? null : { letterSpacing: e.letterSpacing, textTransform: 'uppercase' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
