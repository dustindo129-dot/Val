import React, { memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

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
  handleChapterReorder, 
  handleChapterDelete 
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

  return (
    <div className="module-chapters">
      {chapters && chapters.length > 0 ? (
        <div className="chapters-list">
          {chapters.map((chapter, index) => {
            const chapterId = chapter._id || `index-${index}`;
            return (
              <div 
                key={`chapter-item-${chapterId}`}
                className={`chapter-item ${isReordering ? 'reordering' : ''}`}
                style={{ transition: 'all 0.3s ease' }}
              >
                <div className="chapter-content" key={`chapter-content-${chapterId}`}>
                  <div className="chapter-number" key={`chapter-number-${chapterId}`}>
                    {typeof chapter.order === 'number' ? chapter.order : chapter.order || 0}
                  </div>
                  <Link 
                    to={`/novel/${novelId}/chapter/${chapterId}`} 
                    className="chapter-title-link"
                    key={`chapter-link-${chapterId}`}
                  >
                    {chapter.title}
                    {isChapterNew(chapter.createdAt) && (
                      <span className="new-tag" key={`new-tag-${chapterId}`}>NEW</span>
                    )}
                  </Link>
                </div>
                
                {user?.role === 'admin' && (
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
                    <button
                      className="delete-chapter-btn"
                      onClick={() => handleChapterDelete(moduleId, chapterId)}
                      title="Delete chapter"
                    >
                      Delete
                    </button>
                  </div>
                )}
                <span className="chapter-date">
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