import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryImage } from '../utils/categoryImages';
import { getTheme, radii } from '../utils/theme';
import { useAppStore } from '../store/appStore';

export default function CategoryCard({ item, onPress, style }) {
  const { highContrast } = useAppStore();
  const theme = getTheme(highContrast);

  const imageSource = getCategoryImage(item.id);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.cardPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} Category`}
    >
      {/* 1. Full-Width Top Image Section with No Inner Padding */}
      <View style={styles.imageContainer}>
        {imageSource ? (
          <Image
            source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource}
            style={styles.categoryImg}
          />
        ) : (
          <View style={[styles.placeholderBox, { backgroundColor: theme.customerAccentSoft }]}>
            <Ionicons name="construct-outline" size={32} color={theme.customerAccent} />
          </View>
        )}

        {/* 2. Top-Right Frosted Circular/Rounded Arrow Overlay Button (↗) */}
        <View style={styles.arrowOverlayCircle}>
          <Ionicons name="arrow-up" size={16} color="#0A3925" style={{ transform: [{ rotate: '45deg' }] }} />
        </View>
      </View>

      {/* 3. Compact Card Body Content */}
      <View style={styles.bodyContent}>
        {/* Category Name */}
        <Text numberOfLines={1} style={[styles.nameText, { color: theme.text }]}>
          {item.name}
        </Text>

        {/* 4. Restyled Price Display with Leading Icon */}
        <View style={styles.priceRow}>
          <Ionicons name="sparkles" size={12} color={theme.textMuted} style={{ marginRight: 4 }} />
          <Text numberOfLines={1} style={[styles.priceText, { color: theme.textMuted }]}>
            from <Text style={styles.priceBoldText}>£{item.price || 20}</Text>{item.unit === 'hr' || !item.unit ? '/hr' : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  categoryImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOverlayCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bodyContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nameText: {
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceBoldText: {
    fontWeight: '800',
    color: '#0A3925',
  },
});
