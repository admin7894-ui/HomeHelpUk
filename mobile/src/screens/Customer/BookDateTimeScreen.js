import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';
import { getSchedulingConfig } from '../../utils/serviceConfig';

const { width } = Dimensions.get('window');

// Generate next 10 days for date picker
const getNextDays = () => {
  const days = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0], // YYYY-MM-DD
      dayName: i === 0 ? 'TODAY' : weekdayNames[d.getDay()].toUpperCase(),
      dayNum: d.getDate(),
      month: monthNames[d.getMonth()],
      fullDateLabel: `${i === 0 ? 'Today' : weekdayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`,
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

export default function BookDateTimeScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { draft, setDraft } = useBookingStore();
  const theme = getTheme(highContrast);

  const daysList = getNextDays();

  const schedulingConfig = getSchedulingConfig(
    { id: draft.serviceId, name: draft.serviceName, unit: draft.serviceUnit, pricingRules: draft.pricingRules },
    null
  );

  // State selection
  const [selectedDate, setSelectedDate] = useState(draft.date || daysList[0].dateStr);
  const [selectedTime, setSelectedTime] = useState(draft.time || TIME_SLOTS[1]);
  const [duration, setDuration] = useState(draft.durationHours || schedulingConfig.defaultDurationHours || 2);

  const selectedDayObj = daysList.find((d) => d.dateStr === selectedDate) || daysList[0];

  const handleNext = () => {
    setDraft({
      date: selectedDate,
      time: selectedTime,
      durationHours: duration,
    });
    navigation.navigate('BookAddress');
  };

  return (
    <ScreenContainer style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: scaledFont(20, fontScale) }]}>
          Date & Time
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Step Indicator */}
        <View style={styles.progressRow}>
          <Text style={[styles.stepLabel, { color: theme.customerAccent }]}>Step 1 of 4: Schedule</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: theme.customerAccent, width: '25%' }]} />
          </View>
        </View>

        {/* 1. Date Selection */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
          Select Date
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesContainer}
        >
          {daysList.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <Pressable key={day.dateStr} onPress={() => setSelectedDate(day.dateStr)}>
                <Card
                  style={[
                    styles.dateCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    isSelected && { borderColor: '#0A3925', backgroundColor: '#F0FDF4', borderWidth: 2 },
                  ]}
                >
                  <Text style={[styles.dayName, { color: theme.textMuted }, isSelected && { color: '#0A3925', fontWeight: '800' }]}>
                    {day.dayName}
                  </Text>
                  <Text style={[styles.dayNum, { color: theme.text }, isSelected && { color: '#0A3925', fontWeight: '900' }]}>
                    {day.dayNum}
                  </Text>
                  <Text style={[styles.monthName, { color: theme.textMuted }, isSelected && { color: '#0A3925', fontWeight: '700' }]}>
                    {day.month}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 2. Time Slot Selection */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale), marginTop: 24 }]}>
          Select a Time Slot
        </Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((slot) => {
            const isSelected = selectedTime === slot;
            return (
              <Pressable key={slot} style={styles.timeGridItem} onPress={() => setSelectedTime(slot)}>
                <Card
                  style={[
                    styles.timeCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    isSelected && { borderColor: '#0A3925', backgroundColor: '#F0FDF4', borderWidth: 2 },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isSelected ? '#0A3925' : theme.textMuted}
                    style={styles.timeIcon}
                  />
                  <Text style={[styles.timeText, { color: theme.text }, isSelected && { color: '#0A3925', fontWeight: '900' }]}>
                    {slot}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* 3. Duration Selector (Shown ONLY for Variable-Duration Services) */}
        {schedulingConfig.showDurationSelector && (
          <View style={styles.durationSection}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale), marginTop: 24 }]}>
              How long do you need the service?
            </Text>

            <View style={styles.durationGrid}>
              {(schedulingConfig.durationOptions || []).map((opt) => {
                const isSelected = duration === opt.hours;
                return (
                  <Pressable
                    key={opt.hours}
                    onPress={() => setDuration(opt.hours)}
                    style={[
                      styles.durationChipCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      isSelected && { borderColor: '#0A3925', backgroundColor: '#F0FDF4', borderWidth: 2 }
                    ]}
                  >
                    <Text style={[styles.durationChipText, isSelected && { color: '#0A3925', fontWeight: '900' }]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#0A3925" style={{ marginLeft: 6 }} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 4. Compact Booking Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Booking</Text>

          <View style={styles.summaryRow}>
            <Ionicons name="construct-outline" size={18} color="#0A3925" style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Service:</Text>
            <Text style={styles.summaryValue}>{draft.serviceName || 'Selected Service'}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={18} color="#0A3925" style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>{selectedDayObj.fullDateLabel}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={18} color="#0A3925" style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Time Slot:</Text>
            <Text style={styles.summaryValue}>{selectedTime}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="hourglass-outline" size={18} color="#0A3925" style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>
              {duration} {duration === 1 ? 'Hour' : 'Hours'}
            </Text>
          </View>
        </Card>

        {/* Sticky Action CTA */}
        <View style={styles.actionRow}>
          <AppButton
            label="Continue to Address"
            disabled={!selectedDate || !selectedTime}
            onPress={handleNext}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: spacing.sm,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 48,
    flex: 1,
  },
  scrollContent: { paddingBottom: spacing.xl },
  progressRow: { marginBottom: spacing.sm },
  stepLabel: { fontWeight: '800', fontSize: 13, marginBottom: spacing.xs },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { fontWeight: '800', marginBottom: spacing.sm },
  datesContainer: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateCard: {
    width: 78,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    marginRight: spacing.xs,
  },
  dayName: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  dayNum: { fontSize: 22, fontWeight: '800', marginVertical: 2 },
  monthName: { fontSize: 11, fontWeight: '700' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  timeGridItem: { width: (width - spacing.md * 3) / 2 },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  timeIcon: { marginRight: spacing.xs },
  timeText: { fontWeight: '600', fontSize: 14 },
  durationSection: { marginBottom: spacing.sm },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  durationChipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: (width - spacing.md * 3) / 2,
  },
  durationChipText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  summaryCard: {
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  summaryTitle: { fontSize: 14, fontWeight: '900', color: '#0A3925', textTransform: 'uppercase', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryIcon: { marginRight: 8 },
  summaryLabel: { fontSize: 13, color: '#64748B', width: 75, fontWeight: '600' },
  summaryValue: { fontSize: 13, color: '#0F172A', fontWeight: '800', flex: 1 },
  actionRow: { marginTop: spacing.md },
});
