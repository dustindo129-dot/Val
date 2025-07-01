import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import '../styles/components/Chapter.css';
import config from '../config/config';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createUniqueSlug, generateChapterUrl, generateNovelUrl } from '../utils/slugUtils';
import { getValidToken, getAuthHeaders } from '../utils/auth';

// Import components
import ChapterHeader from './chapter/ChapterHeader';
import ChapterNavigation from './chapter/ChapterNavigation';
import ChapterContent from './chapter/ChapterContent';
import ChapterFooter from './chapter/ChapterFooter';
import ChapterToolbar from './chapter/ChapterToolbar';
import ChapterActions from './chapter/ChapterActions';
import ChapterSocialShare from './chapter/ChapterSocialShare';
import ChapterNavigationControls from './chapter/ChapterNavigationControls';
import ChapterCommentsSection from './chapter/ChapterCommentsSection';
import ChapterAccessGuard from './chapter/ChapterAccessGuard';
import { SettingsModal, ReportModal } from './chapter/ChapterModals';
import RentalExpirationModal from './chapter/RentalExpirationModal';
import ModuleRentalModal from './rental/ModuleRentalModal';
import ScrollToTop from './ScrollToTop';
import LoadingSpinner from './LoadingSpinner';

// Import utilities 
import {
  useReadingSettings, useReadingProgress, getSafeHtml,
  unescapeHtml, countWords, countWordsSync, formatDate
} from './chapter/ChapterUtils';

/**
 * ChapterSEO Component
 * 
 * Provides comprehensive SEO optimization for individual chapter pages including:
 * - Vietnamese keyword optimization with novel title
 * - Chapter-specific meta tags
 * - Structured data for chapters
 * - Breadcrumb schema
 */
const ChapterSEO = ({ novel, chapter }) => {
  if (!novel || !chapter) return null;

  // Generate SEO-optimized title for chapter
  const generateSEOTitle = () => {
    const chapterTitle = chapter?.title || 'Chapter';
    const novelTitle = novel?.title || 'Light Novel';
    return `${chapterTitle} - ${novelTitle} Vietsub | Đọc Light Novel Online | Valvrareteam`;
  };

  // Generate SEO description for chapter
  const generateSEODescription = () => {
    const chapterTitle = chapter?.title || 'Chapter';
    const novelTitle = novel?.title || 'Light Novel';
    let description = `Đọc ${chapterTitle} của ${novelTitle} vietsub miễn phí tại Valvrareteam. `;
    
    // Add chapter excerpt if available
    if (chapter?.content) {
      const plainText = chapter.content.replace(/<[^>]*>/g, '').trim();
      const excerpt = plainText.substring(0, 100).trim();
      if (excerpt) {
        description += `${excerpt}... `;
      }
    }
    
    description += `Light Novel ${novelTitle} tiếng Việt chất lượng cao, đọc ngay không bỏ lỡ!`;
    
    return description.substring(0, 160);
  };

  // Generate keywords for chapter
  const generateKeywords = () => {
    const chapterTitle = chapter?.title || 'Chapter';
    const novelTitle = novel?.title || 'Light Novel';
    const keywords = [
      chapterTitle,
      `${chapterTitle} vietsub`,
      novelTitle,
      `${novelTitle} vietsub`,
      `đọc ${novelTitle}`,
      `${novelTitle} ${chapterTitle}`,
      `${novelTitle} chapter ${chapter?.chapterNumber || ''}`,
      'Light Novel vietsub',
      'Light Novel tiếng Việt',
      'Đọc Light Novel online',
      'Valvrareteam'
    ];
    
    // Add novel genres
    if (novel?.genres) {
      keywords.push(...novel.genres);
    }
    
    return keywords.join(', ');
  };

  // Generate structured data for search engines
  const generateStructuredData = () => {
    const novelSlug = createUniqueSlug(novel.title, novel._id);
    const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
    
    return {
      "@context": "https://schema.org",
      "@type": "Chapter",
      "name": chapter.title,
      "isPartOf": {
        "@type": "Book",
        "name": novel.title,
        "author": {
          "@type": "Person",
          "name": novel.author || "Unknown"
        }
      },
      "description": generateSEODescription(),
      "inLanguage": "vi-VN",
      "url": `https://valvrareteam.net/truyen/${novelSlug}/chuong/${chapterSlug}`,
      "datePublished": chapter.createdAt,
      "dateModified": chapter.updatedAt,
              "publisher": {
        "@type": "Organization",
        "name": "Valvrareteam",
        "url": "https://valvrareteam.net"
      }
    };
  };

  // Generate breadcrumb structured data
  const generateBreadcrumbData = () => {
    const novelSlug = createUniqueSlug(novel.title, novel._id);
    const chapterSlug = createUniqueSlug(chapter.title, chapter._id);
    
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Trang chủ",
          "item": "https://valvrareteam.net"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": novel.title,
          "item": `https://valvrareteam.net/truyen/${novelSlug}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": chapter.title,
          "item": `https://valvrareteam.net/truyen/${novelSlug}/chuong/${chapterSlug}`
        }
      ]
    };
  };

  const novelSlug = createUniqueSlug(novel?.title, novel?._id);
  const chapterSlug = createUniqueSlug(chapter?.title, chapter?._id);

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
      <meta property="og:image" content={novel.illustration} />
      <meta property="og:url" content={`https://valvrareteam.net/truyen/${novelSlug}/chuong/${chapterSlug}`} />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Article-specific meta tags */}
      <meta property="article:author" content={novel.author || "Unknown"} />
      <meta property="article:published_time" content={chapter.createdAt} />
      <meta property="article:modified_time" content={chapter.updatedAt} />
      <meta property="article:section" content="Light Novel" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={generateSEOTitle()} />
      <meta name="twitter:description" content={generateSEODescription()} />
      <meta name="twitter:image" content={novel.illustration} />
      
      {/* Canonical URL - Always use the clean URL without query parameters */}
      <link rel="canonical" href={`https://valvrareteam.net/truyen/${novelSlug}/chuong/${chapterSlug}`} />
      
      {/* Chapter Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>
      
      {/* Breadcrumb Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateBreadcrumbData())}
      </script>
    </Helmet>
  );
};

const Chapter = ({ novelId, chapterId, error, preloadedChapter, preloadedNovel, preloadedNovelSlug, preloadedChapterSlug }) => {
  // Handle error state first
  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <h1>Oops! Có lỗi xảy ra</h1>
          <p>
            {error === 'Chapter not found' && 'Chương bạn tìm kiếm không tồn tại hoặc đã bị xóa.'}
            {error === 'Chapter unavailable' && 'Chương hiện tại không khả dụng, vui lòng thử lại sau.'}
            {error === 'Invalid chapter URL' && 'URL chương không hợp lệ.'}
            {error === 'Chapter data not available' && 'Nội dung chương hiện không khả dụng.'}
            {error === 'Server error' && 'Đã xảy ra lỗi server, vui lòng thử lại sau.'}
            {!['Chapter not found', 'Chapter unavailable', 'Invalid chapter URL', 'Chapter data not available', 'Server error'].includes(error) && 'Đã xảy ra lỗi không xác định.'}
          </p>
          <div className="error-actions">
            <button onClick={() => window.history.back()} className="btn-secondary">
              Quay lại
            </button>
            <a href="/" className="btn-primary">
              Trang chủ
            </a>
          </div>
        </div>
      </div>
    );
  }

  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const contentRef = useRef(null);
  const editorRef = useRef(null);

  // Get reading settings from custom hook
  const {
    fontSize, fontFamily, lineHeight,
    setFontFamily, setLineHeight, 
    increaseFontSize, decreaseFontSize
  } = useReadingSettings();

  // Get theme from unified theme context
  const { theme, applyTheme } = useTheme();

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState({ content: '', footnotes: [] });
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Staff editing state
  const [editedTranslator, setEditedTranslator] = useState('');
  const [editedEditor, setEditedEditor] = useState('');
  const [editedProofreader, setEditedProofreader] = useState('');

  const [showChapterList, setShowChapterList] = useState(false);
  const [showNavControls, setShowNavControls] = useState(false);

  // Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Rental expiration modal state
  const [showRentalExpirationModal, setShowRentalExpirationModal] = useState(false);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [lastRentalCheck, setLastRentalCheck] = useState(null);

  // Add notification states for chapter editing
  const [notification, setNotification] = useState({ type: '', message: '', show: false });

  // Interaction state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  // Report form state
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  // Use the reading progress hook
  const readingProgress = useReadingProgress(contentRef);

  // Add debouncing
  const [lastLikeTime, setLastLikeTime] = useState(0);
  const LIKE_COOLDOWN = 500; // 500ms cooldown between likes

  // Reset navigation state and edited content when chapter changes
  useEffect(() => {
    setIsNavigating(false);
    // Reset edited content when chapter changes
    setEditedContent({ content: '', footnotes: [] });
    setEditedTitle('');
    setEditedTranslator('');
    setEditedEditor('');
    setEditedProofreader('');
    // Scroll to top when chapter changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterId]);

  // Reset edited content when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setEditedContent({ content: '', footnotes: [] });
      setEditedTitle('');
      setEditedTranslator('');
      setEditedEditor('');
      setEditedProofreader('');
    }
  }, [isEditing]);

  // Query for novel data
  const { data: novelData } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: async () => {
      const novelRes = await axios.get(`${config.backendUrl}/api/novels/${novelId}`);
      return novelRes.data;
    },
    staleTime: 1000 * 60 * 10, // Changed from 5 to 10 minutes to avoid conflicts with token refresh
    enabled: !!novelId
  });

  // Query for chapter data
  const { data: chapterData, error: chapterError, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}/full`, {
        headers: user ? {Authorization: `Bearer ${localStorage.getItem('token')}`} : {}
      });

      return chapterRes.data;
    },
    staleTime: 1000 * 60 * 10, // Changed from 5 to 10 minutes to avoid conflicts with token refresh
    enabled: !!chapterId,
    retry: (failureCount, error) => {
      // Don't retry on auth errors to prevent logout loops
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Fetch user interaction data (likes, bookmarks)
  const { data: userInteraction } = useQuery({
    queryKey: ['user-chapter-interaction', chapterId, user?.id],
    queryFn: async () => {
      try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
          return { liked: false, bookmarked: false };
        }
        
        const response = await axios.get(
          `${config.backendUrl}/api/userchapterinteractions/user/${chapterId}`,
          { headers }
        );
        return response.data;
      } catch (error) {
        console.error('Error fetching user chapter interaction:', error);
        return { liked: false, bookmarked: false };
      }
    },
    enabled: !!chapterId && !!user,
    staleTime: 1000 * 60 * 10, // Changed from 5 to 10 minutes to avoid conflicts with token refresh
    retry: (failureCount, error) => {
      // Don't retry on auth errors, just return default values
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    onSuccess: (data) => {
      if (data) {
        setIsLiked(data.liked || false);
        setIsBookmarked(data.bookmarked || false);
      }
    }
  });

  // Check if we should count a view
  const viewKeyLocal = `chapter_${chapterId}_last_viewed`;
  const lastViewed = localStorage.getItem(viewKeyLocal);
  const now = Date.now();
  const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  const shouldCountView = !lastViewed || (now - parseInt(lastViewed, 10)) > fourHours;

  // Check if we should record recently read (less restrictive than view counting)
  const recentReadKeyLocal = `recent_read_${chapterId}_last_recorded`;
  const lastRecorded = localStorage.getItem(recentReadKeyLocal);
  const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
  const shouldRecordRecentRead = !lastRecorded || (now - parseInt(lastRecorded, 10)) > twoMinutes;

  // Separate query for view count with fire-and-forget approach
  useQuery({
    queryKey: ['chapter-view', chapterId],
    queryFn: async () => {
      try {
        // Create a controller to manually abort the request if needed
        const controller = new AbortController();
        
        // Give the server more time to process the request - 5 seconds
        setTimeout(() => {
          controller.abort();
        }, 5000); // Abort after 5 seconds instead 
        
        // Update localStorage immediately to prevent repeated attempts
        localStorage.setItem(viewKeyLocal, now.toString());
        
        // Make the view count request
        try {
          const headers = user ? getAuthHeaders() : {};
          
          const viewResponse = await axios.post(
            `${config.backendUrl}/api/userchapterinteractions/view/${chapterId}`, 
            {}, 
            {
              headers,
              signal: controller.signal
            }
          );
          
          // If we got a response, update the view count in the UI
          if (viewResponse?.data?.views) {
            // Update directly in state for immediate UI update
            setViewCount(viewResponse.data.views);
            
            // Also update the cached data
            queryClient.setQueryData(['chapter', chapterId], oldData => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                chapter: {
                  ...oldData.chapter,
                  views: viewResponse.data.views
                }
              };
            });
          }
        } catch (viewErr) {
          // Don't log abort errors as they're expected
          if (viewErr.name !== 'CanceledError' && viewErr.name !== 'AbortError') {
            console.error('Lỗi ghi nhận lượt xem:', viewErr);
          }
        }
        
        // Return something to satisfy React Query
        return { success: true };
      } catch (err) {
        // This should never be reached with our approach, but include it for safety
        console.error('Lỗi thiết lập ghi nhận lượt xem:', err);
        return { success: false };
      }
    },
    enabled: !!chapterId && !!chapterData && shouldCountView,
    retry: false,
    staleTime: fourHours,
    // Prevent refetching on focus/reconnect
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Avoid caching errors to allow retry on next visit
    cacheTime: 0 
  });

  // Track recently read chapters for logged-in users
  const recentlyReadQuery = useQuery({
    queryKey: ['recently-read-track', chapterId, user?.id],
    queryFn: async () => {
      try {
        if (!user) return { success: false };
        
        // Update localStorage immediately to prevent repeated attempts
        localStorage.setItem(recentReadKeyLocal, Date.now().toString());
        
        // Make the recently read tracking request
        try {
          const headers = getAuthHeaders();
          if (!headers.Authorization) {
            return { success: false };
          }
          
          const trackingResponse = await axios.post(
            `${config.backendUrl}/api/userchapterinteractions/recently-read`,
            { 
              chapterId,
              novelId,
              moduleId: chapter?.moduleId
            },
            { headers }
          );
          
          // Invalidate recently read cache to show updated data
          queryClient.invalidateQueries(['recentlyRead', user?.id]);
          
        } catch (recentReadErr) {
          console.error('❌ Recently read tracking failed:', recentReadErr);
          console.error('❌ Failed data:', {
            chapterId,
            novelId,
            moduleId: chapter?.moduleId
          });
        }
        
        return { success: true };
      } catch (err) {
        console.error('Lỗi thiết lập ghi nhận lịch sử đọc:', err);
        return { success: false };
      }
    },
    enabled: !!chapterId && !!chapterData && !!user && shouldRecordRecentRead,
    retry: false,
    staleTime: twoMinutes,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    cacheTime: 0 
  });

  // Extract chapter and novel data
  const chapter = chapterData?.chapter;
  const novel = chapter?.novel || novelData?.novel || {title: "Novel"};
  // Extract interaction data from the consolidated endpoint
  const interactions = chapterData?.interactions || {
    totalLikes: 0,
    userInteraction: {
      liked: false,
      bookmarked: false
    }
  };

  // Initialize staff state when entering edit mode (after chapterData is available)
  useEffect(() => {
    if (isEditing && chapter) {
      setEditedTranslator(chapter.translator || '');
      setEditedEditor(chapter.editor || '');
      setEditedProofreader(chapter.proofreader || '');
    }
  }, [isEditing, chapter]);

  // Query for module data when we have a moduleId
  const { data: moduleData } = useQuery({
    queryKey: ['module', chapter?.moduleId],
    queryFn: async () => {
      if (!chapter?.moduleId) return null;
      const res = await axios.get(`${config.backendUrl}/api/modules/${novelId}/modules/${chapter.moduleId}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 10, // Changed from 5 to 10 minutes to avoid conflicts with token refresh
    enabled: !!chapter?.moduleId
  });

  // Check if user can access paid content (admin/moderator/pj_user)
  const canAccessPaidContent = user && (
    user.role === 'admin' || 
    user.role === 'moderator' ||
    (user.role === 'pj_user' && novel && (
      novel.active?.pj_user?.includes(user.id) || 
      novel.active?.pj_user?.includes(user.username)
    ))
  );

  // Check if this is paid content that might need rental monitoring
  const isPaidContent = (chapter?.mode === 'paid' && chapter?.chapterBalance > 0) || 
                       (moduleData?.mode === 'paid' && moduleData?.moduleBalance > 0);

  // Real-time rental status monitoring for paid content
  const { data: rentalStatus } = useQuery({
    queryKey: ['module-rental-status', chapter?.moduleId, user?.id],
    queryFn: async () => {
      if (!user || !chapter?.moduleId || !isPaidContent || canAccessPaidContent) {
        return { hasActiveRental: false };
      }
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${config.backendUrl}/api/modules/${chapter.moduleId}/rental-status`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error checking rental status:', error);
        return { hasActiveRental: false };
      }
    },
    enabled: !!user && !!chapter?.moduleId && isPaidContent && !canAccessPaidContent,
    refetchInterval: 30000, // Check every 30 seconds while reading
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Check when user comes back to tab
    refetchIntervalInBackground: true, // Continue checking in background
  });

  // Monitor rental expiration while reading
  useEffect(() => {
    if (!rentalStatus || !user || canAccessPaidContent) return;

    // Check if rental just expired
    const currentTime = Date.now();
    const hadRentalBefore = lastRentalCheck?.hasActiveRental;
    const hasRentalNow = rentalStatus.hasActiveRental;

    if (hadRentalBefore && !hasRentalNow) {
      // Rental expired while user was reading
      setShowRentalExpirationModal(true);
    }

    // Update last check status
    setLastRentalCheck({
      hasActiveRental: hasRentalNow,
      timestamp: currentTime
    });
  }, [rentalStatus, lastRentalCheck, user, canAccessPaidContent]);

  // Query for all chapters in the current module
  const { data: moduleChaptersData, isLoading: isModuleChaptersLoading } = useQuery({
    queryKey: ['module-chapters', chapter?.moduleId],
    queryFn: async () => {
      if (!chapter?.moduleId) return { chapters: [] };
      const res = await axios.get(`${config.backendUrl}/api/chapters/module/${chapter.moduleId}`);
      return { chapters: res.data }; // Wrap the response data in a chapters property to match our expected format
    },
    staleTime: 1000 * 60 * 10, // Changed from 5 to 10 minutes to avoid conflicts with token refresh
    enabled: !!chapter?.moduleId && showChapterList, // Only fetch when dropdown is open
  });

  // Create a sorted chapter list from the module chapters or fallback to prev/next
  const getModuleChapterList = () => {
    // If we have module chapters data, use it
    if (moduleChaptersData?.chapters && moduleChaptersData.chapters.length > 0) {
      return moduleChaptersData.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    // Fallback to using current, prev, and next chapters
    if (!chapter) return [];
    
    const list = [];
    
    // Add current chapter
    list.push({
      _id: chapterId,
      title: chapter.title,
      order: chapter.order || 0
    });
    
    // Add previous chapter if available
    if (chapter.prevChapter && chapter.prevChapter._id) {
      list.push({
        _id: chapter.prevChapter._id,
        title: chapter.prevChapter.title,
        order: chapter.prevChapter.order || 0
      });
    }
    
    // Add next chapter if available
    if (chapter.nextChapter && chapter.nextChapter._id) {
      list.push({
        _id: chapter.nextChapter._id,
        title: chapter.nextChapter.title,
        order: chapter.nextChapter.order || 0
      });
    }
    
    // Sort by order
    return list.sort((a, b) => a.order - b.order);
  };
  
  // Use the module chapter list for the dropdown
  const moduleChapters = getModuleChapterList();

  // Query for comments
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['comments', `${novelId}-${chapterId}`],
    queryFn: async () => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        return [];
      }
      
      const res = await axios.get(`${config.backendUrl}/api/comments`, {
        params: {
          contentType: 'chapters',
          contentId: `${novelId}-${chapterId}`,
          includeDeleted: false
        },
        headers: {
          'Authorization': `Bearer ${getValidToken()}`
        }
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 15, // Changed to 15 minutes for comments as they're less critical
    enabled: !!chapterId,
    onError: () => {
      // Handle missing endpoint gracefully
      return [];
    }
  });

  // Effect to update interaction stats and ensure state consistency
  useEffect(() => {
    if (userInteraction) {
      // Set interaction states directly from the user interaction data
      setIsLiked(userInteraction.liked || false);
      setIsBookmarked(userInteraction.bookmarked || false);
    }
  }, [userInteraction]);

  // Effect to update interaction stats from chapter data
  useEffect(() => {
    if (interactions) {
      setLikeCount(interactions.totalLikes || 0);
      setViewCount(chapter?.views || 0);
    } else {
      // Default to 0 if no interaction data is available
      setLikeCount(0);
      setViewCount(chapter?.views || 0);
    }
  }, [interactions, chapter]);

  // Effect to calculate word count - prefer stored TinyMCE word count, fallback to calculation
  useEffect(() => {
    if (!chapter || !chapter.content) return;

    // If we're in edit mode and have an editor, use TinyMCE's live word count
    if (isEditing && editorRef.current && editorRef.current.plugins && editorRef.current.plugins.wordcount) {
      const count = editorRef.current.plugins.wordcount.getCount();
      setWordCount(count);
      return;
    }

    // Use stored TinyMCE word count if available (preferred)
    if (typeof chapter.wordCount === 'number' && chapter.wordCount > 0) {
      setWordCount(chapter.wordCount);
      return;
    }

    // Fallback: Calculate word count using TinyMCE directly
    const wordCountResult = countWords(chapter.content);
    
    if (typeof wordCountResult === 'number') {
      // Synchronous result (fallback algorithm)
      setWordCount(wordCountResult);
    } else if (wordCountResult && typeof wordCountResult.then === 'function') {
      // Asynchronous result (TinyMCE direct method)
      wordCountResult
        .then(count => setWordCount(count))
        .catch(error => {
          console.error('Error getting TinyMCE word count:', error);
          // Final fallback to sync algorithm
          setWordCount(countWordsSync(chapter.content));
        });
    }
  }, [chapter, isEditing]);

  // Function to update word count from TinyMCE editor
  const updateWordCountFromEditor = useCallback((count) => {
    setWordCount(count);
  }, []);

  // Memoize stable props to prevent unnecessary re-renders
  const stableUserRole = useMemo(() => user?.role || 'user', [user?.role]);
  const stableNovelData = useMemo(() => novelData?.novel || novelData, [novelData]);

  // Effect to handle edit mode initialization
  useEffect(() => {
    if (isEditing && chapter) {
      setEditedTitle(chapter.title || '');
      setEditedContent({
        content: unescapeHtml(chapter.content || ''),
        footnotes: chapter.footnotes || []
      });
      
      // Add a slight delay to ensure the editor is mounted before attempting to set content
      const timer = setTimeout(() => {
        if (editorRef.current && editorRef.current.setContent) {
          // With pure uncontrolled mode, we don't need to set content from React
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isEditing, chapter]);

  // Reset edited content when exiting edit mode
  useEffect(() => {
    if (!isEditing && editorRef.current) {
      // Clear editor content when exiting edit mode
      setEditedContent({ content: '', footnotes: [] });
      setEditedTitle('');
      
      // Attempt to reset the editor directly when available
      if (editorRef.current.setContent) {
        editorRef.current.setContent('');
      }
    }
  }, [isEditing]);

  // Effect for keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only use keyboard navigation if not in edit mode or modal
      if (isEditing || showSettingsModal || showReportModal) {
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
  }, [chapter, isNavigating, isEditing, showSettingsModal, showReportModal]);

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
   * Handles navigation to previous chapter
   */
  const handlePrevChapter = async () => {
    if (chapter?.prevChapter && chapter.prevChapter._id) {
      setIsNavigating(true);
      try {
        // Prefetch previous chapter data if query client available
        await queryClient.prefetchQuery({
          queryKey: ['chapter', chapter.prevChapter._id],
          queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/chapters/${chapter.prevChapter._id}`);
            return response.data;
          }
        });
        navigate(generateChapterUrl(
          { _id: novelId, title: novel.title },
          chapter.prevChapter
        ));
        // Scroll after navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('Lỗi điều hướng đến chương trước:', error);
        setError('Không thể điều hướng đến chương trước.');
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
      try {
        // Prefetch next chapter data if query client available
        await queryClient.prefetchQuery({
          queryKey: ['chapter', chapter.nextChapter._id],
          queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/chapters/${chapter.nextChapter._id}`);
            return response.data;
          }
        });
        navigate(generateChapterUrl(
          { _id: novelId, title: novel.title },
          chapter.nextChapter
        ));
        // Scroll after navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('Lỗi điều hướng đến chương tiếp theo:', error);
        setError('Không thể điều hướng đến chương tiếp theo.');
        setIsNavigating(false);
      }
    }
  };

  /**
   * Handles deletion of a chapter (admin function)
   */
  const handleDeleteChapter = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chương này không?')) {
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
      navigate(generateNovelUrl({ _id: novelId, title: novel.title }), {replace: true});
    } catch (err) {
      console.error('Không thể xóa chương:', err);
      setError('Không thể xóa chương. Vui lòng thử lại.');
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
      
      // Get the current word count from TinyMCE editor
      let currentWordCount = 0;
      if (editorRef.current && editorRef.current.plugins && editorRef.current.plugins.wordcount) {
        currentWordCount = editorRef.current.plugins.wordcount.getCount();
      }
      
      // Find the hidden input that contains the editedMode value
      const modeInputs = document.querySelectorAll('input[type="hidden"]');
      let updatedMode = chapter.mode;
      let updatedChapterBalance = 0;
      
      // Look through any hidden inputs for one with a getMode function
      for (const input of modeInputs) {
        if (typeof input.getMode === 'function') {
          updatedMode = input.getMode();
          
          // Also get chapterBalance if available
          if (typeof input.getChapterBalance === 'function') {
            updatedChapterBalance = input.getChapterBalance();
          }
          break;
        }
      }
      
      // Validate minimum chapter balance for paid chapters
      if (updatedMode === 'paid' && updatedChapterBalance < 1) {
        setNotification({ 
          type: 'error', 
          message: 'Số lúa chương tối thiểu là 1 🌾 cho chương trả phí.', 
          show: true 
        });
        setIsSaving(false);
        return;
      }

      // Extract footnotes from editedContent
      let footnotes = [];
      if (editedContent && editedContent.footnotes) {
        footnotes = editedContent.footnotes;
      } else if (chapter.footnotes) {
        footnotes = chapter.footnotes;
      }
      
      const updateData = {
        title: updatedTitle,
        content: updatedContent,
        mode: updatedMode,
        footnotes: footnotes,
        chapterBalance: updatedMode === 'paid' ? updatedChapterBalance : 0,
        wordCount: currentWordCount, // Add TinyMCE word count to the update data
        translator: editedTranslator,
        editor: editedEditor,
        proofreader: editedProofreader
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
          mode: updatedMode,
          footnotes: footnotes,
          chapterBalance: updatedMode === 'paid' ? updatedChapterBalance : 0,
          wordCount: currentWordCount, // Update local cache with TinyMCE word count
          translator: editedTranslator,
          editor: editedEditor,
          proofreader: editedProofreader
          // Don't update updatedAt in optimistic update to prevent auto-save clearing
        }
      });

      // Make API call to update chapter
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        setShowLoginModal(true);
        return;
      }
      
      const {data} = await axios.put(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        updateData,
        {
          headers: {
            ...headers,
            'Content-Type': 'application/json' // Ensure proper content type
          }
        }
      );

      // Clear auto-save on successful save
      if (window[`clearAutoSave_${chapterId}`]) {
        window[`clearAutoSave_${chapterId}`]();
      }

      // Exit edit mode
      setIsEditing(false);

      // Show success notification
      setNotification({ 
        type: 'success', 
        message: 'Chương đã được cập nhật thành công!', 
        show: true 
      });

      // Update with server data for consistency
      queryClient.setQueryData(['chapter', chapterId], {
        ...previousChapterData,
        chapter: {
          ...previousChapterData.chapter,
          ...data
        }
      });

    } catch (err) {
      console.error('Không thể cập nhật chương:', err);
      
      // Show error notification instead of full-screen error
      setNotification({ 
        type: 'error', 
        message: err.response?.data?.message || 'Không thể cập nhật chương. Vui lòng thử lại.', 
        show: true 
      });

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
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        setShowLoginModal(true);
        return;
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/like`,
        { chapterId },
        {
          headers: {
            'Authorization': `Bearer ${getValidToken()}`
          }
        }
      );

      // Update the user interaction cache as well
      queryClient.setQueryData(['user-chapter-interaction', chapterId, user?.id], old => ({
        ...(old || {}),
        liked: response.data.liked
      }));

      // Update the local cache with the new like status
      queryClient.setQueryData(['chapter', chapterId], oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          interactions: {
            ...oldData.interactions,
            totalLikes: response.data.totalLikes,
            userInteraction: {
              ...oldData.interactions.userInteraction,
              liked: response.data.liked
            }
          }
        };
      });
    } catch (err) {
      console.error('Failed to like/unlike chapter:', err);
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikeCount(likeCount);
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['chapter', chapterId]);
      queryClient.invalidateQueries(['user-chapter-interaction', chapterId, user?.id]);
    }
  };

  /**
   * Handles bookmarking/unbookmarking a chapter
   */
  const handleBookmark = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        setShowLoginModal(true);
        return;
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/bookmark`,
        { chapterId },
        {
          headers: {
            'Authorization': `Bearer ${getValidToken()}`
          }
        }
      );

      // Update the local cache with the new bookmark status
      queryClient.setQueryData(['chapter', chapterId], oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          interactions: {
            ...oldData.interactions,
            userInteraction: {
              ...oldData.interactions.userInteraction,
              bookmarked: response.data.bookmarked
            }
          }
        };
      });
      
      // Update user interaction cache as well
      queryClient.setQueryData(['user-chapter-interaction', chapterId, user?.id], old => ({
        ...(old || {}),
        bookmarked: response.data.bookmarked
      }));
      
      // Also invalidate the bookmarked chapter query
      queryClient.invalidateQueries({
        queryKey: ['bookmarked-chapter', novelId, user?.id]
      });
      
      // Invalidate user interaction query
      queryClient.invalidateQueries(['user-chapter-interaction', chapterId, user?.id]);
    } catch (err) {
      console.error('Không thể đánh dấu/bỏ đánh dấu chương:', err);
      // Revert optimistic update on error
      setIsBookmarked(previousBookmarked);
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['chapter', chapterId]);
      queryClient.invalidateQueries(['user-chapter-interaction', chapterId, user?.id]);
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

  /**
   * Handles opening the rental modal for renting a module
   */
  const handleOpenRentalModal = useCallback(() => {
    if (!user) {
      alert('Vui lòng đăng nhập để thuê tập');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }
    setShowRentalModal(true);
  }, [user]);

  /**
   * Handles closing the rental modal
   */
  const handleCloseRentalModal = useCallback(() => {
    setShowRentalModal(false);
  }, []);

  /**
   * Handles successful rental - refresh chapter data and close modals
   */
  const handleRentalSuccess = useCallback((data) => {
    // Refresh chapter data and user balance after successful rental
    queryClient.invalidateQueries(['chapter']);
    queryClient.invalidateQueries(['user']);
    queryClient.invalidateQueries(['novel']);
    queryClient.invalidateQueries(['user-chapter-interaction']);
    queryClient.invalidateQueries(['module-rental-status']);
    
    // Close both modals
    setShowRentalModal(false);
    setShowRentalExpirationModal(false);
  }, [queryClient]);

  /**
   * Handles closing the rental expiration modal
   */
  const handleCloseRentalExpirationModal = useCallback(() => {
    setShowRentalExpirationModal(false);
  }, []);

  // Check if user can edit
  const canEdit = useMemo(() => user && (
    user.role === 'admin' || 
    user.role === 'moderator' || 
    (user?.role === 'pj_user' && (
      novel?.active?.pj_user?.includes(user.id) || 
      novel?.active?.pj_user?.includes(user.username)
    ))
  ), [user, novel?.active?.pj_user]);
  
  // Check if user can delete
  const canDelete = useMemo(() => user && (user.role === 'admin' || user.role === 'moderator'), [user]);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ type: '', message: '', show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // Show loading state with animation
  if (isLoading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" text="Đang tải chương..." />
      </div>
    );
  }

  // Show error state only for loading/data errors, not for edit operation errors
  if (chapterError) {
    return <div className="error">{chapterError.message}</div>;
  }

  // Show not found state
  if (!chapter || !novel) {
    return <div className="error">Không tìm thấy chương</div>;
  }

  return (
    <div className="chapter-container">
      {/* SEO optimization for this chapter */}
      <ChapterSEO novel={novel} chapter={chapter} />
      
      {/* Notification for chapter editing operations */}
      {notification.show && (
        <div className={`chapter-notification ${notification.type === 'error' ? 'error-notification' : 'success-notification'}`}>
          <span>{notification.message}</span>
          <button 
            className="notification-close-btn"
            onClick={() => setNotification({ type: '', message: '', show: false })}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Chapter header */}
      <ChapterHeader
        novel={novel}
        novelId={novelId}
        chapter={chapter}
        moduleData={moduleData}
        isEditing={isEditing}
        editedTitle={editedTitle}
        setEditedTitle={setEditedTitle}
        handleEditChapter={handleEditChapter}
        handleDeleteChapter={handleDeleteChapter}
        isSaving={isSaving}
        setIsEditing={setIsEditing}
        formatDate={formatDate}
        decreaseFontSize={decreaseFontSize}
        increaseFontSize={increaseFontSize}
        setShowSettingsModal={setShowSettingsModal}
        user={user}
        canEdit={canEdit}
        canDelete={canDelete}
        isBookmarked={isBookmarked}
        handleBookmark={handleBookmark}
      />

      {/* Navigation */}
      <ChapterNavigation
        chapter={chapter}
        isNavigating={isNavigating}
        isEditing={isEditing}
        handlePrevChapter={handlePrevChapter}
        handleNextChapter={handleNextChapter}
        user={user}
      />

      {/* Toolbar with staff info and chapter stats */}
      <ChapterToolbar
        chapter={chapter}
        viewCount={viewCount}
        wordCount={wordCount}
        formatDate={formatDate}
      />

      {/* Chapter Content with Access Guard */}
      <ChapterAccessGuard chapter={chapter} moduleData={moduleData} user={user} novel={novel}>
        <ChapterContent
          key={`chapter-content-${chapterId}`}
          chapter={chapter}
          isEditing={isEditing}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          editedTitle={editedTitle}
          setEditedTitle={setEditedTitle}
          fontSize={fontSize}
          fontFamily={fontFamily}
          lineHeight={lineHeight}
          editorRef={editorRef}
          getSafeHtml={getSafeHtml}
          canEdit={canEdit}
          userRole={stableUserRole}
          moduleData={moduleData}
          onWordCountUpdate={updateWordCountFromEditor}
          editedTranslator={editedTranslator}
          setEditedTranslator={setEditedTranslator}
          editedEditor={editedEditor}
          setEditedEditor={setEditedEditor}
          editedProofreader={editedProofreader}
          setEditedProofreader={setEditedProofreader}
          novelData={stableNovelData}
        />
      </ChapterAccessGuard>

      {/* Chapter Bottom Actions */}
      <div className="chapter-bottom-actions">
        {/* Social Share */}
        <ChapterSocialShare handleShare={handleShare} />

        {/* User Actions */}
        <ChapterActions
          isLiked={isLiked}
          likeCount={likeCount}
          handleLike={handleLike}
        />
      </div>

      {/* Bottom Navigation */}
      <ChapterNavigation
        chapter={chapter}
        isNavigating={isNavigating}
        isEditing={isEditing}
        handlePrevChapter={handlePrevChapter}
        handleNextChapter={handleNextChapter}
        position="bottom"
        user={user}
      />

      {/* Footer Navigation */}
      <ChapterFooter
        novelId={novelId}
        novel={novel}
        chapter={chapter}
        moduleData={moduleData}
        isBookmarked={isBookmarked}
        handleBookmark={handleBookmark}
        setShowReportModal={setShowReportModal}
      />

      {/* Issue Alert */}
      <div className="issue-alert">
        Vui lòng báo cáo bất kỳ vấn đề nào (thiếu hình ảnh, chương sai, ...) bằng nút báo cáo.
      </div>

      {/* Comments section */}
      <ChapterCommentsSection
        novelId={novelId}
        chapterId={chapterId}
        user={user}
        comments={comments}
        isCommentsLoading={isCommentsLoading}
        novel={novel}
      />

      {/* Add the ScrollToTop component */}
      <ScrollToTop threshold={300} />

      {/* Navigation Controls */}
      <ChapterNavigationControls
        novelId={novelId}
        novelTitle={novel?.title}
        chapter={chapter}
        chapterId={chapterId}
        showNavControls={showNavControls}
        setShowNavControls={setShowNavControls}
        showChapterList={showChapterList}
        setShowChapterList={setShowChapterList}
        setShowSettingsModal={setShowSettingsModal}
        handlePrevChapter={handlePrevChapter}
        handleNextChapter={handleNextChapter}
        isNavigating={isNavigating}
        isEditing={isEditing}
        moduleChapters={moduleChapters}
        isModuleChaptersLoading={isModuleChaptersLoading}
        user={user}
      />

      {/* Modals */}
      <SettingsModal
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        decreaseFontSize={decreaseFontSize}
        increaseFontSize={increaseFontSize}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        theme={theme}
        applyTheme={applyTheme}
      />

      <ReportModal
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        reportReason={reportReason}
        setReportReason={setReportReason}
        reportDetails={reportDetails}
        setReportDetails={setReportDetails}
        chapterId={chapterId}
        chapterTitle={chapter?.title}
        novelId={novelId}
      />

      {/* Rental Expiration Modal */}
      <RentalExpirationModal
        isOpen={showRentalExpirationModal}
        onClose={handleCloseRentalExpirationModal}
        onRentAgain={handleOpenRentalModal}
        module={moduleData}
        novel={novel}
        chapter={chapter}
      />

      {/* Module Rental Modal */}
      {showRentalModal && moduleData && (
        <ModuleRentalModal
          isOpen={showRentalModal}
          onClose={handleCloseRentalModal}
          module={moduleData}
          novel={novel}
          onRentalSuccess={handleRentalSuccess}
        />
      )}
    </div>
  );
};

export default Chapter; 