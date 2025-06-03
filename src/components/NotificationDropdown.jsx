/**
 * NotificationDropdown Component
 * 
 * Dropdown component for displaying user notifications including:
 * - Report feedback notifications
 * - Comment reply notifications  
 * - New chapter notifications for bookmarked novels
 * 
 * Features:
 * - Infinite scroll: loads 20 notifications initially, then 10 more at a time
 * - Real-time updates via SSE
 * - Mark as read/delete functionality
 * - Links to relevant content
 * 
 * INFINITE SCROLL IMPLEMENTATION:
 * - Uses page-based pagination on backend (page 1: 20 items, page 2+: 10 items)
 * - Frontend merges all pages into single array for seamless UX
 * - Scroll detection triggers new page loads when near bottom
 * - Alternative approaches: offset-based (?skip=20&limit=10) or cursor-based (?after=timestamp)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import '../styles/NotificationDropdown.css';
import { createUniqueSlug } from '../utils/slugUtils';
import LoadingSpinner from './LoadingSpinner';
import sseService from '../services/sseService';

/**
 * NotificationDropdown Component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dropdown is open
 * @param {Function} props.onClose - Function to close the dropdown
 * @param {Object} props.user - Current user object
 */
const NotificationDropdown = ({ isOpen, onClose, user }) => {
  const dropdownRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const initializedRef = useRef(false); // Track if we've loaded notifications for this session
  const [allNotifications, setAllNotifications] = useState([]);
  const [lastFetchedPage, setLastFetchedPage] = useState(0); // Track last successfully fetched page
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false); // Track when we've truly loaded everything

  // Fetch notifications with infinite scroll logic
  const { data: notificationsData, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      // Prevent fetching the same page multiple times
      if (page <= lastFetchedPage && page > 1) {
        return null;
      }
      
      // For initial load (page 1), get 20 notifications
      // For subsequent loads, get 10 notifications
      const limit = page === 1 ? 20 : 10;
      const response = await api.getNotifications(page, limit);
      
      return response;
    },
    enabled: !!user && page > 0 && page > lastFetchedPage && isOpen, // Only fetch when dropdown is open
    staleTime: 1000 * 60 * 2, // 2 minutes - don't refetch if data is less than 2 minutes old
    cacheTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch when reconnecting
    keepPreviousData: false,
  });

  // Update allNotifications when new data comes in
  useEffect(() => {
    // Only process when we have actual data (not undefined while loading)
    if (notificationsData !== undefined) {
      if (notificationsData?.notifications) {
        const newNotifications = notificationsData.notifications;
        
        // Update last fetched page
        setLastFetchedPage(page);
        
        if (page === 1) {
          // Reset for first page - but only if we don't already have the same data
          setAllNotifications(current => {
            // Check if this is the same data we already have
            if (current.length === newNotifications.length && 
                current.length > 0 && 
                current[0]._id === newNotifications[0]._id) {
              return current;
            }
            
            // Update hasMore for first page
            const totalItems = notificationsData.pagination?.totalItems || 0;
            const hasMoreData = newNotifications.length < totalItems;
            setHasMore(hasMoreData);
            
            // Set isAllDataLoaded if we loaded everything on first page
            if (newNotifications.length >= totalItems) {
              setIsAllDataLoaded(true);
            } else {
              setIsAllDataLoaded(false);
            }
            
            return newNotifications;
          });
        } else {
          // Append for subsequent pages
          setAllNotifications(prev => {
            // Check if we already have these notifications to prevent duplicates
            const newUniqueNotifications = newNotifications.filter(
              newNotif => !prev.some(existing => existing._id === newNotif._id)
            );
            
            if (newUniqueNotifications.length === 0) {
              // If no new notifications, we've reached the end
              setHasMore(false);
              return prev;
            }
            
            const updatedList = [...prev, ...newUniqueNotifications];
            
            // Update hasMore based on the updated list length and total items
            const totalItems = notificationsData.pagination?.totalItems || 0;
            const hasMoreData = updatedList.length < totalItems;
            setHasMore(hasMoreData);
            
            // Set isAllDataLoaded only when we've loaded everything
            if (updatedList.length >= totalItems) {
              setIsAllDataLoaded(true);
            }
            
            setIsLoadingMore(false);
            
            return updatedList;
          });
        }
        
        setIsLoadingMore(false);
      } else if (notificationsData && Array.isArray(notificationsData.notifications) && notificationsData.notifications.length === 0) {
        // Handle case where response has empty notifications array
        setLastFetchedPage(page); // Still mark as fetched even if empty
        if (page === 1) {
          setAllNotifications([]);
        }
        setHasMore(false);
        setIsLoadingMore(false);
      }
      // Remove the "notificationsData === null || undefined" case since undefined is normal during loading
    }
  }, [notificationsData, page]);

  // Reset when dropdown opens
  useEffect(() => {
    if (isOpen && user) {
      // Only reset if we haven't initialized yet or if we have no notifications
      if (!initializedRef.current || allNotifications.length === 0) {
        setPage(1);
        setLastFetchedPage(0); // Reset last fetched page
        setHasMore(true);
        setIsLoadingMore(false);
        setIsAllDataLoaded(false); // Reset the all data loaded flag
        
        // Invalidate all notification queries to force fresh data
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        initializedRef.current = true;
      }
    }
  }, [isOpen, user, queryClient, allNotifications.length]);

  // Force refetch when dropdown opens if needed
  useEffect(() => {
    if (isOpen && user && page === 1) {
      // Only refetch if we don't have recent data
      const lastFetch = queryClient.getQueryState(['notifications', 1])?.dataUpdatedAt;
      const now = Date.now();
      const shouldRefetch = !lastFetch || (now - lastFetch) > 30000; // 30 seconds
      
      if (shouldRefetch) {
        refetch();
      }
    }
  }, [isOpen, user, page, refetch, queryClient]);

  // Scroll handler for infinite scroll
  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    
    if (isLoadingMore) {
      return;
    }
    
    if (!hasMore) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    
    // Only load more when user scrolls to within 100px of bottom (increased threshold)
    if (distanceFromBottom <= 100) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  }, [isLoadingMore, hasMore, page]);

  // Throttle scroll handler to prevent excessive firing
  const throttledScrollHandler = useCallback(() => {
    clearTimeout(throttledScrollHandler.timeoutId);
    throttledScrollHandler.timeoutId = setTimeout(handleScroll, 150); // 150ms throttle
  }, [handleScroll]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && isOpen) {
      container.addEventListener('scroll', throttledScrollHandler, { passive: true });
      return () => {
        clearTimeout(throttledScrollHandler.timeoutId);
        container.removeEventListener('scroll', throttledScrollHandler);
      };
    }
  }, [isOpen, throttledScrollHandler]);

  // Set up SSE listeners for real-time notification updates
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = (data) => {
      // Only handle notifications for the current user
      if (data.userId === user.id || data.userId === user._id) {
        // Add new notification to the beginning of the list
        setAllNotifications(prev => {
          return [data.notification, ...prev];
        });
        // Invalidate queries to keep cache in sync
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    const handleNotificationRead = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        // Update the specific notification in our local state
        setAllNotifications(prev => {
          return prev.map(notification =>
            notification._id === data.notificationId
              ? { ...notification, isRead: true }
              : notification
          );
        });
        // Update cache and unread count
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    const handleNotificationsCleared = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        // Mark all notifications as read in local state
        setAllNotifications(prev => {
          return prev.map(notification => ({
            ...notification,
            isRead: true
          }));
        });
        // Update unread count to 0
        queryClient.setQueryData(['unreadNotificationCount'], 0);
      }
    };

    const handleNotificationsDeleted = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        // Clear all notifications from local state
        setAllNotifications([]);
        // Update cache and unread count
        queryClient.setQueryData(['unreadNotificationCount'], 0);
      }
    };

    const handleNotificationDeleted = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        // Remove the specific notification from local state
        setAllNotifications(prev => {
          return prev.filter(notification => notification._id !== data.notificationId);
        });
        // Update unread count
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    // Add SSE event listeners
    sseService.addEventListener('new_notification', handleNewNotification);
    sseService.addEventListener('notification_read', handleNotificationRead);
    sseService.addEventListener('notifications_cleared', handleNotificationsCleared);
    sseService.addEventListener('notifications_deleted', handleNotificationsDeleted);
    sseService.addEventListener('notification_deleted', handleNotificationDeleted);

    // Clean up on unmount or user change
    return () => {
      sseService.removeEventListener('new_notification', handleNewNotification);
      sseService.removeEventListener('notification_read', handleNotificationRead);
      sseService.removeEventListener('notifications_cleared', handleNotificationsCleared);
      sseService.removeEventListener('notifications_deleted', handleNotificationsDeleted);
      sseService.removeEventListener('notification_deleted', handleNotificationDeleted);
    };
  }, [user, queryClient]);

  // Add event listener for login events to immediately refetch notifications
  useEffect(() => {
    const handleAuthLogin = () => {
      // Reset state and refetch notifications when user logs in
      setPage(1);
      setHasMore(true);
      setAllNotifications([]);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    };

    window.addEventListener('authLogin', handleAuthLogin);

    return () => {
      window.removeEventListener('authLogin', handleAuthLogin);
    };
  }, [refetch, queryClient]);

  const notifications = notificationsData?.notifications || [];

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => api.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  // Mark all notifications as read mutation with optimistic updates
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsAsRead(),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unreadNotificationCount'] });

      // Snapshot the previous values
      const previousNotifications = allNotifications;
      const previousUnreadCount = queryClient.getQueryData(['unreadNotificationCount']);

      // Optimistically mark all notifications as read in local state
      setAllNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          isRead: true
        }))
      );

      // Optimistically set unread count to 0
      queryClient.setQueryData(['unreadNotificationCount'], 0);

      // Return context for rollback
      return { previousNotifications, previousUnreadCount };
    },
    onError: (err, variables, context) => {
      // Roll back on error
      if (context?.previousNotifications) {
        setAllNotifications(context.previousNotifications);
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(['unreadNotificationCount'], context.previousUnreadCount);
      }
      console.error('Failed to mark all notifications as read:', err);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  // Delete all notifications mutation with optimistic updates
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: () => api.deleteAllNotifications(),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unreadNotificationCount'] });

      // Snapshot the previous values
      const previousNotifications = allNotifications;
      const previousUnreadCount = queryClient.getQueryData(['unreadNotificationCount']);

      // Optimistically clear all notifications
      setAllNotifications([]);

      // Optimistically set unread count to 0
      queryClient.setQueryData(['unreadNotificationCount'], 0);

      // Return context for rollback
      return { previousNotifications, previousUnreadCount };
    },
    onError: (err, variables, context) => {
      // Roll back on error
      if (context?.previousNotifications) {
        setAllNotifications(context.previousNotifications);
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(['unreadNotificationCount'], context.previousUnreadCount);
      }
      console.error('Failed to delete all notifications:', err);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  // Delete individual notification mutation with optimistic updates
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => api.deleteNotification(notificationId),
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unreadNotificationCount'] });

      // Snapshot the previous values
      const previousNotifications = allNotifications;
      const previousUnreadCount = queryClient.getQueryData(['unreadNotificationCount']);

      // Find the notification being deleted to check if it was unread
      const notificationToDelete = allNotifications.find(
        notification => notification._id === notificationId
      );
      const wasUnread = notificationToDelete && !notificationToDelete.isRead;

      // Optimistically update notifications list
      setAllNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );

      // Optimistically update unread count if the deleted notification was unread
      if (wasUnread && typeof previousUnreadCount === 'number') {
        queryClient.setQueryData(['unreadNotificationCount'], Math.max(0, previousUnreadCount - 1));
      }

      // Return a context object with the snapshotted values
      return { previousNotifications, previousUnreadCount };
    },
    onError: (err, notificationId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousNotifications) {
        setAllNotifications(context.previousNotifications);
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(['unreadNotificationCount'], context.previousUnreadCount);
      }
      console.error('Failed to delete notification:', err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  // Get the total items from the latest pagination data
  const totalNotifications = notificationsData?.pagination?.totalItems || 0;

  // Note: Click outside handling is managed by the parent Navbar component

  /**
   * Formats timestamp to relative time (e.g., "3 hours ago")
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted relative time
   */
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);

    if (diffInSeconds < 60) {
      return 'Vừa xong';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} phút trước`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} giờ trước`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ngày trước`;
    } else {
      return notificationTime.toLocaleDateString('vi-VN');
    }
  };

  /**
   * Generates appropriate link for notification based on type
   * @param {Object} notification - Notification object
   * @returns {string} Link URL
   */
  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case 'report_feedback':
        // Navigate to the reported content if available
        if (notification.data?.contentType && notification.data?.contentId) {
          if (notification.data.contentType === 'chapter' && notification.data.novelId && notification.data.chapterId) {
            const chapterSlug = createUniqueSlug(notification.data.chapterTitle || 'Chapter', notification.data.chapterId);
            return `/truyen/${notification.data.novelId}/chuong/${chapterSlug}`;
          } else if (notification.data.contentType === 'novel' && notification.data.contentId) {
            return `/truyen/${notification.data.contentId}`;
          } else if (notification.data.contentType === 'comment' && notification.data.novelId) {
            // For comment reports, navigate to the novel or chapter if available
            if (notification.data.chapterId) {
              const chapterSlug = createUniqueSlug(notification.data.chapterTitle || 'Chapter', notification.data.chapterId);
              return `/truyen/${notification.data.novelId}/chuong/${chapterSlug}`;
            }
            return `/truyen/${notification.data.novelId}`;
          }
        }
        return '#'; // Fallback if no navigation data
      case 'comment_reply':
        if (notification.data?.chapterId && notification.data?.novelId) {
          const chapterSlug = createUniqueSlug(notification.data.chapterTitle, notification.data.chapterId);
          return `/truyen/${notification.data.novelId}/chuong/${chapterSlug}#comment-${notification.data.originalCommentId}`;
        }
        return '#';
      case 'new_chapter':
        if (notification.data?.chapterId && notification.data?.novelId) {
          const chapterSlug = createUniqueSlug(notification.data.chapterTitle, notification.data.chapterId);
          return `/truyen/${notification.data.novelId}/chuong/${chapterSlug}`;
        }
        return '#';
      default:
        return '#';
    }
  };

  /**
   * Handles notification click - marks as read and navigates
   * @param {Object} notification - Notification object
   */
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }
    onClose();
  };

  /**
   * Handles delete all notifications (top button)
   */
  const handleDeleteAll = () => {
    deleteAllNotificationsMutation.mutate();
  };

  /**
   * Handles mark all notifications as read (footer button)
   */
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  /**
   * Handles delete individual notification
   * @param {Event} e - Click event
   * @param {string} notificationId - ID of notification to delete
   */
  const handleDeleteNotification = (e, notificationId) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  if (!isOpen) return null;

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-dropdown-header">
        <h3>Thông báo</h3>
        {allNotifications.length > 0 && (
          <button 
            className="clear-all-btn"
            onClick={handleDeleteAll}
            disabled={deleteAllNotificationsMutation.isPending}
          >
            {deleteAllNotificationsMutation.isPending ? 'Đang xóa...' : 'Xóa tất cả'}
          </button>
        )}
      </div>

      <div className="notification-dropdown-content" ref={scrollContainerRef}>
        {isLoading && page === 1 ? (
          <div className="notification-loading">
            <LoadingSpinner size="small" text="Đang tải thông báo..." />
          </div>
        ) : error ? (
          <div className="notification-error">
            Không thể tải thông báo
          </div>
        ) : allNotifications.length === 0 ? (
          <div className="no-notifications">
            <i className="fa-regular fa-bell-slash"></i>
            <span>Không có thông báo mới</span>
          </div>
        ) : (
          <div className="notification-list">
            {allNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                {getNotificationLink(notification) !== '#' ? (
                  <Link 
                    to={getNotificationLink(notification)} 
                    className="notification-link"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-content">
                      <div className="notification-icon">
                        {notification.type === 'report_feedback' && <i className="fa-solid fa-reply"></i>}
                        {notification.type === 'comment_reply' && <i className="fa-solid fa-comment"></i>}
                        {notification.type === 'new_chapter' && <i className="fa-solid fa-book-open"></i>}
                      </div>
                      <div className="notification-text">
                        <div className="notification-message" dangerouslySetInnerHTML={{ __html: notification.message }}></div>
                        <div className="notification-timestamp">
                          {formatTimestamp(notification.createdAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      className="delete-notification-btn"
                      onClick={(e) => handleDeleteNotification(e, notification._id)}
                      disabled={deleteNotificationMutation.isPending}
                      title="Xóa thông báo"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </Link>
                ) : (
                  <div className="notification-content">
                    <div className="notification-icon">
                      {notification.type === 'report_feedback' && <i className="fa-solid fa-reply"></i>}
                      {notification.type === 'comment_reply' && <i className="fa-solid fa-comment"></i>}
                      {notification.type === 'new_chapter' && <i className="fa-solid fa-book-open"></i>}
                    </div>
                    <div className="notification-text">
                      <div className="notification-message" dangerouslySetInnerHTML={{ __html: notification.message }}></div>
                      <div className="notification-timestamp">
                        {formatTimestamp(notification.createdAt)}
                      </div>
                    </div>
                    <button
                      className="delete-notification-btn"
                      onClick={(e) => handleDeleteNotification(e, notification._id)}
                      disabled={deleteNotificationMutation.isPending}
                      title="Xóa thông báo"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {/* Infinite scroll loading indicator */}
            {isLoadingMore && (
              <div className="notification-loading-more">
                <div className="circular-loading-spinner">
                  <div className="spinner-circle"></div>
                </div>
                <span className="loading-text">Đang tải thêm...</span>
              </div>
            )}
            
            {/* End of notifications indicator */}
            {isAllDataLoaded && !isLoadingMore && allNotifications.length > 0 && (
              <div className="notifications-end">
                <span>Đã tải hết thông báo</span>
              </div>
            )}
          </div>
        )}
      </div>

      {allNotifications.length > 0 && (
        <div className="notification-dropdown-footer">
          <button 
            className="clear-all-footer-btn"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <i className="fa-solid fa-check-double"></i>
            {markAllAsReadMutation.isPending ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown; 