import React, { createContext, useState, useContext, useEffect } from 'react';
import config from '../config/config';
import sseService from '../services/sseService';

const NovelStatusContext = createContext(null);

const NOVEL_STATUS_STORAGE_KEY = 'novelStatuses';
const NOVEL_STATUS_UPDATE_EVENT = 'novelStatusUpdate';

export const NovelStatusProvider = ({ children }) => {
  const [novelStatuses, setNovelStatuses] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem(NOVEL_STATUS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  });
  
  // Set up SSE connection for real-time status updates
  useEffect(() => {
    const handleStatusChange = (data) => {
      try {
        updateNovelStatus(data.id, data.status);
      } catch (error) {
        console.error('Error processing novel status change event:', error);
      }
    };
    
    // Add event listener
    sseService.addEventListener('novel_status_changed', handleStatusChange);
    
    // Clean up on unmount
    return () => {
      sseService.removeEventListener('novel_status_changed', handleStatusChange);
    };
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === NOVEL_STATUS_STORAGE_KEY) {
        const newStatuses = JSON.parse(event.newValue || '{}');
        setNovelStatuses(newStatuses);
      }
    };

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Custom event listener for same-tab updates
    const handleCustomEvent = (event) => {
      if (event.detail) {
        setNovelStatuses(event.detail);
      }
    };
    window.addEventListener(NOVEL_STATUS_UPDATE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(NOVEL_STATUS_UPDATE_EVENT, handleCustomEvent);
    };
  }, []);

  const updateNovelStatus = (novelId, status) => {
    const newStatuses = {
      ...novelStatuses,
      [novelId]: status
    };

    // Update localStorage
    localStorage.setItem(NOVEL_STATUS_STORAGE_KEY, JSON.stringify(newStatuses));
    
    // Update state in current tab
    setNovelStatuses(newStatuses);
    
    // Dispatch custom event for other instances in the same tab
    window.dispatchEvent(
      new CustomEvent(NOVEL_STATUS_UPDATE_EVENT, { detail: newStatuses })
    );
  };

  const value = {
    novelStatuses,
    setNovelStatuses,
    updateNovelStatus
  };

  return (
    <NovelStatusContext.Provider value={value}>
      {children}
    </NovelStatusContext.Provider>
  );
};

export const useNovelStatus = () => {
  const context = useContext(NovelStatusContext);
  if (!context) {
    throw new Error('useNovelStatus must be used within a NovelStatusProvider');
  }
  return context;
};

export default NovelStatusContext; 