import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import config from '../config/config';

const RatingModal = ({ novelId, isOpen, onClose, currentRating = 0 }) => {
  const [selectedRating, setSelectedRating] = useState(currentRating);
  const queryClient = useQueryClient();
  
  // API calls for rating
  const rateNovel = async (rating) => {
    try {
      const response = await fetch(`${config.backendUrl}/api/novels/${novelId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ rating })
      });
      
      if (!response.ok) throw new Error('Failed to rate novel');
      return await response.json();
    } catch (error) {
      console.error('Error rating novel:', error);
      throw error;
    }
  };
  
  const removeRating = async () => {
    try {
      const response = await fetch(`${config.backendUrl}/api/novels/${novelId}/rate`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to remove rating');
      return await response.json();
    } catch (error) {
      console.error('Error removing rating:', error);
      throw error;
    }
  };
  
  // Mutations
  const rateMutation = useMutation({
    mutationFn: (rating) => rateNovel(rating),
    onSuccess: () => {
      queryClient.invalidateQueries(['novel', novelId]);
      queryClient.invalidateQueries(['userInteraction', novelId]);
      onClose();
    }
  });
  
  const removeRatingMutation = useMutation({
    mutationFn: () => removeRating(),
    onSuccess: () => {
      queryClient.invalidateQueries(['novel', novelId]);
      queryClient.invalidateQueries(['userInteraction', novelId]);
      onClose();
    }
  });
  
  // Submit handler
  const handleSubmit = () => {
    if (selectedRating === 0) {
      removeRatingMutation.mutate();
    } else {
      rateMutation.mutate(selectedRating);
    }
  };
  
  // Cancel handler
  const handleCancel = () => {
    setSelectedRating(currentRating);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="rating-modal-overlay">
      <div className="rating-modal">
        <div className="rating-modal-header">
          <h2>Rate This Novel</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="rating-stars-container">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star-button ${star <= selectedRating ? 'active' : ''}`}
              onClick={() => setSelectedRating(star === selectedRating ? 0 : star)}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill={star <= selectedRating ? "currentColor" : "none"} 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          ))}
        </div>
        
        <div className="rating-value-display">
          {selectedRating > 0 ? `${selectedRating} / 5` : 'No Rating'}
        </div>
        
        <div className="rating-modal-footer">
          <button 
            className="cancel-button" 
            onClick={handleCancel}
          >
            Cancel
          </button>
          
          <button 
            className="submit-button" 
            onClick={handleSubmit}
            disabled={rateMutation.isLoading || removeRatingMutation.isLoading}
          >
            {rateMutation.isLoading || removeRatingMutation.isLoading 
              ? 'Submitting...' 
              : selectedRating === 0 
                ? 'Remove Rating' 
                : 'Submit Rating'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal; 