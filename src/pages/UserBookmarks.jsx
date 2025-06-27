/**
 * UserBookmarks Component - Updated
 *
 * Displays a user's bookmarked novels with horizontal card layout featuring:
 * - Cover image, title, and update time
 * - Bookmarked chapter with inline X button
 * - Latest chapter display
 * - Sort functionality (excluding Z-A)
 * - Confirmation modal for bookmark removal
 * - Namespaced CSS classes with 'ub-' prefix
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import '../styles/UserBookmarks.css';
import { useBookmarks } from '../context/BookmarkContext';
import api from '../services/api';
import cdnConfig from '../config/bunny';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateNovelUrl, generateChapterUrl } from '../utils/slugUtils';

/**
 * UserBookmarksSEO Component
 * 
 * Provides SEO optimization for the UserBookmarks page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const UserBookmarksSEO = ({ user, username, totalBookmarks = 0 }) => {
  const displayName = user?.displayName || username;
  
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{`Truyện Đã Đánh Dấu - ${displayName} | Valvrareteam`}</title>
      <meta name="description" content={`Xem danh sách ${totalBookmarks} truyện đã đánh dấu của ${displayName} tại Valvrareteam. Quản lý và theo dõi tiến độ đọc Light Novel yêu thích.`} />
      <meta name="keywords" content="truyện đánh dấu, bookmark, light novel yêu thích, theo dõi đọc truyện, valvrareteam" />
      <meta name="robots" content="noindex, nofollow" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content={`Truyện Đã Đánh Dấu - ${displayName} | Valvrareteam`} />
      <meta property="og:description" content={`Xem danh sách truyện đã đánh dấu của ${displayName} tại Valvrareteam.`} />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content={`https://valvrareteam.net/nguoi-dung/${username}/truyen-danh-dau`} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`Truyện Đã Đánh Dấu - ${displayName} | Valvrareteam`} />
      <meta name="twitter:description" content={`Xem danh sách truyện đã đánh dấu của ${displayName} tại Valvrareteam.`} />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
    </Helmet>
  );
};

/**
 * Confirmation Modal Component
 */
const ConfirmationModal = ({ isOpen, novelTitle, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
      <div className="ub-confirm-modal-overlay">
        <div className="ub-confirm-modal">
          <h3>Xác nhận xóa truyện đã đánh dấu</h3>
          <p>Bạn có chắc chắn muốn xóa truyện "{novelTitle}" khỏi danh sách đã đánh dấu không?</p>
          <div className="ub-confirm-actions">
            <button onClick={onConfirm} className="ub-confirm-btn">
              Xóa
            </button>
            <button onClick={onCancel} className="ub-cancel-btn">
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
  );
};

/**
 * UserBookmarks Component
 */
const UserBookmarks = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { bookmarkedNovels, setBookmarkedNovels, updateBookmarkStatus } = useBookmarks();

  const [bookmarks, setBookmarks] = useState([]);
  const [sortedBookmarks, setSortedBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [sortBy, setSortBy] = useState('latest-update');

  // Track which chapters are being unbookmarked (disabled state)
  const [disabledChapters, setDisabledChapters] = useState(new Set());

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    novelId: null,
    novelTitle: ''
  });

  // Use ref to track if we've already synced context to prevent loops
  const hasSyncedContext = useRef(false);
  
  // Use ref to prevent duplicate API calls (especially in React StrictMode)
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Helper function to format update time
  const formatUpdateTime = (dateString) => {
    if (!dateString) return 'Không rõ';

    const now = new Date();
    const updateDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - updateDate) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} giờ trước`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ngày trước`;
    }
  };

  // Sort bookmarks function
  const sortBookmarks = useCallback((bookmarksList, sortOption) => {
    const sorted = [...bookmarksList].sort((a, b) => {
      switch (sortOption) {
        case 'latest-update':
          // Primary sort: by latest chapter creation date if available
          if (a.latestChapter?.createdAt && b.latestChapter?.createdAt) {
            return new Date(b.latestChapter.createdAt) - new Date(a.latestChapter.createdAt);
          }
          // Secondary sort: by novel updatedAt
          if (a.updatedAt && b.updatedAt) {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          }
          return a.title.localeCompare(b.title);

        case 'title-asc':
          return a.title.localeCompare(b.title);

        default:
          return 0;
      }
    });

    setSortedBookmarks(sorted);
  }, []);

  // Memoize fetchBookmarks to prevent unnecessary recreations
  const fetchBookmarks = useCallback(async () => {
    // Check if user can view bookmarks (same logic as main permission check)
    const canViewBookmarks = user && (
      user.username === username || 
      user.displayName === username ||
      (user.displayName && user.displayName.toLowerCase().replace(/\s+/g, '') === username.toLowerCase().replace(/[-\s]+/g, '')) ||
      (user.username && user.username.toLowerCase() === username.toLowerCase())
    );
    
    if (!canViewBookmarks) {
      return;
    }

    // Prevent duplicate calls (especially important for React StrictMode)
    if (isLoadingRef.current) {
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set up new abort controller and loading state
    isLoadingRef.current = true;
    abortControllerRef.current = new AbortController();

    try {
      const bookmarksData = await api.getBookmarks(abortControllerRef.current?.signal);
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Sort the data immediately instead of using separate effect
      const sorted = [...bookmarksData].sort((a, b) => {
        switch (sortBy) {
          case 'latest-update':
            if (a.latestChapter?.createdAt && b.latestChapter?.createdAt) {
              return new Date(b.latestChapter.createdAt) - new Date(a.latestChapter.createdAt);
            }
            if (a.updatedAt && b.updatedAt) {
              return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
            return a.title.localeCompare(b.title);
          case 'title-asc':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });

      // Batch state updates to reduce re-renders
      setBookmarks(bookmarksData);
      setSortedBookmarks(sorted);
      setTotalBookmarks(bookmarksData.length);
      setLoading(false);

      // Only sync with context on first load to prevent infinite loops
      if (!hasSyncedContext.current) {
        setBookmarkedNovels(bookmarksData.map(bookmark => bookmark._id));
        hasSyncedContext.current = true;
      }

    } catch (err) {
      // Don't log errors for aborted requests
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      setError('Không thể tải truyện đã đánh dấu');
      setLoading(false);
    } finally {
      isLoadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [username, user, sortBy]); // Removed sortBookmarks dependency

  // Effect for initial load and username/user changes
  useEffect(() => {
    let isMounted = true;

    // Reset sync flag when user changes
    hasSyncedContext.current = false;

    const initializeBookmarks = async () => {
      if (isMounted) {
        setLoading(true);
        await fetchBookmarks();
      }
    };

    initializeBookmarks();

    return () => {
      // Cleanup: abort any ongoing request and reset loading state
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isLoadingRef.current = false;
      isMounted = false;
    };
  }, [fetchBookmarks]);

  // Note: Sorting is now handled directly in fetchBookmarks and handleSortChange
  // No separate useEffect needed, which reduces unnecessary re-renders

  // Handle sort change
  const handleSortChange = useCallback((e) => {
    const newSortBy = e.target.value;
    setSortBy(newSortBy);
    
    // Apply sorting immediately to existing data instead of waiting for effect
    if (bookmarks.length > 0) {
      sortBookmarks(bookmarks, newSortBy);
    }
  }, [sortBy, bookmarks, sortBookmarks]);

  // Open confirmation modal
  const openConfirmModal = (novelId, novelTitle) => {
    setConfirmModal({
      isOpen: true,
      novelId,
      novelTitle
    });
  };

  // Close confirmation modal
  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      novelId: null,
      novelTitle: ''
    });
  };

  // Optimized remove bookmark handler
  const handleRemoveBookmark = async (novelId, event) => {
    event.preventDefault();
    event.stopPropagation();

    const novel = bookmarks.find(b => b._id === novelId);
    if (!novel) return;

    openConfirmModal(novelId, novel.title);
  };

  // Confirm remove bookmark
  const confirmRemoveBookmark = async () => {
    const { novelId } = confirmModal;

    try {
      await api.toggleBookmark(novelId);

      // Update local state immediately for better UX
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark._id !== novelId);
      setBookmarks(updatedBookmarks);
      setTotalBookmarks(prev => prev - 1);
      sortBookmarks(updatedBookmarks, sortBy);

      // Update context without triggering re-fetch
      updateBookmarkStatus(novelId, false);

      // Close modal
      closeConfirmModal();
    } catch (err) {
      console.error('Không thể xóa truyện đã đánh dấu:', err);
      // Only refetch on error
      setLoading(true);
      await fetchBookmarks();
      closeConfirmModal();
    }
  };

  // Handler for unbookmarking a chapter
  const handleUnbookmarkChapter = async (novelId, event) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if already disabled
    if (disabledChapters.has(novelId)) {
      return;
    }

    // Add to disabled set immediately
    setDisabledChapters(prev => new Set([...prev, novelId]));

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
        const updatedBookmarks = bookmarks.map(bookmark =>
            bookmark._id === novelId
                ? { ...bookmark, bookmarkedChapter: null }
                : bookmark
        );
        setBookmarks(updatedBookmarks);
        sortBookmarks(updatedBookmarks, sortBy);
      }
    } catch (err) {
      console.error('Không thể bỏ đánh dấu chương:', err);
      alert('Không thể bỏ đánh dấu chương. Vui lòng thử lại.');
      // Remove from disabled set on error so user can try again
      setDisabledChapters(prev => {
        const newSet = new Set(prev);
        newSet.delete(novelId);
        return newSet;
      });
    }
    // Note: We don't remove from disabledChapters on success,
    // because the chapter will be removed from UI anyway
  };

  // Check if user has permission to view these bookmarks
  // The URL parameter might be either username or displayName, so check both
  const canViewBookmarks = user && (
    user.username === username || 
    user.displayName === username ||
    (user.displayName && user.displayName.toLowerCase().replace(/\s+/g, '') === username.toLowerCase().replace(/[-\s]+/g, '')) ||
    (user.username && user.username.toLowerCase() === username.toLowerCase())
  );
  
  if (!canViewBookmarks) {
    return (
        <>
          <UserBookmarksSEO user={user} username={username} totalBookmarks={0} />
          <div className="ub-bookmarks-container">
            <div className="ub-no-bookmarks">
              <p>Bạn không có quyền xem các truyện đã đánh dấu này.</p>
            </div>
          </div>
        </>
    );
  }

  // Show empty state immediately if we know there are no bookmarks
  if (totalBookmarks === 0 && !loading) {
    return (
        <>
          <UserBookmarksSEO user={user} username={username} totalBookmarks={totalBookmarks} />
          <div className="ub-bookmarks-container">
            <div className="ub-bookmarks-header">
              <h2>TRUYỆN ĐÃ ĐÁNH DẤU (0)</h2>
            </div>
            <div className="ub-bookmarks-grid">
              <div className="ub-no-bookmarks">
                <p>Bạn chưa đánh dấu bất kỳ truyện nào.</p>
                <Link to="/danh-sach-truyen/trang/1" className="ub-browse-novels-btn">
                  Xem truyện
                </Link>
              </div>
            </div>
          </div>
        </>
    );
  }

  if (loading) {
    return (
        <>
          <UserBookmarksSEO user={user} username={username} totalBookmarks={totalBookmarks} />
          <div className="ub-bookmarks-container">
            <div className="ub-bookmarks-grid">
              <div className="ub-loading">
                <LoadingSpinner size="large" text="Đang tải..." />
              </div>
            </div>
          </div>
        </>
    );
  }

  if (error) {
    return (
        <>
          <UserBookmarksSEO user={user} username={username} totalBookmarks={totalBookmarks} />
          <div className="ub-bookmarks-container">
            <div className="ub-bookmarks-grid">
              <div className="ub-error">
                <p>{error}</p>
                <button onClick={fetchBookmarks} className="ub-retry-btn">
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </>
    );
  }

  return (
      <>
        <UserBookmarksSEO user={user} username={username} totalBookmarks={totalBookmarks} />
        <div className="ub-bookmarks-container">
          <div className="ub-bookmarks-header">
            <h2>TRUYỆN ĐÃ ĐÁNH DẤU ({totalBookmarks})</h2>

            <div className="ub-sort-controls">
              <span className="ub-sort-label">Sắp xếp theo:</span>
              <select className="ub-sort-select" value={sortBy} onChange={handleSortChange}>
                <option value="latest-update">Cập nhật mới nhất</option>
                <option value="title-asc">Tên truyện (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="ub-bookmarks-grid">
            {sortedBookmarks.map(novel => (
                <div key={novel._id} className="ub-bookmark-card">
                  {/* Left side - Cover image */}
                  <div className="ub-cover-container">
                    <img
                        src={novel.illustration || cdnConfig.defaultImages.novel}
                        alt={novel.title}
                        className="ub-bookmark-cover"
                        onError={(e) => {
                          e.target.src = cdnConfig.defaultImages.novel;
                        }}
                    />
                    <div className="ub-update-time">
                      <i className="far fa-clock"></i> {formatUpdateTime(novel.latestChapter?.createdAt || novel.updatedAt)}
                    </div>
                  </div>

                  {/* Right side - Content */}
                  <div className="ub-card-content">
                    {/* Novel header with title */}
                    <div className="ub-bookmark-header">
                      <h3 className="ub-bookmark-title">
                        <Link to={generateNovelUrl(novel)} className="ub-bookmark-title-link">
                          {novel.title}
                        </Link>
                      </h3>
                    </div>

                    {/* Novel info section */}
                    <div className="ub-bookmark-info">
                      <div className="ub-chapter-list">
                        {/* Latest chapter row */}
                        <div className="ub-chapter-row">
                          <div className="ub-chapter-content">
                            <span className="ub-chapter-label">Chương mới nhất: </span>
                            <Link
                                to={novel.latestChapter && novel.latestChapter._id && novel.latestChapter.title
                                  ? generateChapterUrl(novel, novel.latestChapter) 
                                  : generateNovelUrl(novel)}
                                className="ub-chapter-link ub-new-chapter-link"
                            >
                              {novel.latestChapter?.title || 'Chưa có chương mới'}
                            </Link>
                          </div>
                        </div>

                        {/* Bookmarked chapter row (if exists) */}
                        {novel.bookmarkedChapter && (
                            <div className="ub-chapter-row">
                              <div className="ub-bookmarked-chapter">
                                <div className="ub-bookmarked-chapter-content">
                                  <span className="ub-chapter-label">Đánh Dấu: </span>
                                  <Link
                                      to={novel.bookmarkedChapter._id && novel.bookmarkedChapter.title
                                        ? generateChapterUrl(novel, novel.bookmarkedChapter)
                                        : generateNovelUrl(novel)}
                                      className="ub-chapter-link"
                                  >
                                    {novel.bookmarkedChapter.title}
                                  </Link>
                                </div>
                                <span
                                    onClick={(e) => handleUnbookmarkChapter(novel._id, e)}
                                    className={`ub-remove-chapter-x ${disabledChapters.has(novel._id) ? 'ub-disabled' : ''}`}
                                    title={disabledChapters.has(novel._id) ? 'Đang xử lý...' : 'Bỏ đánh dấu chương'}
                                >
                            ×
                          </span>
                              </div>
                            </div>
                        )}
                      </div>
                    </div>

                    {/* Remove bookmark button */}
                    <button
                        onClick={(e) => handleRemoveBookmark(novel._id, e)}
                        className="ub-remove-bookmark"
                        title="Xóa khỏi truyện đã đánh dấu"
                    >
                      <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
            ))}
          </div>

          {/* Confirmation Modal */}
          <ConfirmationModal
              isOpen={confirmModal.isOpen}
              novelTitle={confirmModal.novelTitle}
              onConfirm={confirmRemoveBookmark}
              onCancel={closeConfirmModal}
          />
        </div>
      </>
  );
};

export default UserBookmarks; 