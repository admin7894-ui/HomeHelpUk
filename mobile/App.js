import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useAppStore } from './src/store/appStore';
import api from './src/services/api';

function AppContent() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateApp = useAppStore((s) => s.hydrate);
  const { user, token, updateUser, isHydrated } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await hydrateAuth();
      await hydrateApp();
    };
    init();
  }, []);

  useEffect(() => {
    if (isHydrated && user && token) {
      api.get('/auth/me')
        .then(({ data }) => {
          if (data.user) {
            updateUser(data.user);
          }
        })
        .catch(() => {});
    }
  }, [isHydrated, token]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
