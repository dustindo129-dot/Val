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

import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/components/HotNovels.css';
import config from '../config/config';

// Memoized novel card component for better performance
const NovelCard = memo(({ novel }) => {
  const latestChapter = novel.chapters?.[0];
  
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
            Chapter {latestChapter.chapterNumber}
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
  const [hotNovels, setHotNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let refreshInterval;

    const fetchHotNovels = async () => {
      try {
        const response = await axios.get(`${config.backendUrl}/api/novels/hot`);
        if (mounted) {
          setHotNovels(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to fetch hot novels');
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchHotNovels();

    // Refresh every 30 seconds instead of 5 seconds
    refreshInterval = setInterval(fetchHotNovels, 30000);

    return () => {
      mounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  if (loading) {
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
        <div className="hot-novels-error">{error}</div>
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
        {hotNovels.map((novel) => (
          <NovelCard key={novel._id} novel={novel} />
        ))}
      </div>
    </div>
  );
};

export default HotNovels; 