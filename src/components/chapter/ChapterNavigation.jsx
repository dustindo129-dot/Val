import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faLock } from '@fortawesome/free-solid-svg-icons';

const ChapterNavigation = ({ 
  chapter, 
  isNavigating, 
  isEditing, 
  handlePrevChapter, 
  handleNextChapter,
  position = 'top', // 'top' or 'bottom' to style differently if needed
  user // Add user prop to check permissions
}) => {
  // Helper function to check if user has pj_user access
  const checkPjUserAccess = (pjUserArray, user) => {
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
  };

  // Function to check if user can access a draft chapter
  const canAccessDraftChapter = (targetChapter, user) => {
    if (!targetChapter || targetChapter.mode !== 'draft') {
      return true; // Non-draft chapters are always accessible (access control handled elsewhere)
    }
    
    if (!user) {
      return false; // Not authenticated
    }
    
    // Admin and moderator can access all draft chapters
    if (user.role === 'admin' || user.role === 'moderator') {
      return true;
    }
    
    // pj_user can access draft chapters for their assigned novels
    if (user.role === 'pj_user' && chapter?.novel && checkPjUserAccess(chapter.novel.active?.pj_user, user)) {
      return true;
    }
    
    return false; // Default: no access to draft chapters
  };

  // Check if navigation targets are accessible to current user
  const canAccessPrevChapter = canAccessDraftChapter(chapter?.prevChapter, user);
  const canAccessNextChapter = canAccessDraftChapter(chapter?.nextChapter, user);

  // Determine if button should be disabled
  // Disable if no chapter, currently navigating/editing, or user can't access draft chapter
  const isPrevDisabled = !chapter?.prevChapter || !canAccessPrevChapter || isNavigating || isEditing;
  const isNextDisabled = !chapter?.nextChapter || !canAccessNextChapter || isNavigating || isEditing;

  // Helper functions for button text and titles
  const getPrevButtonText = () => {
    if (isNavigating) return 'Đang tải...';
    if (!chapter?.prevChapter) return 'Không có chương trước';
    if (!canAccessPrevChapter) return 'Không có chương trước';
    return 'Chương trước';
  };

  const getNextButtonText = () => {
    if (isNavigating) return 'Đang tải...';
    if (!chapter?.nextChapter) return 'Không có chương tiếp';
    if (!canAccessNextChapter) return 'Không có chương tiếp' ;
    return 'Chương tiếp';
  };

  const getPrevButtonTitle = () => {
    if (!chapter?.prevChapter) return 'Không có chương trước';
    if (!canAccessPrevChapter) return 'Không có chương trước có thể truy cập';
    return `Chương trước: ${chapter.prevChapter.title}`;
  };

  const getNextButtonTitle = () => {
    if (!chapter?.nextChapter) return 'Không có chương tiếp';
    if (!canAccessNextChapter) return 'Không có chương tiếp có thể truy cập';
    return `Chương tiếp: ${chapter.nextChapter.title}`;
  };

  return (
    <div className={`chapter-navigation ${position === 'bottom' ? 'bottom' : ''}`}>
      <button
        onClick={handlePrevChapter}
        disabled={isPrevDisabled}
        className={`nav-button ${isPrevDisabled ? 'nav-button-disabled' : ''}`}
        title={getPrevButtonTitle()}
      >
        <FontAwesomeIcon icon={faChevronLeft}/>
        {getPrevButtonText()}
      </button>

      <button
        onClick={handleNextChapter}
        disabled={isNextDisabled}
        className={`nav-button ${isNextDisabled ? 'nav-button-disabled' : ''}`}
        title={getNextButtonTitle()}
      >
        {getNextButtonText()}
        <FontAwesomeIcon icon={faChevronRight}/>
      </button>
    </div>
  );
};

export default ChapterNavigation; 