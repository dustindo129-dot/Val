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

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from './auth/Login';
import SignUp from './auth/SignUp';
import axios from 'axios';
import '../styles/Navbar.css';
import config from '../config/config';
import Modal from './auth/Modal';

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  /**
   * Handles the search input changes and fetches results
   * @param {Event} e - The input change event
   */
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Validate search query length
    if (value.length > 0 && value.length < 3) {
      setError("Please enter at least 3 characters...");
      setSearchResults([]);
    } else if (value.length >= 3) {
      try {
        // Fetch search results from API
        const response = await axios.get(`${config.backendUrl}/api/novels/search?title=${encodeURIComponent(value)}`);
        setSearchResults(response.data.slice(0, 5)); // Only take first 5 results
        setError("");
      } catch (err) {
        console.error('Search failed:', err);
        setError("Failed to search for novels");
        setSearchResults([]);
      }
    } else {
      setError("");
      setSearchResults([]);
    }
  };

  /**
   * Handles navigation when a search result is clicked
   * @param {string} novelId - The ID of the selected novel
   */
  const handleNovelClick = (novelId) => {
    navigate(`/novel/${novelId}`);
    setSearchQuery("");
    setSearchResults([]);
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

  return (
    <>
      {/* Main navigation bar */}
      <nav className="navbar">
        {/* Left section with logo and site title */}
        <Link to="/" className="navbar-left">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke="black" className="navbar-logo">
            {/* Main V letter */}
            <path d="M75 20 L50 90 L25 20" fill="none" strokeWidth="8" strokeLinecap="round"/>
            
            {/* Decorative floral element */}
            <path d="M25 20 C25 20, 35 15, 40 25 S50 15, 55 25 S65 15, 75 20" 
                  fill="none" strokeWidth="3"/>
            <path d="M40 22 C40 22, 45 18, 50 28" 
                  fill="none" strokeWidth="2"/>
            <path d="M60 22 C60 22, 65 18, 70 28" 
                  fill="none" strokeWidth="2"/>
          </svg>
          <div className="title-container">
            <h1 className="navbar-title">Valvrareteam</h1>
            <span className="beta-tag">BETA</span>
          </div>
        </Link>
        
        {/* Search section */}
        <div className="search-container">
          <form onSubmit={handleSubmit} className="search-form">
            <div className="search-input-container">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search novels..."
                className="search-input"
              />
              {/* Clear search button */}
              <button 
                type="button" 
                className="clear-search" 
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
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
                    onClick={() => handleNovelClick(novel._id)}
                  >
                    <img 
                      src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'} 
                      alt={novel.title} 
                      className="search-result-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png';
                      }}
                    />
                    <div className="search-result-info">
                      <div className="search-result-title">{novel.title}</div>
                      <div className="search-result-details">
                        <span>Total chapters: {novel.totalChapters || 0}</span>{' '}
                        <span>{novel.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Right section with navigation and auth buttons */}
        <div className="navbar-right">
          {/* Navigation links */}
          <div className="nav-links">
            {/* Admin link will be added here if needed */}
          </div>

          {/* Auth buttons */}
          {user ? (
            // Logged in user menu
            <div className="auth-buttons">
              <Link to={`/user/${user.username}/bookmarks`} className="auth-button bookmark-btn">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
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
                Bookmarks
              </Link>
              <div className="user-avatar">
                <img 
                  src={user.avatar || '/default-avatar.png'} 
                  alt={`${user.username}'s avatar`} 
                  className="avatar-image"
                />
              </div>
              <Link to={`/user/${user.username}/profile`} className="auth-button profile-btn">
                Profile
              </Link>
              <button onClick={handleLogout} className="auth-button logout-btn">
                Logout
              </button>
            </div>
          ) : (
            // Guest user menu
            <div className="auth-buttons">
              <button onClick={handleLoginClick} className="auth-button login">
                Log In
              </button>
              <button onClick={handleSignUpClick} className="auth-button sign-up">
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Login modal */}
      <Modal 
        isOpen={showLogin} 
        onClose={handleCloseModals}
        title="Login"
      >
        <Login onClose={handleCloseModals} onSignUp={handleSignUpClick} />
      </Modal>

      {/* Signup modal */}
      <Modal 
        isOpen={showSignUp} 
        onClose={handleCloseModals}
        title="Sign Up"
      >
        <SignUp onClose={handleCloseModals} onLogin={handleLoginClick} />
      </Modal>
    </>
  );
};

export default Navbar; 