import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import ScreenContainer from '../../components/ScreenContainer';
import AppButton from '../../components/AppButton';
import { useAppStore } from '../../store/appStore';
import { getTheme, scaledFont, spacing, radii, fontScales } from '../../utils/theme';

const SCALE_STEPS = ['small', 'default', 'large', 'extraLarge'];
const SCALE_LABELS = { small: 'Small', default: 'Default', large: 'Large', extraLarge: 'Extra Large' };

export default function OnboardingScreen({ navigation }) {
  const { highContrast, toggleHighContrast, fontScale, setFontScale, voiceAssistanceEnabled, toggleVoiceAssistance } =
    useAppStore();
  const theme = getTheme(highContrast);
  const sliderValue = SCALE_STEPS.indexOf(fontScale);
  const [showAccessibility, setShowAccessibility] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: '#0A3925' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Row with Accessibility Button */}
        <View style={styles.topHeader}>
          <View style={styles.brandBadge}>
            <Ionicons name="home" size={18} color="#0A3925" />
            <Text style={styles.brandName}>HomeHelpUK</Text>
          </View>
          <Pressable
            onPress={() => setShowAccessibility(true)}
            style={styles.accessibilityBtn}
            accessibilityRole="button"
            accessibilityLabel="Accessibility Settings"
          >
            <Ionicons name="accessibility-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Floating Callout Cards Stack (Matching Reference Screen 1) */}
        <View style={styles.cardsStack}>
          {/* Card 1: Top Hero Heading */}
          <View style={[styles.heroCard, styles.cardShadow]}>
            <Ionicons name="sparkles" size={20} color="#EAB308" style={{ marginBottom: 8 }} />
            <Text style={[styles.heroHeading, { fontSize: scaledFont(22, fontScale) }]}>
              Book Top-Rated Home Services in Minutes.
            </Text>
          </View>

          {/* Card 2: Right Description Callout */}
          <View style={[styles.descCard, styles.cardShadow]}>
            <View style={styles.iconCircleBadge}>
              <Ionicons name="construct-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.descText}>
              From cleaning to repairs, find the perfect expert and book hassle-free home services today.
            </Text>
          </View>

          {/* Card 3: Bottom Image Callout */}
          <View style={[styles.imageCard, styles.cardShadow]}>
            <View style={styles.imageCardContent}>
              <Ionicons name="sparkles" size={18} color="#EAB308" style={{ marginBottom: 6 }} />
              <Text style={styles.imageCardTitle}>Find Trusted Professionals</Text>
              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            </View>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80' }}
              style={styles.proImage}
            />
          </View>
        </View>

        {/* Bottom CTA Area */}
        <View style={styles.bottomCtaSection}>
          <Pressable
            onPress={() => navigation.replace('Login')}
            style={styles.mainStartBtn}
            accessibilityRole="button"
            accessibilityLabel="Let's Get Started"
          >
            <Text style={styles.mainStartBtnText}>Let's Get Started</Text>
          </Pressable>

          <View style={styles.signInRow}>
            <Text style={styles.alreadyText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.replace('Login')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Accessibility Settings Modal */}
      <Modal visible={showAccessibility} animationType="slide" transparent={true} onRequestClose={() => setShowAccessibility(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Accessibility Settings</Text>
              <Pressable onPress={() => setShowAccessibility(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Text size: {SCALE_LABELS[fontScale]}</Text>
            <Slider
              minimumValue={0}
              maximumValue={3}
              step={1}
              value={sliderValue}
              onValueChange={(val) => setFontScale(SCALE_STEPS[val])}
              minimumTrackTintColor={theme.customerAccent}
              style={{ marginBottom: spacing.md }}
            />

            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: theme.text }]}>High-contrast theme</Text>
              <Switch value={highContrast} onValueChange={toggleHighContrast} trackColor={{ true: theme.customerAccent }} />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: theme.text }]}>Enable voice assistance</Text>
              <Switch value={voiceAssistanceEnabled} onValueChange={toggleVoiceAssistance} trackColor={{ true: theme.customerAccent }} />
            </View>

            <AppButton label="Done" onPress={() => setShowAccessibility(false)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 40, flexGrow: 1, justifyContent: 'space-between' },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 6,
  },
  brandName: { color: '#0A3925', fontWeight: '800', fontSize: 13 },
  accessibilityBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsStack: { marginVertical: 30, gap: 16 },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '78%',
    transform: [{ rotate: '-2deg' }],
  },
  heroHeading: {
    color: '#0A3925',
    fontWeight: '900',
    lineHeight: 30,
  },
  descCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 18,
    alignSelf: 'flex-end',
    width: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconCircleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  descText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    height: 140,
    width: '88%',
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  imageCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  imageCardTitle: {
    color: '#0A3925',
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 20,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A3925',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proImage: {
    width: 120,
    height: '100%',
    resizeMode: 'cover',
  },
  bottomCtaSection: { marginTop: 20, gap: 16 },
  mainStartBtn: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  mainStartBtnText: {
    color: '#0A3925',
    fontWeight: '800',
    fontSize: 16,
  },
  signInRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  alreadyText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, fontWeight: '500' },
  signInLink: { color: '#EAB308', fontWeight: '800', fontSize: 14, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { padding: 20, borderRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontWeight: '800', fontSize: 18 },
  label: { fontWeight: '700', marginBottom: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
});
