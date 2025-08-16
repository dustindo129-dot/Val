/**
 * UserProfile Component
 * 
 * User profile display page that shows:
 * - User information
 * - Public profile data
 * - User activities (to be implemented)
 * 
 * This is different from UserSettings which handles account configuration.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import config from '../config/config';
import LoadingSpinner from '../components/LoadingSpinner';
import cdnConfig from '../config/bunny';

import DraggableModuleList from '../components/DraggableModuleList';
import InterestTagsManager from '../components/InterestTagsManager';
// Temporarily disabled to debug hook issue
// import {
//   DndContext,
//   closestCenter,
//   KeyboardSensor,
//   PointerSensor,
//   useSensor,
//   useSensors,
// } from '@dnd-kit/core';
// Temporarily disabled to debug hook issue
// import { arrayMove } from '@dnd-kit/sortable';

// Re-enable drag-and-drop imports with error handling
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import api from '../services/api';
import { createSlug } from '../utils/slugUtils';
import '../styles/UserProfile.css';
import '../components/DraggableModuleList.css';

// Custom drag-and-drop wrapper using native HTML5 API
const CustomDndWrapper = ({ 
  onDragEnd, 
  canManageModules, 
  userStats, 
  canRefreshModules, 
  handleRefreshModules,
  canRemoveModules,
  handleRemoveOngoingModule,
  handleReorderOngoingModules,
  handleRemoveCompletedModule,
  handleReorderCompletedModules
}) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverContainer, setDragOverContainer] = useState(null);

  const handleDragStart = (e, itemId, sourceContainer) => {
    if (!canManageModules) return;
    
    setDraggedItem({ id: itemId, source: sourceContainer });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (e, targetContainer) => {
    if (!canManageModules || !draggedItem) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverContainer(targetContainer);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the container, not a child element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverContainer(null);
    }
  };

  const handleDrop = (e, targetContainer, mockEvent = null) => {
    if (!canManageModules || !draggedItem) return;
    
    e.preventDefault();
    setDragOverContainer(null);
    
    // Clear all drop-target states immediately
    const clearAllDropTargets = () => {
      const dropTargets = document.querySelectorAll('.module-item.drop-target');
      dropTargets.forEach(element => {
        element.classList.remove('drop-target');
      });
    };
    
    // Clear immediately
    clearAllDropTargets();
    
    let finalEvent;
    
    if (mockEvent) {
      // This is an item-to-item drop (for reordering)
      finalEvent = mockEvent;
    } else {
      // This is a container drop (for cross-section moves)
      finalEvent = {
        active: { id: draggedItem.id },
        over: { 
          id: targetContainer,
          data: { current: { containerId: targetContainer } }
        },
        draggedFrom: draggedItem.source,
        draggedTo: targetContainer,
        dropType: 'container'
      };
    }
    
    onDragEnd(finalEvent);
    setDraggedItem(null);
    
    // Ensure cleanup happens after state updates
    setTimeout(() => {
      clearAllDropTargets();
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverContainer(null);
    
    // Clear all drop-target states by forcing a re-render
    // This ensures any lingering drop-target styles are cleared
    const clearAllDropTargets = () => {
      const dropTargets = document.querySelectorAll('.module-item.drop-target');
      dropTargets.forEach(element => {
        element.classList.remove('drop-target');
      });
    };
    
    // Clear immediately and after a short delay to catch any late updates
    clearAllDropTargets();
    setTimeout(() => {
      clearAllDropTargets();
    }, 0);
    setTimeout(() => {
      clearAllDropTargets();
    }, 100);
  };

  // Create drag handlers object to pass down
  const dragHandlers = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    draggedItem,
    dragOverContainer,
    canManageModules
  };

  return (
    <div 
      onDragEnd={handleDragEnd}
      data-custom-dnd-wrapper="true"
    >
      <div className="profile-novels-section-content">
        {/* Ongoing Modules */}
        <div className="novels-card ongoing-novels">
          <div className="card-header">
            <h3>
              <span className="section-number">{userStats.ongoingModules.length}</span>
              Đang tiến hành
              {canRefreshModules && (
                <button 
                  className="refresh-modules-btn"
                  onClick={handleRefreshModules}
                  title="Làm mới danh sách tập"
                >
                  <i className="fa-solid fa-refresh"></i>
                </button>
              )}
            </h3>
          </div>
          <DraggableModuleList
            modules={userStats.ongoingModules}
            canManageModules={canManageModules}
            canRemoveModules={canRemoveModules}
            onRemove={handleRemoveOngoingModule}
            onReorder={handleReorderOngoingModules}
            emptyMessage={canManageModules ? 'Chưa có tập đang tiến hành. Kéo tập từ "Đã hoàn thành" để thêm vào đây.' : 'Không có tập đang tiến hành'}
            type="ongoing"
            containerId="ongoing"
            dragHandlers={dragHandlers}
          />
        </div>

        {/* Completed Modules */}
        <div className="novels-card completed-novels">
          <div className="card-header">
            <h3>
              <span className="section-number">{userStats.completedModules.length}</span>
              Đã hoàn thành
            </h3>
          </div>
          <DraggableModuleList
            modules={userStats.completedModules}
            canManageModules={canManageModules}
            canRemoveModules={canRemoveModules}
            onRemove={handleRemoveCompletedModule}
            onReorder={handleReorderCompletedModules}
            emptyMessage={canManageModules ? 'Chưa có tập đã hoàn thành. Kéo tập từ "Đang tiến hành" để thêm vào đây.' : 'Không có tập đã hoàn thành'}
            type="completed"
            containerId="completed"
            dragHandlers={dragHandlers}
          />
        </div>
      </div>
    </div>
  );
};

// Helper function to format numbers
const formatNumber = (num) => {
  return num.toString();
};

/**
 * UserProfileSEO Component
 * 
 * Provides SEO optimization for the UserProfile page
 */
const UserProfileSEO = ({ profileUser, username }) => {
  const displayName = profileUser?.displayName || username;
  
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{`${displayName} - Trang Cá Nhân | Valvrareteam`}</title>
      <meta name="description" content={`Trang cá nhân của ${displayName} tại Valvrareteam. Xem thông tin và hoạt động của người dùng.`} />
      <meta name="keywords" content={`${displayName}, trang cá nhân, người dùng, valvrareteam`} />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content={`${displayName} - Trang Cá Nhân | Valvrareteam`} />
      <meta property="og:description" content={`Trang cá nhân của ${displayName} tại Valvrareteam.`} />
              <meta property="og:image" content={cdnConfig.getAvatarUrl(profileUser?.avatar) || "https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif"} />
      <meta property="og:url" content={`https://valvrareteam.net/nguoi-dung/${profileUser?.userNumber || username}/trang-ca-nhan`} />
      <meta property="og:type" content="profile" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${displayName} - Trang Cá Nhân | Valvrareteam`} />
      <meta name="twitter:description" content={`Trang cá nhân của ${displayName} tại Valvrareteam.`} />
              <meta name="twitter:image" content={cdnConfig.getAvatarUrl(profileUser?.avatar) || "https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif"} />
    </Helmet>
  );
};

/**
 * UserProfile Component
 * 
 * Main component for displaying user profile information
 */
const UserProfile = () => {
  // Get userNumber from URL parameters
  const { userNumber } = useParams();
  // Get current user context
  const { user } = useAuth();
  // Get theme context
  const { themeLoaded } = useTheme();
  
  // State management
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [domReady, setDomReady] = useState(false);
  const [userStats, setUserStats] = useState({
    chaptersParticipated: 0,
    commentsCount: 0,
    ongoingModules: [],
    completedModules: []
  });

  // Introduction editing state
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [introText, setIntroText] = useState('');
  const [isSavingIntro, setIsSavingIntro] = useState(false);
  const editorRef = useRef(null);

  // Check if current user is viewing their own profile
  const isOwnProfile = user && profileUser && user.username === profileUser.username;
  
  // Check if user has permission to manage modules
  // System roles: admin, moderator, pj_user
  // Novel-specific roles: translator, editor, proofreader (checked via novel staff assignments)
  const [hasNovelRoles, setHasNovelRoles] = useState(false);
  
  const canManageModules = user && isOwnProfile && (
    // System roles
    ['admin', 'moderator', 'pj_user'].includes(user.role) ||
    // Novel-specific roles (checked separately)
    hasNovelRoles
  );

  // Separate permission for remove buttons - admin/mod only
  const canRemoveModules = user && ['admin', 'moderator'].includes(user.role);

    // Separate permission for refresh button - admin/mod or own profile
  const canRefreshModules = user && (['admin', 'moderator'].includes(user.role) || isOwnProfile);



  /**
   * Fetch user profile data
   */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if profile was visited in the last 4 hours (same cooldown as novel views)
        const visitKey = `user_${userNumber}_last_visited`;
        const lastVisited = localStorage.getItem(visitKey);
        const now = Date.now();
        const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
        
        // Check if viewing own profile (before making request)
        const isViewingOwnProfile = user && user.userNumber == userNumber; // Compare userNumber
        
        // Only count visit if:
        // 1. Never visited before, or  
        // 2. Last visited more than 4 hours ago
        // 3. Not viewing own profile
        const shouldCountVisit = !isViewingOwnProfile && 
          (!lastVisited || (now - parseInt(lastVisited, 10)) > fourHours);

        // Add skipVisitorTracking parameter if we shouldn't count this visit
        const params = new URLSearchParams();
        if (!shouldCountVisit) {
          params.append('skipVisitorTracking', 'true');
        }

        // Use the new optimized endpoint that fetches everything in one call
        const url = `${config.backendUrl}/api/users/number/${userNumber}/public-profile-complete${params.toString() ? '?' + params.toString() : ''}`;
        const response = await axios.get(url);

        // Update last visited timestamp if we counted a visit
        if (shouldCountVisit) {
          localStorage.setItem(visitKey, now.toString());
        }
        
        // Extract user data and stats from the optimized response
        const userData = response.data;
        setProfileUser(userData);
        setIntroText(userData.intro || '');
        
        // Prepare user stats from the optimized response
        const stats = {
          chaptersParticipated: userData.stats.chaptersParticipated || 0,
          followingCount: userData.stats.followingCount || 0,
          commentsCount: userData.stats.commentsCount || 0,
          ongoingModules: userData.stats.ongoingModules || [],
          completedModules: userData.stats.completedModules || []
        };
        
        // Warm the novel cache with all modules to avoid individual requests
        const { warmNovelCache } = await import('../components/DraggableModuleList');
        const allModules = [...stats.ongoingModules, ...stats.completedModules];
        if (allModules.length > 0) {
          // Wait for cache warming to complete before setting user stats
          // This ensures cache is populated before components render
          try {
            await warmNovelCache(allModules);
          } catch (error) {
            console.error('Error warming novel cache from UserProfile:', error);
            // Continue even if cache warming fails
          }
        }
        
        // Set user stats after cache warming is complete
        setUserStats(stats);
        
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    if (userNumber) {
      fetchUserProfile();
    }
  }, [userNumber, user]);

  /**
   * Check if user has novel-specific roles (translator, editor, proofreader)
   */
  useEffect(() => {
    const checkNovelRoles = async () => {
      if (!profileUser) {
        setHasNovelRoles(false);
        return;
      }

      // Skip check if user already has system-level permissions
      if (['admin', 'moderator', 'pj_user'].includes(profileUser.role)) {
        setHasNovelRoles(true);
        return;
      }

      try {
        // Check if the profile user has any novel-specific roles
        // This endpoint needs to be public or allow checking other users
        const response = await axios.get(
          `${config.backendUrl}/api/users/id/${profileUser._id}/novel-roles-public`
        );
        
        setHasNovelRoles(response.data.hasNovelRoles || false);
      } catch (error) {
        // If the public endpoint doesn't exist, fall back to the auth endpoint for own profile
        if (isOwnProfile && user) {
          try {
            const authResponse = await axios.get(
              `${config.backendUrl}/api/users/id/${user._id}/novel-roles`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            setHasNovelRoles(authResponse.data.hasNovelRoles || false);
          } catch (authError) {
            console.error('Error checking novel roles:', authError);
            setHasNovelRoles(false);
          }
        } else {
          console.error('Error checking novel roles:', error);
          setHasNovelRoles(false);
        }
      }
    };

    checkNovelRoles();
  }, [profileUser, isOwnProfile, user]);

  // TinyMCE initialization and cleanup
  useEffect(() => {
    if (isEditingIntro && !editorRef.current) {
      // Dynamically load TinyMCE script
      const script = document.createElement('script');
      script.src = '/tinymce/js/tinymce/tinymce.min.js';
      script.onload = () => {
        if (window.tinymce) {
          window.tinymce.init({
            selector: '#intro-editor',
            height: 300,
            menubar: false,
            license_key: 'gpl',
            plugins: [
              'lists', 'link', 'image', 'charmap', 'preview',
              'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | formatselect | ' +
              'bold italic strikethrough backcolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help',
            content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size:14px }',
            setup: (editor) => {
              editorRef.current = editor;
              editor.on('init', () => {
                editor.setContent(introText);
              });
            }
          });
        }
      };
      document.head.appendChild(script);

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    }
  }, [isEditingIntro, introText]);

  // Handle introduction editing
  const handleEditIntro = () => {
    setIsEditingIntro(true);
  };

  const handleCancelEditIntro = () => {
    setIsEditingIntro(false);
    setIntroText(profileUser.intro || '');
    if (editorRef.current) {
      editorRef.current.destroy();
      editorRef.current = null;
    }
  };

  const handleSaveIntro = async () => {
    if (!editorRef.current) return;

    setIsSavingIntro(true);
    try {
      const content = editorRef.current.getContent();
      
      const response = await axios.put(
        `${config.backendUrl}/api/users/number/${profileUser.userNumber}/intro`,
        { intro: content },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setIntroText(content);
      setProfileUser(prev => ({ ...prev, intro: content }));
      setIsEditingIntro(false);
      
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    } catch (error) {
      console.error('Error updating introduction:', error);
      alert('Không thể cập nhật giới thiệu. Vui lòng thử lại.');
    } finally {
      setIsSavingIntro(false);
    }
  };

  // Module management functions
  const handleMoveToCompleted = async (moduleId) => {
    if (!canManageModules) return;
    
    try {
      await axios.post(`${config.backendUrl}/api/users/id/${profileUser._id}/move-module-to-completed`, {
        moduleId: moduleId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state
      setUserStats(prev => {
        const moduleToMove = prev.ongoingModules.find(item => item.moduleId._id === moduleId);
        if (!moduleToMove) return prev;
        
        return {
          ...prev,
          ongoingModules: prev.ongoingModules.filter(item => item.moduleId._id !== moduleId),
          completedModules: [
            {
              ...moduleToMove,
              addedAt: new Date().toISOString()
            },
            ...prev.completedModules
          ]
        };
      });
    } catch (error) {
      console.error('Error moving module to completed:', error);
      alert('Không thể chuyển tập sang danh sách đã hoàn thành');
    }
  };

  const handleMoveToOngoing = async (moduleId) => {
    if (!canManageModules) return;
    
    try {
      await axios.post(`${config.backendUrl}/api/users/id/${profileUser._id}/move-module-to-ongoing`, {
        moduleId: moduleId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state
      setUserStats(prev => {
        const moduleToMove = prev.completedModules.find(item => item.moduleId._id === moduleId);
        if (!moduleToMove) return prev;
        
        return {
          ...prev,
          completedModules: prev.completedModules.filter(item => item.moduleId._id !== moduleId),
          ongoingModules: [
            {
              ...moduleToMove,
              addedAt: new Date().toISOString()
            },
            ...prev.ongoingModules
          ]
        };
      });
    } catch (error) {
      console.error('Error moving module to ongoing:', error);
      alert('Không thể chuyển tập sang danh sách đang tiến hành');
    }
  };

  const handleRemoveOngoingModule = async (moduleId) => {
    if (!canRemoveModules) return;
    
    try {
      // Use the new /id/ endpoint to avoid conflicts with displayNameSlug routes
      await axios.delete(`${config.backendUrl}/api/users/id/${profileUser._id}/ongoing-modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state
      setUserStats(prev => ({
        ...prev,  
        ongoingModules: prev.ongoingModules.filter(m => m.moduleId._id !== moduleId)
      }));
    } catch (error) {
      console.error('Error removing ongoing module:', error);
      alert('Không thể xóa tập khỏi danh sách đang tiến hành');
    }
  };

  const handleRemoveCompletedModule = async (moduleId) => {
    if (!canRemoveModules) return;
    
    try {
      // Use the new /id/ endpoint to avoid conflicts with displayNameSlug routes
      await axios.delete(`${config.backendUrl}/api/users/id/${profileUser._id}/completed-modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state
      setUserStats(prev => ({
        ...prev,
        completedModules: prev.completedModules.filter(m => m.moduleId._id !== moduleId)
      }));
    } catch (error) {
      console.error('Error removing completed module:', error);
      alert('Không thể xóa tập khỏi danh sách đã hoàn thành');
    }
  };

  // Module refresh function for admin/mod to repopulate modules
  const handleRefreshModules = useCallback(async () => {
    if (!canRefreshModules) return;
    
    // Debounce rapid clicks
    const now = Date.now();
    if (handleRefreshModules.lastCall && (now - handleRefreshModules.lastCall) < 2000) {
      return; // Ignore if called within 2 seconds
    }
    handleRefreshModules.lastCall = now;
    
    try {
      // Refetch user modules from backend using the new /id/ endpoint WITH autoAddNew=true
      const response = await axios.get(`${config.backendUrl}/api/users/id/${profileUser._id}/role-modules?autoAddNew=true`);
      
      setUserStats(prev => ({
        ...prev,
        ongoingModules: response.data.ongoingModules || [],
        completedModules: response.data.completedModules || []
      }));
      
      // Show success message with count of new modules added
      const newModulesCount = response.data.newModulesCount || 0;
      if (newModulesCount > 0) {
        alert(`Đã làm mới danh sách tập thành công! Đã thêm ${newModulesCount} tập mới.`);
      } else {
        alert('Đã làm mới danh sách tập thành công! Không có tập mới.');
      }
    } catch (error) {
      console.error('Error refreshing modules:', error);
      alert('Không thể làm mới danh sách tập');
    }
  }, [canRefreshModules, profileUser]);

  // Module reordering functions
  const handleReorderOngoingModules = async (newOrder) => {
    if (!canManageModules) return;
    
    try {
      const moduleIds = newOrder.map(item => item.moduleId._id);
      
      // Update local state immediately for better UX
      setUserStats(prev => ({
        ...prev,
        ongoingModules: newOrder
      }));
      
      // Send to backend
      await axios.put(`${config.backendUrl}/api/users/id/${profileUser._id}/reorder-ongoing-modules`, {
        moduleIds: moduleIds
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Error reordering ongoing modules:', error);
      alert('Không thể sắp xếp lại danh sách đang tiến hành');
      
      // Revert local state on error - refetch user modules (without auto-adding new modules)
      try {
        const userModules = await axios.get(`${config.backendUrl}/api/users/id/${profileUser._id}/role-modules`);
        setUserStats(prev => ({
          ...prev,
          ongoingModules: userModules.data.ongoingModules || []
        }));
      } catch (revertError) {
        console.error('Error reverting ongoing modules:', revertError);
      }
    }
  };

  const handleReorderCompletedModules = async (newOrder) => {
    if (!canManageModules) return;
    
    try {
      const moduleIds = newOrder.map(item => item.moduleId._id);
      
      // Update local state immediately for better UX
      setUserStats(prev => ({
        ...prev,
        completedModules: newOrder
      }));
      
      // Send to backend
      await axios.put(`${config.backendUrl}/api/users/id/${profileUser._id}/reorder-completed-modules`, {
        moduleIds: moduleIds
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Error reordering completed modules:', error);
      alert('Không thể sắp xếp lại danh sách đã hoàn thành');
      
      // Revert local state on error - refetch user modules (without auto-adding new modules)
      try {
        const userModules = await axios.get(`${config.backendUrl}/api/users/id/${profileUser._id}/role-modules`);
        setUserStats(prev => ({
          ...prev,
          completedModules: userModules.data.completedModules || []
        }));
      } catch (revertError) {
        console.error('Error reverting completed modules:', revertError);
      }
    }
  };

  // Handle both cross-section dragging and within-section reordering
  const handleCrossSectionDrag = (event) => {
    const { active, over, dropType } = event;
    
    if (!over || !canManageModules) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    // Check which section the dragged item is from
    const activeInOngoing = userStats.ongoingModules.some(item => item.moduleId._id === activeId);
    const activeInCompleted = userStats.completedModules.some(item => item.moduleId._id === activeId);
    
    // Check which section we're dropping into
    const overIsOngoingContainer = overId === 'ongoing' || over.data?.current?.containerId === 'ongoing';
    const overIsCompletedContainer = overId === 'completed' || over.data?.current?.containerId === 'completed';
    const overIsOngoingItem = userStats.ongoingModules.some(item => item.moduleId._id === overId);
    const overIsCompletedItem = userStats.completedModules.some(item => item.moduleId._id === overId);
    
    // Determine target section
    const droppingInOngoing = overIsOngoingContainer || overIsOngoingItem;
    const droppingInCompleted = overIsCompletedContainer || overIsCompletedItem;
    
    // Cross-section moves (between different sections)
    if (activeInOngoing && droppingInCompleted) {
      handleMoveToCompleted(activeId);
      return;
    }
    
    if (activeInCompleted && droppingInOngoing) {
      handleMoveToOngoing(activeId);
      return;
    }
    
    // Handle reordering within the same section (only for item drops)
    if (dropType === 'item' && activeId !== overId) {
      // Reorder within ongoing section
      if (activeInOngoing && overIsOngoingItem) {
        const oldIndex = userStats.ongoingModules.findIndex(item => item.moduleId._id === activeId);
        const newIndex = userStats.ongoingModules.findIndex(item => item.moduleId._id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(userStats.ongoingModules, oldIndex, newIndex);
          handleReorderOngoingModules(newOrder);
          
          // Force cleanup after successful within-section reorder
          setTimeout(() => {
            const dropTargets = document.querySelectorAll('.module-item.drop-target');
            dropTargets.forEach(element => {
              element.classList.remove('drop-target');
            });
          }, 100);
        }
        return;
      }
      
      // Reorder within completed section
      if (activeInCompleted && overIsCompletedItem) {
        const oldIndex = userStats.completedModules.findIndex(item => item.moduleId._id === activeId);
        const newIndex = userStats.completedModules.findIndex(item => item.moduleId._id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(userStats.completedModules, oldIndex, newIndex);
          handleReorderCompletedModules(newOrder);
          
          // Force cleanup after successful within-section reorder
          setTimeout(() => {
            const dropTargets = document.querySelectorAll('.module-item.drop-target');
            dropTargets.forEach(element => {
              element.classList.remove('drop-target');
            });
          }, 100);
        }
        return;
      }
    }
  };

  // Ensure DOM and styles are ready before rendering
  useEffect(() => {
    // Check if theme classes and styles are applied to document
    const checkDOMReady = () => {
      // Check for theme class
      const hasThemeClass = document.documentElement.classList.contains('dark-mode') || 
                           document.documentElement.classList.contains('sepia-mode') ||
                           (!localStorage.getItem('theme') || localStorage.getItem('theme') === 'light');
      
      // Check if critical styles are loaded by testing a unique class from UserProfile.css
      const profileStylesLoaded = getComputedStyle(document.documentElement)
        .getPropertyValue('--user-profile-loaded')
        .trim() === '"true"';
      
      if (hasThemeClass && profileStylesLoaded) {
        setDomReady(true);
      } else {
        // Retry after a short delay
        setTimeout(checkDOMReady, 10);
      }
    };
    
    checkDOMReady();
  }, []);

  // Show loading state while theme is loading or DOM is not ready
  if (!themeLoaded || !domReady) {
    return <LoadingSpinner />;
  }

  // Show loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  // Show not found if no user data
  if (!profileUser) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          Không tìm thấy người dùng này.
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <UserProfileSEO profileUser={profileUser} username={userNumber} />
      
      {/* Profile Banner */}
      <div className="profile-banner">
        <div className="banner-overlay"></div>
        <div className="banner-content">
          {/* Banner background - you can customize this */}
        </div>
      </div>

      {/* Profile Header Section */}
      <div className="profile-header-section">
        <div className="container">
          <div className="profile-header-content">
            {/* User Avatar and Basic Info */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-wrapper">
                <img
                  src={cdnConfig.getAvatarUrl(profileUser.avatar)}
                  alt={`${profileUser.displayName || profileUser.username}'s avatar`}
                  className="profile-avatar-image"
                />
              </div>
              
              <div className="profile-user-info">
                <h1 className="profile-username">
                  {profileUser.displayName || profileUser.username}
                  {(profileUser.role === 'admin' || 
                    profileUser.role === 'moderator' || 
                    profileUser.role === 'pj_user' || 
                    hasNovelRoles) && (
                    <span className="verification-badge" title="Đã xác minh">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  )}
                </h1>
                
                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="stat-number">{formatNumber(userStats.chaptersParticipated)}</span>
                    <span className="stat-label">Chương đã tham gia</span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-number">{formatNumber(userStats.followingCount)}</span>
                    <span className="stat-label">Đang theo dõi</span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-number">{formatNumber(userStats.commentsCount)}</span>
                    <span className="stat-label">Bình luận</span>
                  </div>
                </div>

                <div className="profile-meta">
                  <div className="meta-row">
                    <div className="meta-item">
                      <i className="fa-solid fa-clock"></i>
                      <span>Tham gia: {new Date(profileUser.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    
                    <div className="meta-item">
                      <i className="fa-solid fa-eye"></i>
                      <span>Lượt ghé thăm: {formatNumber(profileUser.visitors?.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="profile-main-content">
        <div className="container">
          <div className="content-grid">
            {/* Left Column - Introduction Section */}
            <div className="profile-notes-section">
              <div className="notes-card">
                <div className="notes-header">
                  <h3>Giới thiệu</h3>
                  {isOwnProfile && !isEditingIntro && (
                    <button 
                      className="edit-intro-btn"
                      onClick={handleEditIntro}
                      title="Chỉnh sửa giới thiệu"
                    >
                      <i className="fa-solid fa-edit"></i>
                      Sửa
                    </button>
                  )}
                </div>
                
                <div className="notes-content">
                  {isEditingIntro ? (
                    <div className="intro-editor-container">
                      <textarea 
                        id="intro-editor"
                        defaultValue={introText}
                        style={{ width: '100%', minHeight: '300px' }}
                      />
                      <div className="intro-editor-actions">
                        <button 
                          className="save-intro-btn"
                          onClick={handleSaveIntro}
                          disabled={isSavingIntro}
                        >
                          {isSavingIntro ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin"></i>
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-check"></i>
                              Lưu
                            </>
                          )}
                        </button>
                        <button 
                          className="cancel-intro-btn"
                          onClick={handleCancelEditIntro}
                          disabled={isSavingIntro}
                        >
                          <i className="fa-solid fa-times"></i>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="intro-content">
                      {profileUser.intro ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: profileUser.intro }}
                        />
                      ) : (
                        <p className="no-intro">
                          {isOwnProfile 
                            ? 'Chưa có giới thiệu. Nhấn "Sửa" để thêm giới thiệu về bản thân.' 
                            : 'Người dùng chưa có giới thiệu.'
                          }
                        </p>
                      )}
                    </div>
                  )}
                  
                  <InterestTagsManager
                    userInterests={profileUser.interests || []}
                    isOwnProfile={isOwnProfile}
                    userId={profileUser._id}
                    onInterestsUpdate={(updatedInterests) => {
                      setProfileUser(prev => ({
                        ...prev,
                        interests: updatedInterests
                      }));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Modules Sections */}
            <div className="profile-novels-section">
              <CustomDndWrapper 
                onDragEnd={handleCrossSectionDrag}
                canManageModules={canManageModules}
                userStats={userStats}
                canRefreshModules={canRefreshModules}
                handleRefreshModules={handleRefreshModules}
                canRemoveModules={canRemoveModules}
                handleRemoveOngoingModule={handleRemoveOngoingModule}
                handleReorderOngoingModules={handleReorderOngoingModules}
                handleRemoveCompletedModule={handleRemoveCompletedModule}
                handleReorderCompletedModules={handleReorderCompletedModules}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 