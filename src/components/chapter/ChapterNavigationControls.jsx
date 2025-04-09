import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp, faTimes, faEllipsisV, faList, faCog,
  faChevronLeft, faChevronRight, faSpinner
} from '@fortawesome/free-solid-svg-icons';

/**
 * ChapterNavigationControls Component
 * 
 * Provides fixed navigation controls, chapter list dropdown, and floating buttons
 */
const ChapterNavigationControls = ({
  novelId,
  chapter,
  chapterId,
  showNavControls,
  setShowNavControls,
  showChapterList,
  setShowChapterList,
  setShowSettingsModal,
  scrollToTop,
  handlePrevChapter,
  handleNextChapter,
  isNavigating,
  isEditing,
  moduleChapters,
  isModuleChaptersLoading
}) => {
  return (
    <>
      {/* Fixed Controls */}
      <div className="fixed-controls">
        <button
          className="control-btn"
          id="scrollTopBtn"
          title="Scroll to Top"
          onClick={scrollToTop}
          style={{display: 'none'}}
        >
          <FontAwesomeIcon icon={faArrowUp}/>
        </button>
      </div>

      {/* Toggle Button */}
      <button
        className="toggle-btn"
        onClick={() => setShowNavControls(!showNavControls)}
        title="Toggle Navigation Controls"
      >
        <FontAwesomeIcon icon={showNavControls ? faTimes : faEllipsisV}/>
      </button>

      {/* Fixed Navigation Controls */}
      <div className={`nav-controls-container ${showNavControls ? 'visible' : ''}`}>
        <button
          className="control-btn"
          onClick={() => setShowChapterList(!showChapterList)}
          title="Chapter List"
          id="chapterListBtn"
        >
          <FontAwesomeIcon icon={faList}/>
        </button>

        <button
          className="control-btn"
          onClick={() => setShowSettingsModal(true)}
          title="Reading Settings"
        >
          <FontAwesomeIcon icon={faCog}/>
        </button>
      </div>

      {/* Fixed Navigation Buttons */}
      <div className={`nav-control-prev ${showNavControls ? 'visible' : ''}`}>
        <button
          className={`nav-control-btn ${!chapter?.prevChapter ? 'disabled' : ''}`}
          onClick={handlePrevChapter}
          disabled={!chapter?.prevChapter || isNavigating || isEditing}
          title={chapter?.prevChapter ? `Previous: ${chapter.prevChapter.title}` : 'No previous chapter available'}
        >
          <FontAwesomeIcon icon={faChevronLeft}/>
        </button>
      </div>

      <div className={`nav-control-next ${showNavControls ? 'visible' : ''}`}>
        <button
          className={`nav-control-btn ${!chapter?.nextChapter ? 'disabled' : ''}`}
          onClick={handleNextChapter}
          disabled={!chapter?.nextChapter || isNavigating || isEditing}
          title={chapter?.nextChapter ? `Next: ${chapter.nextChapter.title}` : 'No next chapter available'}
        >
          <FontAwesomeIcon icon={faChevronRight}/>
        </button>
      </div>

      {/* Chapter Dropdown */}
      <div
        className={`chapter-dropdown ${showChapterList ? 'active' : ''}`}
        id="chapterDropdown"
      >
        <div className="chapter-dropdown-title">Chapters</div>
        {isModuleChaptersLoading ? (
          <div className="loading-chapters">
            <FontAwesomeIcon icon={faSpinner} spin /> Loading chapters...
          </div>
        ) : (
          <ul className="chapter-dropdown-list">
            {moduleChapters && moduleChapters.length > 0 ? (
              moduleChapters.map((item) => (
                <li
                  key={item._id}
                  className={`chapter-dropdown-item ${item._id === chapterId ? 'current' : ''}`}
                >
                  <Link to={`/novel/${novelId}/chapter/${item._id}`}>
                    {item.order ? `${item.order}. ` : ''}{item.title}
                  </Link>
                </li>
              ))
            ) : (
              <li className="chapter-dropdown-item empty">No chapters available</li>
            )}
          </ul>
        )}
      </div>
    </>
  );
};

export default ChapterNavigationControls; 