import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const FALLBACK_URLS = [
  Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api',
  'http://192.168.1.15:4000/api',
  'https://homehelpuk.onrender.com/api',
];

const getInitialBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('10.36.249.137')) {
    return envUrl;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const debuggerIp = hostUri.split(':')[0];
    if (debuggerIp && debuggerIp !== 'localhost' && debuggerIp !== '127.0.0.1') {
      return Platform.OS === 'android'
        ? 'http://10.0.2.2:4000/api'
        : `http://${debuggerIp}:4000/api`;
    }
  }
  return FALLBACK_URLS[0];
};

let currentBaseUrl = getInitialBaseUrl();
console.log(`[API Config] Initial API Base URL: ${currentBaseUrl}`);

const api = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = currentBaseUrl;
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
    console.log('[API Request Error]', error);
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
  async (error) => {
    const originalRequest = error.config;

    console.log('[API Response Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: originalRequest?.url,
    });

    const isNetworkErr =
      error.message?.toLowerCase().includes('network error') ||
      error.code === 'ECONNABORTED' ||
      !error.response;

    if (isNetworkErr && originalRequest && !originalRequest._retryCount) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      for (const fallbackUrl of FALLBACK_URLS) {
        if (fallbackUrl !== currentBaseUrl) {
          console.log(`[API Fallback] Trying fallback URL: ${fallbackUrl}`);
          try {
            currentBaseUrl = fallbackUrl;
            api.defaults.baseURL = fallbackUrl;
            originalRequest.baseURL = fallbackUrl;
            return await api(originalRequest);
          } catch (fallbackErr) {
            console.log(`[API Fallback Failed] ${fallbackUrl}`);
          }
        }
      }
    }

    let message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong. Please try again.';

    if (isNetworkErr) {
      message =
        'Unable to connect to the HomeHelpUK server. Please check your internet connection and try again.';
    }

    return Promise.reject(new Error(message));
  }
);

export { currentBaseUrl as API_BASE_URL };
export default api;