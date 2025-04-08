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

// Add this helper function at the top of the file, after the imports
const organizeComments = (flatComments) => {
  // Create a map to store all comments with their replies
  const commentMap = new Map();
  const rootComments = [];

  // Initialize the map with all comments
  flatComments.forEach(comment => {
    commentMap.set(comment._id, {
      ...comment,
      replies: []
    });
  });

  // Build the nested structure
  flatComments.forEach(comment => {
    if (comment.parentId) {
      // If this comment has a parent, add it to the parent's replies
      const parentComment = commentMap.get(comment.parentId);
      if (parentComment) {
        const commentWithReplies = commentMap.get(comment._id);
        parentComment.replies.push(commentWithReplies);
      }
    } else {
      // If this is a root comment, add it to the root array
      rootComments.push(commentMap.get(comment._id));
    }
  });

  // Helper function to sort replies recursively
  const sortReplies = (comment) => {
    // Sort immediate replies by date (oldest first for replies)
    comment.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    // Recursively sort replies of replies
    comment.replies.forEach(reply => sortReplies(reply));
    return comment;
  };

  // Sort root comments by date (newest first) and sort all nested replies
  rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  rootComments.forEach(comment => sortReplies(comment));

  return rootComments;
};

const CommentSection = ({ novelId, user, isAuthenticated }) => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  
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
        // Organize comments before setting state
        setComments(organizeComments(data));
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
          dislikes: [],
          isDeleted: false,
          adminDeleted: false
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
  const handleDelete = async (commentId, isReply = false, parentCommentId = null) => {
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
      
      // Update the comments list based on whether it's a reply or main comment
      setComments(prevComments => {
        if (isReply && parentCommentId) {
          // If it's a reply, mark it as deleted in the parent comment's replies
          return prevComments.map(comment => {
            if (comment._id === parentCommentId) {
              return {
                ...comment,
                replies: comment.replies.filter(reply => reply._id !== commentId)
              };
            }
            return comment;
          });
        } else {
          // If it's a main comment, remove it and its replies from the list
          return prevComments.filter(comment => comment._id !== commentId);
        }
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  
  // Handle reply submission
  const handleReplySubmit = async (parentId) => {
    if (!isAuthenticated) {
      alert('Please log in to reply to comments');
      return;
    }
    
    if (!replyText.trim()) {
      return;
    }
    
    try {
      const response = await fetch(`/api/comments/${parentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: replyText })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post reply');
      }
      
      const data = await response.json();
      
      // Update the comments list with the new reply
      setComments(prevComments => 
        prevComments.map(comment => {
          // If replying to the main comment
          if (comment._id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), {
                _id: data._id,
                text: replyText,
                user: {
                  username: user.username,
                  avatar: user.avatar || ''
                },
                createdAt: new Date().toISOString(),
                likes: [],
                dislikes: [],
                replies: [],
                isDeleted: false,
                adminDeleted: false
              }]
            };
          }
          // If replying to a reply, find the parent comment and add to its replies
          if (comment.replies?.some(reply => reply._id === parentId)) {
            return {
              ...comment,
              replies: [...(comment.replies || []), {
                _id: data._id,
                text: replyText,
                user: {
                  username: user.username,
                  avatar: user.avatar || ''
                },
                createdAt: new Date().toISOString(),
                likes: [],
                dislikes: [],
                parentId: parentId, // Store the direct parent ID
                isDeleted: false,
                adminDeleted: false
              }]
            };
          }
          return comment;
        })
      );
      
      // Clear the reply form
      setReplyText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error posting reply:', err);
      alert(err.message || 'Failed to post reply. Please try again.');
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
  
  // Create a recursive component for rendering comments and their replies
  const RenderComment = ({ comment, level = 0 }) => (
    <div className="comment-item">
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
          <span className="comment-username">
            {comment.isDeleted && !comment.adminDeleted ? '[deleted]' : comment.user.username}
          </span>
          <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <div className="comment-text">
          {comment.isDeleted && !comment.adminDeleted ? 'Comment deleted by user' : comment.text}
        </div>
        <div className="comment-actions">
          {!comment.isDeleted && (
            <>
              <button className="like-button">
                <span className="like-icon">❤️</span>
                <span className="like-count">{comment.likes.length}</span>
              </button>
              <button 
                className="reply-button"
                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
              >
                Reply
              </button>
              {user && (user.username === comment.user.username || user.role === 'admin') && (
                <button 
                  className="delete-button"
                  onClick={() => handleDelete(comment._id, level > 0, comment.parentId)}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Reply form */}
        {replyingTo === comment._id && (
          <div className="reply-form">
            <textarea
              className="reply-input"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
            />
            <div className="reply-actions">
              <button 
                className="reply-submit-btn"
                onClick={() => handleReplySubmit(comment._id)}
                disabled={!replyText.trim()}
              >
                Post Reply
              </button>
              <button 
                className="reply-cancel-btn"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="replies-list">
            {comment.replies.map((reply) => (
              <RenderComment 
                key={reply._id} 
                comment={reply} 
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

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
            <RenderComment key={comment._id} comment={comment} />
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