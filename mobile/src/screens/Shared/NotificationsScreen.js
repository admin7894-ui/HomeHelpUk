import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing } from '../../utils/theme';

export default function NotificationsScreen() {
  const { highContrast, fontScale } = useAppStore();
  const { user, activeMode } = useAuthStore();
  const theme = getTheme(highContrast);
  const accent = activeMode === 'provider' ? theme.providerAccent : theme.customerAccent;

  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get(`/notifications/user/${user.id}`);
      setNotifications(data.notifications);
    } catch (err) {
      // Non-fatal in a demo — just show empty state
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      // ignore in demo
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        ListEmptyComponent={<Text style={{ color: theme.textMuted, marginTop: spacing.lg }}>You're all caught up.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => markRead(item.id)} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.message}`}>
            <Card style={!item.read ? { borderColor: accent, borderWidth: 1.5 } : null}>
              <View style={styles.row}>
                <Ionicons name={item.read ? 'notifications-outline' : 'notifications'} size={20} color={accent} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: scaledFont(15, fontScale) }}>{item.title}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: scaledFont(13, fontScale) }}>{item.message}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
