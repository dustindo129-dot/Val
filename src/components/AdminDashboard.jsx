/**
 * AdminDashboard Component - Enhanced with Floating Labels
 *
 * Administrative interface for managing the entire novel platform including:
 * - Novel management (CRUD operations)
 * - User management
 * - Content moderation
 * - Platform statistics
 * - System settings
 *
 * Features:
 * - Novel listing and management
 * - User listing and management
 * - Content moderation tools
 * - Analytics dashboard
 * - Bulk actions
 * - Search and filtering
 * - Role-based access control
 * - Enhanced floating labels for all inputs
 */

import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback} from 'react';
import {useAuth} from '../context/AuthContext';
import {Helmet} from 'react-helmet-async';
import axios from 'axios';
import '../styles/components/AdminDashboard.css';
import config from '../config/config';
import {Editor} from '@tinymce/tinymce-react';
import {Link} from 'react-router-dom';
import {useNovelStatus} from '../context/NovelStatusContext';
import {useNovel} from '../context/NovelContext';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import bunnyUploadService from '../services/bunnyUploadService';
import {generateNovelUrl} from '../utils/slugUtils';
import LoadingSpinner from './LoadingSpinner';
import {FixedSizeList as List} from 'react-window';

/**
 * FloatingLabelInput Component
 *
 * Input component with floating label animation
 */
const FloatingLabelInput = React.memo(({
                                           type = "text",
                                           name,
                                           value,
                                           onChange,
                                           label,
                                           required = false,
                                           disabled = false,
                                           className = "",
                                           ...props
                                       }) => {
    const [hasContent, setHasContent] = useState(false);

    // Check if input has content when value changes
    useEffect(() => {
        setHasContent(Boolean(value && value.toString().trim()));
    }, [value]);

    // Handle input change and update content state
    const handleChange = (e) => {
        const newValue = e.target.value;
        setHasContent(Boolean(newValue && newValue.trim()));
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <div className="form-group">
            <input
                type={type}
                name={name}
                value={value || ''}
                onChange={handleChange}
                required={required}
                disabled={disabled}
                className={`${hasContent ? 'has-content' : ''} ${disabled ? 'disabled-field' : ''} ${className}`}
                placeholder="" // Remove placeholder to allow floating label
                {...props}
            />
            <label>{label}{required && ' *'}</label>
        </div>
    );
});

FloatingLabelInput.displayName = 'FloatingLabelInput';

/**
 * FloatingLabelTextarea Component
 *
 * Textarea component with floating label animation
 */
const FloatingLabelTextarea = React.memo(({
                                              name,
                                              value,
                                              onChange,
                                              label,
                                              required = false,
                                              disabled = false,
                                              className = "",
                                              ...props
                                          }) => {
    const [hasContent, setHasContent] = useState(false);

    // Check if textarea has content when value changes
    useEffect(() => {
        setHasContent(Boolean(value && value.toString().trim()));
    }, [value]);

    // Handle textarea change and update content state
    const handleChange = (e) => {
        const newValue = e.target.value;
        setHasContent(Boolean(newValue && newValue.trim()));
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <div className="form-group textarea-group">
      <textarea
          name={name}
          value={value || ''}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          className={`${hasContent ? 'has-content' : ''} ${disabled ? 'disabled-field' : ''} ${className}`}
          placeholder="" // Remove placeholder to allow floating label
          {...props}
      />
            <label>{label}{required && ' *'}</label>
        </div>
    );
});

FloatingLabelTextarea.displayName = 'FloatingLabelTextarea';

/**
 * StaffInputWithSearch Component
 *
 * Staff input component with user search and floating label
 */
const StaffInputWithSearch = React.memo(({
                                             item,
                                             searchResults = [],
                                             isSearching = false,
                                             onSearchChange,
                                             onUserSelect,
                                             onClearResults,
                                             disabled = false,
                                             containerRef
                                         }) => {
    const [hasContent, setHasContent] = useState(false);

    // Update content state when search query changes
    useEffect(() => {
        setHasContent(Boolean(item.searchQuery && item.searchQuery.trim()));
    }, [item.searchQuery]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setHasContent(Boolean(newValue && newValue.trim()));
        if (onSearchChange) {
            onSearchChange(newValue);
        }
    };

    return (
        <div
            className="user-search-container"
            ref={containerRef}
        >
            <div className="form-group">
                <input
                    type="text"
                    value={item.searchQuery || ''}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className={`${hasContent ? 'has-content' : ''} ${disabled ? 'disabled-field' : ''}`}
                    placeholder=""
                />
                <label>Tên User</label>
            </div>
            {item.selectedUser && (
                <div className="user-selected-indicator">
                    ✓
                </div>
            )}
            {isSearching && (
                <div className="search-loading">Đang tìm...</div>
            )}
            {searchResults && searchResults.length > 0 && !disabled && (
                <div className="user-search-results">
                    {searchResults.map(user => (
                        <div
                            key={user._id}
                            className="user-search-result"
                            onClick={() => onUserSelect && onUserSelect(user)}
                        >
                            <div className="user-info">
                                <span className="admin-user-display-name">{user.displayName || user.username}</span>
                                <span className="user-username">@{user.username}</span>
                            </div>
                        </div>
                    ))}
                    <div className="search-help-text">
                        Nhấp bên ngoài để đóng hoặc nhập tên trực tiếp nếu người này chưa có tài khoản
                    </div>
                </div>
            )}
        </div>
    );
});

StaffInputWithSearch.displayName = 'StaffInputWithSearch';

/**
 * BalanceEditInput Component
 *
 * Balance edit input with floating label
 */
const BalanceEditInput = React.memo(({
                                         value,
                                         onChange,
                                         onSave,
                                         onCancel
                                     }) => {
    const [hasContent, setHasContent] = useState(false);

    useEffect(() => {
        setHasContent(Boolean(value && value.toString().trim()));
    }, [value]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setHasContent(Boolean(newValue && newValue.trim()));
        if (onChange) {
            onChange(newValue);
        }
    };

    return (
        <div className="balance-edit-container">
            <span>Số dư truyện: </span>
            <div className="form-group">
                <input
                    type="number"
                    min="0"
                    step="1"
                    value={value}
                    onChange={(e) => handleChange(e)}
                    className={hasContent ? 'has-content' : ''}
                />
                <label>Số dư</label>
            </div>
            <div className="balance-edit-actions">
                <button
                    onClick={onSave}
                    className="save-balance-btn"
                >
                    Lưu
                </button>
                <button
                    onClick={onCancel}
                    className="cancel-balance-btn"
                >
                    Hủy bỏ
                </button>
            </div>
        </div>
    );
});

BalanceEditInput.displayName = 'BalanceEditInput';

/**
 * AdminDashboardSEO Component
 *
 * Provides SEO optimization for the AdminDashboard page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const AdminDashboardSEO = () => {
    return (
        <Helmet>
            {/* Basic meta tags */}
            <title>Bảng Quản Trị - Dành cho Admin và Mod | Valvrareteam</title>
            <meta name="description"
                  content="Trang quản trị dành cho admin và moderator Valvrareteam. Quản lý truyện, thêm/sửa/xóa Light Novel, quản lý thể loại và nội dung website."/>
            <meta name="keywords"
                  content="bảng quản trị, admin dashboard, quản lý truyện, light novel management, valvrareteam, admin panel"/>
            <meta name="robots" content="noindex, nofollow"/>

            {/* Language and charset */}
            <meta httpEquiv="Content-Language" content="vi-VN"/>
            <meta name="language" content="Vietnamese"/>

            {/* Open Graph meta tags */}
            <meta property="og:title" content="Bảng Quản Trị - Dành cho Admin và Mod | Valvrareteam"/>
            <meta property="og:description" content="Trang quản trị dành cho admin và moderator Valvrareteam."/>
            <meta property="og:image"
                  content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif"/>
            <meta property="og:url" content="https://valvrareteam.net/bang-quan-tri"/>
            <meta property="og:type" content="website"/>
            <meta property="og:site_name" content="Valvrareteam"/>
            <meta property="og:locale" content="vi_VN"/>

            {/* Twitter Card meta tags */}
            <meta name="twitter:card" content="summary_large_image"/>
            <meta name="twitter:title" content="BBảng Quản Trị - Dành cho Admin và Mod| Valvrareteam"/>
            <meta name="twitter:description" content="Trang quản trị dành cho admin và moderator Valvrareteam."/>
            <meta name="twitter:image"
                  content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif"/>
        </Helmet>
    );
};

/**
 * DeleteConfirmationModal Component
 *
 * Modal component that requires typing the novel title to confirm deletion.
 */
const DeleteConfirmationModal = ({novel, onConfirm, onCancel}) => {
    const [confirmText, setConfirmText] = useState('');
    const [isMatch, setIsMatch] = useState(false);

    useEffect(() => {
        // Make comparison case-insensitive and trim whitespace
        const normalizedConfirmText = confirmText.trim().toLowerCase();
        const normalizedNovelTitle = novel.title.trim().toLowerCase();
        setIsMatch(normalizedConfirmText === normalizedNovelTitle);
    }, [confirmText, novel.title]);

    return (
        <div className="delete-confirmation-modal-overlay">
            <div className="delete-confirmation-modal">
                <h3>Xác nhận xóa truyện</h3>
                <p>Hành động này không thể hoàn tác. Để xác nhận, hãy nhập chính xác tiêu đề truyện: <strong
                    className="non-selectable-text">{novel.title}</strong></p>

                <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Nhập tiêu đề truyện"
                    className="confirmation-input"
                />

                <div className="confirmation-actions">
                    <button
                        onClick={onConfirm}
                        disabled={!isMatch}
                        className={`confirm-delete-btn ${isMatch ? 'enabled' : 'disabled'}`}
                    >
                        Xóa truyện
                    </button>
                    <button onClick={onCancel} className="cancel-delete-btn">
                        Hủy bỏ
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * VirtualNovelItem Component
 *
 * Individual novel item component for virtual scrolling.
 * Renders a single novel with all its actions and controls.
 */
const VirtualNovelItem = React.memo(({
                                         index,
                                         style,
                                         data: {
                                             novels,
                                             user,
                                             canEditNovels,
                                             canDeleteNovels,
                                             canEditBalances,
                                             handleEdit,
                                             handleDelete,
                                             handleStatusChange,
                                             editingBalanceId,
                                             balanceValue,
                                             setBalanceValue,
                                             handleEditBalance,
                                             cancelEditBalance,
                                             saveBalanceChange
                                         }
                                     }) => {
    const novel = novels[index];

    if (!novel) return null;

    return (
        <div style={style} className="virtual-list-item">
            <li className="novel-list-item">
                <div className="novel-title-section">
                    <div className="novel-info">
                        <Link
                            to={generateNovelUrl(novel)}
                            className="novel-title-link"
                        >
                            {novel.title}
                        </Link>
                        <div className="novel-balance">
                            <div className="balance-info">
                                <div className="budget-display">
                                    Kho lúa: {novel.novelBudget || 0} 🌾
                                </div>
                                <div className="balance-display">
                                    {editingBalanceId === novel._id ? (
                                        <BalanceEditInput
                                            value={balanceValue}
                                            onChange={setBalanceValue}
                                            onSave={() => saveBalanceChange(novel._id)}
                                            onCancel={cancelEditBalance}
                                        />
                                    ) : (
                                        <>
                                            Số dư truyện: {novel.novelBalance || 0} 🌾
                                            {canEditBalances && (
                                                <button
                                                    onClick={() => handleEditBalance(novel._id, novel.novelBalance || 0)}
                                                    className="edit-balance-btn"
                                                >
                                                    Chỉnh sửa
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="novel-actions">
                    <select
                        className="status-dropdown"
                        value={novel.status || 'Ongoing'}
                        onChange={(e) => handleStatusChange(novel._id, e.target.value)}
                    >
                        <option value="Ongoing">Đang tiến hành</option>
                        <option value="Completed">Đã hoàn thành</option>
                        <option value="Hiatus">Tạm ngưng</option>
                    </select>
                    

                    
                    {canEditNovels && (
                        <button onClick={() => handleEdit(novel)}>Chỉnh sửa</button>
                    )}
                    {canDeleteNovels && (
                        <button
                            className="delete"
                            onClick={() => handleDelete(novel)}
                        >Xóa</button>
                    )}
                </div>
            </li>
        </div>
    );
});

VirtualNovelItem.displayName = 'VirtualNovelItem';

/**
 * HTML Sanitization Utility
 *
 * Cleans up messy HTML by removing excessive inline styles and attributes
 * while preserving basic formatting elements and structure
 */
const sanitizeHTML = (html) => {
    if (!html) return '';

    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Function to clean a single element
    const cleanElement = (element) => {
        // Remove all style attributes
        element.removeAttribute('style');

        // Remove excessive attributes but keep essential ones
        const allowedAttributes = {
            'a': ['href', 'target', 'title'],
            'img': ['src', 'alt', 'title', 'width', 'height'],
            'sup': ['class', 'data-footnote'], // For footnotes
            'sub': [],
            'strong': [],
            'b': [],
            'em': [],
            'i': [],
            'u': [],
            'p': [],
            'br': [],
            'h1': [], 'h2': [], 'h3': [], 'h4': [], 'h5': [], 'h6': [],
            'ul': [],
            'ol': [],
            'li': [],
            'blockquote': [],
            'pre': [],
            'code': []
        };

        const tagName = element.tagName?.toLowerCase();
        const allowed = allowedAttributes[tagName] || [];

        // Remove all attributes except allowed ones
        const attributesToRemove = [];
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            if (!allowed.includes(attr.name)) {
                attributesToRemove.push(attr.name);
            }
        }

        attributesToRemove.forEach(attrName => {
            element.removeAttribute(attrName);
        });
    };

    // Function to unwrap unnecessary spans and other elements
    const unwrapUnnecessaryElements = (element) => {
        const unnecessaryTags = ['span', 'font', 'div'];

        if (unnecessaryTags.includes(element.tagName?.toLowerCase())) {
            // Move all child nodes before this element
            while (element.firstChild) {
                element.parentNode.insertBefore(element.firstChild, element);
            }
            // Remove the now-empty element
            element.parentNode.removeChild(element);
            return true; // Element was removed
        }
        return false; // Element was not removed
    };

    // Recursively clean all elements
    const processElements = (container) => {
        const elements = Array.from(container.querySelectorAll('*'));

        // Process in reverse order to handle nested elements properly
        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];

            // First clean the element
            cleanElement(element);

            // Then try to unwrap if unnecessary
            const wasRemoved = unwrapUnnecessaryElements(element);

            // If element still exists, check for empty paragraphs
            if (!wasRemoved && element.tagName?.toLowerCase() === 'p' && !element.textContent.trim()) {
                element.remove();
            }
        }
    };

    // Process all elements
    processElements(tempDiv);

    // Clean up the HTML structure
    let cleanedHTML = tempDiv.innerHTML;

    // Remove empty paragraphs and extra whitespace
    cleanedHTML = cleanedHTML
        .replace(/<p[^>]*>\s*<\/p>/gi, '') // Remove empty p tags
        .replace(/<p[^>]*>\s*(&nbsp;|\u00A0|\s)*\s*<\/p>/gi, '') // Remove p tags with only nbsp
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .trim();

    return cleanedHTML;
};


/**
 * AdminDashboard Component
 *
 * Main component that provides administrative interface for managing
 * the entire novel platform
 *
 * @param {Object} props - No props required
 */
const AdminDashboard = () => {
    const {updateNovelStatus} = useNovelStatus();
    const {updateNovel} = useNovel();
    const queryClient = useQueryClient();
    const {user} = useAuth();

    // Clear cache when user changes (logout/login with different user)
    const previousUserRef = useRef(null);
    useEffect(() => {
        // Only clear cache if user actually changed (not on initial load)
        const currentUserKey = user ? `${user.id}_${user.role}` : null;
        const previousUserKey = previousUserRef.current ? `${previousUserRef.current.id}_${previousUserRef.current.role}` : null;

        if (previousUserRef.current !== null && currentUserKey !== previousUserKey) {
            // Clear all novels cache when user actually changes
            console.log('User changed, clearing novels cache');
            queryClient.removeQueries({queryKey: ['novels']});
        }

        previousUserRef.current = user;
    }, [user?.id, user?.role, queryClient]);

    // Genre categories and options - Updated with Fanfiction removed
    const genreCategories = {
        'Thể Loại Chính': [
            'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
            'Historical', 'Horror', 'Mystery', 'Romance', 'Science Fiction',
            'Slice of Life', 'Supernatural', 'Suspense', 'Tragedy',
            'Magic', 'Psychological'
        ],
        'Đối Tượng': [
            'Seinen', 'Shounen', 'Josei', 'Shoujo'
        ],
        'Đặc Trưng Quan Hệ và Nhân Vật': [
            'Age Gap', 'Boys Love', 'Character Growth', 'Different Social Status',
            'Female Protagonist', 'Gender Bender', 'Harem', 'Incest',
            'Mature', 'Netorare', 'Reverse Harem', 'Yuri'
        ],
        'Thiết lập và Thế Giới': [
            'Cooking', 'Game', 'Isekai', 'Martial Arts', 'Mecha', 'Military',
            'Otome Game', 'Parody', 'School Life', 'Slow Life', 'Sports',
            'Super Power', 'Wars', 'Workplace'
        ],
        'Định Dạng và Nguồn gốc': [
            'Chinese Novel', 'English Novel', 'Japanese Novel', 'Korean Novel', 'Vietnamese Novel',
            'Web Novel', 'One shot', 'AI-assisted'
        ]
    };

    // State management for novels
    const [newNovel, setNewNovel] = useState({
        title: '',
        alternativeTitles: '',
        author: '',
        illustrator: '',
        active: {
            pj_user: [],
            translator: [],
            editor: [],
            proofreader: []
        },
        inactive: {
            pj_user: [],
            translator: [],
            editor: [],
            proofreader: []
        },
        genres: [],
        description: '',
        note: '',
        illustration: ''
    });
    const [editingNovel, setEditingNovel] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Staff management state
    const [activeStaffItems, setActiveStaffItems] = useState([]);
    const [inactiveStaffItems, setInactiveStaffItems] = useState([]);

    // User search state for active staff
    const [userSearchResults, setUserSearchResults] = useState({});
    const [searchingUsers, setSearchingUsers] = useState({});

    const [description, setDescription] = useState('');
    const editorRef = useRef(null);
    const noteEditorRef = useRef(null);

    // State for editing novel balance
    const [editingBalanceId, setEditingBalanceId] = useState(null);
    const [balanceValue, setBalanceValue] = useState(0);

    // Add state for delete confirmation modal
    const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({
        isOpen: false,
        novelToDelete: null
    });

    // Add debounce timeout ref for user search
    const searchTimeoutRef = useRef(null);

    // Add refs for search containers to handle outside clicks
    const searchContainerRefs = useRef({});

    // Add state for sort control
    const [sortType, setSortType] = useState('updated'); // 'updated', 'balance', or 'paid'

    // Add state for search functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [originalNovelGenres, setOriginalNovelGenres] = useState([]);

    // Add ref for virtual list container height calculation
    const novelListContainerRef = useRef(null);
    const [virtualListHeight, setVirtualListHeight] = useState(600);
    // Initialize with proper size based on current screen width
    const getInitialItemSize = () => {
        const width = window.innerWidth;
        if (width <= 576) return 180; // Very small mobile
        if (width <= 768) return 150; // Mobile/tablet
        return 120; // Desktop
    };
    const [itemSize, setItemSize] = useState(getInitialItemSize);
    const [dimensionsReady, setDimensionsReady] = useState(false);

    // Add effect to calculate virtual list height and item size dynamically
    useLayoutEffect(() => {
        const calculateDimensions = () => {
            const containerHeight = window.innerHeight - 300; // Account for header, form, etc.
            const maxHeight = Math.max(400, Math.min(800, containerHeight));
            setVirtualListHeight(maxHeight);

            // Adjust item size based on screen width to match CSS min-heights
            const width = window.innerWidth;
            const isVerySmallMobile = width <= 576;
            const isMobile = width <= 768;

            let newItemSize;
            if (isVerySmallMobile) {
                newItemSize = 180; // Match CSS: .virtual-list-item min-height: 180px
            } else if (isMobile) {
                newItemSize = 150; // Match CSS: .virtual-list-item min-height: 150px
            } else {
                newItemSize = 120; // Match CSS: .virtual-list-item min-height: 120px
            }

            setItemSize(newItemSize);

            // Mark dimensions as ready after first calculation
            if (!dimensionsReady) {
                setDimensionsReady(true);
            }
        };

        // Calculate immediately and add a small delay to ensure CSS is loaded
        calculateDimensions();
        const timeoutId = setTimeout(() => {
            calculateDimensions();
        }, 100);

        window.addEventListener('resize', calculateDimensions);

        return () => {
            window.removeEventListener('resize', calculateDimensions);
            clearTimeout(timeoutId);
        };
    }, [dimensionsReady]);

    // Add effect to handle clicking outside search results
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check each search container
            Object.entries(searchContainerRefs.current).forEach(([itemId, ref]) => {
                if (ref && !ref.contains(event.target)) {
                    // Click was outside this search container, clear its results
                    setUserSearchResults(prev => {
                        const newResults = {...prev};
                        if (newResults[itemId] && newResults[itemId].length > 0) {
                            newResults[itemId] = [];
                        }
                        return newResults;
                    });
                }
            });
        };

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch novels using React Query
    const {data: novels = [], isLoading: novelsLoading} = useQuery({
        queryKey: ['novels', user?.id, user?.role, sortType], // Include sortType in cache key for paid content
        queryFn: async () => {
            // Include paid content info when filtering by paid content
            // When includePaidInfo=true, backend automatically skips staff population for performance
            const includePaidInfo = sortType === 'paid' ? '&includePaidInfo=true' : '';
            const skipPopulation = sortType === 'paid' ? '' : '&skipPopulation=true';
            
            const url = `${config.backendUrl}/api/novels?limit=1000&bypass=true${skipPopulation}${includePaidInfo}&t=${Date.now()}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch novels');
            }

            const data = await response.json();
            return Array.isArray(data.novels) ? data.novels : (Array.isArray(data) ? data : []);
        },
        enabled: !!user, // Only fetch when user is available
        staleTime: 60000, // Consider data fresh for 1 minute
        cacheTime: 300000, // Cache for 5 minutes
        refetchOnMount: false, // Don't refetch on mount if data exists
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnReconnect: false // Don't refetch on reconnect
    });

    // Sort and filter novels by selected criteria and search query
    const sortedNovels = useMemo(() => {
        if (!novels || novels.length === 0) return [];

        // First filter by search query
        let filteredNovels = novels;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filteredNovels = novels.filter(novel => {
                // Search in title
                const titleMatch = novel.title?.toLowerCase().includes(query);

                // Search in alternative titles (handle array)
                let altTitlesMatch = false;
                if (novel.alternativeTitles) {
                    if (Array.isArray(novel.alternativeTitles)) {
                        // If it's an array, search through each alternative title
                        altTitlesMatch = novel.alternativeTitles.some(altTitle =>
                            altTitle?.toLowerCase().includes(query)
                        );
                    } else if (typeof novel.alternativeTitles === 'string') {
                        // If it's a string, search directly
                        altTitlesMatch = novel.alternativeTitles.toLowerCase().includes(query);
                    }
                }

                return titleMatch || altTitlesMatch;
            });
        }

        // Further filter for paid content if needed
        if (sortType === 'paid') {
            filteredNovels = filteredNovels.filter(novel => {
                // Check if novel has current paid content (positive balances only)
                const hasPaidModules = (novel.paidModulesCount || 0) > 0;
                const hasPaidChapters = (novel.paidChaptersCount || 0) > 0;
                
                return hasPaidModules || hasPaidChapters;
            });
        }

        // Then sort the filtered results
        return filteredNovels.sort((a, b) => {
            if (sortType === 'balance') {
                // Sort by novelBalance in descending order (highest first)
                const balanceA = a.novelBalance || 0;
                const balanceB = b.novelBalance || 0;
                return balanceB - balanceA;
            } else if (sortType === 'paid') {
                // For paid content, sort by most recent paid content first, then by balance
                const balanceA = a.novelBalance || 0;
                const balanceB = b.novelBalance || 0;
                if (balanceA !== balanceB) {
                    return balanceB - balanceA; // Higher balance first
                }
                // If balance is same, sort by most recent update
                const timestampA = new Date(a.updatedAt || a.createdAt).getTime();
                const timestampB = new Date(b.updatedAt || b.createdAt).getTime();
                return timestampB - timestampA;
            } else {
                // Sort by updatedAt timestamp (most recent first) - default behavior
                const timestampA = new Date(a.updatedAt || a.createdAt).getTime();
                const timestampB = new Date(b.updatedAt || b.createdAt).getTime();
                return timestampB - timestampA;
            }
        });
    }, [novels, sortType, searchQuery]);

    // Check if user can perform admin operations
    const canEditNovels = user && (user.role === 'admin' || user.role === 'moderator' || user.role === 'pj_user'); // pj_users can edit novel content but not staff
    const canDeleteNovels = user && (user.role === 'admin');
    const canEditBalances = user && (user.role === 'admin');
    const canCreateNovels = user && (user.role === 'admin' || user.role === 'moderator'); // Only admin/mod can create (involves staff assignment)
    const canEditStaff = user && (user.role === 'admin' || user.role === 'moderator'); // Only admin/mod can modify staff assignments
    const canEditTitle = user && (user.role === 'admin' || user.role === 'moderator'); // Only admin/mod can edit novel titles

    // Helper function to get genre color class
    const getGenreColorClass = (genre) => {
        if (genre.includes('Novel') && !['Web Novel', 'One shot'].includes(genre)) {
            if (genre.includes('Japanese')) return 'japanese-novel';
            else if (genre.includes('Chinese')) return 'chinese-novel';
            else if (genre.includes('Korean')) return 'korean-novel';
            else if (genre.includes('English')) return 'english-novel';
            else if (genre.includes('Vietnamese')) return 'vietnamese-novel';
        } else if (genre === 'Mature') {
            return 'mature';
        } else if (genre === 'AI-assisted') {
            return 'ai-assisted';
        } else if (genre === 'Web Novel' || genre === 'One shot') {
            return genre.toLowerCase().replace(' ', '-');
        }
        return '';
    };

    // Function to check if a genre can be unchecked by current user
    const canUncheckGenre = (genre) => {
        // Define language genres that are always protected for pj_users
        const languageGenres = [
            'Chinese Novel',
            'English Novel',
            'Japanese Novel',
            'Korean Novel',
            'Vietnamese Novel'
        ];

        // Language genres are always protected for pj_users
        if (languageGenres.includes(genre) && user?.role === 'pj_user') {
            return false;
        }

        // For Mature and AI-assisted genres, only restrict if they were in original novel
        const conditionallyProtectedGenres = ['Mature', 'AI-assisted'];
        if (conditionallyProtectedGenres.includes(genre) && user?.role === 'pj_user') {
            // Only restrict if this genre was in the original novel
            return !originalNovelGenres.includes(genre);
        }

        return true; // All other cases allow unchecking
    };

    const isGenreDisabled = (genre) => {
        // Define language genres that are always protected for pj_users
        const languageGenres = [
            'Chinese Novel',
            'English Novel',
            'Japanese Novel',
            'Korean Novel',
            'Vietnamese Novel'
        ];

        // Language genres are always disabled for pj_users
        if (languageGenres.includes(genre) && user?.role === 'pj_user') {
            return true;
        }

        // For Mature and AI-assisted, only disable unchecking if they were in original
        const conditionallyProtectedGenres = ['Mature', 'AI-assisted'];
        if (conditionallyProtectedGenres.includes(genre) && user?.role === 'pj_user') {
            const target = editingNovel ? editingNovel : newNovel;
            const isCurrentlyChecked = (target.genres || []).includes(genre);
            const wasInOriginal = originalNovelGenres.includes(genre);

            // Only disable if genre is currently checked AND was in original novel
            return isCurrentlyChecked && wasInOriginal;
        }

        return false; // All other cases are not disabled
    };

    const getGenreLockIndicator = (genre) => {
        const languageGenres = [
            'Chinese Novel',
            'English Novel',
            'Japanese Novel',
            'Korean Novel',
            'Vietnamese Novel'
        ];

        // Language genres always show lock for pj_users
        if (languageGenres.includes(genre) && user?.role === 'pj_user') {
            return '🔒';
        }

        // For Mature and AI-assisted, only show lock if they were in original
        const conditionallyProtectedGenres = ['Mature', 'AI-assisted'];
        if (conditionallyProtectedGenres.includes(genre) && user?.role === 'pj_user') {
            const target = editingNovel ? editingNovel : newNovel;
            const isCurrentlyChecked = (target.genres || []).includes(genre);
            const wasInOriginal = originalNovelGenres.includes(genre);

            // Only show lock if currently checked AND was in original
            if (isCurrentlyChecked && wasInOriginal) {
                return '🔒';
            }
        }

        return null; // No lock indicator
    };

    // Function to validate language novel selection
    const validateLanguageGenres = () => {
        const target = editingNovel ? editingNovel : newNovel;
        const languageGenres = ['Chinese Novel', 'English Novel', 'Japanese Novel', 'Korean Novel', 'Vietnamese Novel'];
        const selectedLanguageGenres = target.genres.filter(genre => languageGenres.includes(genre));

        return selectedLanguageGenres.length === 1;
    };

    /**
     * Handles input changes in the novel form
     * @param {React.ChangeEvent<HTMLInputElement>} e - Change event
     */
    const handleInputChange = (e) => {
        const target = editingNovel ? editingNovel : newNovel;
        const value = e.target.value;

        const updatedNovel = {
            ...target,
            [e.target.name]: value
        };

        if (editingNovel) {
            setEditingNovel(updatedNovel);
        } else {
            setNewNovel(updatedNovel);
        }
    };

    /**
     * Handles genre checkbox changes
     * @param {string} genre - The genre being toggled
     */
    const handleGenreChange = (genre) => {
        const target = editingNovel ? editingNovel : newNovel;

        // Check if user can uncheck this genre
        if (target.genres.includes(genre) && !canUncheckGenre(genre)) {
            // Provide more specific error message
            const languageGenres = [
                'Chinese Novel', 'English Novel', 'Japanese Novel', 'Korean Novel', 'Vietnamese Novel'
            ];

            if (languageGenres.includes(genre)) {
                alert('Bạn không có quyền thay đổi thể loại ngôn ngữ gốc của truyện');
            } else {
                alert('Bạn không thể gỡ bỏ thể loại này vì nó đã có từ trước. Liên hệ admin/mod để thay đổi.');
            }
            return;
        }

        // Handle language novel exclusivity
        const languageGenres = ['Chinese Novel', 'English Novel', 'Japanese Novel', 'Korean Novel', 'Vietnamese Novel'];

        let updatedGenres;
        if (languageGenres.includes(genre)) {
            if (target.genres.includes(genre)) {
                // Removing a language genre
                updatedGenres = target.genres.filter(g => g !== genre);
            } else {
                // Adding a language genre - remove other language genres first
                updatedGenres = target.genres.filter(g => !languageGenres.includes(g));
                updatedGenres.push(genre);
            }
        } else {
            // Normal genre handling
            updatedGenres = target.genres.includes(genre)
                ? target.genres.filter(g => g !== genre)
                : [...target.genres, genre];
        }

        const updatedNovel = {
            ...target,
            genres: updatedGenres
        };

        if (editingNovel) {
            setEditingNovel(updatedNovel);
        } else {
            setNewNovel(updatedNovel);
        }
    };

    /**
     * Adds a new staff item to either active or inactive staff
     * @param {string} status - 'active' or 'inactive'
     */
    const addStaffItem = (status) => {
        // Prevent pj_user from adding staff
        if (user?.role === 'pj_user') return;

        if (status === 'active') {
            // Active staff items have user search functionality
            const newItem = {
                id: Date.now(),
                selectedUser: null,
                searchQuery: '',
                role: 'pj_user'
            };
            setActiveStaffItems([...activeStaffItems, newItem]);
        } else {
            // Inactive staff items are simple name strings
            const newItem = {
                id: Date.now(),
                name: '',
                role: 'pj_user'
            };
            setInactiveStaffItems([...inactiveStaffItems, newItem]);
        }
    };

    /**
     * Removes a staff item by id
     * @param {string} status - 'active' or 'inactive'
     * @param {number} id - id of the staff item to remove
     */
    const removeStaffItem = (status, id) => {
        // Prevent pj_user from removing staff
        if (user?.role === 'pj_user') return;

        if (status === 'active') {
            setActiveStaffItems(activeStaffItems.filter(item => item.id !== id));
        } else {
            setInactiveStaffItems(inactiveStaffItems.filter(item => item.id !== id));
        }
    };

    /**
     * Handles changes to a staff item
     * @param {string} status - 'active' or 'inactive'
     * @param {number} id - id of the staff item
     * @param {string} field - field name to update
     * @param {string} value - new value
     */
    const handleStaffItemChange = (status, id, field, value) => {
        // Prevent pj_user from modifying staff
        if (user?.role === 'pj_user') return;

        if (status === 'active') {
            if (field === 'searchQuery') {
                // Handle user search for active staff
                setActiveStaffItems(activeStaffItems.map(item =>
                    item.id === id ? {...item, searchQuery: value, selectedUser: null} : item
                ));
                // Clear previous timeout
                if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                }
                // Debounce the search call
                searchTimeoutRef.current = setTimeout(() => {
                    searchUsers(value, id);
                }, 300); // 300ms debounce delay
            } else if (field === 'role') {
                // Handle role change for active staff
                setActiveStaffItems(activeStaffItems.map(item =>
                    item.id === id ? {...item, [field]: value} : item
                ));
            }
        } else {
            // Handle inactive staff (simple name/role fields)
            setInactiveStaffItems(inactiveStaffItems.map(item =>
                item.id === id ? {...item, [field]: value} : item
            ));
        }
    };

    /**
     * Clears search results for a specific staff item
     * @param {number} itemId - Staff item ID
     */
    const clearSearchResults = (itemId) => {
        setUserSearchResults(prev => ({...prev, [itemId]: []}));
    };

    /**
     * Fetches user data by ID for active staff initialization
     * @param {string} userId - User ID to fetch
     * @returns {Object|null} User object or null if not found
     */
    const fetchUserById = async (userId) => {
        try {
            const response = await fetch(`${config.backendUrl}/api/users/id/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                return userData;
            }
        } catch (error) {
            console.error('❌ Error fetching user:', error);
        }
        return null;
    };

// Initialize staff items from novel data when editing
    useEffect(() => {
        if (editingNovel) {
            // Reset current staff items
            const activeItems = [];
            const inactiveItems = [];

            // Helper function to check if a value looks like a MongoDB ObjectId
            const isObjectId = (str) => {
                return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);
            };

            // Helper function to fetch user data and create active staff item
            const createActiveStaffItem = async (item, role) => {
                if (isObjectId(item)) {
                    // This is a User ObjectId - fetch the user data
                    try {
                        const userData = await fetchUserById(item);
                        if (userData) {
                            return {
                                id: Date.now() + Math.random(),
                                selectedUser: userData, // Set the actual user data
                                searchQuery: userData.displayName || userData.username, // Show the user's name
                                userId: item, // Store the actual user ID
                                role
                            };
                        } else {
                            // User not found, show placeholder
                            return {
                                id: Date.now() + Math.random(),
                                selectedUser: null,
                                searchQuery: `[User Not Found: ${item}]`,
                                userId: item,
                                role
                            };
                        }
                    } catch (error) {
                        // On error, show placeholder
                        return {
                            id: Date.now() + Math.random(),
                            selectedUser: null,
                            searchQuery: `[Error Loading User: ${item}]`,
                            userId: item,
                            role
                        };
                    }
                } else {
                    // This is a text string - treat as regular text input
                    return {
                        id: Date.now() + Math.random(),
                        selectedUser: null, // No selected user
                        searchQuery: item, // Use the text as search query
                        role
                    };
                }
            };

            // Process active staff asynchronously
            const processActiveStaff = async () => {
                const activeItemsPromises = [];

                ['pj_user', 'translator', 'editor', 'proofreader'].forEach(role => {
                    if (editingNovel.active && Array.isArray(editingNovel.active[role])) {
                        editingNovel.active[role].forEach((item) => {
                            activeItemsPromises.push(createActiveStaffItem(item, role));
                        });
                    }
                });

                // Wait for all user data to be fetched
                const resolvedActiveItems = await Promise.all(activeItemsPromises);
                setActiveStaffItems(resolvedActiveItems);
            };

            // Process inactive staff (these are always text strings)
            ['pj_user', 'translator', 'editor', 'proofreader'].forEach(role => {
                if (editingNovel.inactive && Array.isArray(editingNovel.inactive[role])) {
                    editingNovel.inactive[role].forEach(name => {
                        inactiveItems.push({id: Date.now() + Math.random(), name, role});
                    });
                }
            });

            // Set inactive items immediately
            setInactiveStaffItems(inactiveItems);

            // Process active staff asynchronously
            processActiveStaff().catch(error => {
                // On error, fall back to the old behavior
                const fallbackActiveItems = [];
                ['pj_user', 'translator', 'editor', 'proofreader'].forEach(role => {
                    if (editingNovel.active && Array.isArray(editingNovel.active[role])) {
                        editingNovel.active[role].forEach((item) => {
                            if (isObjectId(item)) {
                                fallbackActiveItems.push({
                                    id: Date.now() + Math.random(),
                                    selectedUser: null,
                                    searchQuery: `[Linked User: ${item}]`,
                                    userId: item,
                                    role
                                });
                            } else {
                                fallbackActiveItems.push({
                                    id: Date.now() + Math.random(),
                                    selectedUser: null,
                                    searchQuery: item,
                                    role
                                });
                            }
                        });
                    }
                });
                setActiveStaffItems(fallbackActiveItems);
            });
        } else {
            // Clear staff items when not editing
            setActiveStaffItems([]);
            setInactiveStaffItems([]);
        }
    }, [editingNovel?._id]);

// Cleanup search timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Handles illustration file upload
     * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
     */
    const handleIllustrationUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng tải lên tệp ảnh');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setError('Kích thước ảnh phải nhỏ hơn 5MB');
            return;
        }

        try {
            setLoading(true);

            // Upload using bunny CDN service
            const imageUrl = await bunnyUploadService.uploadFile(
                file,
                'illustrations'
            );

            // Update the novel state with the new illustration URL
            if (editingNovel) {
                setEditingNovel({
                    ...editingNovel,
                    illustration: imageUrl
                });
            } else {
                setNewNovel({
                    ...newNovel,
                    illustration: imageUrl
                });
            }

            setError('');
        } catch (err) {
            setError('Không thể tải lên ảnh');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles novel form submission
     * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate language genre requirement
        if (!validateLanguageGenres()) {
            setError('Bắt buộc phải chọn đúng 1 loại ngôn ngữ gốc (Chinese Novel, English Novel, Japanese Novel, Korean Novel, hoặc Vietnamese Novel)');
            setLoading(false);
            return;
        }

        try {
            const url = editingNovel
                ? `${config.backendUrl}/api/novels/${editingNovel._id}`
                : `${config.backendUrl}/api/novels`;

            const method = editingNovel ? 'PUT' : 'POST';

            // Compile staff data from staff items
            const staffData = compileStaffToNovel();

            const target = editingNovel ? editingNovel : newNovel;
            const allGenres = target.genres || [];

            // Create novel data with all required fields
            const novelData = {
                title: target.title,
                alternativeTitles: target.alternativeTitles,
                author: target.author,
                illustrator: target.illustrator,
                active: {
                    pj_user: staffData.active.pj_user || [],
                    translator: staffData.active.translator || [],
                    editor: staffData.active.editor || [],
                    proofreader: staffData.active.proofreader || []
                },
                inactive: {
                    pj_user: staffData.inactive.pj_user || [],
                    translator: staffData.inactive.translator || [],
                    editor: staffData.inactive.editor || [],
                    proofreader: staffData.inactive.proofreader || []
                },
                genres: allGenres,
                description: editorRef.current.getContent(),
                note: noteEditorRef.current.getContent(),
                illustration: target.illustration,
                status: editingNovel ? editingNovel.status : "Ongoing"
            };

            // If editing, preserve timestamp for all changes except status changes
            if (editingNovel) {
                const hasStatusChange = novelData.status !== editingNovel.status;

                if (!hasStatusChange) {
                    // Preserve the original updatedAt timestamp for all non-status changes
                    // This includes title, note, illustration, and staff changes
                    novelData.updatedAt = editingNovel.updatedAt;
                    novelData.preserveTimestamp = true; // Flag for backend
                }
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(novelData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${editingNovel ? 'update' : 'create'} novel`);
            }

            const responseData = await response.json();

            // Reset form first
            resetForm();

            // Force clear and refetch to ensure UI is in sync
            // We use remove and refetch instead of invalidate to ensure fresh data
            queryClient.removeQueries(['novels', user?.id, user?.role, sortType]);

            // Manually fetch fresh data to update the UI immediately
            try {
                // Include paid content info when filtering by paid content
                const includePaidInfo = sortType === 'paid' ? '&includePaidInfo=true' : '';
                const skipPopulation = sortType === 'paid' ? '' : '&skipPopulation=true';
                
                const fetchResponse = await fetch(`${config.backendUrl}/api/novels?limit=1000&bypass=true${skipPopulation}${includePaidInfo}&t=${Date.now()}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (fetchResponse.ok) {
                    const data = await fetchResponse.json();
                    const novelsList = Array.isArray(data.novels) ? data.novels : (Array.isArray(data) ? data : []);

                    // Update cache with fresh data that includes the new novel
                    queryClient.setQueryData(['novels', user?.id, user?.role, sortType], novelsList);
                }
            } catch (fetchError) {
                console.error('Error fetching latest novels:', fetchError);
            }
        } catch (err) {
            console.error('Error submitting novel:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles novel edit mode
     * @param {Object} novel - Novel to edit
     */
    const handleEdit = (novel) => {
        // Reset form first to discard any unsaved work
        resetForm();

        const predefinedGenres = novel.genres || [];

        // Capture original genres for comparison
        setOriginalNovelGenres(novel.genres || []);
        // Ensure staff arrays are properly initialized with empty arrays if undefined
        const novelWithDefaults = {
            ...novel,
            title: novel.title || '',
            alternativeTitles: novel.alternativeTitles || [],
            author: novel.author || '',
            illustrator: novel.illustrator || '',
            active: {
                pj_user: novel.active?.pj_user || [],
                translator: novel.active?.translator || [],
                editor: novel.active?.editor || [],
                proofreader: novel.active?.proofreader || []
            },
            inactive: {
                pj_user: novel.inactive?.pj_user || [],
                translator: novel.inactive?.translator || [],
                editor: novel.inactive?.editor || [],
                proofreader: novel.inactive?.proofreader || []
            },
            genres: predefinedGenres,
            description: novel.description || '',
            note: novel.note || '',
            illustration: novel.illustration || ''
        };

        setEditingNovel(novelWithDefaults);
        setNewNovel(novelWithDefaults);

        if (editorRef.current) {
            editorRef.current.setContent(novelWithDefaults.description);
        }
        if (noteEditorRef.current) {
            noteEditorRef.current.setContent(novelWithDefaults.note);
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    /**
     * Opens the delete confirmation modal
     * @param {Object} novel - Novel to be deleted
     */
    const openDeleteConfirmation = (novel) => {
        setDeleteConfirmationModal({
            isOpen: true,
            novelToDelete: novel
        });
    };

    /**
     * Closes the delete confirmation modal
     */
    const closeDeleteConfirmation = () => {
        setDeleteConfirmationModal({
            isOpen: false,
            novelToDelete: null
        });
    };

    /**
     * Initiates the novel deletion process
     * @param {string} id - ID of the novel to delete
     */
    const handleDelete = (novel) => {
        openDeleteConfirmation(novel);
    };

    /**
     * Performs the actual novel deletion after confirmation
     */
    const confirmDelete = async () => {
        const id = deleteConfirmationModal.novelToDelete._id;

        // Reset form first to discard any unsaved work
        resetForm();

        try {
            // Get current cache data
            const previousData = queryClient.getQueryData(['novels', user?.id, user?.role, sortType]) || [];

            // Create updated list without the deleted novel
            const updatedNovels = Array.isArray(previousData)
                ? previousData.filter(novel => novel._id !== id)
                : [];

            // Immediately update the cache
            queryClient.setQueryData(['novels', user?.id, user?.role, sortType], updatedNovels);

            // Perform the actual deletion
            const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                // Revert cache if deletion failed
                queryClient.setQueryData(['novels', user?.id, user?.role, sortType], previousData);
                throw new Error('Failed to delete novel');
            }

            // Remove all cached data related to this novel
            queryClient.removeQueries(['novel', id]);

            // Lock in our updated novels list - this is the key to making the deletion stick
            queryClient.setQueryData(['novels', user?.id, user?.role, sortType], updatedNovels);

            setError('');
            // Close the modal
            closeDeleteConfirmation();
        } catch (err) {
            console.error('Error deleting novel:', err);
            setError(err.message);
            // Close the modal
            closeDeleteConfirmation();
        }
    };

    /**
     * Resets the novel form to initial state
     */
    const resetForm = () => {
        setNewNovel({
            title: '',
            alternativeTitles: '',
            author: '',
            illustrator: '',
            active: {
                pj_user: [],
                translator: [],
                editor: [],
                proofreader: []
            },
            inactive: {
                pj_user: [],
                translator: [],
                editor: [],
                proofreader: []
            },
            genres: [],
            description: '',
            note: '',
            illustration: ''
        });
        setEditingNovel(null);
        setLoading(false);
        // Reset staff items
        setActiveStaffItems([]);
        setInactiveStaffItems([]);
        setOriginalNovelGenres([]); // Clear original genres
        // Clear user search states
        setUserSearchResults({});
        setSearchingUsers({});
        if (editorRef.current) {
            editorRef.current.setContent('');
        }
        if (noteEditorRef.current) {
            noteEditorRef.current.setContent('');
        }
    };

    /**
     * Handles novel status change
     * @param {string} id - ID of the novel
     * @param {string} status - New status value
     */
    const handleStatusChange = async (id, status) => {
        // Reset form first to discard any unsaved work
        resetForm();

        try {
            // Get current cache data
            const previousData = queryClient.getQueryData(['novels', user?.id, user?.role, sortType]);

            // Create a timestamp for the status update (this should update updatedAt)
            const updatedAt = new Date().toISOString();

            // Find the novel in the current data
            const currentNovel = previousData.find(novel => novel._id === id);
            if (!currentNovel) {
                throw new Error('Novel not found');
            }

            // Optimistically update the cache
            queryClient.setQueryData(['novels', user?.id, user?.role, sortType], old =>
                Array.isArray(old)
                    ? old.map(novel => novel._id === id ? {...novel, status, updatedAt} : novel)
                    : []
            );

            // Update the status in the context
            updateNovelStatus(id, status);

            // Send request to server - status changes should update timestamp
            const response = await fetch(`${config.backendUrl}/api/novels/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...currentNovel, // Include all existing novel data
                    status,
                    updatedAt,
                    // Don't preserve timestamp for status changes - we want it to update
                    preserveTimestamp: false
                })
            });

            if (!response.ok) {
                // If update failed, revert the cache to previous state
                queryClient.setQueryData(['novels', user?.id, user?.role, sortType], previousData);
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể cập nhật trạng thái truyện');
            }

            // Get updated novel data
            const updatedNovel = await response.json();

            // Update cache with complete novel data
            queryClient.setQueryData(['novels', user?.id, user?.role, sortType], old =>
                Array.isArray(old)
                    ? old.map(novel => novel._id === id ? {...novel, ...updatedNovel} : novel)
                    : []
            );

            // Also invalidate novel list and hot novels queries to ensure they're updated
            queryClient.invalidateQueries({queryKey: ['novels', user?.id, user?.role, sortType]});
            queryClient.invalidateQueries({queryKey: ['hotNovels']});

        } catch (err) {
            // Revert cache on error
            queryClient.setQueryData(['novels', user?.id, user?.role, sortType], previousData);

            console.error('Error updating status:', err);
            setError(err.message);
        }
    };

    /**
     * Handles edit mode for novel balance
     * @param {string} id - Novel ID
     * @param {number} currentBalance - Current balance value
     */
    const handleEditBalance = (id, currentBalance) => {
        setEditingBalanceId(id);
        setBalanceValue(currentBalance || 0);
    };

    /**
     * Cancels balance editing mode
     */
    const cancelEditBalance = () => {
        setEditingBalanceId(null);
        setBalanceValue(0);
    };

    /**
     * Saves updated novel balance
     * @param {string} id - Novel ID
     */
    const saveBalanceChange = async (id) => {
        try {
            // Get current cache data for optimistic update
            const previousData = queryClient.getQueryData(['novels', user?.id, user?.role, sortType]) || [];
            
            // Find the novel in the current data
            const novel = previousData.find(novel => novel._id === id);
            if (!novel) {
                throw new Error('Novel not found');
            }

            const newBalance = parseFloat(balanceValue);
            
            // Optimistic update: Immediately update the cache
            queryClient.setQueryData(['novels', user?.id, user?.role, sortType], old =>
                Array.isArray(old)
                    ? old.map(novel => 
                        novel._id === id 
                            ? { ...novel, novelBalance: newBalance }
                            : novel
                      )
                    : []
            );

            // Exit edit mode immediately for better UX
            setEditingBalanceId(null);

            // Send request to update the balance
            const response = await fetch(`${config.backendUrl}/api/novels/${id}/balance`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    novelBalance: newBalance
                })
            });

            if (!response.ok) {
                // Revert optimistic update on error
                queryClient.setQueryData(['novels', user?.id, user?.role, sortType], previousData);
                
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể cập nhật số dư truyện');
            }

            const updatedNovel = await response.json();
            
            // Update cache with the actual server response (includes any server-side corrections)
            queryClient.setQueryData(['novels', user?.id, user?.role, sortType], old =>
                Array.isArray(old)
                    ? old.map(novel => 
                        novel._id === id 
                            ? { ...novel, ...updatedNovel }
                            : novel
                      )
                    : []
            );

            setError('');
        } catch (err) {
            console.error('Lỗi cập nhật số dư:', err);
            setError(err.message);
            // Edit mode was already exited, but we could re-enable it on error if desired
            // setEditingBalanceId(id);
        }
    };

    /**
     * Searches for users by username/displayName for active staff assignment
     * @param {string} query - Search query
     * @param {number} itemId - Staff item ID for tracking search results
     */
    const searchUsers = async (query, itemId) => {
        if (!query || query.length < 2) {
            setUserSearchResults(prev => ({...prev, [itemId]: []}));
            return;
        }

        setSearchingUsers(prev => ({...prev, [itemId]: true}));

        try {
            const response = await fetch(`${config.backendUrl}/api/users/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                setUserSearchResults(prev => ({...prev, [itemId]: users}));
            } else {
                setUserSearchResults(prev => ({...prev, [itemId]: []}));
            }
        } catch (error) {
            console.error('User search error:', error);
            setUserSearchResults(prev => ({...prev, [itemId]: []}));
        } finally {
            setSearchingUsers(prev => ({...prev, [itemId]: false}));
        }
    };

    /**
     * Selects a user for active staff assignment
     * @param {number} itemId - Staff item ID
     * @param {Object} user - Selected user object
     */
    const selectUserForActiveStaff = (itemId, user) => {
        setActiveStaffItems(activeStaffItems.map(item =>
            item.id === itemId ? {
                ...item,
                selectedUser: user,
                searchQuery: user.displayName || user.username
            } : item
        ));
        // Clear search results for this item
        setUserSearchResults(prev => ({...prev, [itemId]: []}));
    };

// Convert staff items arrays to the novel staff structure
    const compileStaffToNovel = () => {
        const active = {
            pj_user: [
                // User IDs for selected users
                ...activeStaffItems
                    .filter(item => item.role === 'pj_user' && item.selectedUser)
                    .map(item => item.selectedUser._id),
                // User IDs for previously linked users (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'pj_user' && !item.selectedUser && item.userId)
                    .map(item => item.userId),
                // Text names for non-selected entries (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'pj_user' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
                    .map(item => item.searchQuery.trim())
            ],
            translator: [
                // User IDs for selected users
                ...activeStaffItems
                    .filter(item => item.role === 'translator' && item.selectedUser)
                    .map(item => item.selectedUser._id),
                // User IDs for previously linked users (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'translator' && !item.selectedUser && item.userId)
                    .map(item => item.userId),
                // Text names for non-selected entries (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'translator' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
                    .map(item => item.searchQuery.trim())
            ],
            editor: [
                // User IDs for selected users
                ...activeStaffItems
                    .filter(item => item.role === 'editor' && item.selectedUser)
                    .map(item => item.selectedUser._id),
                // User IDs for previously linked users (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'editor' && !item.selectedUser && item.userId)
                    .map(item => item.userId),
                // Text names for non-selected entries (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'editor' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
                    .map(item => item.searchQuery.trim())
            ],
            proofreader: [
                // User IDs for selected users
                ...activeStaffItems
                    .filter(item => item.role === 'proofreader' && item.selectedUser)
                    .map(item => item.selectedUser._id),
                // User IDs for previously linked users (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'proofreader' && !item.selectedUser && item.userId)
                    .map(item => item.userId),
                // Text names for non-selected entries (backward compatibility)
                ...activeStaffItems
                    .filter(item => item.role === 'proofreader' && !item.selectedUser && !item.userId && item.searchQuery?.trim())
                    .map(item => item.searchQuery.trim())
            ]
        };

        const inactive = {
            pj_user: inactiveStaffItems
                .filter(item => item.role === 'pj_user' && item.name.trim())
                .map(item => item.name.trim()),
            translator: inactiveStaffItems
                .filter(item => item.role === 'translator' && item.name.trim())
                .map(item => item.name.trim()),
            editor: inactiveStaffItems
                .filter(item => item.role === 'editor' && item.name.trim())
                .map(item => item.name.trim()),
            proofreader: inactiveStaffItems
                .filter(item => item.role === 'proofreader' && item.name.trim())
                .map(item => item.name.trim())
        };

        return {active, inactive};
    };

// Add a function to handle sorting
    const handleSortChange = (newSortOrder) => {
        setSortType(newSortOrder);
    };

    /**
     * Handles search input changes with debouncing
     * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
     */
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    /**
     * Clears the search query
     */
    const clearSearch = () => {
        setSearchQuery('');
    };



    return (
        <div className="admin-dashboard">
            <AdminDashboardSEO/>
            <h2 className="section-title">Quản lý truyện</h2>
            {error && <div className="error">{error}</div>}

            {/* Delete Confirmation Modal */}
            {deleteConfirmationModal.isOpen && (
                <DeleteConfirmationModal
                    novel={deleteConfirmationModal.novelToDelete}
                    onConfirm={confirmDelete}
                    onCancel={closeDeleteConfirmation}
                />
            )}

            <div className="dashboard-grid">
                {/* Enhanced Novel Form Section with Floating Labels */}
                <div className="novel-form">
                    <h3 className="section-title">
                        {editingNovel ? 'Chỉnh sửa truyện' : (canCreateNovels ? 'Thêm truyện mới' : 'Quản lý truyện')}
                    </h3>
                    {(editingNovel || canCreateNovels) && (
                        <form onSubmit={handleSubmit}>
                            <FloatingLabelInput
                                type="text"
                                name="title"
                                label="Tiêu đề"
                                value={editingNovel ? editingNovel.title : newNovel.title}
                                onChange={handleInputChange}
                                disabled={!canEditTitle}
                                required
                            />

                            <FloatingLabelInput
                                type="text"
                                name="alternativeTitles"
                                label="Tiêu đề khác"
                                value={editingNovel ? editingNovel.alternativeTitles || '' : newNovel.alternativeTitles}
                                onChange={handleInputChange}
                            />

                            <FloatingLabelInput
                                type="text"
                                name="author"
                                label="Tác giả"
                                value={editingNovel ? editingNovel.author : newNovel.author}
                                onChange={handleInputChange}
                                required
                            />

                            <FloatingLabelInput
                                type="text"
                                name="illustrator"
                                label="Họa sĩ"
                                value={editingNovel ? editingNovel.illustrator : newNovel.illustrator}
                                onChange={handleInputChange}
                            />

                            {/* Staff Section - Active */}
                            <div className="staff-section">
                                <div className="staff-header">
                                    <h4>Nhân sự hoạt động</h4>
                                    {canEditStaff && (
                                        <button
                                            type="button"
                                            className="add-staff-btn"
                                            onClick={() => addStaffItem('active')}
                                        >
                                            +
                                        </button>
                                    )}
                                </div>

                                {!canEditStaff && (
                                    <div className="staff-edit-note">
                                        <em>Liên hệ admin/mod hoặc fanpage để chỉnh sửa mục nhân sự</em>
                                    </div>
                                )}

                                <div className="staff-items-grid">
                                    {activeStaffItems.map((item, index) => (
                                        <div key={item.id} className="staff-item" data-role={item.role}>
                                            <StaffInputWithSearch
                                                item={item}
                                                searchResults={userSearchResults[item.id] || []}
                                                isSearching={searchingUsers[item.id] || false}
                                                onSearchChange={(value) => handleStaffItemChange('active', item.id, 'searchQuery', value)}
                                                onUserSelect={(user) => selectUserForActiveStaff(item.id, user)}
                                                disabled={!canEditStaff}
                                                containerRef={(ref) => {
                                                    if (ref) {
                                                        searchContainerRefs.current[item.id] = ref;
                                                    } else {
                                                        delete searchContainerRefs.current[item.id];
                                                    }
                                                }}
                                            />
                                            <select
                                                value={item.role}
                                                onChange={(e) => handleStaffItemChange('active', item.id, 'role', e.target.value)}
                                                disabled={!canEditStaff}
                                            >
                                                <option value="pj_user">Quản lý dự án</option>
                                                <option value="translator">Dịch giả</option>
                                                <option value="editor">Biên tập</option>
                                                <option value="proofreader">Kiểm tra chất lượng</option>
                                            </select>
                                            {canEditStaff && (
                                                <button
                                                    type="button"
                                                    className="remove-staff-btn"
                                                    onClick={() => removeStaffItem('active', item.id)}
                                                    aria-label="Remove staff member"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Staff Section - Inactive */}
                                <div className="staff-header">
                                    <h4>Nhân sự không hoạt động</h4>
                                    {canEditStaff && (
                                        <button
                                            type="button"
                                            className="add-staff-btn"
                                            onClick={() => addStaffItem('inactive')}
                                        >
                                            +
                                        </button>
                                    )}
                                </div>

                                <div className="staff-items-grid">
                                    {inactiveStaffItems.map((item, index) => (
                                        <div key={item.id} className="staff-item" data-role={item.role}>
                                            <div className="form-group">
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleStaffItemChange('inactive', item.id, 'name', e.target.value)}
                                                    disabled={!canEditStaff}
                                                    className={`${item.name ? 'has-content' : ''} ${!canEditStaff ? 'disabled-field' : ''}`}
                                                    placeholder=""
                                                />
                                                <label>Tên nhân sự</label>
                                            </div>
                                            <select
                                                value={item.role}
                                                onChange={(e) => handleStaffItemChange('inactive', item.id, 'role', e.target.value)}
                                                disabled={!canEditStaff}
                                            >
                                                <option value="pj_user">Quản lý dự án</option>
                                                <option value="translator">Dịch giả</option>
                                                <option value="editor">Biên tập viên</option>
                                                <option value="proofreader">Người kiểm tra chất lượng</option>
                                            </select>
                                            {canEditStaff && (
                                                <button
                                                    type="button"
                                                    className="remove-staff-btn"
                                                    onClick={() => removeStaffItem('inactive', item.id)}
                                                    aria-label="Remove staff member"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Genres Section */}
                            <div className="genres-section">
                                <div className="genre-display-container">
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            name="genres"
                                            value={(() => {
                                                const target = editingNovel ? editingNovel : newNovel;
                                                const allGenres = target.genres || [];
                                                return allGenres.join('; ') || '';
                                            })()}
                                            readOnly
                                            className={`genre-display-input ${(() => {
                                                const target = editingNovel ? editingNovel : newNovel;
                                                const allGenres = target.genres || [];
                                                return allGenres.length > 0 ? 'has-content' : '';
                                            })()}`}
                                            placeholder=""
                                        />
                                        <label>Thể loại đã chọn</label>
                                    </div>
                                </div>

                                <div className="genre-columns">
                                    {Object.entries(genreCategories).map(([category, genres]) => (
                                        <div key={category} className="genre-column">
                                            <h4>{category}</h4>
                                            {genres.map(genre => {
                                                const target = editingNovel ? editingNovel : newNovel;
                                                const isChecked = (target.genres || []).includes(genre);
                                                const colorClass = getGenreColorClass(genre);
                                                const isDisabled = isGenreDisabled(genre);
                                                const lockIndicator = getGenreLockIndicator(genre);

                                                return (
                                                    <label key={genre} className={`genre-checkbox ${colorClass} ${isDisabled ? 'disabled-genre' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleGenreChange(genre)}
                                                            disabled={isDisabled}
                                                        />
                                                        <span className={`genre-label ${colorClass}`}>
        {genre}
                                                            {lockIndicator && (
                                                                <span className="locked-indicator" title={
                                                                    lockIndicator === '🔒' && ['Mature', 'AI-assisted'].includes(genre)
                                                                        ? "Không thể gỡ bỏ vì thể loại này đã có từ trước"
                                                                        : "Chỉ admin/mod mới có thể thêm/gỡ"
                                                                }>
            {lockIndicator}
          </span>
                                                            )}
      </span>
                                                    </label>
                                                );
                                            })}                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Description Editor */}
                            <div className="description-editor">
                                <Editor
                                    onInit={(evt, editor) => editorRef.current = editor}
                                    initialValue={editingNovel ? editingNovel.description : newNovel.description}
                                    scriptLoading={{async: true, load: "domainBased"}}
                                    init={{
                                        script_src: config.tinymce.scriptPath,
                                        license_key: 'gpl',
                                        height: 300,
                                        menubar: false,
                                        remove_empty_elements: false,
                                        forced_root_block: 'p',
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                                            'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                            'insertdatetime', 'media', 'table', 'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | formatselect | ' +
                                            'bold italic underline strikethrough | ' +
                                            'alignleft aligncenter alignright alignjustify | ' +
                                            'bullist numlist outdent indent | ' +
                                            'link | code preview | removeformat | help',
                                        contextmenu: 'cut copy paste | link | removeformat',
                                        content_style: `
                      body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
                      em, i { font-style: italic; }
                      strong, b { font-weight: bold; }
                    `,
                                        skin: 'oxide',
                                        content_css: 'default',
                                        placeholder: 'Viết mô tả truyện... (tối đa 1000 từ)',
                                        statusbar: false,
                                        resize: false,
                                        branding: false,
                                        promotion: false,
                                        wordcount_countcharacters: true,
                                        wordcount_countwords: true,
                                        wordcount_countspaces: false,
                                        wordcount_alwaysshown: true,
                                        max_words: 1000,
                                        setup: function (editor) {
                                            editor.on('KeyUp', function (e) {
                                                const wordCount = editor.plugins.wordcount.getCount();
                                                if (wordCount > 1000) {
                                                    const content = editor.getContent();
                                                    const words = content.split(/\s+/);
                                                    editor.setContent(words.slice(0, 1000).join(' '));
                                                }
                                            });
                                        },
                                        paste_data_images: true,
                                        paste_as_text: false,
                                        paste_auto_cleanup_on_paste: true,
                                        paste_remove_styles: true,
                                        paste_remove_spans: true,
                                        paste_strip_class_attributes: 'all',
                                        paste_merge_formats: true,
                                        paste_webkit_styles: 'none',
                                        paste_preprocess: function (plugin, args) {
                                            // First handle footnote markers
                                            args.content = args.content.replace(
                                                /\[(\d+)\]/g,
                                                '<sup class="footnote-marker" data-footnote="$1">[$1]</sup>'
                                            );

                                            // Then sanitize the content
                                            args.content = sanitizeHTML(args.content);
                                        },
                                        paste_postprocess: function (plugin, args) {
                                            // Additional cleanup after paste
                                            const sanitizedContent = sanitizeHTML(args.node.innerHTML);
                                            args.node.innerHTML = sanitizedContent;
                                        },
                                        valid_elements: 'p,br,strong,b,em,i,u,h1,h2,h3,h4,h5,h6,ul,ol,li,a[href|target|title],img[src|alt|title|width|height],blockquote,pre,code,sup[class|data-footnote],sub',
                                        valid_children: '+p[strong|b|em|i|u|a|img|sup|sub|code],+li[p|strong|b|em|i|u|a|img|sup|sub|code]',
                                        extended_valid_elements: 'sup[class|data-footnote]',
                                        images_upload_handler: (blobInfo) => {
                                            return new Promise((resolve, reject) => {
                                                const file = blobInfo.blob();

                                                bunnyUploadService.uploadFile(file, 'illustrations')
                                                    .then(url => {
                                                        resolve(url);
                                                    })
                                                    .catch(error => {
                                                        console.error('Image upload error:', error);
                                                        reject('Image upload failed');
                                                    });
                                            });
                                        },
                                        images_upload_base_path: '/',
                                        automatic_uploads: true
                                    }}
                                />
                            </div>

                            {/* Note Editor */}
                            <div className="note-editor">
                                <Editor
                                    onInit={(evt, editor) => noteEditorRef.current = editor}
                                    initialValue={editingNovel ? editingNovel.note : newNovel.note}
                                    scriptLoading={{async: true, load: "domainBased"}}
                                    init={{
                                        script_src: config.tinymce.scriptPath,
                                        license_key: 'gpl',
                                        height: 200,
                                        menubar: false,
                                        remove_empty_elements: false,
                                        forced_root_block: 'p',
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'charmap',
                                            'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                            'insertdatetime', 'media', 'table', 'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | formatselect | ' +
                                            'bold italic underline | ' +
                                            'bullist numlist | ' +
                                            'link | code preview | removeformat | help',
                                        contextmenu: 'cut copy paste | link | removeformat',
                                        content_style: `
                      body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
                      em, i { font-style: italic; }
                      strong, b { font-weight: bold; }
                    `,
                                        skin: 'oxide',
                                        content_css: 'default',
                                        placeholder: 'Viết ghi chú của bạn ở đây...',
                                        statusbar: true,
                                        resize: false,
                                        branding: false,
                                        promotion: false,
                                        wordcount_countcharacters: true,
                                        wordcount_countwords: true,
                                        wordcount_countspaces: false,
                                        wordcount_alwaysshown: true,
                                        paste_data_images: true,
                                        paste_as_text: false,
                                        paste_auto_cleanup_on_paste: true,
                                        paste_remove_styles: true,
                                        paste_remove_spans: true,
                                        paste_strip_class_attributes: 'all',
                                        paste_merge_formats: true,
                                        paste_webkit_styles: 'none',
                                        paste_preprocess: function (plugin, args) {
                                            // First handle footnote markers
                                            args.content = args.content.replace(
                                                /\[(\d+)\]/g,
                                                '<sup class="footnote-marker" data-footnote="$1">[$1]</sup>'
                                            );

                                            // Then sanitize the content
                                            args.content = sanitizeHTML(args.content);
                                        },
                                        paste_postprocess: function (plugin, args) {
                                            // Additional cleanup after paste
                                            const sanitizedContent = sanitizeHTML(args.node.innerHTML);
                                            args.node.innerHTML = sanitizedContent;
                                        },
                                        valid_elements: 'p,br,strong,b,em,i,u,h1,h2,h3,h4,h5,h6,ul,ol,li,a[href|target|title],blockquote,pre,code,sup[class|data-footnote],sub',
                                        valid_children: '+p[strong|b|em|i|u|a|sup|sub|code],+li[p|strong|b|em|i|u|a|sup|sub|code]',
                                        extended_valid_elements: 'sup[class|data-footnote]'
                                    }}
                                />
                            </div>

                            <div className="illustration-upload">
                                {(editingNovel?.illustration || newNovel.illustration) && (
                                    <img
                                        src={editingNovel ? editingNovel.illustration : newNovel.illustration}
                                        alt="Illustration preview"
                                        className="illustration-preview"
                                    />
                                )}
                                <label className="illustration-upload-label">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleIllustrationUpload}
                                        disabled={loading}
                                        className="hidden-file-input"
                                    />
                                    {loading ? 'Đang tải...' : 'Tải ảnh bìa'}
                                </label>
                            </div>

                            <div className="form-buttons">
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Đang xử lý...' : (editingNovel ? 'Cập nhật truyện' : 'Thêm truyện')}
                                </button>
                                {editingNovel ? (
                                    <button type="button" onClick={resetForm} className="cancel-button">
                                        Hủy bỏ
                                    </button>
                                ) : (
                                    <button type="button" onClick={resetForm} className="discard-button">
                                        Hủy bỏ bản nháp
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                {/* Enhanced Novel List Section with Search */}
                <div className="novel-list">
                    <div className="novel-list-header">
                        <h3 className="section-title">
                            Danh sách truyện {sortedNovels.length > 0 && `(${sortedNovels.length})`}
                        </h3>
                        <div className="sort-control">
                            <label htmlFor="sort-select">Sắp xếp theo:</label>
                            <select
                                id="sort-select"
                                value={sortType}
                                onChange={(e) => handleSortChange(e.target.value)}
                                className="sort-dropdown"
                            >
                                <option value="updated">Mới cập nhật</option>
                                <option value="balance">Số dư nhiều nhất</option>
                                <option value="paid">Có nội dung trả phí</option>
                            </select>
                        </div>
                    </div>

                    {/* Enhanced Search Bar with Floating Label */}
                    <div className="novel-search-container">
                        <FloatingLabelInput
                            type="text"
                            label="Tìm kiếm theo tên truyện hoặc tiêu đề khác"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            className="search-clear-btn"
                            onClick={() => setSearchQuery('')}
                            disabled={!searchQuery.trim()}
                        >
                            Xóa tìm kiếm
                        </button>
                    </div>

                    {/* Search Results Info */}
                    {searchQuery.trim() && (
                        <div className="search-results-info">
                            {sortedNovels.length === 0
                                ? `Không tìm thấy kết quả nào cho "${searchQuery}"`
                                : `Tìm thấy ${sortedNovels.length} kết quả cho "${searchQuery}"`
                            }
                        </div>
                    )}

                    {novelsLoading || !dimensionsReady ? (
                        <div className="novel-list-loading-container">
                            <LoadingSpinner size="medium" text="Đang tải danh sách truyện..."/>
                        </div>
                    ) : (
                        <List
                            height={virtualListHeight}
                            itemCount={sortedNovels.length}
                            itemSize={itemSize}
                            width="100%"
                            itemData={{
                                novels: sortedNovels,
                                user,
                                canEditNovels,
                                canDeleteNovels,
                                canEditBalances,
                                handleEdit,
                                handleDelete,
                                handleStatusChange,
                                editingBalanceId,
                                balanceValue,
                                setBalanceValue,
                                handleEditBalance,
                                cancelEditBalance,
                                saveBalanceChange
                            }}
                            ref={novelListContainerRef}
                        >
                            {VirtualNovelItem}
                        </List>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;