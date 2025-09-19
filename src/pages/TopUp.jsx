import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import config from '../config/config';
import { translateTopUpStatus } from '../utils/statusTranslation';
import cdnConfig from '../config/bunny';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/TopUp.css';

/**
 * TopUpSEO Component
 * 
 * Provides SEO optimization for the TopUp page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const TopUpSEO = () => {
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>Nạp Lúa - Nạp Tiền Vào Tài Khoản | Valvrareteam</title>
      <meta name="description" content="Nạp lúa vào tài khoản Valvrareteam để mở chương/tập, đề xuất truyện mới, mở khóa chức năng đặc biệt và hỗ trợ dịch giả/tác giả. Thanh toán nhanh chóng, an toàn." />
      <meta name="keywords" content="nạp lúa, nạp tiền, thanh toán, mở chương, đề xuất truyện, hỗ trợ dịch giả, valvrareteam, light novel" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content="Nạp Lúa - Nạp Tiền Vào Tài Khoản | Valvrareteam" />
      <meta property="og:description" content="Nạp lúa vào tài khoản Valvrareteam để mở chương/tập, đề xuất truyện mới, mở khóa chức năng đặc biệt và hỗ trợ dịch giả/tác giả." />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content="https://valvrareteam.net/nap-tien" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Nạp Lúa - Nạp Tiền Vào Tài Khoản | Valvrareteam" />
      <meta name="twitter:description" content="Nạp lúa vào tài khoản Valvrareteam để mở chương/tập, đề xuất truyện mới, mở khóa chức năng đặc biệt và hỗ trợ dịch giả/tác giả." />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      
      {/* Canonical URL */}
      <link rel="canonical" href="https://valvrareteam.net/nap-tien" />
    </Helmet>
  );
};

/**
 * TopUp Page Component
 * 
 * Page for users to top-up their account balance
 * 
 * @returns {JSX.Element} TopUp page component
 */
const TopUp = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // All hooks must be called before any conditional returns
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
  
  // Total balance added state
  const [totalBalanceAdded, setTotalBalanceAdded] = useState(0);
  const [fetchingTotalBalance, setFetchingTotalBalance] = useState(true);

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
          { price: 12000, balance: 100, note: "Gói chặn quảng cáo vĩnh viễn 🛡️" },
          { price: 20000, balance: 200, note: "Gói bim bim 🍟" },
          { price: 50000, balance: 520, note: "Gói cốc cà phê ☕" },
          { price: 100000, balance: 1100, note: "Gói bát phở 🍜" },
          { price: 200000, balance: 2250, note: "Gói bao trọn 1 vol tiếng Anh/Trung 💸" },
          { price: 350000, balance: 4000, note: "Gói siêu VIP bao trọn 1 vol tiếng Nhật 👑" }
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

  // Fetch total balance added from topup transactions
  useEffect(() => {
    const fetchTotalBalanceAdded = async () => {
      if (!user) return;
      
      try {
        setFetchingTotalBalance(true);
        
        // Get comprehensive user transactions from the same endpoint as transaction history
        const userTransactionsResponse = await axios.get(
          `${config.backendUrl}/api/transactions/user-transactions?limit=1000&offset=0&username=${user.username}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        const userTransactions = userTransactionsResponse.data.transactions || [];
        
        // Calculate total balance added from topup and admin_topup transactions
        const totalAdded = userTransactions
          .filter(transaction => transaction.type === 'topup' || transaction.type === 'admin_topup')
          .filter(transaction => transaction.amount > 0) // Only count positive amounts
          .reduce((total, transaction) => total + transaction.amount, 0);
        
        setTotalBalanceAdded(totalAdded);
      } catch (err) {
        console.error('Failed to fetch total balance added:', err);
        setTotalBalanceAdded(0);
      } finally {
        setFetchingTotalBalance(false);
      }
    };

    fetchTotalBalanceAdded();
  }, [user]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      // Simply redirect to home when user is not authenticated
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Don't render the component if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="top-up-container">
        <TopUpSEO />
        <div className="auth-required-message">
          <LoadingSpinner size="medium" />
        </div>
      </div>
    );
  }

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

  // Handle QR code download
  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR-Code-${transferContent}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert('Không thể tải xuống mã QR. Vui lòng thử lại.');
    }
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
    
    // Notify SecondaryNavbar to refresh balance display (manual fallback)
    window.dispatchEvent(new Event('balanceUpdated'));
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

  // Get transaction type display text
  const getTransactionTypeText = (type) => {
    const typeMap = {
      'topup': 'Nạp tiền (tự động)',
      'admin_topup': 'Nạp tiền (admin)',
      'request': 'Yêu cầu truyện mới',
      'admin': 'Điều chỉnh thủ công',
      'contribution': 'Đóng góp',
      'gift': 'Quà tặng',
      'gift_received': 'Nhận quà tặng',
      'refund': 'Hoàn tiền',
      'withdrawal': 'Rút tiền',
      'rental': 'Mở tạm thời tập',
      'open': 'Mở khóa nội dung',
      'other': 'Khác'
    };
    return typeMap[type] || type;
  };

  // Get transaction amount class based on whether it's positive or negative
  const getAmountClass = (amount) => {
    return amount >= 0 ? 'amount-positive' : 'amount-negative';
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
        // Get comprehensive user transactions from the same endpoint as admin panel
        const userTransactionsResponse = await axios.get(
          `${config.backendUrl}/api/transactions/user-transactions?limit=50&offset=0&username=${user.username}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        // Also get TopUpRequest history for pending requests
        const topUpHistoryResponse = await axios.get(
          `${config.backendUrl}/api/topup/history`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        // Combine both types of transactions
        const userTransactions = userTransactionsResponse.data.transactions || [];
        const topUpHistory = topUpHistoryResponse.data || [];
        
        // Set comprehensive history data
        setHistory(userTransactions);
        
        // Extract pending requests for cancel functionality
        const pendingRequests = topUpHistory.filter(item => item.status === 'Pending');
        setPendingRequests(pendingRequests);
        
        // Refresh total balance added when viewing history for the first time
        await refreshTotalBalanceAdded();
      } catch (err) {
        console.error('Failed to fetch history:', err);
        // Fallback to original TopUp history if user transactions fail
        try {
          const historyResponse = await axios.get(
            `${config.backendUrl}/api/topup/history`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setHistory(historyResponse.data);
          const pendingRequests = historyResponse.data.filter(item => item.status === 'Pending');
          setPendingRequests(pendingRequests);
        } catch (fallbackErr) {
          console.error('Failed to fetch fallback history:', fallbackErr);
        }
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

  // Refresh total balance added
  const refreshTotalBalanceAdded = async () => {
    if (!user) return;
    
    try {
      // Get comprehensive user transactions from the same endpoint as transaction history
      const userTransactionsResponse = await axios.get(
        `${config.backendUrl}/api/transactions/user-transactions?limit=1000&offset=0&username=${user.username}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      const userTransactions = userTransactionsResponse.data.transactions || [];
      
      // Calculate total balance added from topup and admin_topup transactions
      const totalAdded = userTransactions
        .filter(transaction => transaction.type === 'topup' || transaction.type === 'admin_topup')
        .filter(transaction => transaction.amount > 0) // Only count positive amounts
        .reduce((total, transaction) => total + transaction.amount, 0);
      
      setTotalBalanceAdded(totalAdded);
    } catch (err) {
      console.error('Failed to refresh total balance added:', err);
    }
  };

  // Refresh transaction history without toggling visibility
  const refreshHistory = async () => {
    setFetchingHistory(true);
    
    try {
      // Get comprehensive user transactions from the same endpoint as admin panel
      const userTransactionsResponse = await axios.get(
        `${config.backendUrl}/api/transactions/user-transactions?limit=50&offset=0&username=${user.username}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Also get TopUpRequest history for pending requests
      const topUpHistoryResponse = await axios.get(
        `${config.backendUrl}/api/topup/history`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Combine both types of transactions
      const userTransactions = userTransactionsResponse.data.transactions || [];
      const topUpHistory = topUpHistoryResponse.data || [];
      
      // Set comprehensive history data
      setHistory(userTransactions);
      
      // Extract pending requests for cancel functionality
      const pendingRequests = topUpHistory.filter(item => item.status === 'Pending');
      setPendingRequests(pendingRequests);
      
      // Refresh total balance added when refreshing history
      await refreshTotalBalanceAdded();
      
      // Notify SecondaryNavbar to refresh balance display (manual fallback)
      window.dispatchEvent(new Event('balanceUpdated'));
    } catch (err) {
      console.error('Failed to fetch history:', err);
      // Fallback to original TopUp history if user transactions fail
      try {
        const historyResponse = await axios.get(
          `${config.backendUrl}/api/topup/history`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setHistory(historyResponse.data);
        const pendingRequests = historyResponse.data.filter(item => item.status === 'Pending');
        setPendingRequests(pendingRequests);
      } catch (fallbackErr) {
        console.error('Failed to fetch fallback history:', fallbackErr);
      }
    } finally {
      setFetchingHistory(false);
    }
  };

  return (
    <div className="top-up-container">
      <TopUpSEO />
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
                  <img src={cdnConfig.getOptimizedImageUrl("vietinbank.jpg", cdnConfig.imageClasses.avatar)} alt="Banks" />
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
                  <img src={cdnConfig.getOptimizedImageUrl("viettel.png", cdnConfig.imageClasses.avatar)} alt="Viettel" />
                </div>
                <div className="payment-logo">
                  <img src={cdnConfig.getOptimizedImageUrl("mobiphone.png", cdnConfig.imageClasses.avatar)} alt="Mobiphone" />
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
            
            {/* Select Amount section as radio options - only for bank payments */}
            {paymentMethod === 'bank' && (
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
            )}
            
            {/* Bank transfer details */}
            {paymentMethod === 'bank' && (
              <div className="payment-details">
                <div className="bank-details-container">
                  <div className="bank-instructions-column">
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
                          <li>Để lúa được cập nhật nhanh và chính xác, vui lòng chuyển khoản đúng số tài khoản, đúng số tiền và điền chính xác nội dung chuyển khoản (trong trường hợp không thể quét mã QR).</li>
                          <li>Số dư sẽ được cập nhật khi bạn ĐĂNG NHẬP LẠI sau khi chuyển khoản thành công.</li>
                          <li>
                            Nếu có thắc mắc về vấn đề chuyển khoản hoặc chưa nhận được 🌾 1h sau khi thanh toán và đã đăng nhập lại, vui lòng inbox fanpage{' '}  
                            <a href="https://www.facebook.com/profile.php?id=100064392503502" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                              Hội những người yêu thích Light Novel
                            </a>{' '}
                             để được hỗ trợ.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  
                  <div className="support-message-column">
                    <div className="support-message">
                      <div className="support-heart">💗</div>
                      <h3 className="support-title">Valvrareteam tồn tại là nhờ có bạn!</h3>
                      <div className="support-content">
                        <p>
                          Valvrareteam chính thức quay trở lại vào năm 2025 với mong muốn xây dựng một cộng đồng 
                          Light Novel cho thế hệ mới, thu hút nhiều độc giả cũng như dịch giả/tác giả, với mục tiêu
                          lớn nhất là phá vỡ mọi rào cản giữa thị trường Light Novel Việt Nam và thế giới, tức là không 
                          còn ai phải "đói hàng" nữa :))
                        </p>
                        <p>
                          Muốn nuôi người trước hết phải nuôi được mình. Với mục đích ban đầu chỉ là làm sao để duy trì 
                          web, để duy trì kinh phí hỗ trợ những bản dịch mới, và sau này thậm chí là cả những tác giả chính
                          thống, Valvrareteam vô cùng biết ơn mỗi sự đóng góp của các bạn, dù là nhỏ nhất. <span className="support-highlight-inline">Mỗi sự ủng hộ của bạn đều là động lực lớn giúp Valvrareteam ngày càng phát triển!</span>
                        </p>
                      </div>
                      <div className="support-decoration">
                        <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 18C6 10 14 10 20 14C26 18 34 8 38 2" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" fill="none"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Prepaid card instructions */}
            {paymentMethod === 'prepaidCard' && (
              <div className="prepaid-instructions">
                <div className="prepaid-notification-list">
                  <div className="prepaid-notification-item">
                    <span className="prepaid-icon">🦋</span>
                    <p>Hiện tại chỉ chấp nhận thẻ cào Viettel và Mobiphone.</p>
                  </div>
                  <div className="prepaid-notification-item">
                    <span className="prepaid-icon">🦋</span>
                    <p>Sau khi mua thẻ cào hãy liên lạc với <a href="https://www.facebook.com/profile.php?id=100064392503502" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>fanpage</a> theo cú pháp "Ad/Fanpage/Team ơi cho mình nạp {"{mệnh giá thẻ cào}"} lúa vào tài khoản {"{tên hiển thị}"}".</p>
                  </div>
                  <div className="prepaid-notification-item">
                    <span className="prepaid-icon">🦋</span>
                    <p>Tên hiển thị nằm ở góc trên bên phải màn hình của bạn khi truy cập web, trường hợp tên đăng nhập giống tên hiển thị thì không nói, nhưng nếu khác nhau, hãy chỉ gửi tên hiển thị (tên đăng nhập thuộc về quyền riêng tư và team không cần thông tin này để nạp lúa cho bạn).</p>
                  </div>
                  <div className="prepaid-notification-item">
                    <span className="prepaid-icon">🦋</span>
                    <p>Lưu ý: Không gửi gì thêm sau khi inbox như trên, chỉ gửi thông tin thẻ cào sau khi đã được rep. Sau khi ad check thấy tài khoản của bạn có tồn tại và thẻ cào nạp thành công sẽ cộng lúa thủ công vào tài khoản của bạn.</p>
                  </div>
                  <div className="prepaid-notification-item">
                    <span className="prepaid-icon">🦋</span>
                    <p>Nạp lúa bằng thẻ cào không được cộng bonus, mệnh giá chung 100 VNĐ = 1 lúa.</p>
                  </div>
                  <div className="prepaid-notification-item">
                    <span className="prepaid-icon">🦋</span>
                    <p>Vì đây là quá trình trao đổi làm thủ công (không phải tự động như quét QR chuyển khoản) nên có thể sẽ hơi mất thời gian mong các bạn thông cảm!</p>
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
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Quét mã QR để thanh toán</h3>
              
              <div className="qr-code-container">
                <img src={qrCodeUrl} alt="QR Code" />
                <button className="qr-download-button" onClick={handleDownloadQR}>
                  Tải mã QR
                </button>
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
                <div className="qr-expiry-note">
                  <p className="qr-important">Sau khi thanh toán, vui lòng đăng nhập lại để cập nhật số dư nhanh nhất có thể.</p>
                </div>
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
              <div className="transaction-header-right">
                {/* Compact total balance display */}
                <div className="total-balance-compact">
                  <span className="total-balance-compact-label">Tổng lúa đã nạp:</span>
                  {fetchingTotalBalance ? (
                    <span className="total-balance-compact-loading">⏳</span>
                  ) : (
                    <span className="total-balance-compact-value">
                      {totalBalanceAdded.toLocaleString('vi-VN')} 🌾
                    </span>
                  )}
                </div>
                <button 
                  className="topup-refresh-button"
                  onClick={refreshHistory}
                  disabled={fetchingHistory}
                >
                  {fetchingHistory ? 'Đang tải lại...' : 'Tải lại lịch sử'}
                </button>
              </div>
            </div>
            {fetchingHistory ? (
              <p>Đang tải lịch sử giao dịch...</p>
            ) : history.length === 0 ? (
              <p>Không có lịch sử giao dịch</p>
            ) : (
              <div className="transaction-history">
                {history.map(transaction => {
                  // Handle both old TopUpRequest format and new UserTransaction format
                  const isOldFormat = transaction.paymentMethod && transaction.balance;
                  
                  return (
                    <div key={transaction._id} className={`transaction-item ${isOldFormat ? `status-${transaction.status?.toLowerCase()}` : ''}`}>
                      <div className="transaction-header">
                        <div className="transaction-user">
                          <span className="transaction-id">ID: {transaction._id}</span>
                        </div>
                        <div className="transaction-date">{formatDate(transaction.createdAt)}</div>
                      </div>
                      <div className="transaction-body">
                        {isOldFormat ? (
                          // Old TopUpRequest format
                          <>
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
                            <div className="transaction-status">{translateTopUpStatus(transaction.status)}</div>
                          </>
                        ) : (
                          // New UserTransaction format
                          <>
                            <div className="transaction-details">
                              <div className="transaction-type">
                                {getTransactionTypeText(transaction.type)}
                              </div>
                              <div className={`transaction-amount ${getAmountClass(transaction.amount)}`}>
                                {transaction.amount >= 0 ? '+' : ''}{transaction.amount} 🌾
                              </div>
                              <div className="transaction-balance-after">
                                Số dư sau giao dịch: {transaction.balanceAfter} 🌾
                              </div>
                            </div>
                            <div className="transaction-description">
                              {transaction.description}
                            </div>
                            {transaction.performedBy && (
                              <div className="transaction-admin">
                                Thực hiện bởi: {transaction.performedBy.displayName || transaction.performedBy.username}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {isOldFormat && transaction.status === 'Pending' && (
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
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default TopUp;