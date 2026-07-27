import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';
import { calculateServicePrice } from '../../utils/pricingEngine';

// Generate next 14 days for date picker recovery
const getNext14Days = () => {
  const days = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0], // YYYY-MM-DD
      dayName: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : weekdayNames[d.getDay()]),
      dayNum: d.getDate(),
      month: monthNames[d.getMonth()],
    });
  }
  return days;
};

const TIME_SLOTS = [
  '08:00 AM',
  '10:00 AM',
  '12:00 PM',
  '02:00 PM',
  '04:00 PM',
  '06:00 PM',
];

export default function BookProviderScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { draft, providers, fetchProvidersByService, setDraft, loading, error } = useBookingStore();
  const theme = getTheme(highContrast);

  const daysList = getNext14Days();

  // Selected date & time state
  const [selectedDate, setSelectedDate] = useState(draft.date || daysList[0].dateStr);
  const [selectedTime, setSelectedTime] = useState(draft.time || TIME_SLOTS[1]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showDateSelection, setShowDateSelection] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchedSlot, setLastSearchedSlot] = useState({
    dateStr: draft.date || daysList[0].dateStr,
    timeSlot: draft.time || TIME_SLOTS[1]
  });

  useEffect(() => {
    if (draft.serviceId) {
      const targetDate = draft.date || selectedDate;
      const targetTime = draft.time || selectedTime;
      fetchProvidersByService(draft.serviceId, targetDate, targetTime, draft.durationHours);
    }
  }, [draft.serviceId]);

  // Option A: Explicit date/time selection (Highlights only, NO auto-search)
  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleTimeSelect = (timeSlot) => {
    setSelectedTime(timeSlot);
  };

  // Explicit "Check Availability" action
  const handleExplicitCheckAvailability = async (targetDate = selectedDate, targetTime = selectedTime) => {
    if (!targetDate || !targetTime) return;
    setCheckingAvailability(true);
    setHasSearched(true);
    setDraft({ date: targetDate, time: targetTime });
    setLastSearchedSlot({ dateStr: targetDate, timeSlot: targetTime });

    try {
      await fetchProvidersByService(draft.serviceId, targetDate, targetTime, draft.durationHours);
    } catch (err) {
      console.log('Error checking availability:', err);
    } finally {
      setCheckingAvailability(false);
      setShowDateSelection(false);
    }
  };

  // Quick-select slot action (contains both date & time, so searches immediately)
  const handleQuickSlotSelect = (dateStr, timeSlot) => {
    setSelectedDate(dateStr);
    setSelectedTime(timeSlot);
    handleExplicitCheckAvailability(dateStr, timeSlot);
  };

  const handleRemoveAddons = async () => {
    setDraft({ addOns: [] });
    const targetDate = draft.date || selectedDate;
    const targetTime = draft.time || selectedTime;
    setCheckingAvailability(true);
    try {
      await fetchProvidersByService(draft.serviceId, targetDate, targetTime, draft.durationHours);
    } catch (err) {
      console.log('Error removing add-ons:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSelectProvider = (provider, providerEst) => {
    setDraft({
      providerId: provider.id,
      selectedProvider: provider,
      pricingSnapshot: providerEst
    });
    navigation.navigate('BookSummary');
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Selected Date';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, monthIndex, day);
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${weekdayNames[d.getDay()]}, ${day} ${monthNames[monthIndex]}`;
  };

  // Generate 3 quick-select slot suggestions
  const quickSlots = [
    { label: 'Today 2:00 PM', dateStr: daysList[0].dateStr, timeSlot: '02:00 PM' },
    { label: 'Tomorrow 10:00 AM', dateStr: daysList[1].dateStr, timeSlot: '10:00 AM' },
    { label: `${daysList[2].dayName} 12:00 PM`, dateStr: daysList[2].dateStr, timeSlot: '12:00 PM' },
  ];

  const isLoading = loading || checkingAvailability;

  return (
    <ScreenContainer scroll={false}>
      {/* Header Row */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { borderColor: theme.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: scaledFont(20, fontScale) }]}>
          Choose Provider
        </Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.progressRow}>
        <Text style={[styles.stepLabel, { color: theme.customerAccent }]}>Step 3 of 4: Select Pro</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { backgroundColor: theme.customerAccent, width: '75%' }]} />
        </View>
      </View>

      <Text style={[styles.infoBanner, { color: theme.textMuted }]}>
        Showing top-rated professionals for <Text style={{ fontWeight: '700', color: theme.text }}>{draft.serviceName}</Text> near your address.
      </Text>

      {/* Persistent Selected Slot Summary Bar */}
      {providers.length > 0 && !showDateSelection && (
        <View style={styles.activeSlotSummaryBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeSlotLabel}>Searching for Slot:</Text>
            <Text style={styles.activeSlotValue}>{formatDisplayDate(selectedDate)} at {selectedTime}</Text>
          </View>
          <Pressable
            onPress={() => setShowDateSelection(true)}
            style={styles.changeSlotBtn}
          >
            <Ionicons name="calendar-outline" size={14} color="#0A3925" style={{ marginRight: 4 }} />
            <Text style={styles.changeSlotBtnText}>Change</Text>
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.customerAccent} />
          <Text style={{ color: theme.textMuted, marginTop: spacing.sm, fontWeight: '700' }}>
            Checking professional availability...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
          <Text style={{ color: theme.danger, marginTop: spacing.sm, fontWeight: '700' }}>
            Unable to fetch provider availability.
          </Text>
          <Pressable
            onPress={() => handleExplicitCheckAvailability(selectedDate, selectedTime)}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Tap to Retry</Text>
          </Pressable>
        </View>
      ) : (providers.length === 0 && !showDateSelection) ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.recoveryScrollContent}>
          <Card style={styles.recoveryCard}>
            <View style={styles.recoveryHeaderRow}>
              <Ionicons name="alert-circle" size={24} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.recoveryTitleText}>No Professionals Available</Text>
            </View>

            <Text style={styles.recoveryDescText}>
              No provider is currently available who offers all of your selected services together.
            </Text>

            <View style={{ gap: 12, marginTop: 16 }}>
              {draft.addOns && draft.addOns.length > 0 && (
                <AppButton
                  label="Remove Add-on Services"
                  onPress={handleRemoveAddons}
                  variant="outline"
                />
              )}
              <AppButton
                label="Change Date & Time"
                onPress={() => setShowDateSelection(true)}
                variant="primary"
              />
            </View>
          </Card>
        </ScrollView>
      ) : showDateSelection ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.recoveryScrollContent}>
          {/* Functional Availability Recovery Card */}
          <Card style={styles.recoveryCard}>
            <View style={styles.recoveryHeaderRow}>
              <Ionicons name="calendar-outline" size={24} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.recoveryTitleText}>Change Date & Time</Text>
            </View>

            <Text style={styles.recoveryDescText}>
              Currently showing results for {formatDisplayDate(selectedDate)} at {selectedTime}.
            </Text>
            <Text style={styles.recoveryInstructionText}>
              Select a date and time below, then tap <Text style={{ fontWeight: '800', color: '#0A3925' }}>Check Availability</Text>:
            </Text>

            {/* Quick-Select Slots Section */}
            <Text style={styles.sectionSmallHeading}>Quick Available Slots:</Text>
            <View style={styles.quickSlotsRow}>
              {quickSlots.map((qs, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleQuickSlotSelect(qs.dateStr, qs.timeSlot)}
                  style={styles.quickSlotChip}
                >
                  <Ionicons name="flash" size={12} color="#0A3925" style={{ marginRight: 4 }} />
                  <Text style={styles.quickSlotChipText}>{qs.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Date Picker Strip */}
            <Text style={styles.sectionSmallHeading}>Select Date:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePickerStrip}>
              {daysList.map((day) => {
                const active = selectedDate === day.dateStr;
                return (
                  <Pressable
                    key={day.dateStr}
                    onPress={() => handleDateSelect(day.dateStr)}
                    style={[styles.dateChipItem, active && styles.dateChipItemActive]}
                  >
                    <Text style={[styles.dayNameText, active && styles.dayTextActive]}>{day.dayName}</Text>
                    <Text style={[styles.dayNumText, active && styles.dayTextActive]}>{day.dayNum}</Text>
                    <Text style={[styles.monthText, active && styles.dayTextActive]}>{day.month}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Time Slot Selector */}
            <Text style={styles.sectionSmallHeading}>Select Preferred Time:</Text>
            <View style={styles.timeSlotsGrid}>
              {TIME_SLOTS.map((t) => {
                const active = selectedTime === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => handleTimeSelect(t)}
                    style={[styles.timeChipItem, active && styles.timeChipItemActive]}
                  >
                    <Ionicons name="time-outline" size={14} color={active ? '#FFFFFF' : '#0A3925'} style={{ marginRight: 4 }} />
                    <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Explicit "Check Availability" Action Button */}
            <AppButton
              label="Check Availability"
              onPress={() => handleExplicitCheckAvailability(selectedDate, selectedTime)}
              disabled={!selectedDate || !selectedTime || checkingAvailability}
              loading={checkingAvailability}
              variant="primary"
              style={styles.checkAvailabilityBtn}
            />
          </Card>
        </ScrollView>
      ) : (
        <FlatList
          data={[...providers].sort((a, b) => {
            if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
            if ((b.completedJobs || 0) !== (a.completedJobs || 0)) return (b.completedJobs || 0) - (a.completedJobs || 0);
            return (a.distanceKm || 1.5) - (b.distanceKm || 1.5);
          })}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const srvRecord = item.services?.find(s => (typeof s === 'string' ? s === draft.serviceId : s.serviceId === draft.serviceId));
            const providerBasePrice = (typeof srvRecord === 'object' ? srvRecord.customPrice : null) || item.hourlyRate || draft.servicePrice || 20;
            const providerPricingRules = (typeof srvRecord === 'object' && srvRecord.pricingRules) ? srvRecord.pricingRules : (draft.pricingRules || {});

            const providerEst = calculateServicePrice({
              basePrice: providerBasePrice,
              durationHours: draft.durationHours || 2,
              quantity: draft.serviceQuantity || 1,
              selectedAddons: draft.addOns || [],
              serviceUnit: draft.serviceUnit || 'hr',
              pricingRules: providerPricingRules
            });

            const sameProviderAddons = (draft.addOns || []).filter(a => !a.requiresSeparateProvider);

            return (
              <Pressable onPress={() => handleSelectProvider(item, providerEst)}>
                <Card style={styles.providerCard}>
                  <View style={styles.cardHeaderRow}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    
                    <View style={styles.headerDetails}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.providerName, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
                          {item.name}
                        </Text>
                        {item.verified && (
                          <View style={[styles.verifiedBadge, { backgroundColor: theme.customerAccentSoft }]}>
                            <Ionicons name="shield-checkmark" size={11} color={theme.customerAccent} />
                            <Text style={[styles.verifiedText, { color: theme.customerAccent }]}>Verified</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.metaRow}>
                        <Ionicons name="star" size={14} color="#F5A623" />
                        <Text style={[styles.metaText, { color: theme.textMuted, fontSize: scaledFont(13, fontScale) }]}>
                          {item.rating} ({item.reviewCount} reviews)  •  {item.distanceKm || 1.5} km away
                        </Text>
                      </View>

                      <Text numberOfLines={1} style={[styles.bioText, { color: theme.textMuted, fontSize: scaledFont(12, fontScale) }]}>
                        {item.bio || 'Experienced verified service professional.'}
                      </Text>
                    </View>
                  </View>

                  {/* Services Covered Section */}
                  <View style={styles.servicesCoveredContainer}>
                    <Text style={[styles.servicesCoveredHeader, { color: theme.textMuted }]}>Services Covered:</Text>
                    <View style={styles.servicesCoveredRow}>
                      <View style={styles.serviceTag}>
                        <Ionicons name="checkmark-circle" size={13} color="#16A34A" style={{ marginRight: 4 }} />
                        <Text style={styles.serviceTagText}>✓ {draft.serviceName || 'Primary Service'}</Text>
                      </View>
                      {sameProviderAddons.map((add, idx) => (
                        <View key={add.serviceId || add.id || `sc_${idx}`} style={styles.serviceTag}>
                          <Ionicons name="checkmark-circle" size={13} color="#16A34A" style={{ marginRight: 4 }} />
                          <Text style={styles.serviceTagText}>✓ {add.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.statsRow}>
                      <View style={[styles.statChip, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.statText, { color: theme.text, fontSize: scaledFont(11, fontScale) }]}>
                          Completed · {item.completedJobs || 10} jobs
                        </Text>
                      </View>
                      <View style={[styles.statChip, { backgroundColor: theme.customerAccentSoft }]}>
                        <Text style={[styles.statText, { color: theme.customerAccent, fontSize: scaledFont(11, fontScale), fontWeight: '700' }]}>
                          Est. Subtotal: £{providerEst.subtotal.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Fixed High-Contrast AppButton with clear label */}
                    <AppButton
                      label={`Choose ${item.name}`}
                      onPress={() => handleSelectProvider(item, providerEst)}
                      variant="primary"
                      style={styles.selectBtn}
                    />
                  </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.circle,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontWeight: '800',
  },
  progressRow: {
    marginBottom: spacing.sm,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  infoBanner: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  activeSlotSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6ECE8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  activeSlotLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  activeSlotValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A3925',
  },
  changeSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#0A3925',
  },
  changeSlotBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A3925',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: '#0A3925',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  recoveryScrollContent: {
    paddingBottom: 40,
  },
  recoveryCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  recoveryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recoveryTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  recoveryDescText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 6,
  },
  recoveryInstructionText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 14,
  },
  sectionSmallHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A3925',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 8,
  },
  quickSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  quickSlotChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A3925',
  },
  datePickerStrip: {
    marginBottom: 10,
  },
  dateChipItem: {
    width: 62,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dateChipItemActive: {
    borderColor: '#0A3925',
    backgroundColor: '#0A3925',
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dayNumText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0A3925',
    marginVertical: 1,
  },
  monthText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  timeChipItemActive: {
    borderColor: '#0A3925',
    backgroundColor: '#0A3925',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A3925',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  checkAvailabilityBtn: {
    marginTop: 8,
    marginBottom: 14,
  },
  fallbackActionsRow: {
    marginTop: 10,
    gap: 10,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0A3925',
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  notifyBtnText: {
    color: '#0A3925',
    fontWeight: '800',
    fontSize: 13,
  },
  anotherServiceBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  anotherServiceBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  providerCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.circle,
    marginRight: spacing.md,
  },
  headerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  providerName: {
    fontWeight: '800',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontWeight: '600',
  },
  bioText: {
    lineHeight: 16,
  },
  servicesCoveredContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  servicesCoveredHeader: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servicesCoveredRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  serviceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#14532D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  cardFooter: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  statText: {
    fontWeight: '600',
  },
  selectBtn: {
    marginTop: 4,
  },
});
