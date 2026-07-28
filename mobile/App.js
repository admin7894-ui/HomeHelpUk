import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useAppStore } from './src/store/appStore';
import api from './src/services/api';
import { registerForPushNotificationsAsync, setupNotificationListeners } from './src/services/notifications';
import { connectSocket, disconnectSocket } from './src/services/socket';

function AppContent({ navigationRef }) {
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
    if (isHydrated && token && !user) {
      console.log('[Auth] Token exists but user missing. Fetching /auth/me for cold-start session restoration.');
      api.get('/auth/me')
        .then(({ data }) => {
          if (data.user) {
            updateUser(data.user);
          }
        })
        .catch(() => {});
    }

    if (isHydrated && token) {
      connectSocket();
      registerForPushNotificationsAsync();
      const cleanupListeners = setupNotificationListeners(navigationRef);
      return () => {
        if (cleanupListeners) cleanupListeners();
      };
    } else if (isHydrated && !token) {
      disconnectSocket();
    }
  }, [isHydrated, token, user]);

  return <RootNavigator />;
}

export default function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer ref={navigationRef}>
        <AppContent navigationRef={navigationRef} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
