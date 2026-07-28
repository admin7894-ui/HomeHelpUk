import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';
import Constants from 'expo-constants';

let Notifications = null;
if (Constants.appOwnership !== 'expo') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {}
}

export const setupNotificationChannels = async () => {
  if (!Notifications) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('booking-updates', {
      name: 'Booking Updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0284C7',
    });

    await Notifications.setNotificationChannelAsync('job-requests', {
      name: 'New Job Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16A34A',
    });

    await Notifications.setNotificationChannelAsync('chat-messages', {
      name: 'Chat Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150, 150, 150],
      lightColor: '#2563EB',
    });

    await Notifications.setNotificationChannelAsync('wallet-earnings', {
      name: 'Wallet & Earnings',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#EAB308',
    });
  }
};

export const registerForPushNotificationsAsync = async () => {
  if (Constants.appOwnership === 'expo') {
    console.log('[Push] Skipping Expo Push Token generation in Expo Go sandbox (remote push requires Development / Standalone APK Build).');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for Push Notifications');
    return null;
  }

  try {
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Notification permission not granted');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || '5d61a1d9-6d9e-4fc2-8bef-988915d7c4c2';
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    console.log('[Push Token Generated]', pushToken);

    // Register token asynchronously with backend
    api.post('/profile/push-token', {
      pushToken,
      platform: Platform.OS,
      deviceId: Device.deviceName || `${Platform.OS}_${Date.now()}`
    }).catch(err => console.log('[Push Token Register Error]', err.message));

    return pushToken;
  } catch (error) {
    console.log('[Push Token Error]', error.message);
    return null;
  }
};

export const setupNotificationListeners = (navigationRef) => {
  if (!Notifications) return () => {};
  try {
    // Listener for foreground notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push Received Foreground]', notification.request.content.title);
    });

    // Listener for notification taps / deep links
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[Push Tapped] Data:', data);

      if (navigationRef && navigationRef.isReady() && data) {
        if (data.screen === 'BookingStatus' && data.bookingId) {
          navigationRef.navigate('BookingStatus', { bookingId: data.bookingId });
        } else if (data.screen === 'JobFeed') {
          navigationRef.navigate('ProviderDashboard', { screen: 'JobFeed' });
        } else if (data.screen === 'MyJobs') {
          navigationRef.navigate('ProviderDashboard', { screen: 'MyJobs' });
        } else if (data.screen === 'Chat' && data.bookingId) {
          navigationRef.navigate('Chat', { bookingId: data.bookingId });
        } else if (data.screen === 'Wallet') {
          navigationRef.navigate('ProviderDashboard', { screen: 'Wallet' });
        }
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  } catch (err) {
    console.log('[Push Listener Error]', err.message);
    return () => {};
  }
};
