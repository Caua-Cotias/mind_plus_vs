import { Platform } from 'react-native';

export const ColorTokens = {
  background: '#080B14',
  surface: '#111827',
  surfaceRaised: '#182235',
  surfaceSelected: '#202D43',
  primary: '#7567F8',
  primaryPressed: '#6557E8',
  secondary: '#70D6FF',
  textPrimary: '#F5F7FF',
  textSecondary: '#A7B0C2',
  border: '#2B3548',
  danger: '#FF7B86',
  dangerSurface: '#2A151C',
  success: '#73D6A4',
} as const;

export const Colors = {
  light: {
    text: ColorTokens.textPrimary,
    background: ColorTokens.background,
    backgroundElement: ColorTokens.surface,
    backgroundSelected: ColorTokens.surfaceSelected,
    textSecondary: ColorTokens.textSecondary,
    accent: ColorTokens.secondary,
    primary: ColorTokens.primary,
    border: ColorTokens.border,
    danger: ColorTokens.danger,
  },
  dark: {
    text: ColorTokens.textPrimary,
    background: ColorTokens.background,
    backgroundElement: ColorTokens.surface,
    backgroundSelected: ColorTokens.surfaceSelected,
    textSecondary: ColorTokens.textSecondary,
    accent: ColorTokens.secondary,
    primary: ColorTokens.primary,
    border: ColorTokens.border,
    danger: ColorTokens.danger,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Typography = {
  caption: 12,
  bodySmall: 14,
  body: 16,
  titleSmall: 20,
  title: 28,
  display: 36,
} as const;

export const Radii = {
  small: 8,
  medium: 14,
  large: 20,
  extraLarge: 28,
  pill: 999,
} as const;

export const Interaction = {
  pressedOpacity: 0.78,
  disabledOpacity: 0.48,
  minimumTargetSize: 44,
  transitionDuration: 180,
} as const;

export const Feedback = {
  loading: ColorTokens.secondary,
  errorText: ColorTokens.danger,
  errorSurface: ColorTokens.dangerSurface,
  skeleton: ColorTokens.surfaceRaised,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
