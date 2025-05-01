import React from 'react';
import NovelSearch from './NovelSearch';

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
 * @param {string} props.depositAmount - Deposit amount input value
 * @param {Function} props.setDepositAmount - Function to update deposit amount
 * @param {string} props.goalAmount - Goal amount input value for web requests
 * @param {Function} props.setGoalAmount - Function to update goal amount
 * @param {number} props.userBalance - User's current balance
 * @param {boolean} props.submitting - Whether form is submitting
 * @param {Function} props.handleSubmit - Function to handle form submission
 * @param {Function} props.handleClearForm - Function to clear form
 * @param {string} props.novelSearchQuery - Novel search query
 * @param {Function} props.setNovelSearchQuery - Function to update novel search query
 * @param {Array} props.novelSearchResults - Array of novel search results
 * @param {boolean} props.showNovelResults - Whether to show novel search results
 * @param {Function} props.setShowNovelResults - Function to toggle novel search results
 * @param {boolean} props.isSearching - Whether novel search is in progress
 * @param {Object} props.selectedNovel - Currently selected novel
 * @param {Function} props.handleNovelSelect - Function to handle novel selection
 * @param {Array} props.modules - Array of available modules
 * @param {string} props.selectedModule - ID of selected module
 * @param {Function} props.handleModuleSelect - Function to handle module selection
 * @param {boolean} props.loadingModules - Whether modules are loading
 * @param {Array} props.chapters - Array of available chapters
 * @param {string} props.selectedChapter - ID of selected chapter
 * @param {Function} props.handleChapterSelect - Function to handle chapter selection
 * @param {boolean} props.loadingChapters - Whether chapters are loading
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
  depositAmount,
  setDepositAmount,
  goalAmount,
  setGoalAmount,
  userBalance,
  submitting,
  handleSubmit,
  handleClearForm,
  novelSearchQuery,
  setNovelSearchQuery,
  novelSearchResults,
  showNovelResults,
  setShowNovelResults,
  isSearching,
  selectedNovel,
  handleNovelSelect,
  modules,
  selectedModule,
  handleModuleSelect,
  loadingModules,
  chapters,
  selectedChapter,
  handleChapterSelect,
  loadingChapters,
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
        <button 
          className={`type-tab ${requestType === 'open' ? 'active' : ''}`} 
          onClick={() => handleTypeChange('open')}
        >
          Mở ngay chương/tập có sẵn
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
        
        {requestType === 'new' ? (
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
              placeholder="Nhắn nhủ thêm... (nếu có)"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              disabled={submitting}
            />
          </>
        ) : requestType === 'open' ? (
          <div className="novel-search-container">
            <NovelSearch
              novelSearchQuery={novelSearchQuery}
              setNovelSearchQuery={setNovelSearchQuery}
              isSearching={isSearching}
              novelSearchResults={novelSearchResults}
              showNovelResults={showNovelResults}
              setShowNovelResults={setShowNovelResults}
              handleNovelSelect={handleNovelSelect}
              disabled={submitting}
            />
            
            {selectedNovel && modules.length > 0 && (
              <div className="module-selector">
                <select
                  value={selectedModule || ""}
                  onChange={handleModuleSelect}
                  className="module-select"
                >
                  <option value="">Chọn một tập</option>
                  {modules.map(module => (
                    <option key={module._id} value={module._id}>
                      {module.title}
                    </option>
                  ))}
                </select>
                {loadingModules && <span className="loading-indicator">Đang tải...</span>}
              </div>
            )}
            
            {selectedNovel && chapters.length > 0 && (
              <div className="chapter-selector">
                <select
                  value={selectedChapter || ""}
                  onChange={handleChapterSelect}
                  className="chapter-select"
                >
                  <option value="">Chọn một chương</option>
                  {chapters.map(chapter => (
                    <option key={chapter._id} value={chapter._id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
                {loadingChapters && <span className="loading-indicator">Đang tải...</span>}
              </div>
            )}
          </div>
        ) : null}
        
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
        ) : (
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
                     (requestType === 'open' && !selectedNovel) ||
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