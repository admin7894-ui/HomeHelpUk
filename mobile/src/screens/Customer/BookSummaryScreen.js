import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';
import { calculateServicePrice } from '../../utils/pricingEngine';
import { getServiceConfig } from '../../utils/serviceConfig';

export default function BookSummaryScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { draft, setDraft, providers } = useBookingStore();
  const theme = getTheme(highContrast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!draft || !draft.providerId || !draft.serviceId) {
      navigation.navigate('MainTabs', { screen: 'Home' });
    }
  }, [draft, navigation]);

  if (!draft || !draft.providerId || !draft.serviceId) {
    return null; // Defensive guard while redirecting
  }

  const provider = providers.find((p) => p.id === draft.providerId);

  // Coupon state
  const [coupon, setCoupon] = useState('');
  const [discountPct, setDiscountPct] = useState(draft.couponDiscount || 0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');
    const code = coupon.toUpperCase().trim();

    if (code === 'SUMMER20' || code === 'UKDEEP20') {
      setDiscountPct(0.20); // 20% off
      setCouponSuccess('20% coupon applied successfully!');
      setDraft({ couponCode: code, couponDiscount: 0.20 });
    } else if (code === 'WELCOME10') {
      setDiscountPct(0.10); // 10% off
      setCouponSuccess('10% coupon applied successfully!');
      setDraft({ couponCode: code, couponDiscount: 0.10 });
    } else {
      setCouponError('Invalid coupon code.');
    }
  };

  const getIncludedQuantity = (baseIncludesStr) => {
    if (!baseIncludesStr) return 1;
    const match = baseIncludesStr.match(/(\d+)/g);
    if (match) {
      return parseInt(match[match.length - 1], 10);
    }
    return 1;
  };

  // Provider-specific pricing calculations
  const providerService = provider?.services?.find(s => (typeof s === 'string' ? s === draft.serviceId : s.serviceId === draft.serviceId));
  const baseServiceRate = (typeof providerService === 'object' ? providerService.customPrice : null) || provider?.hourlyRate || draft.servicePrice || 20;
  const providerPricingRules = (typeof providerService === 'object' && providerService.pricingRules) ? providerService.pricingRules : (draft.pricingRules || {});

  const serviceConfig = draft.serviceConfig || getServiceConfig(draft.serviceId, { id: draft.serviceId, name: draft.serviceName, price: draft.servicePrice, unit: draft.serviceUnit }, { id: draft.categoryId });

  const calc = calculateServicePrice({
    basePrice: baseServiceRate,
    durationHours: draft.durationHours || serviceConfig?.durationConfig?.defaultDurationHours || 2,
    quantity: draft.serviceQuantity || 1,
    selectedAddons: draft.addOns || [],
    serviceUnit: draft.serviceUnit || 'hr',
    pricingRules: providerPricingRules,
    serviceConfig,
    serviceId: draft.serviceId
  });

  // Apply Coupon Discount if applicable
  const discountCost = Math.round(calc.subtotal * discountPct * 100) / 100;
  const grandTotal = Math.round((calc.grandTotal - discountCost) * 100) / 100;

  const handleProceed = () => {
    setDraft({
      pricingSnapshot: {
        ...calc,
        couponCode: coupon,
        discount: discountCost,
        grandTotal
      }
    });
    // Navigate to payment screen passing billing details
    navigation.navigate('Payment', {
      billing: {
        baseServiceCost: calc.basePrice,
        durationHours: calc.durationHours,
        serviceUnit: draft.serviceUnit,
        includedQuantity: calc.includedQuantity,
        selectedQuantity: calc.selectedQuantity,
        extraQuantity: calc.extraUnits,
        additionalQuantityCharge: calc.extraUnitsCost,
        addonsSubtotal: calc.addonsCost,
        selectedAddons: draft.addOns || [],
        subtotal: calc.subtotal,
        platformFee: calc.platformFee,
        discount: discountCost,
        total: grandTotal,
      },
    });
  };

  const unitLabelCapitalized = (calc.includedUnit || 'unit').charAt(0).toUpperCase() + (calc.includedUnit || 'unit').slice(1);

  return (
    <ScreenContainer>
      {/* Header Row - Fixed back button Title overlap */}
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
          Booking Summary
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Step Indicator */}
        <View style={styles.progressRow}>
          <Text style={[styles.stepLabel, { color: theme.customerAccent }]}>Step 4 of 4: Checkout</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: theme.customerAccent, width: '100%' }]} />
          </View>
        </View>

        {/* 1. Service Details (16px spacing between cards) */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.cardTitle, { color: theme.textMuted }]}>SERVICE DETAILS</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.serviceTitle, { color: theme.text }]}>{draft.serviceName}</Text>
            <Text style={{ color: theme.customerAccent, fontWeight: '800' }}>
              £{baseServiceRate}{draft.serviceUnit === 'hr' ? '/hr' : ' fixed'}
            </Text>
          </View>
          {draft.serviceUnit === 'hr' && (
            <Text style={[styles.detailSubtext, { color: theme.textMuted }]}>
              Booking Duration: {calc.durationHours} hours
            </Text>
          )}
          {draft.familySizeLabel ? (
            <Text style={[styles.detailSubtext, { color: theme.customerAccent, fontWeight: '700', marginTop: 2 }]}>
              Family Size: {draft.familySizeLabel}
            </Text>
          ) : draft.unitConfig ? (
            <Text style={[styles.detailSubtext, { color: theme.textMuted, marginTop: 2 }]}>
              {calc.selectedQuantity === 1 ? draft.unitConfig.unitLabel : draft.unitConfig.unitLabelPlural} Booked: {calc.selectedQuantity}
            </Text>
          ) : calc.pricingModel !== 'fixed' ? (
            <Text style={[styles.detailSubtext, { color: theme.textMuted, marginTop: 2 }]}>
              {unitLabelCapitalized}s Booked: {calc.selectedQuantity}
            </Text>
          ) : null}

          {/* Add-ons List */}
          {draft.addOns && draft.addOns.length > 0 && (
            <View style={styles.addonsList}>
              <Text style={[styles.addonsLabel, { color: theme.text }]}>Selected Add-ons:</Text>
              {draft.addOns.map((add, idx) => (
                <View key={add.serviceId || add.id || idx} style={styles.addonLine}>
                  <Text style={{ color: theme.textMuted }}>• {add.name}</Text>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>+£{add.price}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Moving Details Card */}
          {draft.movingDetails && (
            <Card style={styles.summaryCard}>
              <Text style={[styles.cardTitle, { color: theme.textMuted }]}>MOVING DETAILS</Text>

              <View style={styles.scheduleDetailRow}>
                <Ionicons name="cube-outline" size={18} color={theme.customerAccent} style={styles.detailIcon} />
                <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>
                  Move Size: {draft.movingDetails.moveSize?.title} ({draft.movingDetails.moveSize?.subtitle})
                </Text>
              </View>

              {draft.movingDetails.propertySize && (
                <View style={styles.scheduleDetailRow}>
                  <Ionicons name="home-outline" size={18} color={theme.customerAccent} style={styles.detailIcon} />
                  <Text style={{ color: theme.text, flex: 1 }}>
                    Property Size: <Text style={{ fontWeight: '700' }}>{draft.movingDetails.propertySize.label}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.scheduleDetailRow}>
                <Ionicons name="location-outline" size={18} color="#16A34A" style={styles.detailIcon} />
                <Text style={{ color: theme.textMuted, flex: 1 }}>
                  Pickup: <Text style={{ color: theme.text, fontWeight: '600' }}>{draft.movingDetails.pickupAddress}</Text>
                </Text>
              </View>

              <View style={styles.scheduleDetailRow}>
                <Ionicons name="pin-outline" size={18} color="#EF4444" style={styles.detailIcon} />
                <Text style={{ color: theme.textMuted, flex: 1 }}>
                  Destination: <Text style={{ color: theme.text, fontWeight: '600' }}>{draft.movingDetails.destinationAddress}</Text>
                </Text>
              </View>

              {draft.movingDetails.vehicle && (
                <View style={styles.scheduleDetailRow}>
                  <Ionicons name="car-outline" size={18} color={theme.customerAccent} style={styles.detailIcon} />
                  <Text style={{ color: theme.text, flex: 1 }}>
                    Vehicle: <Text style={{ fontWeight: '700' }}>{draft.movingDetails.vehicle.title}</Text>
                  </Text>
                </View>
              )}

              {draft.movingDetails.assistance && draft.movingDetails.assistance.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.addonsLabel, { color: theme.text }]}>Selected Assistance:</Text>
                  {draft.movingDetails.assistance.map((a, idx) => (
                    <Text key={idx} style={{ color: theme.textMuted, fontSize: 13, marginLeft: 8, marginTop: 2 }}>
                      • {a?.label || 'Assistance'} (+£{a?.price || 0})
                    </Text>
                  ))}
                </View>
              )}
            </Card>
          )}

        {/* 2. Schedule & Location Details */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.cardTitle, { color: theme.textMuted }]}>SCHEDULE & LOCATION</Text>
          <View style={styles.scheduleDetailRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.customerAccent} style={styles.detailIcon} />
            <Text style={{ color: theme.text, fontWeight: '600', flex: 1 }}>{draft.date} at {draft.time}</Text>
          </View>
          <View style={styles.scheduleDetailRow}>
            <Ionicons name="pin-outline" size={18} color={theme.customerAccent} style={styles.detailIcon} />
            <Text style={{ color: theme.textMuted, flex: 1 }}>{draft.address}</Text>
          </View>
          {provider && (
            <View style={styles.scheduleDetailRow}>
              <Ionicons name="person-outline" size={18} color={theme.customerAccent} style={styles.detailIcon} />
              <Text style={{ color: theme.text, flex: 1 }}>
                Assigned Pro: <Text style={{ fontWeight: '700' }}>{provider.name}</Text>
              </Text>
            </View>
          )}
        </Card>

        {/* 3. Promo Code Coupon Section */}
        <View style={styles.couponSection}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
            Have a Promo Code?
          </Text>
          <View style={styles.couponInputRow}>
            <View style={styles.couponTextInputWrapper}>
              <AccessibleTextInput
                placeholder="e.g. SUMMER20"
                value={coupon}
                onChangeText={setCoupon}
                autoCapitalize="characters"
              />
            </View>
            <Pressable
              onPress={handleApplyCoupon}
              style={[styles.applyBtn, { backgroundColor: theme.customerAccent }]}
              accessibilityRole="button"
              accessibilityLabel="Apply promo code"
            >
              <Text style={{ color: theme.primaryButtonText, fontWeight: '800' }}>Apply</Text>
            </Pressable>
          </View>
          {couponError ? <Text style={[styles.couponMsg, { color: theme.danger }]}>{couponError}</Text> : null}
          {couponSuccess ? <Text style={[styles.couponMsg, { color: theme.success }]}>{couponSuccess}</Text> : null}
          <Text style={styles.hintText}>
            Try coupon "SUMMER20" or "WELCOME10" for 10-20% off your {(draft.serviceName || 'service').toLowerCase()} booking!
          </Text>
        </View>

        {/* 4. Payment Breakdown */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.cardTitle, { color: theme.textMuted }]}>PAYMENT BREAKDOWN</Text>
          
          <View style={styles.billingLine}>
            <Text style={{ color: theme.textMuted }}>Base Service Price</Text>
            <Text style={{ color: theme.text, fontWeight: '600' }}>£{calc.basePrice.toFixed(2)}</Text>
          </View>

          {calc.extraHours > 0 && (
            <View style={styles.billingLine}>
              <Text style={{ color: theme.textMuted }}>Extra Hours ({calc.extraHours} {calc.extraHours === 1 ? 'hour' : 'hours'} × £{calc.extraHourPrice}/hr)</Text>
              <Text style={{ color: theme.text, fontWeight: '600' }}>+£{calc.extraHoursCost.toFixed(2)}</Text>
            </View>
          )}

          {calc.extraUnits > 0 && (
            <View style={styles.billingLine}>
              <Text style={{ color: theme.textMuted }}>Extra {unitLabelCapitalized}s ({calc.extraUnits} × £{calc.additionalUnitPrice}/{calc.includedUnit})</Text>
              <Text style={{ color: theme.text, fontWeight: '600' }}>+£{calc.extraUnitsCost.toFixed(2)}</Text>
            </View>
          )}

          {draft.addOns && draft.addOns.length > 0 ? (
            draft.addOns.map((add, idx) => (
              <View key={add.serviceId || add.id || `addon_${idx}`} style={styles.billingLine}>
                <Text style={{ color: theme.textMuted }}>{add.name} (Add-on)</Text>
                <Text style={{ color: theme.text, fontWeight: '600' }}>+£{Number(add.price).toFixed(2)}</Text>
              </View>
            ))
          ) : calc.addonsCost > 0 ? (
            <View style={styles.billingLine}>
              <Text style={{ color: theme.textMuted }}>Add-ons Cost</Text>
              <Text style={{ color: theme.text, fontWeight: '600' }}>+£{calc.addonsCost.toFixed(2)}</Text>
            </View>
          ) : null}

          {discountCost > 0 && (
            <View style={styles.billingLine}>
              <Text style={{ color: theme.success }}>Promo Discount</Text>
              <Text style={{ color: theme.success, fontWeight: '600' }}>-£{discountCost.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.billingLine}>
            <Text style={{ color: theme.textMuted }}>Platform Trust Fee (11%)</Text>
            <Text style={{ color: theme.text, fontWeight: '600' }}>+£{calc.platformFee.toFixed(2)}</Text>
          </View>

          <View style={[styles.billingLine, styles.totalLine, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Final Total</Text>
            <Text style={[styles.totalAmount, { color: theme.customerAccent }]}>£{grandTotal.toFixed(2)}</Text>
          </View>
        </Card>

        {/* Proceed to Payment with 16-20px bottom safe-area padding */}
        <View style={[styles.actionRow, { paddingBottom: 20 + insets.bottom }]}>
          <AppButton label="Proceed to Payment" onPress={handleProceed} />
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
    marginBottom: 16,
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
  sectionTitle: { fontWeight: '800', marginBottom: spacing.sm },
  summaryCard: { padding: spacing.md, borderWidth: 1, borderRadius: radii.md, marginBottom: 16 }, // 16px vertical gap
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.xs },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceTitle: { fontWeight: '800', fontSize: 16 },
  detailSubtext: { fontSize: 13, marginTop: 4 },
  addonsList: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: spacing.xs },
  addonsLabel: { fontWeight: '700', fontSize: 12, marginBottom: spacing.xs },
  addonLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  scheduleDetailRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  detailIcon: { marginRight: spacing.xs },
  couponSection: { marginBottom: spacing.md },
  couponInputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  couponTextInputWrapper: { flex: 1, marginBottom: -12 },
  applyBtn: { paddingHorizontal: spacing.md, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  couponMsg: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  hintText: { fontSize: 11, fontStyle: 'italic', marginTop: 4, color: '#64748B' },
  billingLine: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 }, // Increased vertical gap for line-height feel
  totalDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 }, // Emphasized divider before Total Amount
  actionRow: { marginTop: spacing.md },
});
