/**
 * NovelList Component
 * 
 * Displays a paginated grid of novels with their details including:
 * - Cover images with status indicators
 * - Novel titles and descriptions
 * - Latest chapter updates
 * - Pagination controls
 * - Search functionality
 * 
 * Features:
 * - Responsive grid layout
 * - Lazy loading of images
 * - Expandable descriptions
 * - Chapter previews
 * - Status indicators
 * - First chapter quick links
 */

import { useState, useEffect, memo, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import HotNovels from './HotNovels';
import '../styles/NovelList.css';
import config from '../config/config';

/**
 * NovelImage Component
 * 
 * Memoized component for displaying novel cover images with:
 * - Fallback image handling
 * - Status indicator overlay
 * - Lazy loading
 * 
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.status - Novel status (e.g., 'ONGOING', 'COMPLETED')
 * @param {string} props.novelId - ID of the novel
 */
const NovelImage = memo(({ src, alt, status, novelId }) => {
  // State for managing image source with fallback
  const [imgSrc, setImgSrc] = useState(src);

  // Update image source when prop changes
  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  // Handle image loading errors by using fallback image
  const handleError = () => {
    setImgSrc('/images/default-cover.jpg');
  };

  return (
    <div className="novel-image-container">
      <Link to={`/novel/${novelId}`} className="novel-image-link">
        <div className="novel-image">
          <img 
            src={imgSrc} 
            alt={alt}
            onError={handleError}
            loading="lazy"
          />
        </div>
      </Link>
    </div>
  );
}, (prevProps, nextProps) => {
  // Memoization comparison function
  return prevProps.src === nextProps.src && 
         prevProps.alt === nextProps.alt && 
         prevProps.status === nextProps.status &&
         prevProps.novelId === nextProps.novelId;
});

/**
 * NovelList Component
 * 
 * Main component that manages the display and pagination of novels
 * 
 * Features:
 * - Server-side pagination
 * - Search parameter integration
 * - Loading and error states
 * - Novel data caching
 * - Description expansion
 * - Date formatting
 */
const NovelList = () => {
  const navigate = useNavigate();
  const { page } = useParams();
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const currentPage = parseInt(page) || 1;

  const { data, isLoading, error } = useQuery({
    queryKey: ['novels', currentPage],
    queryFn: async () => {
      const response = await axios.get(`${config.backendUrl}/api/novels?page=${currentPage}&limit=20`);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    cacheTime: 1000 * 60 * 10, // Cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 5, // Only refetch every 5 minutes
    keepPreviousData: true // Keep showing previous page data while loading next page
  });

  const novels = data?.novels || [];
  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  };

  // Add scroll to top effect when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handlePageChange = (page) => {
    navigate(`/homepage/page/${page}`);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(
        <Link
          key="1"
          to="/homepage/page/1"
          className={`pagination-button ${1 === currentPage ? 'active' : ''}`}
          onClick={() => window.scrollTo(0, 0)}
        >
          1
        </Link>
      );
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Link
          key={i}
          to={`/homepage/page/${i}`}
          className={`pagination-button ${i === currentPage ? 'active' : ''}`}
          onClick={() => window.scrollTo(0, 0)}
        >
          {i}
        </Link>
      );
    }

    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>);
      }
      pages.push(
        <Link
          key={pagination.totalPages}
          to={`/homepage/page/${pagination.totalPages}`}
          className={`pagination-button ${pagination.totalPages === currentPage ? 'active' : ''}`}
          onClick={() => window.scrollTo(0, 0)}
        >
          {pagination.totalPages}
        </Link>
      );
    }

    return (
      <div className="pagination">
        <Link
          to={currentPage > 1 ? `/homepage/page/${currentPage - 1}` : '#'}
          onClick={(e) => {
            if (currentPage === 1) e.preventDefault();
            else window.scrollTo(0, 0);
          }}
          className={`pagination-button nav ${currentPage === 1 ? 'disabled' : ''}`}
        >
          ‹
        </Link>
        {pages}
        <Link
          to={currentPage < pagination.totalPages ? `/homepage/page/${currentPage + 1}` : '#'}
          onClick={(e) => {
            if (currentPage === pagination.totalPages) e.preventDefault();
            else window.scrollTo(0, 0);
          }}
          className={`pagination-button nav ${currentPage === pagination.totalPages ? 'disabled' : ''}`}
        >
          ›
        </Link>
      </div>
    );
  };

  /**
   * Toggles description expansion state
   * @param {string} novelId - ID of the novel
   */
  const toggleDescription = (novelId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  };

  /**
   * Formats date for display
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to truncate HTML content safely
  const truncateHTML = (html, maxLength) => {
    if (!html) return '';
    
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    
    if (text.length <= maxLength) {
      return html;
    }

    let truncated = '';
    let currentLength = 0;
    const words = html.split(/(<[^>]*>|\s+)/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordLength = word.replace(/<[^>]*>/g, '').length;

      if (currentLength + wordLength > maxLength) {
        break;
      }

      truncated += word;
      if (!word.match(/<[^>]*>/)) {
        currentLength += wordLength;
      }
    }

    return truncated + '...';
  };

  // Loading and error states
  if (isLoading) return <div className="loading">Loading novels...</div>;
  if (error) return <div className="error">{error.message}</div>;
  if (!novels || novels.length === 0) return <div className="loading">No novels available.</div>;

  return (
    <>
      <div className="novel-list-container">
        <div className="content-layout">
          {/* Main content area */}
          <div className="main-content">
            <div className="section-headers">
              <h2>LATEST UPDATES</h2>
            </div>
            {/* Novel grid */}
            <div className="novel-grid">
              {novels.map(novel => {
                const shouldShowReadMore = novel.description && 
                  ((novel.description.replace(/<[^>]*>/g, '').length || 0) > 450);
                
                return (
                  <div key={novel._id} className="novel-card">
                    {/* Novel cover image */}
                    <NovelImage
                      src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'}
                      alt={novel.title}
                      status={novel.status}
                      novelId={novel._id}
                    />
                    {/* Novel content */}
                    <div className="novel-content">
                      <div className="novel-header">
                        <Link to={`/novel/${novel._id}`} className="novel-list-title-link">
                          <h3 className="novel-title">{novel.title}</h3>
                        </Link>
                        <div className="novel-meta">
                          {novel.chapters && novel.chapters.length > 0 && (
                            <Link 
                              to={`/novel/${novel._id}/chapter/${novel.chapters[0]._id}`} 
                              className="first-chapter"
                            >
                              First Chapter
                            </Link>
                          )}
                          <span className="update-time">
                            Updated {formatDate(novel.updatedAt || new Date())}
                          </span>
                        </div>
                      </div>
                      {/* Novel description with expand/collapse */}
                      <div className="novel-description">
                        <div dangerouslySetInnerHTML={{ 
                          __html: expandedDescriptions[novel._id]
                            ? novel.description
                            : shouldShowReadMore
                              ? truncateHTML(novel.description, 500)
                              : novel.description
                        }} />
                        {novel.description?.length > 450 && (
                          <button 
                            className="read-more"
                            onClick={() => toggleDescription(novel._id)}
                          >
                            {expandedDescriptions[novel._id] ? 'Read less ↑' : 'Read more ↓'}
                          </button>
                        )}
                      </div>
                      {/* Latest chapters list */}
                      <div className="chapter-list">
                        {(novel.chapters || [])
                          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by newest first
                          .slice(0, 3) // Ensure we only show at most 3 chapters
                          .map(chapter => (
                          <Link 
                            key={chapter._id} 
                            to={`/novel/${novel._id}/chapter/${chapter._id}`}
                            className="novel-chapter-item"
                          >
                            <span className="novel-chapter-title">
                              {chapter.title}
                            </span>
                            <span className="chapter-date">
                              {formatDate(chapter.createdAt)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination controls */}
            {renderPagination()}
          </div>
          {/* Sidebar with hot novels */}
          <aside className="sidebar">
            <HotNovels />
          </aside>
        </div>
      </div>
    </>
  );
};

export default NovelList; 