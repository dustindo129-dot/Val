import React, { createContext, useState, useContext, useEffect } from 'react';

const BookmarkContext = createContext(null);

const BOOKMARK_STORAGE_KEY = 'bookmarkedNovels';
const BOOKMARK_UPDATE_EVENT = 'bookmarkUpdate';

export const BookmarkProvider = ({ children }) => {
  const [bookmarkedNovels, setBookmarkedNovels] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === BOOKMARK_STORAGE_KEY) {
        const newBookmarks = JSON.parse(event.newValue || '[]');
        setBookmarkedNovels(newBookmarks);
      }
    };

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Custom event listener for same-tab updates
    const handleCustomEvent = (event) => {
      if (event.detail) {
        setBookmarkedNovels(event.detail);
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

    // Update localStorage
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(newBookmarks));
    
    // Update state in current tab
    setBookmarkedNovels(newBookmarks);
    
    // Dispatch custom event for other instances in the same tab
    window.dispatchEvent(
      new CustomEvent(BOOKMARK_UPDATE_EVENT, { detail: newBookmarks })
    );
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