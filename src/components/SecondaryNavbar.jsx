/**
 * SecondaryNavbar Component
 * 
 * Secondary navigation bar for category and filter navigation including:
 * - Genre categories
 * - Novel status filters
 * - Sort options
 * - View mode toggles
 * 
 * Features:
 * - Category filtering
 * - Status filtering
 * - Sort controls
 * - View mode switching
 * - Active state indicators
 * - Responsive design
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/SecondaryNavbar.css';
import axios from 'axios';
import config from '../config/config';

/**
 * SecondaryNavbar Component
 * 
 * Secondary navigation component that provides category and filter
 * navigation options
 * 
 * @param {Object} props - No props required
 */
const SecondaryNavbar = () => {
  // Get current location for active link highlighting
  const location = useLocation();
  // Get user authentication state for admin features
  const { user, isAuthenticated } = useAuth();
  // Get theme state and functions from unified theme context
  const { isDarkMode, toggleTheme } = useTheme();
  // State for mobile dropdown menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // State for user balance
  const [userBalance, setUserBalance] = useState(0);
  // Reference to the menu container for detecting outside clicks
  const menuRef = useRef(null);



  /**
   * Fetch user balance when authenticated
   */
  const fetchUserBalance = useCallback(async () => {
    if (isAuthenticated && user) {
      try {
        const timestamp = Date.now();
        const response = await axios.get(
          `${config.backendUrl}/api/users/${user.username}/profile`,
          { 
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            params: { _t: timestamp } // Cache busting parameter
          }
        );
        const newBalance = response.data.balance || 0;
        setUserBalance(newBalance);
      } catch (error) {
        console.error('Failed to fetch user balance:', error);
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchUserBalance();
  }, [fetchUserBalance]);

  /**
   * Listen for balance update events from other components
   */
  useEffect(() => {
    const handleBalanceUpdate = () => {
      // Small delay to ensure database transaction is committed
      setTimeout(() => {
        fetchUserBalance();
      }, 100);
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, [fetchUserBalance]);

  /**
   * Add click outside listener to close menu when clicking outside
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    // Add event listener if menu is open
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);



  /**
   * Toggles the mobile menu dropdown
   */
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  /**
   * Checks if a link matches the current location
   * @param {string} path - The path to check
   * @returns {string} 'active' class if path matches, empty string otherwise
   */
  const isActive = (path) => {
    // For paginated routes, check if the current path starts with the base path
    if (path === '/danh-sach-truyen') {
      return location.pathname.startsWith('/danh-sach-truyen') ? 'active' : '';
    }
    if (path === '/oln') {
      return location.pathname.startsWith('/oln') ? 'active' : '';
    }
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="secondary-navbar">
      <div className="nav-container">
        {/* Hamburger menu icon for mobile */}
        <div className="mobile-menu-container" ref={menuRef}>
          <button className={`menu-toggle ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}>
            <span className="menu-icon"></span>
          </button>
          
          {/* Main navigation links */}
          <div className={`nav-links ${isMenuOpen ? 'show' : ''}`}>
            <Link to="/" className={`nav-link ${isActive('/')}`} onClick={() => setIsMenuOpen(false)}>
              Trang chủ
            </Link>
            <Link to="/danh-sach-truyen/trang/1" className={`nav-link ${isActive('/danh-sach-truyen')}`} onClick={() => setIsMenuOpen(false)}>
              Danh sách truyện
            </Link>
            <Link to="/oln/trang/1" className={`nav-link ${isActive('/oln')}`} onClick={() => setIsMenuOpen(false)}>
              Truyện sáng tác
            </Link>

            {/* Market link - visible to everyone */}
            <Link to="/bang-yeu-cau" className={`nav-link ${isActive('/bang-yeu-cau')}`} onClick={() => setIsMenuOpen(false)}>
              Bảng yêu cầu
            </Link>
            {/* Admin, Moderator and Project User dashboard link */}
            {(user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'pj_user') && (
              <Link to="/bang-quan-tri" className={`nav-link ${isActive('/bang-quan-tri')}`} onClick={() => setIsMenuOpen(false)}>
                Bảng quản trị
              </Link>
            )}
          </div>
        </div>
        
        {/* Button group for User Balance, Top-up and Theme toggle */}
        <div className="button-group">
          {/* User Balance - only visible when logged in */}
          {isAuthenticated && (
            <div className="user-balance">
              <span>🌾: {userBalance}</span>
            </div>
          )}
          
          {/* Top-up button - visible to everyone */}
          <Link 
            to={isAuthenticated ? "/nap-tien" : "#"} 
            className="top-up-button"
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                window.dispatchEvent(new Event('openLoginModal'));
              }
            }}
          >
            Nạp thêm
          </Link>
          
          {/* Theme toggle button */}
          <button onClick={toggleTheme} className="theme-toggle">
            {isDarkMode ? <><i className="fa-solid fa-sun"></i> Bật đèn</> : <><i className="fa-solid fa-moon"></i> Tắt đèn</>}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default SecondaryNavbar; 