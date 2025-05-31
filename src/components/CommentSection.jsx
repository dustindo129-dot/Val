import React, { useState, useEffect, useRef } from 'react';
import '../styles/components/CommentSection.css';
import axios from 'axios';
import config from '../config/config';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '../utils/auth';

/**
 * Comment section component for novels
 * 
 * @param {Object} props
 * @param {string} props.novelId - ID of the novel
 * @param {Object} props.user - Current user object
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {string} props.defaultSort - Default sort order for comments
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

// Create a safe sanitize function
const sanitizeHTML = (content) => {
  if (!content) return '';
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};

// Function to decode HTML entities for legacy comments
const decodeHTMLEntities = (text) => {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const CommentSection = ({ contentId, contentType, user, isAuthenticated, defaultSort = 'newest' }) => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  const [message, setMessage] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [likingComments, setLikingComments] = useState(new Set());
  const [sortOrder, setSortOrder] = useState(defaultSort);

  const { data: authUser } = useAuth();

  // Check if user is banned
  useEffect(() => {
    const checkBanStatus = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        const response = await axios.get(
          `${config.backendUrl}/api/users/${user.username}/ban-status`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setIsBanned(response.data.isBanned);
      } catch (error) {
        console.error('Failed to check ban status:', error);
      }
    };

    checkBanStatus();
  }, [user, isAuthenticated]);

  // Fetch comments
  const { data: commentsData = [], isLoading: commentsLoading, error: commentsError, refetch } = useQuery({
    queryKey: ['comments', `${contentType}-${contentId}`],
    queryFn: async () => {
      const response = await axios.get(`${config.backendUrl}/api/comments`, {
        params: { contentType, contentId, sort: sortOrder }
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (commentsData.length > 0) {
      setComments(organizeComments(commentsData));
    }
  }, [commentsData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }

    if (isBanned) {
      alert('Bạn không thể bình luận vì đã bị chặn');
      return;
    }
    
    if (!newComment.trim()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/comments`,
        { text: sanitizeHTML(newComment) },
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Không thể đăng bình luận');
      }
      
      const data = response.data;
      
      // Add new comment to the list
      setComments(prevComments => [
        {
          _id: data._id,
          user: { 
            username: user.username, 
            displayName: user.displayName || user.username,
            avatar: user.avatar || '' 
          },
          text: newComment,
          createdAt: new Date().toISOString(),
          likes: [],
          replies: [],
          isDeleted: false,
          adminDeleted: false
        },
        ...prevComments
      ]);
      
      // Clear the form
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Không thể đăng bình luận. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle comment deletion
  const handleDelete = async (commentId, isReply = false, parentCommentId = null) => {
    if (!isAuthenticated || deleting) return;
    
    if (!user || (!user._id && !user.id)) {
      alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
      return;
    }
    
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) {
      return;
    }
    
    setDeleting(true);
    
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/comments/${commentId}`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Không thể xóa bình luận');
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
      alert('Không thể xóa bình luận. Vui lòng thử lại.');
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
      return 'vừa xong';
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
  
  const handleBlock = async () => {
    if (!userToBlock || !isAuthenticated) return;

    try {
      const endpoint = user.role === 'admin' ? 'ban' : 'block';
      await axios.post(
        `${config.backendUrl}/api/users/${endpoint}/${userToBlock.username}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setMessage({ 
        type: 'success', 
        text: `User ${user.role === 'admin' ? 'banned' : 'blocked'} successfully` 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || `Failed to ${user.role === 'admin' ? 'ban' : 'block'} user` 
      });
    } finally {
      setShowBlockModal(false);
      setUserToBlock(null);
    }
  };

  const openBlockModal = (commentUser) => {
    // Prevent blocking self or admin blocking admin
    if (!isAuthenticated || 
        commentUser.username === user.username || 
        (user.role === 'admin' && commentUser.role === 'admin')) {
      return;
    }
    setUserToBlock(commentUser);
    setShowBlockModal(true);
  };

  // Add this function before the RenderComment component
  const handleLike = async (commentId) => {
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }

    if (!user || (!user._id && !user.id)) {
      alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
      console.error('Thông tin người dùng bị thiếu:', user);
      return;
    }

    // Prevent multiple simultaneous likes on the same comment
    if (likingComments.has(commentId)) {
      return;
    }

    // Use user.id since that's the property in the user object
    const userId = user.id || user._id;

    if (isBanned) {
      alert('Bạn không thể thích bình luận vì đã bị chặn');
      return;
    }

    try {
      // Add comment to loading state
      setLikingComments(prev => new Set([...prev, commentId]));

      // Send the user ID in the request body to ensure it's available
      const response = await axios.post(
        `${config.backendUrl}/api/comments/${commentId}/like`,
        {},
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        // Try to get more detailed error information
        let errorMessage = 'Không thể thích bình luận';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Error details:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = response.data;

      // Update comments state to reflect the new like status
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              likes: data.liked 
                ? [...(comment.likes || []), userId]
                : (comment.likes || []).filter(id => id !== userId)
            };
          }
          // Also check replies
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply._id === commentId
                  ? {
                      ...reply,
                      likes: data.liked 
                        ? [...(reply.likes || []), userId]
                        : (reply.likes || []).filter(id => id !== userId)
                    }
                  : reply
              )
            };
          }
          return comment;
        })
      );
    } catch (err) {
      console.error('Error liking comment:', err);
      alert(`Không thể thích bình luận: ${err.message}`);
    } finally {
      // Remove comment from loading state
      setLikingComments(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  // Create a recursive component for rendering comments and their replies
  const RenderComment = ({ comment, level = 0 }) => {
    // Move reply state inside this component
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);
    const replyTextareaRef = useRef(null);

    // Focus the reply textarea when the reply form is shown
    useEffect(() => {
      if (isReplying && replyTextareaRef.current) {
        replyTextareaRef.current.focus();
      }
    }, [isReplying]);

    // Handle reply button click
    const handleReplyClick = () => {
      if (!isAuthenticated) {
        window.dispatchEvent(new CustomEvent('openLoginModal'));
        return;
      }
      setIsReplying(!isReplying);
    };

    // Local handleReplySubmit function
    const handleReplySubmit = async () => {
      if (!isAuthenticated) {
        window.dispatchEvent(new CustomEvent('openLoginModal'));
        return;
      }
  
      if (!user || (!user._id && !user.id)) {
        alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
        return;
      }
  
      if (isBanned) {
        alert('Bạn không thể trả lời vì đã bị chặn');
        return;
      }
      
      if (!replyText.trim()) {
        return;
      }
  
      // Prevent multiple submissions
      if (submittingReply) {
        return;
      }
      
      setSubmittingReply(true);
      
      try {
        const response = await axios.post(
          `${config.backendUrl}/api/comments/${comment._id}/replies`,
          { text: sanitizeHTML(replyText) },
          { headers: getAuthHeaders() }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Không thể đăng trả lời');
        }
        
        const data = await response.json();
        
        // Clear the reply form immediately
        setReplyText('');
        setIsReplying(false);
  
        // Refetch all comments to ensure correct structure
        refetch();
      } catch (err) {
        console.error('Error posting reply:', err);
        alert(err.message || 'Không thể đăng trả lời. Vui lòng thử lại.');
      } finally {
        // Reset submitting state to false at the end
        setSubmittingReply(false);
      }
    };

    // Use user.id since that's the property in the user object
    const userId = user?.id || user?._id;
    
    // Check if the current user has liked this comment
    const isLikedByCurrentUser = isAuthenticated && user && userId && 
      comment.likes && Array.isArray(comment.likes) && 
      comment.likes.some(likeId => likeId === userId);
    
    return (
      <div className="comment-item">
        <div className="comment-avatar">
          {comment.user.avatar ? (
            <img src={comment.user.avatar} alt={comment.user.displayName || comment.user.username} />
          ) : (
            <div className="default-avatar">
              {(comment.user.displayName || comment.user.username).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="comment-content">
          <div className="comment-header">
            <div className="comment-user-info">
              <span className="comment-username">
                {comment.isDeleted && !comment.adminDeleted ? '[deleted]' : (comment.user.displayName || comment.user.username)}
              </span>
              {isAuthenticated && user && !comment.isDeleted && comment.user.username !== user.username && (
                <button
                  className="block-btn"
                  onClick={() => openBlockModal(comment.user)}
                  title={user.role === 'admin' ? 'Ban user' : 'Block user'}
                >
                  🚫
                </button>
              )}
            </div>
            <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <div className="comment-text">
            {comment.isDeleted && !comment.adminDeleted ? 'Comment deleted by user' : (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(decodeHTMLEntities(comment.text)) }} />
            )}
          </div>
          <div className="comment-actions">
            {!comment.isDeleted && (
              <>
                <button 
                  className={`like-button ${isLikedByCurrentUser ? 'liked' : ''}`}
                  onClick={() => handleLike(comment._id)}
                  disabled={likingComments.has(comment._id)}
                >
                  <span className="like-icon comment-like-icon">
                    {likingComments.has(comment._id) ? '⏳' : <i className={`fa-solid fa-thumbs-up ${isLikedByCurrentUser ? 'liked' : ''}`}></i>}
                  </span>
                  <span className="like-text">Thích</span>
                  <span className="like-count">{comment.likes ? comment.likes.length : 0}</span>
                </button>
                <button 
                  className="reply-button"
                  onClick={handleReplyClick}
                >
                  Trả lời
                </button>
                {isAuthenticated && user && (user.username === comment.user.username || user.role === 'admin') && (
                  <button 
                    className="delete-button"
                    onClick={() => handleDelete(comment._id, level > 0, comment.parentId)}
                    disabled={deleting}
                  >
                    {deleting ? 'Đang xóa...' : 'Xóa'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="reply-form">
              <textarea
                className="reply-input"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
                ref={replyTextareaRef}
              />
              <div className="reply-actions">
                <button 
                  className="reply-submit-btn"
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim() || submittingReply}
                >
                  {submittingReply ? 'Đang đăng...' : 'Đăng trả lời'}
                </button>
                <button 
                  className="reply-cancel-btn"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                >
                  Hủy bỏ
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
  };

  // Add a function to handle sorting
  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
  };

  if (commentsLoading) {
    return (
      <div className="comments-loading">
        <LoadingSpinner size="medium" text="Đang tải bình luận..." />
      </div>
    );
  }
  
  if (commentsError) {
    return <div className="comments-error">Lỗi tải bình luận: {commentsError.message}</div>;
  }
  
  return (
    <div className="comments-section">
      <h3 className="comments-title">Bình luận ({comments.length})</h3>
      
      {/* Sort controls */}
      <div className="sort-controls">
        <span>Sắp xếp theo: </span>
        <button 
          className={`sort-btn ${sortOrder === 'newest' ? 'active' : ''}`}
          onClick={() => handleSortChange('newest')}
        >
          Mới nhất
        </button>
        <button 
          className={`sort-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
          onClick={() => handleSortChange('oldest')}
        >
          Cũ nhất
        </button>
        <button 
          className={`sort-btn ${sortOrder === 'likes' ? 'active' : ''}`}
          onClick={() => handleSortChange('likes')}
        >
          Thích nhiều nhất
        </button>
      </div>
      
      {isAuthenticated ? (
        isBanned ? (
          <div className="banned-message">
            Bạn đang bị chặn và không thể đăng bình luận hoặc trả lời.
          </div>
        ) : (
          <form className="comment-form" onSubmit={handleSubmit}>
            <textarea
              className="comment-input"
              placeholder="Thêm bình luận..."
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
              {submitting ? 'Đang đăng...' : 'Đăng bình luận'}
            </button>
          </form>
        )
      ) : (
        <div className="login-to-comment">
          Vui lòng <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="login-link">đăng nhập</button> để để lại bình luận.
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
          <p>Chưa có bình luận. Hãy là người đầu tiên bình luận!</p>
        </div>
      )}

      {/* Block confirmation modal */}
      {showBlockModal && (
        <div className="block-confirm-modal">
          <div className="block-confirm-content">
            <p>Bạn có chắc chắn muốn {user.role === 'admin' ? 'chặn' : 'chặn'} {userToBlock.username}?</p>
            <div className="block-confirm-actions">
              <button onClick={handleBlock}>
                {user.role === 'admin' ? 'Chặn User' : 'Chặn User'}
              </button>
              <button onClick={() => {
                setShowBlockModal(false);
                setUserToBlock(null);
              }}>
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;