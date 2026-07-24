import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

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
      dayName: i === 0 ? 'Today' : weekdayNames[d.getDay()],
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

export default function BookDateTimeScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { draft, setDraft } = useBookingStore();
  const theme = getTheme(highContrast);

  const daysList = getNextDays();

  // State selection starting from today or previous selection
  const [selectedDate, setSelectedDate] = useState(draft.date || daysList[0].dateStr);
  const [selectedTime, setSelectedTime] = useState(draft.time || TIME_SLOTS[1]);
  const [duration, setDuration] = useState(draft.durationHours || 2);
  const [serviceQuantity, setServiceQuantity] = useState(draft.serviceQuantity || 1);

  const getQuantityUnitLabel = (baseIncludesStr) => {
    if (!baseIncludesStr) return 'Quantity';
    const str = baseIncludesStr.toLowerCase();
    if (str.match(/persons?|people/)) return 'People';
    if (str.match(/guests?/)) return 'Guests';
    if (str.match(/children/)) return 'Children';
    if (str.match(/pets?/)) return 'Pets';
    if (str.match(/dogs?/)) return 'Dogs';
    if (str.match(/appliances?/)) return 'Appliances';
    if (str.match(/vehicles?|cars?/)) return 'Vehicles';
    if (str.match(/rooms?/)) return 'Rooms';
    if (str.match(/tvs?/)) return 'TVs';
    if (str.match(/windows?/)) return 'Windows';
    return 'Quantity';
  };

  const quantityUnitLabel = getQuantityUnitLabel(draft.baseIncludes);
  const showQuantitySelector = !!draft.baseIncludes || draft.additionalCharge > 0;

  const handleNext = () => {
    setDraft({
      date: selectedDate,
      time: selectedTime,
      durationHours: duration,
    });
    navigation.navigate('BookAddress');
  };

  return (
    <ScreenContainer>
      {/* Header */}
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

        {/* Date Selection */}
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
                    isSelected && { borderColor: theme.customerAccent, backgroundColor: theme.customerAccentSoft },
                  ]}
                >
                  <Text style={[styles.dayName, { color: theme.textMuted }, isSelected && { color: theme.customerAccent }]}>
                    {day.dayName}
                  </Text>
                  <Text style={[styles.dayNum, { color: theme.text }, isSelected && { color: theme.customerAccent, fontWeight: '800' }]}>
                    {day.dayNum}
                  </Text>
                  <Text style={[styles.monthName, { color: theme.textMuted }, isSelected && { color: theme.customerAccent }]}>
                    {day.month}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Time Selection */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
          Select Preferred Start Time
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
                    isSelected && { borderColor: theme.customerAccent, backgroundColor: theme.customerAccentSoft },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isSelected ? theme.customerAccent : theme.textMuted}
                    style={styles.timeIcon}
                  />
                  <Text style={[styles.timeText, { color: theme.text }, isSelected && { color: theme.customerAccent, fontWeight: '700' }]}>
                    {slot}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Duration Selection (for hourly services) */}
        {draft.serviceUnit === 'hr' && (
          <View style={styles.durationSection}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
              Estimated Duration
            </Text>
            <Card style={[styles.durationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.durationDesc, { color: theme.textMuted }]}>
                Choose how many hours you need. The professional will stay for this duration.
              </Text>
              <View style={styles.durationActions}>
                <Pressable
                  disabled={duration <= 1}
                  onPress={() => setDuration(duration - 1)}
                  style={[styles.circleBtn, { borderColor: theme.border }, duration <= 1 && { opacity: 0.4 }]}
                >
                  <Ionicons name="remove" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.durationValue, { color: theme.text }]}>
                  {duration} {duration === 1 ? 'Hour' : 'Hours'}
                </Text>
                <Pressable
                  disabled={duration >= 8}
                  onPress={() => setDuration(duration + 1)}
                  style={[styles.circleBtn, { borderColor: theme.border }, duration >= 8 && { opacity: 0.4 }]}
                >
                  <Ionicons name="add" size={20} color={theme.text} />
                </Pressable>
              </View>
            </Card>
          </View>
        )}

        <View style={styles.actionRow}>
          <AppButton label="Continue to Address" onPress={handleNext} />
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
  progressRow: { marginBottom: spacing.lg },
  stepLabel: { fontWeight: '800', fontSize: 13, marginBottom: spacing.xs },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { fontWeight: '800', marginVertical: spacing.md },
  datesContainer: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateCard: {
    width: 76,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    marginRight: spacing.sm,
  },
  dayName: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  dayNum: { fontSize: 20, fontWeight: '700', marginVertical: 2 },
  monthName: { fontSize: 11, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  timeGridItem: { width: (width - spacing.md * 3) / 2 },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  timeIcon: { marginRight: spacing.xs },
  timeText: { fontWeight: '600', fontSize: 14 },
  durationSection: { marginTop: spacing.md },
  durationCard: { padding: spacing.md, borderWidth: 1, borderRadius: radii.md },
  durationDesc: { fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  durationActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationValue: { fontSize: 18, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  actionRow: { marginTop: spacing.xl },
});
