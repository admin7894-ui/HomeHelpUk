import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function BookingConfirmationScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { resetDraft } = useBookingStore();
  const theme = getTheme(highContrast);

  useEffect(() => {
    // Clear the booking draft state only after Booking Confirmed is mounted
    resetDraft();

    // Intercept hardware back button on Android
    const onBackPress = () => {
      navigation.navigate('MainTabs', { screen: 'Home' });
      return true; // prevent default behavior
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // Intercept navigation gestures/header back
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'GO_BACK') {
        // Prevent default behavior of leaving the screen
        e.preventDefault();
        // Go to Home
        navigation.navigate('MainTabs', { screen: 'Home' });
      }
    });

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      unsubscribe();
    };
  }, [navigation, resetDraft]);

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.centerContainer}>
        {/* Glow checkmark header */}
        <View style={[styles.successGlow, { backgroundColor: theme.success + '15' }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.success }]}>
            <Ionicons name="checkmark-sharp" size={44} color="#FFFFFF" />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(26, fontScale) }]}>
          Booking Confirmed!
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: scaledFont(15, fontScale) }]}>
          Your service booking has been created successfully. The chosen professional has been notified.
        </Text>

        {/* Confirmation Details Card */}
        <Card style={[styles.detailsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>BOOKING ID</Text>
            <Text style={[styles.detailVal, { color: theme.text }]}>{bookingId}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>STATUS</Text>
            <View style={[styles.statusBadge, { backgroundColor: theme.customerAccentSoft }]}>
              <Text style={[styles.statusText, { color: theme.customerAccent }]}>PENDING CONFIRMATION</Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionsWrapper}>
          <AppButton
            label="Track Live Status"
            onPress={() => navigation.replace('BookingStatus', { bookingId })}
          />
          <Pressable
            style={styles.backHomeBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            accessibilityRole="button"
            accessibilityLabel="Go back to home screen"
          >
            <Text style={[styles.backHomeText, { color: theme.customerAccent, fontSize: scaledFont(15, fontScale) }]}>
              Go back to Home
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  successGlow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: { fontWeight: '900', textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.sm, marginBottom: spacing.xl },
  detailsCard: { borderWidth: 1, padding: spacing.md, width: '100%', borderRadius: radii.lg, marginBottom: spacing.xxl },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  detailLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  detailVal: { fontWeight: '700', fontSize: 13 },
  detailDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: spacing.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm },
  statusText: { fontSize: 10, fontWeight: '800' },
  actionsWrapper: { width: '100%', gap: spacing.sm },
  backHomeBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  backHomeText: { fontWeight: '700' },
});
