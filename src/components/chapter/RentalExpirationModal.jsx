import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCoins, faTimes } from '@fortawesome/free-solid-svg-icons';
import { generateNovelUrl } from '../../utils/slugUtils';
import '../../styles/components/RentalExpirationModal.css';

/**
 * Modal that appears when a user's rental expires while they're reading
 */
const RentalExpirationModal = ({
  isOpen,
  onClose,
  onRentAgain,
  module,
  novel,
  chapter
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleRentAgain = () => {
    if (onRentAgain) {
      onRentAgain();
    }
  };

  const handleGoToNovel = () => {
    if (novel) {
      const novelUrl = generateNovelUrl(novel);
      navigate(novelUrl, {
        state: { scrollToContribution: true }
      });
    }
  };

  const handleCloseModal = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="rental-expiration-overlay" onClick={handleCloseModal}>
      <div className="rental-expiration-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="close-rental-modal"
          onClick={handleCloseModal}
          aria-label="Đóng"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
        
        <div className="rental-expiration-content">
          <div className="rental-expired-icon">
            <FontAwesomeIcon icon={faClock} />
          </div>
          
          <h3>Thời gian thuê đã hết hạn</h3>
          
          <p>
            Thời gian thuê "{module?.title || 'module'}" đã hết hạn. 
            Bạn không thể tiếp tục đọc nội dung trả phí.
          </p>

          {chapter && (
            <div className="current-chapter-info">
              <span>Chương hiện tại: {chapter.title}</span>
            </div>
          )}
          
          <div className="rental-expiration-actions">
            {module && module.rentBalance > 0 && (
              <button 
                className="rent-again-btn"
                onClick={handleRentAgain}
              >
                <FontAwesomeIcon icon={faClock} />
                Thuê lại ({module.rentBalance} 🌾)
              </button>
            )}
            
            <button 
              className="go-to-novel-btn"
              onClick={handleGoToNovel}
            >
              <FontAwesomeIcon icon={faCoins} />
              Tới Kho lúa
            </button>
            
            <button 
              className="close-btn"
              onClick={handleCloseModal}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalExpirationModal; 