import React, { useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAppStore } from '../../store/appStore';
import { useChatStore } from '../../store/chatStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function MessagesScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { conversations, fetchConversations } = useChatStore();
  const theme = getTheme(highContrast);
  const appStateRef = useRef(AppState.currentState);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      let intervalId = null;

      const startPolling = () => {
        if (!intervalId) {
          intervalId = setInterval(() => {
            if (appStateRef.current === 'active') {
              fetchConversations();
            }
          }, 12000);
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
    }, [fetchConversations])
  );

  return (
    <ScreenContainer scroll={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>
          Messages
        </Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.bookingId || String(c.id || Math.random())}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#E6ECE8' }]}>
              <Ionicons name="chatbubbles-outline" size={40} color="#0A3925" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text, fontSize: scaledFont(18, fontScale) }]}>
              No Conversations Yet
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textMuted, fontSize: scaledFont(14, fontScale) }]}>
              Messages with your professionals and customers will appear here once a booking is created.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const timeString = item.lastMessageTime 
            ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
            
          const initialLetter = item.contactName ? item.contactName.charAt(0).toUpperCase() : 'U';

          return (
            <Pressable
              onPress={() => item.bookingId ? navigation.navigate('Chat', { 
                contactName: item.contactName, 
                bookingId: item.bookingId,
                serviceName: item.serviceName, 
                bookingDate: item.bookingDate,
                bookingTime: item.bookingTime
              }) : alert('No active booking to chat.')}
              accessibilityRole="button"
              accessibilityLabel={`Conversation with ${item.contactName}: ${item.lastMessage || 'No messages'}`}
              style={({ pressed }) => [pressed && styles.pressedCard]}
            >
              <Card style={[styles.conversationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {item.contactAvatar ? (
                  <Image source={{ uri: item.contactAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.initialAvatar, { backgroundColor: '#0A3925' }]}>
                    <Text style={styles.initialAvatarText}>{initialLetter}</Text>
                  </View>
                )}

                <View style={styles.contentCol}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.contactName, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
                      {item.contactName}
                    </Text>
                    {!!timeString && (
                      <Text style={[styles.timestampText, { color: theme.textMuted, fontSize: scaledFont(12, fontScale) }]}>
                        {timeString}
                      </Text>
                    )}
                  </View>

                  {/* Context Gold/Amber Subtitle */}
                  {(item.serviceName || item.bookingDate) && (
                    <Text numberOfLines={1} style={[styles.contextSubtitle, { fontSize: scaledFont(12, fontScale) }]}>
                      {item.serviceName || 'Service Booking'} {item.bookingDate ? `• ${item.bookingDate}` : ''} {item.bookingTime ? `at ${item.bookingTime}` : ''}
                    </Text>
                  )}

                  {/* Last Message Preview */}
                  <View style={styles.rowBetween}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.lastMessageText,
                        {
                          color: item.unreadCount > 0 ? theme.text : theme.textMuted,
                          fontWeight: item.unreadCount > 0 ? '700' : '400',
                          fontSize: scaledFont(13, fontScale)
                        }
                      ]}
                    >
                      {item.lastMessage || 'Tap to start conversation'}
                    </Text>

                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginTop: spacing.sm, marginBottom: spacing.md },
  title: { fontWeight: '900' },
  pressedCard: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  initialAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  initialAvatarText: { color: '#FACC15', fontWeight: '900', fontSize: 20 },
  contentCol: { marginLeft: spacing.md, flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactName: { fontWeight: '800' },
  timestampText: { fontWeight: '500' },
  contextSubtitle: { color: '#B45309', fontWeight: '700', marginVertical: 2 },
  lastMessageText: { flex: 1, marginRight: spacing.xs },
  unreadBadge: {
    backgroundColor: '#0A3925',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginLeft: spacing.xs,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontWeight: '900', marginBottom: spacing.xs, textAlign: 'center' },
  emptyDesc: { textAlign: 'center', lineHeight: 20 },
});
