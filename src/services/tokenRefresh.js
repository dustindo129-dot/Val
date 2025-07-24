import axios from 'axios';
import config from '../config/config';
import { isValidJWT, shouldRefreshToken, updateAuthData, decodeJWT } from '../utils/auth';

// Track refresh attempts to prevent infinite loops
let isRefreshing = false;
let refreshPromise = null;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between refreshes

/**
 * Refreshes the JWT token using the refresh token or current token
 * @returns {Promise<string|null>} New token or null if refresh failed
 */
export const refreshToken = async () => {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Rate limiting: don't refresh more than once per 30 seconds
  const now = Date.now();
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      return currentToken;
    }
  }

  const currentToken = localStorage.getItem('token');
  if (!isValidJWT(currentToken)) {
    return null;
  }

  // Check if we have a refresh token
  const refreshTokenStored = localStorage.getItem('refreshToken');
  
  isRefreshing = true;
  lastRefreshTime = now;
  
  refreshPromise = (async () => {
    try {
      let response;
      
      if (refreshTokenStored) {
        // Use refresh token if available
        response = await axios.post(`${config.backendUrl}/api/auth/refresh`, {
          refreshToken: refreshTokenStored
        }, {
          timeout: 10000 // 10 second timeout
        });
      } else {
        // Fallback: use current token to get a new one
        response = await axios.post(`${config.backendUrl}/api/auth/refresh-token`, {}, {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          },
          timeout: 10000
        });
      }

      if (response.data && response.data.token) {
        const newToken = response.data.token;
        const userData = response.data.user || JSON.parse(localStorage.getItem('user') || '{}');
        
        // Update stored tokens and user data
        updateAuthData({ token: newToken }, userData);
        
        // Store refresh token if provided
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        return newToken;
      }
      
      throw new Error('No token in refresh response');
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Check if this is a recent login (within 10 minutes) to be less aggressive
      const loginTime = localStorage.getItem('loginTime');
      const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < (10 * 60 * 1000);
      
      // Only clear auth data if it's a 401/403 error and not a recent login
      const isAuthError = error.response && (error.response.status === 401 || error.response.status === 403);
      
      if (isAuthError && !isRecentLogin) {
        // If refresh fails due to auth error and it's not a recent login, clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('loginTime');
        
        // Dispatch event to notify components
        window.dispatchEvent(new CustomEvent('auth-token-refresh-failed'));
      }
      
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Checks if token needs refresh and automatically refreshes it
 * @returns {Promise<string|null>} Current valid token or null
 */
export const ensureValidToken = async () => {
  const currentToken = localStorage.getItem('token');
  
  if (!isValidJWT(currentToken)) {
    return null;
  }
  
  // If token needs refresh, refresh it
  if (shouldRefreshToken(currentToken)) {
    const newToken = await refreshToken();
    return newToken || currentToken; // Return current token if refresh fails
  }
  
  return currentToken;
};

/**
 * Sets up automatic token refresh based on expiration time
 */
export const setupAutoRefresh = () => {
  const checkAndRefresh = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Only refresh if token actually needs it (within 10 minutes of expiry)
    if (shouldRefreshToken(token)) {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        // Don't automatically logout on auto-refresh failure
        // Let the user continue until they make an authenticated request
      }
    }
  };
  
  // Changed from 5 minutes to 8 minutes to avoid conflicts with query stale times
  // This ensures token refresh happens between query refetches
  const intervalId = setInterval(checkAndRefresh, 8 * 60 * 1000);
  
  // Initial check after a delay to avoid conflicts during page load
  setTimeout(checkAndRefresh, 30000); // Check after 30 seconds
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

/**
 * Calculates time until next refresh needed
 * @returns {number} Milliseconds until refresh needed, or 0 if immediate refresh needed
 */
export const getTimeUntilRefresh = () => {
  const token = localStorage.getItem('token');
  if (!isValidJWT(token)) return 0;
  
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  const refreshTime = payload.exp - (10 * 60); // Refresh 10 minutes before expiry
  
  return Math.max(0, (refreshTime - now) * 1000);
}; 