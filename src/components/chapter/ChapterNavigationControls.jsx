import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faEllipsisV, faList, faCog,
  faChevronLeft, faChevronRight, faSpinner, faBars, faLock
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/ChapterNavigationControls.css';

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
  isModuleChaptersLoading,
  user
}) => {
  // Check if user can access paid content
  const canAccessPaidContent = user && (user.role === 'admin' || user.role === 'moderator');
  
  // Check if next chapter is paid content
  const isNextChapterPaid = chapter?.nextChapter?.mode === 'paid';
  
  // Check if previous chapter is paid content
  const isPrevChapterPaid = chapter?.prevChapter?.mode === 'paid';
  
  // Filter out paid chapters from the dropdown for non-admin/mod users
  const filteredChapters = moduleChapters.filter(moduleChapter => {
    // Admin/mods see all chapters
    if (canAccessPaidContent) return true;
    
    // For regular users, filter out paid chapters
    return moduleChapter.mode !== 'paid';
  });

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
        ) : filteredChapters.length > 0 ? (
          <ul className="chapter-dropdown-list">
            {filteredChapters.map((chapterItem) => (
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