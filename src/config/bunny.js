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
  
  // Default placeholder images
  defaultImages: {
    // Use this as a fallback for missing images
    missing: `${BUNNY_CDN_URL}/illustrations/missing-image.png`,
    // Use this as a fallback for novel illustrations
    novel: `${BUNNY_CDN_URL}/illustrations/default-novel-cover.png`,
    // Use this as a fallback for user avatars
    avatar: `${BUNNY_CDN_URL}/avatars/default-avatar.png`
  },
  
  // Legacy default image (kept for backward compatibility)
  defaultImageUrl: `${BUNNY_CDN_URL}/illustrations/missing-image.png`,
  
  // Check if a URL is from bunny.net
  isBunnyUrl: (url) => {
    return url && url.includes('valvrareteam.b-cdn.net');
  }
};

export default cdnConfig; 