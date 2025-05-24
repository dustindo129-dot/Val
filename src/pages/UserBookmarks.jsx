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
 * - Responsive grid layout with 3 items per row
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/UserBookmarks.css';
import { useBookmarks } from '../context/BookmarkContext';
import api from '../services/api';
import cdnConfig from '../config/bunny';
import LoadingSpinner from '../components/LoadingSpinner';

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
      // Sort by latest update (assuming lastUpdated field exists)
      const sortedBookmarks = bookmarksData.sort((a, b) => {
        // Sort by latest chapter update date if available
        if (a.latestChapter && b.latestChapter) {
          return new Date(b.latestChapter.createdAt) - new Date(a.latestChapter.createdAt);
        }
        return 0;
      });
      
      setBookmarks(sortedBookmarks);
      setTotalBookmarks(sortedBookmarks.length);
      setBookmarkedNovels(sortedBookmarks.map(bookmark => bookmark._id));
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

  // Handler for unbookmarking a chapter
  const handleUnbookmarkChapter = async (novelId, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Show confirmation dialog
    const confirmed = window.confirm('Bạn có chắc chắn muốn bỏ đánh dấu chương này không?');
    if (!confirmed) {
      return;
    }
    
    try {
      // Find the bookmarked chapter for this novel
      const novel = bookmarks.find(b => b._id === novelId);
      if (!novel?.bookmarkedChapter) {
        return;
      }
      
      // Get the chapter ID (we need to find it via API)
      const bookmarkData = await api.getBookmarkedChapter(novelId);
      if (bookmarkData?.bookmarkedChapter?.id) {
        // Call the chapter bookmark toggle API
        await api.toggleChapterBookmark(bookmarkData.bookmarkedChapter.id);
        
        // Update local state to remove bookmarked chapter
        setBookmarks(prev => prev.map(bookmark => 
          bookmark._id === novelId 
            ? { ...bookmark, bookmarkedChapter: null }
            : bookmark
        ));
      }
    } catch (err) {
      console.error('Không thể bỏ đánh dấu chương:', err);
      alert('Không thể bỏ đánh dấu chương. Vui lòng thử lại.');
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
        <div className="bookmarks-section-header">
          <h2>TRUYỆN ĐÃ ĐÁNH DẤU (0)</h2>
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
          <LoadingSpinner size="large" text="Đang tải..." />
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
      <div className="bookmarks-section-header">
        <h2>TRUYỆN ĐÃ ĐÁNH DẤU ({totalBookmarks})</h2>
      </div>

      <div className="bookmarks-grid">
        {bookmarks.map(novel => (
          <div key={novel._id} className="bookmark-card">
            <Link to={`/novel/${novel._id}`} className="title-link">
              <h3 className="bookmark-title-header">{novel.title}</h3>
            </Link>
            <div className="bookmark-card-content">
              <img 
                src={novel.illustration || cdnConfig.defaultImages.novel}
                alt={novel.title} 
                className="bookmark-cover"
                onError={(e) => {
                  e.target.src = cdnConfig.defaultImages.novel;
                }}
              />
              <div className="bookmark-info">
                <div className="bookmark-reading-status">
                  <span className="bookmark-status-label">
                    Chương Đánh Dấu: <span className="bookmark-status-value">
                      {novel.bookmarkedChapter?.title || 'Không có'}
                      {novel.bookmarkedChapter && (
                        <button 
                          onClick={(e) => handleUnbookmarkChapter(novel._id, e)}
                          className="unbookmark-chapter-btn"
                          title="Bỏ đánh dấu chương"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </span>
                </div>
                <div className="bookmark-details">
                  <span className="bookmark-status-label">
                    Chương mới nhất: <span className="bookmark-status-value">
                      {novel.latestChapter?.title || 'Chưa có chương'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
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
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserBookmarks; 