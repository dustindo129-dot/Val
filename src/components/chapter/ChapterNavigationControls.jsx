import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faEllipsisV, faList, faCog,
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
  handlePrevChapter,
  handleNextChapter,
  isNavigating,
  isEditing,
  moduleChapters,
  isModuleChaptersLoading
}) => {
  // Debug logging
  useEffect(() => {
    console.log('Chapter list visibility:', showChapterList);
    console.log('Module chapters:', moduleChapters);
    console.log('Loading state:', isModuleChaptersLoading);
  }, [showChapterList, moduleChapters, isModuleChaptersLoading]);

  return (
    <>
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

      {/* Chapter List Dropdown */}
      <div className={`chapter-dropdown ${showChapterList ? 'active' : ''}`} id="chapterDropdown">
        <div className="chapter-dropdown-header">
          <h3>Chapters</h3>
          <button 
            onClick={() => setShowChapterList(false)}
            className="close-dropdown"
          >
            <FontAwesomeIcon icon={faTimes}/>
          </button>
        </div>

        {isModuleChaptersLoading ? (
          <div className="dropdown-loading">
            <FontAwesomeIcon icon={faSpinner} spin/>
            <span>Loading chapters...</span>
          </div>
        ) : moduleChapters && moduleChapters.length > 0 ? (
          <ul className="chapter-dropdown-list">
            {moduleChapters.map((chapterItem) => (
              <li 
                key={chapterItem._id}
                className={chapterItem._id === chapterId ? 'active' : ''}
              >
                <Link to={`/novel/${novelId}/chapter/${chapterItem._id}`}>
                  {chapterItem.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-chapters">No chapters available</div>
        )}
      </div>
    </>
  );
};

export default ChapterNavigationControls; 