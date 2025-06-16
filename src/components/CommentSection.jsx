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
import { Editor } from '@tinymce/tinymce-react';
import bunnyUploadService from '../services/bunnyUploadService';
import { createUniqueSlug } from '../utils/slugUtils';

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


// Create a safe sanitize function
const sanitizeHTML = (content) => {
  if (!content) return '';
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height']
  });
};

// Function to decode HTML entities for legacy comments
const decodeHTMLEntities = (text) => {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const CommentSection = ({ contentId, contentType, user, isAuthenticated, defaultSort = 'newest', novel = null }) => {
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
  const [pinningComments, setPinningComments] = useState(new Set());
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const commentsPerPage = 10;
  const maxVisibleReplies = 2;

  const { data: authUser } = useAuth();
  const commentEditorRef = useRef(null);

  // Helper function to check if user has rich text editor privileges
  const hasRichTextPrivileges = () => {
    if (!isAuthenticated || !user) return false;
    
    // Admin and moderator always have privileges
    if (user.role === 'admin' || user.role === 'moderator') return true;
    
    // For novel detail page, check if pj_user is assigned to this novel
    if (contentType === 'novels' && user.role === 'pj_user' && novel?.active?.pj_user) {
      return novel.active.pj_user.includes(user.id) || 
             novel.active.pj_user.includes(user._id) ||
             novel.active.pj_user.includes(user.username) ||
             novel.active.pj_user.includes(user.displayName);
    }
    
    // For chapter page, we need to check if pj_user is assigned to the novel that owns this chapter
    // This would require additional data, but for now we'll allow pj_user on chapter pages
    if (contentType === 'chapters' && user.role === 'pj_user') {
      return true; // You might want to add more specific logic here
    }
    
    return false;
  };

  // Memoize the privileges check at the component level to prevent infinite loops
  const globalHasRichTextPrivileges = React.useMemo(() => {
    return hasRichTextPrivileges();
  }, [
    isAuthenticated, 
    user?.role, 
    user?.id, 
    user?._id, 
    user?.username, 
    user?.displayName, 
    contentType,
    // Create a stable reference for pj_user array
    novel?.active?.pj_user?.join(',') || ''
  ]);

  // TinyMCE configuration for comments
  const getTinyMCEConfig = () => ({
    script_src: config.tinymce.scriptPath,
    license_key: 'gpl',
    height: 200,
    menubar: false,
    remove_empty_elements: false,
    forced_root_block: 'p',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | formatselect | ' +
      'bold italic underline | ' +
      'alignleft aligncenter alignright | ' +
      'bullist numlist | ' +
      'link image | code | removeformat | help',
    contextmenu: 'cut copy paste | link image | removeformat',
    content_style: `
      body { font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; }
      em, i { font-style: italic; }
      strong, b { font-weight: bold; }
    `,
    skin: 'oxide',
    content_css: 'default',
    placeholder: 'Viết bình luận...',
    statusbar: false,
    resize: false,
    branding: false,
    promotion: false,
    images_upload_handler: async (blobInfo, progress) => {
      try {
        // Convert blob to file
        const file = new File([blobInfo.blob()], blobInfo.filename(), {
          type: blobInfo.blob().type
        });
        
        // Upload to bunny.net comments folder
        const url = await bunnyUploadService.uploadFile(file, 'comments');
        return url;
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
      }
    },
    automatic_uploads: true,
    file_picker_types: 'image',
    file_picker_callback: (callback, value, meta) => {
      if (meta.filetype === 'image') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        
        input.onchange = async function() {
          const file = this.files[0];
          if (file) {
            try {
              const url = await bunnyUploadService.uploadFile(file, 'comments');
              callback(url, { alt: file.name });
            } catch (error) {
              console.error('Error uploading image:', error);
              alert('Failed to upload image');
            }
          }
        };
        
        input.click();
      }
    }
  });

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
    queryKey: ['comments', `${contentType}-${contentId}`, sortOrder],
    queryFn: async () => {
      // If we're on a novel detail page, fetch all comments for the novel (including chapter comments)
      if (contentType === 'novels') {
        const response = await axios.get(`${config.backendUrl}/api/comments/novel/${contentId}`, {
          params: { sort: sortOrder }
        });
        return response.data;
      } else {
        // For other content types (chapters, feedback), use the regular endpoint
        const response = await axios.get(`${config.backendUrl}/api/comments`, {
          params: { contentType, contentId, sort: sortOrder }
        });
        return response.data;
      }
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false
  });

  // Memoize the organizeComments function to prevent recreation on every render
  const organizeCommentsCallback = React.useCallback((flatComments) => {
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

    // Sort root comments: pinned comments first, then by date
    rootComments.sort((a, b) => {
      // First, check if either comment is pinned
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // If both are pinned or both are not pinned, sort by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    rootComments.forEach(comment => sortReplies(comment));

    return rootComments;
  }, []);

  useEffect(() => {
    if (commentsData.length > 0) {
      const organizedComments = organizeCommentsCallback(commentsData);
      setComments(organizedComments);
    } else {
      setComments(prevComments => {
        if (prevComments.length === 0) {
          return prevComments; // Don't trigger re-render if already empty
        }
        return [];
      });
    }
    
    // Reset expanded replies when comments data changes - only if not already empty
    setExpandedReplies(prevExpanded => {
      if (prevExpanded.size === 0) {
        return prevExpanded; // Don't trigger re-render if already empty
      }
      return new Set();
    });
  }, [commentsData]); // Remove organizeCommentsCallback dependency since it should be stable

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
    
    // Get content from appropriate editor
    let commentContent = '';
    if (globalHasRichTextPrivileges && commentEditorRef.current) {
      commentContent = commentEditorRef.current.getContent();
    } else {
      commentContent = newComment;
    }
    
    if (!commentContent.trim()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/comments/${contentType}/${contentId}`,
        { text: sanitizeHTML(commentContent) },
        { headers: getAuthHeaders() }
      );
      
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
          text: commentContent,
          createdAt: new Date().toISOString(),
          likes: [],
          replies: [],
          isDeleted: false,
          adminDeleted: false
        },
        ...prevComments
      ]);
      
      // Reset to first page when new comment is added
      setCurrentPage(1);
      
      // Clear the form
      if (globalHasRichTextPrivileges && commentEditorRef.current) {
        commentEditorRef.current.setContent('');
      } else {
        setNewComment('');
      }
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

  // Add pin/unpin handler
  const handlePin = async (commentId, currentPinStatus) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để thực hiện hành động này');
      return;
    }

    if (!user || (!user._id && !user.id)) {
      alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
      return;
    }

    // Prevent multiple simultaneous pin operations on the same comment
    if (pinningComments.has(commentId)) {
      return;
    }

    try {
      // Add comment to loading state
      setPinningComments(prev => new Set([...prev, commentId]));

      const response = await axios.post(
        `${config.backendUrl}/api/comments/${commentId}/pin`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      const data = response.data;

      // Update local state efficiently without refetching
      setComments(prevComments => {
        return prevComments.map(comment => {
          // If this is the comment being pinned/unpinned
          if (comment._id === commentId) {
            return {
              ...comment,
              isPinned: data.isPinned
            };
          }
          
          // If a comment was pinned, unpin all other comments at root level
          if (data.isPinned && comment.isPinned && comment._id !== commentId) {
            return {
              ...comment,
              isPinned: false
            };
          }
          
          // Check replies for the target comment
          if (comment.replies && comment.replies.length > 0) {
            const updatedReplies = comment.replies.map(reply => {
              if (reply._id === commentId) {
                return {
                  ...reply,
                  isPinned: data.isPinned
                };
              }
              // Unpin other replies if this one was pinned
              if (data.isPinned && reply.isPinned && reply._id !== commentId) {
                return {
                  ...reply,
                  isPinned: false
                };
              }
              return reply;
            });
            
            return {
              ...comment,
              replies: updatedReplies
            };
          }
          
          return comment;
        });
      });
    } catch (err) {
      console.error('Error pinning comment:', err);
      alert(`Không thể ${currentPinStatus ? 'bỏ ghim' : 'ghim'} bình luận: ${err.response?.data?.message || err.message}`);
    } finally {
      // Remove comment from loading state
      setPinningComments(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
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
    const [showDropdown, setShowDropdown] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [submittingEdit, setSubmittingEdit] = useState(false);
    const replyTextareaRef = useRef(null);
    const replyEditorRef = useRef(null);
    const editTextareaRef = useRef(null);
    const editEditorRef = useRef(null);
    const dropdownRef = useRef(null);
    const commentContentRef = useRef(null);

    // Process comment content similar to chapter content
    const processCommentContent = (content) => {
      if (!content) return '';
      
      try {
        const contentString = typeof content === 'object' ? JSON.stringify(content) : String(content);
        
        // Basic HTML sanitization while preserving images and formatting
        let processedContent = contentString;
        
        // Images will be styled via CSS, no need for inline styles
        
        // Convert br tags to proper line breaks
        processedContent = processedContent.replace(/<br\s*\/?>/gi, '<br>');
        
        // If content doesn't have paragraph structure, wrap in paragraphs
        if (!processedContent.includes('<p')) {
          const parts = processedContent.split(/<br>/gi);
          processedContent = parts
            .map(part => {
              const trimmed = part.trim();
              if (trimmed && !trimmed.match(/^<(img|div|h[1-6])/i)) {
                return `<p>${trimmed}</p>`;
              }
              return trimmed;
            })
            .filter(part => part.length > 0)
            .join('');
        }
        
        return DOMPurify.sanitize(processedContent, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'u'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'style', 'class']
        });
      } catch (error) {
        console.error('Error processing comment content:', error);
        return content;
      }
    };

    // Check if comment content needs truncation (more than 4 lines)
    const checkIfNeedsTruncation = (content) => {
      if (!content) return false;
      
      // Create a temporary element to measure content height
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processCommentContent(content);
      tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: 400px;
        font-size: 14px;
        line-height: 1.5;
        font-family: inherit;
      `;
      document.body.appendChild(tempDiv);
      
      const lineHeight = 21; // 14px * 1.5
      const maxHeight = lineHeight * 4; // 4 lines
      const actualHeight = tempDiv.offsetHeight;
      
      document.body.removeChild(tempDiv);
      
      return actualHeight > maxHeight;
    };

    const needsTruncation = checkIfNeedsTruncation(comment.text);

    // Focus the reply textarea when the reply form is shown
    useEffect(() => {
      if (isReplying && replyTextareaRef.current) {
        replyTextareaRef.current.focus();
      }
    }, [isReplying]);



    // Initialize edit content when edit mode is enabled
    useEffect(() => {
      if (isEditing && !globalHasRichTextPrivileges) {
        // For plain text, decode HTML entities and strip HTML tags for editing
        let plainText = comment.text || '';
        
        // First decode HTML entities
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = plainText;
        plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        setEditText(plainText);
        
        // Focus after a short delay to ensure the textarea is rendered
        setTimeout(() => {
          if (editTextareaRef.current) {
            editTextareaRef.current.focus();
          }
        }, 100);
      }
      // Rich text editor content will be set in the onInit callback
    }, [isEditing, globalHasRichTextPrivileges, comment.text]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setShowDropdown(false);
        }
      };

      if (showDropdown) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [showDropdown]);

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
      
      // Get content from appropriate editor
      let replyContent = '';
      if (globalHasRichTextPrivileges && replyEditorRef.current) {
        replyContent = replyEditorRef.current.getContent();
      } else {
        replyContent = replyText;
      }
      
      if (!replyContent.trim()) {
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
          { text: sanitizeHTML(replyContent) },
          { headers: getAuthHeaders() }
        );
        
        const data = response.data;
        
        // Clear the reply form immediately
        if (globalHasRichTextPrivileges && replyEditorRef.current) {
          replyEditorRef.current.setContent('');
        } else {
          setReplyText('');
        }
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

    // Local handleEditSubmit function
    const handleEditSubmit = async () => {
      if (!isAuthenticated) {
        window.dispatchEvent(new CustomEvent('openLoginModal'));
        return;
      }
  
      if (!user || (!user._id && !user.id)) {
        alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
        return;
      }
  
      if (isBanned) {
        alert('Bạn không thể chỉnh sửa vì đã bị chặn');
        return;
      }
      
      // Get content from appropriate editor
      let editContent = '';
      if (globalHasRichTextPrivileges && editEditorRef.current) {
        editContent = editEditorRef.current.getContent();
      } else {
        editContent = editText;
      }
      
      if (!editContent.trim()) {
        return;
      }
  
      // Prevent multiple submissions
      if (submittingEdit) {
        return;
      }
      
      setSubmittingEdit(true);
      
      try {
        const response = await axios.patch(
          `${config.backendUrl}/api/comments/${comment._id}`,
          { text: sanitizeHTML(editContent) },
          { headers: getAuthHeaders() }
        );
        
        // Update the comment in local state
        setComments(prevComments => 
          prevComments.map(c => {
            if (c._id === comment._id) {
              return { ...c, text: editContent, isEdited: true };
            }
            // Also check replies
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map(reply => 
                  reply._id === comment._id
                    ? { ...reply, text: editContent, isEdited: true }
                    : reply
                )
              };
            }
            return c;
          })
        );
        
        // Clear the edit form
        setEditText('');
        setIsEditing(false);
      } catch (err) {
        console.error('Error editing comment:', err);
        alert(err.response?.data?.message || 'Không thể chỉnh sửa bình luận. Vui lòng thử lại.');
      } finally {
        // Reset submitting state to false at the end
        setSubmittingEdit(false);
      }
    };

    // Use user.id since that's the property in the user object
    const userId = user?.id || user?._id;
    
    // Check if the current user has liked this comment
    const isLikedByCurrentUser = isAuthenticated && user && userId && 
      comment.likes && Array.isArray(comment.likes) && 
      comment.likes.some(likeId => likeId === userId);

    // Check if user can pin comments (only for novel detail page)
    const canPinComments = contentType === 'novels' && isAuthenticated && user && (
      user.role === 'admin' || 
      user.role === 'moderator' || 
      (user.role === 'pj_user' && novel?.active?.pj_user && (
        novel.active.pj_user.includes(user.id) || 
        novel.active.pj_user.includes(user._id) ||
        novel.active.pj_user.includes(user.username) ||
        novel.active.pj_user.includes(user.displayName)
      ))
    );
    
    return (
      <div className="comment-item">
        <div className="comment-main">
          <div className="comment-avatar">
            {comment.user.avatar ? (
              <img src={comment.user.avatar} alt={comment.user.displayName || comment.user.username} />
            ) : (
              <div className="default-avatar">
                {(comment.user.displayName || comment.user.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={`comment-content ${comment.isPinned ? 'pinned-comment' : ''}`}>
          <div className="comment-header">
            <div className="comment-user-info">
              <div className="comment-user-line">
                <span className="comment-username">
                  {comment.isDeleted && !comment.adminDeleted ? '[đã xóa]' : (comment.user.displayName || comment.user.username)}
                  {comment.isPinned && <span className="pinned-indicator">📌</span>}
                </span>
                <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
              </div>
              {/* Show chapter link for chapter comments on novel detail page */}
              {contentType === 'novels' && comment.contentType === 'chapters' && comment.chapterInfo && (
                <div className="comment-chapter-link">
                  <Link 
                    to={`/truyen/${novel?.title ? createUniqueSlug(novel.title, novel._id || contentId) : contentId}/chuong/${comment.chapterInfo.title ? createUniqueSlug(comment.chapterInfo.title, comment.contentId.includes('-') ? comment.contentId.split('-')[1] : comment.contentId) : comment.contentId}`}
                    className="chapter-link"
                  >
                    📖 {comment.chapterInfo.title}
                  </Link>
                </div>
              )}
            </div>
            {isAuthenticated && user && !comment.isDeleted && (comment.user.username !== user.username || canPinComments) && (
              <div className="comment-dropdown" ref={dropdownRef}>
                <button
                  className="comment-dropdown-trigger"
                  onClick={() => setShowDropdown(!showDropdown)}
                  title="Tùy chọn"
                >
                  ⋯
                </button>
                {showDropdown && (
                  <div className="comment-dropdown-menu">
                    {canPinComments && (
                      <button
                        className="comment-dropdown-item"
                        onClick={() => {
                          handlePin(comment._id, comment.isPinned);
                          setShowDropdown(false);
                        }}
                        disabled={pinningComments.has(comment._id)}
                      >
                        {pinningComments.has(comment._id) ? '⏳' : (comment.isPinned ? '📌' : '📌')} {comment.isPinned ? 'Bỏ ghim' : 'Ghim'}
                      </button>
                    )}
                    {comment.user.username === user.username && comment.isPinned && (
                      <button
                        className="comment-dropdown-item"
                        onClick={() => {
                          setIsEditing(true);
                          setShowDropdown(false);
                        }}
                      >
                        ✏️ Chỉnh sửa
                      </button>
                    )}
                    {comment.user.username !== user.username && (
                      <button
                        className="comment-dropdown-item"
                        onClick={() => {
                          openBlockModal(comment.user);
                          setShowDropdown(false);
                        }}
                      >
                        🚫 {user.role === 'admin' ? 'Cấm (Danh sách đen)' : 'Chặn'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {!isEditing ? (
            <div className="comment-text" ref={commentContentRef}>
              {comment.isDeleted && !comment.adminDeleted ? 'Bình luận gốc bị xóa bởi người dùng' : (
                <div 
                  className={`comment-content-wrapper ${needsTruncation && !isExpanded ? 'truncated' : ''}`}
                  dangerouslySetInnerHTML={{ 
                    __html: processCommentContent(decodeHTMLEntities(comment.text))
                  }} 
                />
              )}
              {needsTruncation && !comment.isDeleted && (
                <button 
                  className="see-more-btn"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                </button>
              )}
              {comment.isEdited && (
                <span className="edited-indicator">(đã chỉnh sửa)</span>
              )}
            </div>
          ) : (
                        <div className="edit-form clean">
              {globalHasRichTextPrivileges ? (
                <div className="edit-editor clean">
                  <Editor
                    onInit={(evt, editor) => {
                      editEditorRef.current = editor;
                      // Set the initial content once the editor is ready
                      const contentToSet = comment.text || '';
                      
                      // Try setting content with a small delay to ensure editor is fully ready
                      setTimeout(() => {
                        editor.setContent(contentToSet);
                        
                        // Verify the content was set and focus to remove placeholder if needed
                        setTimeout(() => {
                          editor.focus();
                        }, 100);
                      }, 10);
                    }}
                    scriptLoading={{ async: true, load: "domainBased" }}
                    init={{
                      ...getTinyMCEConfig(),
                      height: 450, // Increased height for better editing experience
                      // Remove placeholder for edit mode since we're prefilling content
                      placeholder: '',
                      // Remove editor borders and padding
                      content_style: `
                        body { 
                          font-family:Helvetica,Arial,sans-serif; 
                          font-size:14px; 
                          line-height:1.6; 
                          margin: 0;
                          padding: 8px;
                        }
                        em, i { font-style: italic; }
                        strong, b { font-weight: bold; }
                      `,
                      // Remove statusbar and menubar for cleaner look
                      statusbar: false,
                      menubar: false
                    }}
                  />
                </div>
              ) : (
                <textarea
                  className="edit-input clean"
                  placeholder="Chỉnh sửa bình luận..."
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  required
                  ref={editTextareaRef}
                />
              )}
              <div className="edit-actions">
                <button 
                  className="edit-submit-btn"
                  onClick={handleEditSubmit}
                  disabled={submittingEdit}
                >
                  {submittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button 
                  className="edit-cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText('');
                    // Don't need to clear TinyMCE content as it will be reinitialized next time
                  }}
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}
          {!isEditing && (
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
          )}

            {/* Reply form */}
            {isReplying && (
              <div className="reply-form">
                {globalHasRichTextPrivileges ? (
                  <div className="reply-editor">
                    <Editor
                      onInit={(evt, editor) => replyEditorRef.current = editor}
                      scriptLoading={{ async: true, load: "domainBased" }}
                      init={{
                        ...getTinyMCEConfig(),
                        height: 150,
                        placeholder: 'Viết trả lời...'
                      }}
                    />
                  </div>
                ) : (
                  <textarea
                    className="reply-input"
                    placeholder="Viết trả lời..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    ref={replyTextareaRef}
                  />
                )}
                <div className="reply-actions">
                  <button 
                    className="reply-submit-btn"
                    onClick={handleReplySubmit}
                    disabled={submittingReply}
                  >
                    {submittingReply ? 'Đang đăng...' : 'Đăng trả lời'}
                  </button>
                  <button 
                    className="reply-cancel-btn"
                                      onClick={() => {
                    setIsReplying(false);
                    if (globalHasRichTextPrivileges && replyEditorRef.current) {
                      replyEditorRef.current.setContent('');
                    } else {
                      setReplyText('');
                    }
                  }}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nested replies - outside of pinned comment wrapper */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="replies-list">
            {/* Show first maxVisibleReplies replies */}
            {comment.replies.slice(0, expandedReplies.has(comment._id) ? comment.replies.length : maxVisibleReplies).map((reply) => (
              <RenderComment 
                key={reply._id} 
                comment={reply} 
                level={level + 1}
              />
            ))}
            
            {/* Show "Xem thêm" button if there are more replies */}
            {comment.replies.length > maxVisibleReplies && !expandedReplies.has(comment._id) && (
              <button 
                className="show-more-replies-btn"
                onClick={() => setExpandedReplies(prev => new Set([...prev, comment._id]))}
              >
                Xem thêm {comment.replies.length - maxVisibleReplies} trả lời
              </button>
            )}
            
            {/* Show "Thu gọn" button if replies are expanded */}
            {comment.replies.length > maxVisibleReplies && expandedReplies.has(comment._id) && (
              <button 
                className="show-less-replies-btn"
                onClick={() => setExpandedReplies(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(comment._id);
                  return newSet;
                })}
              >
                Thu gọn trả lời
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Add a function to handle sorting
  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
    setCurrentPage(1); // Reset to first page when sorting changes
    // The query will automatically refetch due to the sortOrder dependency
  };

  // Pagination calculations
  const totalComments = comments.length;
  const totalPages = Math.ceil(totalComments / commentsPerPage);
  const startIndex = (currentPage - 1) * commentsPerPage;
  const endIndex = startIndex + commentsPerPage;
  const currentComments = comments.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to comments section when page changes
    const commentsSection = document.querySelector('.comments-section');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
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
      <h3 className="comments-title">Bình luận ({totalComments})</h3>
      
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
            {globalHasRichTextPrivileges ? (
              <div className="comment-editor">
                <Editor
                  onInit={(evt, editor) => commentEditorRef.current = editor}
                  scriptLoading={{ async: true, load: "domainBased" }}
                  init={getTinyMCEConfig()}
                />
              </div>
            ) : (
              <textarea
                className="comment-input"
                placeholder="Thêm bình luận..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submitting}
                required
              />
            )}
            <button 
              type="submit" 
              className="comment-submit-btn"
              disabled={submitting}
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
        <>
          <div className="comments-list">
            {currentComments.map((comment) => (
              <RenderComment key={comment._id} comment={comment} />
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                Trang {currentPage} / {totalPages} ({totalComments} bình luận)
              </div>
              
              <div className="pagination-buttons">
                <button 
                  className="pagination-btn prev-btn"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  ← Trước
                </button>
                
                {/* Page numbers */}
                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`page-number-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  className="pagination-btn next-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-comments">
          <p>Chưa có bình luận. Hãy là người đầu tiên bình luận!</p>
        </div>
      )}

      {/* Block confirmation modal */}
      {showBlockModal && (
        <div className="block-confirm-modal">
          <div className="block-confirm-content">
            <p>Bạn có chắc chắn muốn {user.role === 'admin' ? 'cấm' : 'chặn'} người dùng <strong>{userToBlock.username}</strong>?</p>
            {user.role === 'admin' ? (
              <p className="block-warning">Người dùng này sẽ bị cấm hoàn toàn khỏi hệ thống.</p>
            ) : (
              <p className="block-warning">Bạn sẽ không còn thấy bình luận từ người dùng này.</p>
            )}
            <div className="block-confirm-actions">
              <button onClick={handleBlock} className="block-confirm-btn">
                {user.role === 'admin' ? 'Cấm người dùng' : 'Chặn người dùng'}
              </button>
              <button onClick={() => {
                setShowBlockModal(false);
                setUserToBlock(null);
              }} className="block-cancel-btn">
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