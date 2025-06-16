import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import config from '../../config/config';
import '../../styles/components/ContributionModal.css';

const ContributionModal = ({ isOpen, onClose, novelId, onContributionSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // Fetch user balance when modal opens
  React.useEffect(() => {
    const fetchUserBalance = async () => {
      if (isAuthenticated && user?.username && isOpen) {
        try {
          const userResponse = await axios.get(
            `${config.backendUrl}/api/users/${user.username}/profile`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setUserBalance(userResponse.data.balance || 0);
        } catch (error) {
          console.error('Failed to fetch user balance:', error);
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

    console.log(`💰 [ContributionModal] Starting contribution: ${amount} 🌾 for novel ${novelId}`);
    console.log(`💰 [ContributionModal] User balance before contribution: ${userBalance} 🌾`);

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

      console.log(`✅ [ContributionModal] Contribution successful:`, response.data);

      // Update local user balance
      const newBalance = userBalance - amount;
      setUserBalance(newBalance);
      console.log(`💰 [ContributionModal] Updated local balance: ${userBalance} → ${newBalance} 🌾`);
      
      // Dispatch balance update event for SecondaryNavbar
      console.log(`📡 [ContributionModal] Dispatching balanceUpdated event...`);
      window.dispatchEvent(new CustomEvent('balanceUpdated', { 
        detail: { 
          oldBalance: userBalance, 
          newBalance: newBalance, 
          amount: amount,
          source: 'contribution',
          novelId: novelId
        } 
      }));
      console.log(`📡 [ContributionModal] balanceUpdated event dispatched successfully`);
      
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="contribution-modal-content">
        <div className="contribution-modal-header">
          <h3 className="modal-title">Góp lúa</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="contribution-modal-body">
          <div className="user-balance-info">
            <div className="balance-label">Số dư hiện tại của bạn</div>
            <div className="balance-value">{userBalance.toLocaleString()} 🌾</div>
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
};

export default ContributionModal; 