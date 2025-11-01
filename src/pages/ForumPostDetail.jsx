import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/ForumPostDetail.css';
import axios from 'axios';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import bunnyUploadService from '../services/bunnyUploadService';
import LoadingSpinner from '../components/LoadingSpinner';
import CommentSection from '../components/CommentSection';
import { generateUserProfileUrl } from '../utils/slugUtils';
import { getAuthHeaders } from '../utils/auth';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';

const ForumPostDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Edit/Delete state
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [portalContainer, setPortalContainer] = useState(null);
  const editEditorRef = useRef(null);
  const dropdownRef = useRef(null);

  // Comments toggle state
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  
  // Homepage visibility toggle state
  const [showOnHomepage, setShowOnHomepage] = useState(true);

  // Fetch the forum post with view gating
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['forumPost', slug],
    queryFn: async () => {
      // Check if post was viewed in the last 4 hours (same cooldown as novel views)
      const viewKey = `forum_post_${slug}_last_viewed`;
      const lastViewed = localStorage.getItem(viewKey);
      const now = Date.now();
      const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

      // Only count view if:
      // 1. Never viewed before, or
      // 2. Last viewed more than 4 hours ago
      const shouldCountView = !lastViewed || (now - parseInt(lastViewed, 10)) > fourHours;

      // Add skipViewTracking parameter if we shouldn't count this view
      const params = new URLSearchParams();
      if (!shouldCountView) {
        params.append('skipViewTracking', 'true');
      }

      const url = `${config.backendUrl}/api/forum/posts/${slug}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      // Update last viewed timestamp if we counted a view
      if (shouldCountView) {
        localStorage.setItem(viewKey, now.toString());
      }

      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Create portal container for delete modal
  useEffect(() => {
    let container = document.getElementById('forum-delete-modal-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'forum-delete-modal-portal';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.zIndex = '10000';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      if (container && container.parentNode && !showDeleteModal) {
        const existingModals = container.children.length;
        if (existingModals === 0) {
          container.parentNode.removeChild(container);
        }
      }
    };
  }, [showDeleteModal]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showDeleteModal) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('forum-delete-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'auto';
      }
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('forum-delete-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('forum-delete-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    };
  }, [showDeleteModal, portalContainer]);

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

  // Initialize edit form when edit mode is enabled
  useEffect(() => {
    if (isEditing && post) {
      setEditTitle(post.title || '');
      // Content will be set in the editor's onInit callback
    }
  }, [isEditing, post]);

  // Initialize comments disabled state from post data
  useEffect(() => {
    if (post) {
      setCommentsDisabled(post.commentsDisabled || false);
      setShowOnHomepage(post.showOnHomepage !== false); // Default to true if undefined
    }
  }, [post]);

  // Edit post mutation
  const editPostMutation = useMutation({
    mutationFn: async (postData) => {
      const response = await axios.patch(
        `${config.backendUrl}/api/forum/posts/${slug}`,
        postData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (updatedPost) => {
      setIsEditing(false);
      setEditTitle('');
      if (editEditorRef.current) {
        editEditorRef.current.setContent('');
      }
      
      // Check if slug changed (title changed)
      if (updatedPost.slug && updatedPost.slug !== slug) {
        // Invalidate old query
        queryClient.removeQueries({ queryKey: ['forumPost', slug] });
        // Navigate to new URL with updated slug
        navigate(`/thao-luan/${updatedPost.slug}`, { replace: true });
        // Note: The new page will fetch fresh data with the new slug
      } else {
        // Slug didn't change, just invalidate and refetch current data
        queryClient.invalidateQueries({ queryKey: ['forumPost', slug] });
      }
    },
    onError: (error) => {
      console.error('Error editing post:', error);
      alert(error.response?.data?.message || 'Không thể chỉnh sửa bài đăng. Vui lòng thử lại.');
    }
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (reason) => {
      const response = await axios.delete(
        `${config.backendUrl}/api/forum/posts/${slug}`,
        { 
          headers: getAuthHeaders(),
          data: { reason }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Navigate back to forum after successful deletion
      navigate('/thao-luan');
    },
    onError: (error) => {
      console.error('Error deleting post:', error);
      alert(error.response?.data?.message || 'Không thể xóa bài đăng. Vui lòng thử lại.');
    }
  });

  // Pin/Unpin post mutation
  const pinPostMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${config.backendUrl}/api/forum/posts/${slug}/pin`,
        {},
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch post data
      queryClient.invalidateQueries({ queryKey: ['forumPost', slug] });
    },
    onError: (error) => {
      console.error('Error toggling pin status:', error);
      alert(error.response?.data?.message || 'Không thể thay đổi trạng thái ghim. Vui lòng thử lại.');
    }
  });

  // Toggle comments mutation
  const toggleCommentsMutation = useMutation({
    mutationFn: async (disabled) => {
      const response = await axios.patch(
        `${config.backendUrl}/api/forum/posts/${slug}/toggle-comments`,
        { commentsDisabled: disabled },
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch post data
      queryClient.invalidateQueries({ queryKey: ['forumPost', slug] });
    },
    onError: (error) => {
      console.error('Error toggling comments:', error);
      alert(error.response?.data?.message || 'Không thể thay đổi trạng thái bình luận. Vui lòng thử lại.');
      // Revert the local state on error
      setCommentsDisabled(!commentsDisabled);
    }
  });

  // Toggle homepage visibility mutation
  const toggleHomepageVisibilityMutation = useMutation({
    mutationFn: async (visible) => {
      const response = await axios.patch(
        `${config.backendUrl}/api/forum/posts/${slug}/toggle-homepage`,
        { showOnHomepage: visible },
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch post data
      queryClient.invalidateQueries({ queryKey: ['forumPost', slug] });
      // Also invalidate homepage forum posts
      queryClient.invalidateQueries({ queryKey: ['homepageForumPosts'] });
    },
    onError: (error) => {
      console.error('Error toggling homepage visibility:', error);
      alert(error.response?.data?.message || 'Không thể thay đổi hiển thị trang chủ. Vui lòng thử lại.');
      // Revert the local state on error
      setShowOnHomepage(!showOnHomepage);
    }
  });

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'vừa xong';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} phút`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} giờ`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ngày`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} tháng`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} năm`;
    }
  };

  // Get role display tag
  const getRoleTag = (role) => {
    switch (role) {
      case 'admin':
        return { text: 'ADMIN', className: 'role-tag admin-tag' };
      case 'moderator':
        return { text: 'MOD', className: 'role-tag mod-tag' };
      case 'pj_user':
        return { text: 'QUẢN LÍ DỰ ÁN', className: 'role-tag pj-user-tag' };
      case 'translator':
        return { text: 'DỊCH GIẢ', className: 'role-tag translator-tag' };
      case 'editor':
        return { text: 'BIÊN TẬP', className: 'role-tag editor-tag' };
      case 'proofreader':
        return { text: 'HIỆU ĐÍNH', className: 'role-tag proofreader-tag' };
      default:
        return null;
    }
  };

  // Check if user can edit/delete post
  const canEditPost = () => {
    if (!user || !post) return false;
    
    // Author can edit their own post
    if (post.author?._id === user._id || post.author?.id === user.id) return true;
    
    // Admin and moderators can edit any post
    if (user.role === 'admin' || user.role === 'moderator') return true;
    
    return false;
  };

  // Check if current user is the author
  const isAuthor = () => {
    if (!user || !post) return false;
    return post.author?._id === user._id || post.author?.id === user.id;
  };

  // Check if user can toggle comments (admin/mod or post author)
  const canToggleComments = () => {
    if (!user) return false;
    // Admin and moderators can toggle comments on any post
    if (user.role === 'admin' || user.role === 'moderator') return true;
    // Post authors can toggle comments on their own posts
    return post && (post.author?._id === user._id || post.author?.id === user.id);
  };

  // Check if user can toggle homepage visibility (admin/mod or post author)
  const canToggleHomepageVisibility = () => {
    if (!user) return false;
    // Admin and moderators can toggle homepage visibility on any post
    if (user.role === 'admin' || user.role === 'moderator') return true;
    // Post authors can toggle homepage visibility on their own posts
    return post && (post.author?._id === user._id || post.author?.id === user.id);
  };

  // Check if user has rich text editor privileges
  const hasRichTextPrivileges = () => {
    if (!user) return false;
    return true; // All authenticated users get TinyMCE access
  };

  // Check if user has image upload privileges
  const hasImagePrivileges = () => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'moderator';
  };

  // TinyMCE configuration for post editing
  const getTinyMCEConfig = () => {
    const basePlugins = [
      'advlist', 'autolink', 'lists', 'link', 'charmap',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'table', 'help', 'wordcount'
    ];

    const imagePlugins = hasImagePrivileges() ? ['image', 'media'] : [];

    const baseToolbar = 'undo redo | formatselect | ' +
      'bold italic underline strikethrough | ' +
      'alignleft aligncenter alignright | ' +
      'bullist numlist | link';

    const imageToolbar = hasImagePrivileges() ? ' | image' : '';
    const fullToolbar = baseToolbar + imageToolbar + ' | code | removeformat | help';

    const editorConfig = {
      script_src: config.tinymce.scriptPath,
      license_key: 'gpl',
      height: 400,
      menubar: false,
      remove_empty_elements: false,
      forced_root_block: 'p',
      plugins: [...basePlugins, ...imagePlugins],
      toolbar: fullToolbar,
      content_style: `
        body { font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; }
        em, i { font-style: italic; }
        strong, b { font-weight: bold; }
        s, strike, del { text-decoration: line-through; }
      `,
      skin: 'oxide',
      content_css: 'default',
      placeholder: 'Chỉnh sửa nội dung...',
      statusbar: false,
      resize: false,
      branding: false,
      promotion: false
    };

    // Add image upload configuration for privileged users
    if (hasImagePrivileges()) {
      editorConfig.images_upload_handler = async (blobInfo) => {
        try {
          const file = new File([blobInfo.blob()], blobInfo.filename(), {
            type: blobInfo.blob().type
          });
          
          const url = await bunnyUploadService.uploadFile(file, 'forums');
          const optimizedUrl = cdnConfig.getOptimizedImageUrl(url.replace(cdnConfig.bunnyBaseUrl, ''), cdnConfig.imageClasses.commentImg);
          
          return optimizedUrl;
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error('Failed to upload image');
        }
      };

      editorConfig.automatic_uploads = true;
      editorConfig.file_picker_types = 'image';
    }

    return editorConfig;
  };

  // Handle edit submission
  const handleEditSubmit = async () => {
    if (!editTitle.trim()) {
      alert('Vui lòng nhập tiêu đề');
      return;
    }

    const content = editEditorRef.current ? editEditorRef.current.getContent() : '';
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung');
      return;
    }

    editPostMutation.mutate({
      title: editTitle.trim(),
      content: DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 's', 'strike', 'del'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height']
      })
    });
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTitle('');
    if (editEditorRef.current) {
      editEditorRef.current.setContent('');
    }
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    const isModAction = user.role === 'admin' || user.role === 'moderator';
    const isOwnPost = isAuthor();

    // If it's a mod action on someone else's post, show the reason modal
    if (isModAction && !isOwnPost) {
      setShowDeleteModal(true);
    } else {
      // For own posts, show simple confirmation
      if (window.confirm('Bạn có chắc chắn muốn xóa bài đăng này không?')) {
        deletePostMutation.mutate('');
      }
    }
  };

  // Handle delete with reason submission
  const handleDeleteWithReason = () => {
    setShowDeleteModal(false);
    deletePostMutation.mutate(deleteReason.trim());
    setDeleteReason('');
  };

  // Handle pin toggle
  const handleTogglePin = () => {
    pinPostMutation.mutate();
  };

  // Handle comments toggle
  const handleToggleComments = () => {
    const newState = !commentsDisabled;
    setCommentsDisabled(newState); // Optimistic update
    toggleCommentsMutation.mutate(newState);
  };

  // Handle homepage visibility toggle
  const handleToggleHomepageVisibility = () => {
    const newState = !showOnHomepage;
    setShowOnHomepage(newState); // Optimistic update
    toggleHomepageVisibilityMutation.mutate(newState);
  };

  // Process post content similar to comment content
  const processPostContent = (content) => {
    if (!content) return '';
    
    try {
      const contentString = typeof content === 'object' ? JSON.stringify(content) : String(content);
      
      // Convert line breaks to <br> tags while preserving multiple consecutive breaks
      let processedContent = contentString
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, (match) => '<br>'.repeat(match.length))
        .replace(/\n{2}/g, '<br><br>')
        .replace(/\n/g, '<br>');
      
      // Store existing HTML tags to avoid processing their contents
      const htmlTags = [];
      let tempContent = processedContent;
      
      // Extract all existing HTML tags
      tempContent = tempContent.replace(/<[^>]+>/g, (match) => {
        const placeholder = `__HTML_TAG_${htmlTags.length}__`;
        htmlTags.push(match);
        return placeholder;
      });
      
      // Process URLs in the remaining text (avoiding already-linked URLs)
      tempContent = tempContent.replace(/(https?:\/\/[^\s<>"]+)/gi, (match) => {
        // Check if this URL is not already part of a placeholder
        if (!match.includes('__HTML_TAG_')) {
          return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
        }
        return match;
      });

      // Convert www links to clickable links
      tempContent = tempContent.replace(/(^|[^\/])(www\.[^\s<>"]+)/gi, (match, p1, p2) => {
        if (!match.includes('__HTML_TAG_')) {
          return `${p1}<a href="http://${p2}" target="_blank" rel="noopener noreferrer">${p2}</a>`;
        }
        return match;
      });

      // Convert email addresses to mailto links
      tempContent = tempContent.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, (match) => {
        if (!match.includes('__HTML_TAG_')) {
          return `<a href="mailto:${match}">${match}</a>`;
        }
        return match;
      });
      
      // Restore original HTML tags
      processedContent = tempContent.replace(/__HTML_TAG_(\d+)__/g, (match, index) => {
        return htmlTags[parseInt(index)] || '';
      });
      
      // Process bunny.net image URLs for optimizer compatibility
      processedContent = cdnConfig.processImageUrls(processedContent);
      
      // Add error handling for images
      processedContent = processedContent.replace(
        /(<img[^>]*src=")([^"]*valvrareteam\.b-cdn\.net[^"]*?)(")/gi,
        (match, prefix, url, suffix) => {
          const originalUrl = url.split('?')[0];
          return `${prefix}${url}${suffix.replace('>', ` onerror="this.src='${originalUrl}'; this.onerror=null;" data-original-url="${originalUrl}"`)}`;
        }
      );
      
      return DOMPurify.sanitize(processedContent, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'u', 's', 'strike', 'del'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'style', 'class', 'onerror', 'data-original-url']
      });
    } catch (error) {
      console.error('Error processing post content:', error);
      return content;
    }
  };

  if (isLoading) {
    return (
      <div className="forum-post-detail-loading">
        <LoadingSpinner size="large" text="Đang tải bài đăng..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="forum-post-detail-error">
        <div className="error-content">
          <h2>Không thể tải bài đăng</h2>
          <p>{error.response?.data?.message || error.message}</p>
          <button onClick={() => navigate('/thao-luan')} className="back-to-forum-btn">
            ← Quay lại diễn đàn
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="forum-post-detail-error">
        <div className="error-content">
          <h2>Không tìm thấy bài đăng</h2>
          <p>Bài đăng này có thể đã được xóa hoặc không tồn tại.</p>
          <button onClick={() => navigate('/thao-luan')} className="back-to-forum-btn">
            ← Quay lại diễn đàn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-post-detail-page">
      {/* Breadcrumb Navigation */}
      <div className="forum-post-breadcrumb-nav">
        <Link to="/" className="breadcrumb-item">
          🏠
        </Link>
        <span className="breadcrumb-separator">›</span>
        <Link to="/thao-luan" className="breadcrumb-item">
          Thảo luận
        </Link>
      </div>

      {/* Main Post Content - like a "big comment" */}
      <div className={`main-post ${post.isPinned ? 'pinned' : ''}`}>
        <div className="post-header">
          {!isEditing ? (
            <>
              <h1 className="post-title">
                {post.title}
                {post.isPinned && <span className="pinned-indicator" title="Đã ghim">📌</span>}
                {post.commentsDisabled && <span className="locked-indicator" title="Bình luận đã bị tắt">🔒</span>}
                
                {/* Homepage visibility toggle - inline with title */}
                {canToggleHomepageVisibility() && (
                  <div className="homepage-visibility-toggle-inline">
                    <label className="homepage-toggle-label">
                      <span className="homepage-toggle-text">Hiển thị ở trang chủ</span>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={showOnHomepage}
                          onChange={handleToggleHomepageVisibility}
                          disabled={toggleHomepageVisibilityMutation.isLoading}
                        />
                        <span className="toggle-slider"></span>
                      </div>
                    </label>
                  </div>
                )}
              </h1>
            </>
          ) : (
            <div className="edit-title-section">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="edit-title-input"
                placeholder="Tiêu đề bài đăng..."
                maxLength={200}
              />
              <div className="title-char-count">{editTitle.length}/200</div>
            </div>
          )}
          
          {/* Edit/Delete Dropdown */}
          {user && (
            // Show dropdown if user is admin/moderator OR if user is the post author
            (user.role === 'admin' || user.role === 'moderator' || canEditPost()) && (
            <div className="post-dropdown" ref={dropdownRef}>
              <button
                className="post-dropdown-trigger"
                onClick={() => setShowDropdown(!showDropdown)}
                title="Tùy chọn"
              >
                ⋯
              </button>
                {showDropdown && (
                  <div className="post-dropdown-menu">
                    {/* Pin option - only for admin/moderators */}
                    {(user.role === 'admin' || user.role === 'moderator') && (
                      <button
                        className="post-dropdown-item"
                        onClick={() => {
                          handleTogglePin();
                          setShowDropdown(false);
                        }}
                        disabled={pinPostMutation.isLoading}
                      >
                        {pinPostMutation.isLoading ? '⏳' : '📌'} {post.isPinned ? 'Bỏ ghim' : 'Ghim bài đăng'}
                      </button>
                    )}
                    
                    {/* Edit option - for post author, admin, or moderator */}
                    {canEditPost() && (
                      <button
                        className="post-dropdown-item"
                        onClick={() => {
                          setIsEditing(true);
                          setShowDropdown(false);
                        }}
                        disabled={isEditing}
                      >
                        ✏️ Chỉnh sửa
                      </button>
                    )}
                    
                    {/* Delete option - for post author, admin, or moderator */}
                    {canEditPost() && (
                      <button
                        className="post-dropdown-item delete-item"
                        onClick={() => {
                          handleDeleteClick();
                          setShowDropdown(false);
                        }}
                        disabled={deletePostMutation.isLoading}
                      >
                        🗑️ {deletePostMutation.isLoading ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    )}
                  </div>
                )}
            </div>
            )
          )}
        </div>

        <div className="post-author-section">
          <div className="post-author-info">
            <div className="post-author-avatar">
              {post.author?.avatar ? (
                <img 
                  src={cdnConfig.getAvatarUrl(post.author.avatar)} 
                  alt={post.author.displayName || post.author.username} 
                />
              ) : (
                <div className="default-avatar">
                  {(post.author?.displayName || post.author?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="post-author-details">
              <Link 
                to={generateUserProfileUrl(post.author)} 
                className="post-author-name"
              >
                {post.author?.displayName || post.author?.username}
                {getRoleTag(post.author?.role) && (
                  <span className={getRoleTag(post.author.role).className}>
                    {getRoleTag(post.author.role).text}
                  </span>
                )}
              </Link>
              <div className="post-meta">
                <span className="post-date">{formatDate(post.createdAt)}</span>
                {post.isEdited && (
                  <span className="edited-indicator">(đã chỉnh sửa)</span>
                )}
                <span className="post-stats">
                  👁️ {post.views} lượt xem
                </span>
                {/* Show approved by info only to admin/mod */}
                {user && (user.role === 'admin' || user.role === 'moderator') && 
                 post.approvedBy && (
                  <span className="post-approved-by">
                    • Duyệt bởi: {post.approvedBy.displayName || post.approvedBy.username}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="post-content">
          {!isEditing ? (
            <div 
              className="post-text"
              dangerouslySetInnerHTML={{ 
                __html: processPostContent(post.content)
              }}
            />
          ) : (
            <div className="edit-content-section">
              <label>Nội dung *</label>
              <div className="post-edit-editor">
                <Editor
                  onInit={(evt, editor) => {
                    editEditorRef.current = editor;
                    // Set the initial content once the editor is ready
                    if (post?.content) {
                      // Small delay to ensure editor is fully initialized
                      setTimeout(() => {
                        editor.setContent(post.content);
                        // Focus the editor after setting content
                        editor.focus();
                      }, 50);
                    }
                  }}
                  scriptLoading={{ async: true, load: "domainBased" }}
                  init={getTinyMCEConfig()}
                  key={`post-editor-${isEditing}-${post._id}`}
                />
              </div>
              <div className="edit-actions">
                <button 
                  className="edit-submit-btn"
                  onClick={handleEditSubmit}
                  disabled={editPostMutation.isLoading}
                >
                  {editPostMutation.isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button 
                  className="edit-cancel-btn"
                  onClick={handleEditCancel}
                  disabled={editPostMutation.isLoading}
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="post-comments-section">
        <CommentSection
          contentId={post._id}
          contentType="forum"
          user={user}
          isAuthenticated={!!user}
          defaultSort="newest"
          enabled={true}
          commentsDisabled={commentsDisabled}
          customHeaderContent={
            /* Comments Toggle - Only visible to admin/mod */
            canToggleComments() && (
              <div className="comments-toggle-section">
                <label className="toggle-label">
                  <span className="toggle-text">Tắt bình luận</span>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={commentsDisabled}
                      onChange={handleToggleComments}
                      disabled={toggleCommentsMutation.isLoading}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </label>
              </div>
            )
          }
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && portalContainer && createPortal(
        <div className="forum-delete-modal-overlay">
          <div className="forum-delete-modal-content">
            <div className="delete-modal-header">
              <h3>Xóa bài đăng</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>

            <div className="delete-modal-body">
              <p>Bạn có chắc chắn muốn xóa bài đăng này không?</p>
              <div className="delete-reason-input-group">
                <label htmlFor="delete-reason">Lý do xóa (tùy chọn):</label>
                <textarea
                  id="delete-reason"
                  className="delete-reason-input"
                  placeholder="Nhập lý do xóa bài đăng..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="delete-modal-footer">
              <button 
                className="delete-cancel-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletePostMutation.isLoading}
              >
                Hủy bỏ
              </button>
              <button 
                className="delete-confirm-btn"
                onClick={handleDeleteWithReason}
                disabled={deletePostMutation.isLoading}
              >
                {deletePostMutation.isLoading ? 'Đang xóa...' : 'Xóa bài đăng'}
              </button>
            </div>
          </div>
        </div>,
        portalContainer
      )}
    </div>
  );
};

export default ForumPostDetail;
