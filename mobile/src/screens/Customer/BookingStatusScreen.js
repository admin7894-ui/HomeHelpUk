import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import api from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

const STEPS = [
  { key: 'pending', label: 'Booking Requested', desc: 'We are matching you with a professional.' },
  { key: 'assigned', label: 'Provider Confirmed', desc: 'Your professional has accepted the booking.' },
  { key: 'en_route', label: 'En Route', desc: 'Your professional is on the way.' },
  { key: 'in_progress', label: 'Provider Arrived / In Progress', desc: 'Your service is currently being completed.' },
  { key: 'completed', label: 'Service Completed', desc: 'Your service has been completed.' },
];

export default function BookingStatusScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { categories, providers, fetchCategories, fetchProviders } = useBookingStore();
  const theme = getTheme(highContrast);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    if (categories.length === 0) await fetchCategories();
    if (providers.length === 0) await fetchProviders();
    try {
      const { data } = await api.get(`/bookings/${bookingId}`);
      setBooking(data.booking);
    } catch (e) {
      console.log('Error fetching booking', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();

    const { getSocket, joinBookingRoom, leaveBookingRoom } = require('../../services/socket');
    joinBookingRoom(bookingId);

    const socket = getSocket();
    if (socket) {
      const handleStatusUpdate = (data) => {
        if (data.bookingId === bookingId || data.booking?.id === bookingId) {
          console.log('[Real-Time Status Update Received]', data);
          if (data.booking) {
            setBooking(data.booking);
          } else {
            load();
          }
        }
      };

      socket.on('booking:accepted', handleStatusUpdate);
      socket.on('booking:declined', handleStatusUpdate);
      socket.on('booking:status_changed', handleStatusUpdate);
      socket.on('booking:completed', handleStatusUpdate);
      socket.on('booking:cancelled', handleStatusUpdate);

      return () => {
        leaveBookingRoom(bookingId);
        socket.off('booking:accepted', handleStatusUpdate);
        socket.off('booking:declined', handleStatusUpdate);
        socket.off('booking:status_changed', handleStatusUpdate);
        socket.off('booking:completed', handleStatusUpdate);
        socket.off('booking:cancelled', handleStatusUpdate);
      };
    }
  }, [bookingId]);

  if (loading && !booking) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.customerAccent} />
          <Text style={{ color: theme.textMuted, marginTop: spacing.sm }}>Loading status...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!booking) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={{ color: theme.text }}>Booking details not found.</Text>
          <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: theme.customerAccent, fontWeight: '700' }}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === booking.status);

  let serviceName = 'Unknown Service';
  for (const cat of categories) {
    if (cat.id === booking.categoryId) {
      serviceName = cat.name;
      break;
    }
    const subs = cat.subCategories || cat.subcategories;
    if (subs) {
      for (const sub of subs) {
        if (sub.id === booking.categoryId) {
          serviceName = sub.name;
          break;
        }
        const srv = sub.services?.find(s => s.id === booking.categoryId);
        if (srv) {
          serviceName = srv.name;
          break;
        }
      }
    }
    if (serviceName !== 'Unknown Service') break;
  }

  const provider = providers.find((p) => p.id === booking.providerId);

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
          Booking Status
        </Text>
        <Pressable
          onPress={load}
          accessibilityRole="button"
          accessibilityLabel="Refresh status"
          style={[styles.refreshBtn, { borderColor: theme.border }]}
        >
          <Ionicons name="refresh" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Core Info */}
        <Card style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.activeStatusBadge, { backgroundColor: theme.customerAccentSoft }]}>
              <Text style={{ color: theme.customerAccent, fontWeight: '800', fontSize: 10 }}>
                {booking.status.toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Booking ID: {booking.id}</Text>
          </View>
          <Text style={[styles.serviceTitleText, { color: theme.customerAccent, fontSize: scaledFont(16, fontScale), marginBottom: spacing.xs }]}>
            {serviceName}
          </Text>
          <Text style={[styles.addressText, { color: theme.text, fontSize: scaledFont(15, fontScale) }]}>
            {booking.address}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>
            Scheduled for: {booking.date} at {booking.time}
          </Text>
        </Card>

        {/* Provider Info */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
          Your Professional
        </Text>
        <Card style={[styles.providerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {provider ? (
            <View style={styles.providerContent}>
              {provider.avatar ? (
                <Image source={{ uri: provider.avatar }} style={styles.providerAvatar} />
              ) : (
                <View style={[styles.providerAvatarPlaceholder, { backgroundColor: theme.border }]}>
                  <Ionicons name="person" size={24} color={theme.textMuted} />
                </View>
              )}
              <View style={styles.providerDetails}>
                <Text style={[styles.providerName, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
                  {provider.name}
                </Text>
                <View style={styles.providerRatingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={[styles.providerRatingText, { color: theme.text }]}>
                    {provider.rating?.toFixed(1) || 'New'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: 4 }}>
                    ({provider.reviews || 0} reviews)
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.providerContent}>
              <ActivityIndicator size="small" color={theme.customerAccent} style={{ marginRight: spacing.sm }} />
              <Text style={{ color: theme.textMuted, fontSize: scaledFont(14, fontScale), flex: 1 }}>
                Finding a professional for your booking...
              </Text>
            </View>
          )}
        </Card>

        {/* Verification Codes */}
        {(booking.status === 'assigned' || booking.status === 'en_route' || booking.status === 'in_progress') && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
              Verification Codes
            </Text>
            <Card style={[{ backgroundColor: theme.surface, borderColor: theme.border, marginBottom: spacing.md, padding: spacing.md }]}>
              <Text style={{ color: theme.textMuted, fontSize: scaledFont(13, fontScale), marginBottom: spacing.sm }}>
                Share these secure PIN codes with your professional to start and finish the job.
              </Text>
              <View style={[styles.billingRow, { marginBottom: spacing.xs }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Start Code:</Text>
                <Text style={{ color: theme.customerAccent, fontWeight: '800', fontSize: scaledFont(16, fontScale), letterSpacing: 2 }}>
                  {booking.startOtp}
                </Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Completion Code:</Text>
                <Text style={{ color: theme.customerAccent, fontWeight: '800', fontSize: scaledFont(16, fontScale), letterSpacing: 2 }}>
                  {booking.completionOtp}
                </Text>
              </View>
            </Card>
          </>
        )}

        {/* Timeline */}
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
          Job Progress
        </Text>
        <Card style={[styles.timelineCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <View key={step.key} style={styles.stepContainer}>
                {/* Timeline graphics */}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineCircle,
                      isCompleted && { backgroundColor: theme.success },
                      isActive && { backgroundColor: theme.customerAccent, borderWidth: 0 },
                      isPending && { borderColor: theme.border, backgroundColor: theme.surface },
                    ]}
                  >
                    {isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    {isActive && <View style={styles.innerDot} />}
                  </View>
                  {index < STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: isCompleted ? theme.success : theme.border },
                      ]}
                    />
                  )}
                </View>

                {/* Timeline text details */}
                <View style={styles.timelineRight}>
                  <Text
                    style={[
                      styles.stepLabelText,
                      { color: theme.text },
                      isActive && { color: theme.customerAccent, fontWeight: '800' },
                      isPending && { color: theme.textMuted },
                    ]}
                  >
                    {step.label}
                  </Text>
                  {(isActive || isCompleted) && (
                    <Text style={[styles.stepDescText, { color: theme.textMuted }]}>{step.desc}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        {/* Pricing Summary */}
        <Card style={[styles.priceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardSubTitle, { color: theme.textMuted }]}>PAYMENT DETAILS</Text>
          
          {(() => {
            const pb = booking.pricingBreakdown || booking.estimatedPricing || {};
            const basePrice = Number(pb.basePrice ?? pb.baseServiceCost ?? booking.servicePrice ?? 0);
            
            const extraUnitsCost = Number(pb.extraUnitsCost ?? pb.additionalQuantityCharge ?? 0);
            const extraUnitsCount = Number(pb.extraUnits ?? pb.extraQuantity ?? 0);
            
            const extraHoursCost = Number(pb.extraHoursCost ?? 0);
            const extraHoursCount = Number(pb.extraHours ?? 0);

            const isCooking = (booking.serviceName || '').toLowerCase().includes('chef') || 
                              (booking.serviceName || '').toLowerCase().includes('cook') || 
                              (booking.serviceId || '').toLowerCase().includes('cook');

            let familySizeLabel = booking.familySize?.label || 
                                  (booking.familySize?.title ? `${booking.familySize.title}${booking.familySize.peopleRange ? ` (${booking.familySize.peopleRange})` : ''}` : null) || 
                                  booking.familySizeLabel;

            if (!familySizeLabel && isCooking) {
              if (extraUnitsCount >= 4 || Number(pb.selectedQuantity || 0) >= 7) {
                familySizeLabel = 'Large Family (7+ people)';
              } else if (extraUnitsCount >= 1 || Number(pb.selectedQuantity || 0) >= 4) {
                familySizeLabel = 'Medium Family (4–6 people)';
              } else {
                familySizeLabel = 'Small Family (1–3 people)';
              }
            }

            const addonsList = Array.isArray(pb.selectedAddons) && pb.selectedAddons.length > 0
              ? pb.selectedAddons
              : (Array.isArray(booking.addOns) && booking.addOns.length > 0 ? booking.addOns : []);
            
            const addonsSubtotal = addonsList.reduce((sum, a) => sum + Number(a.price || 0), 0) || Number(pb.addonsCost || pb.addonsSubtotal || 0);

            const subtotal = Number(pb.subtotal ?? (basePrice + extraUnitsCost + extraHoursCost + addonsSubtotal));
            const platformFee = Number(pb.platformFee ?? booking.serviceFee ?? (subtotal * 0.11));
            const totalPaid = Number(booking.total ?? pb.grandTotal ?? pb.totalCost ?? (subtotal + platformFee));

            return (
              <>
                <View style={styles.billingRow}>
                  <Text style={{ color: theme.textMuted }}>Base Service Price</Text>
                  <Text style={{ color: theme.text }}>£{basePrice.toFixed(2)}</Text>
                </View>

                {/* Family Tier / Unit Extra Charge */}
                {familySizeLabel && extraUnitsCost > 0 ? (
                  <View style={styles.billingRow}>
                    <Text style={{ color: theme.textMuted }}>{familySizeLabel}</Text>
                    <Text style={{ color: theme.text }}>+£{extraUnitsCost.toFixed(2)}</Text>
                  </View>
                ) : extraUnitsCost > 0 ? (
                  <View style={styles.billingRow}>
                    <Text style={{ color: theme.textMuted }}>Additional Units ({extraUnitsCount} extra)</Text>
                    <Text style={{ color: theme.text }}>+£{extraUnitsCost.toFixed(2)}</Text>
                  </View>
                ) : null}

                {/* Extra Duration Hours Charge */}
                {extraHoursCost > 0 && (
                  <View style={styles.billingRow}>
                    <Text style={{ color: theme.textMuted }}>Extra Duration ({extraHoursCount} hrs)</Text>
                    <Text style={{ color: theme.text }}>+£{extraHoursCost.toFixed(2)}</Text>
                  </View>
                )}

                {/* Add-ons List */}
                {addonsList.length > 0 ? (
                  addonsList.map((add, idx) => (
                    <View key={add.serviceId || add.id || `status_addon_${idx}`} style={styles.billingRow}>
                      <Text style={{ color: theme.textMuted }}>{add.name} (Add-on)</Text>
                      <Text style={{ color: theme.text }}>+£{Number(add.price || 0).toFixed(2)}</Text>
                    </View>
                  ))
                ) : addonsSubtotal > 0 ? (
                  <View style={styles.billingRow}>
                    <Text style={{ color: theme.textMuted }}>Add-ons Cost</Text>
                    <Text style={{ color: theme.text }}>+£{addonsSubtotal.toFixed(2)}</Text>
                  </View>
                ) : null}

                {/* Subtotal */}
                <View style={[styles.billingRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>Subtotal</Text>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>£{subtotal.toFixed(2)}</Text>
                </View>

                {/* Platform Trust Fee */}
                <View style={styles.billingRow}>
                  <Text style={{ color: theme.textMuted }}>Platform Trust Fee (11%)</Text>
                  <Text style={{ color: theme.text }}>£{platformFee.toFixed(2)}</Text>
                </View>

                {pb.discount > 0 && (
                  <View style={styles.billingRow}>
                    <Text style={{ color: theme.success, fontWeight: '700' }}>Promo Discount</Text>
                    <Text style={{ color: theme.success, fontWeight: '700' }}>-£{Number(pb.discount).toFixed(2)}</Text>
                  </View>
                )}

                {/* Total Paid */}
                <View style={styles.totalRow}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>Total Paid</Text>
                  <Text style={{ color: '#0A3925', fontWeight: '900', fontSize: 18 }}>
                    £{totalPaid.toFixed(2)}
                  </Text>
                </View>
              </>
            );
          })()}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsWrapper}>
          {booking.status === 'completed' && (
            <AppButton label="Leave a Rating & Review" onPress={() => navigation.navigate('RateReview', { booking })} />
          )}
          {(() => {
            const status = (booking.status || '').toLowerCase();
            const isChatAllowed = ['assigned', 'accepted', 'en_route', 'in_progress', 'completed', 'cancelled'].includes(status) && status !== 'pending' && status !== 'rejected';
            if (!isChatAllowed || !provider) return null;

            return (
              <AppButton
                label="Message Professional"
                variant={booking.status === 'completed' ? 'outline' : 'primary'}
                onPress={() => navigation.navigate('Chat', { 
                  contactName: provider.name, 
                  bookingId: booking.id,
                  serviceName: serviceName,
                  bookingDate: booking.date,
                  bookingTime: booking.time
                })}
              />
            );
          })()}
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
  refreshBtn: {
    position: 'absolute',
    right: 0,
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { padding: spacing.md, borderWidth: 1, borderRadius: radii.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  activeStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm },
  serviceTitleText: { fontWeight: '800' },
  addressText: { fontWeight: '800', lineHeight: 20 },
  sectionTitle: { fontWeight: '800', marginBottom: spacing.sm },
  providerCard: { borderWidth: 1, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  providerContent: { flexDirection: 'row', alignItems: 'center' },
  providerAvatar: { width: 50, height: 50, borderRadius: 25 },
  providerAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  providerDetails: { marginLeft: spacing.md, flex: 1 },
  providerName: { fontWeight: '800' },
  providerRatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  providerRatingText: { fontWeight: '700', fontSize: 13, marginLeft: 4 },
  timelineCard: { borderWidth: 1, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  stepContainer: { flexDirection: 'row', minHeight: 64 },
  timelineLeft: { alignItems: 'center', width: 30 },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A3925' },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineRight: { flex: 1, marginLeft: spacing.sm, paddingTop: 2, paddingBottom: spacing.md },
  stepLabelText: { fontWeight: '700', fontSize: 14 },
  stepDescText: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  priceCard: { borderWidth: 1, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.xl },
  cardSubTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm, color: '#64748B' },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: spacing.sm, marginTop: spacing.sm },
  actionsWrapper: { gap: spacing.sm },
});
