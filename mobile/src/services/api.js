import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const IS_DEV = __DEV__;

const FALLBACK_URLS = IS_DEV
  ? [
      Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api',
      'http://192.168.1.15:4000/api',
      'https://homehelpuk.onrender.com/api',
    ]
  : ['https://homehelpuk.onrender.com/api'];

const getInitialBaseUrl = () => {
  let envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('10.36.249.137')) {
    if (Platform.OS === 'android' && envUrl.includes('localhost')) {
      return envUrl.replace('localhost', '10.0.2.2');
    }
    return envUrl;
  }
  if (IS_DEV) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const debuggerIp = hostUri.split(':')[0];
      if (debuggerIp && debuggerIp !== 'localhost' && debuggerIp !== '127.0.0.1') {
        return Platform.OS === 'android'
          ? 'http://10.0.2.2:4000/api'
          : `http://${debuggerIp}:4000/api`;
      }
    }
  }
  return FALLBACK_URLS[0];
};

let currentBaseUrl = getInitialBaseUrl();
console.log(`[API Config] Initial API Base URL (${IS_DEV ? 'DEV' : 'PROD'}): ${currentBaseUrl}`);

const api = axios.create({
  baseURL: currentBaseUrl,
  timeout: IS_DEV ? 15000 : 8000,
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = currentBaseUrl;
    config._startTime = Date.now();
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (IS_DEV) {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
      );
    }

    return config;
  },
  (error) => {
    console.log('[API Request Error]', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config._startTime || Date.now());
    console.log(
      `[PERF] [API Response] ${response.status} ${response.config?.url || ''} - ${duration}ms`
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = originalRequest?._startTime ? Date.now() - originalRequest._startTime : 0;

    console.log('[API Response Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: originalRequest?.url,
      duration: `${duration}ms`,
    });

    // Handle 401 unauthorized session expiration
    if (error.response?.status === 401) {
      const authState = useAuthStore.getState();
      if (authState.token) {
        console.log('[Auth] Session expired or invalid token (401). Logging out.');
        authState.logout().catch(() => {});
      }
    }

    const isNetworkErr =
      error.message?.toLowerCase().includes('network error') ||
      error.code === 'ECONNABORTED' ||
      !error.response;

    // Retry fallbacks ONLY in development mode to avoid 15s delays in production APKs
    if (IS_DEV && isNetworkErr && originalRequest && !originalRequest._retryCount) {
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