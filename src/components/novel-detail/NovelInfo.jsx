import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { processDescription } from '../../utils/helpers';
import { BookmarkIcon, BookmarkActiveIcon, HeartIcon, HeartFilledIcon, ViewsIcon, StarIcon } from './NovelIcons';
import api from '../../services/api';

const NovelInfo = ({ novel, isLoading, readingProgress, chaptersData, userInteraction = {}, truncateHTML }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Create a safe local copy of userInteraction with defaults
  const safeUserInteraction = {
    liked: userInteraction?.liked || false,
    rating: userInteraction?.rating || null
  };
  
  // Check if we have a nested novel object
  const novelData = novel?.novel || novel;
  const novelTitle = novelData?.title;
  
  // Fallback ID mechanism - use a ref to keep track of a valid ID
  const novelIdRef = useRef(novel?._id);
  
  // Update ref if we get a valid ID
  useEffect(() => {
    if (novel?._id) {
      novelIdRef.current = novel._id;
    }
  }, [novel]);
  
  // Mutations for bookmark and like toggling
  const bookmarkMutation = useMutation({
    mutationFn: () => {
      const novelId = novelIdRef.current;
      if (!novelId) {
        throw new Error("Cannot bookmark: Novel ID is missing");
      }
      return api.toggleBookmark(novelId);
    },
    onSuccess: () => {
      // Only invalidate relevant queries, not reading progress
      queryClient.invalidateQueries({
        queryKey: ['novel', novelIdRef.current],
        refetchType: 'active'
      });
    },
    onError: (error) => {
      console.error("Bookmark error:", error);
      alert("Failed to toggle bookmark. Please try again.");
    }
  });
  
  const likeMutation = useMutation({
    mutationFn: () => {
      const novelId = novelIdRef.current;
      if (!novelId) {
        throw new Error("Cannot like: Novel ID is missing");
      }
      return api.toggleLike(novelId);
    },
    onSuccess: (response) => {
      // Immediately update the like count in the cache
      queryClient.setQueryData(['novel', novelIdRef.current], (oldData) => {
        if (!oldData) return oldData;
        
        // Create a deep copy to avoid mutating the cache directly
        const newData = JSON.parse(JSON.stringify(oldData));
        
        // Update the like count based on the response
        if (newData.novel) {
          newData.novel.likes = response.likes;
        } else if (newData._id) {
          // Direct novel structure (not nested)
          newData.likes = response.likes;
        }
        
        return newData;
      });
      
      // Also directly update the user interaction data in the cache
      queryClient.setQueryData(['userInteraction', user?.username, novelIdRef.current], 
        (oldData) => {
          // If we don't have old data, create a new object
          const baseData = oldData || { liked: false, rating: null };
          
          // Create a new object with the updated liked status from the response
          return {
            ...baseData,
            liked: response.liked // The API returns the new liked status
          };
        }
      );
      
      // Don't refetch immediately - this prevents overriding our cache updates
      // Just invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({
        queryKey: ['novel', novelIdRef.current],
        refetchType: 'none'
      });
      
      queryClient.invalidateQueries({
        queryKey: ['userInteraction', user?.username, novelIdRef.current],
        refetchType: 'none'
      });
    },
    onError: (error) => {
      console.error("Like error:", error);
      alert("Failed to toggle like. Please try again.");
    }
  });
  
  // Handle like toggling
  const toggleLike = () => {
    // Use username presence instead of isAuthenticated flag
    if (!user?.username) {
      alert('Please log in to like novels');
      return;
    }
    
    // Validate token presence
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token missing when trying to like novel");
      alert("Authentication error. Please log out and log in again.");
      return;
    }
    
    // Check if we have a novel ID
    if (!novelIdRef.current) {
      console.error("Cannot like: Novel ID is missing");
      alert("Error: Cannot identify the novel. Please try refreshing the page.");
      return;
    }
    
    console.log("Toggling like for novel:", novelIdRef.current);
    likeMutation.mutate();
  };
  
  // Handle bookmark toggling
  const toggleBookmark = () => {
    // Use username presence instead of isAuthenticated flag
    if (!user?.username) {
      alert('Please log in to bookmark novels');
      return;
    }
    
    // Validate token presence
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token missing when trying to bookmark novel");
      alert("Authentication error. Please log out and log in again.");
      return;
    }
    
    // Check if we have a novel ID
    if (!novelIdRef.current) {
      console.error("Cannot bookmark: Novel ID is missing");
      alert("Error: Cannot identify the novel. Please try refreshing the page.");
      return;
    }
    
    console.log("Toggling bookmark for novel:", novelIdRef.current);
    bookmarkMutation.mutate();
  };
  
  // Handle rating click
  const handleRatingClick = () => {
    // Use username presence instead of isAuthenticated flag
    if (!user?.username) {
      alert('Please log in to rate novels');
      return;
    }
    setIsRatingModalOpen(true);
  };

  // Toggle description expand/collapse
  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };
  
  if (isLoading) {
    return <div className="novel-info-section loading">Loading novel information...</div>;
  }

  if (!novel) {
    return <div className="novel-info-section error">Novel not found</div>;
  }

  // Calculate average rating
  const averageRating = novelData.ratings?.total > 0 
    ? (novelData.ratings.value / novelData.ratings.total).toFixed(1) 
    : '0.0';
    
  // Calculate total chapter count
  const totalChapters = novelData.modules?.reduce((sum, module) => sum + (module.chapters?.length || 0), 0) || 0;
  
  // Format last updated date
  const lastUpdated = novelData.updatedAt 
    ? new Date(novelData.updatedAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Never';

  return (
    <>
      {/* Novel title and status header */}
      <div className="novel-header-wrapper">
        <h1 className="detail-page-novel-title">
          {novelTitle || "Novel Details"}
          {novelData?.status && (
            <span className="status-tag-inline" data-status={novelData.status}>
              {novelData.status}
            </span>
          )}
        </h1>
      </div>

      {/* Main content layout - novel info on left, staff on right */}
      <div className="novel-layout-container">
        {/* Left column with all novel info */}
        <div className="novel-main-content">
          {/* Main dark blue panel */}
          <div className="novel-main-panel">
            {/* Cover image with timestamp */}
            <div className="novel-cover-section">
              <img 
                src={novelData.illustration || "https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png"} 
                alt={`${novelData.title} cover`}
                className="detail-page-novel-cover"
              />
              <div className="novel-update-timestamp">
                Updated: {lastUpdated}
              </div>
            </div>

            {/* Novel details */}
            <div className="detail-page-novel-details">
              {novelData.alternativeTitles && novelData.alternativeTitles.length > 0 && (
                <div className="detail-row">
                  <span className="label">Alt Names:</span>
                  <span className="value">{novelData.alternativeTitles.join(', ')}</span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="label">Author:</span>
                <span className="value">{novelData.author || 'Unknown'}</span>
              </div>
              
              {novelData.illustrator && (
                <div className="detail-row">
                  <span className="label">Illustrator:</span>
                  <span className="value">{novelData.illustrator}</span>
                </div>
              )}
              
              {novelData.genres && novelData.genres.length > 0 && (
                <div className="detail-row">
                  <span className="label">Genres:</span>
                  <div className="genres-list">
                    {novelData.genres.map((genre, index) => (
                      <Link 
                        to={`/novels?genre=${encodeURIComponent(genre)}`} 
                        key={index} 
                        className="genre-tag"
                      >
                        {genre}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chapter count display */}
            <div className="novel-chapter-count">
              {totalChapters} Chapter{totalChapters !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Stats Row */}
          <div className="novel-stats-row">
            {/* Views */}
            <div className="stat-item views-stat">
              <div className="stat-icon">
                <ViewsIcon />
              </div>
              <div className="stat-content">
                <div className="stat-value">{novelData.views?.total || 0}</div>
                <div className="stat-label">Views</div>
              </div>
            </div>
            
            {/* Likes */}
            <div className="stat-item likes-stat" onClick={toggleLike}>
              <div className="stat-icon">
                {(safeUserInteraction.liked === true) ? (
                  <HeartFilledIcon />
                ) : (
                  <HeartIcon />
                )}
              </div>
              <div className="stat-content">
                <div 
                  className="stat-value"
                  data-testid="likes-count"
                >
                  {novelData.likes !== undefined ? novelData.likes : 0}
                </div>
                <div className="stat-label">Likes</div>
              </div>
            </div>
            
            {/* Ratings */}
            <div className="stat-item ratings-stat" onClick={handleRatingClick}>
              <div className="stat-icon">
                <StarIcon />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {averageRating} <span className="rating-max">/ 5</span>
                </div>
                <div className="stat-label">{novelData.ratings?.total || 0} Ratings</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="novel-action-row">
            {/* First Chapter */}
            {chaptersData?.chapters && chaptersData.chapters.length > 0 ? (
              <Link 
                to={`/novel/${novelData._id}/chapter/${chaptersData.chapters[0]?._id}`} 
                className="action-button first-chapter-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                First Chapter
              </Link>
            ) : (
              <button className="action-button first-chapter-btn" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                No Chapters
              </button>
            )}
            
            {/* Latest Chapter */}
            {chaptersData?.chapters && chaptersData.chapters.length > 0 ? (
              <Link 
                to={`/novel/${novelData._id}/chapter/${chaptersData.chapters[chaptersData.chapters.length - 1]?._id}`} 
                className="action-button latest-chapter-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Latest Chapter
              </Link>
            ) : (
              <button className="action-button latest-chapter-btn" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                No Chapters
              </button>
            )}
            
            {/* Bookmark Button */}
            <button 
              className={`action-button bookmark-btn ${novelData.isBookmarked ? 'active' : ''}`}
              onClick={toggleBookmark}
            >
              {novelData.isBookmarked ? (
                <>
                  <BookmarkActiveIcon size={20} />
                  Bookmarked
                </>
              ) : (
                <>
                  <BookmarkIcon size={20} />
                  Bookmark
                </>
              )}
            </button>
          </div>

          {/* Description Box */}
          <div className="description-box">
            <h2>Description</h2>
            <div className="novel-description">
              {isDescriptionExpanded 
                ? novelData.description 
                : truncateHTML(novelData.description, 300)}
              {novelData.description && novelData.description.length > 300 && (
                <button className="read-more-btn" onClick={toggleDescription}>
                  {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>
          </div>
          
          {/* Announcement Box */}
          {novelData.announcement && (
            <div className="announcement-box">
              <h2>Announcement</h2>
              <div className="novel-announcement">{processDescription(novelData.announcement)}</div>
            </div>
          )}
        </div>
        
        {/* Right column with staff info */}
        <div className="novel-staff-column">
          <div className="staff-info-box">
            <h2>Staff</h2>
            
            {/* Active Staff */}
            <div className="staff-section">
              <h3>Active Staff</h3>
              
              <div className="staff-row">
                <div className="staff-label">Translator:</div>
                <div className="staff-members">
                  {novelData.activeStaff?.translator && novelData.activeStaff.translator.length > 0 ? (
                    novelData.activeStaff.translator.map((translator, index) => (
                      <span className="staff-name" key={index}>{translator}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Editor:</div>
                <div className="staff-members">
                  {novelData.activeStaff?.editor && novelData.activeStaff.editor.length > 0 ? (
                    novelData.activeStaff.editor.map((editor, index) => (
                      <span className="staff-name" key={index}>{editor}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Proofreader:</div>
                <div className="staff-members">
                  {novelData.activeStaff?.proofreader && novelData.activeStaff.proofreader.length > 0 ? (
                    novelData.activeStaff.proofreader.map((proofreader, index) => (
                      <span className="staff-name" key={index}>{proofreader}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Inactive Staff */}
            <div className="staff-section">
              <h3>Inactive Staff</h3>
              
              <div className="staff-row">
                <div className="staff-label">Translator:</div>
                <div className="staff-members">
                  {novelData.inactiveStaff?.translator && novelData.inactiveStaff.translator.length > 0 ? (
                    novelData.inactiveStaff.translator.map((translator, index) => (
                      <span className="staff-name" key={index}>{translator}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Editor:</div>
                <div className="staff-members">
                  {novelData.inactiveStaff?.editor && novelData.inactiveStaff.editor.length > 0 ? (
                    novelData.inactiveStaff.editor.map((editor, index) => (
                      <span className="staff-name" key={index}>{editor}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Proofreader:</div>
                <div className="staff-members">
                  {novelData.inactiveStaff?.proofreader && novelData.inactiveStaff.proofreader.length > 0 ? (
                    novelData.inactiveStaff.proofreader.map((proofreader, index) => (
                      <span className="staff-name" key={index}>{proofreader}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Modal should be rendered by parent */}
      {isRatingModalOpen && setIsRatingModalOpen(false)}
    </>
  );
};

export default NovelInfo; 