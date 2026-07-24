import { create } from 'zustand';
import api from '../services/api';

export const useChatStore = create((set, get) => ({
  conversations: [],
  unreadTotal: 0,
  loading: false,

  fetchConversations: async () => {
    try {
      const { data } = await api.get('/chats');
      if (data.success) {
        set({ conversations: data.conversations, unreadTotal: data.unreadTotal });
      }
    } catch (err) {
      console.log('Error fetching conversations:', err);
    }
  },

  markAsRead: async (bookingId) => {
    // Optimistic update
    const currentConvos = get().conversations;
    let found = false;
    let newUnreadTotal = get().unreadTotal;
    
    const newConvos = currentConvos.map(c => {
      if (c.bookingId === bookingId && c.unreadCount > 0) {
        found = true;
        newUnreadTotal = Math.max(0, newUnreadTotal - c.unreadCount);
        return { ...c, unreadCount: 0 };
      }
      return c;
    });

    if (found) {
      set({ conversations: newConvos, unreadTotal: newUnreadTotal });
      
      try {
        await api.patch(`/chats/${bookingId}/read`);
      } catch (err) {
        console.log('Error marking chat as read:', err);
      }
    }
  },

  deleteChat: async (bookingId) => {
    // Optimistic UI removal
    const currentConvos = get().conversations;
    const filtered = currentConvos.filter(c => c.bookingId !== bookingId);
    set({ conversations: filtered });

    try {
      await api.delete(`/chats/${bookingId}`);
    } catch (err) {
      console.log('Error deleting chat:', err);
      // Revert if needed
      get().fetchConversations();
    }
  }
}));
