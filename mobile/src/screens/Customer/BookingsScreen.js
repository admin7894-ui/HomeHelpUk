import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

const STATUS_LABELS = {
  pending: 'Requested',
  assigned: 'Confirmed',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_BADGES = {
  pending: '#FFFBEB', // Amber soft
  assigned: '#E6ECE8', // Forest soft
  en_route: '#F0FDF4', // Green soft
  in_progress: '#F0FDF4',
  completed: '#F0FDF4',
};

const STATUS_COLORS = {
  pending: '#D97706',
  assigned: '#0A3925',
  en_route: '#16A34A',
  in_progress: '#16A34A',
  completed: '#16A34A',
};

export default function BookingsScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const { fetchBookings, providers, categories, fetchCategories, fetchProviders } = useBookingStore();
  const theme = getTheme(highContrast);

  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (categories.length === 0) await fetchCategories();
    if (providers.length === 0) await fetchProviders();
    const result = await fetchBookings({ customerId: user.id });
    setBookings(result);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = bookings.filter((b) => (tab === 'upcoming' ? b.status !== 'completed' : b.status === 'completed'));

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>
        Your Bookings
      </Text>

      {/* Modern sliding-style segments */}
      <View style={[styles.tabContainer, { backgroundColor: theme.customerAccentSoft }]}>
        {['upcoming', 'past'].map((t) => {
          const isActive = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[
                styles.tab,
                isActive && { backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
              ]}
            >
              <Text
                style={{
                  color: isActive ? theme.text : theme.textMuted,
                  fontWeight: '700',
                  textTransform: 'capitalize',
                  textAlign: 'center',
                }}
              >
                {t} Bookings
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.customerAccent} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No {tab} bookings found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusBg = STATUS_BADGES[item.status] || theme.customerAccentSoft;
          const statusColor = STATUS_COLORS[item.status] || theme.customerAccent;

          const provider = providers.find(p => p.id === item.providerId);
          const providerName = provider ? provider.name : (item.providerId === 'open' ? 'Open Booking' : 'Unknown Provider');

          let serviceName = 'Unknown Service';
          for (const cat of categories) {
            if (cat.id === item.categoryId) {
              serviceName = cat.name;
              break;
            }
            const subs = cat.subCategories || cat.subcategories;
            if (subs) {
              for (const sub of subs) {
                if (sub.id === item.categoryId) {
                  serviceName = sub.name;
                  break;
                }
                const srv = sub.services?.find(s => s.id === item.categoryId);
                if (srv) {
                  serviceName = srv.name;
                  break;
                }
              }
            }
            if (serviceName !== 'Unknown Service') break;
          }

          return (
            <Pressable
              onPress={() =>
                item.status === 'completed'
                  ? navigation.navigate('RateReview', { booking: item })
                  : navigation.navigate('BookingStatus', { bookingId: item.id })
              }
              accessibilityRole="button"
              accessibilityLabel={`Booking on ${item.date}, status ${STATUS_LABELS[item.status]}`}
            >
              <Card style={[styles.bookingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.rowBetween}>
                  <View style={styles.serviceMeta}>
                    <Text style={[styles.serviceText, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
                      {serviceName}
                    </Text>
                    <Text style={[styles.providerText, { color: theme.textMuted, fontSize: scaledFont(14, fontScale) }]}>
                      with {providerName}
                    </Text>
                    <Text style={[styles.dateText, { color: theme.text, fontSize: scaledFont(14, fontScale), marginTop: 4 }]}>
                      {item.date} • {item.time} ({item.durationHours} hrs)
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusBg }]}>
                    <Text style={{ color: statusColor, fontWeight: '800', fontSize: 11 }}>
                      {STATUS_LABELS[item.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.addressSection}>
                  <Ionicons name="pin-outline" size={14} color={theme.textMuted} style={styles.pinIcon} />
                  <Text numberOfLines={1} style={[styles.addressText, { color: theme.textMuted }]}>
                    {item.address}
                  </Text>
                </View>

                {/* Pricing Breakdown */}
                <View style={{ marginTop: spacing.sm, gap: 4 }}>
                  {item.pricingBreakdown && item.pricingBreakdown.baseServiceCost !== undefined ? (
                    <>
                      <View style={styles.rowBetween}>
                        <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>Base Service Price</Text>
                        <Text style={{ color: theme.text, fontSize: scaledFont(12, fontScale) }}>£{item.pricingBreakdown.baseServiceCost.toFixed(2)}</Text>
                      </View>
                      {item.pricingBreakdown.additionalQuantityCharge > 0 && (
                        <View style={styles.rowBetween}>
                          <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>
                            Additional {item.pricingBreakdown.quantityUnitLabel || 'Qty'} ({item.pricingBreakdown.extraQuantity})
                          </Text>
                          <Text style={{ color: theme.text, fontSize: scaledFont(12, fontScale) }}>£{item.pricingBreakdown.additionalQuantityCharge.toFixed(2)}</Text>
                        </View>
                      )}
                      <View style={styles.rowBetween}>
                        <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale), fontWeight: '700' }}>Service Subtotal (Provider Payout)</Text>
                        <Text style={{ color: theme.text, fontSize: scaledFont(12, fontScale), fontWeight: '700' }}>£{item.pricingBreakdown.subtotal.toFixed(2)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.rowBetween}>
                      <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale), fontWeight: '700' }}>Service Subtotal (Provider Payout)</Text>
                      <Text style={{ color: theme.text, fontSize: scaledFont(12, fontScale), fontWeight: '700' }}>£{(item.total - item.serviceFee).toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={styles.rowBetween}>
                    <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>Platform Fee (11%)</Text>
                    <Text style={{ color: theme.text, fontSize: scaledFont(12, fontScale) }}>£{item.serviceFee.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.rowBetween}>
                  <Text style={[styles.totalLabel, { color: theme.text, fontWeight: '800' }]}>Customer Total</Text>
                  <Text style={[styles.priceText, { color: theme.customerAccent, fontSize: scaledFont(16, fontScale) }]}>
                    £{item.total.toFixed(2)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '900', marginBottom: spacing.md },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radii.pill },
  listContainer: { paddingBottom: spacing.lg, gap: spacing.md },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { marginTop: spacing.sm, fontWeight: '600' },
  bookingCard: { borderWidth: 1, padding: spacing.md, borderRadius: radii.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceMeta: { gap: 2, flex: 1, paddingRight: spacing.sm },
  serviceText: { fontWeight: '900' },
  providerText: { fontWeight: '600' },
  dateText: { fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm, alignSelf: 'flex-start' },
  addressSection: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  pinIcon: { marginRight: 4 },
  addressText: { fontSize: 13, flex: 1 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: spacing.sm },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  priceText: { fontWeight: '800' },
});
