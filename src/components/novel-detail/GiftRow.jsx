import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config/config';
import GiftModal from './GiftModal';
import '../../styles/components/GiftRow.css';

const GiftRow = ({ novelId, onGiftSuccess }) => {
  const { isAuthenticated } = useAuth();
  const [gifts, setGifts] = useState([]);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGifts();
  }, [novelId]);

  const fetchGifts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.backendUrl}/api/gifts/novel/${novelId}`);
      setGifts(response.data);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGiftClick = (gift) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để tặng quà');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }
    setIsGiftModalOpen(true);
  };

  const handleGiftSuccess = () => {
    // Refresh gift counts
    fetchGifts();
    // Call parent callback to refresh novel data
    if (onGiftSuccess) {
      onGiftSuccess();
    }
  };

  if (loading) {
    return (
        <div className="compact-gift-container">
          <div className="gift-header-compact">
            <div className="gift-header-icon-compact">
              <i className="fas fa-gift"></i>
            </div>
            <span className="gift-title-compact">Tặng Quà</span>
          </div>

          <div className="gift-row-horizontal">
            <div className="gift-empty-compact">
              <i className="fas fa-spinner fa-spin"></i>
              <span>Đang tải...</span>
            </div>
          </div>
        </div>
    );
  }

  return (
      <>
        <div className="compact-gift-container">
          <div className="gift-header-compact">
            <div className="gift-header-icon-compact">
              <i className="fas fa-gift"></i>
            </div>
            <span className="gift-title-compact">Tặng Quà</span>
          </div>

          <div className="gift-row-horizontal">
            {gifts.map((gift) => (
                <div
                    key={gift._id}
                    className="compact-gift-item"
                    onClick={() => handleGiftClick(gift)}
                    title={`Tặng ${gift.name} - ${gift.price} 🌾`}
                >
                  <div className="gift-content">
                    <div className="gift-icon-and-price">
                      <div className="gift-icon-wrapper">
                        <span className="gift-icon-compact">{gift.icon}</span>
                        {gift.count > 0 && (
                            <div className="gift-count-compact">{gift.count}</div>
                        )}
                      </div>
                      <span className="gift-price-text">🌾 {gift.price}</span>
                    </div>
                    <div className="gift-name-compact">{gift.name}</div>
                  </div>
                </div>
            ))}

            {gifts.length === 0 && (
                <div className="gift-empty-compact">Chưa có quà</div>
            )}
          </div>
        </div>

        <GiftModal
            isOpen={isGiftModalOpen}
            onClose={() => setIsGiftModalOpen(false)}
            novelId={novelId}
            onGiftSuccess={handleGiftSuccess}
        />
      </>
  );
};

export default GiftRow;