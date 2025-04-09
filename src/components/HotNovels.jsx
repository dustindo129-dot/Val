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

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../styles/components/HotNovels.css';
import config from '../config/config';

// Memoized novel card component for better performance
const NovelCard = memo(({ novel }) => {
    // Get latest chapter by sorting
    const latestChapter = novel.chapters && novel.chapters.length > 0
        ? novel.chapters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : null;

    return (
        <Link to={`/novel/${novel._id}`} className="hot-novel-card">
            <div className="hot-novel-cover">
                <img
                    src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'}
                    alt={novel.title}
                    loading="lazy"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png';
                    }}
                />
            </div>
            <div className="hot-novel-info">
                <h3 className="hot-novel-title">{novel.title}</h3>
                <span className="hot-novel-status" data-status={novel.status || 'Ongoing'}>
          {novel.status || 'Ongoing'}
        </span>
                {latestChapter && (
                    <span className="hot-novel-chapter">
            {latestChapter.title || `Chapter ${latestChapter.chapterNumber}`}
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['hotNovels'],
    queryFn: async () => {
      // Add cache busting parameter to force fresh data
      const cacheBuster = new Date().getTime();
      const response = await axios.get(`${config.backendUrl}/api/novels/hot?_cb=${cacheBuster}`);
      return response.data.novels || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // Data remains fresh for 24 hours
    cacheTime: 0, // Don't cache at all
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchInterval: 24 * 60 * 60 * 1000 // Refresh every 24 hours
  });

    if (isLoading) {
        return (
            <div className="hot-novels">
                <h2 className="hot-novels-title">
                    HOT NOVEL
                    <span className="hot-icon">★</span>
                </h2>
                <div className="hot-novels-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading hot novels...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="hot-novels">
                <h2 className="hot-novels-title">
                    HOT NOVEL
                    <span className="hot-icon">★</span>
                </h2>
                <div className="hot-novels-error">Failed to load hot novels</div>
            </div>
        );
    }

    return (
        <div className="hot-novels">
            <h2 className="hot-novels-title">
                HOT NOVEL
                <span className="hot-icon">★</span>
            </h2>
            <div className="hot-novels-list">
                {data?.map((novel) => (
                    <NovelCard key={novel._id} novel={novel} />
                ))}
            </div>
        </div>
    );
};

export default HotNovels;