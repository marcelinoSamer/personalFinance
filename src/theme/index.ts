import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
// In Expo SDK 56, react-navigation is vendored inside expo-router.
import { DefaultTheme as NavLightBase, DarkTheme as NavDarkBase } from 'expo-router';

// Extra semantic colors layered on top of the Paper MD3 palette.
export interface SemanticColors {
  income: string;
  expense: string;
  positive: string;
  negative: string;
  neutral: string;
}

export type AppTheme = MD3Theme & { semantic: SemanticColors };

const lightSemantic: SemanticColors = {
  income: '#1B873F',
  expense: '#C62828',
  positive: '#1B873F',
  negative: '#C62828',
  neutral: '#6B7280',
};

const darkSemantic: SemanticColors = {
  income: '#4ADE80',
  expense: '#F87171',
  positive: '#4ADE80',
  negative: '#F87171',
  neutral: '#9CA3AF',
};

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F766E', // teal
    onPrimary: '#FFFFFF',
    primaryContainer: '#9DECE3',
    secondary: '#3B6E66',
    tertiary: '#6D5E00',
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceVariant: '#E7EBEA',
  },
  semantic: lightSemantic,
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4DD9C9',
    onPrimary: '#00322D',
    primaryContainer: '#005048',
    secondary: '#9CD3CA',
    tertiary: '#DBC66E',
    background: '#0F1413',
    surface: '#161C1B',
    surfaceVariant: '#2A302F',
  },
  semantic: darkSemantic,
};

export const navLightTheme = {
  ...NavLightBase,
  colors: {
    ...NavLightBase.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.surface,
    text: lightTheme.colors.onSurface,
    border: lightTheme.colors.outlineVariant,
  },
};

export const navDarkTheme = {
  ...NavDarkBase,
  colors: {
    ...NavDarkBase.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.surface,
    text: darkTheme.colors.onSurface,
    border: darkTheme.colors.outlineVariant,
  },
};

export function getThemes(dark: boolean): {
  paper: AppTheme;
  navigation: typeof navLightTheme | typeof navDarkTheme;
} {
  return dark
    ? { paper: darkTheme, navigation: navDarkTheme }
    : { paper: lightTheme, navigation: navLightTheme };
}
