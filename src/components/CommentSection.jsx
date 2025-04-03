import React, { useState, useEffect } from 'react';
import '../styles/components/CommentSection.css';

/**
 * Comment section component for novels
 * 
 * @param {Object} props
 * @param {string} props.novelId - ID of the novel
 * @param {Object} props.user - Current user object
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @returns {JSX.Element} CommentSection component
 */
const CommentSection = ({ novelId, user, isAuthenticated }) => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Fetch comments on component mount
  useEffect(() => {
    if (!novelId) return;
    
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/comments?contentType=novels&contentId=${novelId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        
        const data = await response.json();
        setComments(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchComments();
  }, [novelId]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Please log in to leave a comment');
      return;
    }
    
    if (!newComment.trim()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/comments/novels/${novelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: newComment })
      });
      
      if (!response.ok) {
        throw new Error('Failed to post comment');
      }
      
      const data = await response.json();
      
      // Add new comment to the list
      setComments(prevComments => [
        {
          _id: data._id,
          user: { username: user.username, avatar: user.avatar || '' },
          text: newComment,
          createdAt: new Date().toISOString(),
          likes: [],
          dislikes: []
        },
        ...prevComments
      ]);
      
      // Clear the form
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle comment deletion
  const handleDelete = async (commentId) => {
    if (!isAuthenticated || deleting) return;
    
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    setDeleting(true);
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      // Remove the comment from the list
      setComments(prevComments => 
        prevComments.filter(comment => comment._id !== commentId)
      );
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  
  // Format date to relative time
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
  
  if (isLoading) {
    return <div className="comments-loading">Loading comments...</div>;
  }
  
  if (error) {
    return <div className="comments-error">Error loading comments: {error}</div>;
  }
  
  return (
    <div className="comments-section">
      <h3 className="comments-title">Comments ({comments.length})</h3>
      
      {isAuthenticated ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            className="comment-input"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            required
          />
          <button 
            type="submit" 
            className="comment-submit-btn"
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      ) : (
        <div className="login-to-comment">
          Please <a href="/login">log in</a> to leave a comment.
        </div>
      )}
      
      {comments.length > 0 ? (
        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment._id} className="comment-item">
              <div className="comment-avatar">
                {comment.user.avatar ? (
                  <img src={comment.user.avatar} alt={comment.user.username} />
                ) : (
                  <div className="default-avatar">
                    {comment.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-username">{comment.user.username}</span>
                  <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <div className="comment-text">{comment.text}</div>
                <div className="comment-actions">
                  <button className="like-button">
                    <span className="like-icon">❤️</span>
                    <span className="like-count">{comment.likes.length}</span>
                  </button>
                  {user && (user.username === comment.user.username || user.role === 'admin') && (
                    <button 
                      className="delete-button"
                      onClick={() => handleDelete(comment._id)}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-comments">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;