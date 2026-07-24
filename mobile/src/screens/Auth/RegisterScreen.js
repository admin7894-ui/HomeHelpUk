import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function RegisterScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);
  const login = useAuthStore((s) => s.login);

  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing details', 'Please fill in name, email, and password.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, phone, role });
      await login(data.user, data.token);
    } catch (err) {
      Alert.alert('Registration failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(26, fontScale) }]}>Create your account</Text>
      </View>

      <View style={styles.roleRow}>
        {['customer', 'provider'].map((r) => (
          <Pressable
            key={r}
            accessibilityRole="radio"
            accessibilityState={{ checked: role === r }}
            accessibilityLabel={`Sign up as ${r}`}
            onPress={() => setRole(r)}
            style={[
              styles.roleOption,
              {
                backgroundColor: role === r ? theme.customerAccent : theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={{ color: role === r ? theme.primaryButtonText : theme.text, fontWeight: '700' }}>
              {r === 'customer' ? 'Customer' : 'Service Provider'}
            </Text>
          </Pressable>
        ))}
      </View>

      <AccessibleTextInput label="Full name" value={name} onChangeText={setName} placeholder="Jane Smith" />
      <AccessibleTextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AccessibleTextInput label="Phone (UK)" value={phone} onChangeText={setPhone} placeholder="+44 7700 900000" keyboardType="phone-pad" />
      <AccessibleTextInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

      <AppButton label="Create Account" onPress={handleRegister} loading={loading} />

      <Text
        onPress={() => navigation.navigate('Login')}
        accessibilityRole="link"
        style={{ color: theme.customerAccent, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' }}
      >
        Already have an account? Log in
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.xs },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
