import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  activeMode: 'customer',
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem('homehelpuk_auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ 
          user: parsed.user, 
          token: parsed.token, 
          activeMode: parsed.user?.role === 'provider' ? 'provider' : 'customer' 
        });
      }
    } finally {
      set({ isHydrated: true });
    }
  },

  login: async (user, token) => {
    const activeMode = user.role === 'provider' ? 'provider' : 'customer';
    set({ user, token, activeMode });
    await AsyncStorage.setItem('homehelpuk_auth', JSON.stringify({ user, token }));
  },

  updateUser: async (updates) => {
    const nextUser = { ...get().user, ...updates };
    set({ user: nextUser });
    await AsyncStorage.setItem(
      'homehelpuk_auth',
      JSON.stringify({ user: nextUser, token: get().token })
    );
  },

  logout: async () => {
    set({ user: null, token: null, activeMode: 'customer' });
    await AsyncStorage.removeItem('homehelpuk_auth');
  },
}));
