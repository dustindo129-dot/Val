import React, { createContext, useContext, useState, useEffect } from 'react';

const FullscreenContext = createContext();

/**
 * Fullscreen Context Provider
 * 
 * Manages fullscreen reading mode state with localStorage persistence
 */
export const FullscreenProvider = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(() => {
    // Initialize from localStorage or default to false
    try {
      const savedFullscreen = localStorage.getItem('fullscreenMode');
      return savedFullscreen === 'true';
    } catch (error) {
      console.error('Error reading fullscreen preference from localStorage:', error);
      return false;
    }
  });

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = () => {
    setIsFullscreen(prevMode => {
      const newMode = !prevMode;
      
      try {
        // Save preference to localStorage
        localStorage.setItem('fullscreenMode', newMode.toString());
      } catch (error) {
        console.error('Error saving fullscreen preference to localStorage:', error);
      }
      
      return newMode;
    });
  };

  /**
   * Set fullscreen mode directly
   */
  const setFullscreen = (fullscreen) => {
    setIsFullscreen(fullscreen);
    
    try {
      localStorage.setItem('fullscreenMode', fullscreen.toString());
    } catch (error) {
      console.error('Error saving fullscreen preference to localStorage:', error);
    }
  };

  // Apply fullscreen class to body only on chapter pages when fullscreen mode is active
  useEffect(() => {
    const checkAndApplyFullscreen = () => {
      const isChapterPage = window.location.pathname.includes('/truyen/') && window.location.pathname.includes('/chuong/');
      
      if (isFullscreen && isChapterPage) {
        document.body.classList.add('fullscreen-reading');
      } else {
        document.body.classList.remove('fullscreen-reading');
      }
    };

    // Check initially
    checkAndApplyFullscreen();

    // Listen for navigation changes
    const handleLocationChange = () => {
      checkAndApplyFullscreen();
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      setTimeout(handleLocationChange, 0);
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      setTimeout(handleLocationChange, 0);
    };

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('fullscreen-reading');
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [isFullscreen]);

  const value = {
    isFullscreen,
    toggleFullscreen,
    setFullscreen
  };

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
};

/**
 * Hook to use fullscreen context
 */
export const useFullscreen = () => {
  const context = useContext(FullscreenContext);
  
  if (!context) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }
  
  return context;
};

export default FullscreenContext;
