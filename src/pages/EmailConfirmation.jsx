import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

/**
 * EmailConfirmation Component
 * 
 * Handles email change confirmation when users click the link from their email
 * Automatically processes the confirmation and updates the user's email
 */
const EmailConfirmation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    const confirmEmailChange = async () => {
      // Prevent multiple executions
      if (hasProcessed) return;
      
      if (!token) {
        setStatus('error');
        setMessage('Token xác nhận không hợp lệ');
        setHasProcessed(true);
        return;
      }

      try {
        setHasProcessed(true);
        setStatus('processing');
        setMessage('Đang xử lý xác nhận thay đổi email...');

        const response = await axios.post(
          `${config.backendUrl}/api/users/confirm-email-change/${token}`
        );

        // Set success state first
        setStatus('success');
        setMessage(response.data.message || 'Email đã được cập nhật thành công!');
        setNewEmail(response.data.newEmail);

        // Update user context if user is logged in - do this asynchronously
        if (user && response.data.newEmail) {
          try {
            const updatedUser = { ...user, email: response.data.newEmail };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            updateUser(updatedUser);
          } catch (contextError) {
            console.warn('Failed to update user context:', contextError);
            // Don't change status to error for context update failure
          }
        }

        // Redirect to settings page after 2 seconds (reduced from 3)
        setTimeout(() => {
          try {
            if (user) {
              navigate(`/nguoi-dung/${user.displayName || user.username}/cai-dat`, { replace: true });
            } else {
              navigate('/dang-nhap', { replace: true });
            }
          } catch (navError) {
            console.error('Navigation error:', navError);
            // Fallback navigation
            window.location.href = user ? `/nguoi-dung/${user.displayName || user.username}/cai-dat` : '/dang-nhap';
          }
        }, 2000);

      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        
        if (error.response?.data?.expired) {
          setMessage('Liên kết xác nhận đã hết hạn. Vui lòng thực hiện lại yêu cầu thay đổi email.');
        } else if (error.response?.data?.emailTaken) {
          setMessage('Email này đã được sử dụng bởi tài khoản khác. Vui lòng thử với email khác.');
        } else {
          setMessage(error.response?.data?.message || 'Có lỗi xảy ra khi xác nhận thay đổi email. Vui lòng thử lại.');
        }
      }
    };

    // Only run once when component mounts
    confirmEmailChange();
  }, [token]);

  return (
    <div className="auth-container">
      <Helmet>
        <title>Xác nhận thay đổi email | Valvrareteam</title>
        <meta name="description" content="Xác nhận thay đổi địa chỉ email tại Valvrareteam" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Xác nhận thay đổi email</h1>
        </div>

        <div className="auth-content">
          {status === 'processing' && (
            <div className="status-message processing">
              <div className="loading-spinner"></div>
              <p>{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="status-message success">
              <div className="success-icon">✓</div>
              <h2>Thành công!</h2>
              <p>{message}</p>
              {newEmail && (
                <p className="new-email">
                  Email mới: <strong>{newEmail}</strong>
                </p>
              )}
              <p className="redirect-notice">
                Bạn sẽ được chuyển hướng về trang cài đặt trong giây lát...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="status-message error">
              <div className="error-icon">✗</div>
              <h2>Có lỗi xảy ra</h2>
              <p>{message}</p>
              <div className="error-actions">
                <button 
                  onClick={() => navigate('/dang-nhap')}
                  className="btn btn-primary"
                >
                  Đăng nhập
                </button>
                {user && (
                  <button 
                    onClick={() => navigate(`/nguoi-dung/${user.displayName || user.username}/cai-dat`)}
                    className="btn btn-secondary"
                  >
                    Về trang cài đặt
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation; 