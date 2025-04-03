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

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '../styles/components/NovelDetail.css';
import { CommentIcon, LockIcon } from './novel-detail/NovelIcons';
import LoadingSpinner from './LoadingSpinner';
import CommentSection from './CommentSection';
import RatingModal from './RatingModal';
import ModuleChapters from './novel-detail/ModuleChapters';
import ModuleForm from './novel-detail/ModuleForm';
import NovelInfo from './novel-detail/NovelInfo';
import api from '../services/api';

// Lazy load components that exist as separate files
const Login = lazy(() => import('./auth/Login'));

// Utility for HTML truncation, used in description
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

/**
 * NovelDetail Component
 * 
 * Main component that displays comprehensive information about a novel
 * and manages user interactions with the novel content.
 */
const NovelDetail = () => {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleForm, setModuleForm] = useState({ 
    title: '', 
    illustration: '', 
    loading: false, 
    error: '' 
  });
  const [editingModule, setEditingModule] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // Handler for deleting modules
  const handleDeleteModule = useCallback(async (moduleId) => {
    if (!user || user.role !== 'admin') return;
    
    if (window.confirm('Are you sure you want to delete this module?')) {
      try {
        await api.deleteModule(novelId, moduleId);
        // Refresh the data
        queryClient.invalidateQueries(['novel', novelId]);
      } catch (error) {
        console.error('Failed to delete module:', error);
        alert('Failed to delete module. Please try again.');
      }
    }
  }, [user, novelId, queryClient]);

  // Handler for module reordering
  const handleModuleReorder = useCallback(async (moduleId, direction) => {
    if (!user || user.role !== 'admin') return;
    
    try {
      const response = await api.reorderModule({ 
        novelId, 
        moduleId, 
        direction 
      });

      // Immediately update the cache with the new order
      queryClient.setQueryData(['novel', novelId], (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          modules: response.modules
        };
      });

      // Then invalidate to ensure we get fresh data on next fetch
      queryClient.invalidateQueries(['novel', novelId], {
        refetchType: 'none' // Don't refetch immediately since we updated the cache
      });
    } catch (error) {
      console.error('Failed to reorder module:', error);
    }
  }, [user, novelId, queryClient]);

  // Handler for toggling the module form
  const handleModuleFormToggle = useCallback(() => {
    setShowModuleForm((prev) => {
      if (prev) {
        // Reset form when closing
        setModuleForm({
          title: '',
          illustration: '',
          loading: false,
          error: ''
        });
        setEditingModule(null);
      }
      return !prev;
    });
  }, []);

  // Handler for module submission (create/update)
  const handleModuleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!moduleForm.title.trim()) {
      setModuleForm(prev => ({ ...prev, error: 'Module title is required' }));
      return;
    }
  
    setModuleForm(prev => ({ ...prev, loading: true, error: '' }));
  
    try {
      // Get current novel data for optimistic updates
      const currentNovelData = queryClient.getQueryData(['novel', novelId]);
      
      // Store current data for possible rollback
      let previousData = null;
      if (currentNovelData) {
        previousData = JSON.parse(JSON.stringify(currentNovelData));
      }
      
      let response;
      if (editingModule) {
        console.log('Updating module:', editingModule, moduleForm);
        
        // Optimistically update the cache before API call
        if (currentNovelData?.modules) {
          const updatedModules = currentNovelData.modules.map(module => 
            module._id === editingModule 
              ? { 
                  ...module, 
                  title: moduleForm.title,
                  illustration: moduleForm.illustration,
                  updatedAt: new Date().toISOString()
                }
              : module
          );
          
          queryClient.setQueryData(['novel', novelId], {
            ...currentNovelData,
            modules: updatedModules,
            updatedAt: new Date().toISOString()
          });
        }
        
        // Make the API call
        response = await api.updateModule(novelId, editingModule, {
          title: moduleForm.title,
          illustration: moduleForm.illustration
        });
        
        console.log('Module updated successfully:', response);
      } else {
        console.log('Creating new module:', moduleForm);
        response = await api.createModule(novelId, {
          title: moduleForm.title,
          illustration: moduleForm.illustration
        });
        
        console.log('Module created successfully:', response);
        
        // If we have current data and a successful response, optimistically add the new module
        if (currentNovelData?.modules && response) {
          const updatedModules = [...currentNovelData.modules, response];
          queryClient.setQueryData(['novel', novelId], {
            ...currentNovelData,
            modules: updatedModules,
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      // Force a refetch to ensure consistency with server
      await queryClient.invalidateQueries(['novel', novelId], { 
        refetchType: 'all' 
      });
      
      // Close the form and reset state
      setShowModuleForm(false);
      setModuleForm({
        title: '',
        illustration: '',
        loading: false,
        error: ''
      });
      setEditingModule(null);
    } catch (error) {
      console.error('Module submission error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save module. Please try again.';
      setModuleForm(prev => ({ 
        ...prev, 
        loading: false,
        error: errorMessage
      }));
      
      // On error, force refetch to make sure we have correct data
      queryClient.refetchQueries(['novel', novelId]);
    }
  }, [moduleForm.title, moduleForm.illustration, editingModule, novelId, queryClient]);
  
  // Check if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user && !token) {
      console.error("Auth issue: User is authenticated but token is missing");
    }
  }, [user]);
  
  // Query for fetching novel data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: async () => {
      // Check if we need to force a fresh fetch from the server
      const needsFreshData = location.state?.from === 'addChapter' && location.state?.shouldRefetch;
      
      // Use forceRefresh when coming from chapter creation
      const response = await api.fetchNovelWithModules(novelId, needsFreshData);
      return response;
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Check if we're coming from chapter creation and need to refetch
  useEffect(() => {
    const handleRefresh = async () => {
      if (location.state?.from === 'addChapter' && location.state?.shouldRefetch) {
        // Force a full refetch that bypasses the cache completely
        await queryClient.invalidateQueries(['novel', novelId], { refetchType: 'all' });
        await refetch(); 
        
        // Only clear the state after refetch completes
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    
    handleRefresh();
  }, [location, refetch, navigate, queryClient, novelId]);
  
  // Check if novel has chapters
  const hasChapters = useMemo(() => {
    return (data?.modules?.some(module => 
      module.chapters && module.chapters.length > 0
    )) || false;
  }, [data]);

  // Calculate chapters data early
  const chaptersData = useMemo(() => ({
    chapters: data?.modules?.flatMap(module => module.chapters || []) || []
  }), [data]);

  // Query for fetching user's reading progress
  const { data: readingProgress } = useQuery({
    queryKey: ['readingProgress', user?.username, novelId],
    queryFn: async () => {
      // Return null since reading progress feature is not implemented yet
      return null;
    },
    enabled: false, // Disable the query until reading progress feature is implemented
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  });
  
  // Query to get user interaction data (likes, ratings)
  const { data: userInteraction } = useQuery({
    queryKey: ['userInteraction', user?.username, novelId],
    queryFn: () => {
      if (!user?.username || !novelId) return { liked: false, rating: null };
      return api.getUserInteraction(novelId);
    },
    enabled: !!user?.username && !!novelId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Toggle comments section
  const toggleComments = () => {
    setIsCommentsOpen(!isCommentsOpen);
  };

  // Add handler functions for chapters
  const handleChapterReorder = useCallback(async (moduleId, chapterId, direction) => {
    if (!user || user.role !== 'admin') return;
    
    try {
      await api.reorderChapter({ 
        novelId,
        moduleId,
        chapterId, 
        direction 
      });
      // Refresh the data
      queryClient.invalidateQueries(['novel', novelId]);
    } catch (error) {
      console.error('Failed to reorder chapter:', error);
    }
  }, [user, novelId, queryClient]);
  
  const handleChapterDelete = useCallback(async (moduleId, chapterId) => {
    if (!user || user.role !== 'admin') return;
    
    if (window.confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
      try {
        await api.deleteChapter(chapterId);
        // Refresh the data
        queryClient.invalidateQueries(['novel', novelId]);
      } catch (error) {
        console.error('Failed to delete chapter:', error);
      }
    }
  }, [user, novelId, queryClient]);
  
  const handleEditModule = useCallback((module) => {
    console.log('Edit module clicked:', module);
    // First make sure to show the form before setting other data
    setShowModuleForm(true);
    // Then set the editing module data
    setEditingModule(module._id);
    setModuleForm({
      title: module.title || '',
      illustration: module.illustration || '',
      loading: false,
      error: ''
    });
    console.log('showModuleForm should now be true');
    
    // Scroll to where the form should be to ensure visibility
    setTimeout(() => {
      // Attempt to find and scroll to the chapter list container
      const container = document.querySelector('.chapter-list-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('Scrolled to chapter list container');
      }
      
      console.log('Current state values:', {
        editingModule: module._id,
        showModuleForm: true,
        moduleFormTitle: module.title
      });
    }, 100);
  }, []);

  const handleModuleCoverUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setModuleForm(prev => ({ ...prev, loading: true, error: '' }));
  
    try {
      const url = await api.uploadModuleCover(file);
      setModuleForm(prev => ({ ...prev, illustration: url, loading: false }));
    } catch (error) {
      console.error('Upload error:', error);
      setModuleForm(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to upload cover image. Please try again.' 
      }));
    }
  }, []);

  return (
    <div className="novel-detail-page">
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error-message">Error loading novel: {error.message}</div>
      ) : data ? (
        <>
          <NovelInfo 
            novel={data}
            user={user}
            userInteraction={userInteraction}
            hasChapters={hasChapters}
            setIsRatingModalOpen={setIsRatingModalOpen}
            handleModuleFormToggle={handleModuleFormToggle}
            truncateHTML={truncateHTML}
          />
          
          <div className="chapter-list-container">
            <div className="chapters-header">
              <h2>Chapters</h2>
              {user?.role === 'admin' && (
                <button 
                  className="add-module-btn"
                  onClick={handleModuleFormToggle}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Module
                </button>
              )}
            </div>
            
            {/* Place the form at the top level for maximum visibility when editing */}
            {showModuleForm && editingModule && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                width: '80%',
                maxWidth: '600px',
                background: 'white',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
              }}>
                <ModuleForm 
                  key={`edit-${editingModule}`}
                  moduleForm={moduleForm} 
                  setModuleForm={setModuleForm} 
                  handleModuleSubmit={handleModuleSubmit} 
                  handleModuleCoverUpload={handleModuleCoverUpload} 
                  handleModuleFormToggle={handleModuleFormToggle}
                  editingModule={editingModule} 
                />
              </div>
            )}
            
            {/* Regular position for the add form */}
            {showModuleForm && !editingModule && (
              <ModuleForm 
                key="new-module"
                moduleForm={moduleForm} 
                setModuleForm={setModuleForm} 
                handleModuleSubmit={handleModuleSubmit} 
                handleModuleCoverUpload={handleModuleCoverUpload} 
                handleModuleFormToggle={handleModuleFormToggle}
                editingModule={null} 
              />
            )}
            
            {data.modules && data.modules.length > 0 ? (
              data.modules.map((module, moduleIndex, moduleArray) => (
                <div key={module._id} className="module-container">
                  <div className="module-content">
                    <div className="module-cover">
                      <img 
                        src={module.illustration || "https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png"} 
                        alt={`${module.title} cover`}
                        className="module-cover-image"
                      />
                      {user?.role === 'admin' && (
                        <div className="module-reorder-buttons">
                            <button
                            className={`reorder-btn ${moduleIndex === 0 ? 'disabled' : ''}`}
                            onClick={() => handleModuleReorder(module._id, 'up')}
                            disabled={moduleIndex === 0}
                              title="Move module up"
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                                <path d="M18 15l-6-6-6 6"/>
                              </svg>
                            </button>
                            <button
                            className={`reorder-btn ${moduleIndex === moduleArray.length - 1 ? 'disabled' : ''}`}
                            onClick={() => handleModuleReorder(module._id, 'down')}
                            disabled={moduleIndex === moduleArray.length - 1}
                              title="Move module down"
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                                <path d="M6 9l6 6 6-6"/>
                              </svg>
                            </button>
                        </div>
                      )}
                    </div>
                    <div className="module-details">
                      <div className="module-header">
                        <div className="module-title-area">
                          <h3 className="module-title">{module.title}</h3>
                        </div>
                        
                        {user?.role === 'admin' && (
                          <div className="module-actions">
                            <button
                              className="edit-module-btn"
                              onClick={() => handleEditModule(module)}
                              title="Edit module"
                            >
                              Edit
                            </button>
                            <button
                              className="delete-module-btn"
                              onClick={() => handleDeleteModule(module._id)}
                              title="Delete module"
                            >
                              Delete
                            </button>
                            <Link
                              to={`/novel/${novelId}/module/${module._id}/add-chapter`}
                              className="add-chapter-btn"
                              title="Add chapter to this module"
                            >
                              Add Chapter
                            </Link>
                          </div>
                        )}
                      </div>

                      <ModuleChapters
                        chapters={module.chapters || []}
                        novelId={novelId}
                        moduleId={module._id}
                        user={user}
                        handleChapterReorder={handleChapterReorder}
                        handleChapterDelete={handleChapterDelete}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-chapters-message">
                No chapters available yet.
              </div>
            )}
          </div>

          {/* Comments section */}
          <div className="comments-section">
            <button
              className="comments-toggle-btn" 
              onClick={toggleComments}
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
                novelId={novelId}
                user={user}
                isAuthenticated={!!user}
              />
            )}
          </div>

          {/* Rating Modal */}
          {isRatingModalOpen && (
            <RatingModal 
              novelId={novelId}
              isOpen={isRatingModalOpen}
              onClose={() => setIsRatingModalOpen(false)}
              currentRating={userInteraction?.rating || 0}
            />
          )}
        </>
      ) : (
        <div className="error-message">Novel not found</div>
      )}
    </div>
  );
};

export default NovelDetail; 
