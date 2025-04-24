import React, { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/ModuleChapters.css';

// Helper function for date formatting
const formatDateUtil = (date) => {
  if (!date) return 'Invalid date';
  
  try {
    const chapterDate = new Date(date);
    
    if (isNaN(chapterDate.getTime())) {
      return 'Invalid date';
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = monthNames[chapterDate.getMonth()];
    const day = chapterDate.getDate().toString().padStart(2, '0');
    const year = chapterDate.getFullYear();
    
    return `${month}-${day}-${year}`;
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Invalid date';
  }
};

// Helper function to check if chapter is new
const isChapterNew = (date) => {
  if (!date) return false;
  
  try {
    const chapterDate = new Date(date);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return chapterDate > threeDaysAgo;
  } catch (err) {
    console.error('Date comparison error:', err);
    return false;
  }
};

const ModuleChapters = memo(({ 
  chapters, 
  novelId, 
  moduleId, 
  user, 
  canEdit,
  canDelete,
  handleChapterReorder, 
  handleChapterDelete,
  isPaidModule,
  canAccessPaidContent
}) => {
  const [isReordering, setIsReordering] = useState(false);

  const handleReorderClick = useCallback(async (chapterId, direction) => {
    if (isReordering) return; // Prevent concurrent reordering
    
    try {
      setIsReordering(true);
      await handleChapterReorder(moduleId, chapterId, direction);
    } finally {
      // Add a small delay before allowing next reorder
      setTimeout(() => {
        setIsReordering(false);
      }, 500);
    }
  }, [moduleId, handleChapterReorder, isReordering]);

  // Function to determine if a chapter should be visible based on its mode
  const isChapterVisible = (chapter) => {
    // Admin and moderators see all chapters
    if (user?.role === 'admin' || user?.role === 'moderator') {
      return true;
    }
    
    if (!chapter.mode || chapter.mode === 'published') {
      return true; // Free content is visible to everyone
    }
    
    if (chapter.mode === 'protected' || chapter.mode === 'paid') {
      // Protected and paid content is visible but locked for regular users
      return true;
    }
    
    if (chapter.mode === 'draft') {
      return false; // Draft is only visible to admin/moderator (handled above)
    }
    
    return false; // Not visible for other modes
  };

  // Check if a chapter is accessible (not just visible)
  const canAccessChapter = (chapter) => {
    // Admin and moderators can access all chapters
    if (user?.role === 'admin' || user?.role === 'moderator') {
      return true;
    }
    
    // Regular users can only access published chapters
    return !chapter.mode || chapter.mode === 'published';
  };

  return (
    <div className="module-chapters">
      {chapters && chapters.length > 0 ? (
        <div className="module-chapters-list">
          {chapters.map((chapter, index) => {
            const chapterId = chapter._id || `index-${index}`;
            
            // Skip rendering if chapter should not be visible to current user
            if (!isChapterVisible(chapter)) {
              return null;
            }
            
            // Determine CSS classes based on chapter mode
            const chapterModeClass = chapter.mode === 'draft' ? 'chapter-mode-draft' : '';
            const isPaidChapter = chapter.mode === 'paid';
            const chapterIsAccessible = canAccessChapter(chapter);
            
            return (
              <div 
                key={`chapter-item-${chapterId}`}
                className={`module-chapter-item ${isReordering ? 'reordering' : ''} ${chapter.mode ? `chapter-mode-${chapter.mode}` : ''} ${!chapterIsAccessible ? 'locked-chapter' : ''}`}
                style={{ transition: 'all 0.3s ease' }}
              >
                {/* Locked layer for paid chapters */}
                {isPaidChapter && !canAccessPaidContent && (
                  <div className="chapter-locked-layer">
                    <div className="locked-content-info">
                      <FontAwesomeIcon icon={faLock} className="lock-icon-small" />
                      <span>Need {chapter.chapterBalance || 0} 🌾 to unlock.</span>
                      <Link to="/market" className="go-to-market-btn-small">Go to market</Link>
                    </div>
                  </div>
                )}

                <div className="chapter-list-content" key={`chapter-content-${chapterId}`}>
                  <div className="chapter-number" key={`chapter-number-${chapterId}`}>
                    {typeof chapter.order === 'number' ? chapter.order : chapter.order || 0}
                  </div>
                  
                  {chapterIsAccessible ? (
                    <Link 
                      to={`/novel/${novelId}/chapter/${chapterId}`} 
                      className={`chapter-title-link ${chapterModeClass}`}
                      key={`chapter-link-${chapterId}`}
                    >
                      {chapter.title}
                      {isChapterNew(chapter.createdAt) && (
                        <span className="new-tag" key={`new-tag-${chapterId}`}>NEW</span>
                      )}
                    </Link>
                  ) : (
                    <div className="chapter-title-link locked">
                      {chapter.title}
                      <FontAwesomeIcon icon={faLock} className="chapter-lock-icon" />
                    </div>
                  )}
                </div>
                
                {canEdit && (
                  <div className="chapter-actions" key={`chapter-actions-${chapterId}`}>
                    <button
                      className={`reorder-btn ${index === 0 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(chapterId, 'up')}
                      disabled={index === 0 || isReordering}
                      title="Move chapter up"
                    >
                      <svg 
                        key={`up-${chapterId}`}
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
                        <path key={`path-up-${chapterId}`} d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      className={`reorder-btn ${index === chapters.length - 1 ? 'disabled' : ''}`}
                      onClick={() => handleReorderClick(chapterId, 'down')}
                      disabled={index === chapters.length - 1 || isReordering}
                      title="Move chapter down"
                    >
                      <svg 
                        key={`down-${chapterId}`}
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
                        <path key={`path-down-${chapterId}`} d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {canDelete && (
                      <button
                        className="delete-chapter-btn"
                        onClick={() => handleChapterDelete(moduleId, chapterId)}
                        title="Delete chapter"
                      >
                        Delete
                      </button>
                    )}
                    <span className="chapter-mode-indicator">
                      <span className={`mode-tag mode-${chapter.mode || 'published'}`}>
                        {(chapter.mode || 'published').toUpperCase()}
                      </span>
                    </span>
                  </div>
                )}
                <span className="novel-detail-chapter-date">
                  {formatDateUtil(chapter.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-chapters">No chapters in this module yet.</div>
      )}
    </div>
  );
});

ModuleChapters.displayName = 'ModuleChapters';

export default ModuleChapters; 