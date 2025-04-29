/**
 * ForgotPassword.jsx
 * 
 * Component that handles the password reset request flow.
 * Users can enter their email to receive a password reset link.
 * 
 * Features:
 * - Email validation
 * - Error handling
 * - Loading states
 * - Success notifications
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Auth.css';

/**
 * ForgotPassword component for password reset requests
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback function when modal is closed
 * @param {Function} props.onBack - Callback function to go back to login
 * @returns {React.ReactElement} ForgotPassword form component
 */
const ForgotPassword = ({ onClose, onBack }) => {
  // Get forgotPassword function from auth context
  const { forgotPassword } = useAuth();
  
  // State management
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /**
   * Handles form submission
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi email đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {/* Success message */}
      {success && (
        <div className="success-message">
          <h3>Email đặt lại mật khẩu đã được gửi!</h3>
          <p>Vui lòng kiểm tra email của bạn để nhận hướng dẫn đặt lại mật khẩu.</p>
        </div>
      )}

      {/* Email input field */}
      <div className="form-group">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (*)"
          className="auth-input"
          required
        />
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Submit button */}
      <button 
        type="submit" 
        className="submit-button" 
        disabled={loading}
      >
        {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
      </button>

      {/* Back to login link */}
      <button 
        type="button"
        className="back-to-login" 
        onClick={onBack}
      >
        Trở lại đăng nhập
      </button>
    </form>
  );
};

export default ForgotPassword; 