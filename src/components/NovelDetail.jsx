/**
 * NovelDetail Component
 * 
 * Displays detailed information about a novel including:
 * - Cover image and basic information
 * - Novel description and metadata
 * - Chapter list with pagination
 * - Reading progress tracking
 * - Bookmark functionality
 * - Author information
 * - Status indicators
 * 
 * Features:
 * - Tabbed interface for chapters and comments
 * - Admin controls for chapter management
 * - Bookmark system integration
 * - Login prompt for authenticated actions
 * - Responsive layout
 * - Navigation breadcrumbs
 */

import { useState, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from './auth/Modal';
import axios from 'axios';
import '../styles/components/NovelDetail.css';
import config from '../config/config';
import { useBookmarks } from '../context/BookmarkContext';
import { useNovelStatus } from '../context/NovelStatusContext';
import { useNovel } from '../context/NovelContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Lazy load components that exist as separate files
const Login = lazy(() => import('./auth/Login'));
const CommentSection = lazy(() => import('./CommentSection'));

// Utility functions
const formatDateUtil = (date) => {
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

const isChapterNew = (date) => {
  if (!date) return false;
  
  try {
    const chapterDate = new Date(date);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return chapterDate > threeDaysAgo;
    } catch (err) {
    console.error('Date comparison error:', err);
      return false;
    }
};

const truncateHTML = (html, maxLength) => {
  if (!html) return '';
  
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  
  if (text.length <= maxLength) {
    return html;
  }

  let truncated = '';
  let currentLength = 0;
  const words = html.split(/(<[^>]*>|\s+)/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordLength = word.replace(/<[^>]*>/g, '').length;

    if (currentLength + wordLength > maxLength) {
      break;
    }

    truncated += word;
    if (!word.match(/<[^>]*>/)) {
      currentLength += wordLength;
    }
  }

  return truncated + '...';
};

// Memoized Components
const ModuleForm = memo(({ 
  moduleForm, 
  setModuleForm, 
  handleModuleSubmit, 
  handleModuleCoverUpload, 
  handleModuleFormToggle, 
  editingModule 
}) => (
  <div className="module-form">
    <h4>{editingModule ? 'Edit Module' : 'Add New Module'}</h4>
    {moduleForm.error && <div className="form-error">{moduleForm.error}</div>}
    <form onSubmit={handleModuleSubmit}>
      <div className="form-group">
        <label>Title:</label>
        <input
          type="text"
          value={moduleForm.title}
          onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter module title"
          required
        />
      </div>
      <div className="form-group">
        <label>Cover Image:</label>
        <div className="cover-upload">
          {moduleForm.coverImage && (
            <img
              src={moduleForm.coverImage}
              alt="Cover preview"
              className="cover-preview"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleModuleCoverUpload}
            id="cover-upload"
            style={{ display: 'none' }}
          />
          <label htmlFor="cover-upload" className="upload-btn">
            {moduleForm.loading ? 'Uploading...' : 'Upload Cover'}
          </label>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={moduleForm.loading}>
          {editingModule ? 'Update Module' : 'Create Module'}
        </button>
        <button type="button" onClick={handleModuleFormToggle}>
          Cancel
        </button>
      </div>
    </form>
  </div>
));

const ModuleChapters = memo(({ 
  chapters, 
  novelId, 
  moduleId, 
  user, 
  handleChapterReorder 
}) => (
  <div className="module-chapters">
    {chapters.map((chapter, chapterIndex, chapterArray) => (
      <div key={chapter._id} className="chapter-item">
        {user?.role === 'admin' && (
          <div className="chapter-reorder-buttons">
            <button 
              className={`reorder-btn ${chapterIndex === 0 ? 'hidden' : ''}`}
              onClick={() => handleChapterReorder(moduleId, chapter._id, 'up')}
              title="Move chapter up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
            <button 
              className={`reorder-btn ${chapterIndex === chapterArray.length - 1 ? 'hidden' : ''}`}
              onClick={() => handleChapterReorder(moduleId, chapter._id, 'down')}
              title="Move chapter down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>
        )}
        <Link to={`/novel/${novelId}/chapter/${chapter._id}`}>
          {chapter.title}
          {isChapterNew(chapter.createdAt) && <span className="new-tag">NEW</span>}
        </Link>
        <span className="chapter-date">
          {formatDateUtil(chapter.createdAt)}
        </span>
      </div>
    ))}
  </div>
));

const NovelInfo = memo(({ novel, genres, status, totalChapters }) => (
  <div className="detail-page-novel-details">
    <div className="detail-row">
      <span className="label">Alt name(s):</span>
      <span className="value">{novel.alternativeTitles?.join('; ') || 'N/A'}</span>
    </div>
    <div className="detail-row">
      <span className="label">Author(s):</span>
      <span className="value">{novel.author}</span>
    </div>
    <div className="detail-row">
      <span className="label">Staff:</span>
      <span className="value">{novel.staff || 'N/A'}</span>
    </div>
    <div className="detail-row">
      <span className="label">Genres:</span>
      <div className="genres-list">
        {genres && genres.length > 0 ? (
          genres.map(genre => (
            <Link key={genre} to={`/genres/${genre.toLowerCase()}`} className="genre-tag">
              {genre}
            </Link>
          ))
        ) : (
          <span className="value">N/A</span>
        )}
      </div>
    </div>
    <div className="detail-row">
      <span className="label">Status:</span>
      <span className="value">{status}</span>
    </div>
    <div className="detail-row">
      <span className="label">Total Chapters:</span>
      <span className="value">{totalChapters}</span>
    </div>
  </div>
));

// Utility functions moved outside component
const getCloudinaryUrl = (url, width = 300) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
};

const processDescription = (description, maxLength) => {
  if (!description) return { text: '', needsReadMore: false };
  const div = document.createElement('div');
  div.innerHTML = description;
  const text = div.textContent || '';
  return {
    text: text.length > maxLength ? text.slice(0, maxLength) + '...' : text,
    needsReadMore: text.length > maxLength
  };
};

// API functions
const api = {
  fetchNovelWithModules: async (novelId) => {
    const response = await axios.get(`${config.backendUrl}/api/novels/${novelId}`);
    if (!response.data) {
      throw new Error('No data received');
    }
    return response.data;
  },

  checkBookmarkStatus: async (username, novelId) => {
    if (!username || !novelId) return false;
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/${username}/bookmarks/${novelId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data.isBookmarked;
    } catch (err) {
      console.error('Failed to check bookmark status:', err);
      return false;
    }
  },

  toggleBookmark: async ({ username, novelId, isBookmarked }) => {
    if (isBookmarked) {
        await axios.delete(
        `${config.backendUrl}/api/users/${username}/bookmarks/${novelId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      } else {
      await axios.post(
        `${config.backendUrl}/api/users/${username}/bookmarks`,
        { novelId },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
    }
  },

  reorderChapter: async ({ moduleId, chapterId, direction }) => {
    const response = await axios.put(
      `${config.backendUrl}/api/novels/${novelId}/modules/${moduleId}/chapters/reorder`,
      {
        chapterId,
        direction
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
    return response.data;
  },

  createModule: async (novelId, moduleData) => {
        const response = await axios.post(
      `${config.backendUrl}/api/novels/${novelId}/modules`,
      moduleData,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
    return response.data;
  },

  updateModule: async (novelId, moduleId, moduleData) => {
    const response = await axios.put(
      `${config.backendUrl}/api/novels/${novelId}/modules/${moduleId}`,
      moduleData,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  },

  uploadModuleCover: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'val-js'); // Your Cloudinary upload preset

    const response = await axios.post(
      'https://api.cloudinary.com/v1_1/your-cloud-name/image/upload',
      formData
    );
    return response.data.secure_url;
  }
};

// Handlers moved outside component
const handleModuleFormToggle = (setShowModuleForm, setModuleForm, setEditingModule) => {
  setShowModuleForm(prev => !prev);
    setModuleForm({
      title: '',
      coverImage: '',
      loading: false,
      error: ''
    });
    setEditingModule(null);
  };

/**
 * NovelDetail Component
 * 
 * Main component that displays comprehensive information about a novel
 * and manages user interactions with the novel content.
 * 
 * @param {Object} props - No props required, uses URL parameters
 */
const NovelDetail = () => {
  const { novelId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Local UI state
  const [uiState, setUiState] = useState({
    activeTab: 'chapters',
    isLoginOpen: false,
    bookmarkNotice: ''
  });

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    coverImage: '',
      loading: false,
      error: ''
    });
  const [editingModule, setEditingModule] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    announcement: false
  });

  // Single query for both novel and modules data
  const { 
    data: novelData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: () => api.fetchNovelWithModules(novelId),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    cacheTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const novel = novelData?.novel;
  const modules = novelData?.modules || [];

  const {
    data: isBookmarked,
    isLoading: isBookmarkLoading
  } = useQuery({
    queryKey: ['bookmark', user?.username, novelId],
    queryFn: () => api.checkBookmarkStatus(user?.username, novelId),
    enabled: !!user?.username && !!novelId,
    staleTime: 1000 * 60 * 5
  });

  // Mutations
  const bookmarkMutation = useMutation({
    mutationFn: api.toggleBookmark,
    onMutate: async ({ isBookmarked }) => {
      // Optimistically update UI
      await queryClient.cancelQueries({ queryKey: ['bookmark', user?.username, novelId] });
      const previousValue = queryClient.getQueryData(['bookmark', user?.username, novelId]);
      queryClient.setQueryData(['bookmark', user?.username, novelId], !isBookmarked);
      return { previousValue };
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      queryClient.setQueryData(['bookmark', user?.username, novelId], context.previousValue);
      setUiState(prev => ({
        ...prev,
        bookmarkNotice: 'Failed to update bookmark. Please try again.'
      }));
    },
    onSettled: () => {
      // Refresh bookmark data
      queryClient.invalidateQueries({ queryKey: ['bookmark', user?.username, novelId] });
      setTimeout(() => setUiState(prev => ({ ...prev, bookmarkNotice: '' })), 3000);
    }
  });

  // Chapter reorder mutation
  const chapterReorderMutation = useMutation({
    mutationFn: api.reorderChapter,
    onMutate: async ({ moduleId, chapterId, direction }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['modules', novelId] });

      // Snapshot the previous value
      const previousModules = queryClient.getQueryData(['modules', novelId]);

      // Optimistically update the modules
      queryClient.setQueryData(['modules', novelId], old => {
        if (!old) return old;
        
        return old.map(module => {
          if (module._id === moduleId) {
            const chapters = [...module.chapters];
          const currentIndex = chapters.findIndex(ch => ch._id === chapterId);
          const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

          if (currentIndex === -1 || newIndex < 0 || newIndex >= chapters.length) {
              return module;
          }

          // Swap chapters
          [chapters[currentIndex], chapters[newIndex]] = [chapters[newIndex], chapters[currentIndex]];
          
          // Update prev/next references
          chapters.forEach((chapter, index) => {
            chapter.prevChapter = index > 0 ? chapters[index - 1] : null;
            chapter.nextChapter = index < chapters.length - 1 ? chapters[index + 1] : null;
          });

            return { ...module, chapters };
          }
          return module;
        });
      });

      return { previousModules };
    },
    onError: (err, variables, context) => {
      // Revert back to the previous value if there's an error
      queryClient.setQueryData(['modules', novelId], context.previousModules);
      console.error('Failed to reorder chapters:', err);
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['modules', novelId] });
    },
  });

  // Module mutations
  const createModuleMutation = useMutation({
    mutationFn: (moduleData) => api.createModule(novelId, moduleData),
    onSuccess: () => {
      queryClient.invalidateQueries(['modules', novelId]);
      setShowModuleForm(false);
      setModuleForm({
        title: '',
        coverImage: '',
        loading: false,
        error: ''
      });
    },
    onError: (error) => {
      setModuleForm(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to create module'
      }));
    }
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, moduleData }) => api.updateModule(novelId, moduleId, moduleData),
    onSuccess: () => {
      queryClient.invalidateQueries(['modules', novelId]);
      setShowModuleForm(false);
    setModuleForm({
        title: '',
        coverImage: '',
      loading: false,
      error: ''
    });
      setEditingModule(null);
    },
    onError: (error) => {
      setModuleForm(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to update module'
      }));
    }
  });

  // Handler for module cover image upload
  const handleModuleCoverUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setModuleForm(prev => ({ ...prev, loading: true, error: '' }));
      const imageUrl = await api.uploadModuleCover(file);
      setModuleForm(prev => ({
        ...prev,
        coverImage: imageUrl,
        loading: false
      }));
    } catch (error) {
      console.error('Error uploading cover:', error);
      setModuleForm(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to upload cover image'
      }));
    }
  }, []);

  // Handler for module form submission
  const handleModuleSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (!moduleForm.title) {
      setModuleForm(prev => ({
        ...prev,
        error: 'Title is required'
      }));
      return;
    }

    const moduleData = {
      title: moduleForm.title,
      coverImage: moduleForm.coverImage
    };

    try {
      if (editingModule) {
        await updateModuleMutation.mutateAsync({
          moduleId: editingModule._id,
          moduleData
        });
      } else {
        await createModuleMutation.mutateAsync(moduleData);
      }
    } catch (error) {
      console.error('Error submitting module:', error);
      // Error handling is done in mutation callbacks
    }
  }, [moduleForm, editingModule, createModuleMutation, updateModuleMutation]);

  // Handler for module form toggle
  const handleModuleFormToggle = useCallback(() => {
    setShowModuleForm(prev => !prev);
    setModuleForm({
      title: '',
      coverImage: '',
      loading: false,
      error: ''
    });
    setEditingModule(null);
  }, []);

  // Handler for module edit
  const handleModuleEdit = useCallback((module) => {
    setEditingModule(module);
    setModuleForm({
      title: module.title,
      coverImage: module.coverImage,
      loading: false,
      error: ''
    });
    setShowModuleForm(true);
  }, []);

  // Handler for module delete
  const handleModuleDelete = useCallback(async (moduleId) => {
    if (!window.confirm('Are you sure you want to delete this module?')) {
      return;
    }

    try {
      await axios.delete(
        `${config.backendUrl}/api/novels/${novelId}/modules/${moduleId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Immediately remove the deleted module from the cache
      queryClient.setQueryData(['modules', novelId], (old) => {
        if (!old) return old;
        return old.filter(module => module._id !== moduleId);
      });

      // Then invalidate to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['modules', novelId] });
      await queryClient.refetchQueries({ queryKey: ['modules', novelId] });

    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module');
    }
  }, [novelId, queryClient]);

  // Memoized values with optimized sorting
  const sortedModules = useMemo(() => {
    if (!modules) return [];
    return modules.map(module => ({
      ...module,
      // Chapters are already sorted from the backend, but we'll ensure it here just in case
      chapters: module.chapters?.sort((a, b) => a.order - b.order) || []
    })).sort((a, b) => a.order - b.order);
  }, [modules]);

  const totalChapters = useMemo(() => {
    return modules?.reduce((total, module) => total + (module.chapters?.length || 0), 0) || 0;
  }, [modules]);

  const processedDescription = useMemo(() => {
    return processDescription(novel?.description, 900);
  }, [novel?.description]);

  const processedAnnouncement = useMemo(() => {
    return processDescription(novel?.note, 900);
  }, [novel?.note]);

  // Handlers
  const handleBookmarkClick = useCallback(() => {
    if (!user) {
      setUiState(prev => ({ ...prev, isLoginOpen: true }));
      return;
    }

    bookmarkMutation.mutate({
      username: user.username,
      novelId: novel._id,
      isBookmarked: isBookmarked
    });
  }, [user, novel?._id, isBookmarked, bookmarkMutation]);

  // Handler for chapter reordering
  const handleChapterReorder = useCallback(async (moduleId, chapterId, direction) => {
    try {
      await chapterReorderMutation.mutateAsync({
        moduleId,
        chapterId,
        direction,
        novelId // Add this to the mutation variables
      });
    } catch (err) {
      console.error('Failed to reorder chapter:', err);
    }
  }, [chapterReorderMutation]);

  // Render methods
  const renderDescription = useMemo(() => {
    if (!novel?.description) return null;
    
    return (
      <div className="detail-page-novel-description">
        <div dangerouslySetInnerHTML={{ 
          __html: expandedSections.description 
            ? novel.description
            : processedDescription.text
        }} />
        {processedDescription.needsReadMore && (
          <button 
            className="read-more-btn"
            onClick={() => setExpandedSections(prev => ({ 
              ...prev, 
              description: !prev.description 
            }))}
          >
            {expandedSections.description ? 'Show Less' : 'Read More'}
          </button>
        )}
      </div>
    );
  }, [novel?.description, expandedSections.description, processedDescription]);

  // Loading states
  if (isLoading) {
    return (
      <div className="loading">
        <div>Loading novel details...</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  // Error states
  if (error) {
    return (
      <div className="error">
        <div>Error: {error.message}</div>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }
  
  if (!novel) {
    return (
      <div className="error">
        <div>Novel not found</div>
        <Link to="/" className="back-home-btn">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="novel-detail-container">
      {/* Navigation breadcrumbs */}
      <div className="novel-breadcrumb">
        <Link to="/">Home</Link><span> / </span>
        <Link to="/novel-directory/page/1">Novels</Link><span> / </span>
        <span>{novel.title}</span>
      </div>

      {/* Novel title */}
      <div className="novel-header">
        <h1 className="detail-page-novel-title">{novel.title}</h1>
      </div>

      {/* Novel information section */}
      <div className="novel-info-section">
        {/* Cover image and action buttons */}
        <div className="novel-cover-section">
          <img 
            src={getCloudinaryUrl(novel?.illustration)} 
            alt={novel?.title} 
            className="detail-page-novel-cover"
            loading="eager" // Important cover image
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getCloudinaryUrl('https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png');
            }}
          />
          <div className="novel-actions">
            {sortedModules.length > 0 && sortedModules[0].chapters.length > 0 ? (
              <Link 
                to={`/novel/${novelId}/chapter/${sortedModules[0].chapters[0]._id}`}
                className="first-chapter-btn"
              >
                ⯈ First Chapter
              </Link>
            ) : (
              <button className="first-chapter-btn disabled" disabled>
                ⯈ First Chapter
              </button>
            )}
            <button 
              className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
              onClick={handleBookmarkClick}
              disabled={isBookmarkLoading}
              title={isBookmarked ? "Remove from bookmarks in bookmarks page" : "Add to bookmarks"}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill={isBookmarked ? "currentColor" : "none"}
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="bookmark-icon"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              {isBookmarked ? 'Bookmarked' : '+ Bookmark'}
            </button>
          </div>
          {/* Bookmark action notice */}
          {uiState.bookmarkNotice && (
            <div className={`bookmark-notice ${uiState.bookmarkNotice.includes('Failed') ? 'error' : 'success'}`}>
              {uiState.bookmarkNotice}
            </div>
          )}
        </div>

        {/* Novel details */}
        <NovelInfo 
          novel={novel} 
          genres={novel?.genres}
          status={novel?.status || 'Ongoing'}
          totalChapters={totalChapters}
        />
      </div>

      {/* Novel description */}
      <div className="description-box">
        <h2>DESCRIPTION</h2>
        {renderDescription}
        {novel.note && (
          <>
            <h2>ANNOUNCEMENT</h2>
            <div className="detail-page-novel-announcement">
              <div dangerouslySetInnerHTML={{ 
                __html: expandedSections.announcement 
                  ? novel.note
                  : processedAnnouncement.text
              }} />
              {processedAnnouncement.needsReadMore && (
                  <button 
                    className="read-more-btn"
                  onClick={() => setExpandedSections(prev => ({ 
                    ...prev, 
                    announcement: !prev.announcement 
                  }))}
                  >
                    {expandedSections.announcement ? 'Show Less' : 'Read More'}
                  </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Content tabs */}
      <div className="content-tabs">
        <button 
          className={`tab-btn ${uiState.activeTab === 'chapters' ? 'active' : ''}`}
          onClick={() => setUiState(prev => ({ ...prev, activeTab: 'chapters' }))}
        >
          Chapters
        </button>
        <button 
          className={`tab-btn ${uiState.activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setUiState(prev => ({ ...prev, activeTab: 'comments' }))}
        >
          Comments
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {uiState.activeTab === 'chapters' ? (
          // Chapters list
          <div className="chapters-list">
            <div className="chapters-header">
              <h3>{(() => {
                const moduleChapters = modules.reduce((total, module) => total + (module.chapters?.length || 0), 0);
                return moduleChapters;
              })()} Chapter(s)</h3>
              <div className="chapter-controls">
                {user?.role === 'admin' && (
                  <button onClick={() => {
                    setShowModuleForm(true);
                    setModuleForm({
                      title: '',
                      coverImage: '',
                      loading: false,
                      error: ''
                    });
                    setEditingModule(null);
                  }} className="add-module-btn">
                    <span className="plus-icon">+</span>
                    Add Module
                  </button>
                )}
              </div>
            </div>

            {/* Modules Section */}
            <div className="modules-section">
              {showModuleForm && (
                <ModuleForm 
                  moduleForm={moduleForm} 
                  setModuleForm={setModuleForm} 
                  handleModuleSubmit={handleModuleSubmit} 
                  handleModuleCoverUpload={handleModuleCoverUpload} 
                  handleModuleFormToggle={handleModuleFormToggle}
                  editingModule={editingModule} 
                />
              )}

              <div className="modules-list">
                {sortedModules.map((module, index) => (
                  <div key={module._id} className="module-wrapper">
                    {user?.role === 'admin' && (
                      <div className="reorder-buttons">
                        {index !== 0 && (
                          <button
                            className="reorder-btn up"
                            onClick={() => handleChapterReorder(module._id, module.chapters[0]._id, 'up')}
                            title="Move up"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 19V5M12 5L5 12M12 5L19 12" />
                            </svg>
                          </button>
                        )}
                        {index !== modules.length - 1 && (
                          <button
                            className="reorder-btn down"
                            onClick={() => handleChapterReorder(module._id, module.chapters[module.chapters.length - 1]._id, 'down')}
                            title="Move down"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5V19M12 19L5 12M12 19L19 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="module-container">
                      <div className="module-info">
                        <img 
                          src={module.coverImage || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'} 
                          alt={module.title} 
                          className="module-cover"
                        />
                        <h3>{module.title}</h3>
                      </div>
                      
                      <div className="module-content">
                        {user?.role === 'admin' && (
                          <div className="module-header">
                            <div className="module-controls">
                              <button
                                onClick={() => {
                                  setEditingModule(module);
                                  setShowModuleForm(true);
                                }}
                                className="edit-module-btn"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleModuleDelete(module._id)}
                                className="delete-module-btn"
                              >
                                Delete
                              </button>
                              <Link
                                to={`/novel/${novelId}/chapter/add?moduleId=${module._id}`}
                                className="add-chapter-btn"
                                state={{ returnTo: location.pathname }}
                              >
                                + Add Chapter
                              </Link>
                            </div>
                          </div>
                        )}

                        <div className="module-chapters">
                          {module.chapters && module.chapters.length > 0 && (
                            <ModuleChapters
                              chapters={module.chapters}
                              novelId={novelId}
                              moduleId={module._id}
                              user={user}
                              handleChapterReorder={handleChapterReorder}
                            />
                          )}
                                  </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Comments section
          <Suspense fallback={<div>Loading comments...</div>}>
            <CommentSection contentId={novelId} contentType="novels" />
          </Suspense>
        )}
      </div>

      {/* Login modal */}
      <Suspense fallback={<div>Loading login form...</div>}>
      <Modal 
        isOpen={uiState.isLoginOpen} 
        onClose={() => setUiState(prev => ({ ...prev, isLoginOpen: false }))}
        title="LOG IN"
      >
        <Login 
          onClose={() => setUiState(prev => ({ ...prev, isLoginOpen: false }))}
          onSignUp={() => {
            setUiState(prev => ({ ...prev, isLoginOpen: false }));
          }}
        />
      </Modal>
      </Suspense>
    </div>
  );
};

export default memo(NovelDetail); 
