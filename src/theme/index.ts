import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
  type MD3Theme,
} from 'react-native-paper';

type MD3Fonts = MD3Theme['fonts'];
import type { TextStyle, ViewStyle } from 'react-native';
// In Expo SDK 56, react-navigation is vendored inside expo-router.
import { DefaultTheme as NavLightBase, DarkTheme as NavDarkBase } from 'expo-router';

// ---------------------------------------------------------------------------
// "Vault Ledger" design system.
// A private, offline finance vault: deep emerald-ink surfaces, an engraved
// label system, and a strictly-rationed brass-gold that only ever marks value
// (net worth, asset totals) — tied to the app holding gold (XAU/XAG).
// ---------------------------------------------------------------------------

const FONT = {
  serif: {
    medium: 'Fraunces_500Medium',
    semibold: 'Fraunces_600SemiBold',
    bold: 'Fraunces_700Bold',
  },
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

// Numerals + headlines render in the serif; UI/body in the grotesque.
const TYPE = {
  moneyHero: {
    fontFamily: FONT.serif.semibold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  moneyLg: {
    fontFamily: FONT.serif.semibold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  moneyRow: {
    fontFamily: FONT.sans.semibold,
    fontSize: 15,
    letterSpacing: 0.1,
    fontVariant: ['tabular-nums'],
  },
  title: { fontFamily: FONT.serif.semibold, fontSize: 26, lineHeight: 30, letterSpacing: -0.3 },
  cardTitle: { fontFamily: FONT.sans.semibold, fontSize: 16, lineHeight: 22, letterSpacing: 0.1 },
  body: { fontFamily: FONT.sans.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0.1 },
  bodySm: { fontFamily: FONT.sans.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  // The engraved eyebrow — tiny, wide-tracked, uppercase. Section signatures.
  eyebrow: {
    fontFamily: FONT.sans.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  hero: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} satisfies Record<string, ViewStyle>;

export interface DesignTokens {
  font: typeof FONT;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  type: typeof TYPE;
  shadow: typeof SHADOW;
}

export const tokens: DesignTokens = {
  font: FONT,
  spacing: SPACING,
  radius: RADIUS,
  type: TYPE,
  shadow: SHADOW,
};

// Extra semantic colors layered on top of the Paper MD3 palette.
export interface SemanticColors {
  income: string;
  expense: string;
  positive: string;
  negative: string;
  neutral: string;
  /** Brass-gold. Reserved for value: net worth, asset totals, active tab. */
  gold: string;
  /** Subtle gold used for hairlines/wash under value moments. */
  goldDim: string;
}

export type AppTheme = MD3Theme & { semantic: SemanticColors; tokens: DesignTokens };

// --- Palettes --------------------------------------------------------------

const dark = {
  bg: '#0C1311',
  surface: '#15201C',
  surfaceAlt: '#0F1815',
  line: '#27352F',
  primary: '#34C79A',
  onPrimary: '#04231A',
  primaryContainer: '#11352B',
  onPrimaryContainer: '#9FE9D2',
  gold: '#E0A93E',
  goldDim: 'rgba(224,169,62,0.16)',
  textHi: '#EAF2EE',
  textLo: '#92A39D',
  positive: '#34C79A',
  negative: '#F0795E',
  neutral: '#6E827B',
};

const light = {
  bg: '#E9EEEB',
  surface: '#FBFCFB',
  surfaceAlt: '#F1F4F2',
  line: '#D5DEDA',
  primary: '#0C6B51',
  onPrimary: '#FFFFFF',
  primaryContainer: '#BCEBD9',
  onPrimaryContainer: '#00231A',
  gold: '#8A6310',
  goldDim: 'rgba(138,99,16,0.12)',
  textHi: '#0B1F1A',
  textLo: '#566761',
  positive: '#0C7A55',
  negative: '#B23A28',
  neutral: '#6B7A74',
};

type Palette = typeof dark;

function makeFonts(): MD3Fonts {
  // weight lives in the family file; keep fontWeight 'normal' to avoid
  // synthetic bolding mismatches on Android.
  const serif = (fontFamily: string, fontSize: number, lineHeight: number, letterSpacing: number) =>
    ({ fontFamily, fontWeight: 'normal', fontSize, lineHeight, letterSpacing } as const);
  const sans = (fontFamily: string, fontSize: number, lineHeight: number, letterSpacing: number) =>
    ({ fontFamily, fontWeight: 'normal', fontSize, lineHeight, letterSpacing } as const);

  return configureFonts({
    config: {
      displayLarge: serif(FONT.serif.semibold, 52, 58, -0.6),
      displayMedium: serif(FONT.serif.semibold, 42, 48, -0.5),
      displaySmall: serif(FONT.serif.semibold, 34, 40, -0.4),
      headlineLarge: serif(FONT.serif.semibold, 30, 36, -0.3),
      headlineMedium: serif(FONT.serif.semibold, 26, 32, -0.3),
      headlineSmall: serif(FONT.serif.semibold, 22, 28, -0.2),
      titleLarge: sans(FONT.sans.semibold, 20, 26, 0),
      titleMedium: sans(FONT.sans.semibold, 16, 22, 0.1),
      titleSmall: sans(FONT.sans.semibold, 14, 20, 0.1),
      bodyLarge: sans(FONT.sans.regular, 16, 24, 0.15),
      bodyMedium: sans(FONT.sans.regular, 15, 22, 0.1),
      bodySmall: sans(FONT.sans.regular, 13, 18, 0.1),
      labelLarge: sans(FONT.sans.semibold, 14, 20, 0.3),
      labelMedium: sans(FONT.sans.medium, 12, 16, 0.5),
      labelSmall: sans(FONT.sans.medium, 11, 16, 0.6),
    },
  });
}

function buildTheme(base: MD3Theme, p: Palette): AppTheme {
  return {
    ...base,
    roundness: RADIUS.md,
    fonts: makeFonts(),
    colors: {
      ...base.colors,
      primary: p.primary,
      onPrimary: p.onPrimary,
      primaryContainer: p.primaryContainer,
      onPrimaryContainer: p.onPrimaryContainer,
      secondary: p.primary,
      onSecondary: p.onPrimary,
      secondaryContainer: p.primaryContainer,
      onSecondaryContainer: p.onPrimaryContainer,
      tertiary: p.gold,
      background: p.bg,
      onBackground: p.textHi,
      surface: p.surface,
      onSurface: p.textHi,
      surfaceVariant: p.surfaceAlt,
      onSurfaceVariant: p.textLo,
      surfaceDisabled: p.surfaceAlt,
      outline: p.line,
      outlineVariant: p.line,
      error: p.negative,
      elevation: {
        level0: 'transparent',
        level1: p.surface,
        level2: p.surface,
        level3: p.surfaceAlt,
        level4: p.surfaceAlt,
        level5: p.surfaceAlt,
      },
    },
    semantic: {
      income: p.positive,
      expense: p.negative,
      positive: p.positive,
      negative: p.negative,
      neutral: p.neutral,
      gold: p.gold,
      goldDim: p.goldDim,
    },
    tokens,
  };
}

export const lightTheme = buildTheme(MD3LightTheme, light);
export const darkTheme = buildTheme(MD3DarkTheme, dark);

export const navLightTheme = {
  ...NavLightBase,
  colors: {
    ...NavLightBase.colors,
    primary: light.primary,
    background: light.bg,
    card: light.surface,
    text: light.textHi,
    border: light.line,
  },
};

export const navDarkTheme = {
  ...NavDarkBase,
  colors: {
    ...NavDarkBase.colors,
    primary: dark.primary,
    background: dark.bg,
    card: dark.surface,
    text: dark.textHi,
    border: dark.line,
  },
};

export function getThemes(isDark: boolean): {
  paper: AppTheme;
  navigation: typeof navLightTheme | typeof navDarkTheme;
} {
  return isDark
    ? { paper: darkTheme, navigation: navDarkTheme }
    : { paper: lightTheme, navigation: navLightTheme };
}
