import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import StarRating from '../../components/StarRating';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import api from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme, scaledFont, spacing } from '../../utils/theme';

export default function RateReviewScreen({ route, navigation }) {
  const { booking } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const theme = getTheme(highContrast);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        bookingId: booking.id,
        providerId: booking.providerId,
        customerId: user.id,
        rating,
        comment,
      });
      Alert.alert('Thank you!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Bookings' }) },
      ]);
    } catch (err) {
      Alert.alert('Could not submit review', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>Rate your experience</Text>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.md, fontSize: scaledFont(14, fontScale) }}>
        How was your service on {booking.date}?
      </Text>

      <Card>
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <StarRating rating={rating} onChange={setRating} size={36} />
        </View>
        <AccessibleTextInput
          label="Leave a comment (optional)"
          placeholder="Tell others about your experience..."
          value={comment}
          onChangeText={setComment}
          multiline
        />
      </Card>

      <AppButton label="Submit Review" onPress={submit} loading={submitting} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800' },
});
