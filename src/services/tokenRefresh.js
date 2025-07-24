import axios from 'axios';
import config from '../config/config';
import { isValidJWT, shouldRefreshToken, updateAuthData, decodeJWT } from '../utils/auth';

// Track refresh attempts to prevent infinite loops
let isRefreshing = false;
let refreshPromise = null;
let lastRefreshTime = 0;
let refreshCallCount = 0;
const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between refreshes

/**
 * Refreshes the JWT token using the refresh token or current token
 * @returns {Promise<string|null>} New token or null if refresh failed
 */
export const refreshToken = async () => {
  refreshCallCount++;
  const now = Date.now();
  
  // Enhanced logging to track refresh calls
  console.log(`[TOKEN REFRESH ${refreshCallCount}] Called at ${new Date().toISOString()}`);
  console.log(`[TOKEN REFRESH ${refreshCallCount}] Time since last refresh: ${now - lastRefreshTime}ms`);
  console.log(`[TOKEN REFRESH ${refreshCallCount}] Is already refreshing: ${isRefreshing}`);
  
  // Log call stack to see what's triggering the refresh
  if (refreshCallCount % 10 === 1) { // Log stack every 10th call to avoid spam
    console.log(`[TOKEN REFRESH ${refreshCallCount}] Call stack:`, new Error().stack);
  }
  
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    console.log(`[TOKEN REFRESH ${refreshCallCount}] Returning existing refresh promise`);
    return refreshPromise;
  }

  // Rate limiting: don't refresh more than once per 30 seconds
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    console.warn(`[TOKEN REFRESH ${refreshCallCount}] RATE LIMITED - only ${now - lastRefreshTime}ms since last refresh (min: ${MIN_REFRESH_INTERVAL}ms)`);
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      console.log(`[TOKEN REFRESH ${refreshCallCount}] Returning current token due to rate limit`);
      return currentToken;
    }
  }

  const currentToken = localStorage.getItem('token');
  if (!isValidJWT(currentToken)) {
    console.log(`[TOKEN REFRESH ${refreshCallCount}] No valid JWT token found`);
    return null;
  }

  // Log token expiration info
  try {
    const payload = decodeJWT(currentToken);
    const expTime = new Date(payload.exp * 1000);
    const timeUntilExp = payload.exp * 1000 - now;
    console.log(`[TOKEN REFRESH ${refreshCallCount}] Token expires at: ${expTime.toISOString()}`);
    console.log(`[TOKEN REFRESH ${refreshCallCount}] Time until expiration: ${Math.round(timeUntilExp / 1000 / 60)} minutes`);
  } catch (e) {
    console.error(`[TOKEN REFRESH ${refreshCallCount}] Error decoding token:`, e);
  }

  // Check if we have a refresh token
  const refreshTokenStored = localStorage.getItem('refreshToken');
  console.log(`[TOKEN REFRESH ${refreshCallCount}] Has refresh token: ${!!refreshTokenStored}`);
  
  isRefreshing = true;
  lastRefreshTime = now;
  
  refreshPromise = (async () => {
    try {
      console.log(`[TOKEN REFRESH ${refreshCallCount}] Starting refresh request...`);
      let response;
      
      if (refreshTokenStored) {
        console.log(`[TOKEN REFRESH ${refreshCallCount}] Using refresh token endpoint`);
        // Use refresh token if available
        response = await axios.post(`${config.backendUrl}/api/auth/refresh`, {
          refreshToken: refreshTokenStored
        }, {
          timeout: 10000 // 10 second timeout
        });
      } else {
        console.log(`[TOKEN REFRESH ${refreshCallCount}] Using fallback refresh-token endpoint`);
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
        
        console.log(`[TOKEN REFRESH ${refreshCallCount}] SUCCESS - New token received`);
        
        // Log new token expiration
        try {
          const newPayload = decodeJWT(newToken);
          const newExpTime = new Date(newPayload.exp * 1000);
          console.log(`[TOKEN REFRESH ${refreshCallCount}] New token expires at: ${newExpTime.toISOString()}`);
        } catch (e) {
          console.error(`[TOKEN REFRESH ${refreshCallCount}] Error decoding new token:`, e);
        }
        
        // Update stored tokens and user data
        updateAuthData({ token: newToken }, userData);
        
        // Store refresh token if provided
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
          console.log(`[TOKEN REFRESH ${refreshCallCount}] New refresh token stored`);
        }
        
        return newToken;
      }
      
      throw new Error('No token in refresh response');
      
    } catch (error) {
      console.error(`[TOKEN REFRESH ${refreshCallCount}] FAILED:`, error.message);
      console.error(`[TOKEN REFRESH ${refreshCallCount}] Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Check if this is a recent login (within 10 minutes) to be less aggressive
      const loginTime = localStorage.getItem('loginTime');
      const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < (10 * 60 * 1000);
      
      console.log(`[TOKEN REFRESH ${refreshCallCount}] Is recent login: ${isRecentLogin}`);
      
      // Only clear auth data if it's a 401/403 error and not a recent login
      const isAuthError = error.response && (error.response.status === 401 || error.response.status === 403);
      
      if (isAuthError && !isRecentLogin) {
        console.log(`[TOKEN REFRESH ${refreshCallCount}] Clearing auth data due to auth error`);
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
      console.log(`[TOKEN REFRESH ${refreshCallCount}] Cleanup - setting isRefreshing to false`);
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
    console.log('[ENSURE VALID TOKEN] No valid JWT token found');
    return null;
  }
  
  // If token needs refresh, refresh it
  if (shouldRefreshToken(currentToken)) {
    console.log('[ENSURE VALID TOKEN] Token needs refresh, calling refreshToken()');
    const newToken = await refreshToken();
    const result = newToken || currentToken;
    console.log(`[ENSURE VALID TOKEN] Returning ${newToken ? 'new' : 'current'} token`);
    return result; // Return current token if refresh fails
  }
  
  console.log('[ENSURE VALID TOKEN] Token is still valid, no refresh needed');
  return currentToken;
};

/**
 * Sets up automatic token refresh based on expiration time
 */
export const setupAutoRefresh = () => {
  console.log('[SETUP AUTO REFRESH] Setting up automatic token refresh...');
  
  const checkAndRefresh = async () => {
    console.log('[AUTO REFRESH CHECK] Running automatic refresh check...');
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('[AUTO REFRESH CHECK] No token found, skipping check');
      return;
    }
    
    console.log('[AUTO REFRESH CHECK] Token found, checking if refresh needed...');
    
    // Only refresh if token actually needs it (within 10 minutes of expiry)
    if (shouldRefreshToken(token)) {
      console.log('[AUTO REFRESH CHECK] Token needs refresh, calling refreshToken()');
      try {
        await refreshToken();
        console.log('[AUTO REFRESH CHECK] Auto-refresh completed successfully');
      } catch (error) {
        console.error('[AUTO REFRESH CHECK] Auto-refresh failed:', error);
        // Don't automatically logout on auto-refresh failure
        // Let the user continue until they make an authenticated request
      }
    } else {
      console.log('[AUTO REFRESH CHECK] Token does not need refresh yet');
    }
  };
  
  console.log('[SETUP AUTO REFRESH] Setting up 8-minute interval');
  // Changed from 5 minutes to 8 minutes to avoid conflicts with query stale times
  // This ensures token refresh happens between query refetches
  const intervalId = setInterval(checkAndRefresh, 8 * 60 * 1000);
  
  console.log('[SETUP AUTO REFRESH] Setting up initial check in 30 seconds');
  // Initial check after a delay to avoid conflicts during page load
  setTimeout(() => {
    console.log('[SETUP AUTO REFRESH] Running initial delayed check...');
    checkAndRefresh();
  }, 30000); // Check after 30 seconds
  
  // Return cleanup function
  return () => {
    console.log('[SETUP AUTO REFRESH] Cleaning up auto-refresh interval');
    clearInterval(intervalId);
  };
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