import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function JobFeedScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const { categories, fetchCategories, fetchProviderDetails } = useBookingStore();
  const theme = getTheme(highContrast);

  const [jobs, setJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [activeCategoryIds, setActiveCategoryIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Decline Modal State
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedDeclineJob, setSelectedDeclineJob] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const REASONS = [
    'Too far away',
    'Schedule conflict',
    'Not available at this time',
    'Other'
  ];

  const load = useCallback(async (currentFilter = filter, force = false) => {
    if (!jobs.length) setLoading(true);
    const t0 = Date.now();
    try {
      console.log('[PERF][ProviderJobFeed] Job feed load initiated');
      const params = { providerId: user.providerId, status: 'pending' };
      if (currentFilter !== 'all') params.category = currentFilter;
      
      const pJobs = api.get('/bookings', { params });
      const pCat = fetchCategories(force);
      const pProv = user?.providerId ? fetchProviderDetails(user.providerId, force) : Promise.resolve(null);

      const [{ data }, _, provDetails] = await Promise.all([pJobs, pCat, pProv]);
      
      if (provDetails && provDetails.categories) {
        setActiveCategoryIds(provDetails.categories);
      }
      setJobs(data.bookings || []);
      console.log(`[PERF][ProviderJobFeed] Total load time: ${Date.now() - t0}ms`);
    } catch (err) {
      // non-fatal in demo
    } finally {
      setLoading(false);
    }
  }, [user, filter, fetchCategories, fetchProviderDetails, jobs.length]);

  useEffect(() => {
    load(filter, false);
  }, [filter, user?.providerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(filter, true);
    setRefreshing(false);
  };

  const accept = async (job) => {
    let serviceName = 'this service';
    for (const cat of categories) {
      if (cat.id === job.categoryId) { serviceName = cat.name; break; }
      const subs = cat.subCategories || cat.subcategories;
      if (subs) {
        for (const sub of subs) {
          if (sub.id === job.categoryId) { serviceName = sub.name; break; }
          const srv = sub.services?.find(s => s.id === job.categoryId);
          if (srv) { serviceName = srv.name; break; }
        }
      }
    }

    const fallbackLegacyPayout = (job.total && job.serviceFee) ? (job.total - job.serviceFee) : (job.hourlyRate * job.durationHours);
    const payout = job.providerPayout || (job.pricingBreakdown ? job.pricingBreakdown.subtotal : fallbackLegacyPayout);

    Alert.alert(
      "Accept this job?",
      `${serviceName} on ${job.date} at ${job.time} — You'll earn £${payout.toFixed(2)}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Accept",
          onPress: async () => {
            try {
              const { data } = await api.patch(`/bookings/${job.id}/status`, { status: 'assigned' });
              setJobs((prev) => prev.filter((j) => j.id !== job.id));
              Alert.alert("Success", "Job accepted");
            } catch (err) {
              if (err.response && err.response.status === 400) {
                Alert.alert("Unavailable", "This job is no longer available.");
                setJobs((prev) => prev.filter((j) => j.id !== job.id));
              } else {
                Alert.alert("Error", "Failed to accept job.");
              }
            }
          }
        }
      ]
    );
  };

  const decline = (job) => {
    setSelectedDeclineJob(job);
    setDeclineReason('');
    setCustomReason('');
    setShowDeclineModal(true);
  };

  const submitDecline = async () => {
    if (!declineReason) {
      Alert.alert("Required", "Please select a reason for declining.");
      return;
    }
    if (declineReason === 'Other' && !customReason.trim()) {
      Alert.alert("Required", "Please provide a reason.");
      return;
    }

    const job = selectedDeclineJob;
    setShowDeclineModal(false);
    
    // Optimistic UI Update
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    Alert.alert("Success", "Job declined");
    
    try {
      await api.post(`/bookings/${job.id}/decline`, {
        reason: declineReason,
        customReason: declineReason === 'Other' ? customReason.trim() : null
      });
    } catch (err) {
      console.warn("Failed to decline on backend");
    }
  };

  const getParentCatId = (serviceId) => {
    if (serviceId && serviceId.startsWith('cat_')) return serviceId;
    const c = categories.find(cat => cat.subcategories?.some(sub => sub.services?.some(s => s.id === serviceId)));
    return c ? c.id : null;
  };

  const filtered = filter === 'all' ? jobs : jobs.filter((j) => getParentCatId(j.categoryId) === filter);
  
  const allFilters = [
    { id: 'all', name: 'All' },
    ...activeCategoryIds.map(id => {
      const cat = categories.find(c => c.id === id);
      return { id, name: cat ? cat.name : id };
    })
  ];

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>Job Feed</Text>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.sm, fontSize: scaledFont(13, fontScale) }}>
        Available bookings nearby — pull to refresh
      </Text>

      <FlatList
        horizontal
        data={allFilters}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginVertical: spacing.xs }}
        contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 4, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setFilter(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.id }}
            style={[
              styles.filterChip,
              filter === item.id ? { backgroundColor: '#0A3925', borderColor: '#0A3925' } : { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={{ color: filter === item.id ? theme.primaryButtonText : theme.text, fontWeight: '700', fontSize: 14 }}>{item.name}</Text>
          </Pressable>
        )}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.providerAccent} />
          <Text style={{ color: theme.textMuted, marginTop: spacing.sm }}>Finding jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          contentContainerStyle={filtered.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.providerAccent} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.surface }]}>
                <Ionicons name="briefcase-outline" size={48} color={theme.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text, fontSize: scaledFont(18, fontScale) }]}>No jobs available right now.</Text>
              <Text style={{ color: theme.textMuted, marginTop: 8, textAlign: 'center' }}>
                Check back soon or try a different category.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
          let serviceName = 'Unknown Service';
          let categoryName = 'Unknown Category';
          let isSubcategoryMatch = false;

          for (const cat of categories) {
            if (cat.id === item.categoryId) {
              serviceName = cat.name;
              categoryName = cat.name;
              break;
            }
            const subs = cat.subCategories || cat.subcategories;
            if (subs) {
              for (const sub of subs) {
                if (sub.id === item.categoryId) {
                  serviceName = sub.name;
                  categoryName = cat.name;
                  isSubcategoryMatch = true;
                  break;
                }
                const srv = sub.services?.find(s => s.id === item.categoryId);
                if (srv) {
                  serviceName = srv.name;
                  categoryName = cat.name;
                  isSubcategoryMatch = true;
                  break;
                }
              }
            }
            if (isSubcategoryMatch) break;
          }

          // Provider Payout Logic
          const fallbackLegacyPayout = (item.total && item.serviceFee) ? (item.total - item.serviceFee) : (item.hourlyRate * item.durationHours);
          const payout = item.providerPayout || (item.pricingBreakdown ? item.pricingBreakdown.subtotal : fallbackLegacyPayout);

          return (
            <Pressable onPress={() => navigation.navigate('JobDetail', { booking: item })} accessibilityRole="button" accessibilityLabel={`${serviceName} on ${item.date}`}>
              <Card>
                <View style={styles.cardTopRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{categoryName}</Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale), fontWeight: '600' }}>{item.date} at {item.time}</Text>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: scaledFont(16, fontScale), flex: 1, marginRight: spacing.md, lineHeight: 22 }}>
                    {serviceName}
                  </Text>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                    <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale), fontWeight: '600', marginBottom: 2 }}>
                      You'll earn
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
                  {item.durationHours}h · {item.address}
                </Text>
                
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => decline(item)} accessibilityRole="button" accessibilityLabel="Decline job" style={[styles.actionBtn, { borderColor: theme.danger, backgroundColor: 'transparent' }]}>
                    <Text style={{ color: theme.danger, fontWeight: '700', fontSize: scaledFont(15, fontScale) }}>Decline</Text>
                  </Pressable>
                  <Pressable onPress={() => accept(item)} accessibilityRole="button" accessibilityLabel="Accept job" style={[styles.actionBtn, { backgroundColor: theme.providerAccent, borderColor: theme.providerAccent }]}>
                    <Text style={{ color: theme.primaryButtonText, fontWeight: '700', fontSize: scaledFont(15, fontScale) }}>Accept</Text>
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
      )}

      <Modal visible={showDeclineModal} animationType="slide" transparent={true} onRequestClose={() => setShowDeclineModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: scaledFont(18, fontScale) }]}>Why are you declining this job?</Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: spacing.md }}>
              {REASONS.map(r => (
                <Pressable key={r} onPress={() => setDeclineReason(r)} style={styles.radioRow}>
                  <View style={[styles.radioOuter, { borderColor: declineReason === r ? theme.providerAccent : theme.border }]}>
                    {declineReason === r && <View style={[styles.radioInner, { backgroundColor: theme.providerAccent }]} />}
                  </View>
                  <Text style={{ color: theme.text, fontSize: scaledFont(15, fontScale) }}>{r}</Text>
                </Pressable>
              ))}
              {declineReason === 'Other' && (
                <TextInput
                  style={[styles.textInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                  placeholder="Please specify (max 200 chars)"
                  placeholderTextColor={theme.textMuted}
                  maxLength={200}
                  multiline
                  value={customReason}
                  onChangeText={setCustomReason}
                />
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowDeclineModal(false)} style={[styles.modalBtn, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitDecline} style={[styles.modalBtn, { backgroundColor: theme.danger }]}>
                <Text style={{ color: theme.primaryButtonText, fontWeight: '700' }}>Confirm Decline</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800' },
  filterChip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.pill, borderWidth: 1, minHeight: 40, justifyContent: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { fontWeight: '800', marginTop: spacing.sm },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  categoryBadge: { backgroundColor: '#E6ECE8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.sm },
  categoryBadgeText: { color: '#0A3925', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.sm },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: spacing.lg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 40 },
  modalTitle: { fontWeight: '800', marginBottom: spacing.md },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, marginRight: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  textInput: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, minHeight: 80, marginTop: spacing.sm, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
