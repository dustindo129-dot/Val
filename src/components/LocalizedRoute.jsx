import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { localizeUrl, isEnglishSegment } from '../utils/routeLocalization';

/**
 * LocalizedRoute Component
 * 
 * Handles URL localization by converting English URLs to Vietnamese URLs
 * This component intercepts English URLs and redirects them to the appropriate Vietnamese routes
 */
const LocalizedRoute = ({ children }) => {
  const location = useLocation();
  
  // Check if the current path contains English segments that should be localized
  const pathSegments = location.pathname.split('/').filter(segment => segment.length > 0);
  const hasEnglishSegments = pathSegments.some(segment => isEnglishSegment(segment));
  
  if (hasEnglishSegments) {
    // Convert English path to Vietnamese
    const vietnamesePath = localizeUrl(location.pathname);
    
    // Only redirect if the path actually changed
    if (vietnamesePath !== location.pathname) {
      // Preserve search params and hash
      const searchParams = location.search;
      const hash = location.hash;
      
      // Redirect to the Vietnamese route with preserved params
      return <Navigate to={`${vietnamesePath}${searchParams}${hash}`} replace />;
    }
  }
  
  // If no English segments or no change needed, render children normally
  return children;
};

export default LocalizedRoute; 