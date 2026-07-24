import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/theme';

export default function StarRating({ rating, onChange, size = 24, readOnly = false }) {
  const { highContrast } = useAppStore();
  const theme = getTheme(highContrast);
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row} accessibilityRole={readOnly ? 'text' : 'adjustable'} accessibilityLabel={`Rating ${rating} out of 5 stars`}>
      {stars.map((star) => (
        <Pressable
          key={star}
          disabled={readOnly}
          accessibilityRole={readOnly ? undefined : 'button'}
          accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
          onPress={() => onChange && onChange(star)}
          hitSlop={8}
        >
          <Ionicons
            name={star <= Math.round(rating) ? 'star' : 'star-outline'}
            size={size}
            color={theme.amber}
            style={{ marginRight: 4 }}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
