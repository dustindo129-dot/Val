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

// Session timeout duration (10 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

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
   * Updates the session expiry time
   */
  const updateSessionExpiry = () => {
    const expiryTime = Date.now() + SESSION_TIMEOUT;
    localStorage.setItem('sessionExpiry', expiryTime.toString());
  };

  /**
   * Resets the session timer on user activity
   */
  const resetSessionTimer = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      updateSessionExpiry();
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
          setUser(JSON.parse(storedUser));
          updateSessionExpiry();
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
      updateSessionExpiry();
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
        localStorage.setItem('user', JSON.stringify(userData));
        updateSessionExpiry();
      }
    };

    const handleCustomEvent = (event) => {
      if (event.type === AUTH_LOGOUT_EVENT) {
        signOut(true); // Pass true to indicate this is a synchronized logout
      } else if (event.type === AUTH_LOGIN_EVENT) {
        const userData = event.detail;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        updateSessionExpiry();
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
   * @returns {Promise<Object>} Response data from login API
   */
  const login = async (username, password) => {
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
      
      // Store user data and token
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.data.token);
      updateSessionExpiry();

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
      
      // Store user data and token
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', response.data.token);
      updateSessionExpiry();
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Sign up failed');
      throw error;
    }
  };

  /**
   * Handles user logout
   * @param {boolean} isSync - Whether this is a synchronized logout from another tab
   */
  const signOut = async (isSync = false) => {
    try {
      if (!isSync) {
        // Only make the API call if this is the original logout
        await axios.post(`${config.backendUrl}/api/auth/signout`, {},
          { 
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        );

        // Notify other tabs about the logout
        localStorage.setItem(AUTH_STORAGE_KEY, Date.now().toString());
        
        // Dispatch custom event for same tab
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
      }
    } catch (error) {
      setError('Sign out failed');
    } finally {
      // Clear user data and redirect
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('sessionExpiry');
      if (window.location.pathname !== '/') {
        navigate('/');
      }
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

  // Context value object
  const value = {
    user,
    loading,
    error,
    login,
    signUp,
    signOut,
    forgotPassword,
    resetPassword,
    updateUser: setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use authentication context
 * @returns {Object} Authentication context value
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 