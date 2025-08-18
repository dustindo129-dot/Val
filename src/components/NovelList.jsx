import {useState, useEffect, memo, useRef} from 'react';
import {Link, useNavigate, useParams, useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useSEO } from '../context/SEOContext';
import HotNovels from './HotNovels';
import RecentlyRead from './RecentlyRead';
import RecentComments from './RecentComments';
import '../styles/NovelList.css';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import api from '../utils/apiHelper';
import LoadingSpinner from './LoadingSpinner';
import { generateNovelUrl, generateChapterUrl } from '../utils/slugUtils';
import { translateStatus, getStatusForDataAttr } from '../utils/statusTranslation';

/**
 * NovelImage Component
 */
const NovelImage = memo(({src, alt, status, novelId}) => {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src]);

    const handleError = () => {
        setImgSrc('/images/default-cover.jpg');
    };

    return (
        <div className="cover-container">
            <div className="novel-cover-wrapper">
                <img
                    src={imgSrc}
                    alt={alt}
                    onError={handleError}
                    loading="lazy"
                    className="novel-cover"
                />
                <span className="status-badge" data-status={getStatusForDataAttr(status)}>
                    {translateStatus(status)}
                </span>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.src === nextProps.src &&
        prevProps.alt === nextProps.alt &&
        prevProps.status === nextProps.status &&
        prevProps.novelId === nextProps.novelId;
});

// FacebookPlugin Component
const FacebookPlugin = memo(() => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => {
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

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
                return;
            }
            originalConsoleError.apply(console, args);
        };

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
                return;
            }
            originalConsoleWarn.apply(console, args);
        };

        const timeoutId = setTimeout(() => {
            setIsLoaded(true);
        }, 3000);

        return () => {
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            clearTimeout(timeoutId);
        };
    }, []);

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
                    <LoadingSpinner size="large" text="Đang tải bảng tin Facebook..." />
                </div>
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
                        Truy cập trang Facebook
                    </a>
                </div>
            )}
        </div>
    );
});

/**
 * NovelListSEO Component
 */
const NovelListSEO = ({ currentPage = 1 }) => {
    const generateSEOTitle = () => {
        let baseTitle = 'Valvrareteam - Đọc Light Novel Vietsub Miễn Phí | Light Novel Tiếng Việt Hay Nhất';

        if (currentPage > 1) {
            baseTitle = `Valvrareteam - Trang ${currentPage} | Light Novel Tiếng Việt`;
        }

        return baseTitle;
    };

    const generateSEODescription = () => {
        if (currentPage === 1) {
            return 'Thư viện Light Novel vietsub lớn nhất Việt Nam. Đọc Light Novel tiếng Việt miễn phí, cập nhật nhanh, dịch chất lượng cao. Hàng nghìn Light Novel hay đang chờ bạn khám phá!';
        }
        return `Danh sách Light Novel vietsub trang ${currentPage} tại Valvrareteam. Đọc Light Novel tiếng Việt miễn phí, cập nhật nhanh chóng.`;
    };

    const generateKeywords = () => {
        const baseKeywords = [
            'light novel vietsub',
            'light novel tiếng việt',
            'đọc light novel vietsub',
            'light novel việt nam',
            'truyện light novel',
            'ln vietsub',
            'light novel online',
            'đọc ln online',
            'light novel dịch việt',
            'novel tiếng việt',
            'valvrareteam',
            'light novel hay',
            'light novel mới',
            'light novel full vietsub'
        ];

        if (currentPage > 1) {
            baseKeywords.push(`trang ${currentPage}`);
        }

        return baseKeywords.join(', ');
    };

    return (
        <Helmet>
            <title>{generateSEOTitle()}</title>
            <meta name="description" content={generateSEODescription()} />
            <meta name="keywords" content={generateKeywords()} />

            <meta property="og:title" content={generateSEOTitle()} />
            <meta property="og:description" content={generateSEODescription()} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={currentPage === 1 ? "https://valvrareteam.net" : `https://valvrareteam.net/trang/${currentPage}`} />
            <meta property="og:site_name" content="Valvrareteam" />
            <meta property="og:locale" content="vi_VN" />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={generateSEOTitle()} />
            <meta name="twitter:description" content={generateSEODescription()} />

            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
            <meta name="author" content="Valvrareteam" />
            <meta name="language" content="Vietnamese" />
        </Helmet>
    );
};

/**
 * NovelList Component
 */
const NovelList = ({ filter, seoHeaderHTML, seoFooterHTML }) => {
    const navigate = useNavigate();
    const {page} = useParams();
    const location = useLocation();
    const [expandedDescriptions, setExpandedDescriptions] = useState({});
    const [expandedTags, setExpandedTags] = useState({});
    const [needsToggle, setNeedsToggle] = useState({});
    const [descriptionNeedsReadMore, setDescriptionNeedsReadMore] = useState({});
    const currentPage = parseInt(page) || 1;
    const tagListRefs = useRef({});
    const desktopDescriptionRefs = useRef({});
    const mobileDescriptionRefs = useRef({});
    const { setSEOFooterHTML } = useSEO();

    // Redirect /trang/1 to / for SEO purposes
    useEffect(() => {
        if (page === '1' && location.pathname === '/trang/1') {
            navigate('/', { replace: true });
        }
    }, [page, location.pathname, navigate]);

    // Set SEO footer HTML when component mounts
    useEffect(() => {
        if (currentPage === 1 && seoFooterHTML) {
            setSEOFooterHTML(seoFooterHTML);
        } else {
            setSEOFooterHTML(null);
        }
        return () => {
            setSEOFooterHTML(null);
        };
    }, [seoFooterHTML, currentPage, setSEOFooterHTML]);

    const {data, isLoading, error} = useQuery({
        queryKey: ['novels', currentPage],
        queryFn: async () => {
            const cacheBuster = new Date().getTime();
            const response = await api.get(`/api/novels?page=${currentPage}&limit=15&_cb=${cacheBuster}`);
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

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentPage]);

    // Check the height of tag lists and descriptions after component rendering
    useEffect(() => {
        const timer = setTimeout(() => {
            if (novels.length > 0) {
                const updatedNeedsToggle = {};
                const updatedDescriptionNeedsReadMore = {};

                novels.forEach(novel => {
                    const genreTags = getGenreTags(novel);
                    const maxVisibleTags = 6;

                    if (genreTags.length > maxVisibleTags) {
                        updatedNeedsToggle[novel._id] = {
                            needed: true,
                            visibleCount: maxVisibleTags - 1
                        };
                    } else {
                        updatedNeedsToggle[novel._id] = {
                            needed: false,
                            visibleCount: genreTags.length
                        };
                    }

                    // Check description for both mobile and desktop
                    const checkDescriptionNeedsReadMore = () => {
                        const isMobile = window.innerWidth <= 640;
                        const targetRef = isMobile
                            ? mobileDescriptionRefs.current[novel._id]
                            : desktopDescriptionRefs.current[novel._id];

                        if (targetRef) {
                            const computedStyle = window.getComputedStyle(targetRef);
                            if (computedStyle.display !== 'none') {
                                const { scrollHeight, clientHeight } = targetRef;
                                const lineHeight = parseInt(computedStyle.lineHeight) || 20;
                                const maxHeight = lineHeight * 3;
                                return scrollHeight > maxHeight + 5;
                            }
                        }
                        return false;
                    };

                    updatedDescriptionNeedsReadMore[novel._id] = checkDescriptionNeedsReadMore();
                });

                setNeedsToggle(updatedNeedsToggle);
                setDescriptionNeedsReadMore(updatedDescriptionNeedsReadMore);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [novels, data]);

    // resize listener to recheck when screen size changes
    useEffect(() => {
        const handleResize = () => {
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(() => {
                if (novels.length > 0) {
                    const updatedDescriptionNeedsReadMore = {};

                    novels.forEach(novel => {
                        const isMobile = window.innerWidth <= 640;
                        const targetRef = isMobile
                            ? mobileDescriptionRefs.current[novel._id]
                            : desktopDescriptionRefs.current[novel._id];

                        if (targetRef) {
                            const computedStyle = window.getComputedStyle(targetRef);
                            if (computedStyle.display !== 'none') {
                                const { scrollHeight, clientHeight } = targetRef;
                                const lineHeight = parseInt(computedStyle.lineHeight) || 20;
                                const maxHeight = lineHeight * 3;
                                updatedDescriptionNeedsReadMore[novel._id] = scrollHeight > maxHeight + 5;
                            }
                        }
                    });

                    setDescriptionNeedsReadMore(updatedDescriptionNeedsReadMore);
                }
            }, 150);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(window.resizeTimer);
        };
    }, [novels]);

    const handlePageChange = (page) => {
        if (page === 1) {
            navigate('/');
        } else {
            navigate(`/trang/${page}`);
        }
    };

    const renderPagination = () => {
        const buttons = [];
        const totalPages = pagination.totalPages;

        const renderLink = (page) => (
            <Link
                key={page}
                to={page === 1 ? "/" : `/trang/${page}`}
                className={`novel-pagination-button ${currentPage === page ? 'active' : ''}`}
                onClick={() => window.scrollTo(0, 0)}
            >
                {page}
            </Link>
        );

        const addEllipsis = (key) => (
            <span key={key} className="novel-pagination-ellipsis">...</span>
        );

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) buttons.push(renderLink(i));
        } else if (currentPage <= 3) {
            // 1 2 3 4 ... last
            buttons.push(renderLink(1));
            buttons.push(renderLink(2));
            buttons.push(renderLink(3));
            buttons.push(renderLink(4));
            buttons.push(addEllipsis('e-end'));
            buttons.push(renderLink(totalPages));
        } else if (currentPage >= totalPages - 2) {
            // 1 ... last-3 last-2 last-1 last
            buttons.push(renderLink(1));
            buttons.push(addEllipsis('e-start'));
            buttons.push(renderLink(totalPages - 3));
            buttons.push(renderLink(totalPages - 2));
            buttons.push(renderLink(totalPages - 1));
            buttons.push(renderLink(totalPages));
        } else {
            // 1 ... prev current next ... last
            buttons.push(renderLink(1));
            buttons.push(addEllipsis('e-start'));
            buttons.push(renderLink(currentPage - 1));
            buttons.push(renderLink(currentPage));
            buttons.push(renderLink(currentPage + 1));
            buttons.push(addEllipsis('e-end'));
            buttons.push(renderLink(totalPages));
        }

        return (
            <div className="novel-pagination">
                <Link
                    to={currentPage > 1 ? (currentPage === 2 ? "/" : `/trang/${currentPage - 1}`) : '#'}
                    onClick={(e) => {
                        if (currentPage === 1) e.preventDefault();
                        else window.scrollTo(0, 0);
                    }}
                    className={`novel-pagination-button nav ${currentPage === 1 ? 'disabled' : ''}`}
                >
                    ‹
                </Link>
                {buttons}
                <Link
                    to={currentPage < totalPages ? `/trang/${currentPage + 1}` : '#'}
                    onClick={(e) => {
                        if (currentPage === totalPages) e.preventDefault();
                        else window.scrollTo(0, 0);
                    }}
                    className={`novel-pagination-button nav ${currentPage === totalPages ? 'disabled' : ''}`}
                >
                    ›
                </Link>
            </div>
        );
    };

    /**
     * Toggle description expansion state
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

    // Helper function to get the appropriate display date for a chapter
    // Use updatedAt if it's meaningfully different from createdAt (indicating the chapter was published later)
    // Otherwise use createdAt for chapters that were created and published immediately
    const getChapterDisplayDate = (chapter) => {
        if (!chapter) return null;
        
        const createdAt = new Date(chapter.createdAt);
        const updatedAt = new Date(chapter.updatedAt);
        
        // If either date is invalid, fall back to the valid one or null
        if (isNaN(createdAt.getTime()) && isNaN(updatedAt.getTime())) return null;
        if (isNaN(createdAt.getTime())) return chapter.updatedAt;
        if (isNaN(updatedAt.getTime())) return chapter.createdAt;
        
        // If updatedAt is more than 1 minute after createdAt, it's likely a meaningful update
        // This handles cases where chapters are switched from draft to published
        const timeDifference = updatedAt.getTime() - createdAt.getTime();
        const oneMinute = 60 * 1000;
        
        return timeDifference > oneMinute ? chapter.updatedAt : chapter.createdAt;
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

        if (diffYear > 0) return `${diffYear} năm trước`;
        if (diffMonth > 0) return `${diffMonth} tháng trước`;
        if (diffDay > 0) return `${diffDay} ngày trước`;
        if (diffHour > 0) return `${diffHour} giờ trước`;
        if (diffMin > 0) return `${diffMin} phút trước`;
        return 'Vừa xong';
    };

    // Function to get genre tags with proper styling and sorting
    const getGenreTags = (novel) => {
        if (!novel.genres || novel.genres.length === 0) {
            return [];
        }

        return novel.genres.map(genre => {
            let className = '';
            let type = 'other';

            if (genre.includes('Novel') && !['Web Novel', 'One shot'].includes(genre)) {
                type = 'format-origin';
                if (genre.includes('Japanese')) className = 'japanese-novel';
                else if (genre.includes('Chinese')) className = 'chinese-novel';
                else if (genre.includes('Korean')) className = 'korean-novel';
                else if (genre.includes('English')) className = 'english-novel';
                else if (genre.includes('Vietnamese')) className = 'vietnamese-novel';
            } else if (genre === 'Mature') {
                type = 'mature';
                className = 'mature';
            } else if (genre === 'AI-assisted') {
                type = 'ai-assisted';
                className = 'ai-assisted';
            } else if (genre === 'Web Novel' || genre === 'One shot') {
                type = 'web-format';
                className = genre.toLowerCase().replace(' ', '-');
            } else if (['Shounen', 'Shoujo', 'Seinen', 'Josei'].includes(genre)) {
                type = 'target-audience';
            }

            return {
                name: genre,
                type: type,
                class: className
            };
        }).sort((a, b) => {
            const typeOrder = {
                'format-origin': 1,
                'mature': 2,
                'ai-assisted': 3,
                'web-format': 4,
                'target-audience': 5,
                'other': 6
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

    if (isLoading) return (
        <div className="novel-list-wrapper">
            <div className="loading">
                <LoadingSpinner size="large" text="Đang tải truyện..." />
            </div>
        </div>
    );

    if (error) return (
        <div className="novel-list-wrapper">
            <div className="error">{error.message}</div>
        </div>
    );

    if (!novels || novels.length === 0) return (
        <div className="novel-list-wrapper">
            <div className="loading">Không có truyện nào.</div>
        </div>
    );

    return (
        <div className="novel-list-wrapper">
            <NovelListSEO currentPage={currentPage} />

            {/* Discord Button - only show on homepage */}
            {currentPage === 1 && (
                <div className="discord-button-container">
                    <a
                        href="https://discord.gg/NDv9wz9ZQN"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="discord-button"
                        title="Discord mới chính thức của team, nơi để hối chương, thảo luận, tương tác và bú sự kiện!"
                    >
                        <i className="fab fa-discord"></i>
                        Tham gia Discord!
                    </a>
                </div>
            )}

            <div className="novel-list-container">
                {/* SEO Header - rendered for bots */}
                {currentPage === 1 && seoHeaderHTML && (
                    <div dangerouslySetInnerHTML={{ __html: seoHeaderHTML }} />
                )}
                <div className="content-layout">
                    {/* Main content area */}
                    <div className="main-content">
                        <div className="section-headers">
                            <h2>MỚI CẬP NHẬT</h2>
                        </div>
                        {/* Novel grid */}
                        <div className="novel-grid">
                            {novels.map(novel => {
                                // Sort chapters by newest display date first and get the first three
                                const sortedChapters = (novel.chapters || [])
                                    .sort((a, b) => {
                                        const dateA = new Date(getChapterDisplayDate(a));
                                        const dateB = new Date(getChapterDisplayDate(b));
                                        return dateB - dateA;
                                    })
                                    .slice(0, 3);

                                // Get genres for this novel
                                const genreTags = getGenreTags(novel);

                                return (
                                    <div key={novel._id} className="novel-card">
                                        {/* Updated: Novel header without update time */}
                                        <div className="novel-header">
                                            <Link to={generateNovelUrl(novel)} className="novel-list-title-link">
                                                <h3 className="novel-title">{novel.title}</h3>
                                            </Link>
                                            {/* Removed update-time div completely */}
                                        </div>

                                        {/* Novel main content area */}
                                        <div className="novel-main">
                                            {/* Novel cover image with status */}
                                            <NovelImage
                                                src={cdnConfig.getIllustrationUrl(novel.illustration)}
                                                alt={novel.title}
                                                status={novel.status}
                                                novelId={novel._id}
                                            />

                                            {/* Novel info section */}
                                            <div className="novel-info">
                                                {/* Genre tags section */}
                                                {genreTags.length > 0 && (
                                                    <div
                                                        ref={el => tagListRefs.current[novel._id] = el}
                                                        className={`tag-list ${expandedTags[novel._id] ? 'expanded' : ''} ${needsToggle[novel._id]?.needed ? 'needs-toggle' : ''}`}
                                                        id={`tag-list-${novel._id}`}
                                                    >
                                                        {expandedTags[novel._id] ? (
                                                            genreTags.map((genre, index) => (
                                                                <span key={index} className={`tag ${genre.class}`}>
                                                                    {genre.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <>
                                                                {genreTags.slice(0, needsToggle[novel._id]?.visibleCount || genreTags.length).map((genre, index) => (
                                                                    <span key={index} className={`tag ${genre.class}`}>
                                                                        {genre.name}
                                                                    </span>
                                                                ))}

                                                                {needsToggle[novel._id]?.needed && (
                                                                    <span
                                                                        className="toggle-tags"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            toggleTags(novel._id);
                                                                        }}
                                                                    >
                                                                        (...)
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Description - desktop only */}
                                                <div
                                                    className={`description desktop-description ${expandedDescriptions[novel._id] ? 'expanded' : ''} ${descriptionNeedsReadMore[novel._id] ? 'needs-read-more' : ''}`}
                                                    ref={el => desktopDescriptionRefs.current[novel._id] = el}
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

                                                {/* Read more button for desktop */}
                                                {descriptionNeedsReadMore[novel._id] && (
                                                    <div className="read-more-container desktop-read-more">
                                                        <a
                                                            href="#"
                                                            className="read-more"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                toggleDescription(novel._id);
                                                            }}
                                                        >
                                                            {expandedDescriptions[novel._id] ? 'Thu gọn' : 'Đọc tiếp'}
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Updated: Latest chapters list with relative time */}
                                                <div className="chapter-list">
                                                    {sortedChapters.map(chapter => (
                                                        <div key={chapter._id} className="novel-list-chapter-item">
                                                            <Link
                                                                to={generateChapterUrl(novel, chapter)}
                                                                className="novel-list-chapter-title"
                                                            >
                                                                {chapter.title}
                                                            </Link>
                                                            {/* Updated: Show relative time using smart display date logic */}
                                                            <span className="novel-list-chapter-date">
                                                                {getTimeAgo(getChapterDisplayDate(chapter))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                            </div>
                                        </div>

                                        {/* Mobile description section - outside novel-main */}
                                        <div
                                            className={`description mobile-description ${expandedDescriptions[novel._id] ? 'expanded' : ''} ${descriptionNeedsReadMore[novel._id] ? 'needs-read-more' : ''}`}
                                            ref={el => mobileDescriptionRefs.current[novel._id] = el}
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

                                        {/* Read more button for mobile */}
                                        {descriptionNeedsReadMore[novel._id] && (
                                            <div className="read-more-container mobile-read-more">
                                                <a
                                                    href="#"
                                                    className="read-more"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleDescription(novel._id);
                                                    }}
                                                >
                                                    {expandedDescriptions[novel._id] ? 'Thu gọn' : 'Đọc tiếp'}
                                                </a>
                                            </div>
                                        )}
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
                        <RecentlyRead/>
                        <RecentComments/>
                        <FacebookPlugin/>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default NovelList;