import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart
} from '@fortawesome/free-solid-svg-icons';
import {
  faHeart as farHeart
} from '@fortawesome/free-regular-svg-icons';

/**
 * ChapterActions Component
 * 
 * Displays like action button for a chapter
 */
const ChapterActions = ({
  isLiked,
  likeCount,
  handleLike
}) => {
  return (
    <div className="user-actions">
      <button
        onClick={handleLike}
        className={`action-btn like ${isLiked ? 'active' : ''}`}
      >
        <FontAwesomeIcon icon={isLiked ? faHeart : farHeart}/>
        {isLiked ? 'Đã thích' : 'Thích'}
        <span className="chapter-like-count">{likeCount}</span>
      </button>
    </div>
  );
};

export default ChapterActions; 