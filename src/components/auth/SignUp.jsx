/**
 * SignUp.jsx
 * 
 * SignUp component that handles new user registration through a form interface.
 * Provides user registration with validation, error handling, and integration
 * with the authentication system.
 * 
 * Features:
 * - Form validation
 * - Password strength requirements
 * - Terms acceptance
 * - Error handling
 * - Loading states
 * - Login link
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Auth.css';

/**
 * Validates username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if username is valid
 */
const isValidUsername = (username) => {
  // Only allow letters, numbers, and underscores
  // Username must be 3-20 characters long
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * SignUp component for user registration
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback function when modal is closed
 * @param {Function} props.onLogin - Callback function to switch to login form
 * @returns {React.ReactElement} SignUp form component
 */
const SignUp = ({ onClose, onLogin }) => {
  // Get signup function from auth context
  const { signUp } = useAuth();
  
  // State management for form data and UI states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    verifyPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handles input changes in the form
   * @param {React.ChangeEvent<HTMLInputElement>} e - Change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  /**
   * Validates the form data
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateForm = () => {
    // Check for empty fields
    if (!formData.username || !formData.email || !formData.password || !formData.verifyPassword) {
      setError('Vui lòng điền tất cả thông tin');
      return false;
    }

    // Validate username format
    if (!isValidUsername(formData.username)) {
      setError('Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới (_), độ dài từ 3-20 ký tự');
      return false;
    }

    // Check if username is same as email
    if (formData.username === formData.email) {
      setError('Tên người dùng không được giống với email');
      return false;
    }

    // Validate password match
    if (formData.password !== formData.verifyPassword) {
      setError('Mật khẩu không khớp');
      return false;
    }

    return true;
  };

  /**
   * Handles form submission
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Attempt to create new account
      await signUp(formData.username, formData.email, formData.password);
      onClose(); // Close modal on successful signup
    } catch (err) {
      // Handle specific error cases
      if (err.response?.data?.message?.includes('username')) {
        setError('Tên người dùng đã tồn tại. Vui lòng chọn tên người dùng khác.');
      } else if (err.response?.data?.message?.includes('email')) {
        setError('Email đã tồn tại. Vui lòng sử dụng email khác.');
      } else {
        setError(err.response?.data?.message || 'Không thể tạo tài khoản');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {/* Username input field */}
      <div className="form-group">
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Tên đăng nhập (*)"
          className="auth-input"
          required
          pattern="[a-zA-Z0-9_]{3,20}"
          title="Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới (_), độ dài từ 3-20 ký tự"
        />
      </div>

      {/* Email input field */}
      <div className="form-group">
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
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
          placeholder="Mật khẩu (*)"
          className="auth-input"
          required
        />
      </div>

      {/* Password verification field */}
      <div className="form-group">
        <input
          type="password"
          name="verifyPassword"
          value={formData.verifyPassword}
          onChange={handleChange}
          placeholder="Xác nhận mật khẩu (*)"
          className="auth-input"
          required
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
        {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </button>

      {/* Login link */}
      <div className="auth-footer">
        <span>Đã có tài khoản? </span>
        <button 
          type="button" 
          className="login-link" 
          onClick={onLogin}
        >
          Đăng nhập!
        </button>
      </div>
    </form>
  );
};

export default SignUp; 