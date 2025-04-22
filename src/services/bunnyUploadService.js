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
 * @param {string} preset - Former Cloudinary preset (used for folder mapping)
 * @returns {Promise<string>} - The CDN URL of the uploaded file
 */
const uploadToBunny = async (file, folder = '', preset = '') => {
  try {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    // Define target folder based on preset or provided folder
    let targetFolder = folder;

    // Convert any 'novel-illustrations' to just 'illustrations' for compatibility
    if (folder === 'novel-illustrations') {
      targetFolder = 'illustrations';
    }

    if (preset) {
      // Map Cloudinary presets to bunny.net folders
      switch (preset) {
        case config.cloudinary.uploadPresets.avatar:
          targetFolder = 'avatars';
          break;
        case config.cloudinary.uploadPresets.illustration:
          targetFolder = 'illustrations';
          break;
        case config.cloudinary.uploadPresets.comment:
          targetFolder = 'comment-images';
          break;
        default:
          targetFolder = folder || 'general';
      }
    }

    // Generate a unique filename to avoid collisions
    const timestamp = new Date().getTime();
    const uniqueFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
    
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
   * @param {string} folder - Target folder (e.g., 'illustrations')
   * @param {string} preset - Former Cloudinary preset (used for folder mapping)
   * @returns {Promise<string>} - The CDN URL of the uploaded file
   */
  uploadFile: async (file, folder = '', preset = '') => {
    return uploadToBunny(file, folder, preset);
  }
};

export default bunnyUploadService; 