import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import api from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function JobExecutionScreen({ route, navigation }) {
  const { booking } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);

  // States
  const [status, setStatus] = useState(booking.status);
  const [startOtp, setStartOtp] = useState('');
  const [completionOtp, setCompletionOtp] = useState('');
  
  const [beforePhoto, setBeforePhoto] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const handleArrived = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch(`/bookings/${booking.id}/status`, { status: 'en_route' });
      setStatus('en_route');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStart = async () => {
    if (!startOtp || startOtp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit start code provided by the customer.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.patch(`/bookings/${booking.id}/status`, { status: 'in_progress', startOtp });
      setStatus('in_progress');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!completionOtp || completionOtp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit completion code provided by the customer.');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/bookings/${booking.id}/status`, {
        status: 'completed',
        completionOtp: completionOtp,
        photos: {
          before: ['before_clean.jpg'],
          after: ['after_clean.jpg']
        }
      });
      Alert.alert('Job Completed!', 'Payment has been released to your wallet.', [
        { text: 'View Wallet', onPress: () => navigation.navigate('Earnings') },
        { text: 'OK', onPress: () => navigation.popToTop() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>
          Execute Job
        </Text>
      </View>

      {/* State Machine Stepper */}
      <View style={styles.stepperContainer}>
        {/* Step 1: En Route */}
        <View style={styles.stepRow}>
          <View style={[styles.stepCircle, { backgroundColor: (status === 'assigned') ? theme.providerAccent : theme.success }]}>
            {status !== 'assigned' ? (
              <Ionicons name="checkmark" size={16} color={theme.primaryButtonText} />
            ) : (
              <Text style={{ color: theme.primaryButtonText, fontWeight: '700' }}>1</Text>
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Heading Over</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Navigate to client and tap Arrived</Text>
            {status === 'assigned' && (
              <AppButton label="I Have Arrived" onPress={handleArrived} loading={loading} style={{ marginTop: spacing.sm }} />
            )}
          </View>
        </View>

        {/* Step 2: Start OTP */}
        <View style={styles.stepRow}>
          <View style={[styles.stepCircle, { backgroundColor: (status === 'assigned' || status === 'en_route') ? theme.border : (status === 'in_progress' || status === 'completed') ? theme.success : theme.providerAccent }]}>
            {status === 'in_progress' || status === 'completed' ? (
              <Ionicons name="checkmark" size={16} color={theme.primaryButtonText} />
            ) : (
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>2</Text>
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Start Verification Code</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Ask customer for start OTP</Text>
            {status === 'en_route' && (
              <View style={{ marginTop: spacing.sm }}>
                <AccessibleTextInput
                  placeholder="Enter 4-digit code"
                  value={startOtp}
                  onChangeText={setStartOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <AppButton label="Verify & Start" onPress={handleVerifyStart} loading={loading} />
              </View>
            )}
          </View>
        </View>

        {/* Step 3: Before/After Photo & Work */}
        <View style={styles.stepRow}>
          <View style={[styles.stepCircle, { backgroundColor: (status === 'completed') ? theme.success : (status === 'in_progress') ? theme.providerAccent : theme.border }]}>
            {status === 'completed' ? (
              <Ionicons name="checkmark" size={16} color={theme.primaryButtonText} />
            ) : (
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>3</Text>
            )}
          </View>
          <View style={styles.stepContent}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Proof of Work Photos</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Upload photos before and after service</Text>
            {status === 'in_progress' && (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <Pressable
                  onPress={() => setBeforePhoto(true)}
                  style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <Ionicons name="camera" size={24} color={theme.providerAccent} />
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: 8 }}>
                    {beforePhoto ? '✓ before_site.jpg' : 'Upload Before Photo'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAfterPhoto(true)}
                  style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <Ionicons name="camera" size={24} color={theme.providerAccent} />
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: 8 }}>
                    {afterPhoto ? '✓ completed_site.jpg' : 'Upload After Photo'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Step 4: Completion Verification */}
        <View style={[styles.stepRow, { borderLeftWidth: 0 }]}>
          <View style={[styles.stepCircle, { backgroundColor: (status === 'completed') ? theme.success : theme.border }]}>
            <Text style={{ color: theme.textMuted, fontWeight: '700' }}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Completion Code</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Ask customer for completion OTP</Text>
            {status === 'in_progress' && beforePhoto && afterPhoto && (
              <View style={{ marginTop: spacing.sm }}>
                <AccessibleTextInput
                  placeholder="Enter 4-digit completion code"
                  value={completionOtp}
                  onChangeText={setCompletionOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <AppButton label="Complete Job" onPress={handleCompleteJob} loading={loading} />
              </View>
            )}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontWeight: '900' },
  stepperContainer: { paddingLeft: spacing.sm, marginTop: spacing.sm },
  stepRow: { flexDirection: 'row', borderLeftWidth: 2, borderLeftColor: '#E2E8F0', paddingBottom: spacing.lg, paddingLeft: spacing.md },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'absolute', left: -15, top: 0 },
  stepContent: { flex: 1, paddingLeft: spacing.xs },
  uploadBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.sm, padding: spacing.sm, justifyContent: 'center' },
});
