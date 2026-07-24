import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

const COMMISSION_PCT = 11;

// UK-format date/time picker kept simple (buttons) for POC reliability across
// platforms, rather than a native date picker dependency.
const DATE_OPTIONS = ['Tomorrow', 'In 2 days', 'In 3 days', 'This weekend'];
const TIME_OPTIONS = ['09:00', '11:00', '14:00', '16:00', '18:00'];

export default function BookServiceScreen({ route, navigation }) {
  const { providerId, categoryId } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { providers, categories, draft, setDraft } = useBookingStore();
  const theme = getTheme(highContrast);

  const provider = providers.find((p) => p.id === providerId);
  const category = categories.find((c) => c.id === categoryId);

  const [date, setDate] = useState(DATE_OPTIONS[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0]);
  const [postcode, setPostcode] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [notes, setNotes] = useState('');
  const [durationHours, setDurationHours] = useState(2);

  if (!provider || !category) return null;

  const hourlyRate = provider.hourlyRate;
  const subtotal = hourlyRate * durationHours;
  const serviceFee = Math.round(subtotal * (COMMISSION_PCT / 100) * 100) / 100;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;
  const providerEarns = subtotal;

  const canContinue = addressLine.trim().length > 2 && postcode.trim().length > 2;

  const handleContinue = () => {
    setDraft({
      categoryId,
      providerId,
      date,
      time,
      address: `${addressLine}, ${postcode.toUpperCase()}`,
      notes,
      durationHours,
    });
    navigation.navigate('Payment', {
      providerId,
      categoryId,
      subtotal,
      serviceFee,
      total,
      providerEarns,
    });
  };

  return (
    <ScreenContainer>
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} style={{ marginBottom: spacing.sm }}>
        <Ionicons name="chevron-back" size={26} color={theme.text} />
      </Pressable>

      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>Book {category.name}</Text>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.md, fontSize: scaledFont(14, fontScale) }}>with {provider.name}</Text>

      <Card>
        <Text style={styles.label(theme, fontScale)}>Date</Text>
        <View style={styles.chipRow}>
          {DATE_OPTIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDate(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: date === d }}
              style={[styles.chip, { borderColor: theme.border, backgroundColor: date === d ? theme.customerAccent : theme.surface }]}
            >
              <Text style={{ color: date === d ? theme.primaryButtonText : theme.text, fontWeight: '600' }}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label(theme, fontScale)}>Time</Text>
        <View style={styles.chipRow}>
          {TIME_OPTIONS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTime(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: time === t }}
              style={[styles.chip, { borderColor: theme.border, backgroundColor: time === t ? theme.customerAccent : theme.surface }]}
            >
              <Text style={{ color: time === t ? theme.primaryButtonText : theme.text, fontWeight: '600' }}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label(theme, fontScale)}>Duration (hours)</Text>
        <View style={styles.chipRow}>
          {[1, 2, 3, 4, 5].map((h) => (
            <Pressable
              key={h}
              onPress={() => setDurationHours(h)}
              accessibilityRole="button"
              accessibilityState={{ selected: durationHours === h }}
              style={[styles.chip, { borderColor: theme.border, backgroundColor: durationHours === h ? theme.customerAccent : theme.surface }]}
            >
              <Text style={{ color: durationHours === h ? theme.primaryButtonText : theme.text, fontWeight: '600' }}>{h}h</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.label(theme, fontScale)}>Address</Text>
        <AccessibleTextInput placeholder="e.g. 24 Baker Street, London" value={addressLine} onChangeText={setAddressLine} />
        <Text style={styles.label(theme, fontScale)}>UK Postcode</Text>
        <AccessibleTextInput placeholder="e.g. NW1 6XE" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" />
        <Text style={styles.label(theme, fontScale)}>Notes for provider (optional)</Text>
        <AccessibleTextInput placeholder="Anything the provider should know?" value={notes} onChangeText={setNotes} multiline />
      </Card>

      <Card>
        <Text accessibilityRole="header" style={[styles.summaryTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
          Price summary
        </Text>
        <Row label={`${durationHours}h × £${hourlyRate}/hr (provider earns)`} value={`£${providerEarns.toFixed(2)}`} theme={theme} fontScale={fontScale} />
        <Row label={`Service fee (${COMMISSION_PCT}%)`} value={`£${serviceFee.toFixed(2)}`} theme={theme} fontScale={fontScale} />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Row label="Total" value={`£${total.toFixed(2)}`} bold theme={theme} fontScale={fontScale} />
        <Text style={{ color: theme.textMuted, marginTop: spacing.sm, fontSize: scaledFont(12, fontScale) }}>
          We take a lower commission than most platforms — {COMMISSION_PCT}% vs the 15–25% industry norm — so providers keep more.
        </Text>
      </Card>

      <AppButton label="Continue to Payment" onPress={handleContinue} disabled={!canContinue} />
    </ScreenContainer>
  );
}

function Row({ label, value, bold, theme, fontScale }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.textMuted, fontSize: scaledFont(14, fontScale), flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: bold ? '800' : '600', fontSize: scaledFont(bold ? 17 : 14, fontScale) }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800' },
  label: (theme, fontScale) => ({ color: theme.text, fontWeight: '700', marginBottom: spacing.xs, fontSize: scaledFont(14, fontScale) }),
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  divider: { height: 1, marginVertical: spacing.sm },
  summaryTitle: { fontWeight: '800', marginBottom: spacing.sm },
});
