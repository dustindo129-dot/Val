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

// Format date to relative time (reusing from CommentSection)
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Memoized comment card component for better performance
const CommentCard = memo(({ comment }) => {
  // Determine link and title based on content type
  let linkPath = '';
  let linkTitle = '';
  
  if (comment.contentType === 'novels') {
    linkPath = `/novel/${comment.contentId}`;
    linkTitle = comment.contentTitle || 'Novel';
  } else if (comment.contentType === 'chapters') {
    // For chapters, the contentId format is "novelId-chapterId"
    const [novelId, chapterId] = comment.contentId.split('-');
    linkPath = `/novel/${novelId}/chapter/${chapterId}`;
    
    // Use both novel title and chapter title if available
    if (comment.contentTitle && comment.chapterTitle) {
      linkTitle = `${comment.contentTitle}: ${comment.chapterTitle}`;
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

  // Truncate comment text if it's too long
  const MAX_COMMENT_LENGTH = 100;
  const truncatedText = comment.text.length > MAX_COMMENT_LENGTH
    ? `${comment.text.substring(0, MAX_COMMENT_LENGTH)}...`
    : comment.text;

  return (
    <div className="recent-comment-card">
      <Link to={linkPath} className="comment-content-link">
        {linkTitle}
      </Link>
      <p className="comment-text">{truncatedText}</p>
      <div className="comment-footer">
        <span className="comment-username">{comment.user.username}</span>
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
      const response = await axios.get(`${config.backendUrl}/api/comments/recent?limit=10&_cb=${cacheBuster}`);
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
          Recent Comments
        </h2>
        <div className="recent-comments-loading">
          <div className="loading-spinner"></div>
          <span>Loading recent comments...</span>
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
        <div className="recent-comments-error">Failed to load recent comments</div>
      </div>
    );
  }

  return (
    <div className="recent-comments">
      <h2 className="recent-comments-title">
          Recent Comments
      </h2>
      <div className="recent-comments-list">
        {data?.length > 0 ? (
          data.map((comment) => (
            <CommentCard key={comment._id} comment={comment} />
          ))
        ) : (
          <div className="no-comments-message">No recent comments</div>
        )}
      </div>
    </div>
  );
};

export default RecentComments; 