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

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from './auth/Modal';
import Login from './auth/Login';
import axios from 'axios';
import '../styles/components/NovelDetail.css';
import CommentSection from './CommentSection';
import config from '../config/config';
import { useBookmarks } from '../context/BookmarkContext';
import { useNovelStatus } from '../context/NovelStatusContext';
import { useNovel } from '../context/NovelContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

/**
 * NovelDetail Component
 * 
 * Main component that displays comprehensive information about a novel
 * and manages user interactions with the novel content.
 * 
 * @param {Object} props - No props required, uses URL parameters
 */
const NovelDetail = () => {
  // Get novel ID from URL parameters
  const { novelId } = useParams();
  // Get user authentication context
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management with better organization
  const [novelData, setNovelData] = useState({
    novel: null,
    loading: true,
    error: null,
    isBookmarked: false
  });
  
  // Add new state for modules
  const [modules, setModules] = useState([]);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    coverImage: '',
    loading: false,
    error: ''
  });
  const [editingModule, setEditingModule] = useState(null);
  const [expandedModules, setExpandedModules] = useState([]);
  
  const [uiState, setUiState] = useState({
    activeTab: 'chapters',
    isLoginOpen: false,
    bookmarkLoading: false,
    bookmarkNotice: ''
  });

  const { updateBookmarkStatus } = useBookmarks();
  const { novelStatuses } = useNovelStatus();
  const { novelUpdates } = useNovel();

  const [expandedSections, setExpandedSections] = useState({
    description: false,
    announcement: false
  });

  // Memoized API calls
  const fetchNovel = useCallback(async () => {
    try {
      // Fetch novel data
      const novelRes = await axios.get(`${config.backendUrl}/api/novels/${novelId}`);
      if (!novelRes.data) {
        throw new Error('No novel data received');
      }

      // Fetch modules
      const modulesRes = await axios.get(`${config.backendUrl}/api/novels/${novelId}/modules`);
      if (!modulesRes.data) {
        throw new Error('No modules data received');
      }

      // Fetch chapters for each module
      const moduleChaptersPromises = modulesRes.data.map(async (module) => {
        try {
          const chaptersRes = await axios.get(`${config.backendUrl}/api/chapters/module/${module._id}`);
          return {
            moduleId: module._id,
            chapters: chaptersRes.data || []
          };
        } catch (err) {
          return {
            moduleId: module._id,
            chapters: []
          };
        }
      });

      const moduleChaptersResults = await Promise.all(moduleChaptersPromises);
      const moduleChaptersMap = moduleChaptersResults.reduce((acc, curr) => {
        acc[curr.moduleId] = curr.chapters;
        return acc;
      }, {});

      return {
        ...novelRes.data,
        modules: modulesRes.data.map(module => ({
          ...module,
          chapters: moduleChaptersMap[module._id] || []
        }))
      };
    } catch (err) {
      throw err;
    }
  }, [novelId]);

  const checkBookmarkStatus = useCallback(async (novelData) => {
    if (!user || !novelData._id) return false;
    
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/${user.username}/bookmarks/${novelData._id}`,
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
  }, [user]);

  // Add module fetching to the data fetching effect
  useEffect(() => {
    let mounted = true;
    let fetchTimeout = null;
    
    const fetchData = async () => {
      if (!mounted) return;

      try {
        // Check if there's a recent update in the context
        const novelUpdate = novelUpdates[novelId];
        if (novelUpdate && novelUpdate.lastUpdated > Date.now() - 5000) { // Within last 5 seconds
          // Use the updated data from context
          setNovelData({
            novel: novelUpdate,
            isBookmarked: novelData.isBookmarked,
            loading: false,
            error: null
          });
          setModules(novelUpdate.modules || []);
          return;
        }

        // If no recent update, fetch from API
        const novelResponse = await fetchNovel();
        if (!mounted) return;

        // Get bookmark status
        const bookmarkStatus = await checkBookmarkStatus(novelResponse);
        if (!mounted) return;
        
        setNovelData({
          novel: novelResponse,
          isBookmarked: bookmarkStatus,
          loading: false,
          error: null
        });
        setModules(novelResponse.modules || []);
      } catch (err) {
        if (!mounted) return;
        
        setNovelData(prev => ({
          ...prev,
          novel: null,
          loading: false,
          error: err.response?.data?.message || err.message || 'Failed to fetch novel details'
        }));
      }
    };

    // Start loading
    setNovelData(prev => ({ ...prev, loading: true, error: null }));
    
    // Fetch data immediately
    fetchData();
    
    return () => {
      mounted = false;
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
    };
  }, [novelId, fetchNovel, checkBookmarkStatus, novelUpdates]);

  // Memoized handlers
  const handleDeleteChapter = useCallback(async (moduleId, chapterId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this chapter?')) {
      return;
    }

    try {
      await axios.delete(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Update the modules state to remove the deleted chapter
      setModules(prevModules => 
        prevModules.map(module => {
          if (module._id === moduleId) {
            return {
              ...module,
              chapters: module.chapters.filter(ch => ch._id !== chapterId)
            };
          }
          return module;
        })
      );

      if (window.location.pathname.includes(`/chapter/${chapterId}`)) {
        navigate(`/novel/${novelId}`);
      }
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      alert('Failed to delete chapter. Please try again.');
    }
  }, [novelId, navigate]);

  const handleBookmarkClick = useCallback(async () => {
    if (!user) {
      setUiState(prev => ({ ...prev, isLoginOpen: true }));
      return;
    }

    if (!novelData.novel?._id) {
      setUiState(prev => ({ 
        ...prev, 
        bookmarkNotice: 'Unable to bookmark: Novel data not loaded'
      }));
      setTimeout(() => setUiState(prev => ({ ...prev, bookmarkNotice: '' })), 3000);
      return;
    }

    setUiState(prev => ({ ...prev, bookmarkLoading: true }));
    
    try {
      if (novelData.isBookmarked) {
        // Remove bookmark
        await axios.delete(
          `${config.backendUrl}/api/users/${user.username}/bookmarks/${novelData.novel._id}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setNovelData(prev => ({ ...prev, isBookmarked: false }));
        updateBookmarkStatus(novelData.novel._id, false);
        setUiState(prev => ({ ...prev, bookmarkNotice: 'Novel removed from bookmarks' }));
      } else {
        // Add bookmark
        const response = await axios.post(
          `${config.backendUrl}/api/users/${user.username}/bookmarks`,
          { novelId: novelData.novel._id },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        // Update state on successful bookmark
        setNovelData(prev => ({ ...prev, isBookmarked: true }));
        updateBookmarkStatus(novelData.novel._id, true);
        setUiState(prev => ({ ...prev, bookmarkNotice: 'Novel bookmarked successfully!' }));
      }
    } catch (err) {
      console.error('Failed to update bookmark:', err);
      setUiState(prev => ({ 
        ...prev, 
        bookmarkNotice: err.response?.data?.message || 
          (novelData.isBookmarked 
            ? 'Failed to remove bookmark. Please try again.'
            : 'Failed to bookmark novel. Please try again.')
      }));
    } finally {
      setUiState(prev => ({ ...prev, bookmarkLoading: false }));
      setTimeout(() => setUiState(prev => ({ ...prev, bookmarkNotice: '' })), 3000);
    }
  }, [user, novelData.novel?._id, novelData.isBookmarked, updateBookmarkStatus]);

  // Memoized derived data
  const sortedChapters = useMemo(() => {
    if (!novelData.novel?.chapters) return [];
    return [...novelData.novel.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [novelData.novel?.chapters]);

  /**
   * Handles comment submission
   * @param {Event} e - Form submission event
   */
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const response = await axios.post(`${config.backendUrl}/api/novels/${novelId}/comments`, {
        text: commentText,
        userId: user._id
      });
      setComments([...comments, response.data]);
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  // Handle module form toggle
  const handleModuleFormToggle = () => {
    setShowModuleForm(!showModuleForm);
    setModuleForm({
      title: '',
      coverImage: '',
      loading: false,
      error: ''
    });
    setEditingModule(null);
  };

  // Handle module cover upload
  const handleModuleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModuleForm(prev => ({ ...prev, error: 'Please upload an image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModuleForm(prev => ({ ...prev, error: 'Image size should be less than 5MB' }));
      return;
    }

    try {
      setModuleForm(prev => ({ ...prev, loading: true }));
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.cloudinary.uploadPresets.illustration);
      formData.append('folder', 'novel-illustrations');

      const cloudinaryResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`,
        formData
      );

      setModuleForm(prev => ({
        ...prev,
        coverImage: cloudinaryResponse.data.secure_url,
        loading: false,
        error: ''
      }));
    } catch (err) {
      setModuleForm(prev => ({
        ...prev,
        error: 'Failed to upload cover image',
        loading: false
      }));
    }
  };

  // Update module creation/update
  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    
    if (!moduleForm.title.trim()) {
      setModuleForm(prev => ({ ...prev, error: 'Title is required' }));
      return;
    }

    try {
      setModuleForm(prev => ({ ...prev, loading: true, error: '' }));
      
      if (editingModule) {
        await axios.put(
          `${config.backendUrl}/api/novels/${novelId}/modules/${editingModule._id}`,
          {
            title: moduleForm.title,
            coverImage: moduleForm.coverImage || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      } else {
        await axios.post(
          `${config.backendUrl}/api/novels/${novelId}/modules`,
          {
            title: moduleForm.title,
            coverImage: moduleForm.coverImage || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      }

      // Refresh the data
      const novelResponse = await fetchNovel();
      setModules(novelResponse.modules || []);
      
      setShowModuleForm(false);
      setModuleForm({
        title: '',
        coverImage: '',
        loading: false,
        error: ''
      });
      setEditingModule(null);
    } catch (err) {
      console.error('Failed to save module:', err);
      setModuleForm(prev => ({
        ...prev,
        error: err.response?.data?.message || 'Failed to save module. Please try again.',
        loading: false
      }));
    }
  };

  // Handle module edit
  const handleModuleEdit = (module) => {
    setEditingModule(module);
    setModuleForm({
      title: module.title,
      coverImage: module.coverImage,
      loading: false,
      error: ''
    });
    setShowModuleForm(true);
  };

  // Handle show more/less chapters
  const handleToggleExpand = (moduleId) => {
    setExpandedModules(prev => {
      if (prev.includes(moduleId)) {
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  // Add function to handle adding chapter to module
  const handleAddChapterToModule = async (moduleId, chapterId) => {
    try {
      await axios.post(
        `${config.backendUrl}/api/novels/${novelId}/modules/${moduleId}/chapters/${chapterId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Refresh modules to get updated data
      const modulesResponse = await axios.get(`${config.backendUrl}/api/novels/${novelId}/modules`);
      setModules(modulesResponse.data);
    } catch (err) {
      console.error('Failed to add chapter to module:', err);
    }
  };

  // Add function to handle removing chapter from module
  const handleRemoveChapterFromModule = async (moduleId, chapterId) => {
    try {
      await axios.delete(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Update modules state to remove the chapter
      setModules(prevModules => 
        prevModules.map(module => {
          if (module._id === moduleId) {
            return {
              ...module,
              chapters: module.chapters.filter(ch => ch._id !== chapterId)
            };
          }
          return module;
        })
      );
    } catch (err) {
      console.error('Failed to remove chapter from module:', err);
    }
  };

  // Add this handler after other handlers
  const handleModuleDelete = async (moduleId) => {
    if (!window.confirm('Are you sure you want to delete this module and all its chapters?')) {
      return;
    }

    try {
      // First, delete all chapters associated with this module
      const module = modules.find(m => m._id === moduleId);
      if (module && module.chapters) {
        const deletePromises = module.chapters.map(chapter =>
          axios.delete(
            `${config.backendUrl}/api/chapters/${chapter._id}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          )
        );
        await Promise.all(deletePromises);
      }

      // Then delete the module
      await axios.delete(
        `${config.backendUrl}/api/novels/${novelId}/modules/${moduleId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Update modules list after deletion
      setModules(prevModules => prevModules.filter(module => module._id !== moduleId));
    } catch (err) {
      console.error('Failed to delete module:', err);
      alert(err.response?.data?.message || 'Failed to delete module. Please try again.');
    }
  };

  // Update the status display in the novel details section
  const displayStatus = novelStatuses[novelId] || novelData.novel?.status || 'Ongoing';

  // Add toggle function for sections
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Update the handleModuleReorder function
  const handleModuleReorder = async (moduleId, direction) => {
    console.log('Frontend - Starting reorder:', { moduleId, direction });
    
    const currentIndex = modules.findIndex(m => m._id === moduleId);
    console.log('Frontend - Current module index:', currentIndex);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    console.log('Frontend - Target index:', newIndex);
    if (newIndex < 0 || newIndex >= modules.length) return;

    // Update local state immediately for smooth UI
    const items = Array.from(modules);
    const [movedItem] = items.splice(currentIndex, 1);
    items.splice(newIndex, 0, movedItem);
    console.log('Frontend - Updated modules order:', items.map(m => ({ id: m._id, title: m.title, order: m.order })));
    setModules(items);

    try {
      console.log('Frontend - Sending request to backend:', {
        url: `${config.backendUrl}/api/novels/${novelId}/modules/reorder`,
        data: { moduleId, direction }
      });
      
      // Send the direction to the backend instead of newOrder
      await axios.put(
        `${config.backendUrl}/api/novels/${novelId}/modules/reorder`,
        {
          moduleId: moduleId,
          direction: direction // 'up' or 'down'
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log('Frontend - Backend request successful, fetching updated modules');
      // Refresh the modules to get the updated order
      const novelResponse = await fetchNovel();
      setModules(novelResponse.modules || []);
    } catch (err) {
      console.error('Frontend - Error updating module order:', err.response?.data || err.message);
      // Revert to original order if update fails
      const novelResponse = await fetchNovel();
      setModules(novelResponse.modules || []);
    }
  };

  // Add this new handler function for chapter reordering
  const handleChapterReorder = async (moduleId, chapterId, direction) => {
    try {
      // Find the current module and chapter
      const currentModule = modules.find(m => m._id === moduleId);
      if (!currentModule) {
        console.error('Module not found:', moduleId);
        return;
      }

      // Optimistically update UI
      const updatedModules = modules.map(m => {
        if (m._id === moduleId) {
          const chapters = [...m.chapters];
          const currentIndex = chapters.findIndex(ch => ch._id === chapterId);
          const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

          if (currentIndex === -1 || newIndex < 0 || newIndex >= chapters.length) {
            return m;
          }

          // Swap chapters
          [chapters[currentIndex], chapters[newIndex]] = [chapters[newIndex], chapters[currentIndex]];
          
          // Update prev/next references
          chapters.forEach((chapter, index) => {
            chapter.prevChapter = index > 0 ? chapters[index - 1] : null;
            chapter.nextChapter = index < chapters.length - 1 ? chapters[index + 1] : null;
          });

          return { ...m, chapters };
        }
        return m;
      });
      setModules(updatedModules);

      // Send update to backend
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

      // Update the modules state with the response data
      if (response.data.chapters) {
        setModules(prevModules => 
          prevModules.map(m => 
            m._id === moduleId 
              ? { ...m, chapters: response.data.chapters }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Failed to reorder chapters:', err);
      
      // Revert UI on error by refetching the data
      try {
        const novelResponse = await fetchNovel();
        setModules(novelResponse.modules || []);
      } catch (fetchErr) {
        console.error('Failed to revert chapter order:', fetchErr);
      }
    }
  };

  // Loading and error states
  if (novelData.loading) {
    return (
      <div className="loading">
        <div>Loading novel details...</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (novelData.error) {
    return (
      <div className="error">
        <div>Error: {novelData.error}</div>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }
  
  if (!novelData.novel) {
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
        <span>{novelData.novel.title}</span>
      </div>

      {/* Novel title */}
      <div className="novel-header">
        <h1 className="detail-page-novel-title">{novelData.novel.title}</h1>
      </div>

      {/* Novel information section */}
      <div className="novel-info-section">
        {/* Cover image and action buttons */}
        <div className="novel-cover-section">
          <img 
            src={novelData.novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'} 
            alt={novelData.novel.title} 
            className="detail-page-novel-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png';
            }}
          />
          <div className="novel-actions">
            {novelData.novel.chapters && novelData.novel.chapters.length > 0 ? (
              <Link 
                to={`/novel/${novelId}/chapter/${novelData.novel.chapters[0]._id}`}
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
              className={`bookmark-btn ${novelData.isBookmarked ? 'active' : ''}`}
              onClick={handleBookmarkClick}
              disabled={uiState.bookmarkLoading}
              title={novelData.isBookmarked ? "Remove from bookmarks in bookmarks page" : "Add to bookmarks"}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill={novelData.isBookmarked ? "currentColor" : "none"}
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="bookmark-icon"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              {novelData.isBookmarked ? 'Bookmarked' : '+ Bookmark'}
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
        <div className="detail-page-novel-details">
          <div className="detail-row">
            <span className="label">Alt name(s):</span>
            <span className="value">{novelData.novel.alternativeTitles?.join('; ') || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Author(s):</span>
            <span className="value">{novelData.novel.author}</span>
          </div>
          <div className="detail-row">
            <span className="label">Staff:</span>
            <span className="value">{novelData.novel.staff || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Genres:</span>
            <div className="genres-list">
              {novelData.novel.genres && novelData.novel.genres.length > 0 ? (
                novelData.novel.genres.map(genre => (
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
            <span className="status-tag" data-status={displayStatus}>
              {displayStatus.toUpperCase()}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Latest Chapter:</span>
            <span className="value">{(() => {
              const moduleChapters = modules.reduce((total, module) => total + (module.chapters?.length || 0), 0);
              return moduleChapters;
            })()} Chapter(s)</span>
          </div>
          <div className="detail-row">
            <span className="label">Updated:</span>
            <span className="value">{new Date(novelData.novel.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Novel description */}
      <div className="description-box">
        <h2>DESCRIPTION</h2>
        <div className="detail-page-novel-description">
          <div dangerouslySetInnerHTML={{ 
            __html: expandedSections.description 
              ? novelData.novel.description
              : truncateHTML(novelData.novel.description || '', 900)
          }} />
          {(() => {
            const div = document.createElement('div');
            div.innerHTML = novelData.novel.description || '';
            const textLength = div.textContent?.length || 0;
            return textLength > 900 && (
              <button 
                className="read-more-btn"
                onClick={() => toggleSection('description')}
              >
                {expandedSections.description ? 'Show Less' : 'Read More'}
              </button>
            );
          })()}
        </div>
        {novelData.novel.note && (
          <>
            <h2>ANNOUNCEMENT</h2>
            <div className="detail-page-novel-announcement">
              <div dangerouslySetInnerHTML={{ 
                __html: expandedSections.announcement 
                  ? novelData.novel.note
                  : truncateHTML(novelData.novel.note || '', 900)
              }} />
              {(() => {
                const div = document.createElement('div');
                div.innerHTML = novelData.novel.note || '';
                const textLength = div.textContent?.length || 0;
                return textLength > 900 && (
                  <button 
                    className="read-more-btn"
                    onClick={() => toggleSection('announcement')}
                  >
                    {expandedSections.announcement ? 'Show Less' : 'Read More'}
                  </button>
                );
              })()}
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
                  <button onClick={handleModuleFormToggle} className="add-module-btn">
                    <span className="plus-icon">+</span>
                    Add Module
                  </button>
                )}
              </div>
            </div>

            {/* Modules Section */}
            <div className="modules-section">
              {showModuleForm && (
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
              )}

              <div className="modules-list">
                {modules.map((module, index) => (
                  <div key={module._id} className="module-wrapper">
                    {user?.role === 'admin' && (
                      <div className="reorder-buttons">
                        {index !== 0 && (
                          <button
                            className="reorder-btn up"
                            onClick={() => handleModuleReorder(module._id, 'up')}
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
                            onClick={() => handleModuleReorder(module._id, 'down')}
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
                          src={module.coverImage} 
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
                                onClick={() => handleModuleEdit(module)}
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
                              >
                                + Add Chapter
                              </Link>
                            </div>
                          </div>
                        )}

                        <div className="module-chapters">
                          {module.chapters && module.chapters.length > 0 && (
                            <div className="module-chapters">
                              {module.chapters
                                .sort((a, b) => a.order - b.order)
                                .map((chapter, chapterIndex, chapterArray) => (
                                  <div key={chapter._id} className="chapter-item">
                                    {user?.role === 'admin' && (
                                      <div className="chapter-reorder-buttons">
                                        <button 
                                          className={`reorder-btn ${chapterIndex === 0 ? 'hidden' : ''}`}
                                          onClick={() => handleChapterReorder(module._id, chapter._id, 'up')}
                                          title="Move chapter up"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 15l-6-6-6 6"/>
                                          </svg>
                                        </button>
                                        <button 
                                          className={`reorder-btn ${chapterIndex === chapterArray.length - 1 ? 'hidden' : ''}`}
                                          onClick={() => handleChapterReorder(module._id, chapter._id, 'down')}
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
          <MemoizedCommentSection contentId={novelId} contentType="novels" />
        )}
      </div>

      {/* Login modal */}
      <Modal 
        isOpen={uiState.isLoginOpen} 
        onClose={() => setUiState(prev => ({ ...prev, isLoginOpen: false }))}
        title="LOG IN"
      >
        <Login 
          onClose={() => setUiState(prev => ({ ...prev, isLoginOpen: false }))}
          onSignUp={() => {
            setUiState(prev => ({ ...prev, isLoginOpen: false }));
            // You might want to handle signup separately
          }}
        />
      </Modal>
    </div>
  );
};

// Memoized components
const MemoizedCommentSection = memo(CommentSection);

// Utility functions moved outside component
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

// Function to check if a chapter is new (less than 3 days old)
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

// Add the truncateHTML function at the top of the file
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

export default NovelDetail; 
