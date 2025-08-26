import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StarIcon, StarFilledIcon } from './novel-detail/NovelIcons';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import '../styles/components/RatingModal.css';

const RatingModal = ({ novelId, isOpen, onClose, currentRating = 0, onRatingSuccess }) => {
  const [selectedRating, setSelectedRating] = useState(currentRating);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState(null);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const reviewEditorRef = useRef(null);

  // Create portal container
  const [portalContainer, setPortalContainer] = useState(null);

  // TinyMCE configuration for review text (no image upload for reviews)
  const getTinyMCEConfig = () => {
    return {
      script_src: config.tinymce.scriptPath,
      license_key: 'gpl',
      height: 300,
      menubar: false,
      remove_empty_elements: false,
      forced_root_block: 'p',
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'charmap',
        'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'table', 'help', 'wordcount'
      ],
      toolbar: 'undo redo | formatselect | ' +
        'bold italic underline strikethrough | ' +
        'alignleft aligncenter alignright | ' +
        'bullist numlist | link | code | removeformat | help',
      contextmenu: 'cut copy paste | link | removeformat',
      content_style: `
        body { font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; }
        em, i { font-style: italic; }
        strong, b { font-weight: bold; }
        s, strike, del { text-decoration: line-through; }
      `,
      skin: 'oxide',
      content_css: 'default',
      placeholder: 'Để lại lời nhận xét... (nếu muốn)',
      statusbar: false,
      resize: false,
      branding: false,
      promotion: false,
      setup: (editor) => {
        editor.on('init', () => {
          // Focus handling will be done in useEffect
        });
      }
    };
  };

  // Process review content similar to comment section
  const processReviewContent = useCallback((content) => {
    if (!content) return '';
    
    try {
      const contentString = typeof content === 'object' ? JSON.stringify(content) : String(content);
      
      // Basic HTML sanitization while preserving formatting
      let processedContent = contentString;
      
      // Convert line breaks to <br> tags while preserving multiple consecutive breaks
      processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Convert multiple consecutive newlines to multiple <br> tags
      processedContent = processedContent.replace(/\n{3,}/g, (match) => {
        return '<br>'.repeat(match.length);
      });
      
      // Convert double newlines to double <br> (paragraph-like spacing)
      processedContent = processedContent.replace(/\n{2}/g, '<br><br>');
      
      // Convert single newlines to single <br>
      processedContent = processedContent.replace(/\n/g, '<br>');
      
      // Store existing HTML tags to avoid processing their contents
      const htmlTags = [];
      let tempContent = processedContent;
      
      // Extract all existing HTML tags
      tempContent = tempContent.replace(/<[^>]+>/g, (match) => {
        const placeholder = `__HTML_TAG_${htmlTags.length}__`;
        htmlTags.push(match);
        return placeholder;
      });
      
      // Process URLs in the remaining text
      tempContent = tempContent.replace(/(https?:\/\/[^\s<>"]+)/gi, (match) => {
        if (!match.includes('__HTML_TAG_')) {
          return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
        }
        return match;
      });

      // Convert www links to clickable links
      tempContent = tempContent.replace(/(^|[^\/])(www\.[^\s<>"]+)/gi, (match, p1, p2) => {
        if (!match.includes('__HTML_TAG_')) {
          return `${p1}<a href="http://${p2}" target="_blank" rel="noopener noreferrer">${p2}</a>`;
        }
        return match;
      });

      // Convert email addresses to mailto links
      tempContent = tempContent.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, (match) => {
        if (!match.includes('__HTML_TAG_')) {
          return `<a href="mailto:${match}">${match}</a>`;
        }
        return match;
      });
      
      // Restore original HTML tags
      processedContent = tempContent.replace(/__HTML_TAG_(\d+)__/g, (match, index) => {
        return htmlTags[parseInt(index)] || '';
      });
      
      return DOMPurify.sanitize(processedContent, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'u', 's', 'strike', 'del'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class']
      });
    } catch (error) {
      console.error('Error processing review content:', error);
      return content;
    }
  }, []);

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



  // Update selected rating and review when they change
  useEffect(() => {
    setSelectedRating(currentRating);
    const reviewContent = userInteraction?.review || '';
    setReviewText(reviewContent);
    
    // Set content in TinyMCE editor if it's available and modal is open
    if (reviewEditorRef.current && isOpen) {
      // Use a small delay to ensure editor is fully ready
      setTimeout(() => {
        if (reviewEditorRef.current) {
          reviewEditorRef.current.setContent(reviewContent);
        }
      }, 100);
    }
  }, [currentRating, userInteraction?.review, isOpen]);


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

      // On error, refetch to ensure consistency
      queryClient.refetchQueries({ queryKey: ['completeNovel', novelId] });

      setError('Không thể cập nhật đánh giá. Vui lòng thử lại.');
    },
        onSuccess: async (response) => {
      // Force immediate refetch to ensure rating updates instantly
      await queryClient.refetchQueries({ queryKey: ['completeNovel', novelId] });

      // Also invalidate review-related queries to ensure fresh reviews
      queryClient.invalidateQueries({
        queryKey: ['novel-reviews-preview', novelId],
        exact: true
      });

      queryClient.invalidateQueries({
        queryKey: ['novel-reviews-modal', novelId],
        exact: false
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
      // Get content from TinyMCE editor if available, otherwise use state
      let reviewContent = '';
      if (reviewEditorRef.current) {
        reviewContent = reviewEditorRef.current.getContent();
      } else {
        reviewContent = reviewText;
      }

      await rateMutation.mutateAsync({ 
        rating: selectedRating, 
        review: reviewContent.trim() || null 
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Không thể cập nhật đánh giá. Vui lòng thử lại.');
    }
  };
  
  const handleCancel = () => {
    setSelectedRating(currentRating);
    const originalReview = userInteraction?.review || '';
    setReviewText(originalReview);
    
    // Reset TinyMCE editor content
    if (reviewEditorRef.current) {
      reviewEditorRef.current.setContent(originalReview);
    }
    
    setError(null);
    onClose();
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

  // Check if a review was edited - now based on server-provided field
  const isReviewEdited = useCallback((review) => {
    return review.reviewIsEdited === true;
  }, []);
  
  if (!isOpen || !portalContainer) return null;

  // Render modal content with portal
  const modalContent = (
    <div className="vt-rating-modal-overlay">
      <div className="vt-rating-modal-content">
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
            <div className="review-editor">
              <Editor
                onInit={(evt, editor) => {
                  reviewEditorRef.current = editor;
                  // Set initial content if available with a delay to ensure proper loading
                  setTimeout(() => {
                    const initialContent = userInteraction?.review || '';
                    if (initialContent && editor) {
                      editor.setContent(initialContent);
                    }
                  }, 150);
                }}
                scriptLoading={{ async: true, load: "domainBased" }}
                init={getTinyMCEConfig()}
                key={`review-editor-${isOpen}-${userInteraction?.review ? 'has-content' : 'empty'}`}
              />
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


        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside the component tree
  return createPortal(modalContent, portalContainer);
};

export default RatingModal; 