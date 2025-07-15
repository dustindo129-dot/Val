import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {Link} from 'react-router-dom';
import {useQueryClient, useMutation, useQuery} from '@tanstack/react-query';
import {useAuth} from '../../context/AuthContext';
import {processDescription} from '../../utils/helpers';
import {BookmarkIcon, BookmarkActiveIcon, HeartIcon, HeartFilledIcon, ViewsIcon, StarIcon} from './NovelIcons';
import api from '../../services/api';
import RatingModal from '../../components/RatingModal';
import {useBookmarks} from '../../context/BookmarkContext';
import GiftRow from './GiftRow';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faFacebookF,
    faTwitter,
    faPinterestP,
    faTelegramPlane
} from '@fortawesome/free-brands-svg-icons';
import {
    faEye,
    faHeart as faHeartSolid,
    faStar as faStarSolid,
    faChevronRight,
    faForward,
    faBookmark as faBookmarkSolid,
    faLanguage,
    faEdit,
    faCheckDouble,
    faFileAlt,
    faList
} from '@fortawesome/free-solid-svg-icons';
import {
    faHeart,
    faStar,
    faBookmark
} from '@fortawesome/free-regular-svg-icons';
import cdnConfig from '../../config/bunny';
import {createUniqueSlug, generateChapterUrl, generateUserProfileUrl} from '../../utils/slugUtils';
import {translateStatus, getStatusForCSS} from '../../utils/statusTranslation';
import DOMPurify from 'dompurify';

// Helper function to convert colors to hex
const convertToHex = (color) => {
    if (color.startsWith('#')) {
        return color;
    }

    if (color.startsWith('rgb')) {
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
    }

    // Named colors to hex mapping (common ones)
    const namedColors = {
        'black': '#000000',
        'white': '#ffffff',
        'red': '#ff0000',
        'green': '#008000',
        'blue': '#0000ff',
        'yellow': '#ffff00',
        'orange': '#ffa500',
        'purple': '#800080',
        'pink': '#ffc0cb',
        'brown': '#a52a2a',
        'gray': '#808080',
        'grey': '#808080'
    };

    return namedColors[color.toLowerCase()] || color;
};

// Content processing function (matches ChapterContent.jsx logic)
const processContent = (content) => {
    if (!content) return '';

    try {
        const contentString = typeof content === 'object' ? JSON.stringify(content) : String(content);

        // Replace footnote markers
        let processedContent = contentString.replace(
            /\[(\d+)\]|\<sup class="footnote-marker" data-footnote="(\d+)"\>\[(\d+)\]\<\/sup\>/g,
            (match, simpleNum, dataNum, supNum) => {
                const footnoteNum = simpleNum || dataNum || supNum;
                return `<sup><a href="#note-${footnoteNum}" id="ref-${footnoteNum}" class="footnote-ref" data-footnote="${footnoteNum}">[${footnoteNum}]</a></sup>`;
            }
        );

        // Clean up br tags
        processedContent = processedContent.replace(/<br\s*\/?>/gi, '<br>');

        // COLOR DETECTION - Preserve intentional colors, remove default colors
        processedContent = processedContent.replace(
            /<span[^>]*style="([^"]*)"[^>]*>/gi,
            (match, styleContent) => {
                const classes = [];
                let preservedStyles = styleContent;

                // Preserve font-weight (bold)
                if (/font-weight:\s*bold/i.test(styleContent)) {
                    classes.push('text-bold');
                }

                // Preserve font-style (italic)
                if (/font-style:\s*italic/i.test(styleContent)) {
                    classes.push('text-italic');
                }

                // Preserve text-decoration (underline)
                if (/text-decoration:\s*underline/i.test(styleContent)) {
                    classes.push('text-underline');
                }

                // COLOR HANDLING
                const colorMatch = styleContent.match(/color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/i);
                if (colorMatch) {
                    const colorValue = colorMatch[1].toLowerCase();

                    // Check if it's a default black color (these should follow theme)
                    const isDefaultBlack = colorValue === '#000000' ||
                        colorValue === '#000' ||
                        colorValue === 'black' ||
                        colorValue === 'rgb(0, 0, 0)' ||
                        colorValue === 'rgb(0,0,0)';

                    if (isDefaultBlack) {
                        // Remove default black color - let theme handle it
                        preservedStyles = preservedStyles.replace(/color:\s*[^;]+[;]?/gi, '');
                        classes.push('text-default-color');
                    } else {
                        // Keep intentional colors
                        const hexColor = convertToHex(colorValue);
                        if (hexColor) {
                            classes.push(`text-color-${hexColor.replace('#', '')}`);
                        }
                    }
                } else {
                    // No color specified - should follow theme
                    classes.push('text-default-color');
                }

                // Preserve background colors (always keep)
                const bgColorMatch = styleContent.match(/background-color:\s*#([0-9a-fA-F]{3,6})/i);
                if (bgColorMatch) {
                    classes.push(`bg-color-${bgColorMatch[1]}`);
                }

                // Remove conflicting typography but keep everything else
                preservedStyles = preservedStyles.replace(
                    /(?:font-family[^;]*|font-size:\s*[\d.]+p[tx]|line-height:\s*[\d.]+)[;]?/gi,
                    ''
                );

                // Remove color if it was default black
                if (colorMatch) {
                    const colorValue = colorMatch[1].toLowerCase();
                    const isDefaultBlack = colorValue === '#000000' ||
                        colorValue === '#000' ||
                        colorValue === 'black' ||
                        colorValue === 'rgb(0, 0, 0)' ||
                        colorValue === 'rgb(0,0,0)';
                    if (isDefaultBlack) {
                        preservedStyles = preservedStyles.replace(/color:\s*[^;]+[;]?/gi, '');
                    }
                }

                preservedStyles = preservedStyles.trim().replace(/;$/, '');

                const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
                const styleStr = preservedStyles ? ` style="${preservedStyles}"` : '';

                return `<span${classStr}${styleStr}>`;
            }
        );

        // Handle paragraph-level styles
        processedContent = processedContent.replace(
            /<p[^>]*style="([^"]*)"[^>]*>/gi,
            (match, styleContent) => {
                const classes = [];
                let preservedStyles = styleContent;

                // Preserve text alignment
                if (/text-align:\s*center/i.test(styleContent)) {
                    classes.push('text-center');
                } else if (/text-align:\s*right/i.test(styleContent)) {
                    classes.push('text-right');
                } else if (/text-align:\s*left/i.test(styleContent)) {
                    classes.push('text-left');
                }

                // Handle paragraph colors the same way
                const colorMatch = styleContent.match(/color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/i);
                if (colorMatch) {
                    const colorValue = colorMatch[1].toLowerCase();
                    const isDefaultBlack = colorValue === '#000000' ||
                        colorValue === '#000' ||
                        colorValue === 'black' ||
                        colorValue === 'rgb(0, 0, 0)' ||
                        colorValue === 'rgb(0,0,0)';

                    if (isDefaultBlack) {
                        preservedStyles = preservedStyles.replace(/color:\s*[^;]+[;]?/gi, '');
                        classes.push('text-default-color');
                    } else {
                        const hexColor = convertToHex(colorValue);
                        if (hexColor) {
                            classes.push(`text-color-${hexColor.replace('#', '')}`);
                        }
                    }
                } else {
                    classes.push('text-default-color');
                }

                // Remove conflicting styles
                preservedStyles = preservedStyles.replace(
                    /(?:font-family[^;]*|font-size:\s*[\d.]+p[tx]|line-height:\s*[\d.]+)[;]?/gi,
                    ''
                );

                preservedStyles = preservedStyles.trim().replace(/;$/, '');

                const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
                const styleStr = preservedStyles ? ` style="${preservedStyles}"` : '';

                return `<p${classStr}${styleStr}>`;
            }
        );

        // Convert decorated containers to themed classes
        processedContent = processedContent.replace(
            /<div\s+style="[^"]*(?:background[^"]*gradient|border[^"]*solid|box-shadow)[^"]*"[^>]*>/gi,
            '<div class="content-frame themed-container">'
        );

        // Check if content already contains proper paragraph tags
        if (processedContent.includes('<p')) {
            // Content already has paragraph structure, preserve it including empty paragraphs
            let finalContent = processedContent;
            // Just ensure empty paragraphs have non-breaking space
            finalContent = finalContent.replace(/<p(\s[^>]*)?>\s*<\/p>/gi, '<p$1>&nbsp;</p>');

            return DOMPurify.sanitize(finalContent, {
                ADD_TAGS: ['sup', 'a', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'u', 'i', 'b'],
                ADD_ATTR: ['href', 'id', 'class', 'data-footnote', 'dir', 'style'],
                KEEP_CONTENT: false,
                ALLOW_EMPTY_TAGS: ['p'],
            });
        }

        // Fallback: process content that doesn't have paragraph structure
        let paragraphBlocks = processedContent
            .split(/(<br>\s*){2,}/gi)
            .filter(block => block !== undefined && !block.match(/^(<br>\s*)+$/i));

        if (paragraphBlocks.length <= 1) {
            paragraphBlocks = processedContent
                .split(/<br>/gi);
        }

        paragraphBlocks = paragraphBlocks
            .map(block => {
                let trimmedBlock = block.trim();
                trimmedBlock = trimmedBlock.replace(/^(<br>\s*)+|(<br>\s*)+$/gi, '');

                if (trimmedBlock) {
                    if (!trimmedBlock.match(/^<(p|div|h[1-6]|blockquote|pre|ul|ol|li)/i)) {
                        return `<p class="text-default-color">${trimmedBlock}</p>`;
                    }
                    return trimmedBlock;
                }
                // Return empty paragraph with non-breaking space to preserve spacing
                return '<p>&nbsp;</p>';
            });

        let finalContent = paragraphBlocks.join('');

        if (paragraphBlocks.length === 0 && processedContent.trim()) {
            const cleanContent = processedContent.replace(/<br>/gi, ' ');
            finalContent = `<p class="text-default-color">${cleanContent}</p>`;
        }

        return DOMPurify.sanitize(finalContent, {
            ADD_TAGS: ['sup', 'a', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'u', 'i', 'b'],
            ADD_ATTR: ['href', 'id', 'class', 'data-footnote', 'dir', 'style'],
            KEEP_CONTENT: false,
            ALLOW_EMPTY_TAGS: ['p'],
        });
    } catch (error) {
        console.error('Lỗi xử lý nội dung:', error);
        return DOMPurify.sanitize(content);
    }
};

// Helper function to render staff names (handles both user objects and text strings)
const renderStaffName = (staffMember, index, isActive = false) => {
  // Only make active staff clickable
  if (isActive) {
    // Check if it's a user object (from active staff with user data) or just a string
    if (typeof staffMember === 'object' && staffMember.username) {
      // It's a user object - make it clickable
      return (
        <Link 
          to={generateUserProfileUrl(staffMember)} 
          className="rd-staff-name-link" 
          key={index}
        >
          <span className="rd-staff-name rd-staff-name-active">
            {staffMember.displayName || staffMember.username}
          </span>
        </Link>
      );
    } else if (typeof staffMember === 'string') {
      // It's a text string - check if it looks like a username (no spaces, reasonable length)
      const isLikelyUsername = staffMember.length <= 30 && !staffMember.includes(' ') && staffMember.trim() === staffMember;
      
      if (isLikelyUsername) {
        // Treat as username and make clickable
        return (
          <Link 
            to={generateUserProfileUrl({ username: staffMember })} 
            className="rd-staff-name-link" 
            key={index}
          >
            <span className="rd-staff-name rd-staff-name-active">
              {staffMember}
            </span>
          </Link>
        );
      } else {
        // Treat as display name (not clickable but still active)
        return (
          <span className="rd-staff-name rd-staff-name-active" key={index}>
            {staffMember}
          </span>
        );
      }
    } else {
      // Fallback for any other case
      return (
        <span className="rd-staff-name rd-staff-name-active" key={index}>
          {String(staffMember)}
        </span>
      );
    }
  } else {
    // Inactive staff - always plain text, no clickable links
    return (
      <span className="rd-staff-name rd-staff-name-inactive" key={index}>
        {typeof staffMember === 'object' && staffMember.username 
          ? (staffMember.displayName || staffMember.username)
          : String(staffMember)
        }
      </span>
    );
  }
};

const NovelInfo = ({novel, readingProgress, chaptersData, userInteraction = {}, truncateHTML, sidebar}) => {
    const queryClient = useQueryClient();
    const {user} = useAuth();
    const {updateBookmarkStatus} = useBookmarks();
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);
    const [lastLikeTime, setLastLikeTime] = useState(0);
    const [isModuleNavOpen, setIsModuleNavOpen] = useState(false);
    const [expandedGenres, setExpandedGenres] = useState(false);
    const [needsGenreToggle, setNeedsGenreToggle] = useState(false);
    const genreTagsRef = useRef(null);
    const LIKE_COOLDOWN = 500; // 500ms cooldown between likes

    // Create a safe local copy of userInteraction with defaults
    const safeUserInteraction = {
        liked: userInteraction?.liked || false,
        rating: userInteraction?.rating || null,
        bookmarked: userInteraction?.bookmarked || false,
        followed: userInteraction?.followed || false
    };

    // Check if we have a nested novel object
    const novelData = novel?.novel || novel;
    const novelTitle = novelData?.title;
    const novelId = novelData?._id;  // Get the ID directly

    // Query for novel stats
    const {data: novelStats = {totalLikes: 0, totalRatings: 0, totalBookmarks: 0, averageRating: '0.0'}} = useQuery({
        queryKey: ['novel-stats', novelId],
        queryFn: () => api.getNovelStats(novelId),
        enabled: !!novelId,
        staleTime: 1000 * 60 * 3, // 3 minutes - don't refetch if data is less than 3 minutes old
        cacheTime: 1000 * 60 * 15, // 15 minutes - keep in cache for 15 minutes
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: false // Don't refetch when reconnecting
    });

    // Query for bookmarked chapter
    const {data: bookmarkData} = useQuery({
        queryKey: ['bookmarked-chapter', novelId, user?.id],
        queryFn: () => api.getBookmarkedChapter(novelId),
        enabled: !!novelId && !!user,
        staleTime: 1000 * 60 * 3, // 3 minutes - don't refetch if data is less than 3 minutes old
        cacheTime: 1000 * 60 * 15, // 15 minutes - keep in cache for 15 minutes
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: false // Don't refetch when reconnecting
    });

    // Fallback ID mechanism - use a ref to keep track of a valid ID
    const novelIdRef = useRef(novel?._id);

    // Update ref if we get a valid ID
    useEffect(() => {
        if (novelId) {
            novelIdRef.current = novelId;
        }
    }, [novelId]);

    // Check if genre list needs a toggle button
    useEffect(() => {
        if (novelData?.genres && novelData.genres.length > 8) {
            const timer = setTimeout(() => {
                const maxVisibleTags = 5;

                if (novelData.genres.length > maxVisibleTags) {
                    setNeedsGenreToggle(true);
                } else {
                    setNeedsGenreToggle(false);
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [novelData?.genres]);

    // Mutations for bookmark and like toggling
    const bookmarkMutation = useMutation({
        mutationFn: () => {
            if (!novelId) {
                throw new Error("Không thể đánh dấu: ID truyện không tồn tại");
            }
            return api.toggleBookmark(novelId);
        },
        onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['novel-stats', novelId]);
            await queryClient.cancelQueries(['userInteraction', user?.username, novelId]);

            // Snapshot the previous values
            const previousStats = queryClient.getQueryData(['novel-stats', novelId]);
            const previousInteraction = queryClient.getQueryData(['userInteraction', user?.username, novelId]);

            // Optimistically update the bookmark status and count
            const willBeBookmarked = !(previousInteraction?.bookmarked);

            queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
                ...old,
                bookmarked: willBeBookmarked
            }));

            queryClient.setQueryData(['novel-stats', novelId], old => ({
                ...old,
                totalBookmarks: willBeBookmarked ? (old.totalBookmarks + 1) : (old.totalBookmarks - 1)
            }));

            // Return a context object with the snapshotted values
            return {previousStats, previousInteraction};
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context we saved to roll back
            if (context?.previousStats) {
                queryClient.setQueryData(['novel-stats', novelId], context.previousStats);
            }
            if (context?.previousInteraction) {
                queryClient.setQueryData(['userInteraction', user?.username, novelId], context.previousInteraction);
            }
            console.error("Lỗi đánh dấu:", err);
            alert("Không thể đánh dấu: Vui lòng thử lại.");
        },
        onSuccess: (response) => {
            // Update the novel data in the cache
            queryClient.setQueryData(['novel', novelId], (oldData) => {
                if (!oldData) return oldData;

                // Create a deep copy to avoid mutating the cache directly
                const newData = JSON.parse(JSON.stringify(oldData));

                // Update the isBookmarked status based on the response
                if (newData.novel) {
                    newData.novel.isBookmarked = response.bookmarked;
                } else if (newData._id) {
                    newData.isBookmarked = response.bookmarked;
                }

                return newData;
            });

            // Update the userInteraction data in the cache
            queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
                ...old,
                bookmarked: response.bookmarked
            }));

            // Update the bookmark context
            updateBookmarkStatus(novelId, response.bookmarked);

            // Invalidate queries to ensure fresh data on next fetch
            queryClient.invalidateQueries({
                queryKey: ['novel', novelId],
                refetchType: 'none'
            });

            // Also invalidate the user's bookmarks list
            if (user?.username) {
                queryClient.invalidateQueries({
                    queryKey: ['bookmarks', user.username],
                    refetchType: 'none'
                });
            }

            // Invalidate novel stats to ensure fresh data on next fetch
            queryClient.invalidateQueries({
                queryKey: ['novel-stats', novelId],
                refetchType: 'none'
            });
        }
    });

    const likeMutation = useMutation({
        mutationFn: () => api.likeNovel(novelId),
        onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['novel-stats', novelId]);
            await queryClient.cancelQueries(['userInteraction', user?.username, novelId]);

            // Snapshot the previous values
            const previousStats = queryClient.getQueryData(['novel-stats', novelId]);
            const previousInteraction = queryClient.getQueryData(['userInteraction', user?.username, novelId]);

            // Optimistically update the like status and count
            const willBeLiked = !(previousInteraction?.liked);

            queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
                ...old,
                liked: willBeLiked
            }));

            queryClient.setQueryData(['novel-stats', novelId], old => ({
                ...old,
                totalLikes: willBeLiked ? (old.totalLikes + 1) : (old.totalLikes - 1)
            }));

            // Return a context object with the snapshotted values
            return {previousStats, previousInteraction};
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context we saved to roll back
            if (context?.previousStats) {
                queryClient.setQueryData(['novel-stats', novelId], context.previousStats);
            }
            if (context?.previousInteraction) {
                queryClient.setQueryData(['userInteraction', user?.username, novelId], context.previousInteraction);
            }
        },
        onSuccess: (response) => {
            // Update both caches with the actual response data
            queryClient.setQueryData(['novel-stats', novelId], old => ({
                ...old,
                totalLikes: response.totalLikes
            }));

            queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
                ...old,
                liked: response.liked
            }));

            // Invalidate related queries to ensure consistency
            queryClient.invalidateQueries({
                queryKey: ['novel', novelId],
                refetchType: 'none'
            });

            queryClient.invalidateQueries({
                queryKey: ['novel-stats', novelId],
                refetchType: 'none'
            });
        }
    });

    // Follow mutation
    const followMutation = useMutation({
        mutationFn: () => api.followNovel(user.username, novelId),
        onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['userInteraction', user?.username, novelId]);

            // Snapshot the previous value
            const previousInteraction = queryClient.getQueryData(['userInteraction', user?.username, novelId]);

            // Optimistically update the follow status
            const willBeFollowed = !(previousInteraction?.followed);

            queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
                ...old,
                followed: willBeFollowed
            }));

            // Return a context object with the snapshotted value
            return {previousInteraction};
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context we saved to roll back
            if (context?.previousInteraction) {
                queryClient.setQueryData(['userInteraction', user?.username, novelId], context.previousInteraction);
            }
        },
        onSuccess: (response) => {
            // Update the cache with the actual response data
            queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
                ...old,
                followed: response.isFollowed
            }));

            // Invalidate related queries to ensure consistency
            queryClient.invalidateQueries({
                queryKey: ['userInteraction', user?.username, novelId],
                refetchType: 'none'
            });
        }
    });

    // Handle follow toggling
    const handleFollowToggle = () => {
        if (!user?.username) {
            alert('Vui lòng đăng nhập để theo dõi truyện');
            return;
        }

        // Validate token presence
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("Token không tồn tại khi theo dõi truyện");
            alert("Lỗi xác thực. Vui lòng đăng xuất và đăng nhập lại.");
            return;
        }

        // Check if we have a novel ID
        if (!novelId) {
            console.error("Không thể theo dõi: ID truyện không tồn tại");
            alert("Lỗi: Không thể xác định truyện. Vui lòng thử tải lại trang.");
            return;
        }

        followMutation.mutate();
    };

    // Handle module navigation
    const handleModuleNavToggle = () => {
        setIsModuleNavOpen(!isModuleNavOpen);
    };

    const scrollToModule = (moduleId) => {
        const moduleElement = document.querySelector(`[data-module-id="${moduleId}"]`);
        if (moduleElement) {
            moduleElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }
        setIsModuleNavOpen(false);
    };

    // Handle like toggling with debounce
    const toggleLike = () => {
        // Use username presence instead of isAuthenticated flag
        if (!user?.username) {
            alert('Vui lòng đăng nhập để thích truyện');
            return;
        }

        // Validate token presence
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("Token không tồn tại khi thích truyện");
            alert("Lỗi xác thực. Vui lòng đăng xuất và đăng nhập lại.");
            return;
        }

        // Check if we have a novel ID
        if (!novelId) {
            console.error("Không thể thích: ID truyện không tồn tại");
            alert("Lỗi: Không thể xác định truyện. Vui lòng thử tải lại trang.");
            return;
        }

        // Add debouncing
        const now = Date.now();
        if (now - lastLikeTime < LIKE_COOLDOWN) {
            return; // Ignore click if too soon after last click
        }
        setLastLikeTime(now);

        likeMutation.mutate();
    };

    // Handle bookmark toggling
    const toggleBookmark = () => {
        // Use username presence instead of isAuthenticated flag
        if (!user?.username) {
            alert('Vui lòng đăng nhập để đánh dấu truyện');
            return;
        }

        // Validate token presence
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("Token không tồn tại khi đánh dấu truyện");
            alert("Lỗi xác thực. Vui lòng đăng xuất và đăng nhập lại.");
            return;
        }

        // Check if we have a novel ID
        if (!novelId) {
            console.error("Không thể đánh dấu: ID truyện không tồn tại");
            alert("Lỗi: Không thể xác định truyện. Vui lòng thử tải lại trang.");
            return;
        }

        bookmarkMutation.mutate();
    };

    // Handle rating click
    const handleRatingClick = () => {
        // Use username presence instead of isAuthenticated flag
        if (!user?.username) {
            alert('Vui lòng đăng nhập để đánh giá truyện');
            return;
        }
        setIsRatingModalOpen(true);
    };

    // Toggle description expand/collapse
    const toggleDescription = (e) => {
        if (e) e.preventDefault();
        setIsDescriptionExpanded(!isDescriptionExpanded);
    };

    // Toggle genres expansion
    const toggleGenres = () => {
        setExpandedGenres(!expandedGenres);
    };

    // Calculate total chapter count
    const totalChapters = chaptersData?.chapters?.length || 0;

    // Format last updated date in Vietnamese format (DD/MM/YYYY)
    const lastUpdated = novelData.updatedAt
        ? (() => {
            const date = new Date(novelData.updatedAt);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        })()
        : 'Never';

    // Format time ago for display
    const formatTimeAgo = (date) => {
        if (!date) return '';

        try {
            const now = new Date();
            const updateDate = new Date(date);
            const diffInMs = now - updateDate;
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

            if (diffInHours < 1) {
                const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
                return `${diffInMinutes || 0} phút trước`;
            } else if (diffInHours < 24) {
                return `${diffInHours} giờ trước`;
            } else {
                const diffInDays = Math.floor(diffInHours / 24);
                return `${diffInDays} ngày trước`;
            }
        } catch (e) {
            console.error("Lỗi định dạng ngày:", e);
            return '';
        }
    };

    // Handle social share
    const handleShare = (platform, e) => {
        if (e) e.preventDefault();

        // Get current URL and title
        const url = window.location.href;
        const title = novelTitle || 'Novel';

        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
                break;
            case 'pinterest':
                const image = novelData.illustration || '';
                shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(title)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
                break;
            default:
                return;
        }

        // Open the share dialog
        if (shareUrl) {
            window.open(shareUrl, 'ShareWindow', 'height=450, width=550, toolbar=0, menubar=0, directories=0, scrollbars=0');
        }
    };

    // Handle successful rating update
    const handleRatingSuccess = (response) => {
        // Update the novel data in the cache
        queryClient.setQueryData(['novel', novelId], (oldData) => {
            if (!oldData) return oldData;

            // Create a deep copy to avoid mutating the cache directly
            const newData = JSON.parse(JSON.stringify(oldData));

            // Update the ratings
            if (newData.novel) {
                newData.novel.ratings = {
                    total: response.ratingsCount,
                    value: response.ratingsCount * parseFloat(response.averageRating)
                };
            } else if (newData._id) {
                newData.ratings = {
                    total: response.ratingsCount,
                    value: response.ratingsCount * parseFloat(response.averageRating)
                };
            }

            return newData;
        });

        // Update user interaction in cache
        queryClient.setQueryData(['userInteraction', user?.username, novelId],
            (oldData) => ({
                ...oldData,
                rating: response.rating
            })
        );

        setIsRatingModalOpen(false);
    };

    // Determine novel type based on genres
    const getNovelType = () => {
        if (!novelData.genres) return null;

        const hasVietnameseNovel = novelData.genres.some(genre => genre.includes('Vietnamese Novel'));
        const hasTranslatedNovel = novelData.genres.some(genre =>
            genre.includes('Chinese Novel') ||
            genre.includes('English Novel') ||
            genre.includes('Japanese Novel') ||
            genre.includes('Korean Novel')
        );

        if (hasVietnameseNovel) {
            return {type: 'original', label: 'Truyện Sáng Tác'};
        } else if (hasTranslatedNovel) {
            return {type: 'translated', label: 'Truyện Dịch'};
        }

        return null;
    };

    // Get genre tags with proper styling and sorting
    const getGenreTags = () => {
        if (!novelData.genres || novelData.genres.length === 0) {
            return [];
        }

        return novelData.genres.map(genre => {
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

    // Get modules data for navigation
    const modulesData = useMemo(() => {
        // This should come from the parent component that has access to modules
        // For now, we'll return empty array - this will be passed as a prop
        return novel?.modules || [];
    }, [novel]);

    if (!novel) {
        return <div className="novel-info-section error">Truyện không tồn tại</div>;
    }

    // Determine if the novel is bookmarked
    const isBookmarked = safeUserInteraction.bookmarked || false;
    // Determine if the novel is liked
    const isLiked = safeUserInteraction.liked || false;
    // Determine if the novel is followed
    const isFollowed = safeUserInteraction.followed || false;
    // Current user rating
    const currentRating = safeUserInteraction.rating || 0;
    // Novel type banner
    const novelType = getNovelType();
    // Genre tags
    const genreTags = getGenreTags();

    return (
        <>
            <div className="rd-novel-detail-container">
                {/* Novel Header with Title and Social Share */}
                <div className="rd-novel-header">
                    <div className="rd-novel-title-wrapper">
                        <h1 className="rd-novel-title">
                            {novelTitle || 'Đang tải...'}
                            <button
                                className={`rd-follow-btn ${isFollowed ? 'following' : ''}`}
                                onClick={handleFollowToggle}
                                title={isFollowed ? 'Bỏ theo dõi' : 'Theo dõi'}
                                disabled={followMutation.isPending}
                            >
                                {followMutation.isPending ? '...' : (isFollowed ? '✓' : '+')}
                            </button>
                            <span
                                className={`rd-status-badge-inline ${getStatusForCSS(novelData.status) || 'rd-status-ongoing'}`}>
                                {translateStatus(novelData.status)}
                            </span>
                        </h1>
                    </div>

                    <div className="rd-social-share">
                        <a href="#" className="rd-share-btn rd-facebook" title="Share on Facebook"
                           onClick={(e) => handleShare('facebook', e)}>
                            <FontAwesomeIcon icon={faFacebookF}/>
                        </a>
                        <a href="#" className="rd-share-btn rd-twitter" title="Share on Twitter"
                           onClick={(e) => handleShare('twitter', e)}>
                            <FontAwesomeIcon icon={faTwitter}/>
                        </a>
                        <a href="#" className="rd-share-btn rd-pinterest" title="Share on Pinterest"
                           onClick={(e) => handleShare('pinterest', e)}>
                            <FontAwesomeIcon icon={faPinterestP}/>
                        </a>
                        <a href="#" className="rd-share-btn rd-telegram" title="Share on Telegram"
                           onClick={(e) => handleShare('telegram', e)}>
                            <FontAwesomeIcon icon={faTelegramPlane}/>
                        </a>
                    </div>
                </div>

                {/* Novel Content Area with Main Content and Sidebar */}
                <div className="rd-novel-content">
                    <div className="rd-novel-main">
                        {/* Novel Card with Cover and Info */}
                        <div className="rd-novel-card">

                            {/* Header with cover and info */}
                            <div className="rd-novel-header-content">

                                <div className="rd-novel-cover">
                                    {novelType && (
                                        <div className={`rd-novel-type-banner ${novelType.type}`}>
                                            {novelType.label}
                                        </div>
                                    )}
                                    <img
                                        src={novelData.illustration || 'https://Valvrareteam.b-cdn.net/%C6%A0%20l%E1%BB%97i%20h%C3%ACnh%20m%E1%BA%A5t%20r%E1%BB%93i.png'}
                                        alt={novelData.title}
                                        className="rd-cover-image"
                                        onError={(e) => {
                                            e.target.src = cdnConfig.defaultImages.novel;
                                        }}
                                    />
                                    <div className="rd-update-time">
                                        Cập nhật: {formatTimeAgo(novelData.updatedAt)}
                                    </div>


                                </div>
                                <div className="rd-chapter-count-overlay">
                                    <div className="rd-chapter-count-label">SỐ CHƯƠNG</div>
                                    <div className="rd-chapter-count-value">{totalChapters}</div>
                                </div>

                                <div className="rd-novel-info">
                                    {novelData.alternativeTitles && novelData.alternativeTitles.length > 0 && (
                                        <h2 className="rd-alt-title">
                                            Tên khác: {novelData.alternativeTitles.join('; ')}
                                        </h2>
                                    )}

                                    <div className="rd-info-rows">
                                        <div className="rd-info-row">
                                            <div className="rd-info-label">Tác giả:</div>
                                            <div className="rd-info-value">
                                                <span className="rd-author-name">{novelData.author || 'Không xác định'}</span>
                                            </div>
                                        </div>

                                        {novelData.illustrator && (
                                            <div className="rd-info-row">
                                                <div className="rd-info-label">Họa sĩ:</div>
                                                <div className="rd-info-value">
                                                    <span className="rd-author-name">{novelData.illustrator || (novelData.artist || 'Không xác định')}</span>
                                                </div>
                                            </div>
                                        )}

                                        {genreTags.length > 0 && (
                                            <div className="rd-genres-row">
                                                <div className="rd-genres-label">Thể loại:</div>
                                                <div className="rd-info-value">
                                                    <div
                                                        ref={genreTagsRef}
                                                        className={`rd-genres-list ${expandedGenres ? 'rd-expanded' : ''}`}
                                                    >
                                                        {expandedGenres ? (
                                                            // Show all genres when expanded
                                                            genreTags.map((genre, index) => (
                                                                <span
                                                                    className={`rd-genre-tag ${genre.class}`}
                                                                    key={index}
                                                                >
                  {genre.name}
                </span>
                                                            ))
                                                        ) : (
                                                            // Show limited genres when collapsed
                                                            <>
                                                                {genreTags.slice(0, needsGenreToggle ? 8 : genreTags.length).map((genre, index) => (
                                                                    <span
                                                                        className={`rd-genre-tag ${genre.class}`}
                                                                        key={index}
                                                                    >
                    {genre.name}
                  </span>
                                                                ))}

                                                                {needsGenreToggle && (
                                                                    <span
                                                                        className="rd-toggle-genres"
                                                                        onClick={toggleGenres}
                                                                    >
                    (...)
                  </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Gift Row - nằm trong rd-info-rows nhưng luôn ở cuối */}
                                        <div className="rd-gift-container">
                                            <GiftRow
                                                novelId={novelId}
                                                onGiftSuccess={() => {
                                                    // Refresh novel data when gifts are sent
                                                    queryClient.invalidateQueries(['novel', novelId]);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>


                            </div>

                            <div className="rd-card-footer">
                                {/* Stats Row */}
                                <div className="rd-stats-row">
                                    <div className="rd-stat-item">
                                        <div className="rd-stat-group">
                                            <div className="rd-stat-icon">
                                                <FontAwesomeIcon icon={faEye}/>
                                            </div>
                                            <div className="rd-stat-content">
                                                <div
                                                    className="rd-stat-value">{novelData.views?.total?.toLocaleString() || '0'}</div>
                                                <div className="rd-stat-label">Lượt xem</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rd-stat-item">
                                        <div className="rd-stat-group">
                                            <div className="rd-stat-icon">
                                                <FontAwesomeIcon icon={faFileAlt}/>
                                            </div>
                                            <div className="rd-stat-content">
                                                <div
                                                    className="rd-stat-value">{(novelData.wordCount || 0).toLocaleString()}</div>
                                                <div className="rd-stat-label">Từ</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rd-stat-item clickable" onClick={toggleLike}>
                                        <div className="rd-stat-group">
                                            <div className="rd-stat-icon">
                                                <FontAwesomeIcon icon={isLiked ? faHeartSolid : faHeart}
                                                                 style={{color: isLiked ? '#e74c3c' : undefined}}/>
                                            </div>
                                            <div className="rd-stat-content">
                                                <div
                                                    className="rd-stat-value">{novelStats.totalLikes?.toLocaleString() || '0'}</div>
                                                <div className="rd-stat-label">Lượt thích</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rd-stat-item clickable" onClick={handleRatingClick}>
                                        <div className="rd-stat-group">
                                            <div className="rd-stat-icon">
                                                <FontAwesomeIcon icon={currentRating > 0 ? faStarSolid : faStar}
                                                                 style={{color: currentRating > 0 ? '#f1c40f' : undefined}}/>
                                            </div>
                                            <div className="rd-stat-content">
                                                <div className="rd-stat-value">
                                                    {novelStats.averageRating || '0'}/5, {novelStats.totalRatings?.toLocaleString() || '0'}
                                                </div>
                                                <div className="rd-stat-label">Lượt đánh giá</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="rd-actions-row">
                                    {chaptersData?.chapters?.length > 0 ? (
                                        <Link
                                            to={generateChapterUrl(
                                                {_id: novelId, title: novelData.title},
                                                chaptersData.chapters[0]
                                            )}
                                            className="rd-btn rd-btn-primary"
                                        >
                                            <FontAwesomeIcon icon={faChevronRight}/>
                                            Chương đầu tiên
                                        </Link>
                                    ) : (
                                        <button className="rd-btn rd-btn-primary" disabled>
                                            <FontAwesomeIcon icon={faChevronRight}/>
                                            Không có chương
                                        </button>
                                    )}

                                    {chaptersData?.chapters?.length > 0 ? (
                                        bookmarkData?.bookmarkedChapter ? (
                                            <Link
                                                to={generateChapterUrl(
                                                    {_id: novelId, title: novelData.title},
                                                    {
                                                        _id: bookmarkData.bookmarkedChapter.id,
                                                        title: bookmarkData.bookmarkedChapter.title
                                                    }
                                                )}
                                                className="rd-btn rd-btn-primary"
                                                title={`Continue from: ${bookmarkData.bookmarkedChapter.title}`}
                                            >
                                                <FontAwesomeIcon icon={faForward}/>
                                                Tiếp tục đọc
                                            </Link>
                                        ) : (
                                            <Link
                                                to={generateChapterUrl(
                                                    {_id: novelId, title: novelData.title},
                                                    chaptersData.chapters[chaptersData.chapters.length - 1]
                                                )}
                                                className="rd-btn rd-btn-primary"
                                            >
                                                <FontAwesomeIcon icon={faForward}/>
                                                Chương mới nhất
                                            </Link>
                                        )
                                    ) : (
                                        <button className="rd-btn rd-btn-primary" disabled>
                                            <FontAwesomeIcon icon={faForward}/>
                                            Không có chương
                                        </button>
                                    )}

                                    <button
                                        className={`rd-btn rd-btn-bookmark ${isBookmarked ? 'active' : ''}`}
                                        onClick={toggleBookmark}
                                    >
                                        <FontAwesomeIcon icon={isBookmarked ? faBookmarkSolid : faBookmark}/>
                                        {isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu'} ({novelStats.totalBookmarks?.toLocaleString() || '0'})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="rd-description-section">
                            <h2 className="rd-description-title">MÔ TẢ</h2>
                            <div className={`rd-description-content ${isDescriptionExpanded ? 'expanded' : ''}`}>
                                <div dangerouslySetInnerHTML={{
                                    __html: isDescriptionExpanded
                                        ? novelData.description
                                        : truncateHTML(novelData.description, 300)
                                }}/>
                            </div>
                            <a href="#" className="rd-show-toggle" onClick={toggleDescription}>
                                {isDescriptionExpanded ? 'Hiển thị ít hơn' : 'Hiển thị thêm'}
                            </a>
                        </div>
                    </div>

                    <div className="rd-novel-sidebar">
                        {/* Staff Section - Only show if there's any staff data */}
                        {(novelData.active?.translator?.length > 0 ||
                            novelData.active?.editor?.length > 0 ||
                            novelData.active?.proofreader?.length > 0 ||
                            novelData.inactive?.translator?.length > 0 ||
                            novelData.inactive?.editor?.length > 0 ||
                            novelData.inactive?.proofreader?.length > 0) && (
                            <div className="rd-section">
                                <h3 className="rd-section-title">NHÂN SỰ</h3>
                                <div className="rd-section-content">
                                    {/* Active Staff */}
                                    <div className="rd-staff-category rd-active-category">Đang hoạt động</div>

                                    {/* Translators */}
                                    <div className="rd-staff-role rd-role-translator">
                  <span className="rd-role-badge rd-translator-badge">
                    <FontAwesomeIcon icon={faLanguage} style={{marginRight: '4px'}}/> Dịch giả:
                  </span>
                                    </div>
                                    <div className="rd-staff-members">
                                        {novelData.active?.translator && novelData.active.translator.length > 0 ? (
                                            novelData.active.translator.map((translator, index) => 
                                                renderStaffName(translator, index, true)
                                            )
                                        ) : (
                                            <span className="rd-staff-empty">Không có</span>
                                        )}
                                    </div>

                                    {/* Editors */}
                                    <div className="rd-staff-role rd-role-editor">
                  <span className="rd-role-badge rd-editor-badge">
                    <FontAwesomeIcon icon={faEdit} style={{marginRight: '4px'}}/> Biên tập:
                  </span>
                                    </div>
                                    <div className="rd-staff-members">
                                        {novelData.active?.editor && novelData.active.editor.length > 0 ? (
                                            novelData.active.editor.map((editor, index) => 
                                                renderStaffName(editor, index, true)
                                            )
                                        ) : (
                                            <span className="rd-staff-empty">Không có</span>
                                        )}
                                    </div>

                                    {/* Proofreaders */}
                                    <div className="rd-staff-role rd-role-qc">
                  <span className="rd-role-badge rd-qc-badge">
                                          <FontAwesomeIcon icon={faCheckDouble} style={{marginRight: '4px'}}/> Hiệu đính:
                  </span>
                                    </div>
                                    <div className="rd-staff-members">
                                        {novelData.active?.proofreader && novelData.active.proofreader.length > 0 ? (
                                            novelData.active.proofreader.map((proofreader, index) => 
                                                renderStaffName(proofreader, index, true)
                                            )
                                        ) : (
                                            <span className="rd-staff-empty">Không có</span>
                                        )}
                                    </div>

                                    {/* Inactive Staff */}
                                    {(novelData.inactive?.translator?.length > 0 ||
                                        novelData.inactive?.editor?.length > 0 ||
                                        novelData.inactive?.proofreader?.length > 0) && (
                                        <>
                                            <div className="rd-staff-category rd-inactive-category">Không hoạt động
                                            </div>

                                            {/* Inactive Translators */}
                                            {novelData.inactive?.translator && novelData.inactive.translator.length > 0 && (
                                                <>
                                                    <div className="rd-staff-role rd-role-translator">
                          <span className="rd-role-badge rd-translator-badge">
                            <FontAwesomeIcon icon={faLanguage} style={{marginRight: '4px'}}/> Dịch giả:
                          </span>
                                                    </div>
                                                    <div className="rd-staff-members">
                                                        {novelData.inactive.translator.map((translator, index) => 
                                                            renderStaffName(translator, index, false)
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {/* Inactive Editors */}
                                            {novelData.inactive?.editor && novelData.inactive.editor.length > 0 && (
                                                <>
                                                    <div className="rd-staff-role rd-role-editor">
                          <span className="rd-role-badge rd-editor-badge">
                            <FontAwesomeIcon icon={faEdit} style={{marginRight: '4px'}}/> Biên tập:
                          </span>
                                                    </div>
                                                    <div className="rd-staff-members">
                                                        {novelData.inactive.editor.map((editor, index) => 
                                                            renderStaffName(editor, index, false)
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {/* Inactive Proofreaders */}
                                            {novelData.inactive?.proofreader && novelData.inactive.proofreader.length > 0 && (
                                                <>
                                                    <div className="rd-staff-role rd-role-qc">
                          <span className="rd-role-badge rd-qc-badge">
                            <FontAwesomeIcon icon={faCheckDouble} style={{marginRight: '4px'}}/> Hiệu đính:
                          </span>
                                                    </div>
                                                    <div className="rd-staff-members">
                                                        {novelData.inactive.proofreader.map((proofreader, index) => 
                                                            renderStaffName(proofreader, index, false)
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Announcement Section */}
                        {novelData.note && (
                            <div className="rd-section">
                                <h3 className="rd-section-title">THÔNG BÁO</h3>
                                <div className="rd-section-content rd-announcement">
                                    <div dangerouslySetInnerHTML={{
                                        __html: isNoteExpanded
                                            ? processContent(novelData.note)
                                            : truncateHTML(processContent(novelData.note), 300)
                                    }}/>
                                    {novelData.note && (
                                        (() => {
                                            const div = document.createElement('div');
                                            div.innerHTML = processContent(novelData.note);
                                            const fullText = div.textContent || div.innerText || '';
                                            return fullText.length > 300 ? (
                                                <a href="#" className="rd-show-toggle" onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsNoteExpanded(!isNoteExpanded);
                                                }}>
                                                    {isNoteExpanded ? 'Hiển thị ít hơn' : 'Hiển thị thêm'}
                                                </a>
                                            ) : null;
                                        })()
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Contributions Section */}
                        {sidebar}
                    </div>
                </div>
            </div>

            {/* Module List Navigation Button */}
            {modulesData && modulesData.length > 0 && (
                <>
                    <button
                        className="module-list-nav-btn"
                        onClick={handleModuleNavToggle}
                        title="Danh sách tập"
                    >
                        <FontAwesomeIcon icon={faList}/>
                    </button>

                    {/* Module Navigation Sidebar */}
                    <div className={`module-nav-sidebar ${isModuleNavOpen ? 'open' : ''}`}>
                        <div className="module-nav-header">
                            <span>Danh sách tập</span>
                            <button
                                className="module-nav-close"
                                onClick={() => setIsModuleNavOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="module-nav-list">
                            {modulesData.map((module, index) => (
                                <div
                                    key={module._id}
                                    className="module-nav-item"
                                    onClick={() => scrollToModule(module._id)}
                                >
                                    <img
                                        src={module.illustration || novelData.illustration || cdnConfig.defaultImages.novel}
                                        alt={module.title}
                                        className="module-nav-cover"
                                        onError={(e) => {
                                            e.target.src = cdnConfig.defaultImages.novel;
                                        }}
                                    />
                                    <span className="module-nav-title">
                    {module.title || `Tập ${index + 1}`}
                  </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Overlay to close sidebar when clicking outside */}
                    {isModuleNavOpen && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                zIndex: 999
                            }}
                            onClick={() => setIsModuleNavOpen(false)}
                        />
                    )}
                </>
            )}

            {/* Rating Modal */}
            <RatingModal
                novelId={novelId}
                isOpen={isRatingModalOpen}
                onClose={() => setIsRatingModalOpen(false)}
                currentRating={safeUserInteraction.rating || 0}
                onRatingSuccess={handleRatingSuccess}
            />
        </>
    );
};

export default NovelInfo;