import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing } from '../../utils/theme';

// Earnings dashboard — deliberately transparent about the commission split,
// since "we take less so providers earn more" is the core investor pitch.
export default function EarningsScreen() {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const { categories, fetchCategories } = useBookingStore();
  const theme = getTheme(highContrast);

  const [completedJobs, setCompletedJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/bookings', { params: { providerId: user.providerId, status: 'completed' } });
    setCompletedJobs(data.bookings);
  }, [user]);

  useEffect(() => {
    fetchCategories();
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalPayout = completedJobs.reduce((sum, b) => sum + b.hourlyRate * b.durationHours, 0);
  const totalCommission = completedJobs.reduce((sum, b) => sum + b.serviceFee, 0);
  const now = new Date();
  const weekly = completedJobs
    .filter((b) => {
      const d = new Date(b.date);
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    })
    .reduce((sum, b) => sum + b.hourlyRate * b.durationHours, 0);

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>Earnings</Text>

      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { backgroundColor: theme.providerAccentSoft }]}>
          <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>This Week</Text>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: scaledFont(20, fontScale) }}>£{weekly.toFixed(2)}</Text>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: theme.providerAccentSoft, marginLeft: spacing.sm }]}>
          <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>All Time</Text>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: scaledFont(20, fontScale) }}>£{totalPayout.toFixed(2)}</Text>
        </Card>
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <Ionicons name="information-circle-outline" size={18} color={theme.providerAccent} />
          <Text style={{ color: theme.text, fontWeight: '700', marginLeft: spacing.xs, fontSize: scaledFont(14, fontScale) }}>
            Commission breakdown
          </Text>
        </View>
        <Text style={{ color: theme.textMuted, marginTop: spacing.xs, fontSize: scaledFont(13, fontScale) }}>
          You've paid £{totalCommission.toFixed(2)} in platform fees on £{(totalPayout + totalCommission).toFixed(2)} of bookings —
          an effective rate of {(totalPayout + totalCommission) > 0 ? ((totalCommission / (totalPayout + totalCommission)) * 100).toFixed(1) : '0'}%,
          well below the 15–25% industry norm.
        </Text>
      </Card>

      <Text style={{ color: theme.text, fontWeight: '700', marginBottom: spacing.sm, fontSize: scaledFont(16, fontScale) }}>
        Payout History
      </Text>

      <FlatList
        data={completedJobs}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.providerAccent} />}
        ListEmptyComponent={<Text style={{ color: theme.textMuted, marginTop: spacing.md }}>No completed jobs yet.</Text>}
        renderItem={({ item }) => {
          const category = categories.find((c) => c.id === item.categoryId);
          const payout = item.hourlyRate * item.durationHours;
          return (
            <Card>
              <View style={styles.rowBetween}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: scaledFont(14, fontScale) }}>{category?.name}</Text>
                <Text style={{ color: theme.success, fontWeight: '800', fontSize: scaledFont(14, fontScale) }}>+£{payout.toFixed(2)}</Text>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>
                {item.date} · Job price £{item.total.toFixed(2)} · Platform fee £{item.serviceFee.toFixed(2)}
              </Text>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
  statCard: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
