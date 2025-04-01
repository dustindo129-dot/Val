import { useState, useEffect, memo, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/NovelList.css';
import config from '../config/config';

// Function to truncate HTML content safely
const truncateHTML = (html, maxLength) => {
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

/**
 * NovelImage Component
 * 
 * Memoized component for displaying novel cover images with:
 * - Fallback image handling
 * - Status indicator overlay
 * - Lazy loading
 */
const NovelImage = memo(({ src, alt, status, novelId }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const defaultImage = 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png';

  useEffect(() => {
    setImgSrc(src || defaultImage);
  }, [src]);

  const handleError = () => {
    setImgSrc(defaultImage);
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
});

/**
 * NovelDirectory Component
 * 
 * Displays a paginated grid of novels sorted alphabetically
 */
const NovelDirectory = () => {
  const navigate = useNavigate();
  const { page } = useParams(); // Get page from URL params
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  const currentPage = parseInt(page) || 1;
  // Remove frontend sorting since it should be handled by the database
  const cachedNovels = useMemo(() => novels, [novels]);

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        // Add collation for case-insensitive sorting and proper handling of special characters
        const response = await axios.get(
          `${config.backendUrl}/api/novels?page=${currentPage}&limit=20&sortBy=title&order=asc&collation=true`
        );
        
        // Sort novels client-side as a backup if server sorting isn't perfect
        const sortedNovels = (response.data.novels || []).sort((a, b) => {
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        });
        
        setNovels(sortedNovels);
        setPagination(response.data.pagination);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch novels');
        setLoading(false);
        console.error('Error fetching novels:', err);
      }
    };

    fetchNovels();
  }, [currentPage]);

  // Add scroll to top effect when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const handlePageChange = (page) => {
    navigate(`/novel-directory/page/${page}`);
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
          to="/novel-directory/page/1"
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
          to={`/novel-directory/page/${i}`}
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
          to={`/novel-directory/page/${pagination.totalPages}`}
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
          to={currentPage > 1 ? `/novel-directory/page/${currentPage - 1}` : '#'}
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
          to={currentPage < pagination.totalPages ? `/novel-directory/page/${currentPage + 1}` : '#'}
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

  const toggleDescription = (novelId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) return <div className="loading">Loading novels...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!cachedNovels || cachedNovels.length === 0) return <div className="loading">No novels available.</div>;

  return (
    <div className="novel-list-container">
      <div className="content-layout">
        <div className="main-content">
          <div className="section-headers">
            <h2>NOVEL DIRECTORY</h2>
          </div>
          <div className="novel-grid">
            {cachedNovels.map(novel => (
              <div key={novel._id} className="novel-card">
                <NovelImage
                  src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'}
                  alt={novel.title}
                  status={novel.status}
                  novelId={novel._id}
                />
                <div className="novel-content">
                  <div className="novel-header">
                    <Link to={`/novel/${novel._id}`} className="novel-title-link">
                      <h3 className="novel-title">{novel.title}</h3>
                    </Link>
                    <Link to={`/novel/${novel._id}/chapter/1`} className="first-chapter">
                      First Chapter
                    </Link>
                  </div>
                  <span className="update-time">
                    Updated {formatDate(novel.updatedAt || new Date())}
                  </span>
                  <div className="novel-description">
                    <div dangerouslySetInnerHTML={{ 
                      __html: expandedDescriptions[novel._id]
                        ? novel.description
                        : truncateHTML(novel.description || '', 150)
                    }} />
                    {novel.description?.length > 150 && (
                      <button 
                        className="read-more"
                        onClick={() => toggleDescription(novel._id)}
                      >
                        {expandedDescriptions[novel._id] ? 'Read less ↑' : 'Read more ↓'}
                      </button>
                    )}
                  </div>
                  <div className="chapter-list">
                    {(novel.chapters || []).map(chapter => (
                      <Link 
                        key={chapter._id} 
                        to={`/novel/${novel._id}/chapter/${chapter._id}`}
                        className="chapter-item"
                      >
                        <span className="chapter-title">
                          Chapter {chapter.chapterNumber}: {chapter.title}
                        </span>
                        <span className="chapter-date">
                          {formatDate(chapter.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {renderPagination()}
        </div>
      </div>
    </div>
  );
};

export default NovelDirectory; 