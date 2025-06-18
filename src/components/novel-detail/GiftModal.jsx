import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [giftNote, setGiftNote] = useState('');

  // Create portal container
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('vt-gift-modal-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vt-gift-modal-portal';
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

  // Fetch gifts and user balance when modal opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchGifts();
      fetchUserBalance();
    }
  }, [isOpen, isAuthenticated]);

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
            giftId: selectedGift._id,
            note: giftNote.trim() || null
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
    setGiftNote('');
    onClose();
  };

  // Handle overlay click to close modal
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !portalContainer) return null;

  // Render modal content with namespaced classes
  const modalContent = (
      <div
          className="vt-gift-modal-overlay"
          onClick={handleOverlayClick}
      >
        <div
            className="vt-gift-modal-content"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="vt-gift-modal-header">
            <h3 className="vt-gift-modal-title">Tặng quà cho truyện</h3>
            <button className="vt-gift-modal-close" onClick={handleClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="vt-gift-modal-body">
            {!isAuthenticated ? (
                <div className="vt-gift-auth-required">
                  <p>Vui lòng đăng nhập để tặng quà</p>
                </div>
            ) : (
                <>
                  <div className="vt-gift-user-balance">
                    <div className="vt-gift-balance-info">
                      <i className="fas fa-seedling vt-gift-balance-icon"></i>
                      <span className="vt-gift-balance-text">
                    Số dư của bạn: {userBalance.toLocaleString()} 🌾
                  </span>
                    </div>
                  </div>

                  {error && (
                      <div className="vt-gift-error-message">
                        {error}
                      </div>
                  )}

                  <div className="vt-gift-selection">
                    <h4 className="vt-gift-selection-title">Chọn món quà:</h4>
                    <div className="vt-gift-grid">
                      {gifts.map((gift) => (
                          <div
                              key={gift._id}
                              className={`vt-gift-option ${
                                  selectedGift?._id === gift._id ? 'vt-gift-option--selected' : ''
                              } ${
                                  userBalance < gift.price ? 'vt-gift-option--disabled' : ''
                              }`}
                              onClick={() => userBalance >= gift.price && handleGiftSelect(gift)}
                          >
                            <div className="vt-gift-option-icon">{gift.icon}</div>
                            <div className="vt-gift-option-name">{gift.name}</div>
                            <div className="vt-gift-option-price">{gift.price} 🌾</div>
                            {userBalance < gift.price && (
                                <div className="vt-gift-option-insufficient">Không đủ 🌾</div>
                            )}
                          </div>
                      ))}
                    </div>
                  </div>

                  {selectedGift && (
                      <div className="vt-gift-selected-info">
                        <h4 className="vt-gift-selected-title">Món quà đã chọn:</h4>
                        <div className="vt-gift-selected-display">
                          <span className="vt-gift-selected-icon">{selectedGift.icon}</span>
                          <span className="vt-gift-selected-name">{selectedGift.name}</span>
                          <span className="vt-gift-selected-price">{selectedGift.price} 🌾</span>
                        </div>
                        <div className="vt-gift-note">
                          <i className="fas fa-info-circle vt-gift-note-icon"></i>
                          <span className="vt-gift-note-text">
                      Quà tặng trực tiếp dành cho dịch giả/tác giả, không được thêm vào Kho lúa
                    </span>
                        </div>
                      </div>
                  )}

                  {/* Gift note input */}
                  <div className="vt-gift-note-input-section">
                    <h4 className="vt-gift-note-input-title">Lời nhắn (không bắt buộc):</h4>
                    <textarea
                      className="vt-gift-note-input"
                      placeholder="Để lại lời nhắn của bạn..."
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      maxLength={200}
                      rows={3}
                      disabled={loading}
                    />
                    <div className="vt-gift-note-input-count">
                      {giftNote.length}/200
                    </div>
                  </div>

                  <div className="vt-gift-modal-actions">
                    <button
                        className="vt-gift-btn vt-gift-btn--secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                      Hủy
                    </button>
                    <button
                        className="vt-gift-btn vt-gift-btn--primary"
                        onClick={handleSendGift}
                        disabled={!selectedGift || loading || userBalance < (selectedGift?.price || 0)}
                    >
                      {loading ? (
                          <>
                            <i className="fas fa-spinner fa-spin vt-gift-btn-icon"></i>
                            <span className="vt-gift-btn-text">Đang gửi...</span>
                          </>
                      ) : (
                          <>
                            <i className="fas fa-gift vt-gift-btn-icon"></i>
                            <span className="vt-gift-btn-text">Tặng quà</span>
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

  // Use createPortal to render outside the component tree
  return createPortal(modalContent, portalContainer);
};

export default GiftModal;