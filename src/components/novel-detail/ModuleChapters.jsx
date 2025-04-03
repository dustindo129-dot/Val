import React, { memo } from 'react';
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
}) => (
  <div className="chapter-list">
    {chapters.map((chapter, chapterIndex, chapterArray) => (
      <div key={chapter._id} className="chapter-item">
        <div className="chapter-number">{typeof chapter.order === 'number' ? chapter.order : chapter.order || 0}</div>
        
        {user?.role === 'admin' && (
          <div className="chapter-reorder-buttons">
            <button 
              className={`reorder-btn ${chapterIndex === 0 ? 'disabled' : ''}`}
              onClick={() => handleChapterReorder(moduleId, chapter._id, 'up')}
              disabled={chapterIndex === 0}
              title="Move chapter up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
            <button 
              className={`reorder-btn ${chapterIndex === chapterArray.length - 1 ? 'disabled' : ''}`}
              onClick={() => handleChapterReorder(moduleId, chapter._id, 'down')}
              disabled={chapterIndex === chapterArray.length - 1}
              title="Move chapter down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>
        )}
        
        <Link to={`/novel/${novelId}/chapter/${chapter._id}`} className="chapter-title-link">
          {chapter.title}
          {isChapterNew(chapter.createdAt) && <span className="new-tag">NEW</span>}
        </Link>
        {user?.role === 'admin' && (
          <button 
            onClick={() => handleChapterDelete(moduleId, chapter._id)} 
            className="delete-chapter-btn"
            title="Delete chapter"
          >
            Delete
          </button>
        )}
        <span className="chapter-date">
          {formatDateUtil(chapter.createdAt)}
        </span>
      </div>
    ))}
  </div>
));

export default ModuleChapters; 