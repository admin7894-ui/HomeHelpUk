import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Accessibility + app-wide UI preferences. Persisted so settings survive restarts.
export const useAppStore = create((set, get) => ({
  fontScale: 'default', // 'small' | 'default' | 'large' | 'extraLarge'
  highContrast: false,
  voiceAssistanceEnabled: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem('homehelpuk_prefs');
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          fontScale: parsed.fontScale || 'default',
          highContrast: !!parsed.highContrast,
          voiceAssistanceEnabled: !!parsed.voiceAssistanceEnabled,
        });
      }
    } finally {
      set({ isHydrated: true });
    }
  },

  persist: async () => {
    const { fontScale, highContrast, voiceAssistanceEnabled } = get();
    await AsyncStorage.setItem(
      'homehelpuk_prefs',
      JSON.stringify({ fontScale, highContrast, voiceAssistanceEnabled })
    );
  },

  setFontScale: (fontScale) => {
    set({ fontScale });
    get().persist();
  },

  toggleHighContrast: () => {
    set({ highContrast: !get().highContrast });
    get().persist();
  },

  toggleVoiceAssistance: () => {
    set({ voiceAssistanceEnabled: !get().voiceAssistanceEnabled });
    get().persist();
  },
}));
