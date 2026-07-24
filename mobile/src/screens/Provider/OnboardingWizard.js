import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import ScreenContainer from '../../components/ScreenContainer';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii, layout } from '../../utils/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OnboardingWizard() {
  const { highContrast, fontScale } = useAppStore();
  const { user, updateUser, logout } = useAuthStore();
  const { categories, fetchCategories } = useBookingStore();
  const theme = getTheme(highContrast);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('English');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radius, setRadius] = useState(10);
  
  const [selectedCats, setSelectedCats] = useState([]);
  const [servicesConfig, setServicesConfig] = useState({});
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false
  });

  const [idUploaded, setIdUploaded] = useState(false);
  const [dbsUploaded, setDbsUploaded] = useState(false);

  const [holderName, setHolderName] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNo, setAccountNo] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleNext = () => {
    if (step === 1 && !bio) {
      Alert.alert('Missing details', 'Please write a brief bio about yourself.');
      return;
    }
    if (step === 2 && (!address || !postcode)) {
      Alert.alert('Missing details', 'Please enter your trading address and postcode.');
      return;
    }
    if (step === 3 && selectedCats.length === 0) {
      Alert.alert('Missing details', 'Please select at least one service category.');
      return;
    }
    if (step === 5 && (!idUploaded || !dbsUploaded)) {
      Alert.alert('Missing compliance', 'Please upload both your ID and DBS certificate photos.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    setStep((s) => s - 1);
  };

  const toggleCategory = (catId) => {
    if (selectedCats.includes(catId)) {
      setSelectedCats(selectedCats.filter((id) => id !== catId));
    } else {
      setSelectedCats([...selectedCats, catId]);
    }
  };

  const handleComplete = async () => {
    if (!holderName || !sortCode || !accountNo) {
      Alert.alert('Missing details', 'Please enter your bank account details for payouts.');
      return;
    }

    setLoading(true);

    // Format selected services
    const servicesList = [];
    selectedCats.forEach((catId) => {
      const cat = categories.find((c) => c.id === catId);
      if (cat && cat.subcategories) {
        cat.subcategories.forEach((sub) => {
          if (sub.services) {
            sub.services.forEach((s) => {
              servicesList.push({
                serviceId: s.id,
                customPrice: s.price,
                enabled: true
              });
            });
          }
        });
      }
    });

    try {
      // 1. Update the provider record in providers.json
      if (user?.providerId) {
        await api.patch(`/providers/${user.providerId}`, {
          bio,
          categories: selectedCats,
          services: servicesList,
          postcode,
          serviceRadiusMiles: radius,
          availability: {
            weekly: DAYS.reduce((acc, day) => {
              acc[day] = weeklyAvailability[day] ? ["08:00-12:00", "13:00-17:00"] : [];
              return acc;
            }, {}),
            holidays: [],
            vacationMode: false,
            emergencyUnavailable: false
          },
          documents: {
            idType: 'Passport',
            idUrl: '/uploads/documents/id_mock.jpg',
            dbsCertificateUrl: '/uploads/documents/dbs_mock.jpg',
            dbsStatus: 'approved'
          },
          bankDetails: {
            accountHolder: holderName,
            sortCode,
            accountNumber: accountNo
          },
          verified: true
        });
      }

      // 2. Update the user onboarding Complete flag
      await api.patch(`/profile/${user.id}`, {
        onboardingComplete: true
      });

      // 3. Sync auth state in store
      await updateUser({ onboardingComplete: true });

    } catch (err) {
      Alert.alert('Submission failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = step / 6;

  return (
    <ScreenContainer scroll={step !== 3}>
      {/* Header & Step progress */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>
          Provider Onboarding
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: scaledFont(13, fontScale) }}>
          Step {step} of 6
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: theme.providerAccent }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <Card>
            <SectionTitle>Step 1: Bio & Details</SectionTitle>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              Introduce yourself to clients. Let them know your background and experience.
            </Text>
            <AccessibleTextInput
              label="Bio"
              placeholder="E.g., 5 years of professional deep cleaning experience..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
            />
            <AccessibleTextInput
              label="Languages spoken"
              placeholder="E.g., English, Polish"
              value={languages}
              onChangeText={setLanguages}
            />
          </Card>
        )}

        {step === 2 && (
          <Card>
            <SectionTitle>Step 2: Service Locations</SectionTitle>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              Define where you trade. Enter your address and the radius you are willing to travel.
            </Text>
            <AccessibleTextInput
              label="Trading Address"
              placeholder="12 Main Street, London"
              value={address}
              onChangeText={setAddress}
            />
            <AccessibleTextInput
              label="Trading Postcode"
              placeholder="NW1 6XE"
              value={postcode}
              onChangeText={setPostcode}
              autoCapitalize="characters"
            />
            <Text style={[styles.label, { color: theme.text, marginTop: spacing.md }]}>
              Operating Radius: {radius} miles
            </Text>
            <Slider
              minimumValue={5}
              maximumValue={50}
              step={5}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={theme.providerAccent}
            />
          </Card>
        )}

        {step === 3 && (
          <View style={{ gap: spacing.md }}>
            <Card>
              <SectionTitle>Step 3: Service Selection</SectionTitle>
              <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
                Select categories you provide. All individual services inside will be added to your profile.
              </Text>
              {categories.map((cat) => {
                const selected = selectedCats.includes(cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => toggleCategory(cat.id)}
                    style={[
                      styles.categoryCard,
                      {
                        borderColor: theme.border,
                        backgroundColor: selected ? theme.providerAccentSoft : theme.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>{cat.name}</Text>
                    {selected && <Text style={{ color: theme.providerAccent, fontWeight: '900' }}>✓ Selected</Text>}
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}

        {step === 4 && (
          <Card>
            <SectionTitle>Step 4: Availability Schedule</SectionTitle>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              Select the days you are available to accept bookings.
            </Text>
            {DAYS.map((day) => (
              <View key={day} style={styles.switchRow}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{day}</Text>
                <Switch
                  value={weeklyAvailability[day]}
                  onValueChange={(val) => setWeeklyAvailability({ ...weeklyAvailability, [day]: val })}
                  trackColor={{ true: theme.providerAccent }}
                />
              </View>
            ))}
          </Card>
        )}

        {step === 5 && (
          <Card>
            <SectionTitle>Step 5: Background Verification</SectionTitle>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              We require a valid ID and a DBS check to activate your listing.
            </Text>
            
            <View style={styles.documentBox}>
              <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>Identity Document (Passport/Driving License)</Text>
              <Switch
                value={idUploaded}
                onValueChange={setIdUploaded}
                trackColor={{ true: theme.providerAccent }}
              />
            </View>
            <Text style={styles.docStatus}>{idUploaded ? '✓ id_verified.jpg uploaded' : 'Upload photo ID'}</Text>

            <View style={[styles.documentBox, { marginTop: spacing.md }]}>
              <Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>DBS Background Certificate</Text>
              <Switch
                value={dbsUploaded}
                onValueChange={dbsUploaded => setDbsUploaded(dbsUploaded)}
                trackColor={{ true: theme.providerAccent }}
              />
            </View>
            <Text style={styles.docStatus}>{dbsUploaded ? '✓ dbs_certificate.jpg uploaded' : 'Upload DBS document'}</Text>
          </Card>
        )}

        {step === 6 && (
          <Card>
            <SectionTitle>Step 6: Payout Bank Account</SectionTitle>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              Enter bank details where payouts will be transferred automatically.
            </Text>
            <AccessibleTextInput
              label="Account Holder Name"
              placeholder="Aisha Khan"
              value={holderName}
              onChangeText={setHolderName}
            />
            <AccessibleTextInput
              label="UK Sort Code"
              placeholder="12-34-56"
              value={sortCode}
              onChangeText={setSortCode}
            />
            <AccessibleTextInput
              label="Account Number"
              placeholder="12345678"
              value={accountNo}
              onChangeText={setAccountNo}
              keyboardType="number-pad"
            />
          </Card>
        )}

        <View style={styles.navRow}>
          {step > 1 && (
            <AppButton
              label="Back"
              variant="outline"
              accent="provider"
              onPress={handlePrev}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
          )}
          {step < 6 ? (
            <AppButton label="Next" accent="provider" onPress={handleNext} style={{ flex: 1 }} />
          ) : (
            <AppButton label="Complete Onboarding" accent="provider" onPress={handleComplete} loading={loading} style={{ flex: 1 }} />
          )}
        </View>

        <Pressable onPress={() => logout()} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: theme.danger, textAlign: 'center', fontWeight: '700' }}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  title: { fontWeight: '900' },
  progressBarBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: radii.pill, marginTop: spacing.sm },
  progressBar: { height: 6, borderRadius: radii.pill },
  label: { fontWeight: '700' },
  navRow: { flexDirection: 'row', marginTop: spacing.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  categoryCard: { flexDirection: 'row', padding: spacing.md, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm, alignItems: 'center' },
  documentBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docStatus: { color: '#64748B', fontSize: 12, marginTop: 4 },
});
