import React from 'react';
import { View, Text, StyleSheet, Image, Switch, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import AppButton from '../../components/AppButton';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getTheme, scaledFont, spacing, fontScales, radii } from '../../utils/theme';

const SCALE_STEPS = ['small', 'default', 'large', 'extraLarge'];
const SCALE_LABELS = { small: 'Small', default: 'Default', large: 'Large', extraLarge: 'Extra Large' };

export default function ProfileScreen({ navigation }) {
  const { user, activeMode, logout } = useAuthStore();
  const { highContrast, toggleHighContrast, fontScale, setFontScale, voiceAssistanceEnabled, toggleVoiceAssistance } =
    useAppStore();
  const theme = getTheme(highContrast);
  const accent = activeMode === 'provider' ? theme.providerAccent : theme.customerAccent;
  const sliderValue = SCALE_STEPS.indexOf(fontScale);

  // Removed confirmSwitch

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>
        Your Profile
      </Text>

      {/* User Info Header */}
      <Card style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Image
          source={{ uri: user?.avatar || `https://i.pravatar.cc/150?u=${user?.email}` }}
          style={styles.avatar}
          accessibilityLabel={`${user?.name}'s profile photo`}
        />
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: theme.text, fontSize: scaledFont(20, fontScale) }]}>
            {user?.name || 'Jane Doe'}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: scaledFont(14, fontScale) }}>
            {user?.email || 'jane@example.com'}
          </Text>
          {user?.phone ? <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>{user.phone}</Text> : null}
        </View>
      </Card>

      {/* Removed Mode Switch Card */}

      {/* Accessibility Controls */}
      <Card style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <SectionTitle>Accessibility Settings</SectionTitle>

        <View style={styles.settingSpacing}>
          <Text style={[styles.label, { color: theme.text, fontSize: scaledFont(14, fontScale) }]}>
            Text Size Selection
          </Text>
          <Slider
            accessibilityLabel="Text size slider"
            minimumValue={0}
            maximumValue={3}
            step={1}
            value={sliderValue}
            onValueChange={(val) => setFontScale(SCALE_STEPS[val])}
            minimumTrackTintColor={accent}
          />
          <Text style={{ color: theme.textMuted, fontSize: scaledFont(13, fontScale), fontWeight: '700' }}>
            {SCALE_LABELS[fontScale]} ({fontScales[fontScale]}x)
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.text, fontSize: scaledFont(14, fontScale) }]}>
              High Contrast Theme
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Enhances visibility and color contrast</Text>
          </View>
          <Switch
            value={highContrast}
            onValueChange={toggleHighContrast}
            trackColor={{ true: accent }}
            accessibilityLabel="Toggle high contrast theme"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.text, fontSize: scaledFont(14, fontScale) }]}>
              Voice Assistance
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Reads screen options out loud</Text>
          </View>
          <Switch
            value={voiceAssistanceEnabled}
            onValueChange={toggleVoiceAssistance}
            trackColor={{ true: accent }}
            accessibilityLabel="Toggle voice assistance"
          />
        </View>
      </Card>

      {/* Notifications Quick Link */}
      <Card style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <SectionTitle>Activity & Updates</SectionTitle>
        <AppButton
          label="View Notifications Inbox"
          variant="secondary"
          accent={activeMode}
          onPress={() => navigation.navigate('Notifications')}
        />
        {activeMode === 'provider' && (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            <AppButton
              label="Manage Services & Pricing"
              variant="secondary"
              accent="provider"
              onPress={() => navigation.navigate('ServiceManager')}
            />
            <AppButton
              label="Manage Working Schedule"
              variant="secondary"
              accent="provider"
              onPress={() => navigation.navigate('ScheduleManager')}
            />
            <AppButton
              label="View Reviews Received"
              variant="secondary"
              accent="provider"
              onPress={() => navigation.navigate('ReviewsReceived')}
            />
          </View>
        )}
      </Card>

      {/* Log Out */}
      <View style={styles.logoutWrapper}>
        <AppButton label="Log Out" variant="danger" onPress={() => logout()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '900', marginBottom: spacing.md },
  headerCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  avatar: { width: 66, height: 66, borderRadius: 33 },
  headerText: { marginLeft: spacing.md, flex: 1 },
  name: { fontWeight: '800' },
  itemCard: { borderWidth: 1, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  label: { fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { flex: 1, marginRight: spacing.sm },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: spacing.md },
  settingSpacing: { gap: 4 },
  settingSpacing: { gap: 4 },
  logoutWrapper: { marginTop: spacing.md, paddingBottom: spacing.xl },
});
