/**
 * CDN Configuration
 * 
 * This file handles the integration with bunny.net CDN service.
 */

// Base URL for the bunny.net pull zone
const BUNNY_CDN_URL = 'https://valvrareteam.b-cdn.net';

// Image class definitions matching Bunny.net optimizer setup
const IMAGE_CLASSES = {
  avatar: 'avatar',           // User avatars: width=128, quality=60, format=webp
  commentImg: 'comment-img',  // Comment images: width=500, quality=60, format=webp
  illustration: 'illustration', // Chapter illustrations: width=1000, quality=70, format=webp
  requestImg: 'request-img'   // Request images: width=600, quality=65, format=webp
};

// Configuration for bunny.net
const cdnConfig = {
  // Base URL for bunny.net
  bunnyBaseUrl: BUNNY_CDN_URL,
  
  // Image classes
  imageClasses: IMAGE_CLASSES,
  
  // Gets the image URL for the specified path
  getImageUrl: (path) => {
    // Normalize path (remove leading slash if present)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return `${BUNNY_CDN_URL}/${normalizedPath}`;
  },

  // Gets optimized image URL with class parameter for bunny.net optimizer
  getOptimizedImageUrl: (path, imageClass = null) => {
    // Normalize path (remove leading slash if present)
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    let url = `${BUNNY_CDN_URL}/${normalizedPath}`;
    
    // Add class parameter if provided
    if (imageClass && Object.values(IMAGE_CLASSES).includes(imageClass)) {
      url += `?class=${imageClass}`;
    }
    
    return url;
  },

  // Auto-detect image class based on path or context
  getImageUrlWithAutoClass: (path, context = null) => {
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    let imageClass = null;
    
    // Auto-detect class based on path
    if (normalizedPath.includes('/avatars/') || normalizedPath.includes('avatar')) {
      imageClass = IMAGE_CLASSES.avatar;
    } else if (normalizedPath.includes('/comments/')) {
      imageClass = IMAGE_CLASSES.commentImg;
    } else if (normalizedPath.includes('/illustrations/') || normalizedPath.includes('illustration')) {
      imageClass = IMAGE_CLASSES.illustration;
    } else if (normalizedPath.includes('/requests/')) {
      imageClass = IMAGE_CLASSES.requestImg;
    }
    
    // Override with context if provided
    if (context) {
      switch (context) {
        case 'avatar':
          imageClass = IMAGE_CLASSES.avatar;
          break;
        case 'comment':
          imageClass = IMAGE_CLASSES.commentImg;
          break;
        case 'illustration':
          imageClass = IMAGE_CLASSES.illustration;
          break;
        case 'request':
          imageClass = IMAGE_CLASSES.requestImg;
          break;
      }
    }
    
    return cdnConfig.getOptimizedImageUrl(path, imageClass);
  },

  // Process image URLs in content for optimizer compatibility
  processImageUrls: (content, defaultContext = 'comment') => {
    if (!content) return content;
    
    // Replace image URLs with class-optimized versions
    return content.replace(
      /(<img[^>]*src=")([^"]*valvrareteam\.b-cdn\.net[^"]*?)(")/gi,
      (match, prefix, url, suffix) => {
        // Check if URL already has class parameter
        if (url.includes('?class=')) {
          return match; // Already optimized, leave as is
        }
        
        // Remove any existing optimizer parameters
        const cleanUrl = url.split('?')[0];
        
        // Add appropriate class based on context
        const optimizedUrl = cdnConfig.getImageUrlWithAutoClass(cleanUrl.replace(BUNNY_CDN_URL, ''), defaultContext);
        
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
    // Default avatar
    avatar: `${BUNNY_CDN_URL}/defaults/default-avatar.png`
  },

  // Helper function to get avatar URL with proper class
  getAvatarUrl: (avatarPath) => {
    if (!avatarPath) return cdnConfig.defaultImages.avatar + '?class=avatar';
    
    // If it's already a full URL, check if it needs class parameter
    if (avatarPath.startsWith('http')) {
      if (avatarPath.includes('?class=')) {
        return avatarPath; // Already has class parameter
      }
      if (avatarPath.includes('valvrareteam.b-cdn.net')) {
        return avatarPath + '?class=avatar';
      }
      return avatarPath; // External URL, return as is
    }
    
    // It's a relative path, build the full URL with avatar class
    const normalizedPath = avatarPath.startsWith('/') ? avatarPath.substring(1) : avatarPath;
    return `${BUNNY_CDN_URL}/${normalizedPath}?class=avatar`;
  },

  // Helper function to get illustration URL with proper class
  getIllustrationUrl: (illustrationPath) => {
    if (!illustrationPath) return cdnConfig.defaultImages.novel + '?class=illustration';
    
    // If it's already a full URL, check if it needs class parameter
    if (illustrationPath.startsWith('http')) {
      if (illustrationPath.includes('?class=')) {
        return illustrationPath; // Already has class parameter
      }
      if (illustrationPath.includes('valvrareteam.b-cdn.net')) {
        return illustrationPath + '?class=illustration';
      }
      return illustrationPath; // External URL, return as is
    }
    
    // It's a relative path, build the full URL with illustration class
    const normalizedPath = illustrationPath.startsWith('/') ? illustrationPath.substring(1) : illustrationPath;
    return `${BUNNY_CDN_URL}/${normalizedPath}?class=illustration`;
  },

  // Helper function to get request image URL with proper class
  getRequestImageUrl: (requestImagePath) => {
    if (!requestImagePath) return cdnConfig.defaultImages.novel + '?class=request-img';
    
    // If it's already a full URL, check if it needs class parameter
    if (requestImagePath.startsWith('http')) {
      if (requestImagePath.includes('?class=')) {
        return requestImagePath; // Already has class parameter
      }
      if (requestImagePath.includes('valvrareteam.b-cdn.net')) {
        return requestImagePath + '?class=request-img';
      }
      return requestImagePath; // External URL, return as is
    }
    
    // It's a relative path, build the full URL with request image class
    const normalizedPath = requestImagePath.startsWith('/') ? requestImagePath.substring(1) : requestImagePath;
    return `${BUNNY_CDN_URL}/${normalizedPath}?class=request-img`;
  },

  // Helper function to check if URL is from bunny.net
  isBunnyUrl: (url) => {
    return url && url.includes('valvrareteam.b-cdn.net');
  }
};

export default cdnConfig; 