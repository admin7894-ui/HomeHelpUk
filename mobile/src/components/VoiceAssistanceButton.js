import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useAppStore } from '../store/appStore';
import { getTheme, radii } from '../utils/theme';

// POC-level voice assistance: reads the given text aloud on demand using
// expo-speech. Only rendered when the user has enabled voice assistance in
// Accessibility settings. Full voice navigation is a post-POC feature.
export default function VoiceAssistanceButton({ textToRead, accent = 'customer' }) {
  const { highContrast, voiceAssistanceEnabled } = useAppStore();
  const theme = getTheme(highContrast);

  if (!voiceAssistanceEnabled) return null;

  const accentColor = accent === 'provider' ? theme.providerAccent : theme.customerAccent;

  const speak = () => {
    Speech.stop();
    Speech.speak(textToRead, { language: 'en-GB' });
  };

  return (
    <Pressable
      onPress={speak}
      accessibilityRole="button"
      accessibilityLabel="Read screen content aloud"
      style={[styles.button, { backgroundColor: accentColor }]}
    >
      <Ionicons name="volume-high" size={22} color={theme.primaryButtonText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
