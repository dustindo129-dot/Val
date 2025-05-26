/**
 * RecentlyRead Component
 *
 * Displays the latest chapters a user has recently read including:
 * - Chapter thumbnails (novel covers)
 * - Novel title, module title, and chapter title
 * - Quick navigation back to reading position
 *
  * Features: * - Shows up to 5 recently read chapters * - One chapter per novel (most recent)
 * - Automatic updates when user reads chapters
 * - Loading states and error handling
 * - Always visible on homepage with appropriate messages
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/components/RecentlyRead.css';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import LoadingSpinner from './LoadingSpinner';
import { generateChapterUrl } from '../utils/slugUtils';

// Memoized recently read card component for better performance
const RecentlyReadCard = memo(({ readItem }) => {
  // Defensive programming - handle both old and new data structures
  const chapter = readItem.chapter || { 
    _id: readItem.chapterId, 
    title: readItem.chapterTitle 
  };
  const novel = readItem.novel || { 
    _id: readItem.novelId, 
    title: readItem.novelTitle,
    illustration: readItem.novelCover 
  };
  const module = readItem.module || { 
    title: readItem.moduleTitle 
  };

  // Safety checks to prevent errors
  if (!chapter || !novel || !chapter._id || !novel._id) {
    console.warn('Invalid readItem structure:', readItem);
    return null;
  }
  
  return (
    <Link to={generateChapterUrl(novel, chapter)} className="recently-read-card">
      <div className="recently-read-cover">
        <img
          className="recently-read-image"
          src={novel.illustration || cdnConfig.defaultImages.novel}
          alt={novel.title || 'Novel'}
          onError={(e) => {
            e.target.src = cdnConfig.defaultImages.novel;
          }}
        />
      </div>
      <div className="recently-read-info">
        <h4 className="recently-read-novel-title">{novel.title || 'Unknown Novel'}</h4>
        {module && module.title && (
          <span className="recently-read-module-title">{module.title}</span>
        )}
        <span className="recently-read-chapter-title">
          {chapter.title || `Chương ${chapter.chapterNumber || 'Unknown'}`}
        </span>
      </div>
    </Link>
  );
});

/**
 * RecentlyRead Component
 *
 * Sidebar component that displays recently read chapters for logged-in users
 */
const RecentlyRead = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recentlyRead', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
                const response = await axios.get(          `${config.backendUrl}/api/userchapterinteractions/recently-read?limit=5`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        return response.data || [];
      } catch (err) {
        console.error('Recently Read API Error:', err);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
    retry: false // Don't retry on error to prevent continuous API calls
  });

  if (isLoading) {
    return (
      <div className="recently-read">
        <h2 className="recently-read-title">
          Đọc gần đây
        </h2>
        <div className="recently-read-loading">
          <LoadingSpinner size="large" text="Đang tải lịch sử đọc..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recently-read">
        <h2 className="recently-read-title">
          Đọc gần đây
        </h2>
        <div className="recently-read-error">Không thể tải lịch sử đọc</div>
      </div>
    );
  }

  return (
    <div className="recently-read">
      <h2 className="recently-read-title">
        Đọc gần đây
      </h2>
      <div className="recently-read-list">
        {!user ? (
          <div className="no-recently-read-message">
            Đăng nhập để xem lịch sử đọc của bạn
          </div>
        ) : data && data.length > 0 ? (
          data
            .filter(readItem => readItem && (readItem.chapter || readItem.chapterId) && (readItem.novel || readItem.novelId))
            .map((readItem, index) => (
              <RecentlyReadCard 
                key={`${readItem.novelId || readItem.novel?._id}-${readItem.chapterId || readItem.chapter?._id}-${index}`} 
                readItem={readItem} 
              />
            ))
        ) : (
          <div className="no-recently-read-message">
            Bạn chưa đọc chương nào gần đây
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentlyRead; 