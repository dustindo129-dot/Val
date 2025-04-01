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
import '../styles/UserBookmarks.css'; // We'll reuse the same styles
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

  // Display loading state
  if (loading) return <div className="loading">Loading novels...</div>;
  // Display error state
  if (error) return <div className="error">{error}</div>;

  // Capitalize first letter of genre for display
  const genreDisplay = genre.charAt(0).toUpperCase() + genre.slice(1);

  return (
    <div className="bookmarks-container">
      {/* Header section with genre name and novel count */}
      <div className="bookmarks-header">
        <h1>Genre: {genreDisplay}</h1>
        <p>{novels.length} Novel(s)</p>
      </div>

      {/* Empty state or novels grid */}
      {novels.length === 0 ? (
        <div className="no-bookmarks">
          <p>No novels found in this genre.</p>
        </div>
      ) : (
        <div className="bookmarks-grid">
          {/* Map through novels to display each novel */}
          {novels.map(novel => (
            <div key={novel._id} className="bookmark-card">
              {/* Novel link with cover image and details */}
              <Link to={`/novel/${novel._id}`} className="novel-link">
                <img 
                  src={novel.illustration} 
                  alt={novel.title} 
                  className="bookmark-novel-cover"
                />
                <div className="bookmark-novel-info">
                  <h3 className="bookmark-novel-title">{novel.title}</h3>
                  <p className="bookmark-novel-details">
                    <span>Chapter {novel.chapters?.length || 0}</span>
                    <span className="separator">•</span>
                    <span>{novel.status}</span>
                  </p>
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