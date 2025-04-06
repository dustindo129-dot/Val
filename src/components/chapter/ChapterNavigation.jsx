import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const ChapterNavigation = ({ 
  chapter, 
  isNavigating, 
  isEditing, 
  handlePrevChapter, 
  handleNextChapter,
  position = 'top' // 'top' or 'bottom' to style differently if needed
}) => {
  return (
    <div className={`chapter-navigation ${position === 'bottom' ? 'bottom' : ''}`}>
      <button
        onClick={handlePrevChapter}
        disabled={!chapter?.prevChapter || isNavigating || isEditing}
        className={`nav-button ${!chapter?.prevChapter ? 'nav-button-disabled' : ''}`}
        title={chapter?.prevChapter ? `Previous: ${chapter.prevChapter.title}` : 'No previous chapter available'}
      >
        <FontAwesomeIcon icon={faChevronLeft}/>
        {isNavigating ? 'Loading...' : (chapter?.prevChapter ? 'Previous Chapter' : 'No Previous Chapter')}
      </button>

      <button
        onClick={handleNextChapter}
        disabled={!chapter?.nextChapter || isNavigating || isEditing}
        className={`nav-button ${!chapter?.nextChapter ? 'nav-button-disabled' : ''}`}
        title={chapter?.nextChapter ? `Next: ${chapter.nextChapter.title}` : 'No next chapter available'}
      >
        {isNavigating ? 'Loading...' : (chapter?.nextChapter ? 'Next Chapter' : 'No Next Chapter')}
        <FontAwesomeIcon icon={faChevronRight}/>
      </button>
    </div>
  );
};

export default ChapterNavigation; 