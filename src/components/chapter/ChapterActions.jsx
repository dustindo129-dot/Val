import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart, faStar
} from '@fortawesome/free-solid-svg-icons';
import {
  faHeart as farHeart,
  faStar as farStar
} from '@fortawesome/free-regular-svg-icons';

/**
 * ChapterActions Component
 * 
 * Displays like and rating action buttons for a chapter
 */
const ChapterActions = ({
  isLiked,
  likeCount,
  currentRating,
  averageRating,
  ratingCount,
  handleLike,
  setShowRatingModal
}) => {
  return (
    <div className="user-actions">
      <button
        onClick={handleLike}
        className={`action-btn like ${isLiked ? 'active' : ''}`}
      >
        <FontAwesomeIcon icon={isLiked ? faHeart : farHeart}/>
        {isLiked ? 'Đã thích' : 'Thích'}
        <span className="like-count">{likeCount}</span>
      </button>

      <button
        onClick={() => setShowRatingModal(true)}
        className={`action-btn rate ${currentRating > 0 ? 'active' : ''}`}
      >
        <FontAwesomeIcon icon={currentRating > 0 ? faStar : farStar}/>
        Đánh giá
        <span className="rate-count">{averageRating}/5 • {ratingCount}</span>
      </button>
    </div>
  );
};

export default ChapterActions; 