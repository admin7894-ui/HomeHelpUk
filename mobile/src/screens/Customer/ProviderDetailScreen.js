import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import StarRating from '../../components/StarRating';
import api from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';
import { getTheme, scaledFont, spacing } from '../../utils/theme';

export default function ProviderDetailScreen({ route, navigation }) {
  const { providerId, categoryId } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { setDraft } = useBookingStore();
  const { user } = useAuthStore();
  const theme = getTheme(highContrast);

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    api.get(`/providers/${providerId}`).then(({ data }) => {
      setProvider(data.provider);
      setReviews(data.reviews);
    });
    setIsFavourite(user?.favouriteProviderIds?.includes(providerId));
  }, [providerId]);

  const toggleFavourite = async () => {
    setIsFavourite((f) => !f);
    try {
      await api.post(`/profile/${user.id}/favourites`, { providerId });
    } catch (err) {
      // non-fatal in demo
    }
  };

  if (!provider) return null;

  return (
    <ScreenContainer>
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} style={{ marginBottom: spacing.sm }}>
        <Ionicons name="chevron-back" size={26} color={theme.text} />
      </Pressable>

      <View style={styles.headerRow}>
        <Image source={{ uri: provider.avatar }} style={styles.avatar} />
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <Text style={[styles.name, { color: theme.text, fontSize: scaledFont(20, fontScale) }]}>{provider.name}</Text>
          <View style={styles.row}>
            <Ionicons name="star" size={16} color={theme.amber} />
            <Text style={{ color: theme.textMuted, marginLeft: 4 }}>
              {provider.rating} ({provider.reviewCount} reviews) · {provider.completedJobs} jobs done
            </Text>
          </View>
        </View>
        <Pressable onPress={toggleFavourite} accessibilityRole="button" accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Add to favourites'} hitSlop={10}>
          <Ionicons name={isFavourite ? 'heart' : 'heart-outline'} size={26} color={theme.coral || theme.customerAccent} />
        </Pressable>
      </View>

      <Card>
        <Text style={{ color: theme.text, fontSize: scaledFont(14, fontScale) }}>{provider.bio}</Text>
        <Text style={{ color: theme.textMuted, marginTop: spacing.sm, fontSize: scaledFont(13, fontScale) }}>
          {provider.postcode} · {provider.distanceKm}km away
        </Text>
        {provider.verified && (
          <Text style={{ color: theme.success, marginTop: spacing.xs, fontWeight: '700' }}>✓ Identity & background verified</Text>
        )}
        <Text style={{ color: theme.text, fontWeight: '800', marginTop: spacing.sm, fontSize: scaledFont(18, fontScale) }}>
          £{provider.hourlyRate}/hr
        </Text>
      </Card>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text, fontSize: scaledFont(18, fontScale) }]}>
        Reviews
      </Text>
      {reviews.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>No reviews yet.</Text>
      ) : (
        reviews.map((r) => (
          <Card key={r.id}>
            <StarRating rating={r.rating} readOnly size={16} />
            <Text style={{ color: theme.text, marginTop: spacing.xs, fontSize: scaledFont(14, fontScale) }}>{r.comment}</Text>
          </Card>
        ))
      )}

      <AppButton
        label={`Book ${provider.name.split(' ')[0]} — £${provider.hourlyRate}/hr`}
        onPress={() => {
          setDraft({ providerId, categoryId });
          navigation.navigate('BookService', { providerId, categoryId });
        }}
        style={{ marginTop: spacing.md }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  name: { fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  sectionTitle: { fontWeight: '800', marginVertical: spacing.sm },
});
