/**
 * RecentComments Component
 *
 * Displays the latest 10 comments across the website including:
 * - Link to the content where the comment was posted
 * - Comment content
 * - Username and timestamp
 *
 * Features:
 * - Automatic updates
 * - Compact layout
 * - Loading states
 * - Error handling
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../styles/components/RecentComments.css';
import config from '../config/config';
import LoadingSpinner from './LoadingSpinner';
import { createUniqueSlug, generateLocalizedNovelUrl, generateLocalizedChapterUrl } from '../utils/slugUtils';

// Format date to relative time (reusing from CommentSection)
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Vừa xong';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} phút trước`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} giờ trước`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ngày trước`;
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

// Function to decode HTML entities
const decodeHtmlEntities = (text) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

// Memoized comment card component for better performance
const CommentCard = memo(({ comment }) => {
  // Determine link and title based on content type
  let linkPath = '';
  let linkTitle = '';
  
  if (comment.contentType === 'novels') {
    // Generate slug-based URL for novel using proper localized function
    linkPath = generateLocalizedNovelUrl({ _id: comment.contentId, title: comment.contentTitle });
    linkTitle = comment.contentTitle || 'Novel';
  } else if (comment.contentType === 'chapters') {
    // For chapters, the contentId format is "novelId-chapterId"
    const [novelId, chapterId] = comment.contentId.split('-');
    
    // Generate proper localized URL for chapter
    linkPath = generateLocalizedChapterUrl(
      { _id: novelId, title: comment.contentTitle },
      { _id: chapterId, title: comment.chapterTitle }
    );
    
    // Use both novel title and chapter title if available
    if (comment.contentTitle && comment.chapterTitle) {
      linkTitle = `${comment.contentTitle} - ${comment.chapterTitle}`;
    } else if (comment.chapterTitle) {
      linkTitle = comment.chapterTitle;
    } else if (comment.contentTitle) {
      linkTitle = `${comment.contentTitle} - Chapter`;
    } else {
      linkTitle = 'Chapter';
    }
  } else if (comment.contentType === 'feedback') {
    linkPath = '/feedback';
    linkTitle = 'Feedback';
  }

  // Decode HTML entities in the comment text
  const decodedText = decodeHtmlEntities(comment.text || '');

  // Truncate comment text if it's too long
  const MAX_COMMENT_LENGTH = 100;
  const truncatedText = decodedText.length > MAX_COMMENT_LENGTH
    ? `${decodedText.substring(0, MAX_COMMENT_LENGTH)}...`
    : decodedText;

  return (
    <div className="recent-comment-card">
      <Link to={linkPath} className="comment-content-link">
        {linkTitle}
      </Link>
      <p className="comment-text" dangerouslySetInnerHTML={{ __html: truncatedText }} />
      <div className="comment-footer">
        <span className="comment-username">{comment.user.displayName || comment.user.username}</span>
        <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
      </div>
    </div>
  );
});

/**
 * RecentComments Component
 *
 * Sidebar component that displays the latest comments
 */
const RecentComments = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['recentComments'],
    queryFn: async () => {
      // Add cache busting parameter to force fresh data
      const cacheBuster = new Date().getTime();
      const response = await axios.get(`${config.backendUrl}/api/comments/recent?limit=15&_cb=${cacheBuster}`);
      return response.data || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // Data remains fresh for 24 hours
    cacheTime: 0, // Don't cache at all
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchInterval: 24 * 60 * 60 * 1000 // Refresh every 24 hours
  });

  if (isLoading) {
    return (
      <div className="recent-comments">
        <h2 className="recent-comments-title">
          Bình luận gần đây
        </h2>
        <div className="recent-comments-loading">
          <LoadingSpinner size="large" text="Đang tải bình luận gần đây..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recent-comments">
        <h2 className="recent-comments-title">
            Recent Comments
        </h2>
        <div className="recent-comments-error">Không thể tải bình luận gần đây</div>
      </div>
    );
  }

  return (
    <div className="recent-comments">
      <h2 className="recent-comments-title">
          Bình luận gần đây
      </h2>
      <div className="recent-comments-list">
        {data?.length > 0 ? (
          data.map((comment) => (
            <CommentCard key={comment._id} comment={comment} />
          ))
        ) : (
          <div className="no-comments-message">Không có bình luận gần đây</div>
        )}
      </div>
    </div>
  );
};

export default RecentComments; 