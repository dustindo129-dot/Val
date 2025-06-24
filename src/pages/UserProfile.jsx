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
import ModuleSearch from '../components/ModuleSearch';
import DraggableModuleList from '../components/DraggableModuleList';
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
    chaptersPosted: 0,
    commentsCount: 0,
    ongoingModules: [],
    completedModules: []
  });

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
          const [ongoingModules, completedModules] = await Promise.all([
            api.getOngoingModules(displayNameSlug),
            api.getCompletedModules(displayNameSlug)
          ]);
          
          setUserStats({
            chaptersPosted: 51, // Mock data - you can replace with real data
            commentsCount: 435, // Mock data - you can replace with real data
            ongoingModules: ongoingModules || [],
            completedModules: completedModules || []
          });
        } catch (moduleError) {
          console.error('Error fetching modules:', moduleError);
          setUserStats({
            chaptersPosted: 51,
            commentsCount: 435,
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
  const handleAddOngoingModule = async (module) => {
    if (!canManageModules) return;
    
    // Check if module is already in ongoing list
    const isAlreadyInOngoing = userStats.ongoingModules.some(
      item => item.moduleId._id === module._id
    );
    
    if (isAlreadyInOngoing) {
      // Module is already in the list, do nothing
      return;
    }
    
    try {
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      const result = await api.addOngoingModule(displayNameSlug, module._id);
      
      // If backend says it already exists, don't update the list
      if (result.alreadyExists) {
        return;
      }
      
      // Update the state optimistically instead of refetching
      setUserStats(prev => ({
        ...prev,
        ongoingModules: [
          {
            moduleId: module,
            addedAt: new Date().toISOString()
          },
          ...prev.ongoingModules
        ],
        // Remove from completed if it was there
        completedModules: prev.completedModules.filter(
          item => item.moduleId._id !== module._id
        )
      }));
    } catch (error) {
      console.error('Error adding ongoing module:', error);
      alert('Không thể thêm tập vào danh sách đang tiến hành');
    }
  };

  const handleAddCompletedModule = async (module) => {
    if (!canManageModules) return;
    
    // Check if module is already in completed list
    const isAlreadyInCompleted = userStats.completedModules.some(
      item => item.moduleId._id === module._id
    );
    
    if (isAlreadyInCompleted) {
      // Module is already in the list, do nothing
      return;
    }
    
    try {
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      const result = await api.addCompletedModule(displayNameSlug, module._id);
      
      // If backend says it already exists, don't update the list
      if (result.alreadyExists) {
        return;
      }
      
      // Update the state optimistically instead of refetching
      setUserStats(prev => ({
        ...prev,
        completedModules: [
          {
            moduleId: module,
            addedAt: new Date().toISOString()
          },
          ...prev.completedModules
        ],
        // Remove from ongoing if it was there
        ongoingModules: prev.ongoingModules.filter(
          item => item.moduleId._id !== module._id
        )
      }));
    } catch (error) {
      console.error('Error adding completed module:', error);
      alert('Không thể thêm tập vào danh sách đã hoàn thành');
    }
  };

  const handleRemoveOngoingModule = async (moduleId) => {
    if (!canManageModules) return;
    
    try {
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      await api.removeOngoingModule(displayNameSlug, moduleId);
      
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
    if (!canManageModules) return;
    
    try {
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      await api.removeCompletedModule(displayNameSlug, moduleId);
      
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

  // Module reordering functions
  const handleReorderOngoingModules = async (newOrder) => {
    if (!canManageModules) return;
    
    try {
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      const moduleIds = newOrder.map(item => item.moduleId._id);
      
      // Update local state immediately for better UX
      setUserStats(prev => ({
        ...prev,
        ongoingModules: newOrder
      }));
      
      // Send to backend
      await api.reorderOngoingModules(displayNameSlug, moduleIds);
    } catch (error) {
      console.error('Error reordering ongoing modules:', error);
      alert('Không thể sắp xếp lại danh sách đang tiến hành');
      
      // Revert local state on error
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      try {
        const ongoingModules = await api.getOngoingModules(displayNameSlug);
        setUserStats(prev => ({
          ...prev,
          ongoingModules: ongoingModules || []
        }));
      } catch (revertError) {
        console.error('Error reverting ongoing modules:', revertError);
      }
    }
  };

  const handleReorderCompletedModules = async (newOrder) => {
    if (!canManageModules) return;
    
    try {
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      const moduleIds = newOrder.map(item => item.moduleId._id);
      
      // Update local state immediately for better UX
      setUserStats(prev => ({
        ...prev,
        completedModules: newOrder
      }));
      
      // Send to backend
      await api.reorderCompletedModules(displayNameSlug, moduleIds);
    } catch (error) {
      console.error('Error reordering completed modules:', error);
      alert('Không thể sắp xếp lại danh sách đã hoàn thành');
      
      // Revert local state on error
      const displayNameSlug = profileUser.displayName ? createSlug(profileUser.displayName) : profileUser.username;
      try {
        const completedModules = await api.getCompletedModules(displayNameSlug);
        setUserStats(prev => ({
          ...prev,
          completedModules: completedModules || []
        }));
      } catch (revertError) {
        console.error('Error reverting completed modules:', revertError);
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
                    <span className="stat-number">{userStats.chaptersPosted}</span>
                    <span className="stat-label">Chương đã đăng</span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-number">12</span>
                    <span className="stat-label">Đang theo dõi</span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-number">{userStats.commentsCount}</span>
                    <span className="stat-label">Bình luận</span>
                  </div>
                </div>

                <div className="profile-meta">
                  <div className="meta-item">
                    <i className="fa-solid fa-calendar-days"></i>
                    <span>Ngày sinh: {new Date(profileUser.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
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
              {/* Ongoing Modules */}
              <div className="novels-card ongoing-novels">
                <div className="card-header">
                  <h3>
                    <span className="section-number">{userStats.ongoingModules.length}</span>
                    Đang tiến hành
                  </h3>
                  {canManageModules && (
                    <ModuleSearch 
                      onModuleSelect={handleAddOngoingModule}
                      placeholder="Thêm tập đang tiến hành..."
                    />
                  )}
                </div>
                <DraggableModuleList
                  modules={userStats.ongoingModules}
                  canManageModules={canManageModules}
                  onRemove={handleRemoveOngoingModule}
                  onReorder={handleReorderOngoingModules}
                  emptyMessage={canManageModules ? 'Chưa có tập đang tiến hành' : 'Không có tập đang tiến hành'}
                  type="ongoing"
                />
              </div>

              {/* Completed Modules */}
              <div className="novels-card completed-novels">
                <div className="card-header">
                  <h3>
                    <span className="section-number">{userStats.completedModules.length}</span>
                    Đã hoàn thành
                  </h3>
                  {canManageModules && (
                    <ModuleSearch 
                      onModuleSelect={handleAddCompletedModule}
                      placeholder="Thêm tập đã hoàn thành..."
                    />
                  )}
                </div>
                <DraggableModuleList
                  modules={userStats.completedModules}
                  canManageModules={canManageModules}
                  onRemove={handleRemoveCompletedModule}
                  onReorder={handleReorderCompletedModules}
                  emptyMessage={canManageModules ? 'Chưa có tập đã hoàn thành' : 'Không có tập đã hoàn thành'}
                  type="completed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 