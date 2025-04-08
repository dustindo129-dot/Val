import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { processDescription } from '../../utils/helpers';
import { BookmarkIcon, BookmarkActiveIcon, HeartIcon, HeartFilledIcon, ViewsIcon, StarIcon } from './NovelIcons';
import api from '../../services/api';
import RatingModal from '../../components/RatingModal';
import { useBookmarks } from '../../context/BookmarkContext';

const NovelInfo = ({ novel, isLoading, readingProgress, chaptersData, userInteraction = {}, truncateHTML }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { updateBookmarkStatus } = useBookmarks();
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  
  // Create a safe local copy of userInteraction with defaults
  const safeUserInteraction = {
    liked: userInteraction?.liked || false,
    rating: userInteraction?.rating || null,
    bookmarked: userInteraction?.bookmarked || false
  };
  
  // Check if we have a nested novel object
  const novelData = novel?.novel || novel;
  const novelTitle = novelData?.title;
  const novelId = novelData?._id;  // Get the ID directly
  
  // Query for novel stats
  const { data: novelStats = { totalLikes: 0, totalRatings: 0, averageRating: '0.0' } } = useQuery({
    queryKey: ['novel-stats', novelId],
    queryFn: () => api.getNovelStats(novelId),
    enabled: !!novelId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Query for bookmarked chapter
  const { data: bookmarkData } = useQuery({
    queryKey: ['bookmarked-chapter', novelId, user?.id],
    queryFn: () => api.getBookmarkedChapter(novelId),
    enabled: !!novelId && !!user,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Fallback ID mechanism - use a ref to keep track of a valid ID
  const novelIdRef = useRef(novel?._id);
  
  // Update ref if we get a valid ID
  useEffect(() => {
    if (novelId) {
      novelIdRef.current = novelId;
    }
  }, [novelId]);
  
  // Mutations for bookmark and like toggling
  const bookmarkMutation = useMutation({
    mutationFn: () => {
      if (!novelId) {
        throw new Error("Cannot bookmark: Novel ID is missing");
      }
      return api.toggleBookmark(novelId);
    },
    onSuccess: (response) => {
      // Immediately update the novel data in the cache
      queryClient.setQueryData(['novel', novelId], (oldData) => {
        if (!oldData) return oldData;
        
        // Create a deep copy to avoid mutating the cache directly
        const newData = JSON.parse(JSON.stringify(oldData));
        
        // Update the isBookmarked status based on the response
        if (newData.novel) {
          newData.novel.isBookmarked = response.isBookmarked;
        } else if (newData._id) {
          newData.isBookmarked = response.isBookmarked;
        }
        
        return newData;
      });

      // Update the bookmark context
      updateBookmarkStatus(novelId, response.isBookmarked);
      
      // Invalidate queries to ensure fresh data on next fetch
      queryClient.invalidateQueries({
        queryKey: ['novel', novelId],
        refetchType: 'none'
      });

      // Also invalidate the user's bookmarks list
      if (user?.username) {
        queryClient.invalidateQueries({
          queryKey: ['bookmarks', user.username],
          refetchType: 'none'
        });
      }
    },
    onError: (error) => {
      console.error("Bookmark error:", error);
      alert("Failed to toggle bookmark. Please try again.");
    }
  });
  
  const likeMutation = useMutation({
    mutationFn: () => {
      if (!novelId) {
        throw new Error("Cannot like: Novel ID is missing");
      }
      return api.toggleLike(novelId);
    },
    onSuccess: (response) => {
      // Immediately update the like count in the cache
      queryClient.setQueryData(['novel', novelId], (oldData) => {
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
      queryClient.setQueryData(['userInteraction', user?.username, novelId], 
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
        queryKey: ['novel', novelId],
        refetchType: 'none'
      });
      
      queryClient.invalidateQueries({
        queryKey: ['userInteraction', user?.username, novelId],
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
    if (!novelId) {
      console.error("Cannot like: Novel ID is missing");
      alert("Error: Cannot identify the novel. Please try refreshing the page.");
      return;
    }

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
    if (!novelId) {
      console.error("Cannot bookmark: Novel ID is missing");
      alert("Error: Cannot identify the novel. Please try refreshing the page.");
      return;
    }
    
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
  
  // Calculate total chapter count
  const totalChapters = chaptersData?.chapters?.length || 0;
  
  // Format last updated date
  const lastUpdated = novelData.updatedAt 
    ? new Date(novelData.updatedAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Never';

  // Handle successful rating update
  const handleRatingSuccess = (response) => {
    // Update the novel data in the cache
    queryClient.setQueryData(['novel', novelId], (oldData) => {
      if (!oldData) return oldData;
      
      // Create a deep copy to avoid mutating the cache directly
      const newData = JSON.parse(JSON.stringify(oldData));
      
      // Update the ratings
      if (newData.novel) {
        newData.novel.ratings = {
          total: response.ratingsCount,
          value: response.ratingsCount * parseFloat(response.averageRating)
        };
      } else if (newData._id) {
        newData.ratings = {
          total: response.ratingsCount,
          value: response.ratingsCount * parseFloat(response.averageRating)
        };
      }
      
      return newData;
    });
    
    // Update user interaction in cache
    queryClient.setQueryData(['userInteraction', user?.username, novelId], 
      (oldData) => ({
        ...oldData,
        rating: response.rating
      })
    );
    
    setIsRatingModalOpen(false);
  };

  if (isLoading) {
    return <div className="novel-info-section loading">Loading novel information...</div>;
  }

  if (!novel) {
    return <div className="novel-info-section error">Novel not found</div>;
  }

  return (
    <>
      <style>
        {`
          .continue-reading-btn {
            background-color: #4a90e2;
            color: white;
            transition: all 0.3s ease;
          }
          
          .continue-reading-btn:hover:not(:disabled) {
            background-color: #357abd;
          }
          
          .continue-reading-btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            opacity: 0.7;
          }
          
          .continue-reading-btn svg {
            margin-right: 8px;
          }
        `}
      </style>

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
                        key={`genre-${genre}-${index}`}
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
            <div className="novel-detail-stat-item views-stat">
              <div className="stat-icon">
                <ViewsIcon />
              </div>
              <div className="stat-content">
                <div className="stat-value">{novelData.views?.total || 0}</div>
                <div className="stat-label">Views</div>
              </div>
            </div>
            
            {/* Likes */}
            <div className="novel-detail-stat-item likes-stat" onClick={toggleLike}>
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
                  {novelStats.totalLikes}
                </div>
                <div className="stat-label">Likes</div>
              </div>
            </div>
            
            {/* Ratings */}
            <div className="novel-detail-stat-item ratings-stat" onClick={handleRatingClick}>
              <div className="stat-icon">
                <StarIcon />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {novelStats.averageRating} <span className="rating-max">/ 5</span>
                </div>
                <div className="stat-label">{novelStats.totalRatings} Ratings</div>
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
            
            {/* Continue Reading / Latest Chapter */}
            {chaptersData?.chapters && chaptersData.chapters.length > 0 ? (
              bookmarkData?.bookmarkedChapter ? (
                <Link 
                  to={`/novel/${novelData._id}/chapter/${bookmarkData.bookmarkedChapter.id}`} 
                  className="action-button continue-reading-btn"
                  title={`Continue from: ${bookmarkData.bookmarkedChapter.title}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Continue Reading
                </Link>
              ) : (
                <button className="action-button continue-reading-btn" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Continue Reading
                </button>
              )
            ) : (
              <button className="action-button continue-reading-btn" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                No Chapters
              </button>
            )}
            
            {/* Bookmark Button */}
            <button 
              className={`action-button novel-bookmark-btn ${novelData.isBookmarked ? 'active' : ''}`}
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
              <div dangerouslySetInnerHTML={{ 
                __html: isDescriptionExpanded 
                  ? novelData.description 
                  : truncateHTML(novelData.description, 300)
              }} />
              {novelData.description && novelData.description.length > 300 && (
                <button className="read-more-btn" onClick={toggleDescription}>
                  {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>

            {/* Note Section */}
            {novelData.note && (
              <div className="note-section">
                <h2 className="mt-4">Announcement</h2>
                <div className="novel-note">
                  <div dangerouslySetInnerHTML={{ 
                    __html: isNoteExpanded 
                      ? novelData.note 
                      : truncateHTML(novelData.note, 300)
                  }} />
                  {novelData.note && novelData.note.length > 300 && (
                    <button className="read-more-btn" onClick={() => setIsNoteExpanded(!isNoteExpanded)}>
                      {isNoteExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
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
                  {novelData.active?.translator && novelData.active.translator.length > 0 ? (
                    novelData.active.translator.map((translator, index) => (
                      <span className="staff-name" key={`translator-${translator}-${index}`}>{translator}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Editor:</div>
                <div className="staff-members">
                  {novelData.active?.editor && novelData.active.editor.length > 0 ? (
                    novelData.active.editor.map((editor, index) => (
                      <span className="staff-name" key={`editor-${editor}-${index}`}>{editor}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Proofreader:</div>
                <div className="staff-members">
                  {novelData.active?.proofreader && novelData.active.proofreader.length > 0 ? (
                    novelData.active.proofreader.map((proofreader, index) => (
                      <span className="staff-name" key={`proofreader-${proofreader}-${index}`}>{proofreader}</span>
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
                  {novelData.inactive?.translator && novelData.inactive.translator.length > 0 ? (
                    novelData.inactive.translator.map((translator, index) => (
                      <span className="staff-name" key={`inactive-translator-${translator}-${index}`}>{translator}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Editor:</div>
                <div className="staff-members">
                  {novelData.inactive?.editor && novelData.inactive.editor.length > 0 ? (
                    novelData.inactive.editor.map((editor, index) => (
                      <span className="staff-name" key={`inactive-editor-${editor}-${index}`}>{editor}</span>
                    ))
                  ) : (
                    <span className="staff-empty">None</span>
                  )}
                </div>
              </div>
              
              <div className="staff-row">
                <div className="staff-label">Proofreader:</div>
                <div className="staff-members">
                  {novelData.inactive?.proofreader && novelData.inactive.proofreader.length > 0 ? (
                    novelData.inactive.proofreader.map((proofreader, index) => (
                      <span className="staff-name" key={`inactive-proofreader-${proofreader}-${index}`}>{proofreader}</span>
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

      {/* Rating Modal */}
      <RatingModal 
        novelId={novelId}
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        currentRating={safeUserInteraction.rating || 0}
        onRatingSuccess={handleRatingSuccess}
      />
    </>
  );
};

export default NovelInfo; 