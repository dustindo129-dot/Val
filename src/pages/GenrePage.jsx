/**
 * GenrePage Component
 * 
 * Displays novels filtered by genre in a grid layout with features for:
 * - Viewing all novels with a specific genre
 * - Displaying novel details (title, chapters, status)
 * - Navigation to novel details
 * 
 * Features:
 * - Loading states
 * - Error handling
 * - Empty state handling
 * - Responsive grid layout
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/UserBookmarks.css'; // Using the same styles
import config from '../config/config';

/**
 * GenrePage Component
 * 
 * Main component for displaying novels filtered by genre
 */
const GenrePage = () => {
  // Get genre from URL parameters
  const { genre } = useParams();
  
  // State management for novels, loading, and error states
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch novels with the specified genre when component mounts or genre changes
   */
  useEffect(() => {
    const fetchNovelsByGenre = async () => {
      try {
        // Fetch novels from API
        const response = await axios.get(`${config.backendUrl}/api/novels`);
        // Filter novels by genre (case-insensitive)
        const filteredNovels = response.data.novels.filter(novel => 
          novel.genres.some(g => g.toLowerCase() === genre.toLowerCase())
        );
        setNovels(filteredNovels);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch novels');
        setLoading(false);
      }
    };

    fetchNovelsByGenre();
  }, [genre]);

  // Capitalize first letter of genre for display
  const genreDisplay = genre.charAt(0).toUpperCase() + genre.slice(1);

  // Display loading state
  if (loading) {
    return (
      <div className="bookmarks-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading novels...</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="bookmarks-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmarks-container">
      {/* Header section with genre name and novel count */}
      <div className="bookmarks-header">
        <h1>Genre: {genreDisplay}</h1>
        <p>{novels.length} Novel(s)</p>
      </div>

      {/* Empty state or novels list */}
      {novels.length === 0 ? (
        <div className="no-bookmarks">
          <p>No novels found in this genre.</p>
          <Link to="/novel-directory/page/1" className="browse-novels-btn">
            Browse All Novels
          </Link>
        </div>
      ) : (
        <div className="bookmarks-list">
          {/* Map through novels to display each novel */}
          {novels.map(novel => (
            <div key={novel._id} className="bookmark-item">
              <Link to={`/novel/${novel._id}`} className="novel-link">
                <img 
                  src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'} 
                  alt={novel.title} 
                  className="bookmark-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png';
                  }}
                />
                <div className="bookmark-info">
                  <span className="bookmark-title">{novel.title}</span>
                  <span className="bookmark-latest-chapter">
                    <span>Chapter {novel.chapters?.length || 0}</span>
                    <span className="separator"> • </span>
                    <span>{novel.status}</span>
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenrePage; 