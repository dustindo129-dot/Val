import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import '../styles/pages/Forum.css';
import { Editor } from '@tinymce/tinymce-react';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import bunnyUploadService from '../services/bunnyUploadService';
import DOMPurify from 'dompurify';
import LoadingSpinner from '../components/LoadingSpinner';
import { getAuthHeaders } from '../utils/auth';
import { generateUserProfileUrl } from '../utils/slugUtils';
import axios from 'axios';

const Forum = () => {
  const { user, isAuthenticated } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const editorRef = useRef(null);
  const queryClient = useQueryClient();
  const postsPerPage = 10;

  // Dropdown management
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [pinningPosts, setPinningPosts] = useState(new Set());

  // Portal container for modal
  const [portalContainer, setPortalContainer] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [postToDelete, setPostToDelete] = useState(null);

  // Everyone can see the create button (authentication handled in modal)
  const canCreatePosts = () => {
    return true; // Show button to everyone
  };

  // Check if user can post immediately (admin/moderator)
  const canPostImmediately = () => {
    return isAuthenticated && user && (user.role === 'admin' || user.role === 'moderator');
  };

  // Check if user can manage posts (pin/delete - admin/moderator only)
  const canManagePosts = () => {
    return isAuthenticated && user && (user.role === 'admin' || user.role === 'moderator');
  };

  // Fetch forum posts
  const { data: postsResponse, isLoading: postsLoading, error: postsError } = useQuery({
    queryKey: ['forumPosts', currentPage],
    queryFn: async () => {
      const response = await axios.get(`${config.backendUrl}/api/forum/posts`, {
        params: {
          page: currentPage,
          limit: postsPerPage
        }
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      const response = await axios.post(
        `${config.backendUrl}/api/forum/posts`,
        postData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Reset form and close modal
      setPostTitle('');
      if (editorRef.current) {
        editorRef.current.setContent('');
      }
      setShowCreateModal(false);
      
      // Show appropriate success message
      if (data.isPending) {
        alert('Bài đăng của bạn đã được gửi và đang chờ duyệt từ quản trị viên.');
      } else {
        alert('Bài đăng đã được tạo thành công!');
        // Only invalidate and refetch if post was approved immediately
        queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
        // Reset to first page to see the new post
        setCurrentPage(1);
      }
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      alert(error.response?.data?.message || 'Không thể tạo bài đăng. Vui lòng thử lại.');
    }
  });

  const posts = postsResponse?.posts || [];
  const paginationData = postsResponse?.pagination || null;

  // Pin/Unpin post handler
  const handlePin = async (postSlug, postId, currentPinStatus) => {
    if (!canManagePosts()) {
      alert('Bạn không có quyền thực hiện hành động này');
      return;
    }

    // Prevent multiple simultaneous pin operations on the same post
    if (pinningPosts.has(postId)) {
      return;
    }

    try {
      // Add post to loading state
      setPinningPosts(prev => new Set([...prev, postId]));

      const response = await axios.post(
        `${config.backendUrl}/api/forum/posts/${postSlug}/pin`,
        {},
        { headers: getAuthHeaders() }
      );

      // Invalidate and refetch posts to show updated state
      queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
      
    } catch (error) {
      console.error('Error pinning post:', error);
      alert(`Không thể ${currentPinStatus ? 'bỏ ghim' : 'ghim'} bài đăng: ${error.response?.data?.message || error.message}`);
    } finally {
      // Remove post from loading state
      setPinningPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  // Delete post handler
  const handleDeletePost = async (postSlug, post) => {
    // Check if user can delete this post (admin/mod OR post author)
    const canDelete = canManagePosts() || (user && post && (
      post.author?._id === user._id || 
      post.author?.id === user._id || 
      post.author?.username === user.username ||
      post.author?.displayName === user.displayName
    ));

    if (!canDelete) {
      alert('Bạn không có quyền xóa bài đăng');
      return;
    }

    const isModAction = user.role === 'admin' || user.role === 'moderator';
    const isOwnPost = post.author?._id === user._id || 
                      post.author?.id === user._id || 
                      post.author?.username === user.username ||
                      post.author?.displayName === user.displayName;

    // If it's a mod action on someone else's post, show the reason modal
    if (isModAction && !isOwnPost) {
      setPostToDelete({ slug: postSlug, post });
      setShowDeleteModal(true);
    } else {
      // For own posts, show simple confirmation
      if (window.confirm('Bạn có chắc chắn muốn xóa bài đăng này không? Hành động này không thể hoàn tác.')) {
        await executeDeletePost(postSlug, '');
      }
    }
  };

  // Execute the actual delete
  const executeDeletePost = async (postSlug, reason) => {
    try {
      await axios.delete(
        `${config.backendUrl}/api/forum/posts/${postSlug}`,
        { 
          headers: getAuthHeaders(),
          data: { reason }
        }
      );

      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
      
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(`Không thể xóa bài đăng: ${error.response?.data?.message || error.message}`);
    }
  };

  // Handle delete with reason submission
  const handleDeleteWithReason = async () => {
    if (!postToDelete) return;
    
    setShowDeleteModal(false);
    await executeDeletePost(postToDelete.slug, deleteReason.trim());
    
    // Reset modal state
    setPostToDelete(null);
    setDeleteReason('');
  };

  // Create portal container for modals
  useEffect(() => {
    let container = document.getElementById('forum-modal-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'forum-modal-portal';
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
      if (container && container.parentNode && !showCreateModal && !showDeleteModal) {
        const existingModals = container.children.length;
        if (existingModals === 0) {
          container.parentNode.removeChild(container);
        }
      }
    };
  }, [showCreateModal, showDeleteModal]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showCreateModal || showDeleteModal) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('forum-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'auto';
      }
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('forum-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('forum-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    };
  }, [showCreateModal, showDeleteModal, portalContainer]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.post-dropdown')) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);

  // Check if user has rich text editor privileges (same as comment system)
  const hasRichTextPrivileges = () => {
    if (!isAuthenticated || !user) return false;
    return true; // All authenticated users get TinyMCE access
  };

  // Check if user has image upload privileges
  const hasImagePrivileges = () => {
    if (!isAuthenticated || !user) return false;
    return user.role === 'admin' || user.role === 'moderator';
  };

  // TinyMCE configuration (similar to comment system)
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
      placeholder: 'Viết nội dung bài đăng...',
      statusbar: false,
      resize: false,
      branding: false,
      promotion: false
    };

    // Add image-related configuration for privileged users
    if (hasImagePrivileges()) {
      editorConfig.images_upload_handler = async (blobInfo, progress) => {
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
      editorConfig.file_picker_callback = (callback, value, meta) => {
        if (meta.filetype === 'image') {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          
          input.onchange = async function() {
            const file = this.files[0];
            if (file) {
              try {
                const url = await bunnyUploadService.uploadFile(file, 'forums');
                const optimizedUrl = cdnConfig.getOptimizedImageUrl(url.replace(cdnConfig.bunnyBaseUrl, ''), cdnConfig.imageClasses.commentImg);
                callback(optimizedUrl, { alt: file.name });
              } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload image');
              }
            }
          };
          
          input.click();
        }
      };
    }

    return editorConfig;
  };

  // Sanitize HTML content
  const sanitizeHTML = (content) => {
    if (!content) return '';
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 's', 'strike', 'del'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height']
    });
  };

  // Handle create post button click
  const handleCreatePostClick = () => {
    if (!isAuthenticated) {
      // Trigger the login modal instead of just showing an alert
      window.dispatchEvent(new Event('openLoginModal'));
      return;
    }
    setShowCreateModal(true);
  };

  // Handle post creation
  const handleCreatePost = async () => {
    if (!postTitle.trim()) {
      alert('Vui lòng nhập tiêu đề');
      return;
    }

    const content = editorRef.current ? editorRef.current.getContent() : '';
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung');
      return;
    }

    createPostMutation.mutate({
      title: postTitle.trim(),
      content: sanitizeHTML(content)
    });
  };

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

  return (
    <div className="forum-page">
      <div className="forum-header">
        <h1 className="forum-title">Thảo luận</h1>
        {canCreatePosts() && (
          <button 
            className="create-post-btn"
            onClick={handleCreatePostClick}
          >
            <i className="fas fa-plus"></i>
            Thêm
          </button>
        )}
      </div>

      <div className="forum-content">
        {postsLoading ? (
          <div className="forum-loading">
            <LoadingSpinner size="medium" text="Đang tải bài đăng..." />
          </div>
        ) : postsError ? (
          <div className="forum-error">
            <p>Không thể tải bài đăng: {postsError.message}</p>
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post._id} className={`post-item ${post.isPinned ? 'pinned' : ''}`}>
                  <div className="post-header">
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
                          {post.isPinned && <span className="pinned-indicator">📌</span>}
                          {post.commentsDisabled && <span className="locked-indicator" title="Bình luận đã bị tắt">🔒</span>}
                        </Link>
                        <div className="post-meta">
                          <span className="post-date">{formatDate(post.createdAt)}</span>
                          <span className="post-stats">
                            👁️ {post.views} • 💬 {post.commentCount}
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
                    
                    {/* Post Management Dropdown */}
                    {isAuthenticated && user && (
                      canManagePosts() || 
                      post.author?._id === user._id || 
                      post.author?.id === user._id || 
                      post.author?.username === user.username ||
                      post.author?.displayName === user.displayName
                    ) && (
                      <div className="post-dropdown">
                        <button
                          className="post-dropdown-trigger"
                          onClick={() => setActiveDropdown(activeDropdown === post._id ? null : post._id)}
                          title="Tùy chọn"
                        >
                          ⋯
                        </button>
                        {activeDropdown === post._id && (
                          <div className="post-dropdown-menu">
                            {/* Pin option - only for admin/moderators */}
                            {canManagePosts() && (
                              <button
                                className="post-dropdown-item"
                                onClick={() => {
                                  handlePin(post.slug, post._id, post.isPinned);
                                  setActiveDropdown(null);
                                }}
                                disabled={pinningPosts.has(post._id)}
                              >
                                {pinningPosts.has(post._id) ? '⏳' : '📌'} {post.isPinned ? 'Bỏ ghim' : 'Ghim bài đăng'}
                              </button>
                            )}
                            
                            {/* Edit option - for post author, admin, or moderator */}
                            {(post.author?._id === user._id || 
                              post.author?.id === user._id || 
                              post.author?.username === user.username ||
                              post.author?.displayName === user.displayName ||
                              canManagePosts()) && (
                              <button
                                className="post-dropdown-item"
                                onClick={() => {
                                  // Navigate to edit page or implement edit functionality
                                  window.location.href = `/thao-luan/${post.slug}`;
                                  setActiveDropdown(null);
                                }}
                              >
                                ✏️ Chỉnh sửa
                              </button>
                            )}
                            
                            {/* Delete option - for post author, admin, or moderator */}
                            {(post.author?._id === user._id || 
                              post.author?.id === user._id || 
                              post.author?.username === user.username ||
                              post.author?.displayName === user.displayName ||
                              canManagePosts()) && (
                              <button
                                className="post-dropdown-item delete-item"
                                onClick={() => {
                                  handleDeletePost(post.slug, post);
                                  setActiveDropdown(null);
                                }}
                              >
                                🗑️ Xóa bài đăng
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="post-content">
                    <Link to={`/thao-luan/${post.slug}`} className="post-title-link">
                      <h2 className="post-title">{post.title}</h2>
                    </Link>
                    <div 
                      className="post-preview"
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(
                          post.content.substring(0, 300) + (post.content.length > 300 ? '...' : '')
                        )
                      }}
                    />
                    <Link to={`/thao-luan/${post.slug}`} className="read-more-link">
                      Đọc thêm →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {paginationData && paginationData.totalPages > 1 && (
              <div className="forum-pagination">
                <div className="pagination-info">
                  Trang {paginationData.currentPage} / {paginationData.totalPages} 
                  ({paginationData.totalPosts} bài đăng)
                </div>
                <div className="pagination-buttons">
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!paginationData.hasPrev}
                  >
                    ← Trước
                  </button>
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!paginationData.hasNext}
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="no-posts">
            <p>Chưa có bài đăng nào. Hãy tạo bài đăng đầu tiên!</p>
          </div>
        )}
      </div>

      {/* Create Post Modal with Portal */}
      {showCreateModal && portalContainer && createPortal(
        <div className="forum-modal-overlay">
          <div className="forum-modal-content">
            <div className="modal-header">
              <h3>Tạo bài đăng mới</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="post-title">Tiêu đề *</label>
                <input
                  id="post-title"
                  type="text"
                  className="post-title-input"
                  placeholder="Nhập tiêu đề bài đăng..."
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  maxLength={200}
                />
                <div className="character-count">
                  {postTitle.length}/200
                </div>
              </div>

              <div className="form-group">
                <label>Nội dung *</label>
                {hasRichTextPrivileges() ? (
                  <div className="post-editor">
                    <Editor
                      onInit={(evt, editor) => editorRef.current = editor}
                      scriptLoading={{ async: true, load: "domainBased" }}
                      init={getTinyMCEConfig()}
                    />
                  </div>
                ) : (
                  <textarea
                    className="post-content-input"
                    placeholder="Viết nội dung bài đăng..."
                    rows={10}
                  />
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="modal-cancel-btn"
                onClick={() => setShowCreateModal(false)}
                disabled={createPostMutation.isLoading}
              >
                Hủy bỏ
              </button>
              <button 
                className="modal-submit-btn"
                onClick={handleCreatePost}
                disabled={createPostMutation.isLoading}
              >
                {createPostMutation.isLoading ? 'Đang tạo...' : 'Tạo bài đăng'}
              </button>
            </div>
          </div>
        </div>,
        portalContainer
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && portalContainer && createPortal(
        <div className="forum-modal-overlay">
          <div className="forum-modal-content">
            <div className="modal-header">
              <h3>Xóa bài đăng</h3>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPostToDelete(null);
                  setDeleteReason('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <p>Bạn có chắc chắn muốn xóa bài đăng này không?</p>
              <div className="form-group">
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

            <div className="modal-footer">
              <button 
                className="modal-cancel-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPostToDelete(null);
                  setDeleteReason('');
                }}
              >
                Hủy bỏ
              </button>
              <button 
                className="modal-submit-btn delete-confirm"
                onClick={handleDeleteWithReason}
              >
                Xóa bài đăng
              </button>
            </div>
          </div>
        </div>,
        portalContainer
      )}
    </div>
  );
};

export default Forum;
