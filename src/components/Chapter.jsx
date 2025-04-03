/**
 * Chapter Component
 * 
 * Displays a single chapter of a novel with features including:
 * - Chapter content display
 * - Navigation between chapters
 * - Reading progress tracking
 * - Chapter metadata
 * - User interactions
 * 
 * Features:
 * - Previous/Next chapter navigation
 * - Chapter progress indicator
 * - Responsive layout
 * - Loading states
 * - Error handling
 * - User authentication checks
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/Chapter.css';
import CommentSection from './CommentSection';
import config from '../config/config';
import DOMPurify from 'dompurify';
import { Editor } from '@tinymce/tinymce-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Chapter Component
 * 
 * Main component that displays and manages a single chapter of a novel
 * 
 * @param {Object} props - No props required, uses URL parameters
 */
const Chapter = () => {
  const { novelId, chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State management for chapter data and UI
  const [fontSize, setFontSize] = useState(16);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const editorRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset isNavigating when chapterId changes (after successful navigation)
  useEffect(() => {
    setIsNavigating(false);
  }, [chapterId]);

  // Query for chapter data with its context
  const { data: chapterData, error: chapterError, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);
      return chapterRes.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!chapterId
  });

  // Query for comments with proper caching
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
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Extract chapter from query data
  const chapter = chapterData?.chapter;
  const novel = chapter?.novel || { title: "Novel" };

  // State management for error handling
  const [error, setError] = useState(null);

  /**
   * Safely renders HTML content with sanitization
   * @param {string} content - HTML content to render
   * @returns {string} Sanitized HTML
   */
  const getSafeHtml = (content) => {
    return {
      __html: DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'br', 'i', 'b', 'img'],
        ALLOWED_ATTR: ['style', 'class', 'src', 'alt', 'width', 'height'],
        FORBID_TAGS: ['script', 'iframe'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick']
      })
    };
  };

  /**
   * Scrolls to top of page
   * @returns {Promise} Promise that resolves when scroll is complete
   */
  const scrollToTop = () => {
    return new Promise((resolve) => {
      // First, scroll instantly to top
      window.scrollTo(0, 0);
      // Then start the smooth scroll
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Wait for scroll animation to complete
      setTimeout(resolve, 500);
    });
  };

  /**
   * Handles navigation with query cache
   */
  const handlePrevChapter = async () => {
    if (chapter?.prevChapter && chapter.prevChapter._id) {
      console.log('Navigating to previous chapter:', chapter.prevChapter);
      setIsNavigating(true);
      await scrollToTop();
      try {
        // Prefetch next chapter data
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
    } else {
      console.warn('No previous chapter available:', chapter?.prevChapter);
      setIsNavigating(false);
    }
  };

  const handleNextChapter = async () => {
    if (chapter?.nextChapter && chapter.nextChapter._id) {
      console.log('Navigating to next chapter:', chapter.nextChapter);
      setIsNavigating(true);
      await scrollToTop();
      try {
        // Prefetch next chapter data
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
    } else {
      console.warn('No next chapter available:', chapter?.nextChapter);
      setIsNavigating(false);
    }
  };

  /**
   * Increases the font size of the chapter content
   */
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  /**
   * Decreases the font size of the chapter content
   */
  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };

  /**
   * Formats date to "MMM-DD-YYYY" format
   * @param {string} date - Date string to format
   * @returns {JSX.Element} Formatted date in italics
   */
  const formatDate = (date) => {
    if (!date) return <i>Invalid date</i>;
    
    try {
      const chapterDate = new Date(date);
      
      if (isNaN(chapterDate.getTime())) {
        return <i>Invalid date</i>;
      }
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const month = monthNames[chapterDate.getMonth()];
      const day = chapterDate.getDate().toString().padStart(2, '0');
      const year = chapterDate.getFullYear();
      
      return <i>{`${month}-${day}-${year}`}</i>;
    } catch (err) {
      console.error('Date formatting error:', err);
      return <i>Invalid date</i>;
    }
  };

  /**
   * Handles chapter deletion
   */
  const handleDeleteChapter = async () => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) {
      return;
    }

    try {
      // Store chapter and novel IDs for reference
      const currentChapterId = chapter._id;
      const currentNovelId = chapter.novelId;
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chapter', chapterId] });
      
      // Remove chapter from cache immediately for instant UI feedback
      queryClient.removeQueries(['chapter', chapterId]);
      
      // Optimistically update novel data if it's in the cache
      const novelData = queryClient.getQueryData(['novel', novelId]);
      if (novelData) {
        const optimisticNovelData = {...novelData};
        
        // Remove the chapter from any modules that might contain it
        if (optimisticNovelData.modules) {
          optimisticNovelData.modules = optimisticNovelData.modules.map(module => {
            if (module.chapters && module.chapters.some(c => c._id === currentChapterId)) {
              return {
                ...module,
                chapters: module.chapters.filter(c => c._id !== currentChapterId)
              };
            }
            return module;
          });
          
          // Update the cache with optimistic data
          queryClient.setQueryData(['novel', novelId], optimisticNovelData);
        }
      }

      // Make the actual delete API call
      const response = await axios.delete(
        `${config.backendUrl}/api/chapters/${currentChapterId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // On successful deletion, invalidate relevant queries without forcing refetches
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] });
      queryClient.invalidateQueries({ queryKey: ['modules', novelId] });
      
      // Navigate back to novel page
      navigate(`/novel/${novelId}`, { replace: true });
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      setError('Failed to delete chapter. Please try again.');
      
      // On error, refetch to ensure data consistency
      queryClient.refetchQueries({ queryKey: ['novel', novelId] });
      queryClient.refetchQueries({ queryKey: ['modules', novelId] });
    }
  };

  /**
   * Handles chapter edit with optimistic updates
   */
  const handleEditChapter = async () => {
    try {
      setIsSaving(true);
      
      // Get updated content from the editor
      const updatedTitle = editedTitle;
      const updatedContent = editorRef.current.getContent();
      
      // Create update data object
      const updateData = {
        title: updatedTitle,
        content: updatedContent
      };
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chapter', chapterId] });
      
      // Get the current data from the cache
      const previousChapterData = queryClient.getQueryData(['chapter', chapterId]);
      
      // Optimistically update UI with new data
      queryClient.setQueryData(['chapter', chapterId], {
        ...chapterData,
        chapter: {
          ...chapterData.chapter,
          title: updatedTitle,
          content: updatedContent,
          updatedAt: new Date().toISOString()
        }
      });

      // Set relevant novel query data as stale to ensure it refreshes on next access
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] });
      
      // Make the actual API call
      const { data } = await axios.put(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // On success, set isEditing to false
      setIsEditing(false);
      
      // Update the cache with the server data to ensure consistency
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
      
      // On error, refetch from server to ensure data consistency
      queryClient.refetchQueries({ queryKey: ['chapter', chapterId] });
    } finally {
      setIsSaving(false);
    }
  };

  // Add effect to initialize edit form when modal opens
  useEffect(() => {
    if (isEditing && chapter) {
      setEditedTitle(chapter.title);
      setEditedContent(chapter.content);
    }
  }, [isEditing, chapter]);

  // Show loading and error states
  if (isLoading) return <div className="loading">Loading chapter...</div>;
  if (chapterError) {
    return <div className="error">{chapterError.message}</div>;
  }
  if (!chapter || !novel) return <div className="error">Chapter not found</div>;

  return (
    <div className="chapter-container">
      {/* Chapter header with navigation and reading options */}
      <div className="chapter-header">
        <div className="chapter-navigation-header">
          <div className="title-section">
            {user?.role === 'admin' && (
              <div className="admin-actions">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="edit-chapter-btn">
                    Edit Chapter
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
        <div className="reading-options">
          <button onClick={decreaseFontSize} className="font-button">A-</button>
          <button onClick={increaseFontSize} className="font-button">A+</button>
        </div>
      </div>

      {/* Chapter navigation */}
      <div className="chapter-navigation">
        <button 
          onClick={handlePrevChapter} 
          disabled={!chapter?.prevChapter || isNavigating || isEditing}
          className={`nav-button ${!chapter?.prevChapter ? 'nav-button-disabled' : ''}`}
          title={chapter?.prevChapter ? `Previous: ${chapter.prevChapter.title}` : 'No previous chapter available'}
        >
          {isNavigating ? 'Loading...' : (chapter?.prevChapter ? '← Previous Chapter' : 'No Previous Chapter')}
        </button>
        <button 
          onClick={handleNextChapter}
          disabled={!chapter?.nextChapter || isNavigating || isEditing}
          className={`nav-button ${!chapter?.nextChapter ? 'nav-button-disabled' : ''}`}
          title={chapter?.nextChapter ? `Next: ${chapter.nextChapter.title}` : 'No next chapter available'}
        >
          {isNavigating ? 'Loading...' : (chapter?.nextChapter ? 'Next Chapter →' : 'No Next Chapter')}
        </button>
      </div>

      {/* Chapter content with dynamic font size and safe HTML rendering */}
      {isEditing ? (
        <div className="chapter-content editor-container">
          <Editor
            apiKey={config.tinymceApiKey}
            onInit={(evt, editor) => {
              editorRef.current = editor;
              editor.setContent(chapter.content);
            }}
            value={editedContent}
            onEditorChange={(content) => {
              setEditedContent(content);
            }}
            init={{
              height: 500,
              menubar: false,
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'
              ],
              toolbar: 'undo redo | formatselect | ' +
                'bold italic underline strikethrough | ' +
                'alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | ' +
                'link image | removeformat | help',
              content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
              skin: 'oxide',
              content_css: 'default',
              statusbar: false,
              resize: false,
              branding: false,
              promotion: false,
              paste_data_images: true,
              images_upload_handler: (blobInfo) => {
                return new Promise((resolve, reject) => {
                  const formData = new FormData();
                  formData.append('file', blobInfo.blob(), blobInfo.filename());
                  formData.append('upload_preset', config.cloudinary.uploadPresets.illustration);
                  formData.append('folder', 'novel-illustrations');

                  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`;

                  fetch(cloudinaryUrl, {
                    method: 'POST',
                    body: formData
                  })
                  .then(response => response.json())
                  .then(result => {
                    if (result.secure_url) {
                      resolve(result.secure_url);
                    } else {
                      reject('Image upload failed');
                    }
                  })
                  .catch(error => {
                    console.error('Cloudinary upload error:', error);
                    reject('Image upload failed');
                  });
                });
              }
            }}
          />
        </div>
      ) : (
        <div 
          className="chapter-content"
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={getSafeHtml(chapter.content)}
        />
      )}

      {/* Bottom chapter navigation */}
      <div className="chapter-navigation bottom">
        <button 
          onClick={handlePrevChapter} 
          disabled={!chapter?.prevChapter || isNavigating || isEditing}
          className={`nav-button ${!chapter?.prevChapter ? 'nav-button-disabled' : ''}`}
          title={chapter?.prevChapter ? `Previous: ${chapter.prevChapter.title}` : 'No previous chapter available'}
        >
          {isNavigating ? 'Loading...' : (chapter?.prevChapter ? '← Previous Chapter' : 'No Previous Chapter')}
        </button>
        <button 
          onClick={handleNextChapter}
          disabled={!chapter?.nextChapter || isNavigating || isEditing}
          className={`nav-button ${!chapter?.nextChapter ? 'nav-button-disabled' : ''}`}
          title={chapter?.nextChapter ? `Next: ${chapter.nextChapter.title}` : 'No next chapter available'}
        >
          {isNavigating ? 'Loading...' : (chapter?.nextChapter ? 'Next Chapter →' : 'No Next Chapter')}
        </button>
      </div>

      {/* Comments section */}
      <div className="chapter-comments">
        <CommentSection 
          contentId={`${novelId}-${chapterId}`} 
          contentType="chapters"
          initialComments={comments}
          isLoading={isCommentsLoading}
        />
      </div>
    </div>
  );
};

export default Chapter; 