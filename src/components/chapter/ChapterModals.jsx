import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faStar
} from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';

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
  if (!showSettingsModal) return null;

  return (
    <div className="settings-modal active">
      <div className="settings-container">
        <button
          className="settings-close"
          onClick={() => setShowSettingsModal(false)}
        >
          <FontAwesomeIcon icon={faTimes}/>
        </button>

        <h3 className="settings-title">Reading Settings</h3>

        <div className="settings-group">
          <label className="settings-label">Font Family</label>
          <select
            className="font-family-select"
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value);
              localStorage.setItem('readerFontFamily', e.target.value);
            }}
          >
            <option value="'Roboto', sans-serif">Roboto (Default)</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Open Sans', sans-serif">Open Sans</option>
            <option value="'Noto Serif', serif">Noto Serif</option>
          </select>
        </div>

        <div className="settings-group">
          <label className="settings-label">Font Size</label>
          <div className="font-size-control">
            <button
              className="font-button"
              onClick={decreaseFontSize}
            >
              A-
            </button>
            <span className="font-size-value">{fontSize}</span>
            <button
              className="font-button"
              onClick={increaseFontSize}
            >
              A+
            </button>
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">Line Height</label>
          <select
            className="line-height-select"
            value={lineHeight}
            onChange={(e) => {
              setLineHeight(e.target.value);
              localStorage.setItem('readerLineHeight', e.target.value);
            }}
          >
            <option value="1.6">Default</option>
            <option value="1.8">Comfortable</option>
            <option value="2">Spacious</option>
            <option value="2.2">Very Spacious</option>
          </select>
        </div>

        <div className="settings-group">
          <label className="settings-label">Theme</label>
          <div className="theme-options">
            <div
              className={`theme-option theme-light ${theme === 'light' ? 'active' : ''}`}
              onClick={() => applyTheme('light')}
              title="Light theme"
            ></div>
            <div
              className={`theme-option theme-dark ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => applyTheme('dark')}
              title="Dark theme"
            ></div>
            <div
              className={`theme-option theme-sepia ${theme === 'sepia' ? 'active' : ''}`}
              onClick={() => applyTheme('sepia')}
              title="Sepia theme"
            ></div>
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
  if (!showRatingModal) return null;

  return (
    <div className="settings-modal active">
      <div className="settings-container">
        <button
          className="settings-close"
          onClick={() => setShowRatingModal(false)}
        >
          <FontAwesomeIcon icon={faTimes}/>
        </button>

        <h3 className="settings-title">Rate this Chapter</h3>

        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${currentRating >= star ? 'active' : ''}`}
              onClick={() => setCurrentRating(star)}
            >
              <FontAwesomeIcon icon={currentRating >= star ? faStar : farStar}/>
            </span>
          ))}
        </div>

        <button
          className="settings-apply"
          onClick={handleSubmitRating}
        >
          Submit Rating
        </button>
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
  handleSubmitReport
}) => {
  if (!showReportModal) return null;

  return (
    <div className="settings-modal active">
      <div className="settings-container">
        <button
          className="settings-close"
          onClick={() => setShowReportModal(false)}
        >
          <FontAwesomeIcon icon={faTimes}/>
        </button>

        <h3 className="settings-title">Report this Chapter</h3>

        <div className="report-options">
          <label className="report-option">
            <input
              type="radio"
              name="reportReason"
              value="translation"
              checked={reportReason === 'translation'}
              onChange={() => setReportReason('translation')}
            />
            <span>Translation error</span>
          </label>

          <label className="report-option">
            <input
              type="radio"
              name="reportReason"
              value="inappropriate"
              checked={reportReason === 'inappropriate'}
              onChange={() => setReportReason('inappropriate')}
            />
            <span>Inappropriate content</span>
          </label>

          <label className="report-option">
            <input
              type="radio"
              name="reportReason"
              value="formatting"
              checked={reportReason === 'formatting'}
              onChange={() => setReportReason('formatting')}
            />
            <span>Formatting issue</span>
          </label>

          <label className="report-option">
            <input
              type="radio"
              name="reportReason"
              value="other"
              checked={reportReason === 'other'}
              onChange={() => setReportReason('other')}
            />
            <span>Other</span>
          </label>
        </div>

        <textarea
          className="report-details"
          placeholder="Please provide more details about the issue..."
          value={reportDetails}
          onChange={(e) => setReportDetails(e.target.value)}
        ></textarea>

        <button
          className="settings-apply"
          onClick={handleSubmitReport}
        >
          Submit Report
        </button>
      </div>
    </div>
  );
}; 