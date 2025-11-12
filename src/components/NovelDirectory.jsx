/**
 * NovelDirectory Component
 *
 * Displays a paginated grid of novels with:
 * - Filter sidebar with genre categories and status filters (auto-filtering)
 * - Novel cards arranged in a 2-column grid (horizontal layout)
 * - Client-side filtering and pagination
 */

import { useState, useEffect, memo, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import '../styles/NovelDirectory.css';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import LoadingSpinner from './LoadingSpinner';
import { generateNovelUrl } from '../utils/slugUtils';
import { translateStatus, getStatusForDataAttr } from '../utils/statusTranslation';

// Genre categories for filtering
const genreCategories = {
    'Định Dạng và Nguồn Gốc': [
        'Chinese Novel', 'English Novel', 'Japanese Novel', 'Korean Novel', 'Vietnamese Novel',
        'Web Novel', 'One shot', 'Fanfiction', 'AI-assisted'
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

// Status options for filtering
const statusOptions = [
    { value: 'Ongoing', label: 'Đang tiến hành' },
    { value: 'Completed', label: 'Hoàn thành' },
    { value: 'Hiatus', label: 'Tạm ngưng' }
];

// Sort options (removed latest-update)
const sortOptions = [
    { value: 'title-asc', label: 'Tên truyện (A-Z)' },
    { value: 'word-count-desc', label: 'Số từ (Cao → Thấp)' },
    { value: 'view-count-desc', label: 'Lượt xem (Cao → Thấp)' }
];

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
 * NovelDirectorySEO Component
 *
 * Provides SEO optimization for the novel directory page
 */
const NovelDirectorySEO = ({ currentPage = 1, selectedGenres = {}, selectedStatus = {}, totalItems = 0 }) => {
    const generateSEOTitle = () => {
        const activeGenres = Object.keys(selectedGenres).filter(genre => selectedGenres[genre]);
        const activeStatuses = Object.keys(selectedStatus).filter(status => selectedStatus[status]);

        let baseTitle = 'Danh Sách Light Novel Vietsub - Thư Viện Truyện Đầy Đủ | Valvrareteam';

        if (activeGenres.length > 0 || activeStatuses.length > 0) {
            const filters = [...activeGenres.slice(0, 2), ...activeStatuses.slice(0, 1)];
            const filterText = filters.join(', ');
            baseTitle = `Light Novel ${filterText} Vietsub - Danh Sách Truyện | Valvrareteam`;
        }

        if (currentPage > 1) {
            baseTitle += ` - Trang ${currentPage}`;
        }

        return baseTitle;
    };

    const generateSEODescription = () => {
        const activeGenres = Object.keys(selectedGenres).filter(genre => selectedGenres[genre]);
        const activeStatuses = Object.keys(selectedStatus).filter(status => selectedStatus[status]);

        if (activeGenres.length > 0 || activeStatuses.length > 0) {
            const filters = [...activeGenres.slice(0, 2), ...activeStatuses.slice(0, 1)];
            const filterText = filters.join(', ');
            return `Khám phá danh sách Light Novel ${filterText} vietsub tại Valvrareteam. ${totalItems} truyện chất lượng cao, dịch chuẩn, cập nhật nhanh. Đọc Light Novel tiếng Việt miễn phí.`;
        }

        return `Danh sách đầy đủ các Light Novel vietsub tại Valvrareteam. Hàng nghìn bộ truyện Light Novel tiếng Việt chất lượng cao, phân loại theo thể loại, dễ dàng tìm kiếm và đọc miễn phí.`;
    };

    const generateKeywords = () => {
        const baseKeywords = [
            'danh sách light novel vietsub',
            'light novel tiếng việt',
            'thư viện light novel',
            'light novel theo thể loại',
            'tìm kiếm light novel',
            'light novel việt nam',
            'đọc light novel online',
            'valvrareteam'
        ];

        const activeGenres = Object.keys(selectedGenres).filter(genre => selectedGenres[genre]);
        if (activeGenres.length > 0) {
            activeGenres.forEach(genre => {
                baseKeywords.push(`light novel ${genre.toLowerCase()}`, `${genre.toLowerCase()} vietsub`);
            });
        }

        return baseKeywords.join(', ');
    };

    return (
        <Helmet>
            <title>{generateSEOTitle()}</title>
            <meta name="description" content={generateSEODescription()} />
            <meta name="keywords" content={generateKeywords()} />
            <meta httpEquiv="Content-Language" content="vi-VN" />
            <meta name="language" content="Vietnamese" />
            <meta property="og:title" content={generateSEOTitle()} />
            <meta property="og:description" content={generateSEODescription()} />
            <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
            <meta property="og:url" content="https://valvrareteam.net/danh-sach-truyen" />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Valvrareteam" />
            <meta property="og:locale" content="vi_VN" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={generateSEOTitle()} />
            <meta name="twitter:description" content={generateSEODescription()} />
            <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
            <link rel="canonical" href={currentPage > 1 ? `https://valvrareteam.net/danh-sach-truyen/trang/${currentPage}` : "https://valvrareteam.net/danh-sach-truyen"} />
        </Helmet>
    );
};

/**
 * NovelImage Component
 */
const NovelImage = memo(({ src, alt, status, novelId, updatedAt }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const defaultImage = cdnConfig.getIllustrationUrl(null);

    useEffect(() => {
        setImgSrc(src || defaultImage);
    }, [src]);

    const handleError = () => {
        setImgSrc(defaultImage);
    };

    // Format update time
    const formatUpdateTime = (updatedAt) => {
        if (!updatedAt) return '';

        const now = new Date();
        const updateDate = new Date(updatedAt);
        const diffTime = Math.abs(now - updateDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return '1 ngày trước';
        if (diffDays < 7) return `${diffDays} ngày trước`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tuần trước`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} tháng trước`;
        return `${Math.ceil(diffDays / 365)} năm trước`;
    };

    return (
        <div className="nd-novel-image-container">
            <Link to={generateNovelUrl({ _id: novelId, title: alt })} className="nd-novel-image-link">
                <div className="nd-novel-image">
                    <img
                        src={imgSrc}
                        alt={alt}
                        onError={handleError}
                        loading="lazy"
                    />
                </div>
            </Link>

            {/* Update time at top of image */}
            <div className="nd-update-time">
                <i className="far fa-clock"></i> {formatUpdateTime(updatedAt)}
            </div>

            {/* Status at bottom of image */}
            <span className="nd-novel-status" data-status={getStatusForDataAttr(status)}>
                {translateStatus(status)}
            </span>
        </div>
    );
});

/**
 * NovelDirectory Component
 */
const NovelDirectory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { page } = useParams();
    const currentPage = parseInt(page) || 1;
    const ITEMS_PER_PAGE = 20; // 2 columns x 10 rows

    const [expandedDescriptions, setExpandedDescriptions] = useState({});
    const [expandedGenres, setExpandedGenres] = useState({});
    const [selectedGenres, setSelectedGenres] = useState({});
    const [selectedStatus, setSelectedStatus] = useState({});
    const [sortBy, setSortBy] = useState('title-asc');
    const [needsGenreToggle, setNeedsGenreToggle] = useState({});

    const genreTagsRefs = useRef({});

    // Parse URL search params for filters
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const genres = searchParams.get('genres');
        const status = searchParams.get('status');
        const sort = searchParams.get('sort');

        if (genres) {
            const genreArray = genres.split(',');
            const genreObject = {};
            genreArray.forEach(genre => {
                genreObject[genre] = true;
            });
            setSelectedGenres(genreObject);
        }

        if (status) {
            const statusArray = status.split(',');
            const statusObject = {};
            statusArray.forEach(s => {
                statusObject[s] = true;
            });
            setSelectedStatus(statusObject);
        }

        if (sort && sortOptions.find(option => option.value === sort)) {
            setSortBy(sort);
        }
    }, [location.search]);

    // Query to fetch novels
    const { data, isLoading, error } = useQuery({
        queryKey: ['novels-directory', 'large-list'],
        queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/novels?page=1&limit=1000`);

            // Don't pre-sort here - let the frontend sorting handle it based on user selection
            const novels = response.data.novels || [];

            return {
                novels: novels,
                totalCount: novels.length
            };
        },
        staleTime: 1000 * 60 * 10,
        cacheTime: 1000 * 60 * 30,
        refetchOnMount: false,
        refetchOnWindowFocus: false
    });

    // Check if genre lists need a toggle button and calculate visible genres
    useEffect(() => {
        if (data?.novels) {
            const timer = setTimeout(() => {
                const updatedNeedsToggle = {};

                data.novels.forEach(novel => {
                    const novelId = novel._id;
                    if (novel.genres && novel.genres.length > 0) {
                        // Simple calculation: assume about 6-8 tags per row, 2 rows = 12-16 tags max
                        // For more precise control, we'll use a conservative estimate
                        const maxVisibleTags = 8; // Conservative estimate for 2 rows

                        if (novel.genres.length > maxVisibleTags) {
                            updatedNeedsToggle[novelId] = {
                                needed: true,
                                visibleCount: maxVisibleTags - 1 // Reserve space for "(...)"
                            };
                        } else {
                            updatedNeedsToggle[novelId] = {
                                needed: false,
                                visibleCount: novel.genres.length
                            };
                        }
                    }
                });

                setNeedsGenreToggle(updatedNeedsToggle);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [data]);

    // Auto update filters and navigate when filters change
    const updateFiltersAndNavigate = useCallback((newGenres, newStatus) => {
        const genreFilters = Object.keys(newGenres).filter(genre => newGenres[genre]);
        const statusFilters = Object.keys(newStatus).filter(status => newStatus[status]);

        let queryString = '';
        const params = [];

        if (sortBy !== 'title-asc') {
            params.push(`sort=${sortBy}`);
        }
        if (genreFilters.length > 0) {
            params.push(`genres=${genreFilters.join(',')}`);
        }
        if (statusFilters.length > 0) {
            params.push(`status=${statusFilters.join(',')}`);
        }

        if (params.length > 0) {
            queryString = '?' + params.join('&');
        }

        navigate(`/danh-sach-truyen/trang/1${queryString}`);
    }, [sortBy, navigate]);

    // Filter, sort and paginate novels client-side
    const filteredAndPaginatedNovels = useMemo(() => {
        if (!data?.novels) return { novels: [], totalPages: 1, totalItems: 0 };

        let filtered = [...data.novels];

        // Filter by genres
        const activeGenres = Object.keys(selectedGenres).filter(genre => selectedGenres[genre]);
        if (activeGenres.length > 0) {
            filtered = filtered.filter(novel =>
                novel.genres && activeGenres.every(genre => novel.genres.includes(genre))
            );
        }

        // Filter by status
        const activeStatuses = Object.keys(selectedStatus).filter(status => selectedStatus[status]);
        if (activeStatuses.length > 0) {
            filtered = filtered.filter(novel =>
                novel.status && activeStatuses.includes(novel.status)
            );
        }

        // Sort novels
        const sortFunction = (a, b) => {
            switch (sortBy) {
                case 'word-count-desc':
                    return (b.wordCount || 0) - (a.wordCount || 0);
                case 'view-count-desc':
                    return (b.views?.total || 0) - (a.views?.total || 0);
                case 'title-asc':
                default:
                    return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    });
            }
        };

        filtered.sort(sortFunction);

        // Calculate pagination
        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedNovels = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return {
            novels: paginatedNovels,
            totalPages,
            totalItems: filtered.length
        };
    }, [data, currentPage, selectedGenres, selectedStatus, sortBy]);

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentPage]);

    // Handle genre checkbox changes with auto-filtering
    const handleGenreChange = useCallback((genre) => {
        const newGenres = {
            ...selectedGenres,
            [genre]: !selectedGenres[genre]
        };
        setSelectedGenres(newGenres);

        // Auto update URL and navigate
        updateFiltersAndNavigate(newGenres, selectedStatus);
    }, [selectedGenres, selectedStatus, updateFiltersAndNavigate]);

    // Handle status checkbox changes with auto-filtering
    const handleStatusChange = useCallback((status) => {
        const newStatus = {
            ...selectedStatus,
            [status]: !selectedStatus[status]
        };
        setSelectedStatus(newStatus);

        // Auto update URL and navigate
        updateFiltersAndNavigate(selectedGenres, newStatus);
    }, [selectedGenres, selectedStatus, updateFiltersAndNavigate]);

    // Handle sort change
    const handleSortChange = useCallback((newSortBy) => {
        setSortBy(newSortBy);

        const searchParams = new URLSearchParams(location.search);
        searchParams.set('sort', newSortBy);

        const genreFilters = Object.keys(selectedGenres).filter(genre => selectedGenres[genre]);
        const statusFilters = Object.keys(selectedStatus).filter(status => selectedStatus[status]);

        let queryString = `?sort=${newSortBy}`;
        if (genreFilters.length > 0) {
            queryString += `&genres=${genreFilters.join(',')}`;
        }
        if (statusFilters.length > 0) {
            queryString += `&status=${statusFilters.join(',')}`;
        }

        navigate(`/danh-sach-truyen/trang/1${queryString}`);
    }, [selectedGenres, selectedStatus, navigate, location.search]);

    // Reset filters
    const resetFilters = useCallback(() => {
        setSelectedGenres({});
        setSelectedStatus({});
        setSortBy('title-asc');
        navigate('/danh-sach-truyen/trang/1');
    }, [navigate]);

    // Toggle description expansion
    const toggleDescription = useCallback((novelId) => {
        setExpandedDescriptions(prev => ({
            ...prev,
            [novelId]: !prev[novelId]
        }));
    }, []);

    // Toggle genres expansion
    const toggleGenres = useCallback((novelId) => {
        setExpandedGenres(prev => ({
            ...prev,
            [novelId]: !prev[novelId]
        }));
    }, []);

    // Get genre tags with proper styling
    const getGenreTags = (novel) => {
        if (!novel.genres || novel.genres.length === 0) {
            return [];
        }

        return novel.genres.map(genre => {
            let className = '';

            if (genre.includes('Novel') && !['Web Novel', 'One shot'].includes(genre)) {
                if (genre.includes('Japanese')) className = 'nd-japanese-novel';
                else if (genre.includes('Chinese')) className = 'nd-chinese-novel';
                else if (genre.includes('Korean')) className = 'nd-korean-novel';
                else if (genre.includes('English')) className = 'nd-english-novel';
                else if (genre.includes('Vietnamese')) className = 'nd-vietnamese-novel';
            } else if (genre === 'Mature') {
                className = 'nd-mature';
            }

            return {
                name: genre,
                type: genre.includes('Novel') && !['Web Novel', 'One shot'].includes(genre) ? 'format-origin' :
                    genre === 'Mature' || genre === 'Web Novel' || genre === 'One shot' ? 'mature' :
                        ['Shounen', 'Shoujo', 'Seinen', 'Josei'].includes(genre) ? 'target-audience' : 'other',
                class: className
            };
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

    // Format word count
    const formatWordCount = (wordCount) => {
        if (wordCount === undefined || wordCount === null) return 'Chưa có thông tin';
        if (wordCount === 0) return '0 từ';

        if (wordCount >= 1000000) {
            return `${(wordCount / 1000000).toFixed(1)}M từ`;
        } else if (wordCount >= 1000) {
            return `${(wordCount / 1000).toFixed(1)}K từ`;
        } else {
            return `${wordCount} từ`;
        }
    };

    // Format view count
    const formatViewCount = (viewCount) => {
        if (viewCount === undefined || viewCount === null || viewCount === 0) return '0 lượt';

        if (viewCount >= 1000000) {
            return `${(viewCount / 1000000).toFixed(1)}M lượt`;
        } else if (viewCount >= 1000) {
            return `${(viewCount / 1000).toFixed(1)}K lượt`;
        } else {
            return `${viewCount} lượt`;
        }
    };

    // Render pagination controls
    const renderPagination = () => {
        const totalPages = filteredAndPaginatedNovels.totalPages;

        // Prepare query params for pagination links
        const params = [];
        if (sortBy !== 'title-asc') {
            params.push(`sort=${sortBy}`);
        }

        const genreFilters = Object.keys(selectedGenres).filter(genre => selectedGenres[genre]);
        const statusFilters = Object.keys(selectedStatus).filter(status => selectedStatus[status]);

        if (genreFilters.length > 0) {
            params.push(`genres=${genreFilters.join(',')}`);
        }
        if (statusFilters.length > 0) {
            params.push(`status=${statusFilters.join(',')}`);
        }

        const queryParams = params.length > 0 ? `?${params.join('&')}` : '';

        const renderLink = (page) => (
            <Link
                key={page}
                to={`/danh-sach-truyen/trang/${page}${queryParams}`}
                className={`nd-pagination-button ${page === currentPage ? 'nd-active' : ''}`}
            >
                {page}
            </Link>
        );

        const addEllipsis = (key) => (
            <span key={key} className="nd-pagination-ellipsis">...</span>
        );

        const buttons = [];
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
            <div className="nd-pagination">
                <Link
                    to={currentPage > 1 ? `/danh-sach-truyen/trang/${currentPage - 1}${queryParams}` : '#'}
                    className={`nd-pagination-button nav ${currentPage === 1 ? 'nd-disabled' : ''}`}
                >
                    ‹
                </Link>
                {buttons}
                <Link
                    to={currentPage < totalPages ? `/danh-sach-truyen/trang/${currentPage + 1}${queryParams}` : '#'}
                    className={`nd-pagination-button nav ${currentPage === totalPages ? 'nd-disabled' : ''}`}
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
            <>
                <NovelDirectorySEO
                    currentPage={currentPage}
                    selectedGenres={selectedGenres}
                    selectedStatus={selectedStatus}
                    totalItems={totalItems}
                />

                <div className="novel-list-container nd-directory">
                    <div className="nd-content-layout nd-directory">
                        <div className="nd-main-content">
                            <div className="nd-section-headers">
                                <h2>DANH SÁCH TRUYỆN ({totalItems})</h2>
                            </div>
                            <div className="nd-no-results">Không có truyện nào phù hợp với các bộ lọc đã chọn.</div>
                            <button className="nd-reset-all-filters" onClick={resetFilters}>Xóa tất cả bộ lọc</button>
                        </div>

                        <div className="nd-sidebar">
                            <div className="nd-filter-panel">
                                <h3>Bộ lọc</h3>

                                {/* Status Filter */}
                                <div className="nd-status-filter">
                                    <h4 className="nd-status-filter-title">Tình trạng</h4>
                                    <div className="nd-status-checkboxes">
                                        {statusOptions.map(status => (
                                            <div key={status.value} className="nd-status-checkbox">
                                                <input
                                                    type="checkbox"
                                                    id={`status-${status.value.toLowerCase()}`}
                                                    checked={!!selectedStatus[status.value]}
                                                    onChange={() => handleStatusChange(status.value)}
                                                />
                                                <label htmlFor={`status-${status.value.toLowerCase()}`}>
                                                    {status.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Genre Filters */}
                                {Object.entries(genreCategories).map(([category, genres]) => (
                                    <div key={category} className="nd-genre-category">
                                        <h4 className="nd-genre-category-title">{category}</h4>
                                        <div className="nd-genre-checkboxes">
                                            {genres.map(genre => (
                                                <div key={genre} className="nd-genre-checkbox">
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

                                <div className="nd-filter-actions">
                                    <button className="nd-filter-button nd-reset-filters" onClick={resetFilters}>
                                        Xóa bộ lọc
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <NovelDirectorySEO
                currentPage={currentPage}
                selectedGenres={selectedGenres}
                selectedStatus={selectedStatus}
                totalItems={totalItems}
            />

            <div className="novel-list-container nd-directory">
                <div className="nd-content-layout nd-directory">
                    <div className="nd-main-content">
                        <div className="nd-section-headers">
                            <h2>DANH SÁCH TRUYỆN ({totalItems})</h2>

                            {/* Sort controls */}
                            <div className="nd-sort-controls">
                                <span className="nd-sort-label">Sắp xếp theo:</span>
                                <select
                                    className="nd-sort-select"
                                    value={sortBy}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                >
                                    {sortOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="nd-novel-grid">
                            {novels.map(novel => {
                                const genreTags = getGenreTags(novel);

                                return (
                                    <div key={novel._id} className="nd-novel-card">
                                        {/* Left side - Cover image with update time and status overlay */}
                                        <NovelImage
                                            src={cdnConfig.getIllustrationUrl(novel.illustration)}
                                            alt={novel.title}
                                            status={novel.status}
                                            novelId={novel._id}
                                            updatedAt={novel.updatedAt}
                                        />

                                        {/* Right side - Content */}
                                        <div className="nd-novel-content">
                                            {/* Novel title - no line limit */}
                                            <Link to={generateNovelUrl(novel)} className="nd-novel-title-link">
                                                <h3 className="nd-novel-title">{novel.title}</h3>
                                            </Link>

                                            {/* Novel info content */}
                                            <div className="nd-novel-info">
                                                {/* Genre tags - limited to 2 rows with toggle */}
                                                {genreTags.length > 0 && (
                                                    <div
                                                        ref={el => genreTagsRefs.current[novel._id] = el}
                                                        className={`nd-genre-tags ${expandedGenres[novel._id] ? 'nd-expanded' : ''}`}
                                                    >
                                                        {expandedGenres[novel._id] ? (
                                                            // Show all genres when expanded
                                                            genreTags.map((genre, index) => (
                                                                <span key={index} className={`nd-genre-tag ${genre.class}`}>
                                                                    {genre.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            // Show limited genres when collapsed
                                                            <>
                                                                {genreTags.slice(0, needsGenreToggle[novel._id]?.visibleCount || genreTags.length).map((genre, index) => (
                                                                    <span key={index} className={`nd-genre-tag ${genre.class}`}>
                                                                        {genre.name}
                                                                    </span>
                                                                ))}

                                                                {needsGenreToggle[novel._id]?.needed && (
                                                                    <span
                                                                        className="nd-toggle-genres"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            toggleGenres(novel._id);
                                                                        }}
                                                                    >
                                                                        (...)
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Word count and view count */}
                                                <div className="nd-stats-row">
                                                    <div className="nd-word-count">
                                                        <span className="nd-word-count-label">Số từ:</span> {formatWordCount(novel.wordCount)}
                                                    </div>
                                                    <div className="nd-view-count">
                                                        <span className="nd-view-count-label">Lượt xem:</span> {formatViewCount(novel.views?.total)}
                                                    </div>
                                                </div>

                                                {/* Novel description */}
                                                <div className="nd-novel-description-container" style={{position: 'relative'}}>
                                                    <div
                                                        className={`nd-novel-description ${expandedDescriptions[novel._id] ? 'nd-expanded' : ''}`}
                                                    >
                                                        <div dangerouslySetInnerHTML={{
                                                            __html: novel.description || ''
                                                        }} />
                                                    </div>

                                                    {novel.description && (
                                                        <div className="nd-read-more-container">
                                                            <button
                                                                className="nd-read-more"
                                                                onClick={() => toggleDescription(novel._id)}
                                                            >
                                                                {expandedDescriptions[novel._id] ? 'Thu gọn' : 'Đọc tiếp'}
                                                            </button>
                                                        </div>
                                                    )}
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

                    {/* Sidebar with filters */}
                    <div className="nd-sidebar">
                        <div className="nd-filter-panel">
                            <h3>Bộ lọc</h3>

                            {/* Status Filter */}
                            <div className="nd-status-filter">
                                <h4 className="nd-status-filter-title">Tình trạng</h4>
                                <div className="nd-status-checkboxes">
                                    {statusOptions.map(status => (
                                        <div key={status.value} className="nd-status-checkbox">
                                            <input
                                                type="checkbox"
                                                id={`status-${status.value.toLowerCase()}`}
                                                checked={!!selectedStatus[status.value]}
                                                onChange={() => handleStatusChange(status.value)}
                                            />
                                            <label htmlFor={`status-${status.value.toLowerCase()}`}>
                                                {status.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Genre category sections */}
                            {Object.entries(genreCategories).map(([category, genres]) => (
                                <div key={category} className="nd-genre-category">
                                    <h4 className="nd-genre-category-title">{category}</h4>
                                    <div className="nd-genre-checkboxes">
                                        {genres.map(genre => (
                                            <div key={genre} className="nd-genre-checkbox">
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
                            <div className="nd-filter-actions">
                                <button className="nd-filter-button nd-reset-filters" onClick={resetFilters}>
                                    Xóa bộ lọc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default NovelDirectory;