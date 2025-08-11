import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config/config';
import '../../styles/components/ContributionModal.css';

const ContributionModal = ({ isOpen, onClose, novelId, onContributionSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // Create portal container
  const [portalContainer, setPortalContainer] = React.useState(null);

  React.useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('vt-contribution-modal-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vt-contribution-modal-portal';
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

  // Prevent body scroll when modal is open
  React.useEffect(() => {
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

  // Set user balance when modal opens
  React.useEffect(() => {
    const fetchUserBalance = async () => {
      if (isAuthenticated && user && isOpen) {
        // If user object already has balance, use it
        if (user.balance !== undefined) {
          setUserBalance(user.balance);
          return;
        }
        
        // Otherwise, fetch it from the user's profile endpoint
        try {
          const response = await axios.get(
            `${config.backendUrl}/api/users/${user.displayName || user.username}/profile`,
            { 
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
          setUserBalance(response.data.balance || 0);
        } catch (error) {
          console.error('❌ [ContributionModal] Failed to fetch user balance:', error);
          // Fallback to 0 if we can't fetch balance
          setUserBalance(0);
        }
      }
    };

    fetchUserBalance();
  }, [isAuthenticated, user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để đóng góp');
      return;
    }

    if (amount < 10) {
      alert('Số lượng đóng góp tối thiểu là 10 🌾');
      return;
    }

    if (amount > userBalance) {
      alert('Số dư không đủ để thực hiện đóng góp này');
      return;
    }



    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/novels/${novelId}/contribute`,
        {
          amount: Number(amount),
          note: note.trim() || 'Đóng góp cho truyện'
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Update local user balance
      const newBalance = userBalance - amount;
      setUserBalance(newBalance);
      
      // Dispatch balance update event for SecondaryNavbar
      window.dispatchEvent(new CustomEvent('balanceUpdated', { 
        detail: { 
          oldBalance: userBalance, 
          newBalance: newBalance, 
          amount: amount,
          source: 'contribution',
          novelId: novelId
        } 
      }));
      
      alert(`Cảm ơn bạn đã đóng góp ${amount} 🌾!`);
      
      // Reset form
      setAmount(10);
      setNote('');
      
      // Close modal and notify parent
      onClose();
      if (onContributionSuccess) {
        onContributionSuccess(response.data);
      }
      
    } catch (error) {
      console.error('❌ [ContributionModal] Failed to contribute:', error);
      alert(error.response?.data?.message || 'Không thể thực hiện đóng góp');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle overlay click to close modal
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !portalContainer) return null;

  // Render modal content with portal
  const modalContent = (
    <div className="vt-contribution-modal-overlay" onClick={handleOverlayClick}>
      <div className="vt-contribution-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="contribution-modal-header">
          <h3 className="modal-title">Góp lúa</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="vt-contribution-modal-body">
          <div className="user-balance-info">
            <div className="balance-info-display">
              <i className="fas fa-seedling balance-info-icon"></i>
              <span className="balance-info-text">
                Số dư của bạn: {userBalance.toLocaleString()} 🌾
              </span>
              <button
                type="button"
                className="topup-button-green"
                onClick={() => { onClose(); navigate('/nap-tien'); }}
                aria-label="Nạp thêm lúa"
              >
                Nạp thêm
              </button>
            </div>
          </div>
          <form className="contribute-form" onSubmit={handleSubmit}>
            <div className="contribution-form-group">
              <label className="contribution-form-label" htmlFor="contributeAmount">Số lúa góp:</label>
              <input 
                type="number" 
                id="contributeAmount" 
                min="10" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="contribution-form-group">
              <label className="contribution-form-label" htmlFor="contributeNote">Ghi chú (không bắt buộc):</label>
              <textarea 
                id="contributeNote" 
                placeholder="Để lại lời nhắn của bạn..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="contribution-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || amount > userBalance}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đóng góp'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside the component tree
  return createPortal(modalContent, portalContainer);
};

export default ContributionModal; 