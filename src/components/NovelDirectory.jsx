/**
 * NovelDirectory Component
 *
 * Displays a paginated grid of novels sorted alphabetically with:
 * - Filter sidebar with genre categories and checkboxes
 * - Novel cards arranged in a 2-column grid
 * - Client-side filtering and pagination
 */

import { useState, useEffect, memo, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../styles/NovelDirectory.css';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import LoadingSpinner from './LoadingSpinner';
import { generateNovelUrl } from '../utils/slugUtils';
import { translateStatus, getStatusForCSS } from '../utils/statusTranslation';

// Genre categories for filtering
const genreCategories = {
  'Định Dạng và Nguồn Gốc': [
    'Chinese Novel', 'English Novel', 'Japanese Novel', 'Korean Novel', 'Vietnamese Novel',
    'Web Novel', 'One shot'
  ],
  'Đối Tượng': [
    'Seinen', 'Shounen', 'Josei', 'Shoujo'
  ],
  'Thể Loại Chính': [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
    'Historical', 'Horror', 'Mystery', 'Romance', 'Science Fiction',
    'Slice of Life', 'Supernatural', 'Suspense', 'Tragedy',
    'Magic', 'Psychological'
  ],
  'Đặc Trưng Quan Hệ và Nhân Vật': [
    'Age Gap', 'Boys Love', 'Character Growth', 'Different Social Status',
    'Female Protagonist', 'Gender Bender', 'Harem', 'Incest',
    'Mature', 'Netorare', 'Reverse Harem', 'Yuri'
  ],
  'Thiết Lập và Thế Giới': [
    'Cooking', 'Game', 'Isekai', 'Martial Arts', 'Mecha', 'Military',
    'Otome Game', 'Parody', 'School Life', 'Slow Life', 'Sports',
    'Super Power', 'Wars', 'Workplace'
  ],
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

/**
 * NovelImage Component
 *
 * Memoized component for displaying novel cover images with:
 * - Fallback image handling
 * - Status indicator overlay
 * - Lazy loading
 */
const NovelImage = memo(({ src, alt, status, novelId, updatedAt }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const defaultImage = cdnConfig.defaultImageUrl;

  useEffect(() => {
    setImgSrc(src || defaultImage);
  }, [src]);

  const handleError = () => {
    setImgSrc(defaultImage);
  };

  return (
      <div className="novel-image-container">
        <Link to={generateNovelUrl({ _id: novelId, title: alt })} className="novel-image-link">
          <div className="novel-image">
            <img
                src={imgSrc}
                alt={alt}
                onError={handleError}
                loading="lazy"
            />
          </div>
        </Link>
        {/* Status nằm dưới hình ảnh */}
        <span className="dir-novel-status" data-status={getStatusForCSS(status)}>
          {translateStatus(status)}
        </span>
      </div>
  );
});

/**
 * NovelDirectory Component
 *
 * Displays all novels with client-side filtering and pagination
 */
const NovelDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { page } = useParams();
  const currentPage = parseInt(page) || 1;
  const ITEMS_PER_PAGE = 20;

  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [expandedTags, setExpandedTags] = useState({});
  const [selectedGenres, setSelectedGenres] = useState({});
  const [appliedGenres, setAppliedGenres] = useState({});
  const [needsTagToggle, setNeedsTagToggle] = useState({});
  const sidebarRef = useRef(null);
  const tagListRefs = useRef({});
  const descriptionRefs = useRef({});

  // Parse URL search params for filters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const genres = searchParams.get('genres');

    if (genres) {
      const genreArray = genres.split(',');
      const genreObject = {};

      genreArray.forEach(genre => {
        genreObject[genre] = true;
      });

      setSelectedGenres(genreObject);
      setAppliedGenres(genreObject);
    }
  }, [location.search]);

  // Query to fetch novels with a larger limit
  const { data, isLoading, error } = useQuery({
    queryKey: ['novels-directory', 'large-list'],
    queryFn: async () => {
      const response = await axios.get(`${config.backendUrl}/api/novels?page=1&limit=1000`);

      // Sort novels by title (case-insensitive)
      const sortedNovels = (response.data.novels || []).sort((a, b) => {
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });

      return {
        novels: sortedNovels,
        totalCount: sortedNovels.length
      };
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    cacheTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Check if tag lists need a toggle button
  useEffect(() => {
    if (data?.novels) {
      const timer = setTimeout(() => {
        const updatedNeedsToggle = {};

        // Check each tag list element
        Object.keys(tagListRefs.current).forEach(novelId => {
          const tagListRef = tagListRefs.current[novelId];
          if (tagListRef) {
            const { scrollHeight, clientHeight } = tagListRef;
            // If scrollHeight significantly greater than clientHeight, we need a toggle
            updatedNeedsToggle[novelId] = scrollHeight > clientHeight + 5;
          }
        });

        setNeedsTagToggle(updatedNeedsToggle);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [data]);

  // Filter and paginate novels client-side
  const filteredAndPaginatedNovels = useMemo(() => {
    if (!data?.novels) return { novels: [], totalPages: 1 };

    // Get selected genre filters
    const activeGenres = Object.keys(appliedGenres).filter(genre => appliedGenres[genre]);

    // Filter novels based on selected genres
    const filtered = activeGenres.length > 0
        ? data.novels.filter(novel => {
          // Check if novel has ALL of the selected genres
          return novel.genres && activeGenres.every(genre => 
              novel.genres.includes(genre)
          );
        })
        : data.novels;

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedNovels = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return {
      novels: paginatedNovels,
      totalPages,
      totalItems: filtered.length
    };
  }, [data, currentPage, appliedGenres]);

  // Add scroll to top effect when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Handle genre checkbox changes
  const handleGenreChange = useCallback((genre) => {
    setSelectedGenres(prev => ({
      ...prev,
      [genre]: !prev[genre]
    }));
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    setAppliedGenres(selectedGenres);

    const genreFilters = Object.keys(selectedGenres).filter(genre => selectedGenres[genre]);

    if (genreFilters.length > 0) {
      navigate(`/novel-directory/page/1?genres=${genreFilters.join(',')}`);
    } else {
      navigate('/novel-directory/page/1');
    }
  }, [selectedGenres, navigate]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSelectedGenres({});
    setAppliedGenres({});
    navigate('/novel-directory/page/1');
  }, [navigate]);

  // Toggle description expansion
  const toggleDescription = useCallback((novelId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  }, []);

  // Toggle tags expansion
  const toggleTags = useCallback((novelId) => {
    setExpandedTags(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  }, []);

  // Function to get genre tags with proper styling
  const getGenreTags = (novel) => {
    if (!novel.genres || novel.genres.length === 0) {
        return [];
    }

    return novel.genres.map(genre => {
        if (genre.includes('Novel') && !['Web Novel', 'One shot'].includes(genre)) {
            let className = '';
            if (genre.includes('Japanese')) className = 'japanese-novel';
            else if (genre.includes('Chinese')) className = 'chinese-novel';
            else if (genre.includes('Korean')) className = 'korean-novel';
            else if (genre.includes('English')) className = 'english-novel';
            else if (genre.includes('Vietnamese')) className = 'vietnamese-novel';

            return {
                name: genre,
                type: 'format-origin',
                class: className
            };
        } else if (genre === 'Mature' || genre === 'Web Novel' || genre === 'One shot') {
            return {
                name: genre,
                type: 'mature',
                class: genre === 'Mature' ? 'mature' : ''
            };
        } else if (['Shounen', 'Shoujo', 'Seinen', 'Josei'].includes(genre)) {
            return {
                name: genre,
                type: 'target-audience',
                class: ''
            };
        } else {
            return {
                name: genre,
                type: 'other',
                class: ''
            };
        }
    }).sort((a, b) => {
        const typeOrder = {
            'format-origin': 1,
            'mature': 2,
            'target-audience': 3,
            'other': 4
        };

        return typeOrder[a.type] - typeOrder[b.type];
    });
  };

  // Render pagination controls
  const renderPagination = () => {
    const pages = [];
    const totalPages = filteredAndPaginatedNovels.totalPages;
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Prepare query params for pagination links
    const genreFilters = Object.keys(appliedGenres).filter(genre => appliedGenres[genre]);
    const queryParams = genreFilters.length > 0 ? `?genres=${genreFilters.join(',')}` : '';

    if (startPage > 1) {
      pages.push(
          <Link
              key="1"
              to={`/novel-directory/page/1${queryParams}`}
              className="pagination-button directory"
          >
            1
          </Link>
      );
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis directory">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
          <Link
              key={i}
              to={`/novel-directory/page/${i}${queryParams}`}
              className={`pagination-button directory ${i === currentPage ? 'active' : ''}`}
          >
            {i}
          </Link>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis directory">...</span>);
      }
      pages.push(
          <Link
              key={totalPages}
              to={`/novel-directory/page/${totalPages}${queryParams}`}
              className="pagination-button directory"
          >
            {totalPages}
          </Link>
      );
    }

    return (
        <div className="pagination directory">
          <Link
              to={currentPage > 1 ? `/novel-directory/page/${currentPage - 1}${queryParams}` : '#'}
              className={`pagination-button directory nav ${currentPage === 1 ? 'disabled' : ''}`}
          >
            ‹
          </Link>
          {pages}
          <Link
              to={currentPage < totalPages ? `/novel-directory/page/${currentPage + 1}${queryParams}` : '#'}
              className={`pagination-button directory nav ${currentPage === totalPages ? 'disabled' : ''}`}
          >
            ›
          </Link>
        </div>
    );
  };

  if (isLoading) return <div className="directory-loading"><LoadingSpinner size="large" text="Đang tải truyện..." /></div>;
  if (error) return <div className="directory-error">{error.message}</div>;

  const { novels, totalItems } = filteredAndPaginatedNovels;

  if (!novels || novels.length === 0) {
    return (
        <div className="novel-list-container directory">
          <div className="content-layout directory">
            <div className="main-content directory">
              <div className="section-headers directory">
                <h2>DANH SÁCH TRUYỆN</h2>
              </div>
              <div className="no-results directory">Không có truyện nào phù hợp với các bộ lọc đã chọn.</div>
              <button className="reset-all-filters directory" onClick={resetFilters}>Xóa tất cả bộ lọc</button>
            </div>

            {/* Sidebar with genre filters */}
            <div className="sidebar" ref={sidebarRef}>
              <div className="filter-panel">
                <h3>Lọc theo thể loại</h3>

                {Object.entries(genreCategories).map(([category, genres]) => (
                    <div key={category} className="genre-category">
                      <h4 className="genre-category-title">{category}</h4>
                      <div className="genre-checkboxes">
                        {genres.map(genre => (
                            <div key={genre} className="genre-checkbox">
                              <input
                                  type="checkbox"
                                  id={`genre-${genre.replace(/\s+/g, '-').toLowerCase()}`}
                                  checked={!!selectedGenres[genre]}
                                  onChange={() => handleGenreChange(genre)}
                              />
                              <label htmlFor={`genre-${genre.replace(/\s+/g, '-').toLowerCase()}`}>
                                {genre}
                              </label>
                            </div>
                        ))}
                      </div>
                    </div>
                ))}

                <div className="filter-actions">
                  <button className="filter-button apply-filters" onClick={applyFilters}>
                    Áp dụng bộ lọc
                  </button>
                  <button className="filter-button reset-filters" onClick={resetFilters}>
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="novel-list-container directory">
        <div className="content-layout directory">
          {/* Main content area */}
          <div className="main-content directory">
            <div className="section-headers directory">
              <h2>DANH SÁCH TRUYỆN</h2>
              <div className="results-count directory">
                Hiển thị {novels.length} trong tổng số {totalItems} truyện
              </div>
            </div>
            <div className="novel-grid directory">
              {novels.map(novel => {
                // Get formatted genre tags for this novel
                const genreTags = getGenreTags(novel);

                return (
                    <div key={novel._id} className="novel-card">
                      {/* Novel cover image with status and update time */}
                      <NovelImage
                          src={novel.illustration || cdnConfig.defaultImageUrl}
                          alt={novel.title}
                          status={novel.status}
                          novelId={novel._id}
                          updatedAt={novel.updatedAt}
                      />

                      {/* Novel content section */}
                      <div className="novel-content">
                        {/* Novel title */}
                        <Link to={generateNovelUrl(novel)} className="dir-novel-title-link">
                          <h3 className="dir-novel-title">{novel.title}</h3>
                        </Link>

                        {/* Genre tags - limited to 2 rows with toggle option */}
                        {genreTags.length > 0 && (
                            <div
                                ref={el => tagListRefs.current[novel._id] = el}
                                className={`dir-tag-list ${expandedTags[novel._id] ? 'expanded' : ''}`}
                            >
                              {genreTags.map((genre, index) => (
                                  <span key={index} className={`dir-tag ${genre.class}`}>
                                    {genre.name}
                                  </span>
                              ))}

                              {needsTagToggle[novel._id] && (
                                  <span
                                      className="dir-toggle-tags"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleTags(novel._id);
                                      }}
                                  >
                                    {expandedTags[novel._id] ? 'Show less' : '...'}
                                  </span>
                              )}
                            </div>
                        )}

                        <div className="dir-novel-description-container" style={{position: 'relative'}}>
                          <div
                              className={`dir-novel-description ${expandedDescriptions[novel._id] ? 'expanded' : ''}`}
                              ref={el => descriptionRefs.current[novel._id] = el}
                          >
                            <div dangerouslySetInnerHTML={{
                              __html: novel.description || ''
                            }} />
                          </div>

                          {novel.description && (
                              <button
                                  className="dir-read-more"
                                  onClick={() => toggleDescription(novel._id)}
                              >
                                {expandedDescriptions[novel._id] ? 'Thu gọn' : 'Đọc tiếp'}
                              </button>
                          )}
                        </div>

                      </div>
                    </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            {renderPagination()}
          </div>

          {/* Sidebar with genre filters */}
          <div className="sidebar" ref={sidebarRef}>
            <div className="filter-panel">
              <h3>Lọc theo thể loại</h3>

              {/* Genre category sections */}
              {Object.entries(genreCategories).map(([category, genres]) => (
                  <div key={category} className="genre-category">
                    <h4 className="genre-category-title">{category}</h4>
                    <div className="genre-checkboxes">
                      {genres.map(genre => (
                          <div key={genre} className="genre-checkbox">
                            <input
                                type="checkbox"
                                id={`genre-${genre.replace(/\s+/g, '-').toLowerCase()}`}
                                checked={!!selectedGenres[genre]}
                                onChange={() => handleGenreChange(genre)}
                            />
                            <label htmlFor={`genre-${genre.replace(/\s+/g, '-').toLowerCase()}`}>
                              {genre}
                            </label>
                          </div>
                      ))}
                    </div>
                  </div>
              ))}

              {/* Filter actions */}
              <div className="filter-actions">
                <button className="filter-button apply-filters" onClick={applyFilters}>
                  Áp dụng bộ lọc
                </button>
                <button className="filter-button reset-filters" onClick={resetFilters}>
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default NovelDirectory;