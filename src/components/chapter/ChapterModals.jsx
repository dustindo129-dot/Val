import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faStar as fasStar
} from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import api from '../../services/api';

export const SettingsModal = ({
  showSettingsModal,
  setShowSettingsModal,
  fontFamily,
  setFontFamily,
  fontSize,
  decreaseFontSize,
  increaseFontSize,
  lineHeight,
  setLineHeight,
  theme,
  applyTheme
}) => {
  // Early return if modal is not shown
  if (!showSettingsModal) return null;

  return (
    <div className={`settings-modal ${showSettingsModal ? 'active' : ''}`}>
      <div className="settings-container">
        <div className="settings-modal-header">
          <h3>Reading Settings</h3>
          <button 
            className="close-modal-btn"
            onClick={() => setShowSettingsModal(false)}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="settings-modal-body">
          <div className="settings-section">
            <h4>Font</h4>
            <div className="font-selector">
              <select 
                value={fontFamily} 
                onChange={e => setFontFamily(e.target.value)}
                className="font-family-select"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="Times New Roman, serif">Times New Roman</option>
                <option value="'Noto Serif', serif">Noto Serif</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="Courier New, monospace">Courier New</option>
              </select>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Font Size</h4>
            <div className="font-size-control">
              <button 
                onClick={decreaseFontSize}
                className="size-control-btn"
              >
                A-
              </button>
              <span className="current-size">{fontSize}px</span>
              <button 
                onClick={increaseFontSize}
                className="size-control-btn"
              >
                A+
              </button>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Line Height</h4>
            <div className="line-height-control">
              <input
                type="range"
                min="1.2"
                max="2.0"
                step="0.1"
                value={lineHeight}
                onChange={e => setLineHeight(parseFloat(e.target.value))}
                className="line-height-slider"
              />
              <span className="current-line-height">{lineHeight}</span>
            </div>
          </div>
          
          <div className="settings-section">
            <h4>Theme</h4>
            <div className="theme-selector">
              <button 
                className={`theme-btn light ${theme === 'light' ? 'active' : ''}`}
                onClick={() => applyTheme('light')}
              >
                Light
                {theme === 'light' && <FontAwesomeIcon icon={fasStar} className="theme-check" />}
              </button>
              <button 
                className={`theme-btn sepia ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => applyTheme('sepia')}
              >
                Sepia
                {theme === 'sepia' && <FontAwesomeIcon icon={fasStar} className="theme-check" />}
              </button>
              <button 
                className={`theme-btn dark ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => applyTheme('dark')}
              >
                Dark
                {theme === 'dark' && <FontAwesomeIcon icon={fasStar} className="theme-check" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RatingModal = ({
  showRatingModal,
  setShowRatingModal,
  currentRating,
  setCurrentRating,
  handleSubmitRating
}) => {
  // Early return if modal is not shown
  if (!showRatingModal) return null;

  return (
    <div className="rating-modal-container">
      <div className="rating-modal">
        <div className="rating-modal-header">
          <h3>Rate this Chapter</h3>
          <button 
            className="close-modal-btn"
            onClick={() => setShowRatingModal(false)}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="rating-modal-body">
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map(rating => (
              <span 
                key={rating}
                onClick={() => setCurrentRating(rating)}
                className={`star-icon ${currentRating >= rating ? 'active' : ''}`}
              >
                <FontAwesomeIcon 
                  icon={currentRating >= rating ? fasStar : farStar} 
                  size="2x"
                />
              </span>
            ))}
          </div>
          <p className="rating-text">
            {currentRating === 1 && "Poor"}
            {currentRating === 2 && "Fair"}
            {currentRating === 3 && "Good"}
            {currentRating === 4 && "Very Good"}
            {currentRating === 5 && "Excellent"}
            {currentRating === 0 && "Select Rating"}
          </p>
        </div>
        
        <div className="rating-modal-footer">
          <button 
            className="cancel-rating-btn"
            onClick={() => setShowRatingModal(false)}
          >
            Cancel
          </button>
          <button 
            className="submit-rating-btn"
            onClick={handleSubmitRating}
            disabled={currentRating === 0}
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReportModal = ({
  showReportModal,
  setShowReportModal,
  reportReason,
  setReportReason,
  reportDetails,
  setReportDetails,
  chapterId,
  chapterTitle,
  novelId,
  handleSubmitReport
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Early return if modal is not shown
  if (!showReportModal) return null;
  
  const submitReport = async () => {
    if (!reportReason) {
      setError('Please select a reason for your report');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await api.submitReport(
        'chapter', 
        chapterId, 
        reportReason, 
        reportDetails,
        chapterTitle || 'Untitled Chapter',
        novelId
      );
      
      // Reset form
      setReportReason('');
      setReportDetails('');
      
      // Close modal
      setShowReportModal(false);
      
      // Show success message
      alert('Thank you for your report. We will review it soon.');
    } catch (err) {
      setError('Failed to submit report. Please try again.');
      console.error('Report submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-modal-container">
      <div className="report-modal">
        <div className="report-modal-header">
          <h3>Report this Chapter</h3>
          <button 
            className="close-modal-btn"
            onClick={() => setShowReportModal(false)}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="report-modal-body">
          <div className="report-options">
            <div className="report-option">
              <input 
                type="radio" 
                id="translation-error" 
                name="report-reason" 
                value="Translation error"
                checked={reportReason === 'Translation error'}
                onChange={() => setReportReason('Translation error')}
              />
              <label htmlFor="translation-error">Translation error</label>
            </div>
            <div className="report-option">
              <input 
                type="radio" 
                id="inappropriate-content" 
                name="report-reason" 
                value="Inappropriate content" 
                checked={reportReason === 'Inappropriate content'}
                onChange={() => setReportReason('Inappropriate content')}
              />
              <label htmlFor="inappropriate-content">Inappropriate content</label>
            </div>
            <div className="report-option">
              <input 
                type="radio" 
                id="formatting-issue" 
                name="report-reason" 
                value="Formatting issue" 
                checked={reportReason === 'Formatting issue'}
                onChange={() => setReportReason('Formatting issue')}
              />
              <label htmlFor="formatting-issue">Formatting issue</label>
            </div>
            <div className="report-option">
              <input 
                type="radio" 
                id="other-issue" 
                name="report-reason" 
                value="Other" 
                checked={reportReason === 'Other'}
                onChange={() => setReportReason('Other')}
              />
              <label htmlFor="other-issue">Other</label>
            </div>
          </div>
          
          <div className="report-details-container">
            <label htmlFor="report-details">Please provide more details about the issue...</label>
            <textarea 
              id="report-details"
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail"
            ></textarea>
          </div>
          
          {error && (
            <div className="report-error">
              {error}
            </div>
          )}
        </div>
        
        <div className="report-modal-footer">
          <button 
            className="cancel-report-btn"
            onClick={() => setShowReportModal(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            className="submit-report-btn"
            onClick={submitReport}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}; 