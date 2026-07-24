import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import StarRating from '../../components/StarRating';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing } from '../../utils/theme';

export default function ReviewsReceivedScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const theme = getTheme(highContrast);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (user?.providerId) {
      api.get(`/reviews/provider/${user.providerId}`).then(({ data }) => setReviews(data.reviews));
    }
  }, [user]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <ScreenContainer scroll={false}>
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} style={{ marginBottom: spacing.sm }}>
        <Ionicons name="chevron-back" size={26} color={theme.text} />
      </Pressable>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>Reviews Received</Text>
      <Card>
        <View style={styles.row}>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: scaledFont(28, fontScale) }}>{avg.toFixed(1)}</Text>
          <View style={{ marginLeft: spacing.sm }}>
            <StarRating rating={avg} readOnly size={16} />
            <Text style={{ color: theme.textMuted, fontSize: scaledFont(12, fontScale) }}>{reviews.length} reviews</Text>
          </View>
        </View>
      </Card>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={{ color: theme.textMuted }}>No reviews yet.</Text>}
        renderItem={({ item }) => (
          <Card>
            <StarRating rating={item.rating} readOnly size={16} />
            <Text style={{ color: theme.text, marginTop: spacing.xs, fontSize: scaledFont(14, fontScale) }}>{item.comment}</Text>
          </Card>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
});
