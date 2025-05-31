import axios from 'axios';
import config from '../config/config';
import { queryClient } from '../lib/react-query';
import hybridCdnService from './bunnyUploadService';

// Helper function to validate JWT token format
const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Each part should be base64 encoded (basic check)
  try {
    parts.forEach(part => {
      if (part.length === 0) throw new Error('Empty part');
      // Basic base64 character check
      if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('Invalid characters');
    });
    return true;
  } catch {
    return false;
  }
};

// Helper function to get validated token
const getValidToken = () => {
  const token = localStorage.getItem('token');
  if (!isValidJWT(token)) {
    // Clear invalid token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
  return token;
};

const api = {
  // Lookup novel ID from slug
  lookupNovelId: async (slug) => {
    try {
      const response = await axios.get(`${config.backendUrl}/api/novels/slug/${slug}`);
      return response.data.id;
    } catch (error) {
      throw error;
    }
  },

  // Lookup chapter ID from slug
  lookupChapterId: async (slug) => {
    try {
      const response = await axios.get(`${config.backendUrl}/api/chapters/slug/${slug}`);
      return response.data.id;
    } catch (error) {
      throw error;
    }
  },

  fetchNovelWithModules: async (novelId, forceRefresh = false, countView = false) => {
    try {
      // Add skipViewTracking parameter when forceRefresh is true (coming from add chapter)
      const params = new URLSearchParams();
      if (forceRefresh) {
        params.append('_t', Date.now());
      }
      // Only track views when explicitly requested
      if (!countView) {
        params.append('skipViewTracking', 'true');
      } else {
        // When counting views, use a single atomic operation
        params.append('singleOperation', 'true');
      }
      
      const url = `${config.backendUrl}/api/novels/${novelId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      if (!response.data) {
        throw new Error('No data received');
      }
      
      // If we don't have modules, try fetching them separately
      if (!response.data.modules || response.data.modules.length === 0) {
        try {
          // Also add cache-busting to the modules endpoint
          const modulesUrl = forceRefresh
            ? `${config.backendUrl}/api/modules/${novelId}/modules-with-chapters?_t=${Date.now()}&skipViewTracking=true`
            : `${config.backendUrl}/api/modules/${novelId}/modules-with-chapters?skipViewTracking=true`;
            
          const modulesResponse = await axios.get(modulesUrl);
          
          if (modulesResponse.data && Array.isArray(modulesResponse.data)) {
            response.data.modules = modulesResponse.data;
          }
        } catch (moduleError) {
          // Handle error but don't log
        }
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  checkBookmarkStatus: async (username, novelId) => {
    if (!username || !novelId) return false;
    try {
      const token = getValidToken();
      if (!token) return false;
      
      const response = await axios.get(
        `${config.backendUrl}/api/users/${username}/bookmarks/${novelId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data.isBookmarked;
    } catch (err) {
      return false;
    }
  },

  toggleBookmark: async (novelId) => {
    try {
      const token = getValidToken();
      const user = JSON.parse(localStorage.getItem('user')); // Get user from localStorage
      
      if (!token || !user) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${config.backendUrl}/api/usernovelinteractions/bookmark`,
        { novelId },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getBookmarkedChapter: async (novelId) => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/userchapterinteractions/bookmark/${novelId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching bookmarked chapter:', error);
      return { bookmarkedChapter: null };
    }
  },

  toggleChapterBookmark: async (chapterId) => {
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/userchapterinteractions/bookmark`,
        { chapterId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  reorderChapter: async ({ novelId, moduleId, chapterId, direction }) => {
    try {
      const response = await axios.put(
        `${config.backendUrl}/api/modules/${novelId}/modules/${moduleId}/chapters/${chapterId}/reorder?skipUpdateTimestamp=true`,
        {
          direction
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.data || !response.data.chapters) {
        throw new Error('Invalid response from server');
      }

      return response.data;
    } catch (error) {
      console.error('Chapter reordering error:', error);
      throw error;
    }
  },

  createModule: async (novelId, moduleData) => {
    try {
      if (!novelId) {
        throw new Error("Novel ID is required");
      }
      
      const token = getValidToken();
      if (!token) {
        throw new Error("Authentication token missing");
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/modules/${novelId}/modules`,
        {
          title: moduleData.title,
          illustration: moduleData.illustration,
          mode: moduleData.mode || 'published',
          moduleBalance: moduleData.mode === 'paid' ? (moduleData.moduleBalance || 0) : 0
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateModule: async (novelId, moduleId, moduleData) => {
    try {
      if (!novelId || !moduleId) {
        throw new Error("Novel ID and Module ID are required");
      }
      
      const token = getValidToken();
      if (!token) {
        throw new Error("Authentication token missing");
      }
      
      const response = await axios.put(
        `${config.backendUrl}/api/modules/${novelId}/modules/${moduleId}`,
        {
          title: moduleData.title,
          illustration: moduleData.illustration,
          mode: moduleData.mode || 'published',
          moduleBalance: moduleData.mode === 'paid' ? (moduleData.moduleBalance || 0) : 0
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  uploadModuleCover: async (file) => {
    try {
      return await hybridCdnService.uploadFile(file, 'illustration');
    } catch (error) {
      console.error('Error uploading cover image:', error);
      throw new Error('Failed to upload cover image');
    }
  },

  updateChapterOrder: async ({ novelId, moduleId, chapterId, newOrder }) => {
    try {
      // Try the direct chapter update endpoint
      const response = await axios.put(
        `${config.backendUrl}/api/chapters/${chapterId}`,
        {
          order: newOrder,
          moduleId: moduleId  // Include moduleId as it might be required
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update chapter order via chapters API:', error.response?.data || error.message);
      
      // Try an alternative endpoint as fallback
      try {
        const alternativeResponse = await axios.put(
          `${config.backendUrl}/api/novels/${novelId}/chapters/${chapterId}`,
          {
            order: newOrder,
            moduleId: moduleId
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return alternativeResponse.data;
      } catch (altError) {
        console.error('Failed with alternative endpoint too:', altError.response?.data || altError.message);
        throw altError;
      }
    }
  },

  deleteChapter: async (chapterId) => {
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/chapters/${chapterId}?skipViewTracking=true`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete chapter:', error);
      throw error;
    }
  },

  deleteModule: async (novelId, moduleId) => {
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/modules/${novelId}/modules/${moduleId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete module:', error);
      throw error;
    }
  },

  reorderModule: async ({ novelId, moduleId, direction }) => {
    try {
      // Use the correct API endpoint path for module reordering
      const response = await axios.put(
        `${config.backendUrl}/api/modules/${novelId}/modules/reorder?skipUpdateTimestamp=true`,
        {
          moduleId,
          direction
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Module reordering error:', error);
      throw error;
    }
  },

  likeNovel: async (novelId) => {
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/usernovelinteractions/like`,
        { novelId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  rateNovel: async (novelId, rating, review) => {
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/usernovelinteractions/rate`,
        { novelId, rating, review },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  removeRating: async (novelId) => {
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/usernovelinteractions/rate/${novelId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getUserNovelInteraction: async (novelId) => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      if (!token || !user) {
        return { liked: false, rating: null, review: null, bookmarked: false };
      }
      
      // Get all interactions from usernovelinteractions endpoint
      const interactionResponse = await axios.get(
        `${config.backendUrl}/api/usernovelinteractions/user/${novelId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return interactionResponse.data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      return { liked: false, rating: null, review: null, bookmarked: false };
    }
  },

  getNovelStats: async (novelId) => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/usernovelinteractions/stats/${novelId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching novel stats:", error);
      return { totalLikes: 0, totalRatings: 0, averageRating: '0.0' };
    }
  },

  // Report related API calls
  submitReport: async (contentType, contentId, reportType, details, contentTitle, novelId) => {
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/reports`,
        { contentType, contentId, reportType, details, contentTitle, novelId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to submit report:', error);
      throw error;
    }
  },

  getReports: async (status = 'pending') => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/reports?status=${status}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      throw error;
    }
  },

  resolveReport: async (reportId, responseMessage = '') => {
    try {
      const response = await axios.put(
        `${config.backendUrl}/api/reports/${reportId}/resolve`,
        { responseMessage },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to resolve report:', error);
      throw error;
    }
  },

  deleteReport: async (reportId) => {
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/reports/${reportId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw error;
    }
  },

  getBookmarks: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token missing");
      }

      const response = await axios.get(
        `${config.backendUrl}/api/usernovelinteractions/bookmarks`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      return [];
    }
  },

  fetchNovelContributions: async (novelId) => {
    const response = await axios.get(`${config.backendUrl}/api/novels/${novelId}/contributions`);
    return response.data;
  },

  getNovelReviews: async (novelId, page = 1, limit = 10) => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/usernovelinteractions/reviews/${novelId}?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching novel reviews:", error);
      return { reviews: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } };
    }
  },

  // Novel contribution methods
  contributeToNovel: async (novelId, amount, note) => {
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/novels/${novelId}/contribute`,
        { amount, note },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getContributionHistory: async (novelId) => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/novels/${novelId}/contribution-history`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching contribution history:", error);
      return { contributions: [] };
    }
  },

  // Notification related API calls
  getNotifications: async (page = 1, limit = 10) => {
    try {
      const token = getValidToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get(
        `${config.backendUrl}/api/notifications?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  markNotificationAsRead: async (notificationId) => {
    try {
      const token = getValidToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.put(
        `${config.backendUrl}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const token = getValidToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.put(
        `${config.backendUrl}/api/notifications/read-all`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },

  getUnreadNotificationCount: async () => {
    try {
      const token = getValidToken();
      if (!token) {
        return 0;
      }
      
      const response = await axios.get(
        `${config.backendUrl}/api/notifications/unread-count`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data.count;
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error);
      return 0;
    }
  },

  deleteAllNotifications: async () => {
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/notifications/delete-all`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      throw error;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const response = await axios.delete(
        `${config.backendUrl}/api/notifications/${notificationId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }
};

export default api;