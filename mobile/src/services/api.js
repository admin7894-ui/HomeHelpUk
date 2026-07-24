import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://homehelpuk.onrender.com/api';

console.log(`[API Config] Using API Base URL: ${API_BASE_URL}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );

    return config;
  },
  (error) => {
    console.warn('[API Request Error]', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(
      `[API Response] ${response.status} ${response.config?.url || ''}`
    );

    return response;
  },
  (error) => {
    console.warn('[API Response Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    let message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong. Please try again.';

    if (
      error.message?.toLowerCase().includes('network error') ||
      error.code === 'ECONNABORTED'
    ) {
      message =
        'Unable to connect to the HomeHelpUK server. Please check your internet connection and try again.';
    }

    return Promise.reject(new Error(message));
  }
);

export { API_BASE_URL };
export default api;