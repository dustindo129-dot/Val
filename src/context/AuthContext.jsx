/**
 * AuthContext
 * 
 * Authentication context provider that manages user authentication state
 * and provides authentication-related functions throughout the application.
 * 
 * Features:
 * - User authentication state management
 * - Session management with timeout
 * - Login/Signup functionality
 * - Password reset flow
 * - Token management with automatic refresh
 * - User activity tracking
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AuthContext.css';
import config from '../config/config';
import { setupAutoRefresh } from '../services/tokenRefresh';
import { startSessionValidation } from '../services/sessionService';
import { clearAllAuthData } from '../utils/auth';

// Create authentication context
const AuthContext = createContext(null);

// Session timeout duration (30 minutes for admin/mod, 3 hours for normal users)
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000;
const USER_SESSION_TIMEOUT = 3 * 60 * 60 * 1000;
// Extended session timeout (3 hours for admin/mod, 2 weeks for normal users)
const ADMIN_EXTENDED_SESSION_TIMEOUT = 3 * 60 * 60 * 1000;
// Extended session for normal users (2 weeks)
const USER_EXTENDED_SESSION_TIMEOUT = 14 * 24 * 60 * 60 * 1000;

// Grace period for clock skew and immediate post-login validation (5 minutes)
const GRACE_PERIOD = 5 * 60 * 1000;

// Add constants for storage keys and events
const AUTH_LOGOUT_EVENT = 'authLogout';
const AUTH_LOGIN_EVENT = 'authLogin';
const AUTH_STORAGE_KEY = 'authLogoutEvent';
const AUTH_LOGIN_STORAGE_KEY = 'authLoginEvent';

/**
 * AuthProvider Component
 * 
 * Provides authentication context and functionality to child components
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap
 */
export const AuthProvider = ({ children }) => {
  // State management for authentication
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justLoggedIn, setJustLoggedIn] = useState(false); // Track recent login
  const navigate = useNavigate();

  // Store auto-refresh cleanup function
  const [autoRefreshCleanup, setAutoRefreshCleanup] = useState(null);
  
  // Store session validation cleanup function
  const [sessionValidationCleanup, setSessionValidationCleanup] = useState(null);

  /**
   * Checks if the current session is valid with grace period for recent logins
   * @returns {boolean} True if session is valid, false otherwise
   */
  const checkSessionValidity = () => {
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    if (!sessionExpiry) return false;
    
    const expiryTime = parseInt(sessionExpiry, 10);
    if (isNaN(expiryTime)) {
      // Try to recover from corrupted session expiry
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          const rememberMe = localStorage.getItem('rememberMe') === 'true';
          updateSessionExpiry(rememberMe, userData);
          return true; // Give it another chance
        } catch {
          return false;
        }
      }
      return false;
    }
    
    const now = Date.now();
    const gracePeriod = justLoggedIn ? GRACE_PERIOD : 0;
    
    if (now > (expiryTime + gracePeriod)) {
      // Session expired, but check if we just logged in recently
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime && (now - parseInt(loginTime, 10)) < GRACE_PERIOD) {
        // Recently logged in, extend session
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            updateSessionExpiry(rememberMe, userData);
            return true;
          } catch {
            // Continue to logout if user data is corrupted
          }
        }
      }
      signOut();
      return false;
    }
    return true;
  };

  /**
   * Validates JWT token format with improved error handling
   * @param {string} token - JWT token to validate
   * @returns {boolean} True if token format is valid
   */
  const isValidJWT = (token) => {
    if (!token || typeof token !== 'string') return false;
    
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Each part should be base64 encoded (basic check)
    try {
      parts.forEach(part => {
        if (part.length === 0) throw new Error('Empty part');
        // More lenient base64 character check to handle different encodings
        if (!/^[A-Za-z0-9_=-]+$/.test(part)) throw new Error('Invalid characters');
      });
      
      // Additional check: try to decode the payload to ensure it's valid JSON
      try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload && typeof payload === 'object';
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  };

  /**
   * Updates the session expiry time based on user role and rememberMe preference
   * @param {boolean} rememberMe - Whether to use extended session timeout
   * @param {Object} userData - User data containing role information
   */
  const updateSessionExpiry = (rememberMe = false, userData = null) => {
    // Get user data from parameter or localStorage with error handling
    let currentUser = userData;
    if (!currentUser) {
      try {
        const storedUser = localStorage.getItem('user');
        currentUser = storedUser ? JSON.parse(storedUser) : null;
      } catch {
        currentUser = null;
      }
    }
    
    if (!currentUser) {
      // If no user data, use admin defaults for security
      const timeout = rememberMe ? ADMIN_EXTENDED_SESSION_TIMEOUT : ADMIN_SESSION_TIMEOUT;
      const expiryTime = Date.now() + timeout;
      localStorage.setItem('sessionExpiry', expiryTime.toString());
      localStorage.setItem('rememberMe', rememberMe.toString());
      return;
    }

    // Check if user is admin or moderator with safe property access
    const isAdminOrMod = currentUser.role === 'admin' || currentUser.role === 'moderator';
    
    let timeout;
    if (isAdminOrMod) {
      // Admin/Mod: 30 minutes regular, 3 hours extended
      timeout = rememberMe ? ADMIN_EXTENDED_SESSION_TIMEOUT : ADMIN_SESSION_TIMEOUT;
    } else {
      // Normal user: 3 hours regular, 2 weeks extended
      timeout = rememberMe ? USER_EXTENDED_SESSION_TIMEOUT : USER_SESSION_TIMEOUT;
    }
    
    const expiryTime = Date.now() + timeout;
    localStorage.setItem('sessionExpiry', expiryTime.toString());
    // Store the remember me preference for session restoration
    localStorage.setItem('rememberMe', rememberMe.toString());
  };

  /**
   * Resets the session timer on user activity
   */
  const resetSessionTimer = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        // Use the stored remember me preference when resetting the timer
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const userData = JSON.parse(storedUser);
        updateSessionExpiry(rememberMe, userData);
      } catch {
        // If parsing fails, clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('rememberMe');
      }
    }
  };

  /**
   * Sets up automatic token refresh
   */
  const setupTokenRefresh = () => {
    if (autoRefreshCleanup) {
      autoRefreshCleanup(); // Clean up previous setup
    }
    
    const cleanup = setupAutoRefresh();
    setAutoRefreshCleanup(() => cleanup);
  };

  /**
   * Sets up session validation with periodic checks
   */
  const setupSessionValidation = () => {
    // Clean up existing validation first
    if (sessionValidationCleanup) {
      sessionValidationCleanup();
    }
    
    const cleanupFn = startSessionValidation(30000); // Check every 30 seconds
    setSessionValidationCleanup(() => cleanupFn);
  };

  /**
   * Refreshes user data from the server to get updated fields like userNumber
   */
  const refreshUserData = async (userData) => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || !userData) return null;

      // Try to get updated user data from the profile endpoint
      const userResponse = await axios.get(`${config.backendUrl}/api/users/${userData.displayName || userData.username}/profile`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      const updatedUserData = userResponse.data;
      setUser(updatedUserData);
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      
      return updatedUserData;
    } catch (error) {
      console.log('Could not refresh user data:', error);
      return null;
    }
  };

  /**
   * Initialize authentication state and set up session management
   */
  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const loginTime = localStorage.getItem('loginTime');
        
        // Check if this is a recent login for grace period
        const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < GRACE_PERIOD;
        if (isRecentLogin) {
          setJustLoggedIn(true);
          setTimeout(() => setJustLoggedIn(false), GRACE_PERIOD - (Date.now() - parseInt(loginTime, 10)));
        }
        
        // Validate token format before proceeding, but be more lenient for recent logins
        if (storedToken && !isValidJWT(storedToken)) {
          if (!isRecentLogin) {
            signOut();
            return;
          }
          // For recent logins, try to continue but monitor for other issues
        }
        
        if (storedUser && storedToken) {
          let userData;
          try {
            userData = JSON.parse(storedUser);
          } catch {
            // Corrupted user data, clear and restart
            signOut();
            return;
          }
          
          // For initialization, be more lenient with session validation
          const sessionValid = isRecentLogin || checkSessionValidity();
          
          if (sessionValid) {
            setUser(userData);
            setIsAuthenticated(true);
            
            // Check if userNumber is missing and refresh user data if needed
            if (!userData.userNumber) {
              try {
                const refreshedData = await refreshUserData(userData);
                if (refreshedData && refreshedData.userNumber) {
                  console.log('User data refreshed with userNumber:', refreshedData.userNumber);
                  userData = refreshedData; // Update local userData reference
                }
              } catch (refreshError) {
                console.log('Could not refresh user data for userNumber:', refreshError);
                // Continue with existing user data even if refresh fails
              }
            }
            
            // Use the stored remember me preference
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            updateSessionExpiry(rememberMe, userData);
            
            // Set up automatic token refresh
            setupTokenRefresh();
            
            // Set up session validation
            setupSessionValidation();
          } else {
            signOut();
          }
        } else if (storedUser || storedToken) {
          // Partial data found, clear everything for clean state
          signOut();
        }
      } catch (error) {
        // Don't set error during initialization to avoid confusing users
        signOut();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up interval to check session validity
    const intervalId = setInterval(() => {
      const storedUser = localStorage.getItem('user');
      if (storedUser && !checkSessionValidity()) {
        signOut();
      }
    }, 60000); // Check every minute

    // Add event listeners for user activity
    const activityEvents = [
      'mousedown', 'mousemove', 'keydown',
      'scroll', 'touchstart', 'click', 'keypress'
    ];

    const handleUserActivity = () => {
      resetSessionTimer();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });

    // Clean up event listeners and interval
    return () => {
      clearInterval(intervalId);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      // Clean up auto-refresh if it exists
      if (autoRefreshCleanup) {
        autoRefreshCleanup();
      }
      
      // Clean up session validation if it exists
      if (sessionValidationCleanup) {
        sessionValidationCleanup();
      }
    };
  }, []);

  /**
   * Update session expiry when user state changes
   */
  useEffect(() => {
    if (user) {
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      updateSessionExpiry(rememberMe, user);
      setIsAuthenticated(true);
      
      // Set up automatic token refresh for authenticated users
      setupTokenRefresh();
      
      // Set up session validation for authenticated users
      setupSessionValidation();
    } else {
      setIsAuthenticated(false);
      
      // Clean up auto-refresh when user logs out
      if (autoRefreshCleanup) {
        autoRefreshCleanup();
        setAutoRefreshCleanup(null);
      }
      
      // Clean up session validation when user logs out
      if (sessionValidationCleanup) {
        sessionValidationCleanup();
        setSessionValidationCleanup(null);
      }
    }
  }, [user]);

  // Add effect for cross-tab login/logout synchronization and token refresh events
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === AUTH_STORAGE_KEY && event.newValue) {
        // Another tab triggered a logout
        signOut(true); // Pass true to indicate this is a synchronized logout
      } else if (event.key === AUTH_LOGIN_STORAGE_KEY && event.newValue) {
        // Another tab triggered a login
        const userData = JSON.parse(event.newValue);
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));
        // Get rememberMe preference from localStorage
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        updateSessionExpiry(rememberMe, userData);
      }
    };

    const handleCustomEvent = (event) => {
      // MOBILE FIX: Detect mobile environment for more lenient error handling
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (event.type === AUTH_LOGOUT_EVENT) {
        signOut(true); // Pass true to indicate this is a synchronized logout
      } else if (event.type === AUTH_LOGIN_EVENT) {
        const userData = event.detail;
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));
        // Get rememberMe preference from localStorage
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        updateSessionExpiry(rememberMe, userData);
      } else if (event.type === 'auth-token-invalid') {
        // MOBILE FIX: Be more lenient with token invalid events on mobile
        // Mobile networks can cause temporary connection issues
        if (isMobile) {
          const loginTime = localStorage.getItem('loginTime');
          const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < (10 * 60 * 1000); // 10 minutes
          
          if (isRecentLogin) {
            console.log('Mobile: Ignoring token invalid event due to recent login and mobile network instability');
            return; // Don't sign out immediately on mobile for recent logins
          }
        }
        // Handle invalid token detected by axios interceptor
        signOut(true);
      } else if (event.type === 'auth-token-refresh-failed') {
        // MOBILE FIX: Be more lenient with refresh failures on mobile
        if (isMobile) {
          const loginTime = localStorage.getItem('loginTime');
          const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < (15 * 60 * 1000); // 15 minutes
          
          if (isRecentLogin) {
            console.log('Mobile: Ignoring token refresh failure due to recent login and mobile network instability');
            return; // Don't sign out immediately on mobile for recent logins
          }
        }
        // Handle token refresh failure
        console.log('Token refresh failed, logging out user');
        signOut(true);
      } else if (event.type === 'auth-token-refreshed') {
        // Handle successful token refresh
        const { user: userData } = event.detail;
        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        console.log('Token refreshed successfully');
      }
    };

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', handleStorageChange);
    // Listen for custom events (same tab)
    window.addEventListener(AUTH_LOGOUT_EVENT, handleCustomEvent);
    window.addEventListener(AUTH_LOGIN_EVENT, handleCustomEvent);
    window.addEventListener('auth-token-invalid', handleCustomEvent);
    window.addEventListener('auth-token-refresh-failed', handleCustomEvent);
    window.addEventListener('auth-token-refreshed', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleCustomEvent);
      window.removeEventListener(AUTH_LOGIN_EVENT, handleCustomEvent);
      window.removeEventListener('auth-token-invalid', handleCustomEvent);
      window.removeEventListener('auth-token-refresh-failed', handleCustomEvent);
      window.removeEventListener('auth-token-refreshed', handleCustomEvent);
    };
  }, []);

  /**
   * Handles user login
   * @param {string} username - User's username or email
   * @param {string} password - User's password
   * @param {boolean} rememberMe - Whether to extend the session timeout
   * @returns {Promise<Object>} Response data from login API
   */
  const login = async (username, password, rememberMe = false) => {
    try {
      setError(null);
      
      // Clear any existing auth data FIRST to ensure clean slate
      clearAllAuthData();
      
      const response = await axios.post(`${config.backendUrl}/api/auth/login`,
        { username, password },
        { 
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      const userData = response.data.user;
      const loginTime = Date.now();
      
      setUser(userData);
      setIsAuthenticated(true);
      setJustLoggedIn(true);
      
      // Store user data and tokens
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('loginTime', loginTime.toString());
      
      // Store refresh token if provided
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      
      updateSessionExpiry(rememberMe, userData);

      // Notify other tabs about the login
      localStorage.setItem(AUTH_LOGIN_STORAGE_KEY, JSON.stringify(userData));
      
      // Dispatch custom event for same tab
      window.dispatchEvent(new CustomEvent(AUTH_LOGIN_EVENT, { detail: userData }));
      
      // Clear the just logged in flag after grace period
      setTimeout(() => setJustLoggedIn(false), GRACE_PERIOD);
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  /**
   * Handles user registration
   * @param {string} username - New username
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} Response data from signup API
   */
  const signUp = async (username, email, password) => {
    try {
      setError(null);
      
      // Clear any existing auth data FIRST to ensure clean slate
      clearAllAuthData();
      
      const response = await axios.post(`${config.backendUrl}/api/auth/signup`,
        { username, email, password },
        { 
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      const userData = response.data.user;
      const loginTime = Date.now();
      
      setUser(userData);
      setIsAuthenticated(true);
      setJustLoggedIn(true);
      
      // Store user data and tokens
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('loginTime', loginTime.toString());
      
      // Store refresh token if provided
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      
      updateSessionExpiry(false, userData);
      
      // Notify other tabs about the login
      localStorage.setItem(AUTH_LOGIN_STORAGE_KEY, JSON.stringify(userData));
      
      // Dispatch custom event for same tab
      window.dispatchEvent(new CustomEvent(AUTH_LOGIN_EVENT, { detail: userData }));
      
      // Clear the just logged in flag after grace period
      setTimeout(() => setJustLoggedIn(false), GRACE_PERIOD);
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Signup failed');
      throw error;
    }
  };

  /**
   * Handles user logout
   * @param {boolean} isSync - Whether this is a synchronized logout
   * @returns {Promise<void>}
   */
  const signOut = async (isSync = false) => {
    try {
      // Clean up auto-refresh first
      if (autoRefreshCleanup) {
        autoRefreshCleanup();
        setAutoRefreshCleanup(null);
      }
      
      // Clean up session validation
      if (sessionValidationCleanup) {
        sessionValidationCleanup();
        setSessionValidationCleanup(null);
      }
      
      // Get token before clearing local data for API call
      const currentToken = localStorage.getItem('token');
      
      // Clear user data and tokens FIRST to avoid auth issues
      clearAllAuthData();
      
      // Update state immediately
      setUser(null);
      setIsAuthenticated(false);
      setJustLoggedIn(false);
      
      // Only try to call the logout API if this is not a synchronized logout
      if (!isSync && currentToken) {
        try {
          await axios.post(`${config.backendUrl}/api/auth/logout`, {},
            { 
              headers: {
                'Authorization': `Bearer ${currentToken}`
              }
            }
          );
        } catch (e) {
          // Continue with local logout even if API call fails
          // This is expected and normal
        }
        
        // Notify other tabs about the logout
        localStorage.setItem(AUTH_STORAGE_KEY, Date.now().toString());
        
        // Dispatch custom event for same tab
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
      }
      
      // Local event to close any open modals
      window.dispatchEvent(new CustomEvent('closeAuthModal'));
      
    } catch (error) {
      // Silently handle logout errors to prevent user confusion
    }
  };

  /**
   * Initiates password reset process
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Response data from forgot password API
   */
  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await axios.post(`${config.backendUrl}/api/auth/forgot-password`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Password reset request failed');
      throw error;
    }
  };

  /**
   * Completes password reset process
   * @param {string} token - Reset token from email
   * @param {string} password - New password
   * @returns {Promise<Object>} Response data from reset password API
   */
  const resetPassword = async (token, password) => {
    try {
      setError(null);
      const response = await axios.post(`${config.backendUrl}/api/auth/reset-password/${token}`,
        { password },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Password reset failed');
      throw error;
    }
  };

  // Context value
  const contextValue = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    signUp,
    signOut,
    setUser,
    updateUser: setUser,
    forgotPassword,
    resetPassword
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext; 