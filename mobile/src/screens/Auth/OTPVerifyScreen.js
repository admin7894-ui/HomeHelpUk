import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import AppButton from '../../components/AppButton';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function OTPVerifyScreen() {
  const { highContrast, fontScale } = useAppStore();
  const { user, updateUser, logout } = useAuthStore();
  const theme = getTheme(highContrast);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Shift focus forward
    if (text && index < 5) {
      refs[index + 1].current.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      refs[index - 1].current.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert('Incomplete code', 'Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    // Simulate verification
    setTimeout(async () => {
      setLoading(false);
      if (code === '123456' || code === '000000' || code.startsWith('1')) {
        try {
          await updateUser({ verifiedPhone: true });
        } catch (err) {
          Alert.alert('Verification failed', err.message);
        }
      } else {
        Alert.alert('Invalid code', 'Please enter the code shown in the demo instructions (e.g. 123456).');
      }
    }, 1000);
  };

  return (
    <ScreenContainer>
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>Verify your phone</Text>
        <Text style={{ color: theme.textMuted, fontSize: scaledFont(15, fontScale) }}>
          We've sent a 6-digit code to {user?.phone || 'your phone'}.
        </Text>
      </View>

      <View style={styles.otpRow}>
        {otp.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={refs[idx]}
            style={[
              styles.otpInput,
              {
                borderColor: theme.border,
                color: theme.text,
                backgroundColor: theme.surface,
                fontSize: scaledFont(20, fontScale),
              },
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, idx)}
            onKeyPress={(e) => handleKeyPress(e, idx)}
            accessibilityLabel={`Digit ${idx + 1}`}
          />
        ))}
      </View>

      <AppButton label="Verify & Continue" onPress={handleVerify} loading={loading} style={{ marginTop: spacing.lg }} />

      <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: spacing.md, fontSize: scaledFont(13, fontScale) }}>
        Demo code: 123456
      </Text>

      <Pressable onPress={() => logout()} style={{ marginTop: spacing.xl }}>
        <Text style={{ color: theme.danger, textAlign: 'center', fontWeight: '700' }}>Cancel and Log Out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.xs },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.md, gap: spacing.xs },
  otpInput: {
    width: 44,
    height: 52,
    borderWidth: 2,
    borderRadius: radii.sm,
    textAlign: 'center',
    fontWeight: '800',
  },
});
