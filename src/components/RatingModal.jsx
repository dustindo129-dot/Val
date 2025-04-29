import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StarIcon, StarFilledIcon } from './novel-detail/NovelIcons';

const RatingModal = ({ novelId, isOpen, onClose, currentRating = 0, onRatingSuccess }) => {
  const [selectedRating, setSelectedRating] = useState(currentRating);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Update selected rating when currentRating changes
  useEffect(() => {
    setSelectedRating(currentRating);
  }, [currentRating]);
  
  const rateMutation = useMutation({
    mutationFn: (rating) => api.rateNovel(novelId, rating),
    onMutate: async (newRating) => {
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
        newAvgRating = ((currentAvgRating * totalRatings) + newRating) / newTotalRatings;
      } else {
        // Updating existing rating
        newAvgRating = ((currentAvgRating * totalRatings) - oldRating + newRating) / totalRatings;
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
        rating: newRating
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
      setError('Failed to update rating. Please try again.');
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
        rating: response.rating
      }));

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['novel-stats', novelId],
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
      setError('Please select a rating before submitting.');
      return;
    }

    try {
      await rateMutation.mutateAsync(selectedRating);
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Failed to update rating. Please try again.');
    }
  };
  
  const handleCancel = () => {
    setSelectedRating(currentRating);
    setError(null);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="rating-modal-overlay">
      <div className="rating-modal">
        <div className="rating-modal-header">
          <h2>Đánh giá truyện</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="rating-stars-container">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star-button ${star <= selectedRating ? 'active' : ''}`}
              onClick={() => setSelectedRating(star === selectedRating ? selectedRating : star)}
            >
              {star <= selectedRating ? (
                <StarFilledIcon size={32} />
              ) : (
                <StarIcon size={32} />
              )}
            </button>
          ))}
        </div>
        
        <div className="rating-value-display">
          {selectedRating > 0 ? `${selectedRating} / 5` : 'Chọn đánh giá'}
        </div>

        {error && (
          <div className="error-message" style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <div className="rating-modal-footer">
          <button 
            className="cancel-button" 
            onClick={handleCancel}
            disabled={rateMutation.isLoading}
          >
            Hủy bỏ
          </button>
          
          <button 
            className="submit-button" 
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
      </div>
    </div>
  );
};

export default RatingModal; 