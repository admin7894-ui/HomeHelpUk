/**
 * HomeHelpUK Admin Panel Environment Configuration
 * Configures API Base URL dynamically supporting Vercel environment variables & Localhost
 */

(function(window) {
  // If window.ADMIN_API_BASE_URL is injected via inline script or window environment:
  // Default to relative '/api/admin' when hosted on same origin (e.g. Vercel backend rewrite or Express static serve),
  // fallback to window.location.origin + '/api/admin' or explicit remote API host.
  
  const envApiUrl = window.ENV_API_BASE_URL || (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL);
  
  let baseUrl;
  if (envApiUrl) {
    baseUrl = envApiUrl.replace(/\/$/, '') + '/api/admin';
  } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    baseUrl = window.location.protocol + '//' + window.location.host + '/api/admin';
  } else {
    baseUrl = '/api/admin';
  }

  window.HOMEHELP_ADMIN_CONFIG = {
    API_BASE: baseUrl
  };
})(window);
