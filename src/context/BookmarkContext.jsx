import React, { createContext, useState, useContext, useEffect } from 'react';

const BookmarkContext = createContext(null);

const BOOKMARK_STORAGE_KEY = 'bookmarkedNovels';
const BOOKMARK_UPDATE_EVENT = 'bookmarkUpdate';

export const BookmarkProvider = ({ children }) => {
  const [bookmarkedNovels, setBookmarkedNovelsInternal] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Wrapper function to ensure localStorage is always updated
  const setBookmarkedNovels = (newBookmarks) => {
    // Handle both direct arrays and function updates
    const resolvedBookmarks = typeof newBookmarks === 'function' 
      ? newBookmarks(bookmarkedNovels) 
      : newBookmarks;
    
    // Update localStorage
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(resolvedBookmarks));
    
    // Update state
    setBookmarkedNovelsInternal(resolvedBookmarks);
    
    // Dispatch custom event for other instances in the same tab
    window.dispatchEvent(
      new CustomEvent(BOOKMARK_UPDATE_EVENT, { detail: resolvedBookmarks })
    );
  };

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === BOOKMARK_STORAGE_KEY) {
        const newBookmarks = JSON.parse(event.newValue || '[]');
        setBookmarkedNovelsInternal(newBookmarks);
      }
    };

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Custom event listener for same-tab updates
    const handleCustomEvent = (event) => {
      if (event.detail) {
        setBookmarkedNovelsInternal(event.detail);
      }
    };
    window.addEventListener(BOOKMARK_UPDATE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(BOOKMARK_UPDATE_EVENT, handleCustomEvent);
    };
  }, []);

  const updateBookmarkStatus = (novelId, isBookmarked) => {
    const newBookmarks = isBookmarked
      ? [...new Set([...bookmarkedNovels, novelId])]
      : bookmarkedNovels.filter(id => id !== novelId);

    // Use the wrapper function to ensure consistency
    setBookmarkedNovels(newBookmarks);
  };

  const value = {
    bookmarkedNovels,
    setBookmarkedNovels,
    updateBookmarkStatus
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};

export default BookmarkContext; 