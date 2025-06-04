import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faLock } from '@fortawesome/free-solid-svg-icons';
import CommentSection from '../CommentSection';

/**
 * ChapterCommentsSection Component
 * 
 * Handles the comments section for a chapter, with toggle functionality
 */
const ChapterCommentsSection = ({
  isCommentsOpen,
  setIsCommentsOpen,
  novelId,
  chapterId,
  user,
  comments,
  isCommentsLoading
}) => {
  return (
    <div className="novel-comments-section">
      <button
        className="comments-toggle-btn"
        onClick={() => setIsCommentsOpen(!isCommentsOpen)}
      >
        {isCommentsOpen ? (
          <>
            <FontAwesomeIcon icon={faLock} className="fa-icon"/>
            Ẩn bình luận
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faComment} className="fa-icon"/>
            Hiển thị bình luận
          </>
        )}
      </button>

      {isCommentsOpen && (
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