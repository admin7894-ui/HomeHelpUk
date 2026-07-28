import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { useAuthStore } from '../store/authStore';

let socket = null;

export const getSocketServerUrl = () => {
  let url = API_BASE_URL.trim();
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (url.endsWith('/api')) {
    return url.slice(0, -4);
  }
  return url;
};

export const connectSocket = () => {
  const token = useAuthStore.getState().token;
  const serverUrl = getSocketServerUrl();

  if (socket && socket.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { token }
    });

    socket.on('connect', () => {
      console.log(`[SOCKET] Connected to ${serverUrl} | Socket ID: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.log('[SOCKET] Connection Error:', error.message);
    });
  } else {
    socket.auth = { token };
  }

  socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('[SOCKET] Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinBookingRoom = (bookingId) => {
  if (socket && socket.connected && bookingId) {
    socket.emit('join_booking_room', { bookingId });
  }
};

export const leaveBookingRoom = (bookingId) => {
  if (socket && socket.connected && bookingId) {
    socket.emit('leave_booking_room', { bookingId });
  }
};
