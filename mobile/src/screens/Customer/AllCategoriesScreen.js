import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import CategoryCard from '../../components/CategoryCard';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

const { width } = Dimensions.get('window');

export default function AllCategoriesScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { categories } = useBookingStore();
  const theme = getTheme(highContrast);
  const [search, setSearch] = useState('');

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCategoryPress = (category) => {
    navigation.navigate('CategoryDetail', { categoryId: category.id });
  };

  return (
    <ScreenContainer>
      {/* Header Row */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>
          All Categories
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={20} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search for a service..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text, fontSize: scaledFont(15, fontScale) }]}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 2-Column Grid of Redesigned Category Cards */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.categoryGrid}>
          {filteredCategories.map((item) => (
            <CategoryCard
              key={item.id}
              item={item}
              onPress={() => handleCategoryPress(item)}
              style={styles.categoryGridItem}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontWeight: '900' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { flex: 1, height: '100%', fontWeight: '600' },
  scrollContent: { paddingBottom: 60 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryGridItem: {
    width: (width - 40 - 12) / 2,
    marginBottom: 4,
  },
});
