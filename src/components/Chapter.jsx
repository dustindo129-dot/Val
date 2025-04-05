/**
 * Enhanced Chapter Component
 *
 * Displays a single chapter of a novel with features including:
 * - Chapter content display with customizable fonts
 * - Navigation between chapters
 * - Reading progress tracking
 * - Dark/Sepia mode support
 * - Staff credits display
 * - Social sharing
 * - Likes and ratings
 * - Bookmarking
 * - Chapter listing
 * - Mobile responsive design
 */

import {useState, useEffect, useRef} from 'react';
import {useParams, Link, useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/Chapter.css';
import CommentSection from './CommentSection';
import config from '../config/config';
import DOMPurify from 'dompurify';
import {Editor} from '@tinymce/tinymce-react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faChevronLeft, faChevronRight, faHome, faEye, faFont,
    faLanguage, faEdit, faCheckDouble, faHeart, faStar,
    faArrowUp, faList, faEllipsisV, faTimes, faCog,
    faFlag, faBookmark, faComment, faLock, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import {
    faHeart as farHeart,
    faStar as farStar,
    faBookmark as farBookmark
} from '@fortawesome/free-regular-svg-icons';
import {
    faFacebookF, faTwitter, faPinterestP, faTelegram
} from '@fortawesome/free-brands-svg-icons';

const Chapter = () => {
    const {novelId, chapterId} = useParams();
    const navigate = useNavigate();
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const contentRef = useRef(null);

    // Reading settings state
    const [fontSize, setFontSize] = useState(18);
    const [fontFamily, setFontFamily] = useState("'Roboto', sans-serif");
    const [lineHeight, setLineHeight] = useState('1.8');
    const [theme, setTheme] = useState('light');

    // UI state
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [editedTitle, setEditedTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [showChapterList, setShowChapterList] = useState(false);
    const [showNavControls, setShowNavControls] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const [error, setError] = useState(null);

    // Modal state
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Interaction state
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [currentRating, setCurrentRating] = useState(0);
    const [ratingCount, setRatingCount] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [viewCount, setViewCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);

    // Report form state
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');

    // Refs
    const editorRef = useRef(null);

    // Reset navigation state when chapter changes
    useEffect(() => {
        setIsNavigating(false);
    }, [chapterId]);

    // Query for chapter data
    const {data: chapterData, error: chapterError, isLoading} = useQuery({
        queryKey: ['chapter', chapterId],
        queryFn: async () => {
            const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);

            // Increment view count (if you have this endpoint)
            try {
                await axios.post(`${config.backendUrl}/api/chapters/${chapterId}/view`, {}, {
                    headers: user ? {Authorization: `Bearer ${localStorage.getItem('token')}`} : {}
                });
            } catch (err) {
                console.error('Error recording view:', err);
            }

            return chapterRes.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!chapterId
    });

    // Query for novel data to get chapters list
    const {data: novelData} = useQuery({
        queryKey: ['novel', novelId],
        queryFn: async () => {
            const novelRes = await axios.get(`${config.backendUrl}/api/novels/${novelId}`);
            return novelRes.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!novelId
    });

    // Query for likes, bookmarks and ratings if you have this endpoint
    const {data: interactionData} = useQuery({
        queryKey: ['chapter-interactions', chapterId],
        queryFn: async () => {
            const res = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}/interactions`);
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!chapterId,
        onError: () => {
            // If API doesn't exist, use default values
            console.log('Interaction data endpoint not available');
        }
    });

    // Query for comments
    const {data: comments = [], isLoading: isCommentsLoading} = useQuery({
        queryKey: ['comments', `${novelId}-${chapterId}`],
        queryFn: async () => {
            const res = await axios.get(`${config.backendUrl}/api/comments`, {
                params: {
                    contentType: 'chapters',
                    contentId: `${novelId}-${chapterId}`,
                    includeDeleted: false
                }
            });
            return res.data;
        },
        staleTime: 1000 * 60, // 1 minute
        enabled: !!chapterId,
        onError: () => {
            // Handle missing endpoint gracefully
            console.log('Comments endpoint not available');
            return [];
        }
    });

    // Query for user interactions if logged in
    const {data: userInteractions} = useQuery({
        queryKey: ['user-interactions', chapterId, user?.id],
        queryFn: async () => {
            const res = await axios.get(`${config.backendUrl}/api/users/me/interactions`, {
                params: {chapterId},
                headers: {Authorization: `Bearer ${localStorage.getItem('token')}`}
            });
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!chapterId && !!user,
        retry: false,
        onError: () => {
            // Handle missing endpoint gracefully
            console.log('User interactions endpoint not available');
        }
    });

    // Extract chapter and novel data
    const chapter = chapterData?.chapter;
    const novel = chapter?.novel || novelData?.novel || {title: "Novel"};
    const chapterList = novelData?.chapters || [];

    // Effect to set interactions data
    useEffect(() => {
        if (interactionData) {
            setLikeCount(interactionData.likes || 0);
            setRatingCount(interactionData.ratingCount || 0);
            setAverageRating(interactionData.averageRating || 0);
            setViewCount(interactionData.views || 0);
        } else {
            // Mock data for demo
            setLikeCount(1243);
            setRatingCount(123);
            setAverageRating(4.7);
            setViewCount(45872);
        }
    }, [interactionData]);

    // Effect to set user interaction status
    useEffect(() => {
        if (userInteractions) {
            setIsLiked(userInteractions.liked || false);
            setIsBookmarked(userInteractions.bookmarked || false);
            setCurrentRating(userInteractions.rating || 0);
        } else if (user) {
            // Default state for logged in users without interaction data
            setIsLiked(false);
            setIsBookmarked(false);
            setCurrentRating(0);
        }

        // Check localStorage for non-logged in users
        if (!user) {
            const isBookmarkedLocally = localStorage.getItem(`bookmark_${novelId}_${chapterId}`) === 'true';
            setIsBookmarked(isBookmarkedLocally);
        }
    }, [userInteractions, user, novelId, chapterId]);

    // Effect to load settings from localStorage
    useEffect(() => {
        const savedFontSize = localStorage.getItem('readerFontSize');
        const savedFontFamily = localStorage.getItem('readerFontFamily');
        const savedLineHeight = localStorage.getItem('readerLineHeight');
        const savedTheme = localStorage.getItem('readerTheme');

        if (savedFontSize) setFontSize(parseInt(savedFontSize));
        if (savedFontFamily) setFontFamily(savedFontFamily);
        if (savedLineHeight) setLineHeight(savedLineHeight);
        if (savedTheme) {
            setTheme(savedTheme);
            applyTheme(savedTheme);
        }
    }, []);

    // Effect to calculate word count
    useEffect(() => {
        if (chapter && chapter.content) {
            const count = countWords(chapter.content);
            setWordCount(count);
        }
    }, [chapter]);

    // Effect to handle edit mode initialization
    useEffect(() => {
        if (isEditing && chapter) {
            setEditedTitle(chapter.title);
            // Unescape HTML before setting editor content
            setEditedContent(unescapeHtml(chapter.content || ''));
        }
    }, [isEditing, chapter]);

    // Effect to track scroll progress
    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return;

            const windowHeight = window.innerHeight;
            const fullHeight = document.body.scrollHeight;
            const scrolled = window.scrollY;

            const progress = (scrolled / (fullHeight - windowHeight)) * 100;
            setReadingProgress(Math.min(100, Math.max(0, progress)));

            // Show/hide scroll to top button
            const scrollTopBtn = document.getElementById('scrollTopBtn');
            if (scrollTopBtn) {
                scrollTopBtn.style.display = scrolled > 300 ? 'flex' : 'none';
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Effect for keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only use keyboard navigation if not in edit mode or modal
            if (isEditing || showSettingsModal || showRatingModal || showReportModal) {
                return;
            }

            // Arrow Left - Previous Chapter
            if (e.key === 'ArrowLeft' && chapter?.prevChapter && !isNavigating) {
                handlePrevChapter();
            }

            // Arrow Right - Next Chapter
            if (e.key === 'ArrowRight' && chapter?.nextChapter && !isNavigating) {
                handleNextChapter();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [chapter, isNavigating, isEditing, showSettingsModal, showRatingModal, showReportModal]);

    // Effect to handle click outside of the chapter dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            const dropdown = document.getElementById('chapterDropdown');
            const toggleBtn = document.getElementById('chapterListBtn');

            if (dropdown && showChapterList &&
                !dropdown.contains(e.target) &&
                toggleBtn !== e.target &&
                !toggleBtn?.contains(e.target)) {
                setShowChapterList(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showChapterList]);

    /**
     * Increases the font size of the chapter content
     */
    const increaseFontSize = () => {
        const newSize = Math.min(32, fontSize + 1);
        setFontSize(newSize);
        localStorage.setItem('readerFontSize', newSize.toString());
    };

    /**
     * Decreases the font size of the chapter content
     */
    const decreaseFontSize = () => {
        const newSize = Math.max(12, fontSize - 1);
        setFontSize(newSize);
        localStorage.setItem('readerFontSize', newSize.toString());
    };

    /**
     * Applies the selected theme to the document
     * @param {string} selectedTheme - Theme to apply (light, dark, sepia)
     */
    const applyTheme = (selectedTheme) => {
        document.documentElement.classList.remove('dark-mode', 'sepia-mode');

        if (selectedTheme === 'dark') {
            document.documentElement.classList.add('dark-mode');
        } else if (selectedTheme === 'sepia') {
            document.documentElement.classList.add('sepia-mode');
        }

        setTheme(selectedTheme);
        localStorage.setItem('readerTheme', selectedTheme);
    };

    /**
     * Counts words in HTML content
     * @param {string} htmlContent - HTML content to count words in
     * @returns {number} Word count
     */
    const countWords = (htmlContent) => {
        // Create a temporary div to extract text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        const words = text.trim().split(/\s+/);
        return words.filter(word => word.length > 0).length;
    };

    /**
     * Safely renders HTML content with sanitization
     * @param {string} content - HTML content to render
     * @returns {object} Sanitized HTML object for dangerouslySetInnerHTML
     */
    const getSafeHtml = (content) => {
        if (!content) return {__html: ''};

        // Create a minimal sanitizer configuration
        return {
            __html: DOMPurify.sanitize(content, {
                ALLOWED_TAGS: ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'br', 'i', 'b', 'img'],
                ALLOWED_ATTR: ['style', 'class', 'src', 'alt', 'width', 'height', 'id', 'data-pm-slice'],
                // Only remove truly dangerous elements
                FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
                ALLOW_DATA_ATTR: true, // Allow data attributes from ProseMirror
                WHOLE_DOCUMENT: false,
                SANITIZE_DOM: true
            })
        };
    };

    /**
     * Unescapes HTML entities and converts them back to HTML tags
     * This function is now only used when needed for legacy content
     * @param {string} html - HTML string with escaped entities
     * @returns {string} Unescaped HTML
     */
    const unescapeHtml = (html) => {
        if (!html) return '';

        // Create a textarea to use browser's built-in HTML entity decoding
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        return textarea.value;
    };

    /**
     * Scrolls to top of page
     * @returns {Promise} Promise that resolves when scroll is complete
     */
    const scrollToTop = () => {
        return new Promise((resolve) => {
            window.scrollTo({top: 0, behavior: 'smooth'});
            setTimeout(resolve, 500);
        });
    };

    /**
     * Handles navigation to previous chapter
     */
    const handlePrevChapter = async () => {
        if (chapter?.prevChapter && chapter.prevChapter._id) {
            setIsNavigating(true);
            await scrollToTop();
            try {
                // Prefetch next chapter data if query client available
                await queryClient.prefetchQuery({
                    queryKey: ['chapter', chapter.prevChapter._id],
                    queryFn: async () => {
                        const response = await axios.get(`${config.backendUrl}/api/chapters/${chapter.prevChapter._id}`);
                        return response.data;
                    }
                });
                navigate(`/novel/${novelId}/chapter/${chapter.prevChapter._id}`);
            } catch (error) {
                console.error('Error navigating to previous chapter:', error);
                setError('Failed to navigate to previous chapter.');
                setIsNavigating(false);
            }
        }
    };

    /**
     * Handles navigation to next chapter
     */
    const handleNextChapter = async () => {
        if (chapter?.nextChapter && chapter.nextChapter._id) {
            setIsNavigating(true);
            await scrollToTop();
            try {
                // Prefetch next chapter data if query client available
                await queryClient.prefetchQuery({
                    queryKey: ['chapter', chapter.nextChapter._id],
                    queryFn: async () => {
                        const response = await axios.get(`${config.backendUrl}/api/chapters/${chapter.nextChapter._id}`);
                        return response.data;
                    }
                });
                navigate(`/novel/${novelId}/chapter/${chapter.nextChapter._id}`);
            } catch (error) {
                console.error('Error navigating to next chapter:', error);
                setError('Failed to navigate to next chapter.');
                setIsNavigating(false);
            }
        }
    };

    /**
     * Formats date to "MMM-DD-YYYY" format
     * @param {string} date - Date string to format
     * @returns {string} Formatted date
     */
    const formatDate = (date) => {
        if (!date) return 'Invalid date';

        try {
            const chapterDate = new Date(date);

            if (isNaN(chapterDate.getTime())) {
                return 'Invalid date';
            }

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const month = monthNames[chapterDate.getMonth()];
            const day = chapterDate.getDate().toString().padStart(2, '0');
            const year = chapterDate.getFullYear();

            return `${month}-${day}-${year}`;
        } catch (err) {
            console.error('Date formatting error:', err);
            return 'Invalid date';
        }
    };

    /**
     * Handles deletion of a chapter (admin function)
     */
    const handleDeleteChapter = async () => {
        if (!window.confirm('Are you sure you want to delete this chapter?')) {
            return;
        }

        try {
            const currentChapterId = chapter._id;

            // Optimistic UI update if using React Query
            await queryClient.cancelQueries({queryKey: ['chapter', chapterId]});
            queryClient.removeQueries(['chapter', chapterId]);

            // Make API call to delete chapter
            await axios.delete(
                `${config.backendUrl}/api/chapters/${currentChapterId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            // Invalidate related queries
            queryClient.invalidateQueries({queryKey: ['novel', novelId]});

            // Navigate back to novel page
            navigate(`/novel/${novelId}`, {replace: true});
        } catch (err) {
            console.error('Failed to delete chapter:', err);
            setError('Failed to delete chapter. Please try again.');
        }
    };

    /**
     * Handles editing a chapter (admin function)
     */
    const handleEditChapter = async () => {
        try {
            setIsSaving(true);

            const updatedTitle = editedTitle;
            const updatedContent = editorRef.current.getContent({
                format: 'html',  // Get as HTML
                raw: true       // Get raw unprocessed HTML
            });
            const updateData = {
                title: updatedTitle,
                content: updatedContent
            };

            // Optimistic UI update
            await queryClient.cancelQueries({queryKey: ['chapter', chapterId]});

            const previousChapterData = queryClient.getQueryData(['chapter', chapterId]);

            queryClient.setQueryData(['chapter', chapterId], {
                ...chapterData,
                chapter: {
                    ...chapterData.chapter,
                    title: updatedTitle,
                    content: updatedContent, // Raw HTML preserved in cache
                    updatedAt: new Date().toISOString()
                }
            });

            // Make API call to update chapter
            const {data} = await axios.put(
                `${config.backendUrl}/api/chapters/${chapterId}`,
                updateData,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json' // Ensure proper content type
                    }
                }
            );

            // Exit edit mode
            setIsEditing(false);

            // Update with server data for consistency
            queryClient.setQueryData(['chapter', chapterId], {
                ...previousChapterData,
                chapter: {
                    ...previousChapterData.chapter,
                    ...data
                }
            });

        } catch (err) {
            console.error('Failed to update chapter:', err);
            setError('Failed to update chapter. Please try again.');

            // Refetch data to ensure consistency
            queryClient.refetchQueries({queryKey: ['chapter', chapterId]});
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Handles liking/unliking a chapter
     */
    const handleLike = async () => {
        // If not logged in, prompt to login
        if (!user) {
            alert('Please log in to like this chapter');
            return;
        }

        // Optimistic update
        const previousLiked = isLiked;
        const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;

        setIsLiked(!isLiked);
        setLikeCount(newLikeCount);

        try {
            // Make API call to like/unlike
            await axios.post(
                `${config.backendUrl}/api/chapters/${chapterId}/like`,
                {like: !isLiked},
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            // Invalidate related queries
            queryClient.invalidateQueries({
                queryKey: ['chapter-interactions', chapterId],
                exact: true
            });

            queryClient.invalidateQueries({
                queryKey: ['user-interactions', chapterId, user?.id],
                exact: true
            });
        } catch (err) {
            console.error('Failed to like/unlike chapter:', err);
            // Revert optimistic update on error
            setIsLiked(previousLiked);
            setLikeCount(likeCount);
        }
    };

    /**
     * Handles bookmarking/unbookmarking a chapter
     */
    const handleBookmark = async () => {
        // For non-logged in users, use localStorage
        if (!user) {
            const newBookmarkState = !isBookmarked;
            setIsBookmarked(newBookmarkState);

            if (newBookmarkState) {
                localStorage.setItem(`bookmark_${novelId}_${chapterId}`, 'true');
            } else {
                localStorage.removeItem(`bookmark_${novelId}_${chapterId}`);
            }
            return;
        }

        // For logged in users, use API
        const previousBookmarked = isBookmarked;
        setIsBookmarked(!isBookmarked);

        try {
            // Make API call to bookmark/unbookmark
            await axios.post(
                `${config.backendUrl}/api/chapters/${chapterId}/bookmark`,
                {bookmark: !isBookmarked},
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            // Invalidate user interactions query
            queryClient.invalidateQueries({
                queryKey: ['user-interactions', chapterId, user?.id],
                exact: true
            });
        } catch (err) {
            console.error('Failed to bookmark/unbookmark chapter:', err);
            // Revert optimistic update on error
            setIsBookmarked(previousBookmarked);
        }
    };

    /**
     * Handles submitting a rating for the chapter
     */
    const handleSubmitRating = async () => {
        if (!user) {
            alert('Please log in to rate this chapter');
            setShowRatingModal(false);
            return;
        }

        if (currentRating === 0) {
            alert('Please select a rating');
            return;
        }

        try {
            // Make API call to rate
            await axios.post(
                `${config.backendUrl}/api/chapters/${chapterId}/rate`,
                {rating: currentRating},
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            // Close modal
            setShowRatingModal(false);

            // Invalidate related queries
            queryClient.invalidateQueries({
                queryKey: ['chapter-interactions', chapterId],
                exact: true
            });

            queryClient.invalidateQueries({
                queryKey: ['user-interactions', chapterId, user?.id],
                exact: true
            });
        } catch (err) {
            console.error('Failed to rate chapter:', err);
            alert('Failed to submit rating. Please try again.');
        }
    };

    /**
     * Handles submitting a report for the chapter
     */
    const handleSubmitReport = async () => {
        if (!reportReason) {
            alert('Please select a reason for your report');
            return;
        }

        try {
            // Make API call to report
            await axios.post(
                `${config.backendUrl}/api/chapters/${chapterId}/report`,
                {
                    reason: reportReason,
                    details: reportDetails
                },
                {
                    headers: user ? {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    } : {}
                }
            );

            // Close modal and reset form
            setShowReportModal(false);
            setReportReason('');
            setReportDetails('');

            // Show success message
            alert('Thank you for your report. We will review it soon.');
        } catch (err) {
            console.error('Failed to submit report:', err);
            alert('Failed to submit report. Please try again.');
        }
    };

    /**
     * Handles sharing the chapter on social media
     * @param {string} platform - Social media platform to share on
     */
    const handleShare = (platform) => {
        const url = window.location.href;
        const title = chapter ? chapter.title : 'Chapter';

        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Reading ' + title)}`;
                break;
            case 'pinterest':
                shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
                break;
            default:
                return;
        }

        window.open(shareUrl, 'ShareWindow', 'height=450, width=550, toolbar=0, menubar=0');
    };

    // Show loading state with animation
    if (isLoading) {
        return (
            <div className="loading">
                <FontAwesomeIcon icon={faSpinner} spin style={{fontSize: '2rem', marginBottom: '1rem'}}/>
                <p>Loading chapter...</p>
            </div>
        );
    }

    // Show error state
    if (chapterError || error) {
        return <div className="error">{chapterError?.message || error}</div>;
    }

    // Show not found state
    if (!chapter || !novel) {
        return <div className="error">Chapter not found</div>;
    }

    return (
        <div className="chapter-container">
            {/* Reading progress bar */}
            <div className="reading-progress" style={{width: `${readingProgress}%`}}></div>

            {/* Chapter header */}
            <div className="chapter-header">
                <div className="chapter-navigation-header">
                    <div className="title-section">
                        {/* Admin actions */}
                        {user?.role === 'admin' && (
                            <div className="admin-actions">
                                {!isEditing ? (
                                    <button onClick={() => setIsEditing(true)} className="edit-chapter-btn">
                                        <FontAwesomeIcon icon={faEdit}/> Edit Chapter
                                    </button>
                                ) : (
                                    <div className="edit-actions">
                                        <button
                                            onClick={handleEditChapter}
                                            className="save-btn"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="cancel-btn"
                                            disabled={isSaving}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={handleDeleteChapter}
                                    className="delete-chapter-btn"
                                    disabled={isSaving}
                                >
                                    Delete Chapter
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="chapter-info">
                        <div className="novel-title">
                            <Link to={`/novel/${novelId}`}>{novel.title}</Link>
                        </div>

                        {isEditing ? (
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="chapter-title-input"
                                placeholder="Chapter Title"
                            />
                        ) : (
                            <span className="chapter-title">
                {chapter.title}
              </span>
                        )}
                    </div>

                    <div className="chapter-date-section">
                        {formatDate(chapter.createdAt)}
                    </div>
                </div>

                {/* Reading options */}
                <div className="reading-options">
                    <button onClick={() => decreaseFontSize()} className="font-button">A-</button>
                    <button onClick={() => increaseFontSize()} className="font-button">A+</button>
                    <button onClick={() => setShowSettingsModal(true)} className="font-button">
                        <FontAwesomeIcon icon={faCog}/>
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="chapter-navigation">
                <button
                    onClick={handlePrevChapter}
                    disabled={!chapter?.prevChapter || isNavigating || isEditing}
                    className={`nav-button ${!chapter?.prevChapter ? 'nav-button-disabled' : ''}`}
                    title={chapter?.prevChapter ? `Previous: ${chapter.prevChapter.title}` : 'No previous chapter available'}
                >
                    <FontAwesomeIcon icon={faChevronLeft}/>
                    {isNavigating ? 'Loading...' : (chapter?.prevChapter ? 'Previous Chapter' : 'No Previous Chapter')}
                </button>

                <button
                    onClick={handleNextChapter}
                    disabled={!chapter?.nextChapter || isNavigating || isEditing}
                    className={`nav-button ${!chapter?.nextChapter ? 'nav-button-disabled' : ''}`}
                    title={chapter?.nextChapter ? `Next: ${chapter.nextChapter.title}` : 'No next chapter available'}
                >
                    {isNavigating ? 'Loading...' : (chapter?.nextChapter ? 'Next Chapter' : 'No Next Chapter')}
                    <FontAwesomeIcon icon={faChevronRight}/>
                </button>
            </div>

            {/* Action Toolbar */}
            <div className="action-toolbar">
                {/* Staff Info */}
                <div className="staff-info">
          <span className="staff-member translator">
            <FontAwesomeIcon icon={faLanguage}/> {chapter.translator || 'No Translator'}
          </span>
                    <span className="staff-member editor">
            <FontAwesomeIcon icon={faEdit}/> {chapter.editor || 'No Editor'}
          </span>
                    <span className="staff-member proofreader">
            <FontAwesomeIcon icon={faCheckDouble}/> {chapter.proofreader || 'No Proofreader'}
          </span>
                </div>

                {/* Stats */}
                <div className="chapter-stats">
          <span className="stat-item">
            <FontAwesomeIcon icon={faEye}/> {viewCount} views
          </span>
                    <span className="stat-item">
            <FontAwesomeIcon icon={faFont}/> {wordCount} words
          </span>
                </div>
            </div>

            {/* Chapter Content */}
            <div className="chapter-card">
                <h2 className="chapter-title-banner">{chapter.title}</h2>

                {isEditing ? (
                    <div className="chapter-content editor-container">
                        <Editor
                            apiKey={config.tinymceApiKey}
                            onInit={(evt, editor) => {
                                editorRef.current = editor;
                                // Set raw HTML content directly
                                if (chapter?.content) {
                                    editor.setContent(chapter.content, {format: 'raw'});
                                }
                            }}
                            value={editedContent}
                            onEditorChange={(content) => {
                                setEditedContent(content);
                            }}
                            init={{
                                height: 500,
                                menubar: false,
                                entity_encoding: 'raw',
                                encoding: 'html',
                                convert_urls: false,
                                verify_html: false,
                                cleanup: false,
                                plugins: [
                                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                                    'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                    'insertdatetime', 'media', 'table', 'help', 'wordcount',
                                    'preview'                                ],
                                toolbar: 'undo redo | formatselect | ' +
                                    'bold italic underline strikethrough | ' +
                                    'alignleft aligncenter alignright alignjustify | ' +
                                    'bullist numlist outdent indent | ' +
                                    'link image | code preview | removeformat | help',
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                skin: 'oxide',
                                content_css: 'default',
                                statusbar: false,
                                resize: false,
                                branding: false,
                                promotion: false,
                                paste_data_images: true,
                                smart_paste: true,
                                paste_as_text: false,
                            }}
                        />
                    </div>
                ) : (
                    <div
                        ref={contentRef}
                        className="chapter-content"
                        style={{
                            fontSize: `${fontSize}px`,
                            fontFamily: fontFamily,
                            lineHeight: lineHeight,
                            padding: '15px 10px' // Reduced side padding
                        }}
                        dangerouslySetInnerHTML={getSafeHtml(chapter.content)}
                    />
                )}
            </div>

            {/* Chapter Bottom Actions */}
            <div className="chapter-bottom-actions">
                {/* Social Share */}
                <div className="share-buttons">
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        handleShare('facebook');
                    }} className="share-btn facebook" title="Share on Facebook">
                        <FontAwesomeIcon icon={faFacebookF}/>
                    </a>
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        handleShare('twitter');
                    }} className="share-btn twitter" title="Share on Twitter">
                        <FontAwesomeIcon icon={faTwitter}/>
                    </a>
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        handleShare('pinterest');
                    }} className="share-btn pinterest" title="Share on Pinterest">
                        <FontAwesomeIcon icon={faPinterestP}/>
                    </a>
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        handleShare('telegram');
                    }} className="share-btn telegram" title="Share on Telegram">
                        <FontAwesomeIcon icon={faTelegram}/>
                    </a>
                </div>

                {/* User Actions */}
                <div className="user-actions">
                    <button
                        onClick={handleLike}
                        className={`action-btn like ${isLiked ? 'active' : ''}`}
                    >
                        <FontAwesomeIcon icon={isLiked ? faHeart : farHeart}/>
                        {isLiked ? 'Liked' : 'Like'}
                        <span className="like-count">{likeCount}</span>
                    </button>

                    <button
                        onClick={() => setShowRatingModal(true)}
                        className={`action-btn rate ${currentRating > 0 ? 'active' : ''}`}
                    >
                        <FontAwesomeIcon icon={currentRating > 0 ? faStar : farStar}/>
                        Rate
                        <span className="rate-count">{averageRating}/5 • {ratingCount}</span>
                    </button>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="chapter-navigation bottom">
                <button
                    onClick={handlePrevChapter}
                    disabled={!chapter?.prevChapter || isNavigating || isEditing}
                    className={`nav-button ${!chapter?.prevChapter ? 'nav-button-disabled' : ''}`}
                    title={chapter?.prevChapter ? `Previous: ${chapter.prevChapter.title}` : 'No previous chapter available'}
                >
                    <FontAwesomeIcon icon={faChevronLeft}/>
                    {isNavigating ? 'Loading...' : (chapter?.prevChapter ? 'Previous Chapter' : 'No Previous Chapter')}
                </button>

                <button
                    onClick={handleNextChapter}
                    disabled={!chapter?.nextChapter || isNavigating || isEditing}
                    className={`nav-button ${!chapter?.nextChapter ? 'nav-button-disabled' : ''}`}
                    title={chapter?.nextChapter ? `Next: ${chapter.nextChapter.title}` : 'No next chapter available'}
                >
                    {isNavigating ? 'Loading...' : (chapter?.nextChapter ? 'Next Chapter' : 'No Next Chapter')}
                    <FontAwesomeIcon icon={faChevronRight}/>
                </button>
            </div>

            {/* Footer Navigation */}
            <div className="footer-nav-container">
                <div className="breadcrumb-nav">
                    <Link to="/"><FontAwesomeIcon icon={faHome}/> Home</Link>
                    <span className="breadcrumb-separator">/</span>
                    <Link to={`/novel/${novelId}`}>{novel.title}</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">Chapter {chapter.chapterNumber || ''}</span>
                </div>

                <div className="footer-actions">
                    <button
                        className="btn-report"
                        onClick={() => setShowReportModal(true)}
                    >
                        <FontAwesomeIcon icon={faFlag}/> Report
                    </button>
                    <button
                        className={`btn-bookmark ${isBookmarked ? 'active' : ''}`}
                        onClick={handleBookmark}
                    >
                        <FontAwesomeIcon icon={isBookmarked ? faBookmark : farBookmark}/>
                        {isBookmarked ? 'Bookmarked' : 'Bookmark chapter'}
                    </button>
                </div>
            </div>

            {/* Issue Alert */}
            <div className="issue-alert">
                Please report any issues (missing images, wrong chapter, ...) with the report button.
            </div>

            {/* Comments section */}
            <div className="novel-comments-section">
                <button
                    className="comments-toggle-btn"
                    onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                >
                    {isCommentsOpen ? (
                        <>
                            <FontAwesomeIcon icon={faLock} style={{marginRight: '8px'}}/>
                            Hide Comments
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faComment} style={{marginRight: '8px'}}/>
                            Show Comments
                        </>
                    )}
                </button>

                {isCommentsOpen && (
                    <CommentSection
                        novelId={`${novelId}-${chapterId}`}
                        user={user}
                        isAuthenticated={!!user}
                        comments={comments}
                        isLoading={isCommentsLoading}
                    />
                )}
            </div>

            {/* Fixed Controls */}
            <div className="fixed-controls">
                <button
                    className="control-btn"
                    id="scrollTopBtn"
                    title="Scroll to Top"
                    onClick={scrollToTop}
                    style={{display: 'none'}}
                >
                    <FontAwesomeIcon icon={faArrowUp}/>
                </button>
            </div>

            {/* Toggle Button */}
            <button
                className="toggle-btn"
                onClick={() => setShowNavControls(!showNavControls)}
                title="Toggle Navigation Controls"
            >
                <FontAwesomeIcon icon={showNavControls ? faTimes : faEllipsisV}/>
            </button>

            {/* Fixed Navigation Controls */}
            <div className={`nav-controls-container ${showNavControls ? 'visible' : ''}`}>
                <button
                    className="control-btn"
                    onClick={() => setShowChapterList(!showChapterList)}
                    title="Chapter List"
                    id="chapterListBtn"
                >
                    <FontAwesomeIcon icon={faList}/>
                </button>

                <button
                    className="control-btn"
                    onClick={() => setShowSettingsModal(true)}
                    title="Reading Settings"
                >
                    <FontAwesomeIcon icon={faCog}/>
                </button>
            </div>

            {/* Fixed Navigation Buttons */}
            <div className={`nav-control-prev ${showNavControls ? 'visible' : ''}`}>
                <button
                    className={`nav-control-btn ${!chapter?.prevChapter ? 'disabled' : ''}`}
                    onClick={handlePrevChapter}
                    disabled={!chapter?.prevChapter || isNavigating || isEditing}
                    title={chapter?.prevChapter ? `Previous: ${chapter.prevChapter.title}` : 'No previous chapter available'}
                >
                    <FontAwesomeIcon icon={faChevronLeft}/>
                </button>
            </div>

            <div className={`nav-control-next ${showNavControls ? 'visible' : ''}`}>
                <button
                    className={`nav-control-btn ${!chapter?.nextChapter ? 'disabled' : ''}`}
                    onClick={handleNextChapter}
                    disabled={!chapter?.nextChapter || isNavigating || isEditing}
                    title={chapter?.nextChapter ? `Next: ${chapter.nextChapter.title}` : 'No next chapter available'}
                >
                    <FontAwesomeIcon icon={faChevronRight}/>
                </button>
            </div>

            {/* Chapter Dropdown */}
            <div
                className={`chapter-dropdown ${showChapterList ? 'active' : ''}`}
                id="chapterDropdown"
            >
                <div className="chapter-dropdown-title">Chapters</div>
                <ul className="chapter-list">
                    {chapterList.map((item) => (
                        <li
                            key={item._id}
                            className={`chapter-item ${item._id === chapterId ? 'current' : ''}`}
                        >
                            <Link to={`/novel/${novelId}/chapter/${item._id}`}>
                                {item.title}
                            </Link>
                        </li>
                    ))}

                    {/* If chapterList is empty, show some dummy chapters for the UI */}
                    {chapterList.length === 0 && (
                        <>
                            <li className="chapter-item">
                                <Link to={`/novel/${novelId}/chapter/1`}>Chapter 1</Link>
                            </li>
                            <li className="chapter-item">
                                <Link to={`/novel/${novelId}/chapter/2`}>Chapter 2</Link>
                            </li>
                            <li className="chapter-item current">
                                <Link
                                    to={`/novel/${novelId}/chapter/${chapterId}`}>Chapter {chapter.chapterNumber || 3}</Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="settings-modal active">
                    <div className="settings-container">
                        <button
                            className="settings-close"
                            onClick={() => setShowSettingsModal(false)}
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>

                        <h3 className="settings-title">Reading Settings</h3>

                        <div className="settings-group">
                            <label className="settings-label">Font Family</label>
                            <select
                                className="font-family-select"
                                value={fontFamily}
                                onChange={(e) => {
                                    setFontFamily(e.target.value);
                                    localStorage.setItem('readerFontFamily', e.target.value);
                                }}
                            >
                                <option value="'Roboto', sans-serif">Roboto (Default)</option>
                                <option value="'Times New Roman', serif">Times New Roman</option>
                                <option value="'Open Sans', sans-serif">Open Sans</option>
                                <option value="'Noto Serif', serif">Noto Serif</option>
                            </select>
                        </div>

                        <div className="settings-group">
                            <label className="settings-label">Font Size</label>
                            <div className="font-size-control">
                                <button
                                    className="font-button"
                                    onClick={() => decreaseFontSize()}
                                >
                                    A-
                                </button>
                                <span className="font-size-value">{fontSize}</span>
                                <button
                                    className="font-button"
                                    onClick={() => increaseFontSize()}
                                >
                                    A+
                                </button>
                            </div>
                        </div>

                        <div className="settings-group">
                            <label className="settings-label">Line Height</label>
                            <select
                                className="line-height-select"
                                value={lineHeight}
                                onChange={(e) => {
                                    setLineHeight(e.target.value);
                                    localStorage.setItem('readerLineHeight', e.target.value);
                                }}
                            >
                                <option value="1.6">Default</option>
                                <option value="1.8">Comfortable</option>
                                <option value="2">Spacious</option>
                                <option value="2.2">Very Spacious</option>
                            </select>
                        </div>

                        <div className="settings-group">
                            <label className="settings-label">Theme</label>
                            <div className="theme-options">
                                <div
                                    className={`theme-option theme-light ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => applyTheme('light')}
                                    title="Light theme"
                                ></div>
                                <div
                                    className={`theme-option theme-dark ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => applyTheme('dark')}
                                    title="Dark theme"
                                ></div>
                                <div
                                    className={`theme-option theme-sepia ${theme === 'sepia' ? 'active' : ''}`}
                                    onClick={() => applyTheme('sepia')}
                                    title="Sepia theme"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && (
                <div className="settings-modal active">
                    <div className="settings-container">
                        <button
                            className="settings-close"
                            onClick={() => setShowRatingModal(false)}
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>

                        <h3 className="settings-title">Rate this Chapter</h3>

                        <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    className={`star ${currentRating >= star ? 'active' : ''}`}
                                    onClick={() => setCurrentRating(star)}
                                >
                  <FontAwesomeIcon icon={currentRating >= star ? faStar : farStar}/>
                </span>
                            ))}
                        </div>

                        <button
                            className="settings-apply"
                            onClick={handleSubmitRating}
                        >
                            Submit Rating
                        </button>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="settings-modal active">
                    <div className="settings-container">
                        <button
                            className="settings-close"
                            onClick={() => setShowReportModal(false)}
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>

                        <h3 className="settings-title">Report this Chapter</h3>

                        <div className="report-options">
                            <label className="report-option">
                                <input
                                    type="radio"
                                    name="reportReason"
                                    value="translation"
                                    checked={reportReason === 'translation'}
                                    onChange={() => setReportReason('translation')}
                                />
                                <span>Translation error</span>
                            </label>

                            <label className="report-option">
                                <input
                                    type="radio"
                                    name="reportReason"
                                    value="inappropriate"
                                    checked={reportReason === 'inappropriate'}
                                    onChange={() => setReportReason('inappropriate')}
                                />
                                <span>Inappropriate content</span>
                            </label>

                            <label className="report-option">
                                <input
                                    type="radio"
                                    name="reportReason"
                                    value="formatting"
                                    checked={reportReason === 'formatting'}
                                    onChange={() => setReportReason('formatting')}
                                />
                                <span>Formatting issue</span>
                            </label>

                            <label className="report-option">
                                <input
                                    type="radio"
                                    name="reportReason"
                                    value="other"
                                    checked={reportReason === 'other'}
                                    onChange={() => setReportReason('other')}
                                />
                                <span>Other</span>
                            </label>
                        </div>

                        <textarea
                            className="report-details"
                            placeholder="Please provide more details about the issue..."
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                        ></textarea>

                        <button
                            className="settings-apply"
                            onClick={handleSubmitReport}
                        >
                            Submit Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chapter;