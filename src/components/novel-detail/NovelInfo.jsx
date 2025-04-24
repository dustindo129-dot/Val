import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { processDescription } from '../../utils/helpers';
import { BookmarkIcon, BookmarkActiveIcon, HeartIcon, HeartFilledIcon, ViewsIcon, StarIcon } from './NovelIcons';
import api from '../../services/api';
import RatingModal from '../../components/RatingModal';
import { useBookmarks } from '../../context/BookmarkContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFacebookF, 
  faTwitter, 
  faPinterestP, 
  faTelegramPlane 
} from '@fortawesome/free-brands-svg-icons';
import { 
  faEye, 
  faHeart as faHeartSolid, 
  faStar as faStarSolid, 
  faChevronRight, 
  faForward, 
  faBookmark as faBookmarkSolid,
  faLanguage,
  faEdit,
  faCheckDouble
} from '@fortawesome/free-solid-svg-icons';
import { 
  faHeart, 
  faStar, 
  faBookmark 
} from '@fortawesome/free-regular-svg-icons';
import cdnConfig from '../../config/bunny';

const NovelInfo = ({ novel, isLoading, readingProgress, chaptersData, userInteraction = {}, truncateHTML }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { updateBookmarkStatus } = useBookmarks();
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [lastLikeTime, setLastLikeTime] = useState(0);
  const LIKE_COOLDOWN = 500; // 500ms cooldown between likes
  
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
          newData.novel.isBookmarked = response.bookmarked;
        } else if (newData._id) {
          newData.isBookmarked = response.bookmarked;
        }
        
        return newData;
      });

      // Update the userInteraction data in the cache
      queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
        ...old,
        bookmarked: response.bookmarked
      }));

      // Update the bookmark context
      updateBookmarkStatus(novelId, response.bookmarked);
      
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
    mutationFn: () => api.toggleLike(novelId),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['novel-stats', novelId]);
      await queryClient.cancelQueries(['userInteraction', user?.username, novelId]);

      // Snapshot the previous values
      const previousStats = queryClient.getQueryData(['novel-stats', novelId]);
      const previousInteraction = queryClient.getQueryData(['userInteraction', user?.username, novelId]);

      // Optimistically update the like status and count
      const willBeLiked = !(previousInteraction?.liked);
      
      queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
        ...old,
        liked: willBeLiked
      }));

      queryClient.setQueryData(['novel-stats', novelId], old => ({
        ...old,
        totalLikes: willBeLiked ? (old.totalLikes + 1) : (old.totalLikes - 1)
      }));

      // Return a context object with the snapshotted values
      return { previousStats, previousInteraction };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context we saved to roll back
      if (context?.previousStats) {
        queryClient.setQueryData(['novel-stats', novelId], context.previousStats);
      }
      if (context?.previousInteraction) {
        queryClient.setQueryData(['userInteraction', user?.username, novelId], context.previousInteraction);
      }
    },
    onSuccess: (response) => {
      // Update both caches with the actual response data
      queryClient.setQueryData(['novel-stats', novelId], old => ({
        ...old,
        totalLikes: response.totalLikes
      }));
      
      queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
        ...old,
        liked: response.liked
      }));

      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['novel', novelId],
        refetchType: 'none'
      });
      
      queryClient.invalidateQueries({
        queryKey: ['novel-stats', novelId],
        refetchType: 'none'
      });
    }
  });
  
  // Handle like toggling with debounce
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

    // Add debouncing
    const now = Date.now();
    if (now - lastLikeTime < LIKE_COOLDOWN) {
      return; // Ignore click if too soon after last click
    }
    setLastLikeTime(now);

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
  const toggleDescription = (e) => {
    if (e) e.preventDefault();
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

  // Format time ago for display
  const formatTimeAgo = (date) => {
    if (!date) return '';

    try {
      const now = new Date();
      const updateDate = new Date(date);
      const diffInMs = now - updateDate;
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return `${diffInMinutes || 0} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  // Handle social share
  const handleShare = (platform, e) => {
    if (e) e.preventDefault();
    
    // Get current URL and title
    const url = window.location.href;
    const title = novelTitle || 'Novel';
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'pinterest':
        const image = novelData.illustration || '';
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(title)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      default:
        return;
    }
    
    // Open the share dialog
    if (shareUrl) {
      window.open(shareUrl, 'ShareWindow', 'height=450, width=550, toolbar=0, menubar=0, directories=0, scrollbars=0');
    }
  };

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

  // Determine if the novel is bookmarked
  const isBookmarked = safeUserInteraction.bookmarked || false;
  // Determine if the novel is liked
  const isLiked = safeUserInteraction.liked || false;
  // Current user rating
  const currentRating = safeUserInteraction.rating || 0;
  
  return (
    <>
      {/* Novel Header with Title and Social Share */}
      <div className="rd-novel-header">
        <div className="rd-novel-title-wrapper">
          <h1 className="rd-novel-title">
            {novelTitle || 'Loading...'}
          </h1>
          <span className={`rd-status-badge rd-status-${novelData.status?.toLowerCase() || 'ongoing'}`}>
            {novelData.status || 'Ongoing'}
          </span>
        </div>

        <div className="rd-social-share">
          <a href="#" className="rd-share-btn rd-facebook" title="Share on Facebook" onClick={(e) => handleShare('facebook', e)}>
            <FontAwesomeIcon icon={faFacebookF} />
          </a>
          <a href="#" className="rd-share-btn rd-twitter" title="Share on Twitter" onClick={(e) => handleShare('twitter', e)}>
            <FontAwesomeIcon icon={faTwitter} />
          </a>
          <a href="#" className="rd-share-btn rd-pinterest" title="Share on Pinterest" onClick={(e) => handleShare('pinterest', e)}>
            <FontAwesomeIcon icon={faPinterestP} />
          </a>
          <a href="#" className="rd-share-btn rd-telegram" title="Share on Telegram" onClick={(e) => handleShare('telegram', e)}>
            <FontAwesomeIcon icon={faTelegramPlane} />
          </a>
        </div>
      </div>

      {/* Novel Content Area with Main Content and Sidebar */}
      <div className="rd-novel-content">
        <div className="rd-novel-main">
          {/* Novel Card with Cover and Info */}
          <div className="rd-novel-card">
            {/* Header with cover and info */}
            <div className="rd-novel-header-content">
              <div className="rd-novel-cover">
                <img
                  src={novelData.illustration || 'https://Valvrareteam.b-cdn.net/%C6%A0%20l%E1%BB%97i%20h%C3%ACnh%20m%E1%BA%A5t%20r%E1%BB%93i.png'}
                  alt={novelData.title}
                  className="rd-cover-image"
                  onError={(e) => {
                    e.target.src = cdnConfig.defaultImages.novel;
                  }}
                />
                <div className="rd-update-time">
                  Updated: {formatTimeAgo(novelData.updatedAt)}
                </div>
              </div>

              <div className="rd-novel-info">
                <div className="rd-chapter-count">
                  <div className="rd-chapter-count-label">
                    CHAPTERS
                  </div>
                  <div className="rd-chapter-count-value">
                    {totalChapters}
                  </div>
                </div>

                {novelData.alternativeTitles && novelData.alternativeTitles.length > 0 && (
                  <h2 className="rd-alt-title">
                    Alt name(s): {novelData.alternativeTitles.join('; ')}
                  </h2>
                )}

                <div className="rd-info-rows">
                  <div className="rd-info-row">
                    <div className="rd-info-label">Author:</div>
                    <div className="rd-info-value">
                      <span className="rd-author-name">{novelData.author || 'Unknown'}</span>
                    </div>
                  </div>

                  {novelData.illustrator && (
                    <div className="rd-info-row">
                      <div className="rd-info-label">Illustrator:</div>
                      <div className="rd-info-value">
                        <span className="rd-author-name">{novelData.illustrator || (novelData.artist || 'None')}</span>
                      </div>
                    </div>
                  )}

                  {novelData.genres && novelData.genres.length > 0 && (
                    <div className="rd-genres-row">
                      <div className="rd-genres-label">Genres:</div>
                      <div className="rd-info-value">
                        <div className="rd-genres-list">
                          {(() => {
                            // Sort genres using the same logic as NovelList
                            const sortedGenres = (novelData.genres || []).map(genre => {
                              if (genre.includes('Novel')) {
                                let className = '';
                                if (genre.includes('Japanese')) className = 'japanese-novel';
                                else if (genre.includes('Chinese')) className = 'chinese-novel';
                                else if (genre.includes('Korean')) className = 'korean-novel';
                                else if (genre.includes('English')) className = 'english-novel';
                                else if (genre.includes('Vietnamese')) className = 'vietnamese-novel';

                                return {
                                  name: genre,
                                  type: 'format-origin',
                                  class: className
                                };
                              } else if (genre === 'Mature') {
                                return {
                                  name: genre,
                                  type: 'mature',
                                  class: 'mature'
                                };
                              } else if (['Shounen', 'Shoujo', 'Seinen', 'Josei'].includes(genre)) {
                                return {
                                  name: genre,
                                  type: 'target-audience',
                                  class: ''
                                };
                              } else {
                                return {
                                  name: genre,
                                  type: 'other',
                                  class: ''
                                };
                              }
                            }).sort((a, b) => {
                              const typeOrder = {
                                'format-origin': 1,
                                'mature': 2,
                                'target-audience': 3,
                                'other': 4
                              };
                              return typeOrder[a.type] - typeOrder[b.type];
                            });

                            return sortedGenres.map((genre, index) => (
                              <span 
                                className={`rd-genre-tag ${genre.class}`}
                                key={index}
                              >
                                {genre.name}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rd-card-footer">
              {/* Stats Row */}
              <div className="rd-stats-row">
                <div className="rd-stat-item">
                  <div className="rd-stat-icon">
                    <FontAwesomeIcon icon={faEye} />
                  </div>
                  <div className="rd-stat-value">{novelData.views?.total?.toLocaleString() || '0'} Views</div>
                </div>

                <div className="rd-stat-item" onClick={toggleLike} style={{ cursor: 'pointer' }}>
                  <div className="rd-stat-icon">
                    <FontAwesomeIcon icon={isLiked ? faHeartSolid : faHeart} style={{ color: isLiked ? '#e74c3c' : undefined }} />
                  </div>
                  <div className="rd-stat-value">{novelStats.totalLikes?.toLocaleString() || '0'} Likes</div>
                </div>

                <div className="rd-stat-item" onClick={handleRatingClick} style={{ cursor: 'pointer' }}>
                  <div className="rd-stat-icon">
                    <FontAwesomeIcon icon={currentRating > 0 ? faStarSolid : faStar} style={{ color: currentRating > 0 ? '#f1c40f' : undefined }} />
                  </div>
                  <div className="rd-stat-value">
                    {novelStats.averageRating || '0'}/5, {novelStats.totalRatings?.toLocaleString() || '0'} Rates
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="rd-actions-row">
                {chaptersData?.chapters?.length > 0 ? (
                  <Link 
                    to={`/novel/${novelId}/chapter/${chaptersData.chapters[0]?._id}`} 
                    className="rd-btn rd-btn-primary"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                    First Chapter
                  </Link>
                ) : (
                  <button className="rd-btn rd-btn-primary" disabled>
                    <FontAwesomeIcon icon={faChevronRight} />
                    No Chapters
                  </button>
                )}

                {chaptersData?.chapters?.length > 0 ? (
                  bookmarkData?.bookmarkedChapter ? (
                    <Link 
                      to={`/novel/${novelId}/chapter/${bookmarkData.bookmarkedChapter.id}`} 
                      className="rd-btn rd-btn-primary"
                      title={`Continue from: ${bookmarkData.bookmarkedChapter.title}`}
                    >
                      <FontAwesomeIcon icon={faForward} />
                      Continue Reading
                    </Link>
                  ) : (
                    <Link 
                      to={`/novel/${novelId}/chapter/${chaptersData.chapters[chaptersData.chapters.length - 1]?._id}`} 
                      className="rd-btn rd-btn-primary"
                    >
                      <FontAwesomeIcon icon={faForward} />
                      Latest Chapter
                    </Link>
                  )
                ) : (
                  <button className="rd-btn rd-btn-primary" disabled>
                    <FontAwesomeIcon icon={faForward} />
                    No Chapters
                  </button>
                )}

                <button 
                  className={`rd-btn rd-btn-bookmark ${isBookmarked ? 'active' : ''}`}
                  onClick={toggleBookmark}
                >
                  <FontAwesomeIcon icon={isBookmarked ? faBookmarkSolid : faBookmark} />
                  {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="rd-description-section">
            <h2 className="rd-description-title">DESCRIPTION</h2>
            <div className={`rd-description-content ${isDescriptionExpanded ? 'expanded' : ''}`}>
              <div dangerouslySetInnerHTML={{ 
                __html: isDescriptionExpanded 
                  ? novelData.description 
                  : truncateHTML(novelData.description, 300) 
              }} />
            </div>
            <a href="#" className="rd-show-toggle" onClick={toggleDescription}>
              {isDescriptionExpanded ? 'Show less' : 'Read more'}
            </a>
          </div>
        </div>

        <div className="rd-novel-sidebar">
          {/* Staff Section */}
          <div className="rd-section">
            <h3 className="rd-section-title">STAFF</h3>
            <div className="rd-section-content">
              {/* Active Staff */}
              <div className="rd-staff-category rd-active-category">Active</div>

              {/* Translators */}
              <div className="rd-staff-role rd-role-translator">
                <span className="rd-role-badge rd-translator-badge">
                  <FontAwesomeIcon icon={faLanguage} /> Translator:
                </span>
              </div>
              <div className="rd-staff-members">
                {novelData.active?.translator && novelData.active.translator.length > 0 ? (
                  novelData.active.translator.map((translator, index) => (
                    <a href="#" className="rd-staff-name" key={index}>
                      {translator}
                    </a>
                  ))
                ) : (
                  <span className="rd-staff-empty">None</span>
                )}
              </div>

              {/* Editors */}
              <div className="rd-staff-role rd-role-editor">
                <span className="rd-role-badge rd-editor-badge">
                  <FontAwesomeIcon icon={faEdit} /> Editor:
                </span>
              </div>
              <div className="rd-staff-members">
                {novelData.active?.editor && novelData.active.editor.length > 0 ? (
                  novelData.active.editor.map((editor, index) => (
                    <a href="#" className="rd-staff-name" key={index}>
                      {editor}
                    </a>
                  ))
                ) : (
                  <span className="rd-staff-empty">None</span>
                )}
              </div>

              {/* Proofreaders */}
              <div className="rd-staff-role rd-role-qc">
                <span className="rd-role-badge rd-qc-badge">
                  <FontAwesomeIcon icon={faCheckDouble} /> Proofreader:
                </span>
              </div>
              <div className="rd-staff-members">
                {novelData.active?.proofreader && novelData.active.proofreader.length > 0 ? (
                  novelData.active.proofreader.map((proofreader, index) => (
                    <a href="#" className="rd-staff-name" key={index}>
                      {proofreader}
                    </a>
                  ))
                ) : (
                  <span className="rd-staff-empty">None</span>
                )}
              </div>

              {/* Inactive Staff */}
              {(novelData.inactive?.translator?.length > 0 ||
                novelData.inactive?.editor?.length > 0 ||
                novelData.inactive?.proofreader?.length > 0) && (
                <>
                  <div className="rd-staff-category rd-inactive-category">Inactive</div>
                  
                  {/* Inactive Translators */}
                  {novelData.inactive?.translator && novelData.inactive.translator.length > 0 && (
                    <>
                      <div className="rd-staff-role rd-role-translator">
                        <span className="rd-role-badge rd-translator-badge">
                          <FontAwesomeIcon icon={faLanguage} /> Translator:
                        </span>
                      </div>
                      <div className="rd-staff-members">
                        {novelData.inactive.translator.map((translator, index) => (
                          <a href="#" className="rd-staff-name" key={index}>
                            {translator}
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* Inactive Editors */}
                  {novelData.inactive?.editor && novelData.inactive.editor.length > 0 && (
                    <>
                      <div className="rd-staff-role rd-role-editor">
                        <span className="rd-role-badge rd-editor-badge">
                          <FontAwesomeIcon icon={faEdit} /> Editor:
                        </span>
                      </div>
                      <div className="rd-staff-members">
                        {novelData.inactive.editor.map((editor, index) => (
                          <a href="#" className="rd-staff-name" key={index}>
                            {editor}
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* Inactive Proofreaders */}
                  {novelData.inactive?.proofreader && novelData.inactive.proofreader.length > 0 && (
                    <>
                      <div className="rd-staff-role rd-role-qc">
                        <span className="rd-role-badge rd-qc-badge">
                          <FontAwesomeIcon icon={faCheckDouble} /> Proofreader:
                        </span>
                      </div>
                      <div className="rd-staff-members">
                        {novelData.inactive.proofreader.map((proofreader, index) => (
                          <a href="#" className="rd-staff-name" key={index}>
                            {proofreader}
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Announcement Section */}
          {novelData.note && (
            <div className="rd-section">
              <h3 className="rd-section-title">ANNOUNCEMENT</h3>
              <div className="rd-section-content rd-announcement">
                <div dangerouslySetInnerHTML={{ 
                  __html: isNoteExpanded 
                    ? novelData.note 
                    : truncateHTML(novelData.note, 300) 
                }} />
                {novelData.note && (
                  (() => {
                    const div = document.createElement('div');
                    div.innerHTML = novelData.note;
                    const fullText = div.textContent || div.innerText || '';
                    return fullText.length > 300 ? (
                      <a href="#" className="rd-show-toggle" onClick={(e) => {
                        e.preventDefault();
                        setIsNoteExpanded(!isNoteExpanded);
                      }}>
                        {isNoteExpanded ? 'Show less' : 'Read more'}
                      </a>
                    ) : null;
                  })()
                )}
              </div>
            </div>
          )}
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