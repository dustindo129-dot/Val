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
 * - Token management
 * - User activity tracking
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AuthContext.css';
import config from '../config/config';

// Create authentication context
const AuthContext = createContext(null);

// Session timeout duration (30 minutes for admin/mod, 3 hours for normal users)
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000;
const USER_SESSION_TIMEOUT = 3 * 60 * 60 * 1000;
// Extended session timeout (3 hours for admin/mod, 2 weeks for normal users)
const ADMIN_EXTENDED_SESSION_TIMEOUT = 3 * 60 * 60 * 1000;
// Extended session for normal users (2 weeks)
const USER_EXTENDED_SESSION_TIMEOUT = 14 * 24 * 60 * 60 * 1000;

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
  const navigate = useNavigate();

  /**
   * Checks if the current session is valid
   * @returns {boolean} True if session is valid, false otherwise
   */
  const checkSessionValidity = () => {
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    if (!sessionExpiry) return false;
    
    const expiryTime = parseInt(sessionExpiry, 10);
    if (isNaN(expiryTime)) return false;
    
    if (Date.now() > expiryTime) {
      // Session expired, sign out user
      signOut();
      return false;
    }
    return true;
  };

  /**
   * Updates the session expiry time based on user role and rememberMe preference
   * @param {boolean} rememberMe - Whether to use extended session timeout
   * @param {Object} userData - User data containing role information
   */
  const updateSessionExpiry = (rememberMe = false, userData = null) => {
    // Get user data from parameter or localStorage
    const currentUser = userData || JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!currentUser) {
      // If no user data, use admin defaults for security
      const timeout = rememberMe ? ADMIN_EXTENDED_SESSION_TIMEOUT : ADMIN_SESSION_TIMEOUT;
      const expiryTime = Date.now() + timeout;
      localStorage.setItem('sessionExpiry', expiryTime.toString());
      localStorage.setItem('rememberMe', rememberMe.toString());
      return;
    }

    // Check if user is admin or moderator
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
      // Use the stored remember me preference when resetting the timer
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const userData = JSON.parse(storedUser);
      updateSessionExpiry(rememberMe, userData);
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
        if (storedUser && checkSessionValidity()) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          // Use the stored remember me preference
          const rememberMe = localStorage.getItem('rememberMe') === 'true';
          updateSessionExpiry(rememberMe, userData);
        } else if (storedUser) {
          signOut();
        }
      } catch (error) {
        setError('Authentication failed');
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
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  // Add effect for cross-tab login/logout synchronization
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
      }
    };

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', handleStorageChange);
    // Listen for custom events (same tab)
    window.addEventListener(AUTH_LOGOUT_EVENT, handleCustomEvent);
    window.addEventListener(AUTH_LOGIN_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleCustomEvent);
      window.removeEventListener(AUTH_LOGIN_EVENT, handleCustomEvent);
    };
  }, []);

  /**
   * Handles user login
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @param {boolean} rememberMe - Whether to extend the session timeout
   * @returns {Promise<Object>} Response data from login API
   */
  const login = async (username, password, rememberMe = false) => {
    try {
      setError(null);
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
      setUser(userData);
      setIsAuthenticated(true);
      
      // Store user data and token
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.data.token);
      updateSessionExpiry(rememberMe, userData);

      // Notify other tabs about the login
      localStorage.setItem(AUTH_LOGIN_STORAGE_KEY, JSON.stringify(userData));
      
      // Dispatch custom event for same tab
      window.dispatchEvent(new CustomEvent(AUTH_LOGIN_EVENT, { detail: userData }));
      
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
      setUser(userData);
      setIsAuthenticated(true);
      
      // Store user data and token
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.data.token);
      updateSessionExpiry(false, userData);
      
      // Notify other tabs about the login
      localStorage.setItem(AUTH_LOGIN_STORAGE_KEY, JSON.stringify(userData));
      
      // Dispatch custom event for same tab
      window.dispatchEvent(new CustomEvent(AUTH_LOGIN_EVENT, { detail: userData }));
      
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
      // Only try to call the logout API if this is not a synchronized logout
      if (!isSync) {
        try {
          await axios.post(`${config.backendUrl}/api/auth/logout`, {},
            { 
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
        } catch (e) {
          // Continue with local logout even if API call fails
          console.warn('Backend logout failed, continuing with client-side logout');
        }
        
        // Notify other tabs about the logout
        localStorage.setItem(AUTH_STORAGE_KEY, Date.now().toString());
        
        // Dispatch custom event for same tab
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
      }
      
      // Clear user data and token
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('sessionExpiry');
      localStorage.removeItem('rememberMe');
      
      // Update state
      setUser(null);
      setIsAuthenticated(false);
      
      // Local event to close any open modals
      window.dispatchEvent(new CustomEvent('closeAuthModal'));
      
    } catch (error) {
      console.error('Logout error:', error);
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