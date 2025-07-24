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
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/components/RecentlyRead.css';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import LoadingSpinner from './LoadingSpinner';
import { generateChapterUrl } from '../utils/slugUtils';
import { getAuthHeaders } from '../utils/auth';

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
                      src={cdnConfig.getIllustrationUrl(novel.illustration)}
          alt={novel.title || 'Novel'}
          onError={(e) => {
            e.target.src = cdnConfig.getIllustrationUrl(null);
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
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
          return [];
        }
        
        const response = await axios.get(
          `${config.backendUrl}/api/userchapterinteractions/recently-read?limit=5&sort=lastReadAt`,
          { headers }
        );
        
        // Filter and sort the data to ensure proper order
        const filteredData = (response.data || []).filter(readItem => 
          readItem && (readItem.chapter || readItem.chapterId) && (readItem.novel || readItem.novelId)
        );
        
        const sortedData = filteredData.sort((a, b) => {
          const dateA = new Date(a.lastReadAt || a.updatedAt || 0);
          const dateB = new Date(b.lastReadAt || b.updatedAt || 0);
          return dateB - dateA;
        });
        
        const finalData = sortedData.slice(0, 5);
        
        return finalData;
      } catch (err) {
        console.error('Recently Read API Error:', err);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 0, // Always consider data stale for immediate updates
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Turn off to reduce race conditions
    refetchOnMount: true, // Refetch when component mounts (when returning to homepage)
    refetchOnReconnect: true, // Refetch when reconnecting
    refetchInterval: false, // Remove automatic interval refetching
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
            .slice(0, 5) // Ensure we only show the 5 most recent (data is already sorted)
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