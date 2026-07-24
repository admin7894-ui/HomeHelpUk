import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing } from '../../utils/theme';
import { getServiceName } from '../../utils/bookingUtils';

const NEXT_STATUS = {
  assigned: 'en_route',
  en_route: 'in_progress',
  in_progress: 'completed',
};
const ACTION_LABEL = {
  assigned: 'Start Heading Over (En Route)',
  en_route: 'Start Job',
  in_progress: 'Mark Job Complete',
};

export default function JobDetailScreen({ route, navigation }) {
  const { booking } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { categories } = useBookingStore();
  const theme = getTheme(highContrast);
  
  const serviceName = getServiceName(booking.categoryId, categories);

  const [status, setStatus] = useState(booking.status);
  const [updating, setUpdating] = useState(false);

  const accept = async () => {
    setUpdating(true);
    try {
      const { data } = await api.patch(`/bookings/${booking.id}/status`, { status: 'assigned' });
      setStatus(data.booking.status);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to accept job');
    } finally {
      setUpdating(false);
    }
  };

  const advance = async () => {
    const next = NEXT_STATUS[status];
    if (!next) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/bookings/${booking.id}/status`, { status: next });
      setStatus(data.booking.status);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update job status');
    } finally {
      setUpdating(false);
    }
  };

  const fallbackLegacyPayout = (booking.total && booking.serviceFee) ? (booking.total - booking.serviceFee) : (booking.hourlyRate * booking.durationHours);
  const providerEarns = booking.providerPayout || (booking.pricingBreakdown ? booking.pricingBreakdown.subtotal : fallbackLegacyPayout);

  return (
    <ScreenContainer>
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} style={{ marginBottom: spacing.sm }}>
        <Ionicons name="chevron-back" size={26} color={theme.text} />
      </Pressable>

      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>{serviceName || 'Job'}</Text>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.md, fontSize: scaledFont(14, fontScale) }}>
        {booking.date} at {booking.time} · {booking.durationHours}h
      </Text>

      <Card>
        <Text style={{ color: theme.text, fontWeight: '700', marginBottom: spacing.xs }}>Customer Address</Text>
        <Text style={{ color: theme.textMuted }}>{booking.address}</Text>
        {booking.notes ? (
          <>
            <Text style={{ color: theme.text, fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.xs }}>Notes</Text>
            <Text style={{ color: theme.textMuted }}>{booking.notes}</Text>
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: theme.text, fontWeight: '700', marginBottom: spacing.xs }}>Payout</Text>
        <Text style={{ color: theme.textMuted }}>You earn: £{providerEarns.toFixed(2)}</Text>
        <Text style={{ color: theme.textMuted }}>Platform fee: £{booking.serviceFee.toFixed(2)} ({booking.platformCommissionPct}%)</Text>
      </Card>

      {status === 'pending' ? (
        <View style={styles.actionsRow}>
          <AppButton
            label="Decline"
            variant="outline"
            accent="provider"
            onPress={() => navigation.goBack()}
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <AppButton label="Accept Job" accent="provider" onPress={accept} loading={updating} style={{ flex: 1 }} />
        </View>
      ) : status === 'completed' ? (
        <Text style={{ color: theme.success, fontWeight: '700', textAlign: 'center', marginTop: spacing.md }}>✓ Job completed</Text>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <AppButton
            label="Navigate with Maps"
            variant="outline"
            accent="provider"
            onPress={() => Linking.openURL(`http://maps.google.com/?daddr=${encodeURIComponent(booking.address)}`)}
          />
          <AppButton
            label="Chat with Customer"
            variant="secondary"
            accent="provider"
            onPress={() => navigation.navigate('Chat', { 
              contactName: booking.customerName || 'Customer', 
              bookingId: booking.id,
              serviceName: serviceName,
              bookingDate: booking.date,
              bookingTime: booking.time
            })}
          />
          <AppButton
            label="Track & Complete Job"
            accent="provider"
            onPress={() => navigation.navigate('JobExecution', { booking })}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800' },
  actionsRow: { flexDirection: 'row', marginTop: spacing.md },
});
