import axios from 'axios';
import config from '../config/config';

/**
 * Creates an API URL that uses relative paths in localhost environments
 * and absolute paths in production
 * 
 * @param {string} endpoint - The API endpoint (starting with /)
 * @returns {string} The complete URL
 */
export const createApiUrl = (endpoint) => {
  // Force relative URL in localhost environments
  const baseUrl = window.location.hostname === 'localhost' ? '' : config.backendUrl;
  return `${baseUrl}${endpoint}`;
};

/**
 * Configured axios instance with automatic URL handling
 */
export const api = {
  get: (endpoint, config = {}) => axios.get(createApiUrl(endpoint), config),
  post: (endpoint, data, config = {}) => axios.post(createApiUrl(endpoint), data, config),
  put: (endpoint, data, config = {}) => axios.put(createApiUrl(endpoint), data, config),
  delete: (endpoint, config = {}) => axios.delete(createApiUrl(endpoint), config)
};

export default api; 