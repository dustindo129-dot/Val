import React from 'react';
import Modal from '../auth/Modal';

/**
 * Market Contribution Modal Component
 * 
 * Modal for users to contribute to a market request
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.currentRequest - The request being contributed to
 * @param {string} props.contributionAmount - The amount to contribute
 * @param {Function} props.setContributionAmount - Function to set contribution amount
 * @param {string} props.contributionNote - The note for the contribution
 * @param {Function} props.setContributionNote - Function to set contribution note
 * @param {boolean} props.submitting - Whether submission is in progress
 * @param {Function} props.handleSubmit - Function to handle form submission
 * @param {number} props.userBalance - The user's current balance
 * @returns {JSX.Element} Market contribution modal component
 */
const MarketContributionModal = ({
  isOpen,
  onClose,
  currentRequest,
  contributionAmount,
  setContributionAmount,
  contributionNote,
  setContributionNote,
  submitting,
  handleSubmit,
  userBalance
}) => {
  if (!currentRequest) return null;
  
  return (
    <div className="market-contribution-modal">
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Góp lúa cho ${currentRequest.novel 
          ? currentRequest.novel.title 
          : currentRequest.title}`}
      >
        <div className="contribution-input-container">
          <label htmlFor="contribution-amount">Số lúa góp</label>
          <input
            type="number"
            id="contribution-amount"
            min="1"
            step="1"
            value={contributionAmount}
            onChange={(e) => setContributionAmount(e.target.value)}
            disabled={submitting}
            required
            className="contribution-input"
          />
                      <span className="market-balance-display">🌾 hiện tại: {userBalance}</span>
        </div>
        
        <div className="contribution-note-container">
          <label htmlFor="contribution-note">Lời nhắn (tùy chọn)</label>
          <textarea
            id="contribution-note"
            className="contribution-note-input"
            placeholder="Nhắn nhủ thêm... (nếu có)"
            value={contributionNote}
            onChange={(e) => setContributionNote(e.target.value)}
            disabled={submitting}
          />
        </div>
        
        <div className="modal-actions">
          <button 
            className="cancel-contribution-btn"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button 
            className="submit-contribution-btn"
            onClick={handleSubmit}
            disabled={submitting || !contributionAmount || 
                    (contributionAmount && Number(contributionAmount) > userBalance)}
          >
            {submitting ? 'Đang góp...' : 'Xác nhận góp lúa'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MarketContributionModal; 