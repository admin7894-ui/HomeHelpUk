import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { getTheme, spacing } from '../utils/theme';

// Consistent page wrapper: safe area + background + optional scroll.
export default function ScreenContainer({ children, scroll = true, style }) {
  const { highContrast } = useAppStore();
  const theme = getTheme(highContrast);

  const Wrapper = scroll ? ScrollView : View;
  const wrapperProps = scroll
    ? { contentContainerStyle: [styles.scrollContent, style], showsVerticalScrollIndicator: false }
    : { style: [styles.flexContent, style] };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <Wrapper {...wrapperProps}>{children}</Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  flexContent: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
});
