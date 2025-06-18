import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StarIcon, StarFilledIcon } from './novel-detail/NovelIcons';
import '../styles/components/RatingModal.css';

const RatingModal = ({ novelId, isOpen, onClose, currentRating = 0, onRatingSuccess }) => {
  const [selectedRating, setSelectedRating] = useState(currentRating);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Create portal container
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('vt-rating-modal-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vt-rating-modal-portal';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.zIndex = '10000';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    // Cleanup function
    return () => {
      if (container && container.parentNode && !isOpen) {
        // Only remove if no other modals are using it
        const existingModals = container.children.length;
        if (existingModals === 0) {
          container.parentNode.removeChild(container);
        }
      }
    };
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('vt-modal-open');
      // Enable pointer events for the portal when modal is open
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'auto';
      }
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('vt-modal-open');
      // Disable pointer events when modal is closed
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('vt-modal-open');
      if (portalContainer) {
        portalContainer.style.pointerEvents = 'none';
      }
    };
  }, [isOpen, portalContainer]);

  // Get user's current interaction including review
  const { data: userInteraction } = useQuery({
    queryKey: ['userInteraction', user?.username, novelId],
    queryFn: () => api.getUserNovelInteraction(novelId),
    enabled: isOpen && !!user?.username && !!novelId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Get reviews for this novel
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['novel-reviews', novelId],
    queryFn: () => api.getNovelReviews(novelId),
    enabled: isOpen && !!novelId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Update selected rating and review when they change
  useEffect(() => {
    setSelectedRating(currentRating);
    setReviewText(userInteraction?.review || '');
  }, [currentRating, userInteraction?.review]);
  
  const rateMutation = useMutation({
    mutationFn: ({ rating, review }) => api.rateNovel(novelId, rating, review),
    onMutate: async ({ rating, review }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['novel-stats', novelId]);
      await queryClient.cancelQueries(['userInteraction', user?.username, novelId]);

      // Snapshot the previous values
      const previousStats = queryClient.getQueryData(['novel-stats', novelId]);
      const previousInteraction = queryClient.getQueryData(['userInteraction', user?.username, novelId]);

      // Calculate new average rating
      const oldRating = previousInteraction?.rating || 0;
      const totalRatings = previousStats?.totalRatings || 0;
      const currentAvgRating = parseFloat(previousStats?.averageRating || '0');

      let newTotalRatings = totalRatings;
      let newAvgRating = currentAvgRating;

      if (oldRating === 0) {
        // Adding new rating
        newTotalRatings++;
        newAvgRating = ((currentAvgRating * totalRatings) + rating) / newTotalRatings;
      } else {
        // Updating existing rating
        newAvgRating = ((currentAvgRating * totalRatings) - oldRating + rating) / totalRatings;
      }

      // Optimistically update stats
      queryClient.setQueryData(['novel-stats', novelId], old => ({
        ...old,
        totalRatings: newTotalRatings,
        averageRating: newAvgRating.toFixed(1)
      }));

      // Optimistically update user interaction
      queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
        ...old,
        rating,
        review
      }));

      return { previousStats, previousInteraction };
    },
    onError: (err, variables, context) => {
      // Reset to previous values on error
      if (context?.previousStats) {
        queryClient.setQueryData(['novel-stats', novelId], context.previousStats);
      }
      if (context?.previousInteraction) {
        queryClient.setQueryData(['userInteraction', user?.username, novelId], context.previousInteraction);
      }
      setError('Không thể cập nhật đánh giá. Vui lòng thử lại.');
    },
    onSuccess: (response) => {
      // Update with actual server data
      queryClient.setQueryData(['novel-stats', novelId], old => ({
        ...old,
        totalRatings: response.ratingsCount || old?.totalRatings || 0,
        averageRating: response.averageRating
      }));

      queryClient.setQueryData(['userInteraction', user?.username, novelId], old => ({
        ...old,
        rating: response.rating,
        review: response.review
      }));

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['novel-stats', novelId],
        exact: true
      });
      
      queryClient.invalidateQueries({
        queryKey: ['novel-reviews', novelId],
        exact: true
      });

      if (onRatingSuccess) {
        onRatingSuccess(response);
      }

      setError(null);
      onClose();
    }
  });
  
  const handleSubmit = async () => {
    if (selectedRating === 0) {
      setError('Vui lòng chọn đánh giá trước khi gửi.');
      return;
    }

    try {
      await rateMutation.mutateAsync({ 
        rating: selectedRating, 
        review: reviewText.trim() || null 
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Không thể cập nhật đánh giá. Vui lòng thử lại.');
    }
  };
  
  const handleCancel = () => {
    setSelectedRating(currentRating);
    setReviewText(userInteraction?.review || '');
    setError(null);
    onClose();
  };

  // Handle overlay click to close modal
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Format the date to display
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);
  
  if (!isOpen || !portalContainer) return null;

  // Render modal content with portal
  const modalContent = (
    <div className="vt-rating-modal-overlay" onClick={handleOverlayClick}>
      <div className="vt-rating-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="rating-modal-header">
          <h2 className="rd-rating-title">Đánh giá truyện</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="vt-rating-modal-body">
          <div className="rd-rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`rd-rating-star ${star <= selectedRating ? 'active' : ''}`}
                onClick={() => setSelectedRating(star === selectedRating ? selectedRating : star)}
              >
                {star <= selectedRating ? '★' : '☆'}
              </span>
            ))}
          </div>
          
          <div className="rating-value-display">
            {selectedRating > 0 ? `${selectedRating} / 5` : 'Chọn đánh giá'}
          </div>

          {/* Review text input */}
          <div className="review-input-container">
            <textarea
              className="review-input"
              placeholder="Để lại lời nhận xét... (nếu muốn)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              maxLength={1000}
              rows={4}
            />
            <div className="review-input-count">
              {reviewText.length}/1000
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>
              {error}
            </div>
          )}
          
          <div className="rd-rating-buttons">
            <button 
              className="rd-rating-btn rd-rating-btn-cancel" 
              onClick={handleCancel}
              disabled={rateMutation.isLoading}
            >
              Hủy bỏ
            </button>
            
            <button 
              className="rd-rating-btn rd-rating-btn-submit" 
              onClick={handleSubmit}
              disabled={rateMutation.isLoading || selectedRating === 0}
            >
              {rateMutation.isLoading 
                ? 'Đang gửi...' 
                : currentRating > 0 
                  ? 'Cập nhật đánh giá' 
                  : 'Gửi đánh giá'
              }
            </button>
          </div>

          {/* Reviews section */}
          {(isLoadingReviews || reviewsData?.reviews?.length > 0) && (
            <div className="reviews-section">
              <h3>Đánh giá từ độc giả</h3>
              
              {isLoadingReviews ? (
                <div className="reviews-loading">
                  <span>Đang tải đánh giá<span className="loading-dots">...</span></span>
                </div>
              ) : (
                <>
                  <div className="reviews-list">
                    {reviewsData.reviews.map(review => (
                      <div key={review.id} className="review-item">
                        <div className="review-header">
                          <span className="review-user">{review.user.displayName || review.user.username}</span>
                          <div className="review-rating">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={`review-star ${i < review.rating ? 'filled' : ''}`}>
                                {i < review.rating ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="review-date">{formatDate(review.date)}</span>
                        </div>
                        <div className="review-content">{review.review}</div>
                      </div>
                    ))}
                  </div>
                  
                  {reviewsData.pagination.totalPages > 1 && (
                    <div className="reviews-pagination">
                      <span>Trang {reviewsData.pagination.currentPage} / {reviewsData.pagination.totalPages}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside the component tree
  return createPortal(modalContent, portalContainer);
};

export default RatingModal; 