import axios from 'axios';
import config from '../config/config';
import { queryClient } from '../lib/react-query';

const api = {
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
      const response = await axios.get(
        `${config.backendUrl}/api/users/${username}/bookmarks/${novelId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      if (!novelId) {
        throw new Error("Novel ID is required");
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token missing");
      }

      // Get user info from token payload
      let payload;
      try {
        payload = JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        throw new Error("Invalid token format");
      }
      
      if (!payload.userId) {
        throw new Error("Invalid token: missing user ID");
      }

      let username = payload.username;
      
      // If username is not in token, fetch it from profile
      if (!username) {
        try {
          const userResponse = await axios.get(
            `${config.backendUrl}/api/users/${payload.userId}/profile`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (!userResponse.data.username) {
            throw new Error("Could not determine username");
          }
          
          username = userResponse.data.username;
        } catch (e) {
          throw new Error("Failed to get username from profile");
        }
      }

      const response = await axios.post(
        `${config.backendUrl}/api/users/${username}/bookmarks`,
        { novelId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Bookmark toggle error:", error.response?.data || error.message);
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
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token missing");
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/modules/${novelId}/modules`,
        {
          title: moduleData.title,
          illustration: moduleData.illustration
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
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token missing");
      }
      
      const response = await axios.put(
        `${config.backendUrl}/api/modules/${novelId}/modules/${moduleId}`,
        {
          title: moduleData.title,
          illustration: moduleData.illustration
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.cloudinary.uploadPresets.illustration);
    formData.append('folder', 'novel-illustrations');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`,
      formData
    );
    return response.data.secure_url;
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

  toggleLike: async (novelId) => {
    try {
      if (!novelId) {
        throw new Error("Novel ID is required");
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token missing");
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/novels/${novelId}/like`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error("Like toggle error:", error.response?.data || error.message);
      throw error;
    }
  },
  
  rateNovel: async (novelId, rating) => {
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/novels/${novelId}/rate`,
        { rating },
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
        `${config.backendUrl}/api/novels/${novelId}/rate`,
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
  
  getUserInteraction: async (novelId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { liked: false, rating: null };
      }
      
      const response = await axios.get(
        `${config.backendUrl}/api/novels/${novelId}/interaction`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      return { liked: false, rating: null };
    }
  },
};

export default api;