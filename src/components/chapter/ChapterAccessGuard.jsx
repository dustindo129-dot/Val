import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCog } from '@fortawesome/free-solid-svg-icons';

/**
 * ChapterAccessGuard Component
 * 
 * Displays appropriate messages when a user doesn't have access to chapter content
 */
const ChapterAccessGuard = ({ chapter, user, children }) => {
  // Check if user has access to chapter content based on mode
  const canAccessChapterContent = (chapter, user) => {
    if (!chapter || !chapter.mode) return true; // Default to accessible if no mode specified
    
    switch (chapter.mode) {
      case 'published':
        return true; // Published is accessible to everyone
      case 'protected':
        return !!user; // Protected requires user to be logged in
      case 'draft':
        return user?.role === 'admin' || user?.role === 'moderator'; // Draft accessible to admin and moderator
      case 'paid':
        return true; // Paid content is now accessible to everyone
      default:
        return true;
    }
  };

  const hasAccess = canAccessChapterContent(chapter, user);

  if (!hasAccess) {
    return (
      <div className="restricted-content-message">
        {chapter?.mode === 'protected' && (
          <div className="protected-content">
            <FontAwesomeIcon icon={faLock} size="3x" />
            <h3>Protected Content</h3>
            <p>Please log in to read this chapter.</p>
          </div>
        )}
        {chapter?.mode === 'draft' && (
          <div className="draft-content">
            <FontAwesomeIcon icon={faCog} size="3x" />
            <h3>Draft Content</h3>
            <p>This chapter is still in draft mode and not available for public viewing.</p>
          </div>
        )}
        {chapter?.mode === 'paid' && (
          <div className="paid-content">
            <FontAwesomeIcon icon={faLock} size="3x" />
            <h3>Premium Content</h3>
            <p>This chapter is premium content. Feature coming soon.</p>
          </div>
        )}
      </div>
    );
  }

  return children;
};

export default ChapterAccessGuard; 