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
import { useState, useEffect, useRef } from 'react';
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
  // State for dark mode toggle
  const [isDarkMode, setIsDarkMode] = useState(false);
  // State for mobile dropdown menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // State for user balance
  const [userBalance, setUserBalance] = useState(0);
  // Reference to the menu container for detecting outside clicks
  const menuRef = useRef(null);

  /**
   * Initialize theme from localStorage on component mount
   */
  useEffect(() => {
    // Check if user has a theme preference in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  /**
   * Fetch user balance when authenticated
   */
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await axios.get(
            `${config.backendUrl}/api/users/${user.username}/profile`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setUserBalance(response.data.balance || 0);
        } catch (error) {
          console.error('Failed to fetch user balance:', error);
        }
      }
    };

    fetchUserBalance();
  }, [isAuthenticated, user]);

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
   * Toggles between light and dark theme
   * Updates localStorage and DOM classes
   */
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

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
              Home
            </Link>
            <Link to="/novel-directory" className={`nav-link ${isActive('/novel-directory')}`} onClick={() => setIsMenuOpen(false)}>
              Novel Directory
            </Link>
            <Link to="/oln" className={`nav-link ${isActive('/oln')}`} onClick={() => setIsMenuOpen(false)}>
              OLN
            </Link>
            <Link to="/feedback" className={`nav-link ${isActive('/feedback')}`} onClick={() => setIsMenuOpen(false)}>
              Feedback
            </Link>
            <Link to="/donation" className={`nav-link ${isActive('/donation')}`} onClick={() => setIsMenuOpen(false)}>
              Donation
            </Link>
            {/* Market link - only visible to admin */}
            {user?.role === 'admin' && (
              <Link to="/market" className={`nav-link ${isActive('/market')}`} onClick={() => setIsMenuOpen(false)}>
                Market
              </Link>
            )}
            {/* Admin and Moderator dashboard link */}
            {(user?.role === 'admin' || user?.role === 'moderator') && (
              <Link to="/admin-dashboard" className={`nav-link ${isActive('/admin-dashboard')}`} onClick={() => setIsMenuOpen(false)}>
                Admin Dashboard
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
          
          {/* Top-up button - only visible to admin */}
          {user?.role === 'admin' && (
            <Link to="/top-up" className="top-up-button">
              Top-up
            </Link>
          )}
          
          {/* Theme toggle button */}
          <button onClick={toggleTheme} className="theme-toggle">
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default SecondaryNavbar; 