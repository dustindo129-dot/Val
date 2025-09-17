import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import DOMPurify from 'dompurify';

const ReviewsPreviewSection = ({ novelId, onViewAllReviews, onRateNow }) => {
  // Fetch latest 2 reviews
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['novel-reviews-preview', novelId],
    queryFn: () => api.getNovelReviews(novelId, 1, 2), // page 1, limit 2
    enabled: !!novelId,
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

  // Format the date to display
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '1 ngày';
    } else if (diffDays < 7) {
      return `${diffDays} ngày`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} tuần`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} tháng`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
  }, []);

  // Check if a review was edited - now based on server-provided field
  const isReviewEdited = useCallback((review) => {
    return review.reviewIsEdited === true;
  }, []);

  if (isLoading) {
    return (
      <div className="rd-description-section">
        <div className="reviews-section-header">
          <h2 className="rd-description-title">ĐÁNH GIÁ TỪ ĐỘC GIẢ</h2>
          {onRateNow && (
            <button className="rate-now-button" onClick={onRateNow}>
              Đánh giá ngay
            </button>
          )}
        </div>
        <div className="reviews-preview-loading">
          <span>Đang tải đánh giá<span className="loading-dots">...</span></span>
        </div>
      </div>
    );
  }

  const reviews = reviewsData?.reviews || [];
  const hasReviews = reviews.length > 0;

  return (
    <div className="rd-description-section">
      <div className="reviews-section-header">
        <h2 className="rd-description-title">ĐÁNH GIÁ TỪ ĐỘC GIẢ</h2>
        {onRateNow && (
          <button className="rate-now-button" onClick={onRateNow}>
            Đánh giá ngay
          </button>
        )}
      </div>
      
      {hasReviews ? (
        <div className="reviews-preview-content">
          <div className="reviews-preview-list">
            {reviews.map((review, index) => (
              <div key={review.id} className="review-preview-item">
                <div className="review-preview-header">
                  <span className="review-preview-user">
                    {review.user?.displayName || review.user?.username || 'Ẩn danh'}
                  </span>
                  <div className="review-preview-rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`review-preview-star ${i < review.rating ? 'filled' : ''}`}>
                        {i < review.rating ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  <div className="review-preview-date-wrapper">
                    <span className="review-preview-date">{formatDate(review.updatedAt || review.date)}</span>
                    {isReviewEdited(review) && (
                      <span className="review-preview-edited-indicator">(Đã chỉnh sửa)</span>
                    )}
                  </div>
                </div>
                <div 
                  className="review-preview-content-text"
                  dangerouslySetInnerHTML={{ 
                    __html: processReviewContent(review.review)
                  }} 
                />
              </div>
            ))}
          </div>
          
          {reviewsData?.pagination?.totalItems > 2 && (
            <button 
              className="reviews-preview-view-all"
              onClick={onViewAllReviews}
            >
              Xem tất cả {reviewsData.pagination.totalItems} đánh giá
            </button>
          )}
        </div>
      ) : (
        <div className="reviews-preview-empty">
          <p>Chưa có đánh giá nào cho truyện này.</p>
        </div>
      )}
    </div>
  );
};

export default ReviewsPreviewSection;
