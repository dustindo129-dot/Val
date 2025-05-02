import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/OpenRequestModal.css';

/**
 * OpenRequestModal Component
 * 
 * Modal for handling open requests for paid modules or chapters
 */
const OpenRequestModal = ({
  isOpen,
  onClose,
  onSubmit,
  target,
  userBalance,
  submitting
}) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Set default amount based on target when modal opens
  useEffect(() => {
    if (isOpen && target) {
      // Set default amount based on whether it's a module or chapter
      if (target.moduleBalance !== undefined) {
        setDepositAmount(target.moduleBalance.toString());
      } else if (target.chapterBalance !== undefined) {
        setDepositAmount(target.chapterBalance.toString());
      }
    }
  }, [isOpen, target]);

  // Handle close
  const handleClose = () => {
    setDepositAmount('');
    setErrorMessage('');
    onClose();
  };

  // Handle deposit amount change
  const handleDepositChange = (e) => {
    setDepositAmount(e.target.value);
    setErrorMessage('');
  };

  // Handle submit
  const handleSubmit = () => {
    const amount = Number(depositAmount);
    
    if (!amount || isNaN(amount) || amount <= 0) {
      setErrorMessage('Vui lòng nhập số 🌾 hợp lệ');
      return;
    }

    if (amount < 100) {
      setErrorMessage('Số 🌾 cọc tối thiểu là 100');
      return;
    }

    if (amount > userBalance) {
      setErrorMessage('Số cọc không được vượt quá số 🌾 hiện tại');
      return;
    }

    onSubmit(amount);
  };

  if (!isOpen) return null;

  // Determine if target is a module or chapter
  const isModule = target?.moduleBalance !== undefined;
  const targetName = isModule ? target.title : (target?.title || 'Chương');
  const requiredAmount = isModule ? target.moduleBalance : (target?.chapterBalance || 0);

  return (
    <div className="open-request-modal-overlay">
      <div className="open-request-modal">
        <div className="open-request-modal-header">
          <h3>Mở khóa {isModule ? 'Tập' : 'Chương'}</h3>
          <button className="close-modal-btn" onClick={handleClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="open-request-modal-content">
          <div className="target-info">
            <div className="target-name">{targetName}</div>
            <div className="required-amount">
              Yêu cầu: <span>{requiredAmount} 🌾</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="depositAmount">Số 🌾 Cọc</label>
            <input
              id="depositAmount"
              type="number"
              value={depositAmount}
              onChange={handleDepositChange}
              placeholder="Nhập số 🌾 cọc"
              className="deposit-input"
              min="100"
            />
            <div className="balance-display">
              Số 🌾 hiện tại: {userBalance}
            </div>
            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}
          </div>

          <div className="open-request-note">
            <strong>Lưu ý quan trọng:</strong>
            <ul>
              <li>Nội dung sẽ được mở khóa ngay lập tức sau khi thanh toán.</li>
              <li>Nếu số tiền cọc lớn hơn số yêu cầu, phần thừa sẽ được hoàn trả.</li>
              <li>Hành động này không thể hoàn tác sau khi thực hiện.</li>
            </ul>
          </div>
        </div>

        <div className="open-request-modal-actions">
          <button 
            className="cancel-btn" 
            onClick={handleClose}
            disabled={submitting}
          >
            Hủy bỏ
          </button>
          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Đang xử lý...' : 'Mở khóa ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenRequestModal; 