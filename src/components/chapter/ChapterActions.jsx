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
 * Displays like action button for a chapter with Facebook-style states
 */
const ChapterActions = ({
  isLiked,
  likeCount,
  likeStatus = 'idle',
  handleLike
}) => {
  // Get the appropriate icon and status text based on like status
  const getLikeIcon = () => {
    switch (likeStatus) {
      case 'loading':
        return '⏳'; // Loading spinner
      case 'pending':
        return '⏸️'; // Paused/pending icon
      case 'error':
        return '❌'; // Error icon
      default:
        return <FontAwesomeIcon icon={isLiked ? faHeart : farHeart}/>;
    }
  };

  const getLikeText = () => {
    switch (likeStatus) {
      case 'loading':
        return 'Đang xử lý...';
      case 'pending':
        return 'Đang chờ...';
      case 'error':
        return 'Lỗi';
      default:
        return isLiked ? 'Đã thích' : 'Thích';
    }
  };

  return (
    <div className="user-actions">
      <button
        onClick={handleLike}
        className={`action-btn like ${isLiked ? 'active' : ''} ${likeStatus === 'pending' ? 'pending' : ''} ${likeStatus === 'error' ? 'error' : ''}`}
        disabled={likeStatus === 'loading'}
      >
        <span className="like-icon chapter-like-icon">
          {getLikeIcon()}
        </span>
        {getLikeText()}
        <span className="chapter-like-count">{likeCount}</span>
      </button>
    </div>
  );
};

export default ChapterActions; 