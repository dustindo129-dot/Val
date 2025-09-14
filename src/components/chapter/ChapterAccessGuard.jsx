import React, { useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCog, faClock } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { generateNovelUrl } from '../../utils/slugUtils';
import LoadingSpinner from '../LoadingSpinner';
import '../../styles/components/ChapterAccessGuard.css';

/**
 * ChapterAccessGuard Component
 * 
 * Displays appropriate messages when a user doesn't have access to chapter content
 */
const ChapterAccessGuard = ({ 
  chapter, 
  moduleData, 
  user, 
  novel, 
  children,
  // Modal handlers from parent
  onOpenRentalModal,
  onCloseRentalModal,
  onRentalSuccess,
  // Loading state for access checks
  isLoadingAccess = false,
  // Trust parent's access decision to avoid duplicate logic
  bypassAccessCheck = false
}) => {
  const navigate = useNavigate();
  // Add null check to prevent destructuring errors during hot reloads
  const authResult = useAuth();
  const { isAuthenticated } = authResult || { 
    isAuthenticated: false 
  };
  
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
  
  // Rental modal handlers - use parent handlers if provided
  const handleOpenRentalModal = useCallback((module) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để mở tạm thời tập');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }
    
    if (onOpenRentalModal) {
      onOpenRentalModal(module);
    }
  }, [isAuthenticated, onOpenRentalModal]);

  // Check if module should show rental option
  const shouldShowRentalButton = useCallback(() => {
    // Must be a paid chapter in a published module OR paid module with rental available
    const isPaidChapter = chapter?.mode === 'paid';
    const isPaidModule = moduleData?.mode === 'paid';
    const moduleHasRentBalance = moduleData?.rentBalance > 0;
    const moduleIsInRentMode = moduleData?.mode === 'rent';
    
    // Show rental button if:
    // 1. Module exists
    // 2. Either chapter or module is paid
    // 3. Module has rental price set
    // 4. Module is in rent mode (supports rentals)
    const shouldShow = moduleData && 
                      (isPaidChapter || isPaidModule) && 
                      moduleHasRentBalance &&
                      moduleIsInRentMode;
    
    return shouldShow;
  }, [chapter, moduleData]);
  
  // Check if user has access to chapter content based on mode
  const canAccessChapterContent = (chapter, user) => {

    if (!chapter || !chapter.mode) {
      return true; // Default to accessible if no mode specified
    }
    
    // CRITICAL: Check server's access decision first
    if (chapter.accessDenied) {
      return false;
    }
    
    switch (chapter.mode) {
      case 'published':
        return true; // Published is accessible to everyone
      case 'protected':
        // CRITICAL FIX: For protected content, check both isAuthenticated state AND user object
        // This handles race conditions where auth state might not be fully synced
        const hasAccess = isAuthenticated || (user && user._id);
        return hasAccess; // Protected requires user to be logged in
      case 'draft':
        const canAccessDraft = user?.role === 'admin' || user?.role === 'moderator' ||
          (user?.role === 'pj_user' && chapter.novel && checkPjUserAccess(chapter.novel.active?.pj_user, user));

        // Also check if user has chapter-specific roles
        if (!canAccessDraft && user && chapter) {
          // Check if user is assigned as translator, editor, or proofreader on this chapter
          const staffFields = ['translator', 'editor', 'proofreader'];
          const userIdentifiers = [
            user._id?.toString(),
            user.id?.toString(), 
            user.username,
            user.displayName,
            user.userNumber?.toString()
          ].filter(Boolean);
          
          const hasChapterRole = staffFields.some(field => {
            const staffValue = chapter[field];
            if (!staffValue) return false;
            
            if (typeof staffValue === 'object' && staffValue !== null) {
              const staffIdentifiers = [
                staffValue._id?.toString(),
                staffValue.id?.toString(),
                staffValue.username,
                staffValue.displayName,
                staffValue.userNumber?.toString()
              ].filter(Boolean);
              
              return userIdentifiers.some(userId => staffIdentifiers.includes(userId));
            }
            
            return userIdentifiers.includes(staffValue?.toString());
          });
          
          if (hasChapterRole) {
            return true;
          }
          
          // Also check novel-level translator/editor/proofreader roles
          if (chapter.novel?.active) {
            const checkUserInStaffList = (staffList) => {
              if (!staffList || !Array.isArray(staffList)) return false;
              return staffList.some(staffValue => {
                if (typeof staffValue === 'object' && staffValue !== null) {
                  return staffValue._id?.toString() === user._id?.toString() ||
                         staffValue.username === user.username ||
                         staffValue.displayName === user.displayName ||
                         staffValue.userNumber?.toString() === user.userNumber?.toString();
                }
                return staffValue?.toString() === user._id?.toString() ||
                       staffValue === user.username ||
                       staffValue === user.displayName ||
                       staffValue?.toString() === user.userNumber?.toString();
              });
            };
            
            return checkUserInStaffList(chapter.novel.active.translator) ||
                   checkUserInStaffList(chapter.novel.active.editor) ||
                   checkUserInStaffList(chapter.novel.active.proofreader);
          }
        }

        return canAccessDraft; // Draft accessible to admin, moderator, assigned pj_user, and chapter/novel staff
      case 'paid':

        
        // SECURITY FIX: Check user permissions first, not content existence
        // Admin, moderator, and pj_user for their assigned novels have access
        if (user && (
          user.role === 'admin' || 
          user.role === 'moderator' ||
          (user.role === 'pj_user' && chapter.novel && checkPjUserAccess(chapter.novel.active?.pj_user, user))
        )) {

          return true;
        }
        
        // Check if user has active rental for this module
        if (chapter?.rentalInfo?.hasActiveRental) {

          return true;
        }
        
        // Check if backend has explicitly granted access (e.g., user purchased the chapter)
        // This should be set by the backend when the user has legitimate access
        if (chapter.hasUserAccess === true) {

          return true;
        }
        
        // Default: no access to paid content
        return false;
      default:
        return true;
    }
  };

  // Check if user has access to paid module content
  const canAccessPaidModule = (moduleData, user) => {
    if (!moduleData || moduleData.mode !== 'paid') {
      return true; // Not a paid module
    }
    
    // SECURITY FIX: Check user permissions first
    // Admin, moderator, and pj_user for their assigned novels have access
    if (user && (
      user.role === 'admin' || 
      user.role === 'moderator' ||
      (user.role === 'pj_user' && moduleData.novel && checkPjUserAccess(moduleData.novel.active?.pj_user, user))
    )) {
      return true;
    }
    
    // Check if user has active rental for this module
    if (chapter?.rentalInfo?.hasActiveRental) {
      return true; // User has active rental access
    }
    
    // Check if backend has explicitly granted access (e.g., user purchased the module)
    if (moduleData.hasUserAccess === true) {
      return true;
    }
    
    // Default: no access to paid module content
    return false;
  };

  const hasChapterAccess = canAccessChapterContent(chapter, user);
  const hasModuleAccess = canAccessPaidModule(moduleData, user);

  // Check if user can access paid content
  const canAccessPaidContent = user && (
    user.role === 'admin' || 
    user.role === 'moderator' ||
    (user.role === 'pj_user' && (
      (chapter?.novel && checkPjUserAccess(chapter.novel.active?.pj_user, user)) ||
      (moduleData?.novel && checkPjUserAccess(moduleData.novel.active?.pj_user, user))
    ))
  );
  
  // Check if this chapter is in paid mode
  const isPaidChapter = chapter?.mode === 'paid';
  
  // Check if this module is in paid mode
  const isPaidModule = moduleData?.mode === 'paid';
  
  // Show loading state when checking access
  if (isLoadingAccess) {
    return (
      <div className="restricted-content-message">
        <div className="chapter-access-guard">
          <div className="locked-chapter-container">
            <div className="locked-chapter-content">
              <LoadingSpinner size="medium" text="Đang kiểm tra quyền truy cập..." />
            </div>
          </div>
        </div>
      </div>
    );
  }
  


  // If parent component has already verified access, trust that decision
  // BUT never override an explicit server-side access denial
  if (bypassAccessCheck && !chapter?.accessDenied) {

    return children;
  }



  if (!hasChapterAccess || !hasModuleAccess) {
    return (
      <div className="restricted-content-message">
        {chapter?.mode === 'protected' && (
          <div className="protected-content">
            <FontAwesomeIcon icon={faLock} size="3x" />
            <h3>Nội dung bảo mật</h3>
            <p>Vui lòng đăng nhập để đọc chương này.</p>
          </div>
        )}
        {chapter?.mode === 'draft' && (
          <div className="draft-content">
            <FontAwesomeIcon icon={faCog} size="3x" />
            <h3>Nội dung nháp</h3>
            <p>Chương này đang ở chế độ nháp và không khả dụng cho người dùng.</p>
          </div>
        )}
        {isPaidChapter && !canAccessPaidContent && (
          <div className="chapter-access-guard">
            <div className="locked-chapter-container">
              <div className="locked-chapter-content">
                <FontAwesomeIcon icon={faLock} className="locked-chapter-icon" />
                <h3>Chương này yêu cầu thanh toán để truy cập</h3>
                <p>Cần {chapter.chapterBalance || 0} 🌾 để mở khóa.</p>
                <div className="locked-chapter-actions">
                  <button 
                    className="go-to-market-btn"
                    onClick={() => {
                      const novelData = novel || chapter?.novel;
                      if (novelData) {
                        const novelUrl = generateNovelUrl(novelData);
                        navigate(novelUrl, {
                          state: { scrollToContribution: true }
                        });
                      }
                    }}
                  >
                    Tới Kho lúa
                  </button>
                  {shouldShowRentalButton() && (
                    <button
                      className="rent-module-btn"
                      onClick={() => handleOpenRentalModal(moduleData)}
                      title={`Mở tạm thời tập này với ${moduleData.rentBalance} 🌾 trong 1 tuần`}
                    >
                      <FontAwesomeIcon icon={faClock} />
                      Mở cả tập (tạm thời)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {isPaidModule && !canAccessPaidContent && (
          <div className="chapter-access-guard">
            <div className="locked-chapter-container">
              <div className="locked-chapter-content">
                <FontAwesomeIcon icon={faLock} className="locked-chapter-icon" />
                <h3>Chương này yêu cầu thanh toán để truy cập</h3>
                <p>Cần {moduleData.moduleBalance || 0} 🌾 để mở khóa.</p>
                <div className="locked-chapter-actions">
                  <button 
                    className="go-to-market-btn"
                    onClick={() => {
                      const novelData = novel || moduleData?.novel;
                      if (novelData) {
                        const novelUrl = generateNovelUrl(novelData);
                        navigate(novelUrl, {
                          state: { scrollToContribution: true }
                        });
                      }
                    }}
                  >
                    Tới Kho lúa
                  </button>
                  {shouldShowRentalButton() && (
                    <button
                      className="rent-module-btn"
                      onClick={() => handleOpenRentalModal(moduleData)}
                      title={`Mở tạm thời tập này với ${moduleData.rentBalance} 🌾 trong 1 tuần`}
                    >
                      <FontAwesomeIcon icon={faClock} />
                      Mở cả tập (tạm thời)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    );
  }



  return children;
};

export default ChapterAccessGuard; 