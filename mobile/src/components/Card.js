import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';
import { getTheme, layout } from '../utils/theme';

export default function Card({ children, style }) {
  const { highContrast } = useAppStore();
  const theme = getTheme(highContrast);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: highContrast ? 'transparent' : '#000' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    padding: layout.cardPadding,
    marginBottom: layout.cardGap,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
