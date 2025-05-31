import axios from 'axios';
import config from '../config/config';
import { isValidJWT, shouldRefreshToken, updateAuthData, decodeJWT } from '../utils/auth';

// Track refresh attempts to prevent infinite loops
let isRefreshing = false;
let refreshPromise = null;

/**
 * Refreshes the JWT token using the refresh token or current token
 * @returns {Promise<string|null>} New token or null if refresh failed
 */
export const refreshToken = async () => {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const currentToken = localStorage.getItem('token');
  if (!isValidJWT(currentToken)) {
    console.log('No valid token to refresh');
    return null;
  }

  // Check if we have a refresh token
  const refreshTokenStored = localStorage.getItem('refreshToken');
  
  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      console.log('Attempting to refresh token...');
      
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
        
        console.log('Token refreshed successfully');
        return newToken;
      }
      
      throw new Error('No token in refresh response');
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionExpiry');
      
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('auth-token-refresh-failed'));
      
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
    console.log('Token needs refresh, attempting refresh...');
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
    
    if (shouldRefreshToken(token)) {
      await refreshToken();
    }
  };
  
  // Check every 5 minutes
  const intervalId = setInterval(checkAndRefresh, 5 * 60 * 1000);
  
  // Initial check
  checkAndRefresh();
  
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