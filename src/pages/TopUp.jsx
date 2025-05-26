import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config/config';
import '../styles/TopUp.css';

/**
 * TopUp Page Component
 * 
 * Page for users to top-up their account balance
 * 
 * @returns {JSX.Element} TopUp page component
 */
const TopUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pricingOptions, setPricingOptions] = useState([]);
  const [fetchingPricing, setFetchingPricing] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [viewHistory, setViewHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [transferContent, setTransferContent] = useState('');
  
  // Replace showQRCode boolean with modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // Track current request ID
  const [currentRequestId, setCurrentRequestId] = useState(null);
  // Add countdown timer state
  const [countdown, setCountdown] = useState(5 * 60); // 5 minutes in seconds
  const timerRef = useRef(null);

  // Form data for different payment methods
  const [formData, setFormData] = useState({
    bank: { accountNumber: '', accountName: '', bankName: '', transferContent: '' },
    prepaidCard: { cardNumber: '', cardPin: '', provider: '' }
  });

  // Setup beforeunload event listener to warn users before leaving with unsubmitted transaction
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentRequestId) {
        // Standard way to show confirmation dialog
        const message = "Bạn chưa hoàn thành giao dịch! Vui lòng bấm 'Xác nhận' trước khi rời đi.";
        e.returnValue = message; // Standard for Chrome, Firefox, IE
        return message; // For Safari
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentRequestId]);

  // Fetch pricing options
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setFetchingPricing(true);
        const response = await axios.get(
          `${config.backendUrl}/api/topup/pricing`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setPricingOptions(response.data);
      } catch (err) {
        console.error('Failed to fetch pricing options:', err);
        setPricingOptions([
          { price: 12000, balance: 100, note: "Chỉ với 12.000đ mỗi tháng bạn sẽ không bao giờ thấy bất kì quảng cáo nào trên page trong cuộc đời này" },
          { price: 20000, balance: 200, note: "Gói bình dân hạt dẻ" },
          { price: 50000, balance: 550, note: "Thêm tí bonus gọi là" },
          { price: 250000, balance: 2800, note: "Với gói này phú hào có thể unlock ngay một tập truyện dịch từ ngôn ngữ Anh/Trung" },
          { price: 350000, balance: 4000, note: "Với gói này đại gia đủ sức bao trọn một tập truyện bất kì dịch từ ngôn ngữ Nhật" }
        ]);
      } finally {
        setFetchingPricing(false);
      }
    };

    fetchPricing();
  }, []);

  // Fetch pending requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!user) return;
      
      try {
        const response = await axios.get(
          `${config.backendUrl}/api/topup/pending`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setPendingRequests(response.data);
      } catch (err) {
        console.error('Failed to fetch pending requests:', err);
      }
    };

    fetchPendingRequests();
  }, [user]);

  // Handle payment method selection
  const handleMethodSelect = (method) => {
    setPaymentMethod(method);
    // Reset QR code when changing payment method
    setQrCodeUrl('');
    setTransferContent('');
    setCurrentRequestId(null);
  };

  // Generate random transfer content
  const generateRandomContent = (length = 8) => {
    // Use a mix of uppercase letters and numbers
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // removed I and O which can be confused with 1 and 0
    const numbers = '123456789'; // removed 0 which can be confused with O
    
    // Ensure at least one uppercase letter and one number
    let result = '';
    
    // Add at least 2 uppercase letters
    for (let i = 0; i < 3; i++) {
      result += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    }
    
    // Add at least 2 numbers
    for (let i = 0; i < 2; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    // Fill remaining characters randomly
    const remaining = length - result.length;
    const allChars = uppercase + numbers;
    
    for (let i = 0; i < remaining; i++) {
      result += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the result to make it more random
    return result.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // Handle QR modal open and start countdown
  const startCountdownTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Set initial countdown time (5 minutes)
    setCountdown(5 * 60);
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setCountdown(prevTime => {
        if (prevTime <= 1) {
          // Time's up, clear the interval and close the modal
          clearInterval(timerRef.current);
          setQrModalOpen(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };
  
  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Format countdown time as MM:SS
  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Check if countdown is low (less than 1 minute)
  const isCountdownLow = (seconds) => {
    return seconds < 60;
  };

  // Generate QR code and create payment request
  const generateQRCode = async () => {
    if (!selectedAmount) {
      alert('Vui lòng chọn số tiền nạp');
      return;
    }

    setLoading(true);

    try {
      // Generate random transfer content
      const newTransferContent = generateRandomContent(8);
      setTransferContent(newTransferContent);

      // Create VietQR URL
      const bankId = "ICB"; // Vietinbank code
      const accountNo = "100868151423";
      const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${selectedAmount.price}&addInfo=${newTransferContent}`;
      
      // Update QR code URL
      setQrCodeUrl(vietQrUrl);
      
      // Update bank form data with the new transfer content
      setFormData(prev => ({
        ...prev,
        bank: {
          ...prev.bank,
          transferContent: newTransferContent
        }
      }));

      // Create payment request immediately
      const requestData = {
        amount: selectedAmount.price,
        balance: selectedAmount.balance,
        paymentMethod: 'bank',
        details: {
          bankName: "VIETINBANK",
          accountName: "TRUONG TAN TAI",
          accountNumber: "100868151423",
          transferContent: newTransferContent
        }
      };
      
      const response = await axios.post(
        `${config.backendUrl}/api/topup/request`,
        requestData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Store the request ID
      setCurrentRequestId(response.data.requestId);
      
      // Open the QR modal and start countdown
      setQrModalOpen(true);
      startCountdownTimer();
      
      // Refresh pending requests
      const pendingResponse = await axios.get(
        `${config.backendUrl}/api/topup/pending`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPendingRequests(pendingResponse.data);
      
    } catch (err) {
      console.error('Failed to create QR code and payment request:', err);
      setError(err.response?.data?.message || 'Không thể tạo yêu cầu thanh toán');
    } finally {
      setLoading(false);
    }
  };

  // Handle amount selection
  const handleAmountSelect = (option) => {
    setSelectedAmount(option);
    
    // Reset QR code when changing amount
    setQrCodeUrl('');
    setTransferContent('');
    setCurrentRequestId(null);
  };

  // Handle form input changes
  const handleInputChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Handle QR modal confirm
  const handleQrConfirm = () => {
    // Clear the countdown timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setQrModalOpen(false);
    
    // Reset form after confirmation
    setSelectedAmount(null);
    setPaymentMethod(null);
    
    // Refresh pending requests
    refreshPendingRequests();
  };

  // Handle QR modal cancel
  const handleQrCancel = async () => {
    // Clear the countdown timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (currentRequestId) {
      try {
        await axios.delete(
          `${config.backendUrl}/api/topup/request/${currentRequestId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        // Refresh pending requests
        refreshPendingRequests();
      } catch (err) {
        console.error('Failed to cancel request:', err);
      }
    }
    
    // Reset state
    setQrModalOpen(false);
    setQrCodeUrl('');
    setTransferContent('');
    setCurrentRequestId(null);
  };
  
  // Refresh pending requests
  const refreshPendingRequests = async () => {
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/topup/pending`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPendingRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  // Format date for display in Vietnamese format (DD/MM/YYYY HH:MM)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Handle viewing transaction history
  const handleViewHistory = async () => {
    // Toggle the viewHistory state
    const newViewState = !viewHistory;
    setViewHistory(newViewState);
    
    // Only fetch data if we're showing the history
    if (newViewState) {
      setFetchingHistory(true);
      
      try {
        // Get all transactions including pending ones from the history endpoint
        const historyResponse = await axios.get(
          `${config.backendUrl}/api/topup/history`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        // Set history data
        setHistory(historyResponse.data);
        
        // Extract pending requests for cancel functionality
        const pendingRequests = historyResponse.data.filter(item => item.status === 'Pending');
        setPendingRequests(pendingRequests);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setFetchingHistory(false);
      }
    }
  };

  // Handle canceling a pending request
  const handleCancelRequest = async (requestId) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu này không?')) {
      return;
    }
    
    try {
      await axios.delete(
        `${config.backendUrl}/api/topup/request/${requestId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Update pending requests
      setPendingRequests(pendingRequests.filter(req => req._id !== requestId));
      
      alert('Yêu cầu đã được hủy thành công');
    } catch (err) {
      console.error('Không thể hủy yêu cầu:', err);
      alert(err.response?.data?.message || 'Không thể hủy yêu cầu');
    }
  };

  // Refresh transaction history without toggling visibility
  const refreshHistory = async () => {
    setFetchingHistory(true);
    
    try {
      // Get all transactions including pending ones from the history endpoint
      const historyResponse = await axios.get(
        `${config.backendUrl}/api/topup/history`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Set history data
      setHistory(historyResponse.data);
      
      // Extract pending requests for cancel functionality
      const pendingRequests = historyResponse.data.filter(item => item.status === 'Pending');
      setPendingRequests(pendingRequests);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  return (
    <div className="top-up-container">
      <h1>Nạp 🌾 vào tài khoản (Hệ thống đang phát triển dự kiến hoàn thành giữa tháng 6)</h1>
      
      {/* Rules section */}
      <section className="top-up-section rules-section">
        <div className="rules-list">
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>🌾 là đơn vị tiền ảo trong hệ thống</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>🌾 chỉ có thể được dùng để mở chương/tập, đề xuất truyện, mở khóa chức năng, và hỗ trợ dịch giả/tác giả</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>🌾 đã nạp không thể hoàn lại dù bất cứ lý do gì</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>🌾 sẽ được thêm vào tài khoản của bạn sau khi chúng tôi xác nhận thanh toán</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>Bạn có thể mua 🌾 bằng các phương thức thanh toán dưới đây</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>Nếu bạn sử dụng các phương thức thanh toán khác như Visa/Mastercard/Paypal/Vcoin..., vui lòng liên hệ <a href="https://www.facebook.com/profile.php?id=100064392503502" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>fanpage</a> để được hỗ trợ</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p><strong>Mã QR chuyển khoản ngân hàng có hỗ trợ Momo và ZaloPay (quét được)</strong></p>
          </div>
        </div>
        
      </section>

      <div className="top-up-content">
        {/* Payment method selection */}
        <section className="top-up-section">
          <h2>Chọn phương thức thanh toán</h2>
          <div className="payment-methods">
            <div 
              className={`payment-method-card ${paymentMethod === 'bank' ? 'selected' : ''}`}
              onClick={() => handleMethodSelect('bank')}
            >
              <div className="payment-logos">
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/vietinbank.jpg" alt="Banks" />
                </div>
              </div>
              <p>Chuyển khoản ngân hàng</p>
            </div>

            <div 
              className={`payment-method-card ${paymentMethod === 'prepaidCard' ? 'selected' : ''} disabled`}
              onClick={() => {}}
            >
              <div className="payment-logos">
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/viettel.png" alt="Viettel" />
                </div>
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/vinaphone.png" alt="Vinaphone" />
                </div>
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/mobiphone.png" alt="Mobiphone" />
                </div>
              </div>
              <p>Thẻ trả trước (Thẻ cào)</p>
            </div>
          </div>
        </section>

        {/* Payment details section - shown only when a payment method is selected */}
        {paymentMethod && (
          <section className="top-up-section">
            <h2>Chi tiết thanh toán</h2>
            
            {/* Select Amount section as radio options */}
            <div className="amount-selection">
              <h3>Chọn số tiền</h3>
              <div className="amount-options">
                {pricingOptions.map((option, index) => (
                  <label key={index} className="amount-option">
                    <input 
                      type="radio" 
                      name="amount" 
                      checked={selectedAmount === option}
                      onChange={() => handleAmountSelect(option)}
                    />
                    <div className="option-details">
                      <span className="option-price">{formatPrice(option.price)}</span>
                      <span className="option-balance">{option.balance} 🌾</span>
                      <span className="option-note">{option.note}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Bank transfer details */}
            {paymentMethod === 'bank' && (
              <div className="payment-details">
                <div className="method-form">
                  <div className="bank-instructions">
                    <p>Tạo mã QR để chuyển khoản:</p>
                    
                    {/* QR code generate button */}
                    <button 
                      className="qr-button" 
                      onClick={generateQRCode} 
                      disabled={!selectedAmount || loading}
                    >
                      {loading ? 'Đang tạo mã...' : 'Tạo mã QR'}
                    </button>
                    
                    <div className="bank-transfer-info">
                      <div className="info-row">
                        <span className="info-label">Ngân hàng:</span>
                        <span className="info-value">Vietinbank</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Tài khoản nhận:</span>
                        <span className="info-value">100868151423</span>
                        <button className="copy-button" onClick={() => {navigator.clipboard.writeText("100868151423")}}>[ Sao chép ]</button>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Tên người nhận:</span>
                        <span className="info-value">TRUONG TAN TAI</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Số tiền:</span>
                        <span className="info-value info-amount">
                          {selectedAmount ? formatPrice(selectedAmount.price) : 'Vui lòng chọn số tiền nạp'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="transfer-notes">
                      <div className="note-title">Chú ý</div>
                      <ol className="note-list">
                        <li>Để lúa được tự động cập nhật nhanh và chính xác, vui lòng chuyển khoản đúng số tài khoản, đúng số tiền và điền chính xác nội dung chuyển khoản (trong trường hợp không thể quét mã QR).</li>
                        <li>Số dư sẽ được cập nhật trong vòng tối đa 1h sau khi chuyển khoản thành công.</li>
                        <li>
                          Nếu có thắc mắc về vấn đề chuyển khoản hoặc chưa nhận được 🌾 1h sau khi thanh toán, vui lòng inbox fanpage{' '}  
                          <a href="https://www.facebook.com/profile.php?id=100064392503502" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                            Hội những người yêu thích Light Novel
                          </a>{' '}
                           để được hỗ trợ.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && <div className="error-message">{error}</div>}
          </section>
        )}

        {/* QR Code Modal */}
        {qrModalOpen && (
          <div className="qr-modal-overlay">
            <div className="qr-modal-content">
              <h3>Quét mã QR để thanh toán</h3>
              
              <div className="qr-code-container">
                <img src={qrCodeUrl} alt="QR Code" />
              </div>
              
              <div className="transfer-info">
                <div className="transfer-info-item">
                  <span>Ngân hàng:</span>
                  <span className="transfer-value">Vietinbank</span>
                </div>
                <div className="transfer-info-item">
                  <span>Tài khoản nhận:</span>
                  <span className="transfer-value">100868151423</span>
                  <button className="copy-button" onClick={() => navigator.clipboard.writeText("100868151423")}>
                    Sao chép
                  </button>
                </div>
                <div className="transfer-info-item">
                  <span>Tên người nhận:</span>
                  <span className="transfer-value">TRUONG TAN TAI</span>
                </div>
                <div className="transfer-info-item">
                  <span>Nội dung chuyển khoản:</span>
                  <span className="transfer-content">{transferContent}</span>
                  <button className="copy-button" onClick={() => navigator.clipboard.writeText(transferContent)}>
                    Sao chép
                  </button>
                </div>
                <div className="transfer-info-item">
                  <span>Số tiền:</span>
                  <span className="transfer-amount">{selectedAmount ? formatPrice(selectedAmount.price) : ''}</span>
                </div>
              </div>
              
              <div className="qr-countdown-container">
                <p className="qr-expiry-note">
                  Vui lòng quét mã QR, yêu cầu sẽ hết hạn sau <span className={`countdown-timer ${isCountdownLow(countdown) ? 'low' : ''}`}>{formatCountdown(countdown)}
                  </span>
                  Nếu chuyển khoản trực tiếp vui lòng điền chính xác nội dung và số tiền.
                </p>
              </div>
              
              <div className="qr-modal-actions">
                <button className="qr-modal-cancel" onClick={handleQrCancel}>Hủy bỏ</button>
                <button className="qr-modal-confirm" onClick={handleQrConfirm}>Xác nhận</button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction history toggle */}
        <div className="history-toggle">
          <button 
            className="history-button"
            onClick={handleViewHistory}
          >
            {viewHistory ? 'Ẩn lịch sử giao dịch' : 'Xem lịch sử giao dịch'}
          </button>
        </div>

        {/* Transaction history */}
        {viewHistory && (
          <section className="top-up-section">
            <div className="transaction-header-container">
              <h2>Lịch sử giao dịch</h2>
              <button 
                className="topup-refresh-button"
                onClick={refreshHistory}
                disabled={fetchingHistory}
              >
                {fetchingHistory ? 'Đang tải lại...' : 'Tải lại lịch sử'}
              </button>
            </div>
            {fetchingHistory ? (
              <p>Đang tải lịch sử giao dịch...</p>
            ) : history.length === 0 ? (
              <p>Không có lịch sử giao dịch</p>
            ) : (
              <div className="transaction-history">
                {history.map(transaction => (
                  <div key={transaction._id} className={`transaction-item status-${transaction.status.toLowerCase()}`}>
                    <div className="transaction-header">
                      <div className="transaction-date">{formatDate(transaction.createdAt)}</div>
                      <div className="transaction-status">{transaction.status}</div>
                    </div>
                    <div className="transaction-body">
                      <div className="transaction-amounts">
                        <div className="transaction-price">{formatPrice(transaction.amount)}</div>
                        <div className="transaction-credits">
                          {transaction.balance} 🌾
                        </div>
                      </div>
                      <div className="transaction-method">
                        {transaction.paymentMethod === 'bank' 
                          ? 'Chuyển khoản ngân hàng' 
                          : 'Thẻ trả trước'}
                      </div>
                    </div>
                    {transaction.status === 'Pending' && (
                      <div className="transaction-actions">
                        <button 
                          className="cancel-button"
                          onClick={() => handleCancelRequest(transaction._id)}
                        >
                          Hủy bỏ
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default TopUp; 