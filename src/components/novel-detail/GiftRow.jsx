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
        <div className="gift-row">
          <div className="gift-loading">Đang tải quà tặng...</div>
        </div>
    );
  }

  return (
      <>
        <div className="gift-row">
          {gifts.map((gift) => (
              <div
                  key={gift._id}
                  className="gift-item"
                  onClick={() => handleGiftClick(gift)}
                  title={`Tặng ${gift.name} - ${gift.price} 🌾`}
              >
                {/* FIXED: Icon container với count ở góc dưới trái */}
                <div className="gift-icon-container">
                  <div className="gift-icon">{gift.icon}</div>
                  <div className="gift-count">{gift.count}</div>
                </div>
                <div className="gift-price">{gift.price} lúa</div>
              </div>
          ))}
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