import { useState, useEffect, memo, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import '../styles/NovelList.css';
import config from '../config/config';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateNovelUrl, generateChapterUrl } from '../utils/slugUtils';
import { translateStatus, getStatusForCSS } from '../utils/statusTranslation';

/**
 * OLNSEO Component
 * 
 * Provides SEO optimization for the OLN (Original Light Novel) page including:
 * - Dynamic title based on current page
 * - Meta description
 * - Keywords
 * - Open Graph tags
 */
const OLNSEO = ({ currentPage = 1 }) => {
  // Generate SEO-optimized title
  const generateSEOTitle = () => {
    let baseTitle = 'Truyện Sáng Tác - Original Light Novel Tiếng Việt | Valvrareteam';
    
    // Add page number if not on first page
    if (currentPage > 1) {
      baseTitle += ` - Trang ${currentPage}`;
    }
    
    return baseTitle;
  };

  // Generate SEO description
  const generateSEODescription = () => {
    return 'Khám phá những tác phẩm Light Novel sáng tác gốc tiếng Việt tại Valvrareteam. Đọc truyện sáng tác chất lượng cao từ các tác giả Việt Nam, cập nhật liên tục, hoàn toàn miễn phí.';
  };

  // Generate keywords
  const generateKeywords = () => {
    const keywords = [
      'truyện sáng tác',
      'original light novel',
      'light novel việt nam',
      'truyện gốc tiếng việt',
      'tác giả việt nam',
      'light novel sáng tác',
      'oln vietsub',
      'truyện tự viết',
      'valvrareteam',
      'đọc truyện sáng tác miễn phí'
    ];
    
    return keywords.join(', ');
  };

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{generateSEOTitle()}</title>
      <meta name="description" content={generateSEODescription()} />
      <meta name="keywords" content={generateKeywords()} />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content={generateSEOTitle()} />
      <meta property="og:description" content={generateSEODescription()} />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content="https://valvrareteam.net/oln" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={generateSEOTitle()} />
      <meta name="twitter:description" content={generateSEODescription()} />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={currentPage > 1 ? `https://valvrareteam.net/oln/trang/${currentPage}` : "https://valvrareteam.net/oln"} />
    </Helmet>
  );
};

// NovelImage Component - Reused from NovelList
const NovelImage = memo(({src, alt, status, novelId, firstChapter}) => {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src]);

    const handleError = () => {
        setImgSrc('/images/default-cover.jpg');
    };

    return (
        <div className="cover-container">
            <img
                src={imgSrc}
                alt={alt}
                onError={handleError}
                loading="lazy"
                className="novel-cover"
            />
            <span className="status-badge" data-status={getStatusForCSS(status)}>
                {translateStatus(status)}
            </span>
            {firstChapter && (
                <Link to={generateChapterUrl({ _id: novelId, title: alt }, firstChapter)} className="first-chapter">
                    &gt;&gt; Chương đầu
                </Link>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.src === nextProps.src &&
        prevProps.alt === nextProps.alt &&
        prevProps.status === nextProps.status &&
        prevProps.novelId === nextProps.novelId &&
        prevProps.firstChapter?._id === nextProps.firstChapter?._id;
});

// FacebookPlugin Component - Reused from NovelList
const FacebookPlugin = memo(() => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => {
        // Set a timeout to mark as loaded after 3 seconds, regardless of actual load status
        const timeoutId = setTimeout(() => {
            setIsLoaded(true);
        }, 3000);

        // Cleanup function
        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    // Handle iframe load and error events
    const handleLoad = () => {
        setIsLoaded(true);
        setHasError(false);
    };

    const handleError = () => {
        setHasError(true);
        setIsLoaded(true);
    };

    return (
        <div className="facebook-plugin">
            {!isLoaded && (
                                <div className="fb-loading">                    <LoadingSpinner size="large" text="Đang tải bảng tin Facebook..." />                </div>
            )}
            
            <iframe 
                ref={iframeRef}
                src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D100064392503502&tabs=timeline&width=400&height=800&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&lazy=true"
                width="400"
                height="800"
                style={{ 
                    border: 'none', 
                    overflow: 'hidden',
                    display: isLoaded ? 'block' : 'none' 
                }}
                scrolling="no"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                onLoad={handleLoad}
                onError={handleError}
                title="Facebook Page Timeline"
            ></iframe>
            
            {hasError && (
                <div className="fb-error">
                    <p>Không thể tải nội dung Facebook.</p>
                    <a 
                        href="https://www.facebook.com/profile.php?id=100064392503502" 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        Truy cập trang Facebook của chúng tôi
                    </a>
                </div>
            )}
        </div>
    );
});

// OLN Component
const OLN = () => {
    const navigate = useNavigate();
    const { page } = useParams();
    const location = useLocation();
    const [expandedDescriptions, setExpandedDescriptions] = useState({});
    const [expandedTags, setExpandedTags] = useState({});
    const [needsToggle, setNeedsToggle] = useState({});
    const [descriptionNeedsReadMore, setDescriptionNeedsReadMore] = useState({});
    const [sortOrder, setSortOrder] = useState('alphabet'); // Default sort: alphabetical
    const currentPage = parseInt(page) || 1;
    const tagListRefs = useRef({});
    const descriptionRefs = useRef({});

    const { data, isLoading, error } = useQuery({
        queryKey: ['vietnameseNovels', currentPage, sortOrder],
        queryFn: async () => {
            // Get all novels instead of paginated results to ensure we don't miss any Vietnamese novels
            const response = await axios.get(`${config.backendUrl}/api/novels?limit=100`);
            
            // Filter novels with "Vietnamese Novel" genre tag
            const allNovels = response.data.novels || [];
            const vietnameseNovels = allNovels.filter(novel => {
                const hasVietnameseTag = novel.genres && novel.genres.includes('Vietnamese Novel');
                return hasVietnameseTag;
            });
            
            // Sort novels
            if (sortOrder === 'alphabet') {
                vietnameseNovels.sort((a, b) => a.title.localeCompare(b.title));
            } else if (sortOrder === 'newest') {
                vietnameseNovels.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } else if (sortOrder === 'updated') {
                vietnameseNovels.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            }
            
            // Handle pagination manually after filtering
            const startIndex = (currentPage - 1) * 15;
            const endIndex = startIndex + 15;
            const paginatedNovels = vietnameseNovels.slice(startIndex, endIndex);
            
            return {
                novels: paginatedNovels,
                pagination: {
                    currentPage: currentPage,
                    totalPages: Math.ceil(vietnameseNovels.length / 15) || 1,
                    totalItems: vietnameseNovels.length
                }
            };
        },
        staleTime: 1000 * 60 * 5,
        cacheTime: 1000 * 60 * 10,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchInterval: 1000 * 60 * 5,
        keepPreviousData: true
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

    // Check the height of tag lists and descriptions after component rendering
    useEffect(() => {
        const timer = setTimeout(() => {
            if (novels.length > 0) {
                const updatedNeedsToggle = {};
                const updatedDescriptionNeedsReadMore = {};

                // Check tag list
                novels.forEach(novel => {
                    const tagListRef = tagListRefs.current[novel._id];
                    if (tagListRef) {
                        const {scrollHeight, clientHeight} = tagListRef;
                        const tagCount = novel.genres?.length || 0;

                        const isSignificantOverflow = scrollHeight > clientHeight + 5;
                        const hasManyTags = tagCount > 3;

                        updatedNeedsToggle[novel._id] = isSignificantOverflow && hasManyTags;
                    }

                    // Check description
                    const descriptionRef = descriptionRefs.current[novel._id];
                    if (descriptionRef) {
                        const {scrollHeight, clientHeight} = descriptionRef;
                        const isOverflowing = scrollHeight > clientHeight + 2;
                        updatedDescriptionNeedsReadMore[novel._id] = isOverflowing;
                    }
                });

                setNeedsToggle(updatedNeedsToggle);
                setDescriptionNeedsReadMore(updatedDescriptionNeedsReadMore);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [novels, data]);

    const handlePageChange = (page) => {
        navigate(`/oln/trang/${page}`);
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
                    to="/oln/trang/1"
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
                    to={`/oln/trang/${i}`}
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
                    to={`/oln/trang/${pagination.totalPages}`}
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
                    to={currentPage > 1 ? `/oln/trang/${currentPage - 1}` : '#'}
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
                    to={currentPage < pagination.totalPages ? `/oln/trang/${currentPage + 1}` : '#'}
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

    // Toggle description expansion state
    const toggleDescription = (novelId) => {
        setExpandedDescriptions(prev => ({
            ...prev,
            [novelId]: !prev[novelId]
        }));
    };

    const toggleTags = (novelId) => {
        setExpandedTags(prev => ({
            ...prev,
            [novelId]: !prev[novelId]
        }));
    };

    // Formats date for display in Vietnamese format (DD/MM/YYYY)
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffMonth / 12);

        if (diffYear > 0) return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
        if (diffMonth > 0) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
        if (diffDay > 0) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
        if (diffHour > 0) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
        if (diffMin > 0) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
        return 'Just now';
    };

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

    // Function to truncate HTML content safely
    const truncateHTML = (html, maxLength) => {
        if (!html) return '';

        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || div.innerText || '';

        // If text is shorter than maxLength, return original HTML
        if (text.length <= maxLength) {
            return {
                html: html,
                isTruncated: false
            };
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

        return {
            html: truncated + '...',
            isTruncated: true
        };
    };

    // Handle sort order change
    const handleSortChange = (e) => {
        setSortOrder(e.target.value);
    };

    if (isLoading) return <div className="loading"><LoadingSpinner size="large" text="Đang tải truyện..." /></div>;    if (error) return <div className="error">{error.message}</div>;    if (!novels || novels.length === 0) return <div className="loading">Không có truyện sáng tác có sẵn.</div>;

    return (
        <>
            <OLNSEO currentPage={currentPage} />
            <div className="novel-list-container">
                <div className="content-layout">
                    {/* Main content area */}
                    <div className="main-content">
                        <div className="section-headers">
                            <h2>TRUYỆN SÁNG TÁC</h2>
                            <div className="sort-controls-container">
                                <label htmlFor="sort-order" className="sort-label">Sắp xếp theo:</label>
                                <select 
                                    id="sort-order" 
                                    value={sortOrder} 
                                    onChange={handleSortChange}
                                    className="sort-select"
                                >
                                    <option value="alphabet">A-Z</option>
                                    <option value="newest">Mới nhất</option>
                                    <option value="updated">Cập nhật gần đây</option>
                                </select>
                            </div>
                        </div>
                        {/* Novel grid */}
                        <div className="novel-grid">
                            {novels.map(novel => {
                                // Sort chapters by newest first and get the first three
                                const sortedChapters = (novel.chapters || [])
                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                    .slice(0, 3);

                                // Get genres for this novel
                                const genreTags = getGenreTags(novel);

                                // Find the first chapter (lowest chapter number)
                                const firstChapter = novel.firstChapter ||
                                    (novel.chapters && novel.chapters.length > 0
                                        ? novel.chapters.reduce((prev, curr) =>
                                            (prev.chapterNumber < curr.chapterNumber) ? prev : curr
                                        )
                                        : null);

                                return (
                                    <div key={novel._id} className="novel-card" style={{
                                        backgroundImage: "var(--novel-card-bg)",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}>
                                        {/* Novel header with title and update time */}
                                        <div className="novel-header">
                                            <Link to={generateNovelUrl(novel)} className="novel-list-title-link">
                                                <h3 className="novel-title">{novel.title}</h3>
                                            </Link>
                                            <div className="update-time">
                                                <i className="far fa-clock"></i> {getTimeAgo(novel.updatedAt || new Date())}
                                            </div>
                                        </div>

                                        {/* Novel main content area */}
                                        <div className="novel-main">
                                            {/* Novel cover image with status and first chapter link */}
                                            <NovelImage
                                                src={novel.illustration || 'https://valvrareteam.b-cdn.net/defaults/missing-image.png'}
                                                alt={novel.title}
                                                status={novel.status}
                                                novelId={novel._id}
                                                firstChapter={firstChapter}
                                            />

                                            {/* Novel info section */}
                                            <div className="novel-info">
                                                {/* Genre tags section */}
                                                {genreTags.length > 0 && (
                                                    <div
                                                        ref={el => tagListRefs.current[novel._id] = el}
                                                        className={`tag-list ${expandedTags[novel._id] ? 'expanded' : ''} ${needsToggle[novel._id] ? 'needs-toggle' : ''}`}
                                                        id={`tag-list-${novel._id}`}
                                                    >
                                                        {genreTags.map((genre, index) => (
                                                            <span key={index} className={`tag ${genre.class}`}>
                                                                {genre.name}
                                                            </span>
                                                        ))}
                                                        <span
                                                            className="toggle-tags"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                toggleTags(novel._id);
                                                            }}
                                                        >
                                                            ...
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Novel description with height-based overflow check */}
                                                <div
                                                    className={`description ${expandedDescriptions[novel._id] ? 'expanded' : ''}`}
                                                    ref={el => descriptionRefs.current[novel._id] = el}
                                                >
                                                    {(() => {
                                                        const truncatedResult = truncateHTML(novel.description, 1000);
                                                        return (
                                                            <div dangerouslySetInnerHTML={{ 
                                                                __html: expandedDescriptions[novel._id] ? novel.description : truncatedResult.html 
                                                            }} />
                                                        );
                                                    })()}
                                                </div>

                                                {/* Read more button - only show when description is actually truncated */}
                                                {(() => {
                                                    const truncatedResult = truncateHTML(novel.description, 1000);
                                                    return truncatedResult.isTruncated && descriptionNeedsReadMore[novel._id] && (
                                                        <div className="read-more-container">
                                                            <a
                                                                href="#"
                                                                className="read-more"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    toggleDescription(novel._id);
                                                                }}
                                                            >
                                                                {expandedDescriptions[novel._id] ? 'Collapse' : 'Read more'}
                                                            </a>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Latest chapters list */}
                                                <div className="chapter-list">
                                                    {sortedChapters.map(chapter => (
                                                        <div key={chapter._id} className="novel-list-chapter-item">
                                                            <Link
                                                                to={generateChapterUrl(novel, chapter)}
                                                                className="novel-list-chapter-title"
                                                            >
                                                                {chapter.title}
                                                            </Link>
                                                            <span className="novel-list-chapter-date">
                                                                {formatDate(chapter.createdAt)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Pagination controls */}
                        {renderPagination()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default OLN; 