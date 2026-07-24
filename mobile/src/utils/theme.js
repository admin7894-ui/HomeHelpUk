export const baseColors = {
  primary: '#0A3925',       // Deep Forest Green
  primaryDark: '#052417',   // Ultra Dark Forest Green
  secondary: '#0E4D33',     // Rich Emerald Green
  accent: '#EAB308',        // Warm Gold / Mustard
  accentLight: '#FACC15',   // Bright Gold
  success: '#16A34A',       // Vibrant Green
  warning: '#D97706',       // Warm Amber
  danger: '#EF4444',        // Red
  white: '#FFFFFF',
  sageBg: '#F4F7F5',        // Soft Sage Background
  ink: '#111827',           // Dark Charcoal
  slate: '#4B5563',         // Muted Charcoal/Slate
  border: '#E2E8F0',
  forestSoft: '#E6ECE8',    // Soft Forest Tint
  goldSoft: '#FEF9C3',      // Soft Gold Tint
  amber: '#EAB308',
};

export const lightTheme = {
  mode: 'light',
  contrast: 'normal',
  background: baseColors.sageBg,
  surface: baseColors.white,
  text: baseColors.ink,
  textMuted: baseColors.slate,
  border: baseColors.border,
  customerAccent: baseColors.primary,
  customerAccentSoft: baseColors.forestSoft,
  providerAccent: baseColors.secondary,
  providerAccentSoft: baseColors.forestSoft,
  goldAccent: baseColors.accent,
  goldAccentSoft: baseColors.goldSoft,
  primaryButtonText: baseColors.white,
  amber: baseColors.amber,
  success: baseColors.success,
  warning: baseColors.warning,
  danger: baseColors.danger,
  accent: baseColors.accent,
  forestCircleBg: baseColors.primary,
  shadow: {
    shadowColor: '#0A3925',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  }
};

export const highContrastTheme = {
  mode: 'high-contrast',
  contrast: 'high',
  background: '#000000',
  surface: '#0B0B0B',
  text: '#FFFFFF',
  textMuted: '#E5E5E5',
  border: '#FFFFFF',
  customerAccent: '#FFD34D',
  customerAccentSoft: '#2A2400',
  providerAccent: '#4DE8D8',
  providerAccentSoft: '#003330',
  goldAccent: '#FFD34D',
  goldAccentSoft: '#2A2400',
  primaryButtonText: '#000000',
  amber: '#FFD34D',
  success: '#4CE07B',
  warning: '#FFD34D',
  danger: '#FF6B60',
  accent: '#4DE8D8',
  forestCircleBg: '#1A5D40',
  shadow: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  }
};

export const fontScales = {
  small: 0.9,
  default: 1,
  large: 1.15,
  extraLarge: 1.35,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radii = { sm: 8, md: 14, lg: 20, xl: 28, pill: 9999 };

export const layout = {
  screenPadding: 20,
  cardPadding: 18,
  cardGap: 14,
  sectionGap: 20,
  borderRadius: 20,
};

export function getTheme(highContrast) {
  return highContrast ? highContrastTheme : lightTheme;
}

export function scaledFont(base, scaleKey = 'default') {
  return Math.round(base * (fontScales[scaleKey] || 1));
}
