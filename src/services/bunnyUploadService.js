/**
 * Bunny.net Upload Service
 * 
 * This service handles file uploads to bunny.net CDN.
 */

import cdnConfig from '../config/bunny';
import config from '../config/config';
import env from '../config/env';
import axios from 'axios';

/**
 * Upload a file to bunny.net storage
 * @param {File} file - The file to upload
 * @param {string} folder - Target folder (e.g., 'illustrations')
 * @returns {Promise<string>} - The CDN URL of the uploaded file
 */
const uploadToBunny = async (file, folder = '') => {
  try {
    if (!file) {
      throw new Error('No file provided for upload');
    }
    
    // Additional validation for file properties
    if (typeof file !== 'object') {
      throw new Error('Invalid file object provided');
    }
    
    // Check if file has required properties
    if (!file.size && file.size !== 0) {
      console.warn('File missing size property, attempting upload anyway');
    }

    // Define target folder
    let targetFolder = folder;

    // Map to predefined folders if needed
    if (folder) {
      targetFolder = config.bunny.folders[folder] || folder;
    }

    // Generate a unique filename to avoid collisions
    const timestamp = new Date().getTime();
    
    // Handle cases where file.name might be undefined
    let fileName = 'untitled';
    let fileExtension = '';
    
    if (file.name) {
      const lastDotIndex = file.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        fileName = file.name.substring(0, lastDotIndex);
        fileExtension = file.name.substring(lastDotIndex);
      } else {
        fileName = file.name;
      }
    } else {
      // Try to determine extension from file type
      if (file.type) {
        const typeMap = {
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
          'image/bmp': '.bmp',
          'image/svg+xml': '.svg'
        };
        fileExtension = typeMap[file.type] || '';
      }
    }
    
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '-');
    const uniqueFilename = `${timestamp}-${sanitizedFileName}${fileExtension}`;
    
    // Path in the storage zone
    const storagePath = targetFolder ? `/${targetFolder}/${uniqueFilename}` : `/${uniqueFilename}`;
    
    // Create FormData for backend proxy upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', storagePath);
    
    // Upload through backend proxy
    const response = await axios.post(
      `${config.backendUrl}/api/upload/bunny`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    // Return the CDN URL
    return `${cdnConfig.bunnyBaseUrl}${storagePath}`;
  } catch (error) {
    console.error('Error uploading to bunny.net:', error);
    throw new Error('Failed to upload file to bunny.net');
  }
};

const bunnyUploadService = {
  /**
   * Upload a file to bunny.net
   * @param {File} file - The file to upload
   * @param {string} folder - Target folder (e.g., 'illustration')
   * @returns {Promise<string>} - The CDN URL of the uploaded file
   */
  uploadFile: async (file, folder = '') => {
    return uploadToBunny(file, folder);
  }
};

export default bunnyUploadService; 