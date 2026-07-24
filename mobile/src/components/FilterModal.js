import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import AppButton from './AppButton';
import { getTheme, scaledFont, spacing, radii } from '../utils/theme';
import { useAppStore } from '../store/appStore';

export const DEFAULT_FILTERS = {
  selectedCatIds: [],
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  sortBy: 'default',
};

export function countActiveFilters(filters) {
  let count = 0;
  if (filters.selectedCatIds && filters.selectedCatIds.length > 0) count++;
  if (filters.minPrice !== '' && filters.minPrice !== undefined && Number(filters.minPrice) > 0) count++;
  if (filters.maxPrice !== '' && filters.maxPrice !== undefined && Number(filters.maxPrice) < 500) count++;
  if (filters.minRating && filters.minRating > 0) count++;
  if (filters.sortBy && filters.sortBy !== 'default') count++;
  return count;
}

export default function FilterModal({
  visible,
  onClose,
  onApply,
  onReset,
  categories = [],
  initialFilters = DEFAULT_FILTERS,
}) {
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);

  const [selectedCatIds, setSelectedCatIds] = useState(initialFilters.selectedCatIds || []);
  const [minPrice, setMinPrice] = useState(String(initialFilters.minPrice || ''));
  const [maxPrice, setMaxPrice] = useState(String(initialFilters.maxPrice || ''));
  const [minRating, setMinRating] = useState(initialFilters.minRating || 0);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'default');

  useEffect(() => {
    if (visible) {
      setSelectedCatIds(initialFilters.selectedCatIds || []);
      setMinPrice(initialFilters.minPrice !== undefined ? String(initialFilters.minPrice) : '');
      setMaxPrice(initialFilters.maxPrice !== undefined ? String(initialFilters.maxPrice) : '');
      setMinRating(initialFilters.minRating || 0);
      setSortBy(initialFilters.sortBy || 'default');
    }
  }, [visible, initialFilters]);

  const toggleCategory = (catId) => {
    if (selectedCatIds.includes(catId)) {
      setSelectedCatIds(selectedCatIds.filter((id) => id !== catId));
    } else {
      setSelectedCatIds([...selectedCatIds, catId]);
    }
  };

  const handleSelectAllCats = () => {
    if (selectedCatIds.length === categories.length) {
      setSelectedCatIds([]);
    } else {
      setSelectedCatIds(categories.map((c) => c.id));
    }
  };

  const handleReset = () => {
    setSelectedCatIds([]);
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setSortBy('default');
    if (onReset) onReset();
  };

  const handleApply = () => {
    const updated = {
      selectedCatIds,
      minPrice: minPrice ? Number(minPrice) : '',
      maxPrice: maxPrice ? Number(maxPrice) : '',
      minRating,
      sortBy,
    };
    onApply(updated);
    onClose();
  };

  const activeCount = countActiveFilters({
    selectedCatIds,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close filters">
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text, fontSize: scaledFont(18, fontScale) }]}>
              Filter Services
            </Text>
            <Pressable onPress={handleReset} style={styles.resetBtn} accessibilityRole="button" accessibilityLabel="Reset all filters">
              <Text style={{ color: theme.customerAccent, fontWeight: '700', fontSize: 14 }}>Reset All</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Category Multi-Select Filter */}
            <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
                <Pressable onPress={handleSelectAllCats}>
                  <Text style={{ color: theme.customerAccent, fontWeight: '700', fontSize: 13 }}>
                    {selectedCatIds.length === categories.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.chipGrid}>
                {categories.map((cat) => {
                  const selected = selectedCatIds.includes(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? theme.customerAccent : theme.border,
                          backgroundColor: selected ? theme.customerAccentSoft : theme.background,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={selected ? theme.customerAccent : theme.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ color: selected ? theme.customerAccent : theme.text, fontWeight: '700', fontSize: 13 }}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Price Range Filter */}
            <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Price Range (£ / hr)</Text>
              <View style={styles.priceRow}>
                <View style={[styles.priceInputBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <Text style={{ color: theme.textMuted, fontWeight: '700' }}>£</Text>
                  <TextInput
                    placeholder="Min"
                    placeholderTextColor={theme.textMuted}
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                    style={[styles.priceInput, { color: theme.text }]}
                  />
                </View>
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>to</Text>
                <View style={[styles.priceInputBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <Text style={{ color: theme.textMuted, fontWeight: '700' }}>£</Text>
                  <TextInput
                    placeholder="Max"
                    placeholderTextColor={theme.textMuted}
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                    style={[styles.priceInput, { color: theme.text }]}
                  />
                </View>
              </View>

              {/* Price Preset Chips */}
              <View style={styles.presetRow}>
                <Pressable
                  onPress={() => { setMinPrice('0'); setMaxPrice('30'); }}
                  style={[styles.presetChip, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Under £30</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setMinPrice('30'); setMaxPrice('60'); }}
                  style={[styles.presetChip, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>£30 - £60</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setMinPrice('60'); setMaxPrice(''); }}
                  style={[styles.presetChip, { borderColor: theme.border, backgroundColor: theme.background }]}
                >
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Over £60</Text>
                </Pressable>
              </View>
            </Card>

            {/* Minimum Rating Filter */}
            <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Minimum Rating</Text>
              <View style={styles.chipRow}>
                {[0, 4.0, 4.5].map((stars) => {
                  const selected = minRating === stars;
                  return (
                    <Pressable
                      key={stars}
                      onPress={() => setMinRating(stars)}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? theme.customerAccent : theme.border,
                          backgroundColor: selected ? theme.customerAccentSoft : theme.background,
                        },
                      ]}
                    >
                      <Ionicons
                        name="star"
                        size={14}
                        color={selected ? theme.customerAccent : '#F5A623'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={{ color: selected ? theme.customerAccent : theme.text, fontWeight: '700', fontSize: 13 }}>
                        {stars === 0 ? 'Any Rating' : `${stars}+ Stars`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Sort Options */}
            <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Sort By</Text>
              <View style={styles.sortColumn}>
                {[
                  { id: 'default', label: 'Recommended / Popularity' },
                  { id: 'price_asc', label: 'Price: Low to High' },
                  { id: 'price_desc', label: 'Price: High to Low' },
                  { id: 'rating_desc', label: 'Highest Rating' },
                ].map((opt) => {
                  const selected = sortBy === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setSortBy(opt.id)}
                      style={[
                        styles.sortOption,
                        {
                          borderColor: selected ? theme.customerAccent : theme.border,
                          backgroundColor: selected ? theme.customerAccentSoft : theme.background,
                        },
                      ]}
                    >
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? theme.customerAccent : theme.textMuted}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ color: selected ? theme.customerAccent : theme.text, fontWeight: '700', fontSize: 13 }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </ScrollView>

          {/* Footer Apply Action */}
          <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
            <AppButton
              label={activeCount > 0 ? `Apply ${activeCount} ${activeCount === 1 ? 'Filter' : 'Filters'}` : 'Apply Filters'}
              onPress={handleApply}
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontWeight: '800' },
  resetBtn: { padding: 4 },
  scrollContent: { padding: spacing.md, paddingBottom: 80 },
  card: { marginBottom: spacing.md, padding: spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontWeight: '800', fontSize: 15, marginBottom: spacing.xs },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  priceInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    height: 40,
  },
  priceInput: { flex: 1, height: '100%', marginLeft: 4, fontWeight: '700' },
  presetRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  sortColumn: { gap: spacing.xs, marginTop: spacing.xs },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
  },
});
