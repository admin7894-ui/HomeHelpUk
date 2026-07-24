import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';
import { getTheme, scaledFont, spacing } from '../utils/theme';

export default function SectionTitle({ children, accessibilityRole = 'header', style }) {
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);

  return (
    <Text
      accessibilityRole={accessibilityRole}
      style={[styles.title, { color: theme.text, fontSize: scaledFont(20, fontScale) }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.sm },
});
