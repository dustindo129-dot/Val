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

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import config from '../config/config';
import LoadingSpinner from '../components/LoadingSpinner';

import DraggableModuleList from '../components/DraggableModuleList';
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
import './UserProfile.css';
import '../components/DraggableModuleList.css';

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
      <meta property="og:image" content={profileUser?.avatar || "https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif"} />
      <meta property="og:url" content={`https://valvrareteam.net/nguoi-dung/${username}/trang-ca-nhan`} />
      <meta property="og:type" content="profile" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${displayName} - Trang Cá Nhân | Valvrareteam`} />
      <meta name="twitter:description" content={`Trang cá nhân của ${displayName} tại Valvrareteam.`} />
      <meta name="twitter:image" content={profileUser?.avatar || "https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif"} />
    </Helmet>
  );
};

/**
 * UserProfile Component
 * 
 * Main component for displaying user profile information
 */
const UserProfile = () => {
  // Get username from URL parameters
  const { username } = useParams();
  // Get current user context
  const { user } = useAuth();
  
  // State management
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState({
    chaptersParticipated: 0,
    commentsCount: 0,
    ongoingModules: [],
    completedModules: []
  });

  // Check if current user is viewing their own profile
  const isOwnProfile = user && profileUser && user.username === profileUser.username;
  
  // Drag and drop sensors for cross-section dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor)
  );
  
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

  // Separate permission for refresh button - admin/mod only
  const canRefreshModules = user && ['admin', 'moderator'].includes(user.role);

  /**
   * Fetch user profile data
   */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${config.backendUrl}/api/users/${username}/public-profile`
        );
        
        setProfileUser(response.data);
        
        // Always fetch module data for display (visitors can see them)
        const displayNameSlug = response.data.displayName ? createSlug(response.data.displayName) : response.data.username;
        
        try {
          const [userModules, chaptersParticipated, followingCount, commentsCount] = await Promise.all([
            // Fetch user's modules based on their novel roles and existing preferences
            axios.get(`${config.backendUrl}/api/users/${response.data._id}/role-modules`),
            // Fetch actual chapter participation count for this user (as translator, editor, or proofreader)
            axios.get(`${config.backendUrl}/api/chapters/participation/user/${response.data._id}`),
            // Fetch actual following count for this user
            axios.get(`${config.backendUrl}/api/usernovelinteractions/following/count/${response.data._id}`),
            // Fetch actual comment count for this user (including replies)
            axios.get(`${config.backendUrl}/api/comments/count/user/${response.data._id}`)
          ]);
          
          setUserStats({
            chaptersParticipated: chaptersParticipated.data.count || 0,
            followingCount: followingCount.data.count || 0,
            commentsCount: commentsCount.data.count || 0,
            ongoingModules: userModules.data.ongoingModules || [],
            completedModules: userModules.data.completedModules || []
          });
        } catch (moduleError) {
          console.error('Error fetching user stats:', moduleError);
          setUserStats({
            chaptersParticipated: 0,
            followingCount: 0,
            commentsCount: 0,
            ongoingModules: [],
            completedModules: []
          });
        }
        
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username, user]);

  /**
   * Check if user has novel-specific roles (translator, editor, proofreader)
   */
  useEffect(() => {
    const checkNovelRoles = async () => {
      if (!user || !isOwnProfile) {
        setHasNovelRoles(false);
        return;
      }

      // Skip check if user already has system-level permissions
      if (['admin', 'moderator', 'pj_user'].includes(user.role)) {
        setHasNovelRoles(true);
        return;
      }

      try {
        // Check if user has any novel-specific roles
        const response = await axios.get(
          `${config.backendUrl}/api/users/${user._id}/novel-roles`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        setHasNovelRoles(response.data.hasNovelRoles || false);
      } catch (error) {
        console.error('Error checking novel roles:', error);
        setHasNovelRoles(false);
      }
    };

    checkNovelRoles();
  }, [user, isOwnProfile]);

  // Module management functions
  const handleMoveToCompleted = async (moduleId) => {
    if (!canManageModules) return;
    
    try {
      await axios.post(`${config.backendUrl}/api/users/${profileUser._id}/move-module-to-completed`, {
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
      await axios.post(`${config.backendUrl}/api/users/${profileUser._id}/move-module-to-ongoing`, {
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
      await axios.delete(`${config.backendUrl}/api/users/${profileUser._id}/ongoing-modules/${moduleId}`, {
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
      await axios.delete(`${config.backendUrl}/api/users/${profileUser._id}/completed-modules/${moduleId}`, {
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
  const handleRefreshModules = async () => {
    if (!canRefreshModules) return;
    
    try {
      // Refetch user modules from backend
      const response = await axios.get(`${config.backendUrl}/api/users/${profileUser._id}/role-modules`);
      
      setUserStats(prev => ({
        ...prev,
        ongoingModules: response.data.ongoingModules || [],
        completedModules: response.data.completedModules || []
      }));
      
      // Show success message
      alert('Đã làm mới danh sách tập thành công');
    } catch (error) {
      console.error('Error refreshing modules:', error);
      alert('Không thể làm mới danh sách tập');
    }
  };

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
      await axios.put(`${config.backendUrl}/api/users/${profileUser._id}/reorder-ongoing-modules`, {
        moduleIds: moduleIds
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Error reordering ongoing modules:', error);
      alert('Không thể sắp xếp lại danh sách đang tiến hành');
      
      // Revert local state on error - refetch user modules
      try {
        const userModules = await axios.get(`${config.backendUrl}/api/users/${profileUser._id}/role-modules`);
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
      await axios.put(`${config.backendUrl}/api/users/${profileUser._id}/reorder-completed-modules`, {
        moduleIds: moduleIds
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Error reordering completed modules:', error);
      alert('Không thể sắp xếp lại danh sách đã hoàn thành');
      
      // Revert local state on error - refetch user modules
      try {
        const userModules = await axios.get(`${config.backendUrl}/api/users/${profileUser._id}/role-modules`);
        setUserStats(prev => ({
          ...prev,
          completedModules: userModules.data.completedModules || []
        }));
      } catch (revertError) {
        console.error('Error reverting completed modules:', revertError);
      }
    }
  };

  // Handle cross-section dragging (ongoing <-> completed)
  const handleCrossSectionDrag = (event) => {
    const { active, over } = event;
    
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
    
    // Cross-section moves
    if (activeInOngoing && droppingInCompleted) {
      handleMoveToCompleted(activeId);
      return;
    }
    
    if (activeInCompleted && droppingInOngoing) {
      handleMoveToOngoing(activeId);
      return;
    }
    
    // Handle reordering within the same section
    if (activeId !== overId && over) {
      // Reorder within ongoing section
      if (activeInOngoing && (overIsOngoingItem || overIsOngoingContainer)) {
        const oldIndex = userStats.ongoingModules.findIndex(item => item.moduleId._id === activeId);
        const newIndex = userStats.ongoingModules.findIndex(item => item.moduleId._id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(userStats.ongoingModules, oldIndex, newIndex);
          handleReorderOngoingModules(newOrder);
        }
        return;
      }
      
      // Reorder within completed section
      if (activeInCompleted && (overIsCompletedItem || overIsCompletedContainer)) {
        const oldIndex = userStats.completedModules.findIndex(item => item.moduleId._id === activeId);
        const newIndex = userStats.completedModules.findIndex(item => item.moduleId._id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(userStats.completedModules, oldIndex, newIndex);
          handleReorderCompletedModules(newOrder);
        }
        return;
      }
    }
  };

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
      <UserProfileSEO profileUser={profileUser} username={username} />
      
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
                  src={profileUser.avatar || '/default-avatar.png'}
                  alt={`${profileUser.displayName || profileUser.username}'s avatar`}
                  className="profile-avatar-image"
                />
              </div>
              
              <div className="profile-user-info">
                <h1 className="profile-username">
                  {profileUser.displayName || profileUser.username}
                  {(profileUser.role === 'admin' || profileUser.role === 'moderator') && (
                    <span className="verification-badge" title="Đã xác minh">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  )}
                </h1>
                
                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="stat-number">{userStats.chaptersParticipated}</span>
                    <span className="stat-label">Chương đã tham gia</span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-number">{userStats.followingCount}</span>
                    <span className="stat-label">Đang theo dõi</span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-number">{userStats.commentsCount}</span>
                    <span className="stat-label">Bình luận</span>
                  </div>
                </div>

                <div className="profile-meta">
                  <div className="meta-item">
                    <i className="fa-solid fa-clock"></i>
                    <span>Tham gia: {new Date(profileUser.createdAt).toLocaleDateString('vi-VN')}</span>
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
            {/* Left Column - Notes/About Section */}
            <div className="profile-notes-section">
              <div className="notes-card">
                <h3>Ghi chú</h3>
                <div className="notes-content">
                  <p>Thử nghiệm, chưa đúng chính thức.</p>
                  
                  <div className="profile-interests-tags">
                    <span className="profile-interest-tag">Học Nghệ</span>
                    <span className="profile-interest-tag">Nhà Mao Hiểm</span>
                    <span className="profile-interest-tag">Chuyển Giả</span>
                    <span className="profile-interest-tag">Đại Sư</span>
                    <span className="profile-interest-tag">Thần Đấu</span>
                    <span className="profile-interest-tag">Quân Quân</span>
                    <span className="profile-interest-tag">Truyền Kỳ</span>
                    <span className="profile-interest-tag">Sử Thi</span>
                    <span className="profile-interest-tag">Thần Thoại</span>
                    <span className="profile-interest-tag">Vô Địch</span>
                    <span className="profile-interest-tag">Phi Thăng</span>
                    <span className="profile-interest-tag">Thành Vực</span>
                    <span className="profile-interest-tag">Hàng Tình</span>
                    <span className="profile-interest-tag">Thiên Hà</span>
                    <span className="profile-interest-tag">Đại Vô Trụ</span>
                    <span className="profile-interest-tag">Đại Vì Trụ</span>
                    <span className="profile-interest-tag">Siêu Việt</span>
                    <span className="profile-interest-tag">Toàn Tri</span>
                    <span className="profile-interest-tag">Toàn Năng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Modules Sections */}
            <div className="profile-novels-section">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCrossSectionDrag}
              >
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
                  />
                </div>
              </DndContext>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 