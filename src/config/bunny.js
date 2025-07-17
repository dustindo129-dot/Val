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

  // Gets optimized image URL with parameters for bunny.net optimizer
  getOptimizedImageUrl: (path, options = {}) => {
    // Normalize path (remove leading slash if present)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    let url = `${BUNNY_CDN_URL}/${normalizedPath}`;
    
    // Add optimizer parameters if provided
    const params = new URLSearchParams();
    
    // Add width parameter for responsive images
    if (options.width) {
      params.append('width', options.width);
    }
    
    // Add height parameter
    if (options.height) {
      params.append('height', options.height);
    }
    
    // Add quality parameter (1-100)
    if (options.quality) {
      params.append('quality', options.quality);
    }
    
    // Add format parameter (webp, jpg, png, auto)
    if (options.format) {
      params.append('format', options.format);
    }
    
    // Add aspect ratio parameter
    if (options.aspect) {
      params.append('aspect', options.aspect);
    }
    
    // Add optimizer-specific parameters
    if (options.optimizer !== false) {
      // Force optimizer to process the image
      params.append('optimizer', 'true');
    }
    
    // If we have parameters, add them to the URL
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    return url;
  },

  // Process image URLs in content for optimizer compatibility
  processImageUrls: (content) => {
    if (!content) return content;
    
    // Replace image URLs with optimizer-compatible versions
    return content.replace(
      /(<img[^>]*src=")([^"]*valvrareteam\.b-cdn\.net[^"]*?)(")/gi,
      (match, prefix, url, suffix) => {
        // Check if URL already has optimizer parameters
        if (url.includes('?') && (url.includes('optimizer=') || url.includes('width=') || url.includes('quality='))) {
          return match; // Already optimized, leave as is
        }
        
        // Add basic optimizer parameters for comment images
        const optimizedUrl = cdnConfig.getOptimizedImageUrl(url.replace(BUNNY_CDN_URL, ''), {
          quality: 85,
          format: 'auto',
          optimizer: true
        });
        
        return prefix + optimizedUrl + suffix;
      }
    );
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