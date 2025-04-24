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
  // Check if user can access paid content
  const canAccessPaidContent = user && (user.role === 'admin' || user.role === 'moderator');
  
  // Check if next chapter is paid content
  const isNextChapterPaid = chapter?.nextChapter?.mode === 'paid';
  
  // Check if previous chapter is paid content
  const isPrevChapterPaid = chapter?.prevChapter?.mode === 'paid';
  
  // Determine if button should be disabled
  const isPrevDisabled = !chapter?.prevChapter || isNavigating || isEditing || (isPrevChapterPaid && !canAccessPaidContent);
  const isNextDisabled = !chapter?.nextChapter || isNavigating || isEditing || (isNextChapterPaid && !canAccessPaidContent);

  return (
    <div className={`chapter-navigation ${position === 'bottom' ? 'bottom' : ''}`}>
      <button
        onClick={handlePrevChapter}
        disabled={isPrevDisabled}
        className={`nav-button ${!chapter?.prevChapter ? 'nav-button-disabled' : ''} ${isPrevChapterPaid && !canAccessPaidContent ? 'paid-content-btn' : ''}`}
        title={chapter?.prevChapter 
          ? isPrevChapterPaid && !canAccessPaidContent 
            ? `Previous: ${chapter.prevChapter.title} (Paid Content)` 
            : `Previous: ${chapter.prevChapter.title}`
          : 'No previous chapter available'}
      >
        <FontAwesomeIcon icon={faChevronLeft}/>
        {isNavigating ? 'Loading...' : (
          <>
            {chapter?.prevChapter ? 'Previous Chapter' : 'No Previous Chapter'}
            {isPrevChapterPaid && !canAccessPaidContent && (
              <FontAwesomeIcon icon={faLock} className="lock-icon-nav" style={{ marginLeft: '5px' }} />
            )}
          </>
        )}
      </button>

      <button
        onClick={handleNextChapter}
        disabled={isNextDisabled}
        className={`nav-button ${!chapter?.nextChapter ? 'nav-button-disabled' : ''} ${isNextChapterPaid && !canAccessPaidContent ? 'paid-content-btn' : ''}`}
        title={chapter?.nextChapter 
          ? isNextChapterPaid && !canAccessPaidContent 
            ? `Next: ${chapter.nextChapter.title} (Paid Content)` 
            : `Next: ${chapter.nextChapter.title}`
          : 'No next chapter available'}
      >
        {isNavigating ? 'Loading...' : (
          <>
            {chapter?.nextChapter ? 'Next Chapter' : 'No Next Chapter'}
            {isNextChapterPaid && !canAccessPaidContent && (
              <FontAwesomeIcon icon={faLock} className="lock-icon-nav" style={{ marginLeft: '5px' }} />
            )}
          </>
        )}
        <FontAwesomeIcon icon={faChevronRight}/>
      </button>
    </div>
  );
};

export default ChapterNavigation; 