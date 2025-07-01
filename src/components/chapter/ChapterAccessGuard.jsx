import React, { useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCog, faClock } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { generateNovelUrl } from '../../utils/slugUtils';
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
  onRentalSuccess
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Rental modal handlers - use parent handlers if provided
  const handleOpenRentalModal = useCallback((module) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để thuê tập');
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
    
    // Show rental button if:
    // 1. Module exists
    // 2. Either chapter or module is paid
    // 3. Module has rental price set
    // 4. User is authenticated
    const shouldShow = moduleData && 
                      (isPaidChapter || isPaidModule) && 
                      moduleHasRentBalance && 
                      isAuthenticated;
    
    return shouldShow;
  }, [chapter, moduleData, isAuthenticated, user]);
  
  // Check if user has access to chapter content based on mode
  const canAccessChapterContent = (chapter, user) => {
    if (!chapter || !chapter.mode) return true; // Default to accessible if no mode specified
    
    switch (chapter.mode) {
      case 'published':
        return true; // Published is accessible to everyone
      case 'protected':
        return isAuthenticated; // Protected requires user to be logged in
      case 'draft':
        return user?.role === 'admin' || user?.role === 'moderator' ||
          (user?.role === 'pj_user' && chapter.novel && (
            chapter.novel.active?.pj_user?.includes(user.id) || 
            chapter.novel.active?.pj_user?.includes(user.username)
          )); // Draft accessible to admin, moderator, and assigned pj_user
      case 'paid':
        // Check if backend has already granted access (rental or role-based)
        if (chapter.content && chapter.content.length > 0) {
          return true; // Backend has provided content, access is granted
        }
        
        // Fallback: Allow admin, moderator, and pj_user for their assigned novels
        return user && (
          user.role === 'admin' || 
          user.role === 'moderator' ||
          (user.role === 'pj_user' && chapter.novel && (
            chapter.novel.active?.pj_user?.includes(user.id) || 
            chapter.novel.active?.pj_user?.includes(user.username)
          ))
        );
      default:
        return true;
    }
  };

  // Check if user has access to paid module content
  const canAccessPaidModule = (moduleData, user) => {
    if (!moduleData || moduleData.mode !== 'paid') return true; // Not a paid module
    
    // Check if user has active rental for this module
    if (chapter?.rentalInfo?.hasActiveRental) {
      return true; // User has active rental access
    }
    
    // Fallback: Allow admin, moderator, and pj_user for their assigned novels
    return user && (
      user.role === 'admin' || 
      user.role === 'moderator' ||
      (user.role === 'pj_user' && moduleData.novel && (
        moduleData.novel.active?.pj_user?.includes(user.id) || 
        moduleData.novel.active?.pj_user?.includes(user.username)
      ))
    );
  };

  const hasChapterAccess = canAccessChapterContent(chapter, user);
  const hasModuleAccess = canAccessPaidModule(moduleData, user);

  // Check if user can access paid content
  const canAccessPaidContent = user && (
    user.role === 'admin' || 
    user.role === 'moderator' ||
    (user.role === 'pj_user' && (
      (chapter?.novel && (
        chapter.novel.active?.pj_user?.includes(user.id) || 
        chapter.novel.active?.pj_user?.includes(user.username)
      )) ||
      (moduleData?.novel && (
        moduleData.novel.active?.pj_user?.includes(user.id) || 
        moduleData.novel.active?.pj_user?.includes(user.username)
      ))
    ))
  );
  
  // Check if this chapter is in paid mode
  const isPaidChapter = chapter?.mode === 'paid';
  
  // Check if this module is in paid mode
  const isPaidModule = moduleData?.mode === 'paid';
  
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
                      title={`Thuê tập này với ${moduleData.rentBalance} 🌾 trong 24 giờ`}
                    >
                      <FontAwesomeIcon icon={faClock} />
                      Thuê tập
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
                      title={`Thuê tập này với ${moduleData.rentBalance} 🌾 trong 24 giờ`}
                    >
                      <FontAwesomeIcon icon={faClock} />
                      Thuê tập
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