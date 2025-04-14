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
  const { user } = useAuth();
  // State for dark mode toggle
  const [isDarkMode, setIsDarkMode] = useState(false);
  // State for mobile dropdown menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
            <Link to="/feedback" className={`nav-link ${isActive('/feedback')}`} onClick={() => setIsMenuOpen(false)}>
              Feedback ( README )
            </Link>
            <Link to="/donation" className={`nav-link ${isActive('/donation')}`} onClick={() => setIsMenuOpen(false)}>
              Donation
            </Link>
            {/* Admin and Moderator dashboard link */}
            {(user?.role === 'admin' || user?.role === 'moderator') && (
              <Link to="/admin-dashboard" className={`nav-link ${isActive('/admin-dashboard')}`} onClick={() => setIsMenuOpen(false)}>
                Admin Dashboard
              </Link>
            )}
          </div>
        </div>
        
        {/* Theme toggle button */}
        <button onClick={toggleTheme} className="theme-toggle">
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </nav>
  );
};

export default SecondaryNavbar; 