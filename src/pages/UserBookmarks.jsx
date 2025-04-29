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
import api from '../services/api';
import cdnConfig from '../config/bunny';

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

  // Memoize fetchBookmarks to prevent unnecessary recreations
  const fetchBookmarks = useCallback(async () => {
    if (!user || user.username !== username) return;
    
    try {
      const bookmarksData = await api.getBookmarks();
      setBookmarks(bookmarksData);
      setTotalBookmarks(bookmarksData.length);
      setBookmarkedNovels(bookmarksData.map(bookmark => bookmark._id));
      setLoading(false);
    } catch (err) {
      setError('Không thể tải truyện đã đánh dấu');
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
      await api.toggleBookmark(novelId);
      
      // Update local state immediately for better UX
      setBookmarks(prev => prev.filter(bookmark => bookmark._id !== novelId));
      setTotalBookmarks(prev => prev - 1);
      updateBookmarkStatus(novelId, false);
    } catch (err) {
      console.error('Không thể xóa truyện đã đánh dấu:', err);
      // Only refetch on error
      fetchBookmarks();
    }
  };

  // Check if user has permission to view these bookmarks
  if (!user || user.username !== username) {
    return (
      <div className="bookmarks-container">
        <div className="no-bookmarks">
          <p>Bạn không có quyền xem các truyện đã đánh dấu này.</p>
        </div>
      </div>
    );
  }

  // Show empty state immediately if we know there are no bookmarks
  if (totalBookmarks === 0 && !loading) {
    return (
      <div className="bookmarks-container">
        <div className="bookmarks-header">
          <h1>Truyện đã đánh dấu</h1>
          <p>0 truyện</p>
        </div>
        <div className="no-bookmarks">
          <p>Bạn chưa đánh dấu bất kỳ truyện nào.</p>
          <Link to="/novel-directory/page/1" className="browse-novels-btn">
            Xem truyện
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
          <p>Đang tải...</p>
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
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmarks-container">
      <div className="bookmarks-header">
        <h1>Truyện đã đánh dấu</h1>
        <p>{totalBookmarks} truyện</p>
      </div>

      <div className="bookmarks-list">
        {bookmarks.map(novel => (
          <div key={novel._id} className="bookmark-item">
            <Link to={`/novel/${novel._id}`} className="novel-link">
              <img 
                src={novel.illustration || cdnConfig.defaultImages.novel}
                alt={novel.title} 
                className="bookmark-cover"
                onError={(e) => {
                  e.target.src = cdnConfig.defaultImages.novel;
                }}
              />
              <div className="bookmark-info">
                <span className="bookmark-title">{novel.title}</span>
                <span className="bookmark-status" data-status={novel.status || 'Ongoing'}>
                  {novel.status || 'Ongoing'}
                </span>
                <span className="bookmark-chapters">
                  {novel.totalChapters > 0 ? `${novel.totalChapters} chương` : 'Chưa có chương'}
                </span>
                <span className="bookmark-latest-chapter">
                  {novel.latestChapter ? `Chương mới nhất: Chương ${novel.latestChapter.number} - ${novel.latestChapter.title}` : 'Chưa có chương'}
                </span>
              </div>
            </Link>
            <button 
              onClick={(e) => handleRemoveBookmark(novel._id, e)}
              className="remove-bookmark"
              title="Xóa khỏi truyện đã đánh dấu"
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