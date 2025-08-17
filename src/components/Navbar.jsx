/**
 * Navbar Component
 * 
 * Main navigation bar for the application including:
 * - Site logo and branding
 * - Navigation links
 * - Search functionality
 * - User authentication controls
 * - Responsive menu
 * 
 * Features:
 * - Responsive design
 * - Search bar with suggestions
 * - User menu dropdown
 * - Authentication status display
 * - Mobile-friendly hamburger menu
 * - Active link highlighting
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarkContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Login from './auth/Login';
import SignUp from './auth/SignUp';
import NotificationDropdown from './NotificationDropdown';
import axios from 'axios';
import '../styles/Navbar.css';
import config from '../config/config';
import Modal from './auth/Modal';
import cdnConfig from '../config/bunny';
import { createUniqueSlug, generateUserBookmarksUrl, generateUserSettingsUrl, generateUserProfileUrl, generateNovelUrl } from '../utils/slugUtils';
import { translateStatus } from '../utils/statusTranslation';
import api from '../services/api';
import sseService from '../services/sseService';

/**
 * Navbar Component
 * 
 * Main navigation component that provides site-wide navigation
 * and user interface controls
 * 
 * @param {Object} props - No props required
 */
const Navbar = () => {
  // State management for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  
  // State management for authentication modals
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  
  // Authentication context and navigation
  // Add null check to prevent destructuring errors during hot reloads
  const authResult = useAuth();
  const { user, signOut } = authResult || { 
    user: null, 
    signOut: () => {} 
  };
  const { bookmarkedNovels } = useBookmarks();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Add state for dropdown
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Add state for notification dropdown
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Add ref for search container to handle outside clicks
  const searchContainerRef = useRef(null);

  // Add effect to handle clicking outside search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        // Click was outside search container, clear search results
        setSearchResults([]);
        setError("");
      }
    };

    // Only add listener if there are search results or error to dismiss
    if (searchResults.length > 0 || error) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchResults, error]);

  // Fetch unread notification count (no polling, only initial load and manual refetch)
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: () => api.getUnreadNotificationCount(),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes - don't refetch if data is less than 2 minutes old
    cacheTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch when reconnecting
    refetchInterval: false // Disable automatic refetching
  });

  // Set up SSE listeners for real-time unread count updates
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = (data) => {
      // Only handle notifications for the current user
      if (data.userId === user.id || data.userId === user._id) {
        console.log('New notification received, updating unread count');
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    const handleNotificationRead = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        console.log('Notification marked as read, updating unread count');
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    const handleNotificationsCleared = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        console.log('All notifications cleared, setting unread count to 0');
        queryClient.setQueryData(['unreadNotificationCount'], 0);
      }
    };

    const handleNotificationsDeleted = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        queryClient.setQueryData(['unreadNotificationCount'], 0);
      }
    };

    const handleNotificationDeleted = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        console.log('Individual notification deleted, updating unread count');
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    // Add SSE event listeners
    sseService.addEventListener('new_notification', handleNewNotification);
    sseService.addEventListener('notification_read', handleNotificationRead);
    sseService.addEventListener('notifications_cleared', handleNotificationsCleared);
    sseService.addEventListener('notifications_deleted', handleNotificationsDeleted);
    sseService.addEventListener('notification_deleted', handleNotificationDeleted);

    // Clean up on unmount or user change
    return () => {
      sseService.removeEventListener('new_notification', handleNewNotification);
      sseService.removeEventListener('notification_read', handleNotificationRead);
      sseService.removeEventListener('notifications_cleared', handleNotificationsCleared);
      sseService.removeEventListener('notifications_deleted', handleNotificationsDeleted);
      sseService.removeEventListener('notification_deleted', handleNotificationDeleted);
    };
  }, [user, queryClient]);

  // Initial fetch when user logs in
  useEffect(() => {
    if (user) {
      refetchUnreadCount();
    }
  }, [user, refetchUnreadCount]);

  // Add event listener for openLoginModal event
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setShowLogin(true);
      setShowSignUp(false);
    };

    window.addEventListener('openLoginModal', handleOpenLoginModal);

    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
    };
  }, []);

  // Add event listener for login events to immediately refetch notifications
  useEffect(() => {
    const handleAuthLogin = () => {
      // Immediately refetch unread count when user logs in
      refetchUnreadCount();
    };

    window.addEventListener('authLogin', handleAuthLogin);

    return () => {
      window.removeEventListener('authLogin', handleAuthLogin);
    };
  }, [refetchUnreadCount]);

  /**
   * Handles the search input changes and fetches results
   * @param {Event} e - The input change event
   */
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Validate search query length
    if (value.length > 0 && value.length < 3) {
      setError("Vui lòng nhập ít nhất 3 ký tự...");
      setSearchResults([]);
    } else if (value.length >= 3) {
      try {
        // Fetch search results from API
        const response = await axios.get(`${config.backendUrl}/api/novels/search?title=${encodeURIComponent(value)}`);
        setSearchResults(response.data.slice(0, 5)); // Only take first 5 results
        setError("");
      } catch (err) {
        console.error('Search failed:', err);
        setError("Không thể tìm kiếm truyện");
        setSearchResults([]);
      }
    } else {
      setError("");
      setSearchResults([]);
    }
  };

  /**
   * Handles navigation when a search result is clicked
   * @param {Object} novel - The novel object with _id and title
   */
  const handleNovelClick = (novel) => {
    const localizedUrl = generateNovelUrl(novel);
    navigate(localizedUrl);
    setSearchQuery("");
    setSearchResults([]);
    setError("");
  };

  /**
   * Prevents default form submission
   * @param {Event} e - The form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  /**
   * Handles user logout
   */
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  /**
   * Shows the login modal and hides signup modal
   */
  const handleLoginClick = () => {
    setShowLogin(true);
    setShowSignUp(false);
  };

  /**
   * Shows the signup modal and hides login modal
   */
  const handleSignUpClick = () => {
    setShowSignUp(true);
    setShowLogin(false);
  };

  /**
   * Closes both login and signup modals
   */
  const handleCloseModals = () => {
    setShowLogin(false);
    setShowSignUp(false);
  };

  /**
   * Toggles the user dropdown menu
   */
  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  /**
   * Closes the dropdown menu
   */
  const closeDropdown = () => {
    setShowDropdown(false);
  };

  /**
   * Toggles the notification dropdown
   */
  const toggleNotificationDropdown = () => {
    setShowNotificationDropdown(prev => !prev);
    // Close user dropdown if it's open
    if (showDropdown) {
      setShowDropdown(false);
    }
  };

  /**
   * Closes the notification dropdown
   */
  const closeNotificationDropdown = () => {
    setShowNotificationDropdown(false);
  };

  // Add event listener to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('.user-dropdown-container');
      const notificationDropdown = document.querySelector('.notification-dropdown-container');
      const notificationButton = document.querySelector('.notification-icon-only');
      
      if (dropdown && !dropdown.contains(event.target)) {
        closeDropdown();
      }
      
      // Only close notification dropdown if clicking outside both the dropdown and the bell icon
      if (notificationDropdown && !notificationDropdown.contains(event.target) && 
          notificationButton && !notificationButton.contains(event.target)) {
        closeNotificationDropdown();
      }
    };

    if (showDropdown || showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showNotificationDropdown]);

  return (
    <>
      {/* Main navigation bar */}
      <nav className="navbar">
        {/* Navbar content container */}
        <div className="navbar-content">
          {/* Left section with logo and site title */}
          <Link to="/" className="navbar-left">
            <img 
              src="/images/Khong_Co_Tieu_e431_20250703112444.png" 
              alt="Valvrareteam Logo" 
              className="navbar-logo"
            />
            <div className="title-container">
              <h1 className="navbar-title">Valvrareteam</h1>
            </div>
          </Link>
          
          {/* Search section */}
          <div className="search-container" ref={searchContainerRef}>
            <form onSubmit={handleSubmit} className="search-form">
              <div className="search-input-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Tìm kiếm truyện..."
                  className="search-input"
                />
                {/* Clear search button */}
                <button 
                  type="button" 
                  className="clear-search" 
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setError("");
                  }}
                >
                  ×
                </button>
                {/* Search button with icon */}
                <button type="submit" className="search-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>
              {/* Error message display */}
              {error && <div className="search-error">{error}</div>}
              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(novel => (
                    <div 
                      key={novel._id} 
                      className="search-result-item"
                      onClick={() => handleNovelClick(novel)}
                    >
                      <img 
                        src={cdnConfig.getIllustrationUrl(novel.illustration)}
                        alt={novel.title} 
                        className="search-result-cover"
                        onError={(e) => {
                          e.target.src = cdnConfig.getIllustrationUrl(null);
                        }}
                      />
                      <div className="search-result-info">
                        <div className="search-result-title">{novel.title}</div>
                        <div className="search-result-details">
                          <span>Tổng chương: {novel.totalChapters || 0}</span>{' '}
                          <span>{translateStatus(novel.status)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Right section with auth buttons */}
          <div className="navbar-right">
            {/* Auth buttons */}
            {user ? (
              // Logged in user menu
              <div className="auth-buttons">
                <div className="notification-dropdown-container">
                  <button 
                    className="notification-icon-only"
                    onClick={toggleNotificationDropdown}
                    title="Thông báo"
                  >
                    <i className="fa-regular fa-bell"></i>
                    {unreadCount > 0 && (
                      <span className="notification-count">{unreadCount}</span>
                    )}
                  </button>
                  <NotificationDropdown 
                    isOpen={showNotificationDropdown}
                    onClose={closeNotificationDropdown}
                    user={user}
                  />
                </div>
                <Link to={generateUserBookmarksUrl(user)} className="bookmark-icon-only">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="bookmark-icon"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                  {bookmarkedNovels && bookmarkedNovels.length > 0 && (
                    <span className="bookmark-count">{bookmarkedNovels.length}</span>
                  )}
                </Link>
                <div className="navbar-user-info">
                  <span className="navbar-user-username">{user.displayName || user.username}</span>
                  <div className="user-dropdown-container">
                    <div className="navbar-user-avatar" onClick={toggleDropdown}>
                      <img 
                        src={cdnConfig.getAvatarUrl(user.avatar)} 
                        alt={`${user.displayName || user.username}'s avatar`} 
                        className="avatar-image"
                      />
                    </div>
                                          {showDropdown && (
                        <div className="user-dropdown">
                          <Link to={generateUserProfileUrl(user)} className="dropdown-item" onClick={closeDropdown}>
                            Trang cá nhân
                          </Link>
                          {user?.role === 'admin' && (
                            <Link to="/topup-management" className="dropdown-item" onClick={closeDropdown}>
                              Quản lý giao dịch
                            </Link>
                          )}
                          <Link to={generateUserSettingsUrl(user)} className="dropdown-item" onClick={closeDropdown}>
                            Cài đặt
                          </Link>
                          <button onClick={() => {handleLogout(); closeDropdown();}} className="dropdown-item">
                            Đăng xuất
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ) : (
              // Guest user menu
              <div className="auth-buttons">
                <button onClick={handleLoginClick} className="auth-button login">
                  Đăng nhập
                </button>
                <button onClick={handleSignUpClick} className="auth-button sign-up">
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Login modal */}
      <Modal 
        isOpen={showLogin} 
        onClose={handleCloseModals}
        title="Đăng nhập"
      >
        <Login onClose={handleCloseModals} onSignUp={handleSignUpClick} />
      </Modal>

      {/* Signup modal */}
      <Modal 
        isOpen={showSignUp} 
        onClose={handleCloseModals}
        title="Đăng ký"
      >
        <SignUp onClose={handleCloseModals} onLogin={handleLoginClick} />
      </Modal>
    </>
  );
};

export default Navbar; 