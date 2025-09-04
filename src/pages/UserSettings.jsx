/**
 * UserSettings Component
 * 
 * User settings management page that allows users to:
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

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import '../styles/UserSettings.css';
import config from '../config/config';
import ReportPanel from '../components/ReportPanel';
import bunnyUploadService from '../services/bunnyUploadService';
import LoadingSpinner from '../components/LoadingSpinner';
import cdnConfig from '../config/bunny';

/**
 * UserSettingsSEO Component
 * 
 * Provides SEO optimization for the UserSettings page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const UserSettingsSEO = ({ user, username }) => {
  const displayName = user?.displayName || username;
  
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{`Cài Đặt - ${displayName} | Valvrareteam`}</title>
      <meta name="description" content={`Cài đặt tài khoản của ${displayName} tại Valvrareteam. Cài đặt thông tin cá nhân, thay đổi avatar, email và mật khẩu.`} />
      <meta name="keywords" content="cài đặt, cài đặt tài khoản, thay đổi thông tin, avatar, email, mật khẩu, valvrareteam" />
      <meta name="robots" content="noindex, nofollow" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content={`Cài Đặt - ${displayName} | Valvrareteam`} />
      <meta property="og:description" content={`Cài đặt tài khoản của ${displayName} tại Valvrareteam.`} />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content={`https://valvrareteam.net/nguoi-dung/${user?.userNumber || username}/cai-dat`} />
      <meta property="og:type" content="profile" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`Cài Đặt - ${displayName} | Valvrareteam`} />
      <meta name="twitter:description" content={`Cài đặt tài khoản của ${displayName} tại Valvrareteam.`} />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
    </Helmet>
  );
};

/**
 * UserSettings Component
 * 
 * Main component for user settings management
 */
const UserSettings = () => {
  // Get userNumber from URL parameters
  const { userNumber } = useParams();
  // Get user context and update function
  // Add null check to prevent destructuring errors during hot reloads
  const authResult = useAuth();
  const { user, updateUser, signOut } = authResult || { 
    user: null, 
    updateUser: () => {}, 
    signOut: () => {} 
  };
  
  // State management for form data
  const [avatar, setAvatar] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
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
  const [resolvedUser, setResolvedUser] = useState(null);
  const [userResolutionLoading, setUserResolutionLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState([]);
  
  // Use ref to prevent duplicate API calls
  const fetchedRef = useRef(false);
  const currentUserNumberRef = useRef(null);
  const currentRequestId = useRef(0);

  /**
   * Fetch consolidated settings data
   */
  useEffect(() => {
    
    // If userNumber changed, reset the fetch flag
    if (currentUserNumberRef.current !== userNumber) {
      fetchedRef.current = false;
      currentUserNumberRef.current = null;
    }
    
    // Check if we've already fetched for this userNumber
    if (fetchedRef.current && currentUserNumberRef.current === userNumber) {
      return;
    }
    
    // Mark as fetching IMMEDIATELY to prevent race conditions
    fetchedRef.current = true;
    currentUserNumberRef.current = userNumber;
    
    // Create a unique request ID for this fetch
    const requestId = ++currentRequestId.current;
    
    const fetchSettingsData = async () => {
      if (!userNumber) return;
      
      try {
        setUserResolutionLoading(true);
        
        // Fetch all settings data in one request
        const response = await axios.get(
          `${config.backendUrl}/api/users/number/${userNumber}/settings-data`,
          { 
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('token')}` 
            }
          }
        );
        
        
        // Check if this is still the latest request
        if (requestId !== currentRequestId.current) {
          return;
        }
        
        const data = response.data;
        setResolvedUser(data);
        
        // Set other state based on the response
        if (data.displayNameLastChanged) {
          const nextChange = new Date(data.displayNameLastChanged);
          nextChange.setMonth(nextChange.getMonth() + 1);
          setNextDisplayNameChange(nextChange);
          
          // Check if enough time has passed (current date is past the next change date)
          const now = new Date();
          const canChange = now >= nextChange;
          setCanChangeDisplayName(canChange);
        } else {
          setCanChangeDisplayName(true);
          setNextDisplayNameChange(null);
        }
        
        // Set initial form values
        setCurrentEmail(data.email || '');
        setAvatar(data.avatar || '');
        setDisplayName(data.displayName || data.username || '');
        
        // Set banned users list if admin
        if (data.bannedUsers) {
          setBannedUsers(data.bannedUsers);
        }
        
        // Set blocked users list if available
        if (data.blockedUsers) {
          setBlockedUsers(data.blockedUsers);
        }
        
        // Set pending reports if admin/moderator
        if (data.pendingReports) {
          setPendingReports(data.pendingReports);
        }
        
        
      } catch (error) {
        // Only update state if this is still the latest request
        if (requestId === currentRequestId.current) {
          setResolvedUser(null);
          // Reset fetch flag on error so we can retry
          fetchedRef.current = false;
          currentUserNumberRef.current = null;
        }
      } finally {
        // Only set loading to false if this is still the latest request
        if (requestId === currentRequestId.current) {
          setUserResolutionLoading(false);
        } else {
        }
      }
    };
    
    fetchSettingsData();
  }, [userNumber]);

  /**
   * Update currentEmail when user email changes
   * This ensures the form shows the correct current email after email changes
   */
  useEffect(() => {
    if (user?.email) {
      setCurrentEmail(user.email);
    }
  }, [user?.email]);

  // Remove this function since we now get this data from the consolidated endpoint

  // Remove this function since we now get blocked users from the consolidated endpoint

  const handleUnblock = async (blockedUsername) => {
    try {
      await axios.delete(
        `${config.backendUrl}/api/users/number/${userNumber}/block/${blockedUsername}`,
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
        `/api/users/number/${userNumber}/avatar`,
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
        `/api/users/number/${userNumber}/display-name`,
        { displayName: displayName.trim() }
      );

      // Update user data in localStorage and AuthContext
      const updatedUser = { ...user, displayName: response.data.displayName };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateUser(updatedUser);

      setMessage({ type: 'success', text: 'Tên hiển thị đã được cập nhật thành công' });
      
      // Update eligibility status - user just changed their display name, so they can't change it again for 1 month
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
    
    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
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
        `/api/users/number/${userNumber}/email`,
        {
          email: newEmail,
          currentPassword: emailCurrentPassword
        }
      );

      // Check if response indicates confirmation is required
      if (response.data.requiresConfirmation) {
        setMessage({ 
          type: 'info', 
          text: 'Email xác nhận đã được gửi đến địa chỉ email hiện tại của bạn. Vui lòng kiểm tra email và nhấp vào liên kết xác nhận để hoàn tất thay đổi.' 
        });
        setNewEmail('');
        setEmailCurrentPassword('');
      } else {
        // Fallback for direct email update (if confirmation is disabled)
        const updatedUser = { ...user, email: response.data.email };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        updateUser(updatedUser);
        setMessage({ type: 'success', text: 'Email đã được cập nhật thành công' });
        setEmailCurrentPassword('');
      }
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
        `/api/users/number/${userNumber}/password`,
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

  // Show loading while resolving user
  if (userResolutionLoading) {
    return (
      <div className="container mt-4">
        <LoadingSpinner size="medium" text="Đang tải..." />
      </div>
    );
  }

  // Check if user exists and has permission to view this profile
  if (!user || !resolvedUser || user.username !== resolvedUser.username) {
    return <div className="container mt-4">Bạn không có quyền xem trang cài đặt này.</div>;
  }

      return (
      <div className="settings-container">
        <UserSettingsSEO user={user} username={resolvedUser.displayName || resolvedUser.username} />
      {/* Settings header */}
      <div className="settings-header">
        <h1>Cài đặt tài khoản</h1>
      </div>

      {/* Status message display */}
      {message.text && (
        <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      <div className="settings-content">
        {/* Avatar section */}
        <div className="avatar-section">
          <div className="avatar-container">
            <div className="avatar-wrapper">
              <img
                src={cdnConfig.getAvatarUrl(avatar)}
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
            <h2 className="profile-username">{user?.displayName || resolvedUser?.displayName || resolvedUser?.username}</h2>
          </div>
        </div>

        {/* Account settings section */}
        <div className="account-settings">
          {/* Email update form */}
          <form onSubmit={handleEmailUpdate} className="settings-form">
            <h2>Cài đặt email</h2>
            <div className="settings-form-group">
              <label>Email hiện tại</label>
              <input
                type="email"
                value={currentEmail}
                className="form-control"
                disabled={true}
                readOnly
                style={{ 
                  backgroundColor: '#f8f9fa', 
                  cursor: 'not-allowed',
                  color: '#6c757d'
                }}
              />
            </div>
            <div className="settings-form-group">
              <label>Email mới</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="form-control"
                disabled={isLoading}
                placeholder="Nhập địa chỉ email mới"
                required
              />
            </div>
            <div className="settings-form-group">
              <label>Mật khẩu hiện tại</label>
              <input
                type="password"
                value={emailCurrentPassword}
                onChange={(e) => setEmailCurrentPassword(e.target.value)}
                className="form-control"
                disabled={isLoading}
                placeholder="Nhập mật khẩu hiện tại để xác nhận"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading || !newEmail.trim()}>
              Cập nhật email
            </button>
          </form>

          {/* Display name update form */}
          <form onSubmit={handleDisplayNameUpdate} className="settings-form">
            <h2>Cài đặt tên hiển thị</h2>
            <div className="settings-form-group">
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
                Tên hiển thị sẽ được hiển thị thay vì tên người dùng trong các bình luận và trang cá nhân. Cho phép chữ cái, số, khoảng trắng và các ký tự Việt Nam. Không được chứa ký tự đặc biệt (được phép cập nhật 1 lần mỗi tháng).
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
            <div className="settings-form-group">
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
            <div className="settings-form-group">
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
            <div className="settings-form-group">
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
          <h2>{user?.role === 'admin' ? `Danh sách đen (${bannedUsers.length}/50)` : `Người dùng bị chặn (${blockedUsers.length}/50)`}</h2>
          <div className="blocked-users-list">
            {user?.role === 'admin' ? (
              bannedUsers.map(bannedUser => (
                <div key={bannedUser._id} className="blocked-user-item">
                  <div className="blocked-user-info">
                    <img 
                      src={cdnConfig.getAvatarUrl(bannedUser.avatar)} 
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
                      src={cdnConfig.getAvatarUrl(blockedUser.avatar)} 
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
              (user?.role !== 'admin' && blockedUsers.length === 0)) && (
              <p className="no-blocked-users">
                {user?.role === 'admin' ? 'Không có ai trong danh sách đen' : 'Không có người dùng bị chặn'}
              </p>
            )}
          </div>
        </div>

        {/* Reports Section - Only visible for admins and moderators */}
        {(user?.role === 'admin' || user?.role === 'moderator') && (
          <div className="reports-section">
            <ReportPanel user={user} reports={pendingReports} />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettings;