import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import { getTheme } from '../utils/theme';

import JobFeedScreen from '../screens/Provider/JobFeedScreen';
import MyJobsScreen from '../screens/Provider/MyJobsScreen';
import WalletScreen from '../screens/Provider/WalletScreen';
import ProfileScreen from '../screens/Shared/ProfileScreen';
import MessagesScreen from '../screens/Customer/MessagesScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  'Job Feed': 'briefcase',
  'My Jobs': 'checkmark-done-circle',
  Messages: 'chatbubble-ellipses',
  Earnings: 'wallet',
  Profile: 'person',
};

export default function ProviderTabNavigator() {
  const { highContrast } = useAppStore();
  const { unreadTotal, fetchConversations } = useChatStore();
  const theme = getTheme(highContrast);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    fetchConversations();
    let intervalId = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (appStateRef.current === 'active') {
            fetchConversations();
          }
        }, 15000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchConversations();
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        stopPolling();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#0A3925',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.65)',
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 12,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#0A3925',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#0A3925',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          paddingHorizontal: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconName = `${ICONS[route.name]}${focused ? '' : '-outline'}`;
          if (focused) {
            return (
              <View style={styles.activePill}>
                <Ionicons name={iconName} size={20} color="#0A3925" />
              </View>
            );
          }
          return <Ionicons name={iconName} size={22} color="rgba(255, 255, 255, 0.75)" />;
        },
        tabBarAccessibilityLabel: route.name,
      })}
    >
      <Tab.Screen name="Job Feed" component={JobFeedScreen} />
      <Tab.Screen name="My Jobs" component={MyJobsScreen} />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen} 
        options={{
          tabBarBadge: unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : unreadTotal) : null,
          tabBarBadgeStyle: { backgroundColor: '#EAB308', color: '#0A3925', fontWeight: '800' }
        }}
      />
      <Tab.Screen name="Earnings" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activePill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
