/**
 * HotNovels Component
 *
 * Displays trending or popular novels in a sidebar widget including:
 * - Novel thumbnails
 * - Basic novel information
 * - View counts
 * - Update timestamps
 *
 * Features:
 * - Automatic updates
 * - View count tracking
 * - Compact layout
 * - Hover effects
 * - Loading states
 * - Error handling
 */

import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../styles/components/HotNovels.css';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import LoadingSpinner from './LoadingSpinner';
import { generateNovelUrl } from '../utils/slugUtils';
import { translateStatus, getStatusForDataAttr } from '../utils/statusTranslation';

// Helper function to get the appropriate display date for a chapter
// Use updatedAt if it's meaningfully different from createdAt (indicating the chapter was published later)
// Otherwise use createdAt for chapters that were created and published immediately
const getChapterDisplayDate = (chapter) => {
    if (!chapter) return null;
    
    const createdAt = new Date(chapter.createdAt);
    const updatedAt = new Date(chapter.updatedAt);
    
    // If either date is invalid, fall back to the valid one or null
    if (isNaN(createdAt.getTime()) && isNaN(updatedAt.getTime())) return null;
    if (isNaN(createdAt.getTime())) return chapter.updatedAt;
    if (isNaN(updatedAt.getTime())) return chapter.createdAt;
    
    // If updatedAt is more than 1 minute after createdAt, it's likely a meaningful update
    // This handles cases where chapters are switched from draft to published
    const timeDifference = updatedAt.getTime() - createdAt.getTime();
    const oneMinute = 60 * 1000;
    
    return timeDifference > oneMinute ? chapter.updatedAt : chapter.createdAt;
};

// Memoized novel card component for better performance
const NovelCard = memo(({ novel }) => {
    // Get latest chapter by sorting using smart display date logic
    const latestChapter = novel.chapters && novel.chapters.length > 0
        ? novel.chapters.sort((a, b) => {
            const dateA = new Date(getChapterDisplayDate(a));
            const dateB = new Date(getChapterDisplayDate(b));
            return dateB - dateA;
        })[0]
        : null;

    return (
        <Link to={generateNovelUrl(novel)} className="hot-novel-card">
            <div className="hot-novel-cover">
                <img
                    className="novel-card-image"
                    src={cdnConfig.getIllustrationUrl(novel.illustration)}
                    alt={novel.title}
                    onError={(e) => {
                        e.target.src = cdnConfig.getIllustrationUrl(null);
                    }}
                />
            </div>
            <div className="hot-novel-info">
                <h3 className="hot-novel-title">{novel.title}</h3>
                <span className="hot-novel-status" data-status={getStatusForDataAttr(novel.status)}>
                    {translateStatus(novel.status)}
                </span>
                {latestChapter && (
                    <span className="hot-novel-chapter">
                {latestChapter.title || `Chương ${latestChapter.chapterNumber}`}
          </span>
                )}
            </div>
        </Link>
    );
});

/**
 * HotNovels Component
 *
 * Sidebar component that displays trending or popular novels
 */
const HotNovels = () => {
  const [timeRange, setTimeRange] = useState('today');

  const { data, isLoading, error } = useQuery({
    queryKey: ['hotNovels', timeRange],
    queryFn: async () => {
      // Add cache busting parameter to force fresh data
      const cacheBuster = new Date().getTime();
      const response = await axios.get(`${config.backendUrl}/api/novels/hot?timeRange=${timeRange}&limit=15&_cb=${cacheBuster}`);
      return response.data.novels || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // Data remains fresh for 24 hours
    cacheTime: 0, // Don't cache at all
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchInterval: 24 * 60 * 60 * 1000 // Refresh every 24 hours
  });

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };

    if (isLoading) {
        return (
            <div className="hot-novels">
                <div className="hot-novels-header">
                    <h2 className="hot-novels-title">
                        NỔI BẬT
                        <span className="hot-icon">ᐁ</span>
                    </h2>
                    <div className="hot-novels-sort">
                        <span 
                            className={`sort-option ${timeRange === 'today' ? 'active' : ''}`}
                            onClick={() => handleTimeRangeChange('today')}>
                            Ngày
                        </span>
                        <span 
                            className={`sort-option ${timeRange === 'week' ? 'active' : ''}`}
                            onClick={() => handleTimeRangeChange('week')}>
                            Tuần
                        </span>
                        <span 
                            className={`sort-option ${timeRange === 'alltime' ? 'active' : ''}`}
                            onClick={() => handleTimeRangeChange('alltime')}>
                            Toàn thời gian
                        </span>
                    </div>
                </div>
                <div className="hot-novels-loading">                    <LoadingSpinner size="large" text="Đang tải truyện nổi bật..." />                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="hot-novels">
                <div className="hot-novels-header">
                    <h2 className="hot-novels-title">
                        TRUYỆN NỔI BẬT
                        <span className="hot-icon">ᐁ</span>
                    </h2>
                    <div className="hot-novels-sort">
                        <span 
                            className={`sort-option ${timeRange === 'today' ? 'active' : ''}`}
                            onClick={() => handleTimeRangeChange('today')}>
                            Ngày
                        </span>
                        <span 
                            className={`sort-option ${timeRange === 'week' ? 'active' : ''}`}
                            onClick={() => handleTimeRangeChange('week')}>
                            Tuần
                        </span>
                        <span 
                            className={`sort-option ${timeRange === 'alltime' ? 'active' : ''}`}
                            onClick={() => handleTimeRangeChange('alltime')}>
                            Toàn thời gian
                        </span>
                    </div>
                </div>
                <div className="hot-novels-error">Không thể tải truyện nổi bật</div>
            </div>
        );
    }

    return (
        <div className="hot-novels">
            <div className="hot-novels-header">
                <h2 className="hot-novels-title">
                    NỔI BẬT
                    <span className="hot-icon">ᐁ</span>
                </h2>
                <div className="hot-novels-sort">
                    <span 
                        className={`sort-option ${timeRange === 'today' ? 'active' : ''}`}
                        onClick={() => handleTimeRangeChange('today')}>
                        Ngày
                    </span>
                    <span 
                        className={`sort-option ${timeRange === 'week' ? 'active' : ''}`}
                        onClick={() => handleTimeRangeChange('week')}>
                        Tuần
                    </span>
                    <span 
                        className={`sort-option ${timeRange === 'alltime' ? 'active' : ''}`}
                        onClick={() => handleTimeRangeChange('alltime')}>
                        Toàn thời gian
                    </span>
                </div>
            </div>
            <div className="hot-novels-list">
                {data?.map((novel) => (
                    <NovelCard key={novel._id} novel={novel} />
                ))}
            </div>
        </div>
    );
};

export default HotNovels;