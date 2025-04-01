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

/**
 * Chapter Component
 * 
 * Main component that displays and manages a single chapter of a novel
 * 
 * @param {Object} props - No props required, uses URL parameters
 */
const Chapter = () => {
  // Get novel and chapter IDs from URL parameters
  const { novelId, chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management for chapter data and UI
  const [chapter, setChapter] = useState(null);
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(16);

  // Add new state for edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const editorRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Fetches chapter and novel data when component mounts or parameters change
   */
  useEffect(() => {
    const fetchChapterAndNovel = async () => {
      try {
        if (!chapterId) {
          console.error('No chapterId provided');
          setError('Invalid chapter ID');
          setLoading(false);
          navigate(`/novel/${novelId}`);
          return;
        }

        // Fetch novel data first
        const novelRes = await axios.get(`${config.backendUrl}/api/novels/${novelId}`);
        setNovel(novelRes.data);
        
        // Fetch the specific chapter directly
        const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);
        
        if (!chapterRes.data) {
          setError('Chapter not found');
          setLoading(false);
          navigate(`/novel/${novelId}`);
          return;
        }

        const currentChapter = chapterRes.data;
        
        // Fetch all chapters from the same module to determine prev/next
        const moduleChaptersRes = await axios.get(`${config.backendUrl}/api/chapters/module/${currentChapter.moduleId}`);
        const moduleChapters = moduleChaptersRes.data.sort((a, b) => a.order - b.order);
        
        // Find current chapter index
        const currentIndex = moduleChapters.findIndex(ch => ch._id === chapterId);
        
        // Set chapter data with prev/next information
        setChapter({
          ...currentChapter,
          prevChapter: currentIndex > 0 ? moduleChapters[currentIndex - 1] : null,
          nextChapter: currentIndex < moduleChapters.length - 1 ? moduleChapters[currentIndex + 1] : null
        });

        setLoading(false);
        setIsNavigating(false);
      } catch (err) {
        console.error('Error fetching chapter:', err);
        setError(err.response?.data?.message || 'Failed to load chapter');
        setLoading(false);
        setIsNavigating(false);
        navigate(`/novel/${novelId}`);
      }
    };

    fetchChapterAndNovel();
  }, [novelId, chapterId, navigate]);

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
   * Navigates to the previous chapter if available
   */
  const handlePrevChapter = async () => {
    if (chapter?.prevChapter) {
      setIsNavigating(true);
      await scrollToTop();
      navigate(`/novel/${novelId}/chapter/${chapter.prevChapter._id}`);
    }
  };

  /**
   * Navigates to the next chapter if available
   */
  const handleNextChapter = async () => {
    if (chapter?.nextChapter) {
      setIsNavigating(true);
      await scrollToTop();
      navigate(`/novel/${novelId}/chapter/${chapter.nextChapter._id}`);
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
      await axios.delete(
        `${config.backendUrl}/api/chapters/${chapter._id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Navigate back to novel page after deletion
      navigate(`/novel/${novelId}`);
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      setError('Failed to delete chapter. Please try again.');
    }
  };

  // Add new function to handle chapter edit
  const handleEditChapter = async () => {
    try {
      setIsSaving(true);
      await axios.put(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        {
          title: editedTitle,
          content: editorRef.current.getContent()
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Refresh chapter data
      const chapterRes = await axios.get(`${config.backendUrl}/api/chapters/${chapterId}`);
      if (chapterRes.data) {
        setChapter(chapterRes.data);
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update chapter:', err);
      setError('Failed to update chapter. Please try again.');
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

  // Show loading state while fetching data
  if (loading) return <div className="loading">Loading chapter...</div>;
  
  // Show error state if something went wrong
  if (error) return <div className="error">{error}</div>;
  
  // Show error if chapter or novel data is missing
  if (!chapter || !novel) return <div className="error">Chapter not found</div>;

  return (
    <div className="chapter-container">
      {/* Chapter header with navigation and reading options */}
      <div className="chapter-header">
        <div className="chapter-navigation-header">
          <div className="title-section">
            <Link to={`/novel/${novelId}`}>{novel.title}</Link>
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

      {/* Top chapter navigation */}
      <div className="chapter-navigation">
        <button 
          onClick={handlePrevChapter} 
          disabled={!chapter?.prevChapter || isNavigating}
          className="nav-button"
        >
          {isNavigating ? 'Loading...' : '← Previous Chapter'}
        </button>
        <button 
          onClick={handleNextChapter}
          disabled={!chapter?.nextChapter || isNavigating}
          className="nav-button"
        >
          {isNavigating ? 'Loading...' : 'Next Chapter →'}
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
          disabled={!chapter?.prevChapter || isNavigating}
          className="nav-button"
        >
          {isNavigating ? 'Loading...' : '← Previous Chapter'}
        </button>
        <button 
          onClick={handleNextChapter}
          disabled={!chapter?.nextChapter || isNavigating}
          className="nav-button"
        >
          {isNavigating ? 'Loading...' : 'Next Chapter →'}
        </button>
      </div>

      {/* Comments section */}
      <div className="chapter-comments">
        <CommentSection contentId={`${novelId}-${chapterId}`} contentType="chapters" />
      </div>
    </div>
  );
};

export default Chapter; 