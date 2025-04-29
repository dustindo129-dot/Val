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
import '../../styles/Auth.css';

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
      setError('Mật khẩu không khớp');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
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
      setError(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Success message */}
        <div className="success-message">
          <h3>Đặt lại mật khẩu thành công!</h3>
          <p>Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với mật khẩu mới.</p>
        </div>

        {/* Password fields */}
        <div className="form-group">
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu mới (*)"
            className="auth-input"
            required
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Xác nhận mật khẩu mới (*)"
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
          {loading ? 'Đang đặt lại mật khẩu...' : 'Đặt lại mật khẩu'}
        </button>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Reset Your Password</h2>
      <p className="form-description">
        Vui lòng nhập mật khẩu mới dưới đây.
      </p>

      {/* Password fields */}
      <div className="form-group">
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu mới (*)"
          className="auth-input"
          required
        />
      </div>

      <div className="form-group">
        <input
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Xác nhận mật khẩu mới (*)"
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
        {loading ? 'Đang đặt lại mật khẩu...' : 'Đặt lại mật khẩu'}
      </button>
    </form>
  );
};

export default ResetPassword; 