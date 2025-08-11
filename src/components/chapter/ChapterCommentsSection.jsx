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
  novel
}) => {
  const [autoLoadComments, setAutoLoadComments] = useState(false);
  const [preventScroll, setPreventScroll] = useState(true);

  // Prevent automatic scroll to comments section
  useEffect(() => {
    if ('scrollRestoration' in history) {
      const originalScrollRestoration = history.scrollRestoration;
      history.scrollRestoration = 'manual';
      return () => {
        history.scrollRestoration = originalScrollRestoration;
      };
    }
  }, []);

  // Auto-show comments after delay (consistent with novel pages)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAutoLoadComments(true);
      setPreventScroll(false);
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
          novel={novel}
          autoFocusOnMount={false}
        />
      )}
    </div>
  );
};

export default ChapterCommentsSection; 