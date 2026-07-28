import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getTheme, scaledFont, spacing } from '../../utils/theme';

export default function LoginScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('ritesh@gmail.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return; // Prevent double submission
    if (!email || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const t0 = Date.now();
    try {
      console.log('[PERF] Login API request initiated');
      const { data } = await api.post('/auth/login', { email, password });
      const t1 = Date.now();
      console.log(`[PERF] Login API response received: ${t1 - t0}ms`);
      
      await login(data.user, data.token);
      const { registerForPushNotificationsAsync } = require('../../services/notifications');
      registerForPushNotificationsAsync();
      const t2 = Date.now();
      console.log(`[PERF] Session stored & state updated: ${t2 - t1}ms (Total Login Flow: ${t2 - t0}ms)`);
    } catch (err) {
      Alert.alert('Login failed', err.message);
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(26, fontScale) }]}>Welcome back</Text>
        <Text style={{ color: theme.textMuted, fontSize: scaledFont(15, fontScale) }}>
          Log in to book a service or manage your jobs.
        </Text>
      </View>

      <AccessibleTextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <AccessibleTextInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry editable={!loading} />

      <AppButton label={loading ? 'Signing in...' : 'Log In'} onPress={handleLogin} loading={loading} disabled={loading} />

      <Text
        onPress={() => navigation.navigate('Register')}
        accessibilityRole="link"
        style={{ color: theme.customerAccent, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' }}
      >
        New here? Create an account
      </Text>

      <View style={{ marginTop: spacing.xl, padding: spacing.md, borderRadius: 16, backgroundColor: theme.surface }}>
        <Text style={{ color: theme.textMuted, fontSize: scaledFont(13, fontScale) }}>
          Demo accounts — Customer: ritesh@gmail.com · Provider: sanskar@gmail.com (password: password123)
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.xs },
});
