import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Dimensions, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import VoiceAssistanceButton from '../../components/VoiceAssistanceButton';
import FilterModal, { DEFAULT_FILTERS, countActiveFilters } from '../../components/FilterModal';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii, layout } from '../../utils/theme';
import { getCategoryImage } from '../../utils/categoryImages';
import { getServiceImage, resolveImageSource } from '../../utils/serviceImages';

const { width } = Dimensions.get('window');

const STATUS_LABELS = {
  pending: 'Requested',
  assigned: 'Confirmed',
  accepted: 'Accepted',
  confirmed: 'Confirmed',
  en_route: 'En Route',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

const ACTIVE_STATUS_SET = new Set([
  'pending',
  'accepted',
  'confirmed',
  'assigned',
  'en_route',
  'arrived',
  'in_progress',
]);

const INACTIVE_STATUS_SET = new Set([
  'completed',
  'cancelled',
  'declined',
  'rejected',
  'refunded',
]);

const STATUS_PRIORITY = {
  in_progress: 5,
  arrived: 4,
  en_route: 3,
  assigned: 2,
  confirmed: 2,
  accepted: 2,
  pending: 1,
};

const getActiveBooking = (bookingList) => {
  if (!Array.isArray(bookingList) || bookingList.length === 0) return null;

  const activeBookings = bookingList.filter((b) => {
    if (!b || !b.status) return false;
    const s = String(b.status).toLowerCase().trim();
    return ACTIVE_STATUS_SET.has(s) && !INACTIVE_STATUS_SET.has(s);
  });

  if (activeBookings.length === 0) return null;

  return [...activeBookings].sort((a, b) => {
    const statusA = String(a.status).toLowerCase().trim();
    const statusB = String(b.status).toLowerCase().trim();
    const prioA = STATUS_PRIORITY[statusA] || 0;
    const prioB = STATUS_PRIORITY[statusB] || 0;

    if (prioA !== prioB) {
      return prioB - prioA;
    }

    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  })[0];
};

export default function HomeScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const { categories, fetchCategories, bookings, fetchBookings } = useBookingStore();
  const theme = getTheme(highContrast);
  
  const [search, setSearch] = useState('');
  const [selectedCatChip, setSelectedCatChip] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [favorites, setFavorites] = useState({});

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Concurrent parallel fetch on mount
    Promise.all([
      fetchCategories(),
      user ? fetchBookings({ customerId: user.id }) : Promise.resolve([])
    ]).catch(() => {});
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCategories(true),
        user ? fetchBookings({ customerId: user.id }, true) : Promise.resolve([])
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const activeFilterCount = countActiveFilters(appliedFilters);

  const toggleFavorite = (id) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter Pipeline (Memoized)
  const sortedCategories = React.useMemo(() => {
    const filtered = categories.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchCat = c.name.toLowerCase().includes(q);
        const matchService = c.subcategories?.some(sub => sub.services?.some(s => s.name.toLowerCase().includes(q)));
        if (!matchCat && !matchService) return false;
      }

      if (appliedFilters.selectedCatIds && appliedFilters.selectedCatIds.length > 0) {
        if (!appliedFilters.selectedCatIds.includes(c.id)) return false;
      }

      const catPrice = Number(c.price || 20);
      if (appliedFilters.minPrice !== '' && appliedFilters.minPrice !== undefined) {
        if (catPrice < Number(appliedFilters.minPrice)) return false;
      }
      if (appliedFilters.maxPrice !== '' && appliedFilters.maxPrice !== undefined) {
        if (catPrice > Number(appliedFilters.maxPrice)) return false;
      }

      const catRating = Number(c.rating || 4.8);
      if (appliedFilters.minRating && appliedFilters.minRating > 0) {
        if (catRating < appliedFilters.minRating) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (appliedFilters.sortBy === 'price_asc') {
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      }
      if (appliedFilters.sortBy === 'price_desc') {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }
      if (appliedFilters.sortBy === 'rating_desc') {
        return (Number(b.rating) || 4.8) - (Number(a.rating) || 4.8);
      }
      return 0;
    });
  }, [categories, search, appliedFilters]);

  // Extract individual bookable services for Popular Services section
  const allServicesList = [];
  categories.forEach(cat => {
    cat.subcategories?.forEach(sub => {
      sub.services?.forEach(srv => {
        allServicesList.push({
          ...srv,
          categoryName: cat.name,
          categoryId: cat.id,
          discount: '10% OFF',
          rating: srv.rating || 4.9,
          reviewsCount: srv.reviewsCount || '1.2K'
        });
      });
    });
  });

  const filteredServices = allServicesList.filter(s => {
    if (selectedCatChip && s.categoryId !== selectedCatChip) return false;
    if (search.trim()) {
      return s.name.toLowerCase().includes(search.trim().toLowerCase());
    }
    return true;
  });

  const activeBooking = getActiveBooking(bookings);

  const banners = [
    {
      id: 'banner_1',
      tag: "Today's Exclusive Deals",
      title: 'Get Special Offers',
      discount: 'Up to 20%',
      code: 'SUMMER20',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&q=80',
    },
    {
      id: 'banner_2',
      tag: "Spring Seasonal",
      title: 'Gardening & Lawn Care',
      discount: 'Up to 15%',
      code: 'GARDEN15',
      image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500&q=80',
    },
    {
      id: 'banner_3',
      tag: "Handyman Special",
      title: 'Home Repair Deals',
      discount: 'Flat £20 OFF',
      code: 'FIX20',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80',
    },
  ];

  const reviews = [
    { id: '1', name: 'Emily R.', rating: 5, comment: 'Tomasz assembled my bed in an hour. Absolute lifesaver!', service: 'Furniture Assembly' },
    { id: '2', name: 'Marcus K.', rating: 5, comment: 'Aisha did a fantastic end-of-tenancy clean. Got my full deposit back.', service: 'End of Tenancy Cleaning' },
  ];

  const categoryIcons = {
    cat_cooking: 'restaurant',
    cat_cleaning: 'sparkles',
    cat_plumbing: 'water',
    cat_electrical: 'flash',
    cat_handyman: 'build',
    cat_painting: 'color-palette',
    cat_gardening: 'leaf',
  };

  return (
    <View style={styles.screenBg}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#15803D']}
            tintColor="#15803D"
          />
        }
      >
        {/* 1. Header & Integrated Search Bar Block (Forest Green Theme) */}
        <View style={styles.topForestHeader}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.locationContainer}>
              <Image
                source={{ uri: user?.avatar || `https://i.pravatar.cc/150?u=${user?.email || 'guest'}` }}
                style={styles.avatarImg}
              />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.locationLabel}>Location</Text>
                <Pressable style={styles.locationPickerRow}>
                  <Ionicons name="location" size={14} color="#EAB308" style={{ marginRight: 4 }} />
                  <Text style={styles.locationValue}>London, UK</Text>
                  <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </Pressable>
              </View>
            </View>

            <View style={styles.headerIconsRow}>
              <Pressable
                onPress={() => navigation.navigate('Notifications')}
                style={styles.headerIconCircle}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
              >
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                <View style={styles.redBadgeDot} />
              </Pressable>
            </View>
          </View>

          {/* Integrated Compact Search Bar & Filter Button */}
          <View style={styles.searchContainerRow}>
            <View style={styles.searchBarBox}>
              <Ionicons name="search-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search for a service..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInputText}
              />
              {!!search && (
                <Pressable onPress={() => setSearch('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => setFilterModalVisible(true)}
              style={[
                styles.integratedFilterBtn,
                activeFilterCount > 0 && { backgroundColor: '#FACC15' }
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter services"
            >
              <Ionicons name="options-outline" size={20} color="#0A3925" />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadgeCount}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.bodyContentPadding}>
          {/* Active Filter Summary Bar */}
          {activeFilterCount > 0 && (
            <View style={[styles.activeFilterBar, { backgroundColor: theme.customerAccentSoft, borderColor: theme.border }]}>
              <Ionicons name="funnel" size={16} color={theme.customerAccent} style={{ marginRight: 6 }} />
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13, flex: 1 }}>
                {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filters'} Active ({sortedCategories.length} Categories Found)
              </Text>
              <Pressable onPress={() => setAppliedFilters(DEFAULT_FILTERS)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 12 }}>Clear All</Text>
              </Pressable>
            </View>
          )}

          {/* 2. Exclusive Offers Carousel Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>Exclusive Offers</Text>
              <Pressable onPress={() => navigation.navigate('AllCategories')}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const idx = Math.round(offsetX / (width - 40));
                setActiveBannerIdx(idx);
              }}
              scrollEventThrottle={16}
              style={styles.bannerScrollView}
            >
              {banners.map((b) => (
                <View key={b.id} style={styles.offerBannerCard}>
                  <Image source={{ uri: b.image }} style={styles.offerBannerImg} />
                  <View style={styles.offerOverlayContent}>
                    <Text style={styles.offerTagText}>{b.tag}</Text>
                    <Text style={styles.offerTitleText}>{b.title}</Text>
                    <Text style={styles.offerDiscountText}>{b.discount}</Text>

                    <Pressable style={styles.claimPillBtn}>
                      <Text style={styles.claimPillBtnText}>Claim</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Carousel Pagination Dots */}
            <View style={styles.paginationDotsRow}>
              {banners.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    activeBannerIdx === idx ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>
          </View>

          {/* 3. Horizontal Service Categories Pill Row */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>Service Categories</Text>
              <Pressable onPress={() => navigation.navigate('AllCategories')}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPillsScroll}>
              <Pressable
                onPress={() => setSelectedCatChip(null)}
                style={[
                  styles.categoryPillChip,
                  !selectedCatChip && styles.categoryPillChipActive
                ]}
              >
                <View style={[styles.pillIconCircle, !selectedCatChip && { backgroundColor: '#FFFFFF' }]}>
                  <Ionicons name="grid" size={16} color={!selectedCatChip ? '#0A3925' : '#FFFFFF'} />
                </View>
                <Text style={[styles.pillLabelText, !selectedCatChip && styles.pillLabelTextActive]}>All</Text>
              </Pressable>

              {sortedCategories.map((c) => {
                const isSelected = selectedCatChip === c.id;
                const iconName = categoryIcons[c.id] || 'construct';
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCatChip(isSelected ? null : c.id)}
                    style={[
                      styles.categoryPillChip,
                      isSelected && styles.categoryPillChipActive
                    ]}
                  >
                    <View style={[styles.pillIconCircle, isSelected && { backgroundColor: '#FFFFFF' }]}>
                      <Ionicons name={iconName} size={16} color={isSelected ? '#0A3925' : '#FFFFFF'} />
                    </View>
                    <Text style={[styles.pillLabelText, isSelected && styles.pillLabelTextActive]}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. Popular Services Horizontal Scroll Cards */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>Popular Services</Text>
              <Pressable onPress={() => navigation.navigate('AllCategories')}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>

            {filteredServices.length === 0 ? (
              <Card style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={40} color={theme.textMuted} style={{ marginBottom: spacing.xs }} />
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>No Services Match Filter</Text>
                <Pressable
                  onPress={() => { setSearch(''); setSelectedCatChip(null); setAppliedFilters(DEFAULT_FILTERS); }}
                  style={[styles.resetBtn, { backgroundColor: '#0A3925' }]}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Reset Filters</Text>
                </Pressable>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularServicesScroll}>
                {filteredServices.slice(0, 10).map((srv) => {
                  const isFav = Boolean(favorites[srv.id]);
                  const srvImage = getServiceImage(srv);
                  return (
                    <Pressable
                      key={srv.id}
                      onPress={() => navigation.navigate('ServiceDetail', { serviceId: srv.id, service: srv })}
                      style={styles.serviceCardWrapper}
                    >
                      <Card style={styles.serviceCardBox}>
                        <View style={styles.serviceImageContainer}>
                          <Image source={resolveImageSource(srvImage)} style={styles.serviceCardImg} />
                          {/* Discount Badge */}
                          <View style={styles.discountBadgeTop}>
                            <Text style={styles.discountBadgeText}>{srv.discount}</Text>
                          </View>
                          {/* Heart Favorite Button */}
                          <Pressable onPress={() => toggleFavorite(srv.id)} style={styles.heartBtnCircle}>
                            <Ionicons
                              name={isFav ? 'heart' : 'heart-outline'}
                              size={18}
                              color={isFav ? '#EF4444' : '#0A3925'}
                            />
                          </Pressable>
                        </View>

                        <View style={styles.serviceCardInfo}>
                          <Text numberOfLines={1} style={styles.serviceTitleText}>{srv.name}</Text>
                          <Text style={styles.categorySubLabel}>{srv.categoryName}</Text>
                          
                          <View style={styles.ratingPriceRow}>
                            <View style={styles.starRatingRow}>
                              <Ionicons name="star" size={14} color="#EAB308" />
                              <Text style={styles.ratingValText}>{srv.rating}</Text>
                              <Text style={styles.reviewsCountText}>({srv.reviewsCount})</Text>
                            </View>
                            <Text style={styles.servicePriceText}>From £{srv.price}</Text>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* 5. Track Active Booking */}
          {activeBooking && (
            <View style={styles.sectionContainer}>
              <Pressable
                onPress={() => navigation.navigate('BookingStatus', { bookingId: activeBooking.id })}
              >
                <Card style={[styles.bookAgainCard, { backgroundColor: '#F0FDF4', borderColor: '#4ADE80' }]}>
                  <View style={styles.bookAgainRow}>
                    <View style={[styles.bookAgainIcon, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="sync" size={20} color="#16A34A" />
                    </View>
                    <View style={styles.bookAgainText}>
                      <Text style={{ color: '#166534', fontWeight: '800', fontSize: scaledFont(15, fontScale) }}>
                        Track Active Booking
                      </Text>
                      <Text style={{ color: '#15803D', fontSize: scaledFont(13, fontScale), marginTop: 2 }}>
                        View status of your booking ({STATUS_LABELS[activeBooking.status?.toLowerCase()] || activeBooking.status})
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#15803D" />
                  </View>
                </Card>
              </Pressable>
            </View>
          )}

          {/* 6. Customer Reviews Slider */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitleText, { marginBottom: 14 }]}>What Customers Say</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewsScroll}>
              {reviews.map((r) => (
                <Card key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{r.name}</Text>
                    <View style={styles.stars}>
                      {[...Array(r.rating)].map((_, i) => (
                        <Ionicons key={i} name="star" size={14} color="#EAB308" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewText}>"{r.comment}"</Text>
                  <Text style={styles.reviewService}>Verified • {r.service}</Text>
                </Card>
              ))}
            </ScrollView>
          </View>

          <VoiceAssistanceButton
            textToRead={`Hello ${user?.name || 'Guest'}. Welcome back to Home Help U K. Find premium cleaning, plumbing, electrical, handyman, painting and gardening services easily.`}
          />
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(filters) => setAppliedFilters(filters)}
        onReset={() => setAppliedFilters(DEFAULT_FILTERS)}
        categories={categories}
        initialFilters={appliedFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: { flex: 1, backgroundColor: '#F4F7F5' },
  scrollContent: { paddingBottom: 100 },
  topForestHeader: {
    backgroundColor: '#0A3925',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  avatarImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#EAB308' },
  locationLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontWeight: '600' },
  locationPickerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationValue: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  headerIconsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redBadgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0A3925',
  },
  searchContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    paddingHorizontal: 16,
  },
  searchInputText: { flex: 1, height: '100%', color: '#111827', fontWeight: '600' },
  integratedFilterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  bodyContentPadding: { paddingHorizontal: 20, paddingTop: 20 },
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionContainer: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleText: { fontWeight: '900', fontSize: 18, color: '#0A3925' },
  seeAllText: { color: '#D97706', fontWeight: '800', fontSize: 14 },
  bannerScrollView: { height: 160 },
  offerBannerCard: {
    width: width - 40,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 16,
    backgroundColor: '#0A3925',
  },
  offerBannerImg: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  offerOverlayContent: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'center' },
  offerTagText: { color: '#EAB308', fontWeight: '800', fontSize: 12, marginBottom: 4 },
  offerTitleText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20, lineHeight: 24 },
  offerDiscountText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginBottom: 12, opacity: 0.9 },
  claimPillBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAB308',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  claimPillBtnText: { color: '#0A3925', fontWeight: '900', fontSize: 13 },
  paginationDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  dot: { height: 8, borderRadius: 4 },
  activeDot: { width: 20, backgroundColor: '#EAB308' },
  inactiveDot: { width: 8, backgroundColor: '#CBD5E1' },
  categoryPillsScroll: { flexDirection: 'row' },
  categoryPillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillChipActive: {
    backgroundColor: '#0A3925',
    borderColor: '#0A3925',
  },
  pillIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0A3925',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pillLabelText: { color: '#0A3925', fontWeight: '800', fontSize: 13 },
  pillLabelTextActive: { color: '#FFFFFF' },
  popularServicesScroll: { flexDirection: 'row' },
  serviceCardWrapper: { width: 220, marginRight: 16 },
  serviceCardBox: { padding: 0, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  serviceImageContainer: { width: '100%', height: 130, position: 'relative' },
  serviceCardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  discountBadgeTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  discountBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  heartBtnCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceCardInfo: { padding: 12 },
  serviceTitleText: { fontWeight: '800', fontSize: 15, color: '#111827' },
  categorySubLabel: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  ratingPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  starRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingValText: { fontWeight: '800', fontSize: 12, color: '#111827', marginLeft: 2 },
  reviewsCountText: { fontSize: 11, color: '#64748B' },
  servicePriceText: { fontWeight: '900', fontSize: 14, color: '#0A3925' },
  bookAgainCard: { borderWidth: 1, padding: layout.cardPadding, borderRadius: layout.borderRadius },
  bookAgainRow: { flexDirection: 'row', alignItems: 'center' },
  bookAgainIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bookAgainText: { flex: 1 },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 20 },
  resetBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.pill },
  reviewsScroll: { flexDirection: 'row' },
  reviewCard: { width: 280, marginRight: 16, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewName: { fontWeight: '800', color: '#111827' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontStyle: 'italic', color: '#4B5563', marginBottom: 8, lineHeight: 18, fontSize: 13 },
  reviewService: { fontWeight: '800', color: '#0A3925', fontSize: 11 },
});
