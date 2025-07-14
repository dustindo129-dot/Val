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
  // Determine if button should be disabled
  // Remove paid content restrictions - ChapterAccessGuard will handle access control
  const isPrevDisabled = !chapter?.prevChapter || isNavigating || isEditing;
  const isNextDisabled = !chapter?.nextChapter || isNavigating || isEditing;

  return (
    <div className={`chapter-navigation ${position === 'bottom' ? 'bottom' : ''}`}>
      <button
        onClick={handlePrevChapter}
        disabled={isPrevDisabled}
        className={`nav-button ${!chapter?.prevChapter ? 'nav-button-disabled' : ''}`}
        title={chapter?.prevChapter 
          ? `Chương trước: ${chapter.prevChapter.title}`
          : 'Không có chương trước'}
      >
        <FontAwesomeIcon icon={faChevronLeft}/>
        {isNavigating ? 'Đang tải...' : (
          chapter?.prevChapter ? 'Chương trước' : 'Không có chương trước'
        )}
      </button>

      <button
        onClick={handleNextChapter}
        disabled={isNextDisabled}
        className={`nav-button ${!chapter?.nextChapter ? 'nav-button-disabled' : ''}`}
        title={chapter?.nextChapter 
          ? `Chương tiếp theo: ${chapter.nextChapter.title}`
          : 'Không có chương tiếp theo'}
      >
        {isNavigating ? 'Đang tải...' : (
          chapter?.nextChapter ? 'Chương tiếp theo' : 'Không có chương tiếp theo'
        )}
        <FontAwesomeIcon icon={faChevronRight}/>
      </button>
    </div>
  );
};

export default ChapterNavigation; 