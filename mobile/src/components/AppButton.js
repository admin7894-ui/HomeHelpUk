import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/appStore';
import { getTheme, scaledFont, radii, spacing } from '../utils/theme';

export default function AppButton({
  label,
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  accent = 'customer', // 'customer' | 'provider'
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
}) {
  const buttonText = label || title || '';
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);
  const accentColor = accent === 'provider' ? theme.providerAccent : theme.customerAccent;

  const backgroundColor =
    variant === 'primary'
      ? accentColor
      : variant === 'secondary'
        ? (accent === 'provider' ? theme.providerAccentSoft : theme.customerAccentSoft)
        : variant === 'danger'
          ? theme.danger
          : 'transparent';
  const textColor = variant === 'outline' || variant === 'secondary' ? accentColor : theme.primaryButtonText;
  const borderColor = variant === 'outline' ? accentColor : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor, borderWidth: variant === 'outline' ? 2 : 0, opacity: pressed ? 0.85 : 1 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize: scaledFont(15, fontScale) }]}>{buttonText}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
