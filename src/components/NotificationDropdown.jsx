/**
 * NotificationDropdown Component
 * 
 * Dropdown component for displaying user notifications including:
 * - Report feedback notifications
 * - Comment reply notifications  
 * - New chapter notifications for bookmarked novels
 * 
 * Features:
 * - Shows 4 notifications at a time with scrolling
 * - Timestamp display (e.g., "3 hours ago")
 * - Clear all notifications button
 * - Mark individual notifications as read
 * - Links to relevant content
 */

import { useState, useEffect, useRef } from 'react';
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
  const queryClient = useQueryClient();

  // Fetch notifications (no polling, only initial load and manual refetch)
  const { data: notificationsData, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(1, 20), // Get more notifications for scrolling
    enabled: !!user, // Always enabled when user is logged in
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus since we use SSE
  });

  // Set up SSE listeners for real-time notification updates
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = (data) => {
      // Only handle notifications for the current user
      if (data.userId === user.id || data.userId === user._id) {
        console.log('New notification received via SSE:', data.notification);
        // Invalidate and refetch both notifications and unread count
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    const handleNotificationRead = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        console.log('Notification marked as read via SSE:', data.notificationId);
        // Update the specific notification in cache
        queryClient.setQueryData(['notifications'], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map(notification =>
              notification._id === data.notificationId
                ? { ...notification, isRead: true }
                : notification
            )
          };
        });
        // Update unread count
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      }
    };

    const handleNotificationsCleared = (data) => {
      // Only handle for the current user
      if (data.userId === user.id || data.userId === user._id) {
        console.log('All notifications marked as read via SSE');
        // Mark all notifications as read in cache
        queryClient.setQueryData(['notifications'], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            notifications: oldData.notifications.map(notification => ({
              ...notification,
              isRead: true
            }))
          };
        });
        // Update unread count to 0
        queryClient.setQueryData(['unreadNotificationCount'], 0);
      }
    };

    // Add SSE event listeners
    sseService.addEventListener('new_notification', handleNewNotification);
    sseService.addEventListener('notification_read', handleNotificationRead);
    sseService.addEventListener('notifications_cleared', handleNotificationsCleared);

    // Clean up on unmount or user change
    return () => {
      sseService.removeEventListener('new_notification', handleNewNotification);
      sseService.removeEventListener('notification_read', handleNotificationRead);
      sseService.removeEventListener('notifications_cleared', handleNotificationsCleared);
    };
  }, [user, queryClient]);

  // Refetch notifications when dropdown opens (only if data is stale)
  useEffect(() => {
    if (isOpen && user) {
      // Only refetch if data is older than 1 minute
      const lastFetch = queryClient.getQueryState(['notifications'])?.dataUpdatedAt;
      const now = Date.now();
      if (!lastFetch || (now - lastFetch) > 60000) {
        refetch();
      }
    }
  }, [isOpen, user, refetch, queryClient]);

  // Initial fetch when user logs in
  useEffect(() => {
    if (user) {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    }
  }, [user, refetch, queryClient]);

  // Add event listener for login events to immediately refetch notifications
  useEffect(() => {
    const handleAuthLogin = () => {
      // Immediately refetch notifications when user logs in
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

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

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
            return `/novel/${notification.data.novelId}/chapter/${chapterSlug}`;
          } else if (notification.data.contentType === 'novel' && notification.data.contentId) {
            return `/novel/${notification.data.contentId}`;
          } else if (notification.data.contentType === 'comment' && notification.data.novelId) {
            // For comment reports, navigate to the novel or chapter if available
            if (notification.data.chapterId) {
              const chapterSlug = createUniqueSlug(notification.data.chapterTitle || 'Chapter', notification.data.chapterId);
              return `/novel/${notification.data.novelId}/chapter/${chapterSlug}`;
            }
            return `/novel/${notification.data.novelId}`;
          }
        }
        return '#'; // Fallback if no navigation data
      case 'comment_reply':
        if (notification.data?.chapterId && notification.data?.novelId) {
          const chapterSlug = createUniqueSlug(notification.data.chapterTitle, notification.data.chapterId);
          return `/novel/${notification.data.novelId}/chapter/${chapterSlug}#comment-${notification.data.originalCommentId}`;
        }
        return '#';
      case 'new_chapter':
        if (notification.data?.chapterId && notification.data?.novelId) {
          const chapterSlug = createUniqueSlug(notification.data.chapterTitle, notification.data.chapterId);
          return `/novel/${notification.data.novelId}/chapter/${chapterSlug}`;
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
   * Handles clear all notifications
   */
  const handleClearAll = () => {
    markAllAsReadMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-dropdown-header">
        <h3>Thông báo</h3>
        {notifications.length > 0 && (
          <button 
            className="clear-all-btn"
            onClick={handleClearAll}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? 'Đang xóa...' : 'Xóa tất cả'}
          </button>
        )}
      </div>

      <div className="notification-dropdown-content">
        {isLoading ? (
          <div className="notification-loading">
            <LoadingSpinner size="small" text="Đang tải thông báo..." />
          </div>
        ) : error ? (
          <div className="notification-error">
            Không thể tải thông báo
          </div>
        ) : notifications.length === 0 ? (
          <div className="no-notifications">
            <i className="fa-regular fa-bell-slash"></i>
            <span>Không có thông báo mới</span>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
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
                        <div className="notification-message">{notification.message}</div>
                        <div className="notification-timestamp">
                          {formatTimestamp(notification.createdAt)}
                        </div>
                      </div>
                    </div>
                    {!notification.isRead && <div className="unread-indicator"></div>}
                  </Link>
                ) : (
                  <div className="notification-content">
                    <div className="notification-icon">
                      {notification.type === 'report_feedback' && <i className="fa-solid fa-reply"></i>}
                      {notification.type === 'comment_reply' && <i className="fa-solid fa-comment"></i>}
                      {notification.type === 'new_chapter' && <i className="fa-solid fa-book-open"></i>}
                    </div>
                    <div className="notification-text">
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-timestamp">
                        {formatTimestamp(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.isRead && <div className="unread-indicator"></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-dropdown-footer">
          <button 
            className="clear-all-footer-btn"
            onClick={handleClearAll}
            disabled={markAllAsReadMutation.isPending}
          >
            <i className="fa-solid fa-check-double"></i>
            {markAllAsReadMutation.isPending ? 'Đang xóa...' : 'Đánh dấu tất cả đã đọc'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown; 