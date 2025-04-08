import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/Chapter.css';
import CommentSection from './CommentSection';
import config from '../config/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp, faEllipsisV, faTimes, faList, faSpinner,
  faChevronLeft, faChevronRight, faEye, faFont,
  faLanguage, faEdit, faCheckDouble, faHeart, faStar,
  faComment, faLock, faCog
} from '@fortawesome/free-solid-svg-icons';
import {
  faHeart as farHeart,
  faStar as farStar
} from '@fortawesome/free-regular-svg-icons';
import {
  faFacebookF, faTwitter, faPinterestP, faTelegram
} from '@fortawesome/free-brands-svg-icons';

// Import components
import ChapterHeader from './chapter/ChapterHeader';
import ChapterNavigation from './chapter/ChapterNavigation';
import ChapterContent from './chapter/ChapterContent';
import ChapterFooter from './chapter/ChapterFooter';
import { SettingsModal, RatingModal, ReportModal } from './chapter/ChapterModals';

// Import utilities 
import {
  useReadingSettings, useReadingProgress, getSafeHtml,
  unescapeHtml, countWords, formatDate, scrollToTop
} from './chapter/ChapterUtils';

const Chapter = () => {
  const { novelId, chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const contentRef = useRef(null);
  const editorRef = useRef(null);

  // Get reading settings from custom hook
  const {
    fontSize, fontFamily, lineHeight, theme,
    setFontFamily, setLineHeight, 
    increaseFontSize, decreaseFontSize, applyTheme
  } = useReadingSettings();

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showNavControls, setShowNavControls] = useState(false);
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

  // Use the reading progress hook
  const readingProgress = useReadingProgress(contentRef);

  // Reset navigation state when chapter changes
  useEffect(() => {
    setIsNavigating(false);
    // Scroll to top when chapter changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterId]);

  // Query for chapter data
  const { data: chapterData, error: chapterError, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);

      // Check localStorage for view timestamp before incrementing view count
      const viewKeyLocal = `chapter_${chapterId}_last_viewed`;
      const lastViewed = localStorage.getItem(viewKeyLocal);
      const now = Date.now();
      const eightHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      const shouldCountView = !lastViewed || (now - parseInt(lastViewed, 10)) > eightHours;

      // Only call the view endpoint if we haven't viewed this chapter recently
      if (shouldCountView) {
        try {
          const viewResponse = await axios.post(`${config.backendUrl}/api/userchapterinteractions/view/${chapterId}`, {}, {
            headers: user ? {Authorization: `Bearer ${localStorage.getItem('token')}`} : {}
          });
          
          // If the view was counted by the server, update our localStorage timestamp
          if (viewResponse.data.counted) {
            localStorage.setItem(viewKeyLocal, now.toString());
          }
        } catch (err) {
          console.error('Error recording view:', err);
        }
      }

      return chapterRes.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!chapterId
  });

  // Query for novel data to get chapters list
  const { data: novelData } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: async () => {
      const novelRes = await axios.get(`${config.backendUrl}/api/novels/${novelId}`);
      return novelRes.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!novelId
  });

  // Query for likes, bookmarks and ratings
  const { data: interactionData } = useQuery({
    queryKey: ['chapter-interactions', chapterId],
    queryFn: async () => {
      const res = await axios.get(`${config.backendUrl}/api/userchapterinteractions/stats/${chapterId}`, {
        headers: user ? {Authorization: `Bearer ${localStorage.getItem('token')}`} : {}
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!chapterId
  });

  // Query for comments
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
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

  // Query for user's specific interactions
  const { data: userInteractions } = useQuery({
    queryKey: ['user-interactions', chapterId, user?.id],
    queryFn: async () => {
      const res = await axios.get(`${config.backendUrl}/api/userchapterinteractions/user/${chapterId}`, {
        headers: user ? {Authorization: `Bearer ${localStorage.getItem('token')}`} : {}
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!chapterId && !!user
  });

  // Extract chapter and novel data
  const chapter = chapterData?.chapter;
  const novel = chapter?.novel || novelData?.novel || {title: "Novel"};
  const chapterList = novelData?.chapters || [];

  // Effect to update interaction stats
  useEffect(() => {
    if (interactionData) {
      setLikeCount(interactionData.totalLikes || 0);
      setRatingCount(interactionData.totalRatings || 0);
      setAverageRating(interactionData.averageRating || 0);
      setViewCount(chapter?.views || 0);
    } else {
      // Default to 0 if no interaction data is available
      setLikeCount(0);
      setRatingCount(0);
      setAverageRating(0);
      setViewCount(chapter?.views || 0);
    }
  }, [interactionData, chapter]);

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
   * Handles navigation to previous chapter
   */
  const handlePrevChapter = async () => {
    if (chapter?.prevChapter && chapter.prevChapter._id) {
      setIsNavigating(true);
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
        // Scroll after navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        // Scroll after navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('Error navigating to next chapter:', error);
        setError('Failed to navigate to next chapter.');
        setIsNavigating(false);
      }
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
      
      // Find the hidden input that contains the editedMode value
      const modeInputs = document.querySelectorAll('input[type="hidden"]');
      let updatedMode = chapter.mode;
      
      // Look through any hidden inputs for one with a getMode function
      for (const input of modeInputs) {
        if (typeof input.getMode === 'function') {
          updatedMode = input.getMode();
          break;
        }
      }
      
      const updateData = {
        title: updatedTitle,
        content: updatedContent,
        mode: updatedMode
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
      await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/like`,
        { chapterId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['chapter-interactions', chapterId]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-interactions', chapterId, user?.id]
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
    if (!user) {
      alert('Please log in to bookmark this chapter');
      return;
    }

    // For logged in users, use API
    const previousBookmarked = isBookmarked;
    setIsBookmarked(!isBookmarked);

    try {
      // Make API call to bookmark/unbookmark
      await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/bookmark`,
        { chapterId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Invalidate user interactions query
      queryClient.invalidateQueries({
        queryKey: ['user-interactions', chapterId, user?.id]
      });
      
      // Also invalidate the bookmarked chapter query
      queryClient.invalidateQueries({
        queryKey: ['bookmarked-chapter', novelId, user?.id]
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
      await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/rate`,
        { 
          chapterId,
          rating: currentRating 
        },
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
        queryKey: ['chapter-interactions', chapterId]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-interactions', chapterId, user?.id]
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
    if (!user) {
      alert('Please log in to report this chapter');
      setShowReportModal(false);
      return;
    }

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
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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

  // Check if user has access to chapter content based on mode
  const canAccessChapterContent = (chapter, user) => {
    if (!chapter || !chapter.mode) return true; // Default to accessible if no mode specified
    
    switch (chapter.mode) {
      case 'published':
        return true; // Published is accessible to everyone
      case 'protected':
        return !!user; // Protected requires user to be logged in
      case 'draft':
        return user?.role === 'admin' || user?.role === 'moderator'; // Draft accessible to admin and moderator
      case 'paid':
        // TODO: Implement paid content check
        return user?.role === 'admin' || user?.role === 'moderator'; // For now, admin and moderator access
      default:
        return true;
    }
  };

  // Handle mode change
  const handleModeChange = async (newMode) => {
    console.log(`Changing chapter mode to: ${newMode}`);
    try {
      // Update UI immediately for better perceived performance
      queryClient.setQueryData(['chapter', chapterId], old => ({
        ...old,
        chapter: { ...old.chapter, mode: newMode }
      }));

      // Make API call
      const response = await axios.put(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        { mode: newMode },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      console.log('Chapter mode updated successfully:', response.data);
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries(['chapter', chapterId]);
    } catch (error) {
      console.error('Failed to update chapter mode:', error);
      
      // Revert optimistic update if request failed
      queryClient.invalidateQueries(['chapter', chapterId]);
      
      // Display error to user (optional)
      setError('Failed to update chapter mode. Please try again.');
    }
  };

  // Check if user can edit
  const canEdit = user && (user.role === 'admin' || user.role === 'moderator');
  // Check if user can delete
  const canDelete = user && user.role === 'admin';

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
      <ChapterHeader
        novel={novel}
        novelId={novelId}
        chapter={chapter}
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
      >
        {canEdit && (
          <div className="admin-controls">
            <button className="edit-chapter-btn" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancel Edit' : 'Edit Chapter'}
            </button>
            
            {canDelete && (
              <button className="delete-chapter-btn" onClick={handleDeleteChapter}>
                Delete Chapter
              </button>
            )}
          </div>
        )}
      </ChapterHeader>

      {/* Navigation */}
      <ChapterNavigation
        chapter={chapter}
        isNavigating={isNavigating}
        isEditing={isEditing}
        handlePrevChapter={handlePrevChapter}
        handleNextChapter={handleNextChapter}
      />

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

        <div className="action-toolbar-right">
          <span className="chapter-view-date">
            {chapter?.updatedAt ? formatDate(chapter.updatedAt) : 'Unknown date'}
          </span>
          {/* Stats */}
          <div className="chapter-stats">
            <span className="chapter-stat-item">
              <FontAwesomeIcon icon={faEye}/> {viewCount} views
            </span>
            <span className="chapter-stat-item">
              <FontAwesomeIcon icon={faFont}/> {wordCount} words
            </span>
          </div>
        </div>
      </div>

      {/* Chapter Content */}
      {!canAccessChapterContent(chapter, user) ? (
        <div className="restricted-content-message">
          {chapter?.mode === 'protected' && (
            <div className="protected-content">
              <FontAwesomeIcon icon={faLock} size="3x" />
              <h3>Protected Content</h3>
              <p>Please log in to read this chapter.</p>
              <Link to="/login" className="login-button">Log In</Link>
            </div>
          )}
          {chapter?.mode === 'draft' && (
            <div className="draft-content">
              <FontAwesomeIcon icon={faCog} size="3x" />
              <h3>Draft Content</h3>
              <p>This chapter is still in draft mode and not available for public viewing.</p>
            </div>
          )}
          {chapter?.mode === 'paid' && (
            <div className="paid-content">
              <FontAwesomeIcon icon={faLock} size="3x" />
              <h3>Premium Content</h3>
              <p>This chapter is premium content. Feature coming soon.</p>
            </div>
          )}
        </div>
      ) : (
        <ChapterContent
          chapter={chapter}
          isEditing={isEditing}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          fontSize={fontSize}
          fontFamily={fontFamily}
          lineHeight={lineHeight}
          editorRef={editorRef}
          getSafeHtml={getSafeHtml}
          onModeChange={handleModeChange}
          canEdit={canEdit}
        />
      )}

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
      <ChapterNavigation
        chapter={chapter}
        isNavigating={isNavigating}
        isEditing={isEditing}
        handlePrevChapter={handlePrevChapter}
        handleNextChapter={handleNextChapter}
        position="bottom"
      />

      {/* Footer Navigation */}
      <ChapterFooter
        novelId={novelId}
        novel={novel}
        chapter={chapter}
        isBookmarked={isBookmarked}
        handleBookmark={handleBookmark}
        setShowReportModal={setShowReportModal}
      />

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

      <RatingModal
        showRatingModal={showRatingModal}
        setShowRatingModal={setShowRatingModal}
        currentRating={currentRating}
        setCurrentRating={setCurrentRating}
        handleSubmitRating={handleSubmitRating}
      />

      <ReportModal
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        reportReason={reportReason}
        setReportReason={setReportReason}
        reportDetails={reportDetails}
        setReportDetails={setReportDetails}
        handleSubmitReport={handleSubmitReport}
      />
    </div>
  );
};

export default Chapter; 