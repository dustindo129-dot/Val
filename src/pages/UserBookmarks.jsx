/**
 * UserBookmarks Component
 * 
 * Displays a user's bookmarked novels in a grid layout with features for:
 * - Viewing bookmarked novels
 * - Removing novels from bookmarks
 * - Displaying novel details (title, chapters, status)
 * - Navigation to novel details
 * 
 * Features:
 * - Authentication check
 * - Loading states
 * - Error handling
 * - Empty state handling
 * - Responsive grid layout
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/UserBookmarks.css';
import config from '../config/config';
import { useBookmarks } from '../context/BookmarkContext';

/**
 * UserBookmarks Component
 * 
 * Main component for displaying and managing user's bookmarked novels
 */
const UserBookmarks = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { bookmarkedNovels, setBookmarkedNovels, updateBookmarkStatus } = useBookmarks();
  
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalBookmarks, setTotalBookmarks] = useState(0);

  // Check if user has permission to view these bookmarks
  if (!user || user.username !== username) {
    return (
      <div className="bookmarks-container">
        <div className="no-bookmarks">
          <p>You don't have permission to view these bookmarks.</p>
        </div>
      </div>
    );
  }

  // Memoize fetchBookmarks to prevent unnecessary recreations
  const fetchBookmarks = useCallback(async () => {
    if (!user || user.username !== username) return;
    
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/${username}/bookmarks`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const bookmarksData = response.data;
      setBookmarks(bookmarksData);
      setTotalBookmarks(bookmarksData.length);
      setBookmarkedNovels(bookmarksData.map(bookmark => bookmark._id));
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch bookmarks');
      setLoading(false);
    }
  }, [username, user, setBookmarkedNovels]);

  // Effect for initial load and username/user changes
  useEffect(() => {
    let isMounted = true;
    
    const initializeBookmarks = async () => {
      if (isMounted) {
        await fetchBookmarks();
      }
    };

    initializeBookmarks();
    
    return () => {
      isMounted = false;
    };
  }, [fetchBookmarks]);

  // Optimized remove bookmark handler
  const handleRemoveBookmark = async (novelId, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      await axios.delete(
        `${config.backendUrl}/api/users/${username}/bookmarks/${novelId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Update local state immediately for better UX
      setBookmarks(prev => prev.filter(bookmark => bookmark._id !== novelId));
      setTotalBookmarks(prev => prev - 1);
      updateBookmarkStatus(novelId, false);
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
      // Only refetch on error
      fetchBookmarks();
    }
  };

  // Show empty state immediately if we know there are no bookmarks
  if (totalBookmarks === 0 && !loading) {
    return (
      <div className="bookmarks-container">
        <div className="bookmarks-header">
          <h1>My Bookmarks</h1>
          <p>0 Novels</p>
        </div>
        <div className="no-bookmarks">
          <p>You haven't bookmarked any novels yet.</p>
          <Link to="/novel-directory/page/1" className="browse-novels-btn">
            Browse Novels
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bookmarks-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookmarks-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchBookmarks} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmarks-container">
      <div className="bookmarks-header">
        <h1>My Bookmarks</h1>
        <p>{totalBookmarks} Novel(s)</p>
      </div>

      <div className="bookmarks-list">
        {bookmarks.map(novel => (
          <div key={novel._id} className="bookmark-item">
            <Link to={`/novel/${novel._id}`} className="novel-link">
              <img 
                src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'} 
                alt={novel.title} 
                className="bookmark-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png';
                }}
              />
              <div className="bookmark-info">
                <span className="bookmark-title">{novel.title}</span>
                <span className="bookmark-latest-chapter">
                  {novel.latestChapter ? `Latest: Chapter ${novel.latestChapter.number} - ${novel.latestChapter.title}` : 'No chapters yet'}
                </span>
              </div>
            </Link>
            <button 
              onClick={(e) => handleRemoveBookmark(novel._id, e)}
              className="remove-bookmark"
              title="Remove from bookmarks"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserBookmarks; 