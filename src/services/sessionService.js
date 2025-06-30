import axios from 'axios';
import config from '../config/config';

/**
 * Session validation service
 * Handles checking if the current session is still valid
 * Used for single-device authentication
 */

let isCheckingSession = false;

/**
 * Check if the current session is still valid
 * @returns {Promise<boolean>} True if session is valid, false otherwise
 */
export const checkSessionValidity = async () => {
  if (isCheckingSession) {
    return true; // Avoid concurrent checks
  }

  try {
    isCheckingSession = true;
    const token = localStorage.getItem('token');
    
    if (!token) {
      return false;
    }

    const response = await axios.get(`${config.backendUrl}/api/auth/check-session`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000 // 5 second timeout
    });

    return response.data.valid === true;
  } catch (error) {
    if (error.response?.status === 401) {
      // Check if this is specifically a session invalidation
      if (error.response.data?.code === 'SESSION_INVALIDATED') {
        // Dispatch a custom event to notify the app
        window.dispatchEvent(new CustomEvent('session-invalidated', {
          detail: {
            message: error.response.data.message || 'Tài khoản của bạn đã đăng nhập từ thiết bị khác'
          }
        }));
      }
      return false;
    }
    
    // For other errors, assume session is still valid to avoid false positives
    console.warn('Session check failed:', error.message);
    return true;
  } finally {
    isCheckingSession = false;
  }
};

/**
 * Start periodic session validation
 * @param {number} interval - Check interval in milliseconds (default: 30 seconds)
 * @returns {Function} Cleanup function to stop the checks
 */
export const startSessionValidation = (interval = 30000) => {
  const checkSession = async () => {
    const isValid = await checkSessionValidity();
    if (!isValid) {
      // Session is invalid, the checkSessionValidity function will handle the cleanup
      return;
    }
  };

  // Initial check after a short delay
  const initialTimeout = setTimeout(checkSession, 5000);
  
  // Periodic checks
  const intervalId = setInterval(checkSession, interval);

  // Return cleanup function
  return () => {
    clearTimeout(initialTimeout);
    clearInterval(intervalId);
  };
}; 