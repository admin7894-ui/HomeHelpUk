import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

const SAVED_ADDRESSES = [
  { id: 'addr_1', type: 'Home', address: '10 Downing St, Westminster', postcode: 'SW1A 2AA' },
  { id: 'addr_2', type: 'Work', address: '1 Canada Square, Canary Wharf', postcode: 'E14 5AB' },
];

export default function BookAddressScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { draft, setDraft } = useBookingStore();
  const theme = getTheme(highContrast);

  const [selectedSavedId, setSelectedSavedId] = useState(SAVED_ADDRESSES[0].id);

  // Custom address fields
  const [customAddress, setCustomAddress] = useState('');
  const [customPostcode, setCustomPostcode] = useState('');
  const [notes, setNotes] = useState(draft.notes || '');

  const [useCustom, setUseCustom] = useState(false);

  const handleNext = () => {
    let finalAddress = '';
    let finalPostcode = '';

    if (useCustom) {
      if (!customAddress || !customPostcode) {
        alert('Please fill out custom address details.');
        return;
      }
      finalAddress = customAddress;
      finalPostcode = customPostcode.toUpperCase();
    } else {
      const active = SAVED_ADDRESSES.find((a) => a.id === selectedSavedId);
      finalAddress = active.address;
      finalPostcode = active.postcode;
    }

    setDraft({
      address: `${finalAddress}, ${finalPostcode}`,
      postcode: finalPostcode,
      notes,
    });

    navigation.navigate('BookProvider');
  };

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
          Select Address
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Step Indicator */}
        <View style={styles.progressRow}>
          <Text style={[styles.stepLabel, { color: theme.customerAccent }]}>Step 2 of 4: Address</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: theme.customerAccent, width: '50%' }]} />
          </View>
        </View>

        {/* Saved Addresses Options */}
        {!useCustom ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
              Saved Addresses
            </Text>
            <View style={styles.addressList}>
              {SAVED_ADDRESSES.map((item) => {
                const isSelected = selectedSavedId === item.id;
                return (
                  <Pressable key={item.id} onPress={() => setSelectedSavedId(item.id)}>
                    <Card
                      style={[
                        styles.addressCard,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        isSelected && { borderColor: theme.customerAccent, backgroundColor: theme.customerAccentSoft },
                      ]}
                    >
                      <View style={styles.addressRow}>
                        <Ionicons
                          name={item.type === 'Home' ? 'home' : 'business'}
                          size={22}
                          color={isSelected ? theme.customerAccent : theme.textMuted}
                          style={styles.addressIcon}
                        />
                        <View style={styles.addressText}>
                          <Text style={[styles.addressType, { color: theme.text }]}>{item.type}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 13 }}>{item.address}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '700' }}>{item.postcode}</Text>
                        </View>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={isSelected ? theme.customerAccent : theme.textMuted}
                        />
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.toggleTextBtn} onPress={() => setUseCustom(true)}>
              <Text style={{ color: theme.customerAccent, fontWeight: '700' }}>+ Use a new address</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
              New Address
            </Text>
            <Card style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AccessibleTextInput
                label="Street Address"
                value={customAddress}
                onChangeText={setCustomAddress}
                placeholder="e.g. 24 Piccadilly"
              />
              <AccessibleTextInput
                label="Postcode"
                value={customPostcode}
                onChangeText={setCustomPostcode}
                placeholder="e.g. W1J 7ND"
                autoCapitalize="characters"
              />
            </Card>

            <Pressable style={styles.toggleTextBtn} onPress={() => setUseCustom(false)}>
              <Text style={{ color: theme.customerAccent, fontWeight: '700' }}>Back to saved addresses</Text>
            </Pressable>
          </View>
        )}

        {/* Instructions / Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
            Instructions / Notes for Professional
          </Text>
          <Card style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <AccessibleTextInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Parking space available, key is under the mat, etc."
              multiline
              numberOfLines={3}
            />
          </Card>
        </View>

        <View style={styles.actionRow}>
          <AppButton label="Continue to Choose Provider" onPress={handleNext} />
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
  section: { marginTop: spacing.md },
  sectionTitle: { fontWeight: '800', marginBottom: spacing.sm },
  addressList: { gap: spacing.sm },
  addressCard: { borderWidth: 1, padding: spacing.md, borderRadius: radii.md },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressIcon: { marginRight: spacing.sm },
  addressText: { flex: 1 },
  addressType: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
  toggleTextBtn: { paddingVertical: spacing.sm, alignSelf: 'flex-start', marginTop: spacing.xs },
  formCard: { borderWidth: 1, padding: spacing.md, borderRadius: radii.md },
  actionRow: { marginTop: spacing.xl },
});
