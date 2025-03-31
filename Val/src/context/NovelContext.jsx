import React, { createContext, useState, useContext, useEffect } from 'react';

const NovelContext = createContext(null);

const NOVEL_STORAGE_KEY = 'novelUpdates';
const NOVEL_UPDATE_EVENT = 'novelUpdate';

export const NovelProvider = ({ children }) => {
  const [novelUpdates, setNovelUpdates] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem(NOVEL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === NOVEL_STORAGE_KEY) {
        const newUpdates = JSON.parse(event.newValue || '{}');
        setNovelUpdates(newUpdates);
      }
    };

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Custom event listener for same-tab updates
    const handleCustomEvent = (event) => {
      if (event.detail) {
        setNovelUpdates(event.detail);
      }
    };
    window.addEventListener(NOVEL_UPDATE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(NOVEL_UPDATE_EVENT, handleCustomEvent);
    };
  }, []);

  const updateNovel = (novelId, novelData) => {
    const newUpdates = {
      ...novelUpdates,
      [novelId]: {
        ...novelData,
        lastUpdated: Date.now()
      }
    };

    // Update localStorage
    localStorage.setItem(NOVEL_STORAGE_KEY, JSON.stringify(newUpdates));
    
    // Update state in current tab
    setNovelUpdates(newUpdates);
    
    // Dispatch custom event for other instances in the same tab
    window.dispatchEvent(
      new CustomEvent(NOVEL_UPDATE_EVENT, { detail: newUpdates })
    );
  };

  const value = {
    novelUpdates,
    setNovelUpdates,
    updateNovel
  };

  return (
    <NovelContext.Provider value={value}>
      {children}
    </NovelContext.Provider>
  );
};

export const useNovel = () => {
  const context = useContext(NovelContext);
  if (!context) {
    throw new Error('useNovel must be used within a NovelProvider');
  }
  return context;
};

export default NovelContext; 