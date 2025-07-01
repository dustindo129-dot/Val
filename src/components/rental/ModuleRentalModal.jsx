import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faClock, faCoins } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import '../../styles/components/ModuleRentalModal.css';

/**
 * Modal for renting modules
 */
const ModuleRentalModal = ({
  isOpen,
  onClose,
  module,
  novel,
  onRentalSuccess
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);

  // Mutation for renting module
  const rentModuleMutation = useMutation({
    mutationFn: async (moduleId) => {
      const response = await axios.post(`/api/modules/${moduleId}/rent`);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['novel', novel?.slug] });
      queryClient.invalidateQueries({ queryKey: ['activeRentals'] });
      
      // CRITICAL: Invalidate all chapter queries so they refetch with new rental access
      queryClient.invalidateQueries({ queryKey: ['chapter'] });
      queryClient.invalidateQueries({ queryKey: ['user-chapter-interaction'] });
      
      if (onRentalSuccess) {
        onRentalSuccess(data);
      }
      
      onClose();
    },
    onError: (error) => {
      console.error('Rental error:', error);
    }
  });

  const handleRent = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    
    rentModuleMutation.mutate(module._id);
  };

  const handleCancel = () => {
    setIsConfirming(false);
    onClose();
  };

  if (!isOpen || !module) return null;

  const formatTimeRemaining = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="rental-modal-overlay" onClick={handleCancel}>
      <div className="rental-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rental-modal-header">
          <h3>Thuê Tập</h3>
          <button className="rental-close-btn" onClick={handleCancel}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="rental-modal-content">
          <div className="rental-module-info">
            <img 
              src={module.illustration} 
              alt={module.title}
              className="rental-module-cover"
              onError={(e) => {
                e.target.src = 'https://Valvrareteam.b-cdn.net/defaults/missing-image.png';
              }}
            />
            <div className="rental-module-details">
              <h4>{module.title}</h4>
              <p className="rental-novel-title">{novel?.title}</p>
              <div className="rental-info-grid">
                <div className="rental-info-item">
                  <FontAwesomeIcon icon={faCoins} className="rental-icon" />
                  <span>Giá thuê: {module.rentBalance} 🌾</span>
                </div>
                <div className="rental-info-item">
                  <FontAwesomeIcon icon={faClock} className="rental-icon" />
                  <span>Thời gian: 24 giờ</span>
                </div>
                <div className="rental-info-item">
                  <FontAwesomeIcon icon={faCoins} className="rental-icon" />
                  <span>Số dư của bạn: {user?.balance || 0} 🌾</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="rental-description">
            <h5>Khi thuê tập này:</h5>
            <ul>
              <li>Tất cả chương trả phí trong tập sẽ được mở khóa trong 24 giờ</li>
              <li>Nếu có chương mới được thêm vào, bạn cũng sẽ được truy cập</li>
              <li>Chỉ tài khoản của bạn mới có thể đọc nội dung đã thuê</li>
              <li>Sau 24 giờ, quyền truy cập sẽ tự động hết hạn</li>
            </ul>
          </div>
          
          {rentModuleMutation.error && (
            <div className="rental-error">
              {rentModuleMutation.error.response?.data?.message || 'Có lỗi xảy ra khi thuê tập'}
            </div>
          )}
          
          <div className="rental-balance-check">
            {user?.balance < module.rentBalance ? (
              <div className="insufficient-balance">
                <p>Số dư không đủ để thuê tập này</p>
                <p>Bạn cần thêm {module.rentBalance - (user?.balance || 0)} 🌾</p>
              </div>
            ) : (
              <div className="sufficient-balance">
                <p>Sau khi thuê, số dư còn lại: {(user?.balance || 0) - module.rentBalance} 🌾</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="rental-modal-actions">
          <button 
            className="rental-cancel-btn" 
            onClick={handleCancel}
            disabled={rentModuleMutation.isPending}
          >
            Hủy
          </button>
          <button 
            className={`rental-confirm-btn ${isConfirming ? 'confirming' : ''}`}
            onClick={handleRent}
            disabled={rentModuleMutation.isPending || user?.balance < module.rentBalance}
          >
            {rentModuleMutation.isPending ? (
              'Đang xử lý...'
            ) : isConfirming ? (
              'Xác nhận thuê'
            ) : (
              `Thuê - ${module.rentBalance} 🌾`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleRentalModal; 