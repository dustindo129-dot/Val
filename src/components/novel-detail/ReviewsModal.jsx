import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import DOMPurify from 'dompurify';

const ReviewsModal = ({ novelId, isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Create portal container
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('vt-reviews-modal-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vt-reviews-modal-portal';
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

  // Reset page to 1 when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
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

  // Get reviews for this novel with pagination
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['novel-reviews-modal', novelId, currentPage],
    queryFn: () => api.getNovelReviews(novelId, currentPage),
    enabled: isOpen && !!novelId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Process review content similar to RatingModal
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

  // Pagination navigation functions
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (reviewsData?.pagination && currentPage < reviewsData.pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, reviewsData?.pagination]);

  // Format the date to display
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  // Check if a review was edited
  const isReviewEdited = useCallback((review) => {
    if (!review.createdAt || !review.updatedAt) return false;
    const created = new Date(review.createdAt).getTime();
    const updated = new Date(review.updatedAt).getTime();
    // Consider it edited if the difference is more than 1 minute (to account for server processing time)
    return Math.abs(updated - created) > 60000;
  }, []);

  // Handle click on overlay to close modal
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen || !portalContainer) return null;

  // Render modal content with portal
  const modalContent = (
    <div className="vt-reviews-modal-overlay" onClick={handleOverlayClick}>
      <div className="vt-reviews-modal-content">
        <div className="reviews-modal-header">
          <h2 className="reviews-modal-title">Đánh giá từ độc giả</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="vt-reviews-modal-body">
          {isLoadingReviews ? (
            <div className="reviews-loading">
              <span>Đang tải đánh giá<span className="loading-dots">...</span></span>
            </div>
          ) : reviewsData?.reviews?.length > 0 ? (
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
                      <div className="review-date-wrapper">
                        <span className="review-date">{formatDate(review.updatedAt || review.date)}</span>
                        {isReviewEdited(review) && (
                          <span className="review-edited-indicator">(Đã chỉnh sửa)</span>
                        )}
                      </div>
                    </div>
                    <div 
                      className="review-content"
                      dangerouslySetInnerHTML={{ 
                        __html: processReviewContent(review.review)
                      }} 
                    />
                  </div>
                ))}
              </div>
              
              {reviewsData.pagination.totalPages > 1 && (
                <div className="reviews-pagination">
                  <button
                    className="pagination-btn pagination-btn-prev"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    title="Trang trước"
                  >
                    ‹
                  </button>
                  
                  <span className="pagination-info">
                    Trang {reviewsData.pagination.currentPage} / {reviewsData.pagination.totalPages}
                  </span>
                  
                  <button
                    className="pagination-btn pagination-btn-next"
                    onClick={handleNextPage}
                    disabled={currentPage === reviewsData.pagination.totalPages}
                    title="Trang sau"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="reviews-empty">
              <p>Chưa có đánh giá nào cho truyện này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside the component tree
  return createPortal(modalContent, portalContainer);
};

export default ReviewsModal;
