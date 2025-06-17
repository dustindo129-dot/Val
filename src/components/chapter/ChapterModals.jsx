import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import '../../styles/components/ReportModal.css';

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

  const handleOverlayClick = (e) => {
    // Close modal if clicking on the overlay (not the content)
    if (e.target === e.currentTarget) {
      setShowSettingsModal(false);
    }
  };

  return (
    <div 
      className={`settings-modal ${showSettingsModal ? 'active' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="settings-container">
        <div className="settings-modal-header">
          <h3>Cài đặt</h3>
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
            <h4>Kích cỡ chữ</h4>
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
            <h4>Khoảng cách dòng</h4>
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
            <h4>Chủ đề</h4>
            <div className="theme-selector">
              <button 
                className={`theme-btn light ${theme === 'light' ? 'active' : ''}`}
                onClick={() => applyTheme('light')}
              >
                Sáng
              </button>
              <button 
                className={`theme-btn sepia ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => applyTheme('sepia')}
              >
                Sepia
              </button>
              <button 
                className={`theme-btn dark ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => applyTheme('dark')}
              >
                Tối
              </button>
            </div>
          </div>
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

  const handleOverlayClick = (e) => {
    // Close modal if clicking on the overlay (not the content)
    if (e.target === e.currentTarget) {
      setShowReportModal(false);
    }
  };
  
  const submitReport = async () => {
    if (!reportReason) {
      setError('Vui lòng chọn lý do cho báo cáo của bạn');
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
      alert('Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét nó ngay khi có thể.');
    } catch (err) {
      setError('Không thể gửi báo cáo. Vui lòng thử lại.');
      console.error('Lỗi gửi báo cáo:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="report-modal-container"
      onClick={handleOverlayClick}
    >
      <div className="report-modal">
        <div className="report-modal-header">
          <h3>Báo cáo chương</h3>
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
              <label htmlFor="translation-error">Lỗi dịch thuật</label>
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
              <label htmlFor="inappropriate-content">Nội dung không phù hợp</label>
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
              <label htmlFor="formatting-issue">Vấn đề định dạng</label>
            </div>
            <div className="report-option">
              <input 
                type="radio" 
                id="ai-elements" 
                name="report-reason" 
                value="AI elements" 
                checked={reportReason === 'AI elements'}
                onChange={() => setReportReason('AI elements')}
              />
              <label htmlFor="ai-elements">Yếu tố AI</label>
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
              <label htmlFor="other-issue">Khác</label>
            </div>
          </div>
          
          <div className="report-details-container">
            <label htmlFor="report-details">Vui lòng cung cấp thêm chi tiết về vấn đề...</label>
            <textarea 
              id="report-details"
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              rows={4}
              placeholder="Mô tả vấn đề chi tiết"
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
            Hủy bỏ
          </button>
          <button 
            className="submit-report-btn"
            onClick={submitReport}
            disabled={submitting}
          >
            {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </div>
    </div>
  );
}; 