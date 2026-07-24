import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleManagerScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const theme = getTheme(highContrast);

  const [weeklyAvailability, setWeeklyAvailability] = useState({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false
  });
  const [vacationMode, setVacationMode] = useState(false);
  const [emergencyUnavailable, setEmergencyUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.providerId) {
      api.get(`/providers/${user.providerId}`).then(({ data }) => {
        const p = data.provider;
        if (p.availability) {
          const avail = {};
          DAYS.forEach((day) => {
            avail[day] = p.availability.weekly && p.availability.weekly[day]?.length > 0;
          });
          setWeeklyAvailability(avail);
          setVacationMode(p.availability.vacationMode || false);
          setEmergencyUnavailable(p.availability.emergencyUnavailable || false);
        }
      });
    }
  }, [user]);

  const toggleDay = (day) => {
    setWeeklyAvailability({
      ...weeklyAvailability,
      [day]: !weeklyAvailability[day],
    });
  };

  const handleSave = async () => {
    if (!user?.providerId) {
      Alert.alert('Error', 'Provider ID not associated. Please restart the app or re-login.');
      return;
    }
    setSaving(true);
    // Format payload
    const formattedWeekly = {};
    DAYS.forEach((day) => {
      formattedWeekly[day] = weeklyAvailability[day] ? ["08:00-12:00", "13:00-17:00"] : [];
    });

    try {
      await api.patch(`/providers/${user.providerId}`, {
        availability: {
          weekly: formattedWeekly,
          vacationMode,
          emergencyUnavailable,
          holidays: []
        }
      });
      Alert.alert('Success', 'Availability schedule updated.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>
          Manage Schedule
        </Text>
      </View>

      <Text style={{ color: theme.textMuted, marginBottom: spacing.md, fontSize: scaledFont(14, fontScale) }}>
        Define your weekly shift slots and vacation configurations.
      </Text>

      {/* Control Modes */}
      <Card style={styles.card}>
        <SectionTitle>Status Modes</SectionTitle>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Vacation Mode</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Temporarily disable instant bookings</Text>
          </View>
          <Switch
            value={vacationMode}
            onValueChange={setVacationMode}
            trackColor={{ true: theme.providerAccent }}
          />
        </View>

        <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Emergency Unavailable</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Set status out-of-service immediately</Text>
          </View>
          <Switch
            value={emergencyUnavailable}
            onValueChange={setEmergencyUnavailable}
            trackColor={{ true: theme.danger }}
          />
        </View>
      </Card>

      {/* Default Schedule */}
      <Card style={styles.card}>
        <SectionTitle>Weekly Working Days</SectionTitle>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
          Toggle days you can work. Checked days include default shifts (08:00-12:00, 13:00-17:00).
        </Text>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayRow}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{day}</Text>
            <Switch
              value={weeklyAvailability[day]}
              onValueChange={() => toggleDay(day)}
              trackColor={{ true: theme.providerAccent }}
            />
          </View>
        ))}
      </Card>

      <AppButton label="Save Schedule" onPress={handleSave} loading={saving} style={{ marginTop: spacing.md }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontWeight: '900' },
  card: { padding: spacing.md, marginBottom: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
});
