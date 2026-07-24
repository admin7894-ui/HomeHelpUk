import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/Shared/OnboardingScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

import CustomerTabNavigator from './CustomerTabNavigator';
import ProviderTabNavigator from './ProviderTabNavigator';

import ServiceDetailScreen from '../screens/Customer/ServiceDetailScreen';
import CategoryDetailScreen from '../screens/Customer/CategoryDetailScreen';
import AllCategoriesScreen from '../screens/Customer/AllCategoriesScreen';
import ProviderDetailScreen from '../screens/Customer/ProviderDetailScreen';
import BookDateTimeScreen from '../screens/Customer/BookDateTimeScreen';
import BookAddressScreen from '../screens/Customer/BookAddressScreen';
import BookProviderScreen from '../screens/Customer/BookProviderScreen';
import BookSummaryScreen from '../screens/Customer/BookSummaryScreen';
import BookServiceScreen from '../screens/Customer/BookServiceScreen';
import PaymentScreen from '../screens/Customer/PaymentScreen';
import BookingConfirmationScreen from '../screens/Customer/BookingConfirmationScreen';
import BookingStatusScreen from '../screens/Customer/BookingStatusScreen';
import RateReviewScreen from '../screens/Customer/RateReviewScreen';
import ChatScreen from '../screens/Shared/ChatScreen';
import NotificationsScreen from '../screens/Shared/NotificationsScreen';

import JobDetailScreen from '../screens/Provider/JobDetailScreen';
import ReviewsReceivedScreen from '../screens/Provider/ReviewsReceivedScreen';
import OTPVerifyScreen from '../screens/Auth/OTPVerifyScreen';
import OnboardingWizard from '../screens/Provider/OnboardingWizard';
import ServiceManagerScreen from '../screens/Provider/ServiceManagerScreen';
import ScheduleManagerScreen from '../screens/Provider/ScheduleManagerScreen';
import JobExecutionScreen from '../screens/Provider/JobExecutionScreen';

import { useAuthStore } from '../store/authStore';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, activeMode, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Group>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      ) : (user.role === 'provider' && !user.verifiedPhone) ? (
        <Stack.Group>
          <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
        </Stack.Group>
      ) : (user.role === 'provider' && !user.onboardingComplete) ? (
        <Stack.Group>
          <Stack.Screen name="OnboardingWizard" component={OnboardingWizard} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen
            name="MainTabs"
            component={activeMode === 'provider' ? ProviderTabNavigator : CustomerTabNavigator}
          />
          <Stack.Screen name="AllCategories" component={AllCategoriesScreen} />
          <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
          <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
          <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
          <Stack.Screen name="BookDateTime" component={BookDateTimeScreen} />
          <Stack.Screen name="BookAddress" component={BookAddressScreen} />
          <Stack.Screen name="BookProvider" component={BookProviderScreen} />
          <Stack.Screen name="BookSummary" component={BookSummaryScreen} />
          <Stack.Screen name="BookService" component={BookServiceScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
          <Stack.Screen name="BookingStatus" component={BookingStatusScreen} />
          <Stack.Screen name="RateReview" component={RateReviewScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="JobDetail" component={JobDetailScreen} />
          <Stack.Screen name="ReviewsReceived" component={ReviewsReceivedScreen} />
          <Stack.Screen name="ServiceManager" component={ServiceManagerScreen} />
          <Stack.Screen name="ScheduleManager" component={ScheduleManagerScreen} />
          <Stack.Screen name="JobExecution" component={JobExecutionScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
