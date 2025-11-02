import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFullscreen } from '../context/FullscreenContext';
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
import LoadingSpinner from './LoadingSpinner';

// Import utilities 
import {
  useReadingSettings, useReadingProgress, getSafeHtml,
  unescapeHtml, countWords, countWordsSync, formatDate
} from './chapter/ChapterUtils';

// Import permission utilities
import { canEditChapter } from '../utils/novelPermissions';

// Facebook-style Like System Classes
class LikeQueue {
  constructor(sendToServer) {
    this.queue = new Map(); // chapterId -> { targetState, timestamp, retryCount }
    this.processing = new Set();
    this.sendToServer = sendToServer;
    this.deviceId = this.generateDeviceId();
  }

  generateDeviceId() {
    return localStorage.getItem('deviceId') || 
           (() => {
             const id = 'device_' + Math.random().toString(36).substr(2, 9);
             localStorage.setItem('deviceId', id);
             return id;
           })();
  }

  async addToQueue(chapterId, currentState, userId) {
    const timestamp = Date.now();
    const targetState = !currentState;
    
    // Store intended final state with metadata
    this.queue.set(chapterId, {
      targetState,
      timestamp,
      userId,
      deviceId: this.deviceId,
      retryCount: 0
    });

    // Process if not already processing
    if (!this.processing.has(chapterId)) {
      await this.processQueue(chapterId);
    }
  }

  async processQueue(chapterId) {
    this.processing.add(chapterId);

    try {
      while (this.queue.has(chapterId)) {
        const queueItem = this.queue.get(chapterId);
        this.queue.delete(chapterId);

        try {
          // Make API call
          await this.sendToServer(chapterId, queueItem);
        } catch (error) {
          // Handle retry logic
          if (queueItem.retryCount < 3 && this.isRetryableError(error)) {
            queueItem.retryCount++;
            this.queue.set(chapterId, queueItem);
            
            // Exponential backoff
            await this.delay(Math.pow(2, queueItem.retryCount) * 1000);
          } else {
            throw error; // Let error recovery handle it
          }
        }
      }
    } finally {
      this.processing.delete(chapterId);
    }
  }

  isRetryableError(error) {
    return error.code === 'NETWORK_ERROR' || 
           error.response?.status >= 500 ||
           error.code === 'TIMEOUT';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clear() {
    this.queue.clear();
    this.processing.clear();
  }
}

class LikeBatcher {
  constructor(flushCallback) {
    this.batch = new Map();
    this.timeout = null;
    this.flushCallback = flushCallback;
    this.batchSize = 10;
    this.batchDelay = 50; // 50ms
  }

  addToBatch(chapterId, data) {
    this.batch.set(chapterId, data);
    
    // Flush if batch is full
    if (this.batch.size >= this.batchSize) {
      this.flush();
      return;
    }

    // Set timeout if not already set
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.batchDelay);
    }
  }

  async flush() {
    if (this.batch.size === 0) return;

    const actions = Array.from(this.batch.entries());
    this.batch.clear();
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Send batch to callback
    await this.flushCallback(actions);
  }

  clear() {
    this.batch.clear();
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

class LikeRateLimiter {
  constructor() {
    this.actionCount = new Map();
    this.windowStart = new Map();
    this.maxActionsPerMinute = 10;
    this.windowDuration = 60000; // 1 minute
  }

  canLike(chapterId) {
    const now = Date.now();
    const windowStart = this.windowStart.get(chapterId) || 0;
    const count = this.actionCount.get(chapterId) || 0;

    // Reset window if needed
    if (now - windowStart > this.windowDuration) {
      this.actionCount.set(chapterId, 0);
      this.windowStart.set(chapterId, now);
      return true;
    }

    return count < this.maxActionsPerMinute;
  }

  recordAction(chapterId) {
    const count = this.actionCount.get(chapterId) || 0;
    this.actionCount.set(chapterId, count + 1);
  }

  clear() {
    this.actionCount.clear();
    this.windowStart.clear();
  }
}

class LikeErrorRecovery {
  constructor(updateCallback) {
    this.pendingActions = new Map();
    this.updateCallback = updateCallback;
    this.dbName = 'ChapterLikes';
    this.storeName = 'pendingLikes';
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'chapterId' });
        }
      };
    });
  }

  async storePendingAction(chapterId, action) {
    if (!this.db) await this.initDB();
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise((resolve, reject) => {
      const request = store.put({ chapterId, ...action, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.pendingActions.set(chapterId, action);
    this.updateCallback(chapterId, 'pending');
  }

  async removePendingAction(chapterId) {
    if (!this.db) await this.initDB();
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(chapterId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.pendingActions.delete(chapterId);
  }

  async retryPendingActions() {
    if (!this.db) await this.initDB();
    
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    const pendingActions = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const action of pendingActions) {
      try {
        // Retry the action
        await this.retryAction(action);
        await this.removePendingAction(action.chapterId);
      } catch (error) {
        console.error('Failed to retry action:', error);
      }
    }
  }

  async retryAction(action) {
    // This will be implemented by the component
    throw new Error('retryAction must be implemented');
  }
}

class LikeConflictResolver {
  constructor() {
    this.lastActionTimestamp = new Map();
  }

  recordAction(chapterId, timestamp) {
    this.lastActionTimestamp.set(chapterId, timestamp);
  }

  shouldAcceptUpdate(chapterId, serverTimestamp) {
    const lastAction = this.lastActionTimestamp.get(chapterId);
    
    // Accept if we haven't acted on this chapter or server is newer
    return !lastAction || serverTimestamp > lastAction;
  }

  clear() {
    this.lastActionTimestamp.clear();
  }
}

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
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL RETURNS
  const navigate = useNavigate();
  // Add null check to prevent destructuring errors during hot reloads
  const authResult = useAuth();
  const { user, loading: authLoading } = authResult || { 
    user: null, 
    loading: false 
  };
  const queryClient = useQueryClient();
  const contentRef = useRef(null);
  const editorRef = useRef(null);

  // Get reading settings from custom hook
  const {
    fontSize, fontFamily, lineHeight, marginSpacing,
    setFontFamily, setLineHeight, setMarginSpacing,
    increaseFontSize, decreaseFontSize
  } = useReadingSettings();


  // Get theme from unified theme context
  const { theme, applyTheme } = useTheme();
  
  // Get fullscreen context
  const { isFullscreen, toggleFullscreen } = useFullscreen();

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
  
  // Button visibility state for chapter page - buttons hidden by default, show on user interaction
  const [buttonsVisible, setButtonsVisible] = useState(false);
  

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
  const [likeState, setLikeState] = useState({ isLiked: false, count: 0, status: 'idle' }); // { isLiked, count, status }
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const likeSystemRef = useRef(null);

  // Report form state
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  // Use the reading progress hook
  const readingProgress = useReadingProgress(contentRef);

  // Long content state
  const [longContentProcessed, setLongContentProcessed] = useState(false);
  
  // Chapter view tracking state
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Memoize query options to prevent infinite re-renders
  const queryOptions = useMemo(() => ({
    queryKey: ['chapter-optimized', chapterId, user?._id], // Use user._id instead of user.id
    queryFn: async () => {
      const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}/full-optimized`, {
        // Rely on axios interceptors to attach/refresh tokens automatically
        timeout: 30000 // 30 seconds for very long chapters
      });

      return chapterRes.data;
    },
    staleTime: (data) => {
      // CRITICAL: Always refetch protected chapters after login/logout
      if (data?.chapter?.mode === 'protected') {
        return 0; // Always stale for protected content
      }
      // Shorter stale time for access-denied content to improve UX
      if (data?.chapter?.accessDenied) return 0; // Always refetch if access was denied
      
      // RACE CONDITION FIX: Always consider interaction data stale to prevent sync issues
      // This ensures we always get fresh data from the server, especially after likes
      return 0; // Always fetch fresh data to prevent race conditions
    },
    // RACE CONDITION FIX: Always refetch on mount to ensure fresh interaction data
    refetchOnMount: true, // Always refetch to prevent stale interaction data
    enabled: !!chapterId,
    retry: (failureCount, error) => {
      // Don't retry on auth errors to prevent logout loops
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Don't retry on timeout errors for very long content
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // OPTIMIZATION: Add performance settings for access control
    refetchOnWindowFocus: (query) => {
      // Always refetch protected or access-denied content on focus to check for auth changes
      const chapter = query.state.data?.chapter;
      const hasProtectedContent = !!(chapter && (chapter.mode === 'protected' || chapter.accessDenied));
      
      // RACE CONDITION FIX: Also refetch on focus if user is authenticated to catch any missed interaction updates
      // This helps sync like states if user refreshed quickly after liking in another tab/window
      const shouldRefetchForInteractions = !!user;
      
      return hasProtectedContent || shouldRefetchForInteractions;
    },
    gcTime: 1000 * 60 * 5 // Reduced cache time for better auth responsiveness
  }), [chapterId, user?._id]);

  // OPTIMIZED: Single query for all chapter data including user interactions
  const { data: chapterData, error: chapterError, isLoading, refetch } = useQuery(queryOptions);

  // Extract chapter and novel data early to avoid circular dependencies
  const chapter = chapterData?.chapter;
  const novel = chapter?.novel || {title: "Novel"};
  

  // Extract interaction data from the consolidated endpoint (memoized to prevent infinite loops)
  // Ensure interactions data is always available, even for non-authenticated users
  const interactions = useMemo(() => {
    // The backend response structure might be different - check multiple possible locations
    let totalLikes = 0;
    let userInteraction = { liked: false, bookmarked: false };

    // Try to get total likes from different possible locations
    if (chapterData?.interactions?.totalLikes !== undefined) {
      totalLikes = chapterData.interactions.totalLikes;
    } else if (chapterData?.chapter?.chapterStats?.totalLikes !== undefined) {
      totalLikes = chapterData.chapter.chapterStats.totalLikes;
    } else if (typeof chapterData?.chapter?.chapterStats === 'object' && chapterData.chapter.chapterStats !== null) {
      // MongoDB aggregation might return chapterStats differently
      totalLikes = chapterData.chapter.chapterStats.totalLikes || 0;
    }

    // Try to get user interaction from different possible locations
    if (chapterData?.interactions?.userInteraction) {
      userInteraction = chapterData.interactions.userInteraction;
    } else if (chapterData?.chapter?.userInteraction) {
      userInteraction = chapterData.chapter.userInteraction;
    }

    return {
      totalLikes: typeof totalLikes === 'number' ? totalLikes : 0,
      userInteraction: userInteraction || { liked: false, bookmarked: false }
    };
  }, [chapterData]);

  // User interaction data is now included in the main query, no separate fetch needed (memoized)
  const userInteraction = useMemo(() => {
    const result = interactions.userInteraction || { liked: false, bookmarked: false };
    return result;
  }, [interactions.userInteraction]);

  // Use module data already included in chapter response (no separate query needed!)
  const moduleData = chapter?.module || null;
  const moduleLoading = false; // No loading since it's included in main chapter query

  // Staff data is now included in the main chapter query via populateStaffNames
  // No separate query needed - this eliminates a duplicate database call

  // Helper function to check if user has pj_user access (handles both strings and objects)
  const checkPjUserAccess = useCallback((pjUserArray, user) => {
    if (!pjUserArray || !Array.isArray(pjUserArray) || !user) return false;
    
    return pjUserArray.some(pjUser => {
      // Handle case where pjUser is an object (new format)
      if (typeof pjUser === 'object' && pjUser !== null) {
        return (
          pjUser._id === user.id ||
          pjUser._id === user._id ||
          pjUser.username === user.username ||
          pjUser.displayName === user.displayName ||
          pjUser.userNumber === user.userNumber
        );
      }
      // Handle case where pjUser is a primitive value (old format)
      return (
        pjUser === user.id ||
        pjUser === user._id ||
        pjUser === user.username ||
        pjUser === user.displayName ||
        pjUser === user.userNumber
      );
    });
  }, []);

  // Check if user can access paid content (admin/moderator/pj_user)
  const canAccessPaidContent = user && (
    user.role === 'admin' || 
    user.role === 'moderator' ||
    (user.role === 'pj_user' && novel && checkPjUserAccess(novel.active?.pj_user, user))
  );



  // OPTIMIZATION: Early access control check to show guard immediately
  // Check if this looks like a paid module situation that will likely be denied
  const shouldShowEarlyAccessGuard = useMemo(() => {

    
    // If we already have chapter data with access denied, let normal flow handle it
    if (chapterData && chapter?.accessDenied) {
      return false;
    }
    
    // If user has privileged access, no need for guard
    if (canAccessPaidContent) {
      return false;
    }
    
    // If user has active rental from chapter data, no need for guard  
    if (chapter?.rentalInfo?.hasActiveRental) {
      return false;
    }
    
      // CRITICAL FIX: Don't show early guard if authentication is still loading
  // This prevents blocking authenticated users during the auth loading period
  if (authLoading) {
    return false;
  }
  
  // UX IMPROVEMENT: Be more lenient with early access guards for authenticated users
  // Let the backend handle the actual access control rather than preemptively blocking
  if (user && !isLoading) {
    // For authenticated users, don't show early guard
    // Let the backend handle the actual access control
    return false;
  }
    
    // CRITICAL FIX: Only show early guard for PAID content, not protected content
    // Protected chapters should only be blocked by the normal access guard flow
    if (isLoading && !user) {
      // Only show for paid content during loading, not protected content
      const moduleIsPaid = moduleData?.mode === 'paid';
      const chapterIsPaid = chapter?.mode === 'paid';
      
      const result = moduleIsPaid || chapterIsPaid; // Only show for paid content
      return result;
    }
    
    // For non-loading states, check if access is likely denied FOR PAID CONTENT ONLY
    if (chapterData && chapter) {
      const moduleIsPaid = moduleData?.mode === 'paid';
      const chapterIsPaid = chapter?.mode === 'paid';
      const userNotAuthenticated = !user;
      const userNotPrivileged = !canAccessPaidContent;
      
      // Only show for paid content, not protected content
      const shouldShow = (moduleIsPaid || chapterIsPaid) && (userNotAuthenticated || userNotPrivileged);
      
      return shouldShow;
    }
    
    const result = false;

    
    return result;
  }, [isLoading, chapterData, chapter, canAccessPaidContent, moduleData, user, authLoading]);

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

  // Module chapters are now included in the main query response - no separate fetch needed
  const moduleChaptersData = chapterData?.moduleChapters ? { chapters: chapterData.moduleChapters } : { chapters: [] };
  const isModuleChaptersLoading = false; // No separate loading since it's part of main query

  // OPTIMIZATION: Handle very long content more efficiently
  // Show loading for extremely large content to prevent UI blocking
  const isVeryLongContent = useMemo(() => {
    return chapter?.content && chapter.content.length > 500000; // 500KB+ content
  }, [chapter?.content]);

  // Function to update word count from TinyMCE editor
  const updateWordCountFromEditor = useCallback((count) => {
    setWordCount(count);
  }, []);

  // Memoize stable props to prevent unnecessary re-renders
  const stableUserRole = useMemo(() => user?.role || 'user', [user?.role]);
  const stableNovelData = useMemo(() => novel, [novel]);

  // Check if user can edit this specific chapter
  const canEdit = useMemo(() => {
    if (!user || !chapter) return false;
    
    // Use the new chapter-specific permission logic
    return canEditChapter(chapter, user);
  }, [user, chapter]);
  
  // Check if user can delete
  const canDelete = useMemo(() => user && (user.role === 'admin' || user.role === 'moderator'), [user]);

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

  // Helper function to normalize staff values for dropdown consistency
  const normalizeStaffValue = (staffValue) => {
    if (!staffValue) return '';
    
    // If it's an ObjectId (24 hex characters), reset to empty to avoid mismatch
    if (/^[0-9a-fA-F]{24}$/.test(staffValue)) {
      return ''; // Show "Không có" and let user re-select
    }
    
    // If it's a displayName, try to find matching userNumber/ID from novel's active staff
    if (chapterData?.novel) {
      const novelData = chapterData.novel;
      
      // Check translator
      const matchingTranslator = novelData.active?.translator?.find(staff => {
        if (typeof staff === 'object') {
          return staff.displayName === staffValue || 
                 staff.username === staffValue || 
                 staff.userNumber === staffValue ||
                 staff._id === staffValue;
        }
        return staff === staffValue;
      });
      if (matchingTranslator && typeof matchingTranslator === 'object') {
        return (matchingTranslator.userNumber || matchingTranslator._id).toString();
      }
      
      // Check editor
      const matchingEditor = novelData.active?.editor?.find(staff => {
        if (typeof staff === 'object') {
          return staff.displayName === staffValue || 
                 staff.username === staffValue || 
                 staff.userNumber === staffValue ||
                 staff._id === staffValue;
        }
        return staff === staffValue;
      });
      if (matchingEditor && typeof matchingEditor === 'object') {
        return (matchingEditor.userNumber || matchingEditor._id).toString();
      }
      
      // Check proofreader
      const matchingProofreader = novelData.active?.proofreader?.find(staff => {
        if (typeof staff === 'object') {
          return staff.displayName === staffValue || 
                 staff.username === staffValue || 
                 staff.userNumber === staffValue ||
                 staff._id === staffValue;
        }
        return staff === staffValue;
      });
      if (matchingProofreader && typeof matchingProofreader === 'object') {
        return (matchingProofreader.userNumber || matchingProofreader._id).toString();
      }
    }
    
    // If no match found or it's already an ID, return as is (could be userNumber)
    return staffValue.toString();
  };

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

  useEffect(() => {
    if (isVeryLongContent) {
      setLongContentProcessed(false);
      const timer = setTimeout(() => {
        setLongContentProcessed(true);
      }, 100); // Brief delay to prevent UI blocking
      
      return () => clearTimeout(timer);
    } else {
      setLongContentProcessed(true);
    }
  }, [isVeryLongContent]);

  // OPTIMIZATION: Force garbage collection for very long content
  // This helps prevent memory buildup when navigating between long chapters
  useEffect(() => {
    if (chapter?.content && chapter.content.length > 400000) {
      const timer = setTimeout(() => {
        if (window.gc) {
          window.gc();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [chapter?.content]);

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
  }, [rentalStatus, user, canAccessPaidContent]); // Removed lastRentalCheck from dependencies to prevent infinite loop

  // Initialize Facebook-style like system
  useEffect(() => {
    const likeSystem = {
      queue: new LikeQueue(async (chapterId, queueItem) => {
        return await sendLikeToServer(chapterId, queueItem);
      }),
      
      batcher: new LikeBatcher(async (actions) => {
        await processBatchedLikes(actions);
      }),
      
      rateLimiter: new LikeRateLimiter(),
      
      errorRecovery: new LikeErrorRecovery((chapterId, status) => {
        updateLikeState({ status });
      }),
      
      conflictResolver: new LikeConflictResolver()
    };

    // Implement retry action for error recovery
    likeSystem.errorRecovery.retryAction = async (action) => {
      await likeSystem.queue.addToQueue(action.chapterId, !action.targetState, action.userId);
    };

    likeSystemRef.current = likeSystem;

    // Setup online/offline handlers
    const handleOnline = () => {
      likeSystem.errorRecovery.retryPendingActions();
    };

    const handleOffline = () => {
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Retry pending actions on component mount
    if (navigator.onLine) {
      likeSystem.errorRecovery.retryPendingActions();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Cleanup
      likeSystem.queue.clear();
      likeSystem.batcher.clear();
      likeSystem.rateLimiter.clear();
      likeSystem.conflictResolver.clear();
    };
  }, []);

  // Update like state helper
  const updateLikeState = useCallback((updates) => {
    setLikeState(prev => ({ ...prev, ...updates }));
  }, []);

  // Send like to server
  const sendLikeToServer = async (chapterId, queueItem) => {

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/like`,
        {
          chapterId,
          timestamp: queueItem.timestamp,
          deviceId: queueItem.deviceId,
          targetLikedState: queueItem.targetState
        },
        {
          headers: {
            'Authorization': `Bearer ${getValidToken()}`
          },
          timeout: 10000 // 10 second timeout
        }
      );

      const data = response.data;

      // Update state with server response
      const serverState = {
        isLiked: data.liked,
        count: data.totalLikes,
        status: 'success',
        serverTimestamp: data.timestamp || Date.now()
      };
      
      updateLikeState(serverState);

      // Remove from error recovery if it was there
      await likeSystemRef.current.errorRecovery.removePendingAction(chapterId);

      // Update the local cache with the new like status
      queryClient.setQueryData(['chapter-optimized', chapterId, user?.id], oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          interactions: {
            ...oldData.interactions,
            totalLikes: data.totalLikes,
            userInteraction: {
              ...oldData.interactions.userInteraction,
              liked: data.liked
            }
          }
        };
      });

      // Invalidate cache to ensure fresh data on next fetch
      queryClient.invalidateQueries({
        queryKey: ['chapter-optimized', chapterId],
        exact: false
      });

      return data;
    } catch (error) {
      console.error('❌ Chapter Like Server: Request failed', {
        error: error.message,
        status: error.response?.status,
        code: error.code
      });

      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        error.code = 'TIMEOUT';
      } else if (!navigator.onLine) {
        error.code = 'NETWORK_ERROR';
      }

      // Store for retry if it's a recoverable error
      if (likeSystemRef.current.queue.isRetryableError(error)) {
        await likeSystemRef.current.errorRecovery.storePendingAction(chapterId, queueItem);
      } else {
        // Revert optimistic update for non-recoverable errors
        updateLikeState({
          isLiked: userInteraction?.liked || false,
          count: interactions.totalLikes || 0,
          status: 'error'
        });
      }

      throw error;
    }
  };

  // Process batched likes
  const processBatchedLikes = async (actions) => {
    // For now, process individually - could be optimized with a batch endpoint
    for (const [chapterId, queueItem] of actions) {
      try {
        await likeSystemRef.current.queue.addToQueue(chapterId, !queueItem.targetState, queueItem.userId);
      } catch (error) {
        console.error('Failed to process batched like:', error);
      }
    }
  };

  // Effect to update interaction stats and ensure state consistency
  useEffect(() => {
    if (userInteraction && chapterData) {
      
      // Set interaction states directly from the user interaction data
      updateLikeState({
        isLiked: userInteraction.liked || false,
        count: interactions.totalLikes || 0,
        status: 'idle'
      });
      setIsBookmarked(userInteraction.bookmarked || false);
    }
  }, [userInteraction, interactions.totalLikes, chapterData]); // Added chapterData to ensure we have server data

  // TIMEOUT RECOVERY: Auto-recover from stuck processing states
  useEffect(() => {
    if (likeState.status === 'loading' || likeState.status === 'pending') {
      
      const timeoutId = setTimeout(() => {
        // Force refresh to get latest state from server
        refetch();
        
        // Reset to idle state as fallback
        updateLikeState({
          status: 'idle'
        });
      }, 10000); // 10 second timeout
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [likeState.status, refetch]);

  // Enhanced recovery system for interrupted like states
  useEffect(() => {
    if (!user || !likeSystemRef.current) return;

    const performRecoveryCheck = async () => {
      try {
        const likeSystem = likeSystemRef.current;

          // Check for pending actions in IndexedDB
        if (likeSystem.errorRecovery && likeSystem.errorRecovery.pendingActions) {
          const hasPendingLike = likeSystem.errorRecovery.pendingActions.has(chapterId);
          
          if (hasPendingLike) {
            refetch();
            return;
          }
        }

        // Check if we're stuck in processing state
        if (likeState.status === 'loading' || likeState.status === 'pending') {
          refetch();
          return;
        }

        // Check for state mismatch between frontend and backend
        if (userInteraction && chapterData && likeState.status === 'idle') {
          const serverLiked = userInteraction.liked || false;
          const frontendLiked = likeState.isLiked;
          const serverCount = interactions.totalLikes || 0;
          const frontendCount = likeState.count;

          // Only sync if there's a significant mismatch
          const hasSignificantMismatch = (serverLiked !== frontendLiked && (serverLiked || frontendLiked)) || 
                                       Math.abs(serverCount - frontendCount) > 1;

          if (hasSignificantMismatch) {
            
            // Sync with server state
            updateLikeState({
              isLiked: serverLiked,
              count: serverCount,
              status: 'idle'
            });
            return;
          }
        }

        // Retry any pending actions from IndexedDB
        if (likeSystem.errorRecovery && typeof likeSystem.errorRecovery.retryPendingActions === 'function') {
          await likeSystem.errorRecovery.retryPendingActions();
        }

      } catch (error) {
        console.error('❌ Chapter Like Recovery: Error during recovery check:', error);
        // Refresh as fallback
        refetch();
      }
    };

    // Run recovery check after like system initializes
    const timer = setTimeout(performRecoveryCheck, 1000);
    return () => clearTimeout(timer);
  }, [user?._id, chapterId]);

  // Effect to update interaction stats from chapter data
  useEffect(() => {
    // Update view count from chapter data
    setViewCount(chapter?.views || 0);
  }, [chapter]);

  // Effect to handle chapter view tracking with proper cooldown
  useEffect(() => {
    if (!chapter || !chapterId || hasTrackedView) return;

    // Check if chapter was viewed in the last 4 hours (same cooldown as novel views)
    const viewKey = `chapter_${chapterId}_last_viewed`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

    // Only count view if:
    // 1. Never viewed before, or
    // 2. Last viewed more than 4 hours ago
    const shouldCountView = !lastViewed || (now - parseInt(lastViewed, 10)) > fourHours;

    if (shouldCountView) {
      // Update localStorage immediately to prevent multiple counts
      localStorage.setItem(viewKey, now.toString());
      
      // Mark as tracked to prevent multiple calls in this session
      setHasTrackedView(true);
      
      // Don't do optimistic updates - let the server handle the actual increment
      // The server will increment the view count and we'll get the updated count
      // when the data refreshes naturally
    } else {
      // Mark as tracked even if we didn't count to prevent loops
      setHasTrackedView(true);
    }
  }, [chapter, chapterId, hasTrackedView]);

  // Reset view tracking when chapter changes
  useEffect(() => {
    setHasTrackedView(false);
  }, [chapterId]);

  // CRITICAL: Listen for auth changes and refetch protected chapters
  useEffect(() => {
    const handleAuthChange = () => {
      // If this is a protected chapter or was previously access denied, refetch
      if (chapter?.mode === 'protected' || chapter?.accessDenied) {
        refetch();
      }
    };

    // Listen for auth state changes
    window.addEventListener('auth-cache-clear', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-cache-clear', handleAuthChange);
    };
  }, [chapter?.mode, chapter?.accessDenied, refetch]);

  // Track previous user state for comparison
  const previousUser = useRef(user);
  
  // Force refetch when user authentication status changes
  useEffect(() => {
    // If user auth status changed (login/logout) and this is a protected chapter
    if (previousUser.current !== user && (chapter?.mode === 'protected' || chapter?.accessDenied)) {
      refetch();
    }
    
    previousUser.current = user;
  }, [user, chapter?.mode, chapter?.accessDenied, refetch]);

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

  // Enhanced real-time SSE listener for chapter like updates with conflict resolution
  useEffect(() => {
    if (!chapterId) return;

    const handleChapterLikeUpdate = (data) => {
      // Only update if this is for the current chapter
      if (data.chapterId === chapterId) {
        const likeSystem = likeSystemRef.current;
        
        // Check if we should accept this update (conflict resolution)
        if (likeSystem && likeSystem.conflictResolver.shouldAcceptUpdate(chapterId, data.timestamp)) {
          const userId = user?.id || user?._id;
          
          updateLikeState({
            isLiked: data.likedBy?.includes(userId) || false,
            count: data.likeCount,
            status: 'success',
            serverTimestamp: data.timestamp
          });

          // Update cache to keep it in sync
          queryClient.setQueryData(['chapter-optimized', chapterId, user?.id], oldData => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              interactions: {
                ...oldData.interactions,
                totalLikes: data.likeCount,
                userInteraction: {
                  ...oldData.interactions.userInteraction,
                  liked: data.likedBy?.includes(userId) || false
                }
              }
            };
          });
        }
      }
    };

    // Dynamically import and set up SSE listener for chapter likes
    import('../services/sseService').then(({ default: sseService }) => {
      sseService.addEventListener('chapter_like_update', handleChapterLikeUpdate);
    });

    return () => {
      // Clean up SSE listener
      import('../services/sseService').then(({ default: sseService }) => {
        sseService.removeEventListener('chapter_like_update', handleChapterLikeUpdate);
      });
    };
  }, [chapterId, user?._id, queryClient]); // Removed updateLikeState from deps since it's stable

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

  // Add refs to persist state across re-renders
  const touchDeviceRef = useRef(false);
  const lastInteractionTimeRef = useRef(0);

  // Effect to show buttons on user interaction (click/tap)
  useEffect(() => {
    let hideTimeout;
    let touchStartPos = null;
    let touchMoved = false;

    const handleTouchStart = (event) => {
      touchDeviceRef.current = true; // Mark as touch device
      touchStartPos = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      touchMoved = false;
    };

    const handleTouchMove = (event) => {
      if (!touchStartPos) return;
      
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      
      // Consider it a drag if moved more than 10px in any direction
      if (deltaX > 10 || deltaY > 10) {
        touchMoved = true;
      }
    };

    const handleTouchEnd = (event) => {
      // Only proceed if it's a tap (not a drag)
      if (touchMoved || !touchStartPos) {
        touchStartPos = null;
        touchMoved = false;
        return;
      }
      
      showButtonsOnInteraction(event, 'touch');
      touchStartPos = null;
      touchMoved = false;
    };

    const handleClick = (event) => {
      const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
      
      // If this is a touch device and we just handled a touch event, ignore the click
      if (touchDeviceRef.current && timeSinceLastInteraction < 500) {
        return;
      }
      
      showButtonsOnInteraction(event, 'click');
    };

    const showButtonsOnInteraction = (event, eventType) => {
      // Prevent rapid double-triggering
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteractionTimeRef.current;
      
      if (timeSinceLastInteraction < 300) {
        return;
      }
      lastInteractionTimeRef.current = now;

      // Don't trigger if any modal is open
      if (showSettingsModal || showReportModal || showRentalExpirationModal || showRentalModal) {
        return;
      }

      // Don't trigger if editing mode is active
      if (isEditing) {
        return;
      }

      // Check if the click is on excluded elements
      const clickedElement = event.target;
      const isExcludedClick = clickedElement.closest('.toggle-btn') || 
                             clickedElement.closest('.nav-controls-container') ||
                             clickedElement.closest('.scroll-top-btn') ||
                             clickedElement.closest('.settings-modal') ||
                             clickedElement.closest('.report-modal') ||
                             clickedElement.closest('.rental-modal') ||
                             clickedElement.closest('.modal-overlay') ||
                             clickedElement.closest('.chapter-dropdown') ||
                             clickedElement.closest('button') ||
                             clickedElement.closest('a') ||
                             clickedElement.closest('input') ||
                             clickedElement.closest('textarea') ||
                             clickedElement.closest('select');
      
      if (isExcludedClick) {
        return;
      }
      
      // Toggle visibility: if buttons are visible, hide them; if hidden, show them
      if (buttonsVisible) {
        setButtonsVisible(false);
        // Clear existing timeout since we're manually hiding
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
      } else {
        setButtonsVisible(true);
        
        // Clear existing timeout
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
        
        // Hide buttons after 5 seconds of inactivity
        hideTimeout = setTimeout(() => {
          setButtonsVisible(false);
        }, 5000);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [buttonsVisible, showSettingsModal, showReportModal, showRentalExpirationModal, showRentalModal, isEditing]); // Include modal states in dependencies

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
   * Handles opening the rental modal for renting a module
   */
  const handleOpenRentalModal = useCallback((module = moduleData) => {
    if (!user) {
              alert('Vui lòng đăng nhập để mở tạm thời tập');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }
    setShowRentalModal(true);
  }, [user, moduleData]);

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
    queryClient.invalidateQueries(['chapter-optimized']);
    queryClient.invalidateQueries(['user']);
    queryClient.invalidateQueries(['completeNovel']);
    queryClient.invalidateQueries(['novel']);
    queryClient.invalidateQueries(['module-rental-status']);
    
    // Notify SecondaryNavbar to refresh balance display
    window.dispatchEvent(new Event('balanceUpdated'));
    
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

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ type: '', message: '', show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // HANDLE ERROR STATE AFTER ALL HOOKS ARE CALLED
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

  if (isVeryLongContent && !longContentProcessed) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" text="Đang xử lý chương dài..." />
      </div>
    );
  }

  /**
   * Handles navigation to previous chapter
   */
  const handlePrevChapter = async () => {
    if (chapter?.prevChapter && chapter.prevChapter._id) {
      setIsNavigating(true);
      try {
        // Prefetch previous chapter data if query client available
        await queryClient.prefetchQuery({
          queryKey: ['chapter-optimized', chapter.prevChapter._id, user?.id],
          queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/chapters/${chapter.prevChapter._id}/full-optimized`);
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
          queryKey: ['chapter-optimized', chapter.nextChapter._id, user?.id],
          queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/chapters/${chapter.nextChapter._id}/full-optimized`);
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

      // Store previous data for potential rollback
      const previousNovelData = queryClient.getQueryData(['completeNovel', novelId]);

      // Optimistic UI update - remove chapter from novel cache immediately
      queryClient.setQueryData(['completeNovel', novelId], (oldData) => {
        if (!oldData) return oldData;
        
        // Create a deep copy of the data to avoid mutations
        const newData = JSON.parse(JSON.stringify(oldData));
        
        // Find and remove the chapter from all modules
        if (newData.modules && Array.isArray(newData.modules)) {
          newData.modules.forEach(module => {
            if (module.chapters && Array.isArray(module.chapters)) {
              module.chapters = module.chapters.filter(ch => ch._id !== currentChapterId);
            }
          });
        }
        
        return newData;
      });

      // Cancel and remove chapter-specific queries
      await queryClient.cancelQueries({queryKey: ['chapter-optimized', chapterId, user?.id]});
      queryClient.removeQueries(['chapter-optimized', chapterId, user?.id]);

      // Make API call to delete chapter
      await axios.delete(
        `${config.backendUrl}/api/chapters/${currentChapterId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Invalidate related queries to ensure fresh data from server
      queryClient.invalidateQueries({queryKey: ['chapter-optimized', chapterId, user?.id]});
      queryClient.invalidateQueries({queryKey: ['completeNovel', novelId]});
      queryClient.invalidateQueries({queryKey: ['novel', novelId]});

      // Navigate back to novel page
      navigate(generateNovelUrl({ _id: novelId, title: novel.title }), {replace: true});
    } catch (err) {
      console.error('Không thể xóa chương:', err);
      setError('Không thể xóa chương. Vui lòng thử lại.');
      
      // On error, force refetch to restore correct state
      queryClient.invalidateQueries({queryKey: ['completeNovel', novelId]});
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
      await queryClient.cancelQueries({queryKey: ['chapter-optimized', chapterId, user?.id]});

      const previousChapterData = queryClient.getQueryData(['chapter-optimized', chapterId, user?.id]);

      queryClient.setQueryData(['chapter-optimized', chapterId, user?.id], {
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

      // Check if slug changed (title changed) and redirect if needed
      if (data.newSlug && novel) {
        // Clear current query cache
        queryClient.removeQueries({ queryKey: ['chapter-optimized', chapterId] });
        
        // Generate new chapter URL with updated slug
        const newChapterUrl = `/truyen/${createUniqueSlug(novel.title, novel._id)}/chuong/${data.newSlug}`;
        
        // Navigate to new URL
        navigate(newChapterUrl, { replace: true });
        
        // Note: The new page will fetch fresh data with the new slug
        return;
      }

      // Update with server data for consistency (only if no slug change)
      queryClient.setQueryData(['chapter-optimized', chapterId, user?.id], {
        ...(previousChapterData || chapterData),
        chapter: {
          ...(previousChapterData?.chapter || chapterData?.chapter || {}),
          ...data
        }
      });

      // CRITICAL FIX: Force refetch to ensure we get the latest data from server
      // This ensures any server-side processing or caching changes are reflected immediately
      await refetch();
      
      // Also invalidate related queries to ensure consistency across the application
      queryClient.invalidateQueries({
        queryKey: ['chapter-optimized', chapterId],
        exact: false // This will invalidate all chapter queries for this chapter ID regardless of user
      });
      
      // Invalidate novel queries that might include this chapter's data
      if (chapter?.novelId) {
        queryClient.invalidateQueries({
          queryKey: ['completeNovel', chapter.novelId],
          exact: false
        });
        queryClient.invalidateQueries({
          queryKey: ['novel', chapter.novelId],
          exact: false
        });
      }

    } catch (err) {
      console.error('Không thể cập nhật chương:', err);
      
      // Show error notification instead of full-screen error
      setNotification({ 
        type: 'error', 
        message: err.response?.data?.message || 'Không thể cập nhật chương. Vui lòng thử lại.', 
        show: true 
      });

      // Refetch data to ensure consistency
      queryClient.refetchQueries({queryKey: ['chapter-optimized', chapterId, user?.id]});
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles liking/unliking a chapter (Facebook-style with sophisticated queue system)
   */
  const handleLike = useCallback(async () => {

    if (!user) {
      alert('Vui lòng đăng nhập để thích chương');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }

    if (!user || (!user._id && !user.id)) {
      alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
      return;
    }

    const userId = user.id || user._id;
    const likeSystem = likeSystemRef.current;

    if (!likeSystem) {
      console.error('❌ Chapter Like: Like system not initialized');
      return;
    }

    // Check rate limit
    if (!likeSystem.rateLimiter.canLike(chapterId)) {
      alert('Bạn đang thích quá nhanh. Vui lòng chờ một chút.');
      return;
    }

    // Get current state
    const currentState = likeState.isLiked;
    
    
    // Record action for conflict resolution
    const timestamp = Date.now();
    likeSystem.conflictResolver.recordAction(chapterId, timestamp);
    
    // Record rate limit action
    likeSystem.rateLimiter.recordAction(chapterId);

    // Optimistic update
    const newState = {
      isLiked: !currentState,
      count: currentState ? likeState.count - 1 : likeState.count + 1,
      status: 'loading'
    };
    
    updateLikeState(newState);

    // Add to queue
    try {
      await likeSystem.queue.addToQueue(chapterId, currentState, userId);
    } catch (error) {
      console.error('❌ Chapter Like: Failed to add to queue:', error);
      
      // Revert optimistic update
      const revertState = {
        isLiked: currentState,
        count: likeState.count,
        status: 'error'
      };
      updateLikeState(revertState);
    }
  }, [user, chapterId, likeState.isLiked, likeState.count, updateLikeState]);

  /**
   * Handles bookmarking/unbookmarking a chapter
   */
  const handleBookmark = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đánh dấu chương');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }

    // Store current state for potential rollback
    const previousBookmarked = isBookmarked;
    
    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        alert('Vui lòng đăng nhập để đánh dấu chương');
        window.dispatchEvent(new CustomEvent('openLoginModal'));
        return;
      }
      
      // Optimistically update the UI immediately
      setIsBookmarked(!isBookmarked);
      
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
      queryClient.setQueryData(['chapter-optimized', chapterId, user?.id], oldData => {
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
      
      // Ensure local state matches server response
      setIsBookmarked(response.data.bookmarked);
      
      // Also invalidate the bookmarked chapter query
      queryClient.invalidateQueries({
        queryKey: ['bookmarked-chapter', novelId, user?.id]
      });
    } catch (err) {
      console.error('Không thể đánh dấu/bỏ đánh dấu chương:', err);
      // Revert optimistic update on error
      setIsBookmarked(previousBookmarked);
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['chapter-optimized', chapterId, user?.id]);
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

  // OPTIMIZATION: Enhanced loading with early access guard for better UX
  if (isLoading) {
    // CRITICAL FIX: Only show access guard during loading if:
    // 1. Authentication is not loading (user state is determined)
    // 2. User is not authenticated
    // 3. AND it's specifically paid content (not protected content)
    if (!authLoading && !user && (moduleData?.mode === 'paid')) {
      return (
        <div className="chapter-layout">
          <div className="chapter-container">
            <ChapterHeader
              chapter={{ 
                _id: 'loading', 
                title: 'Đang tải...', 
                createdAt: new Date() 
              }}
              novel={novel || { _id: novelId, title: 'Đang tải...' }}
              novelId={novelId}
              user={user}
              onBackToNovel={() => {}}
              onShare={() => {}}
              isEditing={false}
              canEdit={false}
              viewCount={0}
              wordCount={0}
              formatDate={formatDate}
            />
            <ChapterAccessGuard 
              chapter={{
                mode: 'paid', // Set to paid since we're only showing this for paid content now
                accessDenied: true,
                novel: novel
              }} 
              moduleData={moduleData} 
              user={user} 
              novel={novel}
              onOpenRentalModal={handleOpenRentalModal}
              onCloseRentalModal={handleCloseRentalModal}
              onRentalSuccess={handleRentalSuccess}
              isLoadingAccess={true}
            >
            <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSpinner 
                size="large" 
                text="Đang kiểm tra quyền truy cập..." 
              />
            </div>
            </ChapterAccessGuard>
          </div>
        </div>
      );
    }
    
    // Default loading state

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

  // CRITICAL: Prevent rendering if chapter data is incomplete (fixes race condition)
  if (!chapter._id || !chapter.mode) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" text="Đang tải dữ liệu chương..." />
      </div>
    );
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
        user={user}
        canEdit={canEdit}
        canDelete={canDelete}
      />


      {/* Toolbar with staff info and chapter stats */}
      <ChapterToolbar
        chapter={chapter}
        novel={novel}
        viewCount={viewCount}
        wordCount={wordCount}
        formatDate={formatDate}
        user={user}
      />

      {/* Chapter Content with Optimized Access Guard */}
      {(() => {

        return shouldShowEarlyAccessGuard;
      })() ? (
        // OPTIMIZATION: Show access guard immediately for likely denied access
        <ChapterAccessGuard 
          chapter={{
            // If module is paid, reflect that here to avoid inconsistent state that could render blank
            mode: moduleData?.mode === 'paid' ? 'paid' : (chapter?.mode || 'published'),
            accessDenied: true, // Force show guard immediately
            novel: novel,
            rentalInfo: chapter?.rentalInfo || { hasActiveRental: false }
          }} 
          moduleData={moduleData} 
          user={user} 
          novel={novel}
          onOpenRentalModal={handleOpenRentalModal}
          onCloseRentalModal={handleCloseRentalModal}
          onRentalSuccess={handleRentalSuccess}
          isLoadingAccess={true} // Add loading state flag
        >
          <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner 
              text="Đang kiểm tra quyền truy cập..." 
            />
          </div>
        </ChapterAccessGuard>
      ) : (
        // Normal access guard flow
        (() => {

          return (
            <ChapterAccessGuard 
              chapter={chapter} 
              moduleData={moduleData} 
              user={user} 
              novel={novel}
              onOpenRentalModal={handleOpenRentalModal}
              onCloseRentalModal={handleCloseRentalModal}
              onRentalSuccess={handleRentalSuccess}
              bypassAccessCheck={canAccessPaidContent} // Trust parent's access decision
            >
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
            marginSpacing={marginSpacing}
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
          );
        })()
      )}

      {/* Chapter Bottom Actions */}
      <div className="chapter-bottom-actions">
        {/* Social Share */}
        <ChapterSocialShare handleShare={handleShare} />

        {/* User Actions */}
        <ChapterActions
          isLiked={likeState.isLiked}
          likeCount={likeState.count}
          likeStatus={likeState.status}
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
        Vui lòng báo cáo bất kỳ vấn đề nào (thiếu hình ảnh, chương sai, bản dịch chất lượng kém,...) bằng nút báo cáo.
      </div>

      {/* Comments section */}
      <ChapterCommentsSection
        novelId={novelId}
        chapterId={chapterId}
        user={user}
        novel={novel}
      />


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
        buttonsVisible={buttonsVisible}
        isBookmarked={isBookmarked}
        handleBookmark={handleBookmark}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
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
        marginSpacing={marginSpacing}
        setMarginSpacing={setMarginSpacing}
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