import { useState, useEffect } from 'react';
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
  const [subMethod, setSubMethod] = useState(null);
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
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Form data for different payment methods
  const [formData, setFormData] = useState({
    momo: { phoneNumber: '' },
    zalopay: { phoneNumber: '' },
    bank: { accountNumber: '', accountName: '', bankName: '', transferContent: '' },
    prepaidCard: { cardNumber: '', cardPin: '', provider: '' }
  });

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
          { price: 250000, balance: 2800, note: "Với gói này phú hào có thể unlock ngay một tập truyện dịch từ Eng" },
          { price: 350000, balance: 4000, note: "Với gói này đại gia đủ sức bao trọn một tập truyện bất kì dịch từ Jap" }
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
    setSubMethod(method === 'ewallet' ? 'momo' : null);
    // Reset QR code when changing payment method
    setShowQRCode(false);
    setQrCodeUrl('');
    setTransferContent('');
  };

  // Handle sub-method selection (for e-wallets)
  const handleSubMethodSelect = (method) => {
    setSubMethod(method);
  };

  // Generate random transfer content
  const generateRandomContent = (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Generate QR code using VietQR API
  const generateQRCode = () => {
    if (!selectedAmount) {
      alert('Vui lòng chọn số tiền nạp');
      return;
    }

    // Generate random transfer content
    const newTransferContent = generateRandomContent(8);
    setTransferContent(newTransferContent);

    // Create VietQR URL
    const bankId = "ICB"; // Vietinbank code
    const accountNo = "100868151423";
    const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${selectedAmount.price}&addInfo=${newTransferContent}`;
    
    // Update QR code URL
    setQrCodeUrl(vietQrUrl);
    
    // Show QR code section
    setShowQRCode(true);

    // Update bank form data with the new transfer content
    setFormData(prev => ({
      ...prev,
      bank: {
        ...prev.bank,
        transferContent: newTransferContent
      }
    }));
  };

  // Handle amount selection
  const handleAmountSelect = (option) => {
    setSelectedAmount(option);
    
    // Reset QR code when changing amount
    setShowQRCode(false);
    setQrCodeUrl('');
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

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAmount) {
      setError('Vui lòng chọn số tiền');
      return;
    }

    if (!paymentMethod) {
      setError('Vui lòng chọn phương thức thanh toán');
      return;
    }

    setLoading(true);

    try {
      // Prepare request data based on payment method
      let requestData = {
        amount: selectedAmount.price,
        balance: selectedAmount.balance,
        paymentMethod,
        subMethod
      };

      // Add method-specific details
      if (paymentMethod === 'ewallet') {
        requestData.details = subMethod ? formData[subMethod] : {};
      } else if (paymentMethod === 'bank') {
        // For bank transfers, use the random transfer content if available
        const bankTransferContent = transferContent || generateRandomContent(8);
        
        requestData.details = {
          bankName: "VIETINBANK",
          accountName: "TRUONG TAN TAI",
          accountNumber: "100868151423",
          transferContent: bankTransferContent
        };
      } else if (paymentMethod === 'prepaidCard') {
        requestData.details = formData[paymentMethod];
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/topup/request`,
        requestData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Show success message
      alert(response.data.message);
      
      // Reset form
      setPaymentMethod(null);
      setSubMethod(null);
      setSelectedAmount(null);
      setShowQRCode(false);
      setQrCodeUrl('');
      setTransferContent('');
      setFormData({
        momo: { phoneNumber: '' },
        zalopay: { phoneNumber: '' },
        bank: { accountNumber: '', accountName: '', bankName: '', transferContent: '' },
        prepaidCard: { cardNumber: '', cardPin: '', provider: '' }
      });
      
      // Refresh pending requests
      const pendingResponse = await axios.get(
        `${config.backendUrl}/api/topup/pending`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPendingRequests(pendingResponse.data);
      
    } catch (err) {
      console.error('Top-up request failed:', err);
      setError(err.response?.data?.message || 'Failed to process top-up request');
    } finally {
      setLoading(false);
    }
  };

  // Handle viewing transaction history
  const handleViewHistory = async () => {
    setViewHistory(true);
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

  return (
    <div className="top-up-container">
      <h1>Nạp 🌾 vào tài khoản</h1>
      
      {/* Rules section */}
      <section className="top-up-section rules-section">
        <div className="rules-list">
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>🌾 là đơn vị tiền ảo trong hệ thống</p>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🦋</span>
            <p>🌾 chỉ có thể được dùng để mở chương/tập, mở khóa chức năng, và hỗ trợ dịch giả/tác giả</p>
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
        </div>
      </section>

      <div className="top-up-content">
        {/* Payment method selection */}
        <section className="top-up-section">
          <h2>Chọn phương thức thanh toán</h2>
          <div className="payment-methods">
            <div 
              className={`payment-method-card ${paymentMethod === 'ewallet' ? 'selected' : ''}`}
              onClick={() => handleMethodSelect('ewallet')}
            >
              <div className="payment-logos">
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/mmo.png" alt="Momo" />
                </div>
                <div className="payment-logo">
                  <img src="https://Valvrareteam.b-cdn.net/zalopay.webp" alt="ZaloPay" />
                </div>
              </div>
              <p>Thanh toán bằng Momo và ZaloPay</p>
            </div>

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
              className={`payment-method-card ${paymentMethod === 'prepaidCard' ? 'selected' : ''}`}
              onClick={() => handleMethodSelect('prepaidCard')}
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
            
            {/* E-wallet payment details */}
            {paymentMethod === 'ewallet' && (
              <div className="payment-details">
                <div className="sub-methods">
                  <label className="sub-method">
                    <input 
                      type="radio" 
                      name="ewallet" 
                      value="momo" 
                      checked={subMethod === 'momo'}
                      onChange={() => handleSubMethodSelect('momo')}
                    />
                    <span className="radio-label">Momo</span>
                  </label>
                  <label className="sub-method">
                    <input 
                      type="radio" 
                      name="ewallet" 
                      value="zalopay" 
                      checked={subMethod === 'zalopay'}
                      onChange={() => handleSubMethodSelect('zalopay')}
                    />
                    <span className="radio-label">ZaloPay</span>
                  </label>
                </div>

                {subMethod === 'momo' && (
                  <div className="method-form">
                    <div className="form-group">
                      <label htmlFor="momo-phone">Số điện thoại Momo</label>
                      <input 
                        type="text" 
                        id="momo-phone" 
                        value={formData.momo.phoneNumber}
                        onChange={(e) => handleInputChange('momo', 'phoneNumber', e.target.value)}
                        placeholder="Nhập số điện thoại Momo của bạn"
                      />
                    </div>
                  </div>
                )}

                {subMethod === 'zalopay' && (
                  <div className="method-form">
                    <div className="form-group">
                      <label htmlFor="zalopay-phone">Số điện thoại ZaloPay</label>
                      <input 
                        type="text" 
                        id="zalopay-phone" 
                        value={formData.zalopay.phoneNumber}
                        onChange={(e) => handleInputChange('zalopay', 'phoneNumber', e.target.value)}
                        placeholder="Nhập số điện thoại ZaloPay của bạn"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bank transfer details */}
            {paymentMethod === 'bank' && (
              <div className="payment-details">
                <div className="method-form">
                  <div className="bank-instructions">
                    <p>Quét mã QR hoặc chuyển khoản theo thông tin dưới đây:</p>
                    
                    {/* QR code generate button - always visible */}
                    <button className="qr-button" onClick={generateQRCode} disabled={!selectedAmount}>
                      Tạo mã QR
                    </button>
                    
                    {/* QR code section - only shown after QR is generated */}
                    {showQRCode && qrCodeUrl && (
                      <div className="bank-qr-container">
                        <img 
                          src={qrCodeUrl}
                          alt="QR Code" 
                          className="bank-qr-code"
                        />
                      </div>
                    )}
                    
                    <div className="bank-transfer-info">
                      <div className="info-row">
                        <span className="info-label">Ngân hàng:</span>
                        <span className="info-value">Vietinbank</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Tài khoản nhận:</span>
                        <span className="info-value">100868151423</span>
                        <button className="copy-button" onClick={() => {navigator.clipboard.writeText("100868151423")}}>[ Copy ]</button>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Tên người nhận:</span>
                        <span className="info-value">TRUONG TAN TAI</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Nội dung:</span>
                        <span className="info-value">
                          {transferContent || (selectedAmount ? 'Vui lòng nhấn "Tạo mã QR"' : 'Vui lòng chọn số tiền nạp')}
                        </span>
                        {transferContent && (
                          <button 
                            className="copy-button"
                            onClick={() => navigator.clipboard.writeText(transferContent)}
                          >
                            [ Copy ]
                          </button>
                        )}
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
                        <li>Để lúa được cập nhật nhanh chóng, quý khách vui lòng chuyển khoản đúng số tài khoản, đúng số tiền và điền chính xác nội dung chuyển khoản ở trên.</li>
                        <li>Không điền thêm bất kỳ chữ cái hoặc ký tự nào ngoài nội dung đã được cung cấp.</li>
                        <li>Số dư sẽ được cập nhật trong vòng tối đa 24h sau khi chúng tôi nhận được thanh toán.</li>
                        <li>
                          Nếu có thắc mắc về vấn đề chuyển khoản, vui lòng inbox fanpage{' '}  
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

            {/* Prepaid card details */}
            {paymentMethod === 'prepaidCard' && (
              <div className="payment-details">
                <div className="method-form">
                  <div className="form-group">
                    <label htmlFor="card-provider">Nhà mạng</label>
                    <select 
                      id="card-provider"
                      value={formData.prepaidCard.provider}
                      onChange={(e) => handleInputChange('prepaidCard', 'provider', e.target.value)}
                    >
                      <option value="">Chọn nhà mạng</option>
                      <option value="viettel">Viettel</option>
                      <option value="vinaphone">Vinaphone</option>
                      <option value="mobiphone">Mobiphone</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="card-number">Số thẻ</label>
                    <input 
                      type="text" 
                      id="card-number" 
                      value={formData.prepaidCard.cardNumber}
                      onChange={(e) => handleInputChange('prepaidCard', 'cardNumber', e.target.value)}
                      placeholder="Nhập số thẻ/seri"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="card-pin">Mã PIN</label>
                    <input 
                      type="text" 
                      id="card-pin" 
                      value={formData.prepaidCard.cardPin}
                      onChange={(e) => handleInputChange('prepaidCard', 'cardPin', e.target.value)}
                      placeholder="Nhập mã PIN"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button 
              className="submit-button" 
              onClick={handleSubmit}
              disabled={loading || !selectedAmount || !paymentMethod}
            >
              {loading ? 'Đang xử lý...' : 'Gửi yêu cầu thanh toán'}
            </button>

            {/* Error message */}
            {error && <div className="error-message">{error}</div>}
          </section>
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
                className="refresh-button"
                onClick={handleViewHistory}
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
                        {transaction.paymentMethod === 'ewallet' 
                          ? `${transaction.subMethod.charAt(0).toUpperCase() + transaction.subMethod.slice(1)}` 
                          : transaction.paymentMethod === 'bank' 
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