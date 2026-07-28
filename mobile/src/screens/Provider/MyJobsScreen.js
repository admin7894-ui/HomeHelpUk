import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';
import { getServiceName } from '../../utils/bookingUtils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_LABELS = {
  assigned: 'Assigned',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function MyJobsScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const { categories, fetchCategories, fetchProviderDetails } = useBookingStore();
  const theme = getTheme(highContrast);

  const [jobs, setJobs] = useState([]);
  const [declinedJobs, setDeclinedJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('accepted');
  const [availability, setAvailability] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false });

  const load = useCallback(async (force = false) => {
    if (!jobs.length) setLoading(true);
    const t0 = Date.now();
    try {
      console.log('[PERF][MyJobs] Jobs load initiated');
      const pAccepted = api.get('/bookings', { params: { providerId: user.providerId } });
      const pDeclined = api.get('/bookings/declined');
      const pCat = fetchCategories(force);
      const pProv = user?.providerId ? fetchProviderDetails(user.providerId, force) : Promise.resolve(null);

      const [acceptedRes, declinedRes, _, provDetails] = await Promise.all([pAccepted, pDeclined, pCat, pProv]);
      
      setJobs(acceptedRes.data.bookings.filter((b) => b.status !== 'pending'));
      setDeclinedJobs(declinedRes.data.bookings || []);

      if (provDetails && provDetails.availability) {
        const avail = {};
        DAYS.forEach((day) => {
          avail[day] = provDetails.availability.weekly && provDetails.availability.weekly[day]?.length > 0;
        });
        setAvailability(avail);
      }
      console.log(`[PERF][MyJobs] Total load time: ${Date.now() - t0}ms`);
    } catch (err) {
      console.warn("Error fetching jobs", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchCategories, fetchProviderDetails, jobs.length]);

  useEffect(() => {
    load(false);
  }, [user?.providerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>My Jobs</Text>

      <Card>
        <Text style={{ color: theme.text, fontWeight: '700', marginBottom: spacing.sm }}>Availability</Text>
        <View style={styles.daysRow}>
          {DAYS.map((d) => (
            <View
              key={d}
              style={[
                styles.dayChip,
                { backgroundColor: availability[d] ? theme.providerAccent : theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={{ color: availability[d] ? theme.primaryButtonText : theme.textMuted, fontWeight: '700', fontSize: scaledFont(12, fontScale) }}>
                {d}
              </Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => navigation.navigate('ScheduleManager')} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
          <Text style={{ color: theme.providerAccent, fontWeight: '600', fontSize: scaledFont(13, fontScale) }}>
            Edit in Manage Schedule
          </Text>
        </Pressable>
      </Card>

      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, tab === 'accepted' ? { backgroundColor: theme.providerAccent } : { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setTab('accepted')}
        >
          <Text style={{ color: tab === 'accepted' ? theme.primaryButtonText : theme.text, fontWeight: '700' }}>Accepted Jobs</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === 'declined' ? { backgroundColor: theme.providerAccent } : { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setTab('declined')}
        >
          <Text style={{ color: tab === 'declined' ? theme.primaryButtonText : theme.text, fontWeight: '700' }}>Declined History</Text>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.providerAccent} />
        </View>
      ) : (
        <FlatList
          data={tab === 'accepted' ? jobs : declinedJobs}
          keyExtractor={(j) => j.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.providerAccent} />}
          ListEmptyComponent={
            <Text style={{ color: theme.textMuted, marginTop: spacing.lg, textAlign: 'center' }}>
              {tab === 'accepted' ? 'No accepted jobs yet.' : 'You have not declined any jobs.'}
            </Text>
          }
          renderItem={({ item }) => {
            const serviceName = getServiceName(item.categoryId, categories);
          let categoryName = 'Unknown Category';
          
          for (const cat of categories) {
            if (cat.id === item.categoryId) {
              categoryName = cat.name;
              break;
            }
            const subs = cat.subCategories || cat.subcategories;
            if (subs) {
              const match = subs.some(sub => sub.id === item.categoryId || sub.services?.some(s => s.id === item.categoryId));
              if (match) {
                categoryName = cat.name;
                break;
              }
            }
          }

          const fallbackLegacyPayout = (item.total && item.serviceFee) ? (item.total - item.serviceFee) : (item.hourlyRate * item.durationHours);
          const payout = item.providerPayout || (item.pricingBreakdown ? item.pricingBreakdown.subtotal : fallbackLegacyPayout);

          if (tab === 'declined') {
            const myDeclineRecord = item.declineRecords?.find(d => d.providerId === user.providerId);
            const declineReason = myDeclineRecord?.reason === 'Other' ? myDeclineRecord.customReason : myDeclineRecord?.reason;
            const declinedDate = myDeclineRecord ? new Date(myDeclineRecord.declinedAt).toLocaleDateString() : '';

            return (
              <Card>
                <View style={styles.cardTopRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{categoryName}</Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale), fontWeight: '600' }}>{item.date} at {item.time}</Text>
                </View>

                <Text style={{ color: theme.text, fontWeight: '800', fontSize: scaledFont(16, fontScale), marginBottom: 4 }}>
                  {serviceName}
                </Text>
                
                <Text style={{ color: theme.textMuted, fontSize: scaledFont(14, fontScale), marginBottom: 4 }}>
                  Booking from <Text style={{ fontWeight: '700', color: theme.text }}>{item.customerName || 'Customer'}</Text>
                </Text>

                <Text style={{ color: theme.textMuted, fontSize: scaledFont(13, fontScale), marginBottom: spacing.sm }}>
                  {item.address}
                </Text>

                <View style={[styles.declineReasonBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale), marginBottom: 2 }}>Declined on {declinedDate}:</Text>
                  <Text style={{ color: theme.danger, fontWeight: '700', fontSize: scaledFont(14, fontScale) }}>{declineReason}</Text>
                </View>
              </Card>
            );
          }

          return (
            <Pressable onPress={() => navigation.navigate('JobDetail', { booking: item })} accessibilityRole="button" accessibilityLabel={`${serviceName}, ${STATUS_LABELS[item.status]}`}>
              <Card>
                <View style={styles.cardTopRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{categoryName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: theme.providerAccentSoft }]}>
                    <Text style={{ color: theme.providerAccent, fontWeight: '700', fontSize: scaledFont(12, fontScale) }}>
                      {STATUS_LABELS[item.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: scaledFont(16, fontScale), flex: 1, marginRight: spacing.sm }}>
                    {serviceName}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale), fontWeight: '600', marginBottom: 2 }}>
                      Payout
                    </Text>
                    <Text style={{ color: theme.customerAccent, fontWeight: '800', fontSize: scaledFont(18, fontScale) }}>
                      £{payout.toFixed(2)}
                    </Text>
                  </View>
                </View>
                
                <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: scaledFont(14, fontScale) }}>
                  Booking from <Text style={{ fontWeight: '700', color: theme.text }}>{item.customerName || 'Customer'}</Text>
                </Text>

                <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: scaledFont(13, fontScale) }}>
                  {item.date} at {item.time} · {item.durationHours}h
                </Text>

                <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: scaledFont(13, fontScale) }}>
                  {item.address}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.sm },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  categoryBadge: { backgroundColor: '#E6ECE8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm },
  categoryBadgeText: { color: '#0A3925', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill },
  tabContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  declineReasonBox: { padding: spacing.sm, borderRadius: radii.sm, borderWidth: 1, marginTop: spacing.xs },
});
