import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Alert, TextInput, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function ChatScreen({ route, navigation }) {
  const initialParams = route.params || {};
  const bookingId = initialParams.bookingId;
  const { highContrast, fontScale } = useAppStore();
  const { user, activeMode } = useAuthStore();
  const { markAsRead, deleteChat } = useChatStore();
  const theme = getTheme(highContrast);
  const appStateRef = useRef(AppState.currentState);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [context, setContext] = useState({
    contactName: initialParams.contactName || (activeMode === 'provider' ? 'Customer' : 'Provider'),
    serviceName: initialParams.serviceName || null,
    bookingDate: initialParams.bookingDate || null,
    bookingTime: initialParams.bookingTime || null,
  });
  const listRef = useRef(null);

  const confirmDelete = () => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this chat? This will hide it from your inbox.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await deleteChat(bookingId);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/chats/${bookingId}`);
      if (data.chat && data.chat.messages) {
        const formatted = data.chat.messages.map((m) => ({
          id: m.id,
          from: m.senderId === user.id ? 'me' : 'them',
          text: m.text,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: m.read,
        }));
        setMessages(formatted);
        
        if (data.chat.messages.some(m => m.senderId !== user.id && !m.read)) {
          markAsRead(bookingId);
        }
      }
      if (data.chat) {
        setContext(prev => ({
          ...prev,
          contactName: user.role === 'customer' ? data.chat.providerName : data.chat.customerName,
          serviceName: data.chat.serviceName,
          bookingDate: data.chat.bookingDate,
          bookingTime: data.chat.bookingTime,
        }));
      }
    } catch (err) {
      // Non-fatal
    }
  };

  useEffect(() => {
    loadMessages();
    markAsRead(bookingId);

    const { getSocket } = require('../../services/socket');
    const socket = getSocket();

    if (socket) {
      const handleIncomingMessage = (data) => {
        if (data.message && (data.conversation?.bookingId === bookingId || data.message.conversationId)) {
          console.log('[Real-Time Chat Message Received]', data.message);
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === data.message.id);
            if (exists) return prev;
            const newMsg = {
              id: data.message.id,
              from: data.message.senderId === user.id ? 'me' : 'them',
              text: data.message.text,
              time: new Date(data.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: data.message.read,
            };
            return [...prev, newMsg];
          });
          markAsRead(bookingId);
        }
      };

      socket.on('chat:message_sent', handleIncomingMessage);

      return () => {
        socket.off('chat:message_sent', handleIncomingMessage);
      };
    }
  }, [bookingId]);

  const send = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');

    const optimisticMsg = { id: String(Date.now()), from: 'me', text, time: 'Now' };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await api.post(`/chats/${bookingId}/message`, { text });
      loadMessages();
    } catch (err) {
      Alert.alert('Send failed', err.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A3925' }} edges={['top', 'left', 'right']}>
      {/* 1. Dark Forest Green Header with Gold Subtitle Accent */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { fontSize: scaledFont(17, fontScale) }]} numberOfLines={1}>
            {context.contactName}
          </Text>

          {(context.serviceName || context.bookingDate) && (
            <Text style={[styles.headerSubtitle, { fontSize: scaledFont(12, fontScale) }]} numberOfLines={1}>
              {context.serviceName || 'Service'} {context.bookingDate ? `• ${context.bookingDate}` : ''} {context.bookingTime ? `at ${context.bookingTime}` : ''}
            </Text>
          )}
        </View>

        <Pressable onPress={confirmDelete} accessibilityLabel="Delete chat" hitSlop={12} style={styles.trashBtn}>
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Main Chat Content Area */}
      <View style={[styles.chatBody, { backgroundColor: theme.background }]}>
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.from === 'me';
            return (
              <View
                style={[
                  styles.bubble,
                  isMe ? styles.sentBubble : styles.receivedBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { color: isMe ? '#FFFFFF' : theme.text, fontSize: scaledFont(15, fontScale) },
                  ]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.timestampText,
                    { color: isMe ? 'rgba(255, 255, 255, 0.75)' : theme.textMuted, fontSize: scaledFont(10, fontScale) },
                  ]}
                >
                  {item.time}
                </Text>
              </View>
            );
          }}
        />

        {/* Rounded Pill-Style Input Box */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <View style={[styles.pillInputBox, { backgroundColor: '#F4F7F5', borderColor: theme.border }]}>
              <TextInput
                placeholder="Type a message..."
                placeholderTextColor={theme.textMuted}
                value={draft}
                onChangeText={setDraft}
                style={[styles.textInput, { color: theme.text, fontSize: scaledFont(15, fontScale) }]}
                multiline={false}
                onSubmitEditing={send}
              />
            </View>

            <Pressable
              onPress={send}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[styles.sendButton, { backgroundColor: '#0A3925' }]}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#0A3925',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#FACC15',
    fontWeight: '700',
    marginTop: 1,
  },
  trashBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBody: {
    flex: 1,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sentBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0A3925',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  receivedBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleText: {
    lineHeight: 20,
    fontWeight: '500',
  },
  timestampText: {
    marginTop: 4,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  pillInputBox: {
    flex: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  textInput: {
    paddingVertical: 0,
    height: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A3925',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
