import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config/config';
import '../../styles/components/GiftModal.css';

const GiftModal = ({ isOpen, onClose, novelId, onGiftSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const [gifts, setGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch gifts and user balance when modal opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchGifts();
      fetchUserBalance();
    }
  }, [isOpen, isAuthenticated]);

  const fetchGifts = async () => {
    try {
      const response = await axios.get(`${config.backendUrl}/api/gifts`);
      setGifts(response.data);
    } catch (error) {
      console.error('Error fetching gifts:', error);
      setError('Không thể tải danh sách quà tặng');
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/users/${user.username}/profile`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setUserBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  const handleGiftSelect = (gift) => {
    setSelectedGift(gift);
    setError('');
  };

  const handleSendGift = async () => {
    if (!selectedGift) {
      setError('Vui lòng chọn một món quà');
      return;
    }

    if (userBalance < selectedGift.price) {
      setError(`Số dư không đủ. Bạn cần ${selectedGift.price} 🌾 nhưng chỉ có ${userBalance} 🌾`);
      return;
    }

    // Show confirmation dialog
    const balanceAfter = userBalance - selectedGift.price;
    const confirmMessage = `Bạn có chắc chắn muốn tặng ${selectedGift.icon} ${selectedGift.name} với giá ${selectedGift.price} 🌾?\n\n` +
      `Số dư hiện tại: ${userBalance} 🌾\n` +
      `Số dư sau khi tặng: ${balanceAfter} 🌾\n\n` +
      `Lưu ý: Quà tặng sẽ không được thêm vào Kho lúa.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/gifts/send`,
        {
          novelId,
          giftId: selectedGift._id
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Update local user balance
      setUserBalance(response.data.userBalanceAfter);

      // Show success message
      alert(response.data.message);

      // Call success callback to refresh novel data
      if (onGiftSuccess) {
        onGiftSuccess();
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error sending gift:', error);
      setError(error.response?.data?.message || 'Lỗi khi gửi quà tặng');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedGift(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="gift-modal-overlay" onClick={handleClose}>
      <div className="gift-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="gift-modal-header">
          <h3>Tặng quà cho truyện</h3>
          <button className="gift-modal-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="gift-modal-body">
          {!isAuthenticated ? (
            <div className="gift-auth-required">
              <p>Vui lòng đăng nhập để tặng quà</p>
            </div>
          ) : (
            <>
              <div className="gift-user-balance">
                <div className="balance-info">
                  <i className="fas fa-seedling"></i>
                  <span>Số dư của bạn: {userBalance.toLocaleString()} 🌾</span>
                </div>
              </div>

              {error && (
                <div className="gift-error-message">
                  {error}
                </div>
              )}

              <div className="gift-selection">
                <h4>Chọn món quà:</h4>
                <div className="gift-grid">
                  {gifts.map((gift) => (
                    <div
                      key={gift._id}
                      className={`gift-option ${selectedGift?._id === gift._id ? 'selected' : ''} ${userBalance < gift.price ? 'disabled' : ''}`}
                      onClick={() => userBalance >= gift.price && handleGiftSelect(gift)}
                    >
                      <div className="gift-icon">{gift.icon}</div>
                      <div className="gift-name">{gift.name}</div>
                      <div className="gift-price">{gift.price} 🌾</div>
                      {userBalance < gift.price && (
                        <div className="gift-insufficient">Không đủ 🌾</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedGift && (
                <div className="gift-selected-info">
                  <h4>Món quà đã chọn:</h4>
                  <div className="selected-gift-display">
                    <span className="selected-gift-icon">{selectedGift.icon}</span>
                    <span className="selected-gift-name">{selectedGift.name}</span>
                    <span className="selected-gift-price">{selectedGift.price} 🌾</span>
                  </div>
                  <div className="gift-note">
                    <i className="fas fa-info-circle"></i>
                    <span>Quà tặng trực tiếp dành cho dịch giả/tác giả, không được thêm vào Kho lúa</span>
                  </div>
                </div>
              )}

              <div className="gift-modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendGift}
                  disabled={!selectedGift || loading || userBalance < (selectedGift?.price || 0)}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-gift"></i>
                      Tặng quà
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiftModal; 