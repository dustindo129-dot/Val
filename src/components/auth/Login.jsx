/**
 * Login.jsx
 * 
 * Login component that handles user authentication through a form interface.
 * Provides email/password login with validation, error handling, and
 * integration with the authentication system.
 * 
 * Features:
 * - Form validation
 * - Error handling
 * - Loading states
 * - Remember me option
 * - Forgot password link
 * - Sign up link
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ForgotPassword from './ForgotPassword';
import '../../styles/Auth.css';

/**
 * Login component for user authentication
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback function when modal is closed
 * @param {Function} props.onSignUp - Callback function to switch to signup form
 * @returns {React.ReactElement} Login form component
 */
const Login = ({ onClose, onSignUp }) => {
  // Get login function from auth context
  const { login } = useAuth();
  
  // State management for form data and UI states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  /**
   * Handles input changes in the form
   * @param {React.ChangeEvent<HTMLInputElement>} e - Change event
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Handles form submission
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Attempt to login with form data and rememberMe preference
      const response = await login(formData.username, formData.password, formData.rememberMe);
      onClose(); // Close modal on successful login
    } catch (err) {
      setError('Invalid username or password');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword 
        onClose={onClose}
        onBack={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {/* Username input field */}
      <div className="form-group">
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Username (*)"
          className="auth-input"
          required
        />
      </div>
      
      {/* Password input field */}
      <div className="form-group">
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password (*)"
          className="auth-input"
          required
        />
      </div>

      {/* Remember me and forgot password options */}
      <div className="form-options">
        <label className="remember-me">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
          />
          Remember me
        </label>
        <button 
          type="button" 
          className="forgot-password-link"
          onClick={() => setShowForgotPassword(true)}
        >
          Forgot password?
        </button>
      </div>

      {/* Error message display */}
      {error && <div className="error-message">{error}</div>}

      {/* Submit button */}
      <button 
        type="submit" 
        className="submit-button" 
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Log In'}
      </button>

      {/* Sign up link */}
      <div className="auth-footer">
        <span>Don't have an account? </span>
        <button 
          type="button" 
          className="sign-up-link" 
          onClick={onSignUp}
        >
          Sign Up!
        </button>
      </div>
    </form>
  );
};

export default Login; 