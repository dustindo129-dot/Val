/**
 * UserProfile Component
 * 
 * User profile management page that allows users to:
 * - Update profile avatar using Cloudinary
 * - Change email address
 * - Update password
 * - View profile information
 * 
 * Features:
 * - Cloudinary image upload
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
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);

  /**
   * Initialize form data with user information
   */
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
      if (user.role === 'admin') {
        fetchBannedUsers();
      } else {
        fetchBlockedUsers();
      }
    }
  }, [user]);

  const fetchBlockedUsers = async () => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/${username}/blocked`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setBlockedUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
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
      console.error('Failed to fetch banned users:', error);
    }
  };

  const handleUnblock = async (blockedUsername) => {
    try {
      await axios.delete(
        `${config.backendUrl}/api/users/${username}/block/${blockedUsername}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setBlockedUsers(prev => prev.filter(user => user.username !== blockedUsername));
      setMessage({ type: 'success', text: 'User unblocked successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unblock user' });
    }
  };

  const handleUnban = async (bannedUsername) => {
    try {
      await axios.delete(
        `${config.backendUrl}/api/users/ban/${bannedUsername}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setBannedUsers(prev => prev.filter(user => user.username !== bannedUsername));
      setMessage({ type: 'success', text: 'User unbanned successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unban user' });
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
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Uploading avatar...' });

      // Upload to Bunny.net instead of Cloudinary
      const newAvatarUrl = await bunnyUploadService.uploadFile(
        file,
        'avatars',
        config.cloudinary.uploadPresets.avatar
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
      
      setMessage({ type: 'success', text: 'Avatar updated successfully' });
      
    } catch (error) {
      console.error('Avatar upload error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to update avatar. Please try again.' 
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
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    if (!emailCurrentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Updating email...' });

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

      setMessage({ type: 'success', text: 'Email updated successfully' });
      setEmailCurrentPassword('');
    } catch (error) {
      console.error('Email update error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update email. Please try again.' 
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
      setMessage({ type: 'error', text: 'Passwords do not match' });
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
      setMessage({ type: 'success', text: 'Password updated successfully. Please log in with your new password.' });
      
      // Clear form
      setPasswordCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Log out the user after successful password change
      setTimeout(() => {
        signOut();
      }, 2000);
      
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has permission to view this profile
  if (!user || user.username !== username) {
    return <div className="container mt-4">You don't have permission to view this profile.</div>;
  }

  return (
    <div className="profile-container">
      {/* Profile header */}
      <div className="profile-header">
        <h1>Profile Settings</h1>
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
            <img
              src={avatar || '/default-avatar.png'}
              alt="Profile"
              className="profile-avatar"
            />
            <label className="avatar-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
              Change Avatar
            </label>
          </div>
        </div>

        {/* Account settings section */}
        <div className="account-settings">
          {/* Email update form */}
          <form onSubmit={handleEmailUpdate} className="settings-form">
            <h2>Email Settings</h2>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <div className="form-group">
              <label>Current Password</label>
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
              Update Email
            </button>
          </form>

          {/* Password update form */}
          <form onSubmit={handlePasswordUpdate} className="settings-form">
            <h2>Password Settings</h2>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordCurrentPassword}
                onChange={(e) => setPasswordCurrentPassword(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-control"
                disabled={isLoading}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
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
              Update Password
            </button>
          </form>
        </div>

        {/* Blocked/Banned Users Section */}
        <div className="blocked-users-section">
          <h2>{user?.role === 'admin' ? `Banned Users (${bannedUsers.length}/50)` : `Blocked Users (${blockedUsers.length}/50)`}</h2>
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
                    <span className="blocked-username">{bannedUser.username}</span>
                  </div>
                  <button
                    className="unblock-btn"
                    onClick={() => handleUnban(bannedUser.username)}
                    title="Unban user"
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
                    <span className="blocked-username">{blockedUser.username}</span>
                  </div>
                  <button
                    className="unblock-btn"
                    onClick={() => handleUnblock(blockedUser.username)}
                    title="Unblock user"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            {((user?.role === 'admin' && bannedUsers.length === 0) || 
              (!user?.role === 'admin' && blockedUsers.length === 0)) && (
              <p className="no-blocked-users">
                No {user?.role === 'admin' ? 'banned' : 'blocked'} users
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