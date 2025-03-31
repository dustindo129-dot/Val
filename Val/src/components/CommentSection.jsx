/**
 * CommentSection Component
 * 
 * A comprehensive comment system that allows users to:
 * - View comments on novels and chapters
 * - Post new comments
 * - Reply to existing comments
 * - Like/dislike comments
 * - Delete their own comments
 * - Sort comments by likes, newest, or oldest
 * 
 * Features:
 * - Nested comment replies with indentation
 * - User authentication checks
 * - Real-time updates
 * - Comment moderation (admin/author deletion)
 * - Time-ago formatting
 * - Avatar support
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './CommentSection.css';
import config from '../config/config';

// Import TinyMCE
import { Editor } from '@tinymce/tinymce-react';

/**
 * Comment Component
 * 
 * Renders a single comment
 * 
 * @param {Object} props
 * @param {Object} props.comment - The comment data
 * @param {Function} props.onLike - Handler for liking a comment
 * @param {Function} props.onDislike - Handler for disliking a comment
 * @param {Function} props.onDelete - Handler for deleting a comment
 */
const Comment = ({ comment, onLike, onDislike, onDelete }) => {
  const { user } = useAuth();
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInYears > 0) return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
    if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  };

  // Check if the logged-in user is the comment author
  const isOwnComment = user && comment.user && user.username === comment.user.username;

  const handleBlock = async () => {
    try {
      await axios.post(
        `${config.backendUrl}/api/users/${user.username}/block`,
        { userToBlock: comment.user.username },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      window.location.reload(); // Refresh to hide blocked user's comments
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  };

  return (
    <div className="comment">
      <div className="comment-avatar">
        <img src={comment.user?.avatar || '/default-avatar.png'} alt="User avatar" />
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <div className="author-block-wrapper">
            <span className="comment-author">{comment.user?.username}</span>
            {user && user.username !== comment.user?.username && (
              <button 
                className="block-btn"
                onClick={() => setShowBlockConfirm(true)}
                title="Block this user"
              >
                🚫
              </button>
            )}
          </div>
          <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
        </div>
        <div 
          className="comment-text"
          dangerouslySetInnerHTML={{ __html: comment.text }}
        />
        <div className="comment-actions">
          <button 
            className={`action-btn like-btn ${comment.liked ? 'active' : ''}`}
            onClick={() => onLike(comment._id)}
          >
            <span className="action-icon">✔</span>
            <span className="action-count">{comment.likes}</span>
          </button>
          <button 
            className={`action-btn dislike-btn ${comment.disliked ? 'active' : ''}`}
            onClick={() => onDislike(comment._id)}
          >
            <span className="action-icon">✖</span>
            <span className="action-count">{comment.dislikes}</span>
          </button>
          {isOwnComment && (
            <button 
              className="action-btn delete-btn"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this comment?')) {
                  onDelete(comment._id);
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {showBlockConfirm && (
        <div className="block-confirm-modal">
          <div className="block-confirm-content">
            <p>Are you sure you want to block {comment.user?.username}?</p>
            <p>You won't see their comments anymore.</p>
            <div className="block-confirm-actions">
              <button onClick={handleBlock}>Block</button>
              <button onClick={() => setShowBlockConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CommentSection Component
 * 
 * Main component that manages the comment system for novels and chapters
 * 
 * @param {Object} props
 * @param {string} props.contentId - ID of the novel or chapter
 * @param {string} props.contentType - Type of content ('novels' or 'chapters')
 */
const CommentSection = ({ contentId, contentType }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [contentId, sortBy]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/comments/${contentType}/${contentId}`,
        { params: { sort: sortBy } }
      );
      setComments(response.data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const content = editorRef.current.getContent();
      const response = await axios.post(
        `${config.backendUrl}/api/comments/${contentType}/${contentId}`,
        { text: content },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setComments(prev => [response.data, ...prev]);
      editorRef.current.setContent('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleLike = async (commentId) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/comments/${commentId}/like`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setComments(prev => prev.map(comment => 
        comment._id === commentId ? { ...comment, ...response.data } : comment
      ));
    } catch (err) {
      console.error('Failed to like comment:', err);
    }
  };

  const handleDislike = async (commentId) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/comments/${commentId}/dislike`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setComments(prev => prev.map(comment => 
        comment._id === commentId ? { ...comment, ...response.data } : comment
      ));
    } catch (err) {
      console.error('Failed to dislike comment:', err);
    }
  };

  const handleDelete = async (commentId) => {
    if (!user) return;

    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/comments/${commentId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          } 
        }
      );
      
      if (response.status === 403) {
        setMessage({
          type: 'error',
          text: 'You are not authorized to delete this comment'
        });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      
      setComments(prev => prev.filter(comment => comment._id !== commentId));
      setMessage({
        type: 'success',
        text: 'Comment deleted successfully'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete comment'
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="comment-section">
      <div className="comment-header">
        <span className="comment-count">{comments.length} Comments</span>
        <div className="sort-buttons">
          <button 
            className={`sort-btn ${sortBy === 'likes' ? 'active' : ''}`}
            onClick={() => setSortBy('likes')}
          >
            Likes
          </button>
          <button 
            className={`sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => setSortBy('newest')}
          >
            Newest
          </button>
          <button 
            className={`sort-btn ${sortBy === 'oldest' ? 'active' : ''}`}
            onClick={() => setSortBy('oldest')}
          >
            Oldest
          </button>
        </div>
      </div>

      <form onSubmit={handleCommentSubmit} className="comment-form">
        <Editor
          apiKey={config.tinymceApiKey}
          onInit={(evt, editor) => editorRef.current = editor}
          init={{
            height: 200,
            menubar: false,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
              'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | formatselect | ' +
              'bold italic underline strikethrough | ' +
              'alignleft aligncenter alignright alignjustify | ' +
              'bullist numlist outdent indent | ' +
              'link image | removeformat | help',
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            skin: 'oxide',
            content_css: 'default',
            placeholder: 'Write your comment...',
            statusbar: false,
            resize: false,
            branding: false,
            promotion: false,
            paste_data_images: true,
            images_upload_handler: (blobInfo) => {
              return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('file', blobInfo.blob(), blobInfo.filename());
                formData.append('upload_preset', config.cloudinary.uploadPresets.comment);
                formData.append('folder', 'comment_images');

                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`;

                fetch(cloudinaryUrl, {
                  method: 'POST',
                  body: formData
                })
                .then(response => response.json())
                .then(result => {
                  if (result.secure_url) {
                    resolve(result.secure_url);
                  } else {
                    reject('Image upload failed');
                  }
                })
                .catch(error => {
                  console.error('Cloudinary upload error:', error);
                  reject('Image upload failed');
                });
              });
            },
            images_upload_base_path: '/',
            automatic_uploads: true
          }}
        />
        <button type="submit">Post Comment</button>
      </form>

      <div className="comments-list">
        {comments.map(comment => (
          <Comment
            key={comment._id}
            comment={comment}
            onLike={handleLike}
            onDislike={handleDislike}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {isLoginModalOpen && (
        <div className="login-prompt">
          Please log in to interact with comments
          <button onClick={() => setIsLoginModalOpen(false)}>Close</button>
        </div>
      )}

      {message && (
        <div className={`message ${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default CommentSection; 