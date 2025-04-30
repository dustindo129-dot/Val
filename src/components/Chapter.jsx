import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/Chapter.css';
import config from '../config/config';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

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
import { SettingsModal, RatingModal, ReportModal } from './chapter/ChapterModals';
import ScrollToTop from './ScrollToTop';

// Import utilities 
import {
  useReadingSettings, useReadingProgress, getSafeHtml,
  unescapeHtml, countWords, formatDate
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
  const [editedContent, setEditedContent] = useState({ content: '', footnotes: [] });
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

  // Add debouncing
  const [lastLikeTime, setLastLikeTime] = useState(0);
  const LIKE_COOLDOWN = 500; // 500ms cooldown between likes

  // Reset navigation state and edited content when chapter changes
  useEffect(() => {
    setIsNavigating(false);
    // Reset edited content when chapter changes
    setEditedContent({ content: '', footnotes: [] });
    setEditedTitle('');
    // Scroll to top when chapter changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterId]);

  // Reset edited content when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setEditedContent({ content: '', footnotes: [] });
      setEditedTitle('');
    }
  }, [isEditing]);

  // Query for novel data
  const { data: novelData } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: async () => {
      const novelRes = await axios.get(`${config.backendUrl}/api/novels/${novelId}`);
      return novelRes.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!novelId
  });

  // Query for chapter data
  const { data: chapterData, error: chapterError, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);

      // Check localStorage for view timestamp before incrementing view count
      const viewKeyLocal = `chapter_${chapterId}_last_viewed`;
      const lastViewed = localStorage.getItem(viewKeyLocal);
      const now = Date.now();
      const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      const shouldCountView = !lastViewed || (now - parseInt(lastViewed, 10)) > fourHours;

      // Only call the view endpoint if we haven't viewed this chapter recently
      if (shouldCountView) {
        try {
          // Use a timeout to ensure the view request doesn't block chapter loading
          setTimeout(async () => {
            try {
              const viewResponse = await axios.post(`${config.backendUrl}/api/userchapterinteractions/view/${chapterId}`, {}, {
                headers: user ? {Authorization: `Bearer ${localStorage.getItem('token')}`} : {},
                timeout: 5000 // 5 second timeout for view recording
              });
              
              // If the view was counted by the server, update our localStorage timestamp
              if (viewResponse.data.counted) {
                localStorage.setItem(viewKeyLocal, now.toString());
                
                // Update the view count in the UI if it was a successful count
                if (viewResponse.data.views) {
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
              }
            } catch (viewErr) {
              // Log but don't disrupt user experience for view count errors
              console.error('Lỗi ghi nhận lượt xem:', viewErr);
            }
          }, 500); // Small delay to prioritize chapter content loading
        } catch (err) {
          // Silent catch - view count errors shouldn't disrupt reading
          console.error('Lỗi thiết lập ghi nhận lượt xem:', err);
        }
      }

      return chapterRes.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!chapterId
  });

  // Extract chapter and novel data
  const chapter = chapterData?.chapter;
  const novel = chapter?.novel || novelData?.novel || {title: "Novel"};

  // Query for module data when we have a moduleId
  const { data: moduleData } = useQuery({
    queryKey: ['module', chapter?.moduleId],
    queryFn: async () => {
      if (!chapter?.moduleId) return null;
      const res = await axios.get(`${config.backendUrl}/api/modules/${novelId}/modules/${chapter.moduleId}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!chapter?.moduleId
  });

  // Query for all chapters in the current module
  const { data: moduleChaptersData, isLoading: isModuleChaptersLoading } = useQuery({
    queryKey: ['module-chapters', chapter?.moduleId],
    queryFn: async () => {
      if (!chapter?.moduleId) return { chapters: [] };
      const res = await axios.get(`${config.backendUrl}/api/chapters/module/${chapter.moduleId}`);
      return { chapters: res.data }; // Wrap the response data in a chapters property to match our expected format
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
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
      setEditedTitle(chapter.title || '');
      setEditedContent({
        content: unescapeHtml(chapter.content || ''),
        footnotes: chapter.footnotes || []
      });
      
      // Add a slight delay to ensure the editor is mounted before attempting to set content
      const timer = setTimeout(() => {
        if (editorRef.current && editorRef.current.setContent) {
          // Force reset any editor content
          editorRef.current.setContent(unescapeHtml(chapter.content || ''));
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
        navigate(`/novel/${novelId}/chapter/${chapter.nextChapter._id}`);
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
      navigate(`/novel/${novelId}`, {replace: true});
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
        chapterBalance: updatedMode === 'paid' ? updatedChapterBalance : 0
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
      console.error('Không thể cập nhật chương:', err);
      setError('Không thể cập nhật chương. Vui lòng thử lại.');

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
      alert('Vui lòng đăng nhập để thích chương này');
      return;
    }

    // Add debouncing
    const now = Date.now();
    if (now - lastLikeTime < LIKE_COOLDOWN) {
      return; // Ignore click if too soon after last click
    }
    setLastLikeTime(now);

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
      alert('Vui lòng đăng nhập để đánh dấu chương này');
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
      console.error('Không thể đánh dấu/bỏ đánh dấu chương:', err);
      // Revert optimistic update on error
      setIsBookmarked(previousBookmarked);
    }
  };

  // Add rating mutation
  const rateMutation = useMutation({
    mutationFn: async (rating) => {
      const response = await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/rate`,
        { 
          chapterId,
          rating 
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    },
    onMutate: async (newRating) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['chapter-interactions', chapterId]);
      await queryClient.cancelQueries(['user-interactions', chapterId, user?.id]);

      // Snapshot the previous values
      const previousStats = queryClient.getQueryData(['chapter-interactions', chapterId]);
      const previousInteraction = queryClient.getQueryData(['user-interactions', chapterId, user?.id]);

      // Calculate new average rating
      const oldRating = previousInteraction?.rating || 0;
      const totalRatings = previousStats?.totalRatings || 0;
      const currentAvgRating = parseFloat(previousStats?.averageRating || '0');

      let newTotalRatings = totalRatings;
      let newAvgRating = currentAvgRating;

      if (oldRating === 0) {
        // Adding new rating
        newTotalRatings++;
        newAvgRating = ((currentAvgRating * totalRatings) + newRating) / newTotalRatings;
      } else {
        // Updating existing rating
        newAvgRating = ((currentAvgRating * totalRatings) - oldRating + newRating) / totalRatings;
      }

      // Optimistically update stats
      queryClient.setQueryData(['chapter-interactions', chapterId], old => ({
        ...old,
        totalRatings: newTotalRatings,
        averageRating: newAvgRating.toFixed(1)
      }));

      // Optimistically update user interaction
      queryClient.setQueryData(['user-interactions', chapterId, user?.id], old => ({
        ...old,
        rating: newRating
      }));

      return { previousStats, previousInteraction };
    },
    onError: (err, variables, context) => {
      // Reset to previous values on error
      if (context?.previousStats) {
        queryClient.setQueryData(['chapter-interactions', chapterId], context.previousStats);
      }
      if (context?.previousInteraction) {
        queryClient.setQueryData(['user-interactions', chapterId, user?.id], context.previousInteraction);
      }
      console.error('Failed to update rating:', err);
    },
    onSuccess: (response) => {
      // Update with actual server data
      queryClient.setQueryData(['chapter-interactions', chapterId], old => ({
        ...old,
        totalRatings: response.ratingsCount || old?.totalRatings || 0,
        averageRating: response.averageRating
      }));

      queryClient.setQueryData(['user-interactions', chapterId, user?.id], old => ({
        ...old,
        rating: response.rating
      }));

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['chapter-interactions', chapterId],
        exact: true
      });

      setShowRatingModal(false);
    }
  });

  /**
   * Handles submitting a rating for the chapter
   */
  const handleSubmitRating = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đánh giá chương này');
      setShowRatingModal(false);
      return;
    }

    if (currentRating === 0) {
      alert('Vui lòng chọn đánh giá');
      return;
    }

    try {
      await rateMutation.mutateAsync(currentRating);
    } catch (error) {
      console.error('Không thể đánh giá chương:', error);
      alert('Không thể gửi đánh giá. Vui lòng thử lại.');
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

  // Handle mode change
  const handleModeChange = async (newMode, currentContent) => {
    try {
      // Get current content if not provided
      const content = currentContent || (editorRef.current ? editorRef.current.getContent() : chapter.content);
      
      // Update UI immediately for better perceived performance
      queryClient.setQueryData(['chapter', chapterId], old => ({
        ...old,
        chapter: { 
          ...old.chapter, 
          mode: newMode,
          content: content // Preserve current content
        }
      }));

      // Make API call with both mode and content
      await axios.put(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        { 
          mode: newMode,
          content: content
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries(['chapter', chapterId]);
    } catch (error) {
      console.error('Failed to update chapter mode:', error);
      
      // Revert optimistic update if request failed
      queryClient.invalidateQueries(['chapter', chapterId]);
      
      // Display error to user (optional)
      setError('Không thể cập nhật chế độ chương. Vui lòng thử lại.');
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
      <ChapterAccessGuard chapter={chapter} user={user}>
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
          onModeChange={handleModeChange}
          canEdit={canEdit}
          userRole={user?.role || 'user'}
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
          currentRating={currentRating}
          averageRating={averageRating}
          ratingCount={ratingCount}
          handleLike={handleLike}
          setShowRatingModal={setShowRatingModal}
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
        isCommentsOpen={isCommentsOpen}
        setIsCommentsOpen={setIsCommentsOpen}
        novelId={novelId}
        chapterId={chapterId}
        user={user}
        comments={comments}
        isCommentsLoading={isCommentsLoading}
      />

      {/* Add the ScrollToTop component */}
      <ScrollToTop threshold={300} />

      {/* Navigation Controls */}
      <ChapterNavigationControls
        novelId={novelId}
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
        chapterId={chapterId}
        chapterTitle={chapter?.title}
        novelId={novelId}
      />
    </div>
  );
};

export default Chapter; 