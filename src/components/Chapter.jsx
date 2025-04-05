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
import { CommentIcon, LockIcon } from './novel-detail/NovelIcons';

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
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

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
   * Safely renders HTML content with minimal processing
   * @param {string} content - HTML content to render
   * @returns {string} Sanitized HTML
   */
  const getSafeHtml = (content) => {
    if (!content) return { __html: '' };
    
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
      
      // Get raw HTML content directly from TinyMCE editor
      const updatedTitle = editedTitle;
      const updatedContent = editorRef.current.getContent({
        format: 'html',  // Get as HTML
        raw: true       // Get raw unprocessed HTML
      });
      
      // Create update data object
      const updateData = {
        title: updatedTitle,
        content: updatedContent
      };
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chapter', chapterId] });
      
      // Get the current data from the cache
      const previousChapterData = queryClient.getQueryData(['chapter', chapterId]);
      
      // Optimistically update UI with new data - raw HTML is preserved
      queryClient.setQueryData(['chapter', chapterId], {
        ...chapterData,
        chapter: {
          ...chapterData.chapter,
          title: updatedTitle,
          content: updatedContent, // Raw HTML preserved in cache
          updatedAt: new Date().toISOString()
        }
      });

      // Set relevant novel query data as stale to ensure it refreshes on next access
      queryClient.invalidateQueries({ queryKey: ['novel', novelId] });
      
      // Make the API call - axios will automatically set the correct content-type
      const { data } = await axios.put(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json' // Ensure proper content type
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
      // Unescape HTML before setting editor content
      setEditedContent(unescapeHtml(chapter.content || ''));
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
              // Set raw HTML content directly
              if (chapter?.content) {
                editor.setContent(chapter.content, { format: 'raw' });
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
                'preview'
              ],
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
              paste_preprocess: function(plugin, args) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = args.content;

                // First remove all Word-specific tags and junk
                wrapper.querySelectorAll('table, td, tr, colgroup, col').forEach(el => el.remove());
                
                // Remove empty and problematic spans
                wrapper.querySelectorAll('span').forEach(span => {
                  if (!span.textContent.trim()) {
                    span.remove(); // Remove empty spans
                  } else {
                    // Replace nested spans with their content
                    const text = document.createTextNode(span.textContent);
                    span.replaceWith(text);
                  }
                });
                
                // Strip unnecessary div wrappers that might cause layout issues
                wrapper.querySelectorAll('div:not(.WordSection1):not(.WordSection2):not(.WordSection3)').forEach(div => {
                  if (div.children.length === 0 || div.textContent.trim() === '') {
                    div.remove();
                  } else if (div.children.length === 1 && div.children[0].nodeName === 'P') {
                    // Unwrap divs that just contain a single paragraph
                    div.replaceWith(div.children[0]);
                  }
                });

                // Clean up section breaks and format as proper breaks
                args.content = wrapper.innerHTML
                  .replace(/<!--Section Break-->/g, '<br clear="all">')
                  .replace(/<!--\s*Section\s*Break\s*\([^)]*\)\s*-->/g, '<br clear="all">')
                  // Replace multiple consecutive breaks with a single one
                  .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<br\s*\/?>/g, '<br clear="all">');
              },
              paste_postprocess: function(plugin, args) {
                // Additional cleanup after paste
                args.node.querySelectorAll('span').forEach(span => {
                  span.style.display = 'inline';
                  span.style.wordBreak = 'normal';
                  span.style.whiteSpace = 'normal';
                });
              },
              setup: function(editor) {
                editor.on('BeforeSetContent', function(e) {
                  // Ensure content is treated as raw HTML
                  e.format = 'raw';
                });
                editor.on('GetContent', function(e) {
                  // Ensure we get raw HTML when retrieving content
                  e.format = 'raw';
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

      {/* Comments section with toggle */}
      <div className="novel-comments-section">
        <button
          className="comments-toggle-btn" 
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
        >
          {isCommentsOpen ? (
            <>
              <LockIcon size={18} style={{ marginRight: '8px' }} />
              Hide Comments
            </>
          ) : (
            <>
              <CommentIcon size={18} style={{ marginRight: '8px' }} />
              Show Comments
            </>
          )}
        </button>
        
        {isCommentsOpen && (
          <CommentSection 
            novelId={`${novelId}-${chapterId}`}
            user={user}
            isAuthenticated={!!user}
          />
        )}
      </div>
    </div>
  );
};

export default Chapter; 