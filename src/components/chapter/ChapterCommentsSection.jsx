import React, { useState, useEffect } from 'react';
import CommentSection from '../CommentSection';

/**
 * ChapterCommentsSection Component
 * 
 * Displays the comments section for a chapter (auto-loads after delay)
 */
const ChapterCommentsSection = ({
  novelId,
  chapterId,
  user,
  comments,
  isCommentsLoading
}) => {
  const [autoLoadComments, setAutoLoadComments] = useState(false);

  // Auto-show comments after delay (consistent with novel pages)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAutoLoadComments(true);
    }, 2000); // 2 second delay after page load
    
    return () => clearTimeout(timer);
  }, []); // Run once when component mounts

  return (
    <div className="novel-comments-section">
      {autoLoadComments && (
        <CommentSection
          contentId={`${novelId}-${chapterId}`}
          contentType="chapters"
          user={user}
          isAuthenticated={!!user}
          comments={comments}
          isLoading={isCommentsLoading}
        />
      )}
    </div>
  );
};

export default ChapterCommentsSection; 