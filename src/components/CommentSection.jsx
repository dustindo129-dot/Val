import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { createUniqueSlug, generateUserProfileUrl } from '../utils/slugUtils';
import cdnConfig from '../config/bunny';

// Facebook-style Like System Components
class LikeQueue {
  constructor(sendToServer) {
    this.queue = new Map(); // commentId -> { targetState, timestamp, retryCount }
    this.processing = new Set();
    this.sendToServer = sendToServer;
    this.deviceId = this.generateDeviceId();
  }

  generateDeviceId() {
    return localStorage.getItem('deviceId') || 
           (() => {
             const id = 'device_' + Math.random().toString(36).substr(2, 9);
             localStorage.setItem('deviceId', id);
             return id;
           })();
  }

  async addToQueue(commentId, currentState, userId) {
    const timestamp = Date.now();
    const targetState = !currentState;
    
    // Store intended final state with metadata
    this.queue.set(commentId, {
      targetState,
      timestamp,
      userId,
      deviceId: this.deviceId,
      retryCount: 0
    });

    // Process if not already processing
    if (!this.processing.has(commentId)) {
      await this.processQueue(commentId);
    }
  }

  async processQueue(commentId) {
    this.processing.add(commentId);

    try {
      while (this.queue.has(commentId)) {
        const queueItem = this.queue.get(commentId);
        this.queue.delete(commentId);

        try {
          // Make API call
          await this.sendToServer(commentId, queueItem);
        } catch (error) {
          // Handle retry logic
          if (queueItem.retryCount < 3 && this.isRetryableError(error)) {
            queueItem.retryCount++;
            this.queue.set(commentId, queueItem);
            
            // Exponential backoff
            await this.delay(Math.pow(2, queueItem.retryCount) * 1000);
          } else {
            throw error; // Let error recovery handle it
          }
        }
      }
    } finally {
      this.processing.delete(commentId);
    }
  }

  isRetryableError(error) {
    return error.code === 'NETWORK_ERROR' || 
           error.response?.status >= 500 ||
           error.code === 'TIMEOUT';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clear() {
    this.queue.clear();
    this.processing.clear();
  }
}

class LikeBatcher {
  constructor(flushCallback) {
    this.batch = new Map();
    this.timeout = null;
    this.flushCallback = flushCallback;
    this.batchSize = 10;
    this.batchDelay = 50; // 50ms
  }

  addToBatch(commentId, data) {
    this.batch.set(commentId, data);
    
    // Flush if batch is full
    if (this.batch.size >= this.batchSize) {
      this.flush();
      return;
    }

    // Set timeout if not already set
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.batchDelay);
    }
  }

  async flush() {
    if (this.batch.size === 0) return;

    const actions = Array.from(this.batch.entries());
    this.batch.clear();
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Send batch to callback
    await this.flushCallback(actions);
  }

  clear() {
    this.batch.clear();
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

class LikeRateLimiter {
  constructor() {
    this.actionCount = new Map();
    this.windowStart = new Map();
    this.maxActionsPerMinute = 10;
    this.windowDuration = 60000; // 1 minute
  }

  canLike(commentId) {
    const now = Date.now();
    const windowStart = this.windowStart.get(commentId) || 0;
    const count = this.actionCount.get(commentId) || 0;

    // Reset window if needed
    if (now - windowStart > this.windowDuration) {
      this.actionCount.set(commentId, 0);
      this.windowStart.set(commentId, now);
      return true;
    }

    return count < this.maxActionsPerMinute;
  }

  recordAction(commentId) {
    const count = this.actionCount.get(commentId) || 0;
    this.actionCount.set(commentId, count + 1);
  }

  clear() {
    this.actionCount.clear();
    this.windowStart.clear();
  }
}

class LikeErrorRecovery {
  constructor(updateCallback) {
    this.pendingActions = new Map();
    this.updateCallback = updateCallback;
    this.dbName = 'CommentLikes';
    this.storeName = 'pendingLikes';
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'commentId' });
        }
      };
    });
  }

  async storePendingAction(commentId, action) {
    if (!this.db) await this.initDB();
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise((resolve, reject) => {
      const request = store.put({ commentId, ...action, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.pendingActions.set(commentId, action);
    this.updateCallback(commentId, 'pending');
  }

  async removePendingAction(commentId) {
    if (!this.db) await this.initDB();
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(commentId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this.pendingActions.delete(commentId);
  }

  async retryPendingActions() {
    if (!this.db) await this.initDB();
    
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    const pendingActions = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const action of pendingActions) {
      try {
        // Retry the action
        await this.retryAction(action);
        await this.removePendingAction(action.commentId);
      } catch (error) {
        console.error('Failed to retry action:', error);
      }
    }
  }

  async retryAction(action) {
    // This will be implemented by the component
    throw new Error('retryAction must be implemented');
  }
}

class LikeConflictResolver {
  constructor() {
    this.lastActionTimestamp = new Map();
  }

  recordAction(commentId, timestamp) {
    this.lastActionTimestamp.set(commentId, timestamp);
  }

  shouldAcceptUpdate(commentId, serverTimestamp) {
    const lastAction = this.lastActionTimestamp.get(commentId);
    
    // Accept if we haven't acted on this comment or server is newer
    return !lastAction || serverTimestamp > lastAction;
  }

  clear() {
    this.lastActionTimestamp.clear();
  }
}

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
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 's', 'strike', 'del'],
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

// Helper function to get role display text and class
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

// Helper function to get all role tags for a user
const getAllRoleTags = (globalRole, novelRoles = []) => {
  const tags = [];
  
  // Add global role tag
  if (globalRole) {
    const globalTag = getRoleTag(globalRole);
    if (globalTag) {
      tags.push(globalTag);
    }
  }
  
  // Add novel-specific role tags
  if (novelRoles && novelRoles.length > 0) {
    novelRoles.forEach(role => {
      const roleTag = getRoleTag(role);
      if (roleTag && !tags.some(tag => tag.text === roleTag.text)) {
        tags.push(roleTag);
      }
    });
  }
  
  return tags;
};

const CommentSection = React.memo(({ contentId, contentType, user, isAuthenticated, defaultSort = 'newest', novel = null }) => {

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
  const [sortOrder, setSortOrder] = useState(defaultSort);
  const [pinningComments, setPinningComments] = useState(new Set());
  
  // Facebook-style like system state
  const [likeStates, setLikeStates] = useState(new Map()); // commentId -> { isLiked, count, status }
  const likeSystemRef = useRef(null);

  // Delete reason modal state
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Initialize Facebook-style like system
  useEffect(() => {
    const likeSystem = {
      queue: new LikeQueue(async (commentId, queueItem) => {
        return await sendLikeToServer(commentId, queueItem);
      }),
      
      batcher: new LikeBatcher(async (actions) => {
        await processBatchedLikes(actions);
      }),
      
      rateLimiter: new LikeRateLimiter(),
      
      errorRecovery: new LikeErrorRecovery((commentId, status) => {
        updateLikeState(commentId, { status });
      }),
      
      conflictResolver: new LikeConflictResolver()
    };

    // Implement retry action for error recovery
    likeSystem.errorRecovery.retryAction = async (action) => {
      await likeSystem.queue.addToQueue(action.commentId, !action.targetState, action.userId);
    };

    likeSystemRef.current = likeSystem;

    // Setup online/offline handlers
    const handleOnline = () => {
      likeSystem.errorRecovery.retryPendingActions();
    };

    const handleOffline = () => {
      console.log('Offline - likes will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Retry pending actions on component mount
    if (navigator.onLine) {
      likeSystem.errorRecovery.retryPendingActions();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Cleanup
      likeSystem.queue.clear();
      likeSystem.batcher.clear();
      likeSystem.rateLimiter.clear();
      likeSystem.conflictResolver.clear();
    };
  }, []);

  // Update like state helper
  const updateLikeState = useCallback((commentId, updates) => {
    setLikeStates(prev => {
      const current = prev.get(commentId) || { isLiked: false, count: 0, status: 'idle' };
      const newState = { ...current, ...updates };
      const newMap = new Map(prev);
      newMap.set(commentId, newState);
      return newMap;
    });
  }, []);

  // Send like to server
  const sendLikeToServer = async (commentId, queueItem) => {
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/comments/${commentId}/like`,
        {
          timestamp: queueItem.timestamp,
          deviceId: queueItem.deviceId
        },
        { 
          headers: getAuthHeaders(),
          timeout: 10000 // 10 second timeout
        }
      );

      const data = response.data;

      // Update state with server response
      updateLikeState(commentId, {
        isLiked: data.liked,
        count: data.likes,
        status: 'success',
        serverTimestamp: data.timestamp || Date.now()
      });

      // Remove from error recovery if it was there
      await likeSystemRef.current.errorRecovery.removePendingAction(commentId);

      return data;
    } catch (error) {
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        error.code = 'TIMEOUT';
      } else if (!navigator.onLine) {
        error.code = 'NETWORK_ERROR';
      }

      // Store for retry if it's a recoverable error
      if (likeSystemRef.current.queue.isRetryableError(error)) {
        await likeSystemRef.current.errorRecovery.storePendingAction(commentId, queueItem);
      } else {
        // Revert optimistic update for non-recoverable errors
        const currentComment = comments.find(c => c._id === commentId) || 
                             comments.find(c => c.replies?.some(r => r._id === commentId))?.replies?.find(r => r._id === commentId);
        
        updateLikeState(commentId, {
          isLiked: currentComment?.likes?.includes(user?.id || user?._id) || false,
          count: currentComment?.likes?.length || 0,
          status: 'error'
        });
      }

      throw error;
    }
  };

  // Process batched likes
  const processBatchedLikes = async (actions) => {
    // For now, process individually - could be optimized with a batch endpoint
    for (const [commentId, queueItem] of actions) {
      try {
        await likeSystemRef.current.queue.addToQueue(commentId, !queueItem.targetState, queueItem.userId);
      } catch (error) {
        console.error('Failed to process batched like:', error);
      }
    }
  };

  // Initialize like states from comments
  useEffect(() => {
    if (comments.length > 0 && user) {
      const userId = user.id || user._id;
      
      comments.forEach(comment => {
        // Initialize root comment
        if (!likeStates.has(comment._id)) {
          updateLikeState(comment._id, {
            isLiked: comment.likes?.includes(userId) || false,
            count: comment.likes?.length || 0,
            status: 'idle'
          });
        }

        // Initialize replies
        if (comment.replies) {
          comment.replies.forEach(reply => {
            if (!likeStates.has(reply._id)) {
              updateLikeState(reply._id, {
                isLiked: reply.likes?.includes(userId) || false,
                count: reply.likes?.length || 0,
                status: 'idle'
              });
            }
          });
        }
      });
    }
  }, [comments, user, likeStates, updateLikeState]);

  // Main like handler - Facebook style
  const handleLike = useCallback(async (commentId) => {
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }

    if (!user || (!user._id && !user.id)) {
      alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
      return;
    }

    if (isBanned) {
      alert('Bạn không thể thích bình luận vì đã bị chặn');
      return;
    }

    const userId = user.id || user._id;
    const likeSystem = likeSystemRef.current;

    // Check rate limit
    if (!likeSystem.rateLimiter.canLike(commentId)) {
      alert('Bạn đang thích quá nhanh. Vui lòng chờ một chút.');
      return;
    }

    // Get current state
    const currentState = likeStates.get(commentId) || { isLiked: false, count: 0 };
    
    // Record action for conflict resolution
    const timestamp = Date.now();
    likeSystem.conflictResolver.recordAction(commentId, timestamp);
    
    // Record rate limit action
    likeSystem.rateLimiter.recordAction(commentId);

    // Optimistic update
    updateLikeState(commentId, {
      isLiked: !currentState.isLiked,
      count: currentState.isLiked ? currentState.count - 1 : currentState.count + 1,
      status: 'loading'
    });

    // Add to queue
    try {
      await likeSystem.queue.addToQueue(commentId, currentState.isLiked, userId);
    } catch (error) {
      console.error('Failed to add like to queue:', error);
      
      // Revert optimistic update
      updateLikeState(commentId, {
        isLiked: currentState.isLiked,
        count: currentState.count,
        status: 'error'
      });
    }
  }, [isAuthenticated, user, isBanned, likeStates, updateLikeState]);

  // Handle real-time updates via SSE
  useEffect(() => {
    const handleRealtimeUpdate = (event) => {
      const data = event.detail;
      
      if (data.type === 'comment_like_update') {
        const { commentId, likeCount, likedBy, timestamp } = data;
        const likeSystem = likeSystemRef.current;
        
        // Check if we should accept this update (conflict resolution)
        if (likeSystem.conflictResolver.shouldAcceptUpdate(commentId, timestamp)) {
          const userId = user?.id || user?._id;
          
          updateLikeState(commentId, {
            isLiked: likedBy.includes(userId),
            count: likeCount,
            status: 'success',
            serverTimestamp: timestamp
          });
        }
      }
    };

    // Listen for real-time updates
    window.addEventListener('realtime_update', handleRealtimeUpdate);
    
    return () => {
      window.removeEventListener('realtime_update', handleRealtimeUpdate);
    };
  }, [user, updateLikeState]);

  // Image error handler for fallback
  const handleImageError = (e) => {
    const img = e.target;
    const src = img.src;
    
    // If it's already the fallback, don't try again
    if (img.dataset.fallbackAttempted) {
      img.style.display = 'none';
      return;
    }
    
    // Mark that we've attempted fallback
    img.dataset.fallbackAttempted = 'true';
    
    // If it's a Bunny.net URL with optimizer parameters, try without them
    if (src.includes('valvrareteam.b-cdn.net') && src.includes('?')) {
      const originalUrl = src.split('?')[0];
      img.src = originalUrl;
    } else {
      // As a last resort, hide the image
      img.style.display = 'none';
    }
  };
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const commentsPerPage = 10;
  const maxVisibleReplies = 2;

  // Chapter comments visibility state (only for novel detail pages)
  const [hideChapterComments, setHideChapterComments] = useState(() => {
    if (contentType === 'novels') {
      const saved = localStorage.getItem(`hideChapterComments_${contentId}`);
      return saved === 'true';
    }
    return false;
  });

  const { data: authUser } = useAuth();
  const queryClient = useQueryClient();
  const commentEditorRef = useRef(null);

  // Helper function to check if user has rich text editor privileges
  // Now all authenticated users get TinyMCE access, but image privileges are restricted
  const hasRichTextPrivileges = () => {
    if (!isAuthenticated || !user) return false;
    
    // All authenticated users now get TinyMCE editor
    return true;
  };

  // Helper function to check if user has image upload/insert privileges
  const hasImagePrivileges = () => {
    if (!isAuthenticated || !user) return false;
    
    // Admin and moderator always have image privileges
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

  // Check if current user can view deleted comments (username and content)
  const canViewDeletedComments = () => {
    if (!user) return false;
    
    // Admin and moderators can always view deleted comments
    if (user.role === 'admin' || user.role === 'moderator') {
      return true;
    }
    
    // pj_user can view deleted comments if they're assigned to this novel
    if (user.role === 'pj_user' && novel) {
      if (novel.active?.pj_user) {
        return novel.active.pj_user.some(pjUserId => {
          // Check by ID, username, or displayName for flexible matching
          return pjUserId === user._id || 
                 pjUserId === user.id ||
                 pjUserId === user.username || 
                 pjUserId === user.displayName ||
                 pjUserId.toString() === user._id?.toString() ||
                 pjUserId.toString() === user.id?.toString();
        });
      }
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

  // Memoize the image privileges check
  const globalHasImagePrivileges = React.useMemo(() => {
    return hasImagePrivileges();
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
  const getTinyMCEConfig = () => {
    // Base plugins that all users get
    const basePlugins = [
      'advlist', 'autolink', 'lists', 'link', 'charmap',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'table', 'help', 'wordcount'
    ];

    // Image-related plugins only for privileged users
    const imagePlugins = globalHasImagePrivileges ? ['image', 'media'] : [];

    // Base toolbar that all users get
    const baseToolbar = 'undo redo | formatselect | ' +
      'bold italic underline strikethrough | ' +
      'alignleft aligncenter alignright | ' +
      'bullist numlist | link';

    // Image toolbar items only for privileged users
    const imageToolbar = globalHasImagePrivileges ? ' | image' : '';

    // Complete toolbar
    const fullToolbar = baseToolbar + imageToolbar + ' | code | removeformat | help';

    // Context menu
    const baseContextMenu = 'cut copy paste | link';
    const imageContextMenu = globalHasImagePrivileges ? ' | image' : '';
    const fullContextMenu = baseContextMenu + imageContextMenu + ' | removeformat';

    // Base configuration
    const editorConfig = {
      script_src: config.tinymce.scriptPath,
      license_key: 'gpl',
      height: 200,
      menubar: false,
      remove_empty_elements: false,
      forced_root_block: 'p',
      plugins: [...basePlugins, ...imagePlugins],
      toolbar: fullToolbar,
      contextmenu: fullContextMenu,
      content_style: `
        body { font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; }
        em, i { font-style: italic; }
        strong, b { font-weight: bold; }
        s, strike, del { text-decoration: line-through; }
      `,
      skin: 'oxide',
      content_css: 'default',
      placeholder: 'Viết bình luận...',
      statusbar: false,
      resize: false,
      branding: false,
      promotion: false,
      setup: (editor) => {
        editor.on('init', () => {
          // Focus the editor after initialization
          editor.focus();
        });
      }
    };

    // Add image-related configuration only for privileged users
    if (globalHasImagePrivileges) {
      editorConfig.images_upload_handler = async (blobInfo, progress) => {
        try {
          // Convert blob to file
          const file = new File([blobInfo.blob()], blobInfo.filename(), {
            type: blobInfo.blob().type
          });
          
          // Upload to bunny.net comments folder
          const url = await bunnyUploadService.uploadFile(file, 'comments');
          
          // Return URL with comment image class
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
                const url = await bunnyUploadService.uploadFile(file, 'comments');
                
                // Return URL with comment image class
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

  // Add image error handling to existing images
  useEffect(() => {
    const handleImageErrors = () => {
      const images = document.querySelectorAll('.comments-section img[src*="valvrareteam.b-cdn.net"]');
      
      images.forEach((img, index) => {
        if (!img.dataset.errorHandlerAdded) {
          img.addEventListener('error', handleImageError);
          img.dataset.errorHandlerAdded = 'true';
        }
      });
    };

    // Run after comments are rendered
    const timer = setTimeout(handleImageErrors, 100);
    return () => clearTimeout(timer);
  }, [comments]);

  // Add global debug function (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add debugging helper to window
      window.debugCommentImages = () => {
        const images = document.querySelectorAll('.comments-section img[src*="valvrareteam.b-cdn.net"]');
        console.log('Found', images.length, 'comment images');
        
        images.forEach((img, index) => {
          console.log(`Image ${index + 1}:`, {
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            originalUrl: img.dataset.originalUrl
          });
        });
      };

      // Add specific test function for the broken image URL
      window.testImageUrl = (url) => {
        console.log('Testing image URL:', url);
        
        // Test both versions
        const originalUrl = url.split('?')[0];
        const optimizedUrl = originalUrl + '?quality=85&format=auto&optimizer=true';
        
        console.log('Original URL:', originalUrl);
        console.log('Optimized URL:', optimizedUrl);
        
        // Test original
        const testImg1 = new Image();
        testImg1.onload = () => console.log('Original URL loaded successfully');
        testImg1.onerror = () => console.error('Original URL failed to load');
        testImg1.src = originalUrl;
        
        // Test optimized
        const testImg2 = new Image();
        testImg2.onload = () => console.log('Optimized URL loaded successfully');
        testImg2.onerror = () => console.error('Optimized URL failed to load');
        testImg2.src = optimizedUrl;
      };

      // Cleanup
      return () => {
        delete window.debugCommentImages;
        delete window.testImageUrl;
      };
    }
  }, []);

  // Fetch comments (optimized to reduce refetches)
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
    staleTime: 1000 * 60 * 10, // 10 minutes - comments don't change frequently 
    cacheTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on component mount if data exists
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Disable automatic refetching
    refetchIntervalInBackground: false // Disable background refetching
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
      
      // Invalidate React Query cache to force refetch and show new comment
      await queryClient.invalidateQueries({
        queryKey: ['comments', `${contentType}-${contentId}`, sortOrder]
      });
      
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

  // Add handler for toggling chapter comments visibility
  const handleToggleChapterComments = () => {
    const newValue = !hideChapterComments;
    setHideChapterComments(newValue);
    localStorage.setItem(`hideChapterComments_${contentId}`, newValue.toString());
    // Reset to first page when toggling visibility
    setCurrentPage(1);
  };

  // Handle comment deletion
  const handleDelete = async (commentId, isReply = false, parentCommentId = null, reason = '') => {
    if (!isAuthenticated || deleting) return;
    
    if (!user || (!user._id && !user.id)) {
      alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
      return;
    }
    
    setDeleting(true);
    
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/comments/${commentId}`,
        { 
          headers: getAuthHeaders(),
          data: { reason } // Send reason in request body
        }
      );
      
      // Invalidate React Query cache to force refetch and show updated data
      await queryClient.invalidateQueries({
        queryKey: ['comments', `${contentType}-${contentId}`, sortOrder]
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Không thể xóa bình luận. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  // Handle delete with reason modal for admin/moderator
  const handleDeleteWithReason = (commentId, isReply = false, parentCommentId = null, targetComment = null) => {
    if (!isAuthenticated || deleting) return;
    
    if (!user || (!user._id && !user.id)) {
      alert('Thông tin người dùng bị thiếu. Vui lòng đăng nhập lại.');
      return;
    }

    // Check if user is admin or moderator
    const isModAction = user.role === 'admin' || user.role === 'moderator';

    const isOwnComment = comment => {
      return comment.user.username === user.username || 
             comment.user.id === user.id || 
             comment.user._id === user._id ||
             comment.user.displayName === user.displayName;
    };
    
    // Use the passed comment object instead of searching for it
    if (!targetComment) return;

    // If it's a mod action on someone else's comment, show the reason modal
    const shouldShowModal = isModAction && !isOwnComment(targetComment);

    if (shouldShowModal) {
      setCommentToDelete({ commentId, isReply, parentCommentId });
      setShowDeleteReasonModal(true);
    } else {
      // For own comments or regular user deletion, show confirmation
      if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) {
        return;
      }
      handleDelete(commentId, isReply, parentCommentId);
    }
  };

  // Handle delete reason modal submit
  const handleDeleteReasonSubmit = async () => {
    if (!commentToDelete) return;
    
    setShowDeleteReasonModal(false);
    await handleDelete(
      commentToDelete.commentId, 
      commentToDelete.isReply, 
      commentToDelete.parentCommentId,
      deleteReason
    );
    
    // Reset modal state
    setCommentToDelete(null);
    setDeleteReason('');
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
      return `${minutes} phút`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} giờ`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ngày`;
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

      // Invalidate React Query cache to force refetch and show updated data
      await queryClient.invalidateQueries({
        queryKey: ['comments', `${contentType}-${contentId}`, sortOrder]
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
        
        // Convert line breaks to <br> tags while preserving multiple consecutive breaks
        // First, normalize line endings
        processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Convert multiple consecutive newlines to multiple <br> tags
        // This preserves the spacing that users create with multiple Enter presses
        processedContent = processedContent.replace(/\n{3,}/g, (match) => {
          // Convert 3+ consecutive newlines to that many <br> tags
          return '<br>'.repeat(match.length);
        });
        
        // Convert double newlines to double <br> (paragraph-like spacing)
        processedContent = processedContent.replace(/\n{2}/g, '<br><br>');
        
        // Convert single newlines to single <br>
        processedContent = processedContent.replace(/\n/g, '<br>');
        
        // Store existing HTML tags to avoid processing their contents
        const htmlTags = [];
        let tempContent = processedContent;
        
        // First extract all existing HTML tags
        tempContent = tempContent.replace(/<[^>]+>/g, (match) => {
          const placeholder = `__HTML_TAG_${htmlTags.length}__`;
          htmlTags.push(match);
          return placeholder;
        });
        
        // Now process URLs in the remaining text
        // Handle URLs that are not already in anchor tags
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
        console.error('Error processing comment content:', error);
        return content;
      }
    };

    // Check if comment content needs truncation (more than 4 lines or has natural break points)
    const checkIfNeedsTruncation = (content) => {
      if (!content) return false;
      
      const processedContent = processCommentContent(content);
      
      // Check for natural break points (3+ consecutive <br> tags which indicate intentional spacing)
      const hasNaturalBreaks = processedContent.includes('<br><br><br>');
      if (hasNaturalBreaks) return true;
      
      // Create a temporary element to measure content height
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedContent;
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

    // Get truncated content for preview
    const getTruncatedContent = (content) => {
      if (!content) return '';
      
      const processedContent = processCommentContent(content);
      
      // If there are natural break points (3+ consecutive <br>), truncate at the first one
      const naturalBreakIndex = processedContent.indexOf('<br><br><br>');
      if (naturalBreakIndex !== -1) {
        return processedContent.substring(0, naturalBreakIndex);
      }
      
      // Otherwise, use height-based truncation
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedContent;
      tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: 400px;
        font-size: 14px;
        line-height: 1.5;
        font-family: inherit;
        max-height: 84px;
        overflow: hidden;
      `;
      document.body.appendChild(tempDiv);
      
      const truncatedHTML = tempDiv.innerHTML;
      document.body.removeChild(tempDiv);
      
      return truncatedHTML;
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
        
        // Invalidate React Query cache to force refetch and show updated data
        await queryClient.invalidateQueries({
          queryKey: ['comments', `${contentType}-${contentId}`, sortOrder]
        });
        
        // Clear the reply form
        if (globalHasRichTextPrivileges && replyEditorRef.current) {
          replyEditorRef.current.setContent('');
        } else {
          setReplyText('');
        }
        setIsReplying(false);
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
        
        // Invalidate React Query cache to force refetch and show updated data
        await queryClient.invalidateQueries({
          queryKey: ['comments', `${contentType}-${contentId}`, sortOrder]
        });
        
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
    
    // Check if the current user has liked this comment using the new like system
    const likeState = likeStates.get(comment._id) || { isLiked: false, count: 0, status: 'idle' };
    const isLikedByCurrentUser = likeState.isLiked;

    // Check if user can pin comments
    // For novel detail pages: only novel-level comments can be pinned
    // For chapter pages: chapter comments can be pinned
    const canPinComments = isAuthenticated && user && (
      user.role === 'admin' || 
      user.role === 'moderator' || 
      (user.role === 'pj_user' && novel?.active?.pj_user && 
        novel.active.pj_user.some(pjUser => {
          // Handle case where pjUser is an object (new format)
          if (typeof pjUser === 'object' && pjUser !== null) {
            return (
              pjUser._id === user.id ||
              pjUser._id === user._id ||
              pjUser.username === user.username ||
              pjUser.displayName === user.displayName ||
              pjUser.userNumber === user.userNumber
            );
          }
          // Handle case where pjUser is a primitive value (old format)
          return (
            pjUser === user.id ||
            pjUser === user._id ||
            pjUser === user.username ||
            pjUser === user.displayName ||
            pjUser === user.userNumber
          );
        })
      )
    );



    // Determine if this specific comment can be pinned based on context
    const canPinThisComment = canPinComments && (
      (contentType === 'novels' && comment.contentType === 'novels') || // Novel page: only novel comments
      (contentType === 'chapters' && comment.contentType === 'chapters') // Chapter page: only chapter comments
    );


    
    return (
      <div className="comment-item">
        <div className="comment-main">
          <div className="comment-avatar">
            {comment.user.avatar ? (
              <img src={cdnConfig.getAvatarUrl(comment.user.avatar)} alt={comment.user.displayName || comment.user.username} />
            ) : (
              <div className="default-avatar">
                {(comment.user.displayName || comment.user.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={`comment-content ${comment.isPinned && (
            (contentType === 'novels' && comment.contentType === 'novels') || 
            (contentType === 'chapters' && comment.contentType === 'chapters')
          ) ? 'pinned-comment' : ''}`}>
          <div className="comment-header">
            <div className="comment-user-info">
              <div className="comment-user-line">
                {comment.isDeleted && !comment.adminDeleted ? (
                  canViewDeletedComments() ? (
                    <Link 
                      to={generateUserProfileUrl(comment.user)} 
                      className="comment-username-link"
                    >
                      <span className="comment-username deleted-user">
                        {comment.user.displayName || comment.user.username}
                        {getAllRoleTags(comment.user.role, comment.user.novelRoles).map((roleTag, index) => (
                          <span key={index} className={roleTag.className}>
                            {roleTag.text}
                          </span>
                        ))}
                        {comment.isPinned && (
                          (contentType === 'novels' && comment.contentType === 'novels') || 
                          (contentType === 'chapters' && comment.contentType === 'chapters')
                        ) && <span className="pinned-indicator">📌</span>}
                      </span>
                    </Link>
                  ) : (
                    <span className="comment-username deleted-user">[đã xóa]</span>
                  )
                ) : (
                  <Link 
                    to={generateUserProfileUrl(comment.user)} 
                    className="comment-username-link"
                  >
                    <span className="comment-username">
                      {comment.user.displayName || comment.user.username}
                      {getAllRoleTags(comment.user.role, comment.user.novelRoles).map((roleTag, index) => (
                        <span key={index} className={roleTag.className}>
                          {roleTag.text}
                        </span>
                      ))}
                      {comment.isPinned && (
                        (contentType === 'novels' && comment.contentType === 'novels') || 
                        (contentType === 'chapters' && comment.contentType === 'chapters')
                      ) && <span className="pinned-indicator">📌</span>}
                    </span>
                  </Link>
                )}
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
            {isAuthenticated && user && !(comment.isDeleted && !comment.adminDeleted) && (
              // Show dropdown if:
              // 1. It's the user's own comment OR
              // 2. User can pin the comment OR
              // 3. It's someone else's comment (for blocking)
              (comment.user.username === user.username || 
               comment.user.id === user.id || 
               comment.user._id === user._id ||
               comment.user.displayName === user.displayName ||
               canPinThisComment ||
               comment.user.username !== user.username)) && (
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
                    {canPinThisComment && (
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
                    {(comment.user.username === user.username || 
                       comment.user.id === user.id || 
                       comment.user._id === user._id ||
                       comment.user.displayName === user.displayName) && (
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
                    {(comment.user.username === user.username || 
                      comment.user.id === user.id || 
                      comment.user._id === user._id ||
                      comment.user.displayName === user.displayName ||
                      user.role === 'admin' ||
                      user.role === 'moderator') && (
                      <button
                        className="comment-dropdown-item"
                        onClick={() => {
                          handleDeleteWithReason(comment._id, level > 0, comment.parentId, comment);
                          setShowDropdown(false);
                        }}
                        disabled={deleting}
                      >
                        🗑️ {deleting ? 'Đang xóa...' : 'Xóa'}
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
              {comment.isDeleted && !comment.adminDeleted ? (
                canViewDeletedComments() ? (
                  <div 
                    className={`comment-content-wrapper deleted-comment-placeholder ${needsTruncation && !isExpanded ? 'truncated' : ''}`}
                    dangerouslySetInnerHTML={{ 
                      __html: needsTruncation && !isExpanded 
                        ? getTruncatedContent(decodeHTMLEntities(comment.text))
                        : processCommentContent(decodeHTMLEntities(comment.text))
                    }} 
                  />
                ) : (
                  <div className="deleted-comment-placeholder">
                    <em>[bình luận đã bị xóa]</em>
                  </div>
                )
              ) : (
                <div 
                  className={`comment-content-wrapper ${needsTruncation && !isExpanded ? 'truncated' : ''}`}
                  dangerouslySetInnerHTML={{ 
                    __html: needsTruncation && !isExpanded 
                      ? getTruncatedContent(decodeHTMLEntities(comment.text))
                      : processCommentContent(decodeHTMLEntities(comment.text))
                  }} 
                />
              )}
              {needsTruncation && !(comment.isDeleted && !canViewDeletedComments()) && (
                <button 
                  className="see-more-btn"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                </button>
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
                      menubar: false,
                      // Override image upload handler for edit mode (only for privileged users)
                      ...(globalHasImagePrivileges && {
                        images_upload_handler: async (blobInfo, progress) => {
                          try {
                            const file = new File([blobInfo.blob()], blobInfo.filename(), {
                              type: blobInfo.blob().type
                            });
                            
                            const url = await bunnyUploadService.uploadFile(file, 'comments');
                            
                            // Return optimizer-compatible URL
                            const optimizedUrl = cdnConfig.getOptimizedImageUrl(url.replace(cdnConfig.bunnyBaseUrl, ''), {
                              quality: 85,
                              format: 'auto',
                              optimizer: true
                            });
                            
                            return optimizedUrl;
                          } catch (error) {
                            console.error('Error uploading image:', error);
                            throw new Error('Failed to upload image');
                          }
                        }
                      })
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
              {comment.isDeleted && !comment.adminDeleted ? (
                // For deleted comments, only show time and disabled reply button to maintain thread structure
                <>
                  <span className="comment-time action-time">{formatRelativeTime(comment.createdAt)}</span>
                  <button 
                    className="reply-button"
                    onClick={handleReplyClick}
                    disabled={true}
                    title="Không thể trả lời bình luận đã xóa"
                  >
                    Trả lời
                  </button>
                  {canViewDeletedComments() && (
                    <span className="edited-indicator">(đã xóa)</span>
                  )}
                  {comment.isEdited && (
                    <span className="edited-indicator">(đã chỉnh sửa)</span>
                  )}
                </>
              ) : (
                <>
                  <span className="comment-time action-time">{formatRelativeTime(comment.createdAt)}</span>
                  <button 
                    className={`like-button ${isLikedByCurrentUser ? 'liked' : ''} ${likeState.status === 'pending' ? 'pending' : ''} ${likeState.status === 'error' ? 'error' : ''}`}
                    onClick={() => handleLike(comment._id)}
                    disabled={likeState.status === 'loading'}
                  >
                    <span className="like-icon comment-like-icon">
                      {likeState.status === 'loading' ? '⏳' : 
                       likeState.status === 'pending' ? '⏸️' :
                       likeState.status === 'error' ? '❌' :
                       <i className={`fa-solid fa-thumbs-up ${isLikedByCurrentUser ? 'liked' : ''}`}></i>}
                    </span>
                    <span className="like-count">{likeState.count}</span>
                  </button>
                  <button 
                    className="reply-button"
                    onClick={handleReplyClick}
                  >
                    Trả lời
                  </button>
                  {comment.isEdited && (
                    <span className="edited-indicator">(đã chỉnh sửa)</span>
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
                        placeholder: 'Viết trả lời...',
                        // Override image upload handler for reply mode (only for privileged users)
                        ...(globalHasImagePrivileges && {
                          images_upload_handler: async (blobInfo, progress) => {
                            try {
                              const file = new File([blobInfo.blob()], blobInfo.filename(), {
                                type: blobInfo.blob().type
                              });
                              
                              const url = await bunnyUploadService.uploadFile(file, 'comments');
                              
                              // Return optimizer-compatible URL
                              const optimizedUrl = cdnConfig.getOptimizedImageUrl(url.replace(cdnConfig.bunnyBaseUrl, ''), {
                                quality: 85,
                                format: 'auto',
                                optimizer: true
                              });
                              
                              return optimizedUrl;
                            } catch (error) {
                              console.error('Error uploading image:', error);
                              throw new Error('Failed to upload image');
                            }
                          }
                        })
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

  // Filter comments based on chapter visibility setting
  const filteredComments = useMemo(() => {
    if (contentType === 'novels' && hideChapterComments) {
      // Only show comments that are not from chapters (i.e., novel-level comments)
      return comments.filter(comment => comment.contentType !== 'chapters');
    }
    return comments;
  }, [comments, contentType, hideChapterComments]);

  // Pagination calculations using filtered comments
  const totalComments = filteredComments.length;
  const totalPages = Math.ceil(totalComments / commentsPerPage);
  const startIndex = (currentPage - 1) * commentsPerPage;
  const endIndex = startIndex + commentsPerPage;
  const currentComments = filteredComments.slice(startIndex, endIndex);

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
      <div className="comments-header">
        <h3 className="comments-title">Bình luận ({totalComments})</h3>
        
        {/* Chapter comments toggle - only show on novel detail pages */}
        {contentType === 'novels' && (
          <button 
            className={`chapter-comments-toggle-btn ${hideChapterComments ? 'active' : ''}`}
            onClick={handleToggleChapterComments}
            title={hideChapterComments ? 'Hiện bình luận trong chương' : 'Ẩn bình luận trong chương'}
          >
            <i className={`fas ${hideChapterComments ? 'fa-eye' : 'fa-eye-slash'}`}></i>
            {hideChapterComments ? 'Hiện bình luận trong chương' : 'Ẩn bình luận trong chương'}
          </button>
        )}
      </div>
      
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
            <div className="comment-pagination-controls">
              <div className="comment-pagination-info">
                Trang {currentPage} / {totalPages} ({totalComments} bình luận)
              </div>
              
              <div className="comment-pagination-buttons">
                {/* Page numbers */}
                <div className="comment-page-numbers">
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
                        className={`comment-page-number-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                {/* Navigation buttons */}
                <div className="comment-pagination-nav-buttons">
                  <button 
                    className="comment-pagination-btn prev-btn"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    ← Trước
                  </button>
                  
                  <button 
                    className="comment-pagination-btn next-btn"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Sau →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-comments">
          <p>Chưa có bình luận. Hãy là người đầu tiên bình luận!</p>
        </div>
      )}

      {/* Delete reason modal */}
      {showDeleteReasonModal && (
        <div className="delete-reason-modal">
          <div className="delete-reason-content">
            <h3>Xóa bình luận</h3>
            <p>Bạn có chắc chắn muốn xóa bình luận này không?</p>
            <div className="delete-reason-input-group">
              <label htmlFor="delete-reason">Lý do xóa (tùy chọn):</label>
              <textarea
                id="delete-reason"
                className="delete-reason-input"
                placeholder="Nhập lý do xóa bình luận..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="delete-reason-actions">
              <button onClick={handleDeleteReasonSubmit} className="delete-confirm-btn">
                Xóa bình luận
              </button>
              <button onClick={() => {
                setShowDeleteReasonModal(false);
                setCommentToDelete(null);
                setDeleteReason('');
              }} className="delete-cancel-btn">
                Hủy bỏ
              </button>
            </div>
          </div>
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
});

export default CommentSection;