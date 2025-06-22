import React from 'react';

/**
 * Market Request Form Component
 * 
 * Form for creating new market requests
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {Object} props.user - The current user data
 * @param {string} props.requestType - Current request type
 * @param {Function} props.handleTypeChange - Function to change request type
 * @param {string} props.requestText - Request text input value
 * @param {Function} props.setRequestText - Function to update request text
 * @param {string} props.requestNote - Request note input value
 * @param {Function} props.setRequestNote - Function to update request note
 * @param {string} props.requestImage - Request image URL
 * @param {Function} props.handleImageUpload - Function to handle image upload
 * @param {boolean} props.imageUploading - Whether image is uploading
 * @param {string} props.depositAmount - Deposit amount input value
 * @param {Function} props.setDepositAmount - Function to update deposit amount
 * @param {string} props.goalAmount - Goal amount input value for web requests
 * @param {Function} props.setGoalAmount - Function to update goal amount
 * @param {number} props.userBalance - User's current balance
 * @param {boolean} props.submitting - Whether form is submitting
 * @param {Function} props.handleSubmit - Function to handle form submission
 * @param {Function} props.handleClearForm - Function to clear form
 * @param {boolean} props.showHistory - Whether to show request history
 * @param {Function} props.toggleHistory - Function to toggle history view
 * @returns {JSX.Element} Market request form component
 */
const MarketRequestForm = ({
  isAuthenticated,
  user,
  requestType,
  handleTypeChange,
  requestText,
  setRequestText,
  requestNote,
  setRequestNote,
  requestImage,
  handleImageUpload,
  imageUploading,
  depositAmount,
  setDepositAmount,
  goalAmount,
  setGoalAmount,
  userBalance,
  submitting,
  handleSubmit,
  handleClearForm,
  showHistory,
  toggleHistory
}) => {
  if (showHistory) return null;

  return (
    <div className="request-form-container">
      <div className="request-type-tabs">
        <button 
          className={`type-tab ${requestType === 'new' ? 'active' : ''}`} 
          onClick={() => handleTypeChange('new')}
        >
          Yêu cầu truyện mới
        </button>
        
        {/* Admin only tab for web recommendations */}
        {user && user.role === 'admin' && (
          <button 
            className={`type-tab ${requestType === 'web' ? 'active' : ''}`} 
            onClick={() => handleTypeChange('web')}
          >
            Đề xuất từ nhóm dịch
          </button>
        )}
        
        {/* Request History Button - Visible to all logged-in users */}
        {isAuthenticated && (
          <button 
            className={`type-tab history-tab ${showHistory ? 'active' : ''}`} 
            onClick={toggleHistory}
          >
            Lịch sử yêu cầu
          </button>
        )}
      </div>
      
      <form className="request-form" onSubmit={handleSubmit}>
        {/* Admin Web Recommendation Form */}
        {requestType === 'web' && user && user.role === 'admin' && (
          <>
            <input
              type="text"
              className="request-title-input"
              placeholder="Tên truyện bạn muốn đề xuất..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              disabled={submitting}
              required
            />
            
            <textarea
              className="request-input"
              placeholder="Nhắn nhủ thêm... (nếu có)"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              disabled={submitting}
            />
          </>
        )}
        
        {requestType === 'new' && (
          <>
            <input
              type="text"
              className="request-title-input"
              placeholder="Tên truyện bạn muốn yêu cầu..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              disabled={submitting}
              required
            />
            <textarea
              className="request-input"
              placeholder="Vui lòng nói rõ bạn muốn team dịch từ vol mấy và những mong muốn/ghi chú thêm nếu có..."
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              disabled={submitting}
              required
            />
          </>
        )}
        
        {/* Image Upload Section */}
        <div className="form-group">
          <label>Ảnh minh họa:</label>
          <div className="cover-upload">
            {requestImage && (
              <img
                src={requestImage}
                alt="Request image preview"
                className="cover-preview"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              id="request-image-upload"
              style={{ display: 'none' }}
              disabled={submitting || imageUploading}
            />
            <label 
              htmlFor="request-image-upload" 
              className={`market-upload-btn ${imageUploading ? 'uploading' : ''}`}
            >
              {imageUploading ? 'Đang tải lên...' : 'Tải ảnh minh họa'}
            </label>
            {!requestImage && (
              <p className="upload-helper-text">
                Nếu không tải ảnh, sẽ sử dụng ảnh mặc định
              </p>
            )}
          </div>
        </div>
        
        {requestType === 'web' && user && user.role === 'admin' ? (
          <div className="deposit-input-container">
            <label htmlFor="goalAmount">Số 🌾 mục tiêu:</label>
            <input
              type="number"
              id="goalAmount"
              min="1"
              step="1"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              disabled={submitting}
              required
              className="deposit-input"
            />
          </div>
        ) : requestType === 'new' && (
          <div className="deposit-input-container">
            <label htmlFor="deposit">Cọc:</label>
            <input
              type="number"
              id="deposit"
              min="100"
              step="1"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={submitting}
              required
              className="deposit-input"
            />
            <span className="balance-display">🌾 hiện tại: {userBalance}</span>
            <span className="min-deposit-notice">Số cọc tối thiểu: 100</span>
          </div>
        )}
        
        <div className="request-form-actions">
          <button 
            type="submit" 
            className="submit-request-btn"
            disabled={submitting || 
                     (requestType === 'new' && !requestText.trim()) || 
                     (requestType !== 'web' && (!depositAmount || Number(depositAmount) < 100)) ||
                     (requestType === 'web' && (!goalAmount || Number(goalAmount) <= 0)) ||
                     (requestType !== 'web' && depositAmount && Number(depositAmount) > userBalance)}
          >
            {submitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
          </button>
          <button 
            type="button" 
            className="discard-btn"
            onClick={handleClearForm}
          >
            Bỏ bản nháp
          </button>
        </div>
      </form>
    </div>
  );
};

export default MarketRequestForm; 