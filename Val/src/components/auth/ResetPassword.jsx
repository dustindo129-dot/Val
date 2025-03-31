/**
 * ResetPassword.jsx
 * 
 * Component that handles the password reset form.
 * Users can enter their new password after clicking the reset link from their email.
 * 
 * Features:
 * - Password validation
 * - Error handling
 * - Loading states
 * - Success notifications
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

/**
 * ResetPassword component for setting new password
 * @returns {React.ReactElement} ResetPassword form component
 */
const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const { token } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /**
   * Handles form submission
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(token, password);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-form">
        <div className="success-message">
          <h3>Password Reset Successful!</h3>
          <p>Your password has been updated. You will be redirected to login shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Reset Your Password</h2>
        <p className="form-description">
          Please enter your new password below.
        </p>

        {/* New Password input */}
        <div className="form-group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New Password"
            className="auth-input"
            required
            minLength={6}
          />
        </div>

        {/* Confirm Password input */}
        <div className="form-group">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm New Password"
            className="auth-input"
            required
            minLength={6}
          />
        </div>

        {/* Error message display */}
        {error && <div className="error-message">{error}</div>}

        {/* Submit button */}
        <button 
          type="submit" 
          className="submit-button" 
          disabled={loading}
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword; 