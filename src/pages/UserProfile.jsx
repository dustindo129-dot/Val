/**
 * UserProfile Component
 * 
 * User profile management page that allows users to:
 * - Update profile avatar
 * - Change email address
 * - Update password
 * - View profile information
 * 
 * Features:
 * - Image upload
 * - Form validation
 * - Error handling
 * - Loading states
 * - Success notifications
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/UserProfile.css';
import config from '../config/config';
import ReportPanel from '../components/ReportPanel';
import bunnyUploadService from '../services/bunnyUploadService';

/**
 * UserProfile Component
 * 
 * Main component for user profile management
 */
const UserProfile = () => {
  // Get username from URL parameters
  const { username } = useParams();
  // Get user context and update function
  const { user, updateUser, signOut } = useAuth();
  
  // State management for form data
  const [avatar, setAvatar] = useState('');
  const [email, setEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [canChangeDisplayName, setCanChangeDisplayName] = useState(true);
  const [nextDisplayNameChange, setNextDisplayNameChange] = useState(null);

  /**
   * Initialize form data with user information
   */
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
      setDisplayName(user.displayName || user.username || '');
      
      // Check if user can change display name
      checkDisplayNameChangeEligibility();
      
      if (user.role === 'admin') {
        fetchBannedUsers();
      } else {
        fetchBlockedUsers();
      }
    }
  }, [user]);

  const checkDisplayNameChangeEligibility = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/${username}/profile`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.displayNameLastChanged) {
        const lastChanged = new Date(response.data.displayNameLastChanged);
        const oneMonthLater = new Date(lastChanged);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        
        const now = new Date();
        if (now < oneMonthLater) {
          setCanChangeDisplayName(false);
          setNextDisplayNameChange(oneMonthLater);
        } else {
          setCanChangeDisplayName(true);
          setNextDisplayNameChange(null);
        }
      } else {
        setCanChangeDisplayName(true);
        setNextDisplayNameChange(null);
      }
    } catch (error) {
      console.error('Error checking display name eligibility:', error);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/${username}/blocked`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setBlockedUsers(response.data);
    } catch (error) {
      console.error('Không thể tải người dùng bị chặn:', error);
    }
  };

  const fetchBannedUsers = async () => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/banned`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setBannedUsers(response.data);
    } catch (error) {
      console.error('Không thể tải người dùng bị chặn:', error);
    }
  };

  const handleUnblock = async (blockedUsername) => {
    try {
      await axios.delete(
        `${config.backendUrl}/api/users/${username}/block/${blockedUsername}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setBlockedUsers(prev => prev.filter(user => user.username !== blockedUsername));
      setMessage({ type: 'success', text: 'Người dùng đã được mở chặn thành công' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể mở chặn người dùng' });
    }
  };

  const handleUnban = async (bannedUsername) => {
    try {
      await axios.delete(
        `${config.backendUrl}/api/users/ban/${bannedUsername}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setBannedUsers(prev => prev.filter(user => user.username !== bannedUsername));
      setMessage({ type: 'success', text: 'Người dùng đã được mở chặn thành công' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể mở chặn người dùng' });
    }
  };

  /**
   * Handles avatar file change and upload
   * @param {Event} e - File input change event
   */
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.match('image.*')) {
      setMessage({ type: 'error', text: 'Vui lòng chọn tệp ảnh' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setMessage({ type: 'error', text: 'Kích thước ảnh phải nhỏ hơn 5MB' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Đang tải ảnh đại diện...' });

      // Upload to Bunny.net
      const newAvatarUrl = await bunnyUploadService.uploadFile(
        file,
        'avatar'
      );

      // Create axios instance with proper config
      const api = axios.create({
        baseURL: config.backendUrl,
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      // Send avatar URL to backend
      await api.post(
        `/api/users/${username}/avatar`,
        {
          avatar: newAvatarUrl
        }
      );
      
      // Update both local state and localStorage
      setAvatar(newAvatarUrl);
      
      // Update user data in localStorage and AuthContext
      const updatedUser = { ...user, avatar: newAvatarUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateUser(updatedUser);
      
      setMessage({ type: 'success', text: 'Ảnh đại diện đã được cập nhật thành công' });
      
    } catch (error) {
      console.error('Lỗi tải ảnh đại diện:', error);
      setMessage({ 
        type: 'error', 
        text: 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles display name update form submission
   * @param {Event} e - Form submission event
   */
  const handleDisplayNameUpdate = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setMessage({ type: 'error', text: 'Tên hiển thị không được để trống' });
      return;
    }

    if (displayName.trim().length > 50) {
      setMessage({ type: 'error', text: 'Tên hiển thị không được vượt quá 50 ký tự' });
      return;
    }

    if (!canChangeDisplayName) {
      setMessage({ type: 'error', text: 'Bạn chỉ có thể thay đổi tên hiển thị một lần mỗi tháng' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Đang cập nhật tên hiển thị...' });

      const api = axios.create({
        baseURL: config.backendUrl,
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const response = await api.put(
        `/api/users/${username}/display-name`,
        { displayName: displayName.trim() }
      );

      // Update user data in localStorage and AuthContext
      const updatedUser = { ...user, displayName: response.data.displayName };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateUser(updatedUser);

      setMessage({ type: 'success', text: 'Tên hiển thị đã được cập nhật thành công' });
      
      // Update eligibility status
      setCanChangeDisplayName(false);
      const nextChange = new Date();
      nextChange.setMonth(nextChange.getMonth() + 1);
      setNextDisplayNameChange(nextChange);
      
    } catch (error) {
      console.error('Display name update error:', error);
      let errorMessage = 'Không thể cập nhật tên hiển thị. Vui lòng thử lại.';
      
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('already taken')) {
          errorMessage = 'Tên hiển thị này đã được sử dụng. Vui lòng chọn tên khác.';
        } else {
          errorMessage = error.response.data.message;
        }
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles email update form submission
   * @param {Event} e - Form submission event
   */
  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Vui lòng nhập địa chỉ email hợp lệ' });
      return;
    }

    if (!emailCurrentPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Đang cập nhật email...' });

      // Create axios instance with proper config
      const api = axios.create({
        baseURL: config.backendUrl,
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const response = await api.put(
        `/api/users/${username}/email`,
        {
          email,
          currentPassword: emailCurrentPassword
        }
      );

      // Update user data in localStorage and AuthContext
      const updatedUser = { ...user, email: response.data.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateUser(updatedUser);

      setMessage({ type: 'success', text: 'Email đã được cập nhật thành công' });
      setEmailCurrentPassword('');
    } catch (error) {
      console.error('Email update error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Không thể cập nhật email. Vui lòng thử lại.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles password update form submission
   * @param {Event} e - Form submission event
   */
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu không khớp' });
      return;
    }

    try {
      setIsLoading(true);
      await axios.put(
        `/api/users/${username}/password`,
        {
          currentPassword: passwordCurrentPassword,
          newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setMessage({ type: 'success', text: 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại với mật khẩu mới.' });
      
      // Clear form
      setPasswordCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Log out the user after successful password change
      setTimeout(() => {
        signOut();
      }, 2000);
      
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể cập nhật mật khẩu' });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has permission to view this profile
  if (!user || user.username !== username) {
    return <div className="container mt-4">Bạn không có quyền xem trang cá nhân này.</div>;
  }

  return (
    <div className="profile-container">
      {/* Profile header */}
      <div className="profile-header">
        <h1>Cài đặt trang cá nhân</h1>
      </div>

      {/* Status message display */}
      {message.text && (
        <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      <div className="profile-content">
        {/* Avatar section */}
        <div className="avatar-section">
          <div className="avatar-container">
            <div className="avatar-wrapper">
              <img
                src={avatar || '/default-avatar.png'}
                alt="Profile"
                className="profile-avatar"
              />
              <label className="avatar-upload-overlay">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isLoading}
                  style={{ display: 'none' }}
                />
                <i className="fa-solid fa-camera"></i>
              </label>
            </div>
            <h2 className="profile-username">{user?.displayName || username}</h2>
          </div>
        </div>

        {/* Account settings section */}
        <div className="account-settings">
          {/* Email update form */}
          <form onSubmit={handleEmailUpdate} className="settings-form">
            <h2>Cài đặt email</h2>
            <div className="profile-form-group">
              <label>Địa chỉ Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <div className="profile-form-group">
              <label>Mật khẩu hiện tại</label>
              <input
                type="password"
                value={emailCurrentPassword}
                onChange={(e) => setEmailCurrentPassword(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              Cập nhật email
            </button>
          </form>

          {/* Display name update form */}
          <form onSubmit={handleDisplayNameUpdate} className="settings-form">
            <h2>Cài đặt tên hiển thị</h2>
            <div className="profile-form-group">
              <label>Tên hiển thị</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-control"
                disabled={isLoading || !canChangeDisplayName}
                maxLength={50}
                required
              />
              <small className="form-text">
                Tên hiển thị sẽ được hiển thị thay vì tên người dùng trong các bình luận và trang cá nhân.
              </small>
              {!canChangeDisplayName && nextDisplayNameChange && (
                <small className="form-text text-warning">
                  Bạn có thể thay đổi tên hiển thị tiếp theo vào ngày: {new Date(nextDisplayNameChange).toLocaleDateString('vi-VN')}
                </small>
              )}
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading || !canChangeDisplayName}
            >
              {canChangeDisplayName ? 'Cập nhật tên hiển thị' : 'Không thể thay đổi'}
            </button>
          </form>

          {/* Password update form */}
          <form onSubmit={handlePasswordUpdate} className="settings-form">
            <h2>Cài đặt mật khẩu</h2>
            <div className="profile-form-group">
              <label>Mật khẩu hiện tại</label>
              <input
                type="password"
                value={passwordCurrentPassword}
                onChange={(e) => setPasswordCurrentPassword(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <div className="profile-form-group">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <div className="profile-form-group">
              <label>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              Cập nhật mật khẩu
            </button>
          </form>
        </div>

        {/* Blocked/Banned Users Section */}
        <div className="blocked-users-section">
          <h2>{user?.role === 'admin' ? `Người dùng bị cấm (${bannedUsers.length}/50)` : `Người dùng bị chặn (${blockedUsers.length}/50)`}</h2>
          <div className="blocked-users-list">
            {user?.role === 'admin' ? (
              bannedUsers.map(bannedUser => (
                <div key={bannedUser._id} className="blocked-user-item">
                  <div className="blocked-user-info">
                    <img 
                      src={bannedUser.avatar || '/default-avatar.png'} 
                      alt={`${bannedUser.username}'s avatar`} 
                      className="blocked-user-avatar"
                    />
                    <span className="blocked-username">{bannedUser.displayName || bannedUser.username}</span>
                  </div>
                  <button
                    className="unblock-btn"
                    onClick={() => handleUnban(bannedUser.username)}
                    title="Mở chặn người dùng"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              blockedUsers.map(blockedUser => (
                <div key={blockedUser._id} className="blocked-user-item">
                  <div className="blocked-user-info">
                    <img 
                      src={blockedUser.avatar || '/default-avatar.png'} 
                      alt={`${blockedUser.username}'s avatar`} 
                      className="blocked-user-avatar"
                    />
                    <span className="blocked-username">{blockedUser.displayName || blockedUser.username}</span>
                  </div>
                  <button
                    className="unblock-btn"
                    onClick={() => handleUnblock(blockedUser.username)}
                    title="Mở chặn người dùng"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            {((user?.role === 'admin' && bannedUsers.length === 0) || 
              (!user?.role === 'admin' && blockedUsers.length === 0)) && (
              <p className="no-blocked-users">
                Không có người dùng bị {user?.role === 'admin' ? 'banned' : 'blocked'}
              </p>
            )}
          </div>
        </div>

        {/* Reports Section - Only visible for admins and moderators */}
        {(user?.role === 'admin' || user?.role === 'moderator') && (
          <div className="reports-section">
            <ReportPanel user={user} />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 