import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function PaymentScreen({ route, navigation }) {
  const { billing } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const { draft, createBooking, resetDraft } = useBookingStore();
  const theme = getTheme(highContrast);

  const [method, setMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    try {
      // Simulate gateway latency
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let bookingNotes = draft.notes || '';
      if (draft.familySizeLabel) {
        bookingNotes = bookingNotes ? `${bookingNotes} | Family Size: ${draft.familySizeLabel}` : `Family Size: ${draft.familySizeLabel}`;
      }
      if (draft.movingDetails) {
        const moveSummary = `Move: ${draft.movingDetails.moveSize?.title} | Pickup: ${draft.movingDetails.pickupAddress} | Dest: ${draft.movingDetails.destinationAddress}` +
          (draft.movingDetails.vehicle ? ` | Vehicle: ${draft.movingDetails.vehicle.title}` : '');
        bookingNotes = bookingNotes ? `${bookingNotes} | ${moveSummary}` : moveSummary;
      }

      const booking = await createBooking({
        customerId: user.id,
        providerId: draft.providerId,
        categoryId: draft.serviceId, // Store specific service ID on backend
        date: draft.date,
        time: draft.time,
        address: draft.address,
        notes: bookingNotes,
        durationHours: Number(draft.durationHours),
        serviceQuantity: Number(draft.serviceQuantity || 1),
        pricingBreakdown: { ...billing, familySizeLabel: draft.familySizeLabel, movingDetails: draft.movingDetails, unitConfig: draft.unitConfig },
        pricingSnapshot: { ...(draft.pricingSnapshot || billing), familySizeLabel: draft.familySizeLabel, movingDetails: draft.movingDetails, unitConfig: draft.unitConfig }
      });

      // Reset navigation stack to completely remove Booking Summary and Payment screens.
      navigation.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'BookingConfirmation', params: { bookingId: booking.id } }
        ]
      });
    } catch (err) {
      if (err.response?.status === 409) {
        Alert.alert('Booking Conflict', err.response.data.message || 'This provider is already booked at this time. Please select another time or provider.');
      } else {
        Alert.alert('Payment failed', err.response?.data?.message || err.message);
      }
    } finally {
      setProcessing(false);
    }
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
          Secure Checkout
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.amountContainer}>
          <Text style={{ color: theme.textMuted, fontSize: scaledFont(14, fontScale), fontWeight: '600' }}>TOTAL AMOUNT</Text>
          <Text style={[styles.grandTotalText, { color: theme.customerAccent, fontSize: scaledFont(36, fontScale) }]}>
            £{billing.total.toFixed(2)}
          </Text>
        </View>

        {/* Payment Methods */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
          Select Payment Method
        </Text>
        <View style={styles.optionsWrapper}>
          <PaymentOption
            selected={method === 'card'}
            onPress={() => setMethod('card')}
            icon="card"
            label="Credit / Debit Card"
            sub="Visa •••• 4242 (Stripe test mode)"
            theme={theme}
            fontScale={fontScale}
          />
          <PaymentOption
            selected={method === 'apple'}
            onPress={() => setMethod('apple')}
            icon="logo-apple"
            label="Apple Pay"
            theme={theme}
            fontScale={fontScale}
          />
          <PaymentOption
            selected={method === 'google'}
            onPress={() => setMethod('google')}
            icon="logo-google"
            label="Google Pay"
            theme={theme}
            fontScale={fontScale}
          />
        </View>

        {/* Premium Credit Card Mock Visual */}
        {method === 'card' && (
          <Card style={[styles.cardVisual, { backgroundColor: '#1E1B4B' }]}>
            <View style={styles.cardVisualHeader}>
              <Text style={styles.cardBrand}>PREMIUM CHECKOUT</Text>
              <Ionicons name="wifi" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cardNumber}>••••  ••••  ••••  4242</Text>
            <View style={styles.cardVisualFooter}>
              <View>
                <Text style={styles.cardHolderLabel}>CARDHOLDER</Text>
                <Text style={styles.cardHolderName}>{user?.name?.toUpperCase() || 'VALUED CUSTOMER'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardHolderLabel}>EXPIRES</Text>
                <Text style={styles.cardHolderName}>12 / 29</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Payment Details Card */}
        <Card style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.summaryTitle, { color: theme.textMuted }]}>PAYMENT BREAKDOWN</Text>
          {Array.isArray(billing.selectedAddons) && billing.selectedAddons.length > 0 && (
            billing.selectedAddons.map((add, idx) => (
              <Row
                key={add.serviceId || add.id || `addon_${idx}`}
                label={`${add.name} (Add-on)`}
                value={`+£${Number(add.price).toFixed(2)}`}
                theme={theme}
                fontScale={fontScale}
              />
            ))
          )}
          <Row label="Subtotal" value={`£${billing.subtotal.toFixed(2)}`} theme={theme} fontScale={fontScale} />
          <Row label="Platform Service Fee" value={`£${billing.platformFee.toFixed(2)}`} theme={theme} fontScale={fontScale} />
          {billing.discount > 0 && (
            <Row label="Promo Discount" value={`-£${billing.discount.toFixed(2)}`} success theme={theme} fontScale={fontScale} />
          )}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Row label="Grand Total" value={`£${billing.total.toFixed(2)}`} bold theme={theme} fontScale={fontScale} />
        </Card>

        <View style={styles.actionRow}>
          <AppButton
            label={processing ? 'Processing Secure Payment...' : `Authorize £${billing.total.toFixed(2)}`}
            onPress={handlePay}
            loading={processing}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function PaymentOption({ selected, onPress, icon, label, sub, theme, fontScale }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[
        styles.option,
        { borderColor: selected ? theme.customerAccent : theme.border, backgroundColor: selected ? theme.customerAccentSoft : theme.surface },
      ]}
    >
      <Ionicons name={icon} size={24} color={selected ? theme.customerAccent : theme.text} />
      <View style={{ marginLeft: spacing.sm, flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: scaledFont(15, fontScale) }}>{label}</Text>
        {sub ? <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>{sub}</Text> : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? theme.customerAccent : theme.textMuted}
      />
    </Pressable>
  );
}

function Row({ label, value, bold, success, theme, fontScale }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.textMuted, fontSize: scaledFont(14, fontScale), flex: 1 }}>{label}</Text>
      <Text
        style={{
          color: success ? theme.success : theme.text,
          fontWeight: bold ? '800' : '600',
          fontSize: scaledFont(bold ? 16 : 14, fontScale),
        }}
      >
        {value}
      </Text>
    </View>
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
  amountContainer: { alignItems: 'center', marginVertical: spacing.md },
  grandTotalText: { fontWeight: '900', marginTop: 4 },
  sectionTitle: { fontWeight: '800', marginBottom: spacing.sm },
  optionsWrapper: { gap: spacing.xs, marginBottom: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  cardVisual: {
    height: 180,
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardVisualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  cardNumber: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: 2, marginVertical: spacing.sm },
  cardVisualFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardHolderLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  cardHolderName: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  summaryCard: { padding: spacing.md, borderWidth: 1, borderRadius: radii.md, marginBottom: spacing.md },
  summaryTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  divider: { height: 1, marginVertical: spacing.sm },
  actionRow: { marginTop: spacing.sm },
});
