/**
 * CDN Configuration
 * 
 * This file handles the integration with bunny.net CDN service.
 */

// Base URL for the bunny.net pull zone
const BUNNY_CDN_URL = 'https://valvrareteam.b-cdn.net';

// Configuration for bunny.net
const cdnConfig = {
  // Base URL for bunny.net
  bunnyBaseUrl: BUNNY_CDN_URL,
  
  // Gets the image URL for the specified path
  getImageUrl: (path) => {
    // Normalize path (remove leading slash if present)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return `${BUNNY_CDN_URL}/${normalizedPath}`;
  },
  
  // Default images
  defaultImages: {
    // Default missing image
    missing: `${BUNNY_CDN_URL}/defaults/missing-image.png`,
    // Default novel cover
    novel: `${BUNNY_CDN_URL}/defaults/default-novel-cover.png`,
    // Default user avatar
    avatar: `${BUNNY_CDN_URL}/defaults/default-avatar.png`,
    // Default illustration
    illustration: `${BUNNY_CDN_URL}/defaults/default-illustration.png`
  },
  
  // Legacy default image (kept for backward compatibility)
  defaultImageUrl: `${BUNNY_CDN_URL}/illustrations/missing-image.png`,
  
  // Check if a URL is from bunny.net
  isBunnyUrl: (url) => {
    return url && url.includes('valvrareteam.b-cdn.net');
  }
};

export default cdnConfig; 