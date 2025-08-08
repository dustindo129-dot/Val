import React, { memo, useCallback, useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faSeedling, faClock, faUsers } from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/ModuleList.css';
import api from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { createUniqueSlug, generateLocalizedAddChapterUrl } from '../../utils/slugUtils';
import LoadingSpinner from '../LoadingSpinner';
import { translateChapterModuleStatus } from '../../utils/statusTranslation';
import axios from 'axios';
import config from '../../config/config';
import cdnConfig from '../../config/bunny';

// Lazy load ModuleChapters for consistency
const ModuleChapters = lazy(() => import('./ModuleChapters'));

/**
 * DeleteModuleConfirmationModal Component
 * 
 * Modal component that requires typing the module title to confirm deletion.
 */
const DeleteModuleConfirmationModal = ({ module, onConfirm, onCancel }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isMatch, setIsMatch] = useState(false);
  
  useEffect(() => {
    const moduleTitle = module.title || 'Tập không có tên';
    setIsMatch(confirmText === moduleTitle);
  }, [confirmText, module.title]);
  
  return (
    <div className="delete-confirmation-modal-overlay">
      <div className="delete-confirmation-modal">
        <h3>Xác nhận xóa tập</h3>
        <p>Hành động này không thể hoàn tác. Để xác nhận, hãy nhập chính xác tiêu đề tập: <strong className="non-selectable-text">{module.title || 'Tập không có tên'}</strong></p>
        
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Nhập tiêu đề tập"
          className="confirmation-input"
        />
        
        <div className="confirmation-actions">
          <button 
            onClick={() => onConfirm(module._id)} 
            disabled={!isMatch}
            className={`confirm-delete-btn ${isMatch ? 'enabled' : 'disabled'}`}
          >
            Xóa tập
          </button>
          <button onClick={onCancel} className="cancel-delete-btn">
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
};

const ModuleList = memo(({
  modules,
  novelId,
  novelTitle,
  novel,
  user,
  handleModuleReorder,
  handleModuleDelete,
  handleEditModule,
  handleChapterReorder,
  handleChapterDelete,
  handleOpenRentalModal
}) => {
  const [isReordering, setIsReordering] = useState(false);
  // Add state for delete confirmation modal
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({
    isOpen: false,
    moduleToDelete: null
  });

  // Helper function to check if user has pj_user access
  const checkPjUserAccess = useCallback((pjUserArray, user) => {
    if (!pjUserArray || !Array.isArray(pjUserArray) || !user) return false;
    
    return pjUserArray.some(pjUser => {
      // Handle case where pjUser is an object (new format)
      if (typeof pjUser === 'object' && pjUser !== null) {
        return (
          pjUser._id === user.id ||
          pjUser._id === user._id ||
          pjUser.username === user.username ||
          pjUser.displayName === user.displayName ||
          pjUser.userNumber === user.userNumber
        );
      }
      // Handle case where pjUser is a primitive value (old format)
      return (
        pjUser === user.id ||
        pjUser === user._id ||
        pjUser === user.username ||
        pjUser === user.displayName ||
        pjUser === user.userNumber
      );
    });
  }, []);

  // Check if user can edit (admin, moderator, or pj_user managing this novel)
  const canEdit = user && (
    user.role === 'admin' || 
    user.role === 'moderator' || 
    (user.role === 'pj_user' && checkPjUserAccess(novel?.active?.pj_user, user))
  );




  
  // Check if user can delete (only admin and moderator, not pj_user)
  const canDelete = user && (user.role === 'admin' || user.role === 'moderator');
  
  // Check if user can access paid content (admin only)
  const canAccessPaidContent = user && (
    user.role === 'admin' ||
    user.role === 'moderator' ||
    (user.role === 'pj_user' && checkPjUserAccess(novel?.active?.pj_user, user))
  );

  // Fetch active rentals for the user
  const { data: activeRentals = [] } = useQuery({
    queryKey: ['activeRentals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${config.backendUrl}/api/modules/rentals/active`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error fetching active rentals:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes - data doesn't change that often
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes instead of every minute
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Check if user can see rental stats (admin, moderator, or pj_user managing this novel)
  const canSeeRentalStats = user && (
    user.role === 'admin' || 
    user.role === 'moderator' || 
    (user.role === 'pj_user' && checkPjUserAccess(novel?.active?.pj_user, user))
  );

  // Check if there are any modules in 'rent' mode to optimize the rental counts query
  const hasRentModeModules = modules && modules.some(module => module.mode === 'rent');

  // Check if there are any active rentals that could potentially expire soon
  const hasActiveRentalsNearExpiry = activeRentals.some(rental => {
    if (!rental?.endTime) return false;
    const timeRemaining = new Date(rental.endTime).getTime() - Date.now();
    // Only poll if rentals expire within the next 10 minutes
    return timeRemaining > 0 && timeRemaining <= (10 * 60 * 1000);
  });

  // Fetch rental counts for modules (admin/moderator/pj_user only) - only when there are rent-mode modules
  const { data: rentalCounts = {} } = useQuery({
    queryKey: ['moduleRentalCounts', novelId, user?.id],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${config.backendUrl}/api/modules/${novelId}/rental-counts`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error fetching rental counts:', error);
        return {};
      }
    },
    enabled: !!user && !!novelId && canSeeRentalStats && hasRentModeModules,
    staleTime: 1000 * 60 * 2, // 2 minutes - counts don't change that frequently
    // Only poll if there are active rentals that could expire soon, otherwise just fetch once
    refetchInterval: hasActiveRentalsNearExpiry ? 1000 * 60 * 2 : false,
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Function to get active rental for a specific module
  const getActiveRental = useCallback((moduleId) => {
    return activeRentals.find(rental => rental.module?._id === moduleId);
  }, [activeRentals]);

  // Format countdown timer
  const formatCountdown = useCallback((timeRemaining) => {
    if (!timeRemaining || timeRemaining <= 0) return '00:00:00';
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    // If more than 24 hours remaining, show just hours
    if (hours >= 24) {
      return `${hours}h`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Real-time countdown updates (optimized to reduce re-renders)
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Only update if there are active rentals to avoid unnecessary re-renders
    if (activeRentals.length === 0) {
      return;
    }

    // Update current time every 60 seconds instead of every second to reduce re-renders
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // 60 seconds (1 minute) instead of 10 seconds

    return () => clearInterval(interval);
  }, [activeRentals.length]);

  // Calculate real-time countdown for display
  const getRealTimeCountdown = useCallback((rental) => {
    if (!rental || !rental.endTime) return 0;
    
    const endTime = new Date(rental.endTime).getTime();
    const remaining = endTime - currentTime;
    
    return Math.max(0, remaining);
  }, [currentTime]);
  
  // Check if a module should show rental price (for everyone when module is in rent mode)
  const shouldShowRentalPrice = useCallback((module) => {
    // Module must be in rent mode
    if (module.mode !== 'rent') return false;
    
    // Module must have rental price set
    if (!module.rentBalance || module.rentBalance <= 0) return false;
    
    return true;
  }, []);

  // Check if a module should show rental button (only for non-staff users)
  const shouldShowRentalButton = useCallback((module) => {
    // Must have rental handler prop
    if (!handleOpenRentalModal) return false;
    
    // Must first qualify for showing rental price
    if (!shouldShowRentalPrice(module)) return false;
    
    // Don't show for staff members who already have access
    if (user && canAccessPaidContent) return false;
    
    // Don't show if user already has an active rental for this module
    const activeRental = getActiveRental(module._id);
    const realTimeRemaining = activeRental ? getRealTimeCountdown(activeRental) : 0;
    if (activeRental && realTimeRemaining > 0) return false;
    
    return true;
  }, [handleOpenRentalModal, shouldShowRentalPrice, user, canAccessPaidContent, getActiveRental, getRealTimeCountdown]);

  const handleReorderClick = useCallback(async (moduleId, direction) => {
    if (isReordering) return; // Prevent concurrent reordering
    
    try {
      setIsReordering(true);
      await handleModuleReorder(moduleId, direction);
    } finally {
      // Add a small delay before allowing next reorder
      setTimeout(() => {
        setIsReordering(false);
      }, 500);
    }
  }, [handleModuleReorder, isReordering]);

  /**
   * Opens the delete confirmation modal
   * @param {Object} module - Module to be deleted
   */
  const openDeleteConfirmation = (module) => {
    setDeleteConfirmationModal({
      isOpen: true,
      moduleToDelete: module
    });
  };

  /**
   * Closes the delete confirmation modal
   */
  const closeDeleteConfirmation = () => {
    setDeleteConfirmationModal({
      isOpen: false,
      moduleToDelete: null
    });
  };

  /**
   * Initiates the module deletion process
   * @param {Object} module - Module to delete
   */
  const initiateModuleDelete = (module) => {
    openDeleteConfirmation(module);
  };

  /**
   * Performs the actual module deletion after confirmation
   * @param {string} moduleId - ID of the module to delete
   */
  const confirmModuleDelete = (moduleId) => {
    handleModuleDelete(moduleId);
    closeDeleteConfirmation();
  };

  return (
    <div className="modules-list">
      {/* Delete Confirmation Modal */}
      {deleteConfirmationModal.isOpen && (
        <DeleteModuleConfirmationModal 
          module={deleteConfirmationModal.moduleToDelete}
          onConfirm={confirmModuleDelete}
          onCancel={closeDeleteConfirmation}
        />
      )}

      {modules.map((module, moduleIndex) => (
          <div
              key={module._id}
              className={`module-container ${isReordering ? 'reordering' : ''} ${module.mode ? `module-mode-${module.mode}` : ''}`}
              data-module-id={module._id}
          >
          <div className="module-content">
            <div className="module-cover">
              <img 
                src={cdnConfig.getIllustrationUrl(module.illustration)} 
                alt={`${module.title} cover`}
                className="module-cover-image"
              />
              
              {/* Active rental count for admin/moderator/pj_user (only for rent mode modules) */}
              {canSeeRentalStats && module.mode === 'rent' && (
                <div className="module-rental-count">
                  <FontAwesomeIcon icon={faUsers} className="rental-count-icon" />
                  <span>Người đang mở tạm thời: {rentalCounts[module._id] || 0}</span>
                </div>
              )}
              
              {/* Rental price and button or countdown timer */}
              {shouldShowRentalPrice(module) && (() => {
                const activeRental = getActiveRental(module._id);
                const realTimeRemaining = activeRental ? getRealTimeCountdown(activeRental) : 0;
                const hasActiveRental = activeRental && realTimeRemaining > 0;

                return (
                  <div className="module-rental-overlay">
                    {hasActiveRental ? (
                      // Show countdown timer when user has active rental
                      <div className="module-rental-countdown">
                        <div className="countdown-label">Thời gian mở tạm thời còn lại</div>
                        <div className="countdown-timer">
                          <FontAwesomeIcon icon={faClock} className="countdown-icon" />
                          <span className="countdown-text">{formatCountdown(realTimeRemaining)}</span>
                        </div>
                      </div>
                    ) : (
                      // Show rental price and button when no active rental
                      <>
                        <div className="module-rental-price">
                          <FontAwesomeIcon icon={faClock} className="rent-icon" />
                          <span>Mở tạm thời: {module.rentBalance} 🌾/168h</span>
                        </div>
                        {shouldShowRentalButton(module) && (
                          <button
                            className="module-rental-btn"
                            onClick={() => handleOpenRentalModal(module)}
                            title={`Mở tập này với ${module.rentBalance} 🌾 trong 168 giờ`}
                          >
                            <FontAwesomeIcon icon={faClock} />
                            Mở cả tập (tạm thời)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
              
              {canEdit && (
                <div className="module-reorder-buttons">
                  <div className="reorder-buttons-row">
                    <button
                      className={`reorder-btn ${moduleIndex === 0 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(module._id, 'up')}
                      disabled={moduleIndex === 0 || isReordering}
                      title="Move module up"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <path d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      className={`reorder-btn ${moduleIndex === modules.length - 1 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(module._id, 'down')}
                      disabled={moduleIndex === modules.length - 1 || isReordering}
                      title="Move module down"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        width="16" 
                        height="16"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                  {module.mode === 'paid' && (
                    <div className="module-mode-tag">
                      <span className="mode-tag mode-paid">{translateChapterModuleStatus('PAID')}</span>
                    </div>
                  )}
                  {module.mode === 'draft' && (
                    <div className="module-mode-tag">
                      <span className="mode-tag mode-draft">{translateChapterModuleStatus('DRAFT')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="module-details">
              <div className="module-header">
                <div className="module-title-area">
                  <h3 className={`module-title ${module.mode === 'paid' ? 'paid-module-title' : ''} ${module.mode === 'draft' ? 'draft-module-title' : ''}`}>
                    {module.title || 'Tập không có tên'}
                    {module.mode === 'paid' && module.moduleBalance > 0 && (
                      <div className="module-balance-required">
                        <FontAwesomeIcon icon={faSeedling} className="module-balance-icon balance-icon" />
                        <span>{module.moduleBalance} lúa</span>
                      </div>
                    )}
                  </h3>
                </div>
                
                {canEdit && (
                  <div className="module-actions">
                    <button
                      className="edit-module-btn"
                      onClick={() => handleEditModule(module)}
                      title="Sửa tập"
                    >
                      Sửa
                    </button>
                    {canDelete && (
                      <button
                        className="delete-module-btn"
                        onClick={() => initiateModuleDelete(module)}
                        title="Xóa tập"
                      >
                        Xóa
                      </button>
                    )}
                    <Link
                      to={generateLocalizedAddChapterUrl(
                { _id: novelId, title: novelTitle },
                module
              )}
                      className="add-chapter-btn"
                      title="Thêm chương vào tập"
                    >
                      Thêm chương
                    </Link>
                  </div>
                )}
              </div>

              {/* Render module content without locking layer */}
              <div className="module-content-wrapper">
                <Suspense fallback={<LoadingSpinner />}>
                  <ModuleChapters
                    chapters={module.chapters || []}
                    novelId={novelId}
                    novelTitle={novelTitle}
                    moduleId={module._id}
                    novel={novel}
                    user={user}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    handleChapterReorder={handleChapterReorder}
                    handleChapterDelete={handleChapterDelete}
                    isPaidModule={module.mode === 'paid' || (module.chapters || []).some(chapter => chapter.mode === 'paid')}
                    canAccessPaidContent={canAccessPaidContent}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

ModuleList.displayName = 'ModuleList';

export default ModuleList; 