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

import {useState, useEffect, memo, useRef} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import axios from 'axios';
import HotNovels from './HotNovels';
import RecentComments from './RecentComments';
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

// NovelImage Component
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
            <span className="status-badge" data-status={status || 'ONGOING'}>
        {status || 'ONGOING'}
      </span>
            {firstChapter && (
                <Link to={`/novel/${novelId}/chapter/${firstChapter._id}`} className="first-chapter">
                    &gt;&gt; First Chapter
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

// FacebookPlugin Component
const FacebookPlugin = memo(() => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Intercept errors as early as possible - before the component fully mounts
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        // More aggressive global error handler to catch all Facebook-related errors
        window.addEventListener('error', function(event) {
            const errorMsg = event.message || '';
            if (
                errorMsg.includes('u_1_') || 
                errorMsg.includes('Could not find element') || 
                errorMsg.includes('FB') || 
                errorMsg.includes('facebook') ||
                errorMsg.includes('DataStore') ||
                errorMsg.includes('__elem_')
            ) {
                event.preventDefault();
                event.stopPropagation();
                return true;
            }
        }, true);
        
        // Override console.error to suppress specific Facebook-related errors
        console.error = function(...args) {
            const errorMsg = args[0]?.toString() || '';
            if (
                errorMsg.includes('u_1_') || 
                errorMsg.includes('Could not find element') || 
                errorMsg.includes('FB') || 
                errorMsg.includes('facebook') ||
                errorMsg.includes('DataStore') ||
                errorMsg.includes('__elem_')
            ) {
                // Suppress Facebook-related errors
                return;
            }
            originalConsoleError.apply(console, args);
        };
        
        // Override console.warn to suppress specific Facebook-related warnings
        console.warn = function(...args) {
            const warnMsg = args[0]?.toString() || '';
            if (
                warnMsg.includes('u_1_') || 
                warnMsg.includes('Could not find element') || 
                warnMsg.includes('FB') || 
                warnMsg.includes('facebook') ||
                warnMsg.includes('DataStore') ||
                warnMsg.includes('mutation event') ||
                warnMsg.includes('__elem_')
            ) {
                // Suppress Facebook-related warnings
                return;
            }
            originalConsoleWarn.apply(console, args);
        };
        
        // Set a timeout to mark as loaded after 3 seconds, regardless of actual load status
        const timeoutId = setTimeout(() => {
            setIsLoaded(true);
        }, 3000);

        // Cleanup function
        return () => {
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
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
                <div className="fb-loading">
                    <div className="fb-loading-spinner"></div>
                    <div className="fb-loading-text">Loading Facebook timeline...</div>
                </div>
            )}
            
            <iframe 
                src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D100064392503502&tabs=timeline&width=400&height=800&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true"
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
                    <p>Unable to load Facebook content.</p>
                    <a 
                        href="https://www.facebook.com/profile.php?id=100064392503502" 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        Visit our Facebook page
                    </a>
                </div>
            )}
        </div>
    );
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
    const {page} = useParams();
    const [expandedDescriptions, setExpandedDescriptions] = useState({});
    const [expandedTags, setExpandedTags] = useState({});
    const [needsToggle, setNeedsToggle] = useState({});
    const [descriptionNeedsReadMore, setDescriptionNeedsReadMore] = useState({});
    const currentPage = parseInt(page) || 1;
    const tagListRefs = useRef({});
    const descriptionRefs = useRef({});

    const {data, isLoading, error} = useQuery({
        queryKey: ['novels', currentPage],
        queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/novels?page=${currentPage}&limit=15`);
            return response.data;
        },
        staleTime: 1000 * 60 * 5,
        cacheTime: 1000 * 60 * 10,
        refetchOnMount: false,
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
                        // Thêm threshold nhỏ để tránh lỗi hiển thị với sự khác biệt nhỏ
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

    const toggleTags = (novelId) => {
        setExpandedTags(prev => ({
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
            if (genre.includes('Novel')) {
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
            } else if (genre === 'Mature') {
                return {
                    name: genre,
                    type: 'mature',
                    class: 'mature'
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
                                            <Link to={`/novel/${novel._id}`} className="novel-list-title-link">
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
                                                src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'}
                                                alt={novel.title}
                                                status={novel.status}
                                                novelId={novel._id}
                                                firstChapter={firstChapter}
                                            />

                                            {/* Novel info section */}
                                            <div className="novel-info">
                                                {/* Genre tags section - Với class needs-toggle động dựa trên state */}
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
                                                                to={`/novel/${novel._id}/chapter/${chapter._id}`}
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
                    {/* Sidebar with hot novels and Facebook plugin */}
                    <aside className="sidebar">
                        <HotNovels/>
                        <FacebookPlugin/>
                        <RecentComments/>
                    </aside>
                </div>
            </div>
        </>
    );
};

export default NovelList;