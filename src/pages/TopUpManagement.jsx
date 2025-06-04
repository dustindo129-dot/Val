import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import config from '../config/config';
import '../styles/TopUpManagement.css';
import '../styles/TopUp.css';

/**
 * TopUpManagementSEO Component
 * 
 * Provides SEO optimization for the TopUpManagement page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const TopUpManagementSEO = () => {
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>Quản Lý Giao Dịch - Admin Panel | Valvrareteam</title>
      <meta name="description" content="Trang quản lý giao dịch dành cho admin Valvrareteam. Xử lý yêu cầu nạp lúa, quản lý giao dịch người dùng và theo dõi hoạt động tài chính." />
      <meta name="keywords" content="quản lý giao dịch, admin panel, nạp lúa, giao dịch người dùng, valvrareteam, quản trị viên" />
      <meta name="robots" content="noindex, nofollow" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content="Quản Lý Giao Dịch - Admin Panel | Valvrareteam" />
      <meta property="og:description" content="Trang quản lý giao dịch dành cho admin Valvrareteam." />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content="https://valvrareteam.net/quan-ly-giao-dich" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Quản Lý Giao Dịch - Admin Panel | Valvrareteam" />
      <meta name="twitter:description" content="Trang quản lý giao dịch dành cho admin Valvrareteam." />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
    </Helmet>
  );
};

/**
 * TopUpManagement Page Component
 * 
 * Admin-only page for managing user top-up transactions
 * 
 * @returns {JSX.Element} TopUp management page component
 */
const TopUpManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // New state variables for unmatched transactions
  const [unmatchedTransactions, setUnmatchedTransactions] = useState([]);
  const [unmatchedLoading, setUnmatchedLoading] = useState(true);
  const [matchUserSearch, setMatchUserSearch] = useState('');
  const [matchSearchResults, setMatchSearchResults] = useState([]);
  const [showMatchSearch, setShowMatchSearch] = useState(false);
  const [selectedMatchUser, setSelectedMatchUser] = useState(null);
  const [matchingTransactionId, setMatchingTransactionId] = useState(null);
  const [matchBalance, setMatchBalance] = useState('');
  const [processingMatch, setProcessingMatch] = useState(false);
  
  // New state variables for dismissed/processed transaction history
  const [dismissedTransactions, setDismissedTransactions] = useState([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  
  // New state variables for pending requests
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [requestAdjustments, setRequestAdjustments] = useState({});

  // New state variables for user transactions
  const [userTransactions, setUserTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(true);
  const [transactionUsername, setTransactionUsername] = useState('');
  const [transactionSearchResults, setTransactionSearchResults] = useState([]);
  const [showTransactionSearch, setShowTransactionSearch] = useState(false);
  const [selectedTransactionUser, setSelectedTransactionUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [transactionsPerPage] = useState(20);
  
  // New state variables for novel transactions
  const [novelTransactions, setNovelTransactions] = useState([]);
  const [novelTransactionLoading, setNovelTransactionLoading] = useState(true);
  const [novelSearchQuery, setNovelSearchQuery] = useState('');
  const [novelSearchResults, setNovelSearchResults] = useState([]);
  const [showNovelSearch, setShowNovelSearch] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [novelCurrentPage, setNovelCurrentPage] = useState(1);
  const [novelTotalPages, setNovelTotalPages] = useState(1);

  // Add pagination state for recent transactions
  const [recentCurrentPage, setRecentCurrentPage] = useState(1);
  const [recentTotalPages, setRecentTotalPages] = useState(1);
  const [recentTransactionsPerPage] = useState(5);

  // Protect the route - redirect non-admin users
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch top-up transactions (both types)
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Get admin-initiated transactions
      const adminResponse = await axios.get(
        `${config.backendUrl}/api/topup-admin/transactions`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Get user-initiated completed requests
      const userResponse = await axios.get(
        `${config.backendUrl}/api/topup-admin/completed-requests`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Combine and format both types of transactions
      const adminTransactions = adminResponse.data.map(tx => ({
        ...tx,
        transactionType: 'admin'
      }));
      
      const userTransactions = userResponse.data.map(tx => ({
        ...tx,
        transactionType: 'user'
      }));
      
      // Combine and sort by date
      const allTransactions = [...adminTransactions, ...userTransactions]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setTransactions(allTransactions);
      setRecentTotalPages(Math.ceil(allTransactions.length / recentTransactionsPerPage));
      setLoading(false);
    } catch (err) {
      console.error('Lỗi khi tải giao dịch:', err);
      setError('Lỗi khi tải giao dịch');
      setLoading(false);
    }
  };

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      setPendingLoading(true);
      const response = await axios.get(
        `${config.backendUrl}/api/topup-admin/pending-requests`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Ensure all bank requests have an actualAmount property
      const processedRequests = response.data.map(request => {
        if (request.paymentMethod === 'bank' && !request.details.actualAmount) {
          return {
            ...request,
            details: {
              ...request.details,
              actualAmount: 0
            }
          };
        }
        return request;
      });
      
      setPendingRequests(processedRequests);
      setPendingLoading(false);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      setPendingLoading(false);
    }
  };

  // Fetch user transactions - modified to handle connection errors more gracefully
  const fetchUserTransactions = async (page = 1, username = null) => {
    try {
      setTransactionLoading(true);
      
      // If no username provided, clear transactions and return
      if (!username) {
        setUserTransactions([]);
        setTransactionLoading(false);
        return;
      }
      
      const offset = (page - 1) * transactionsPerPage;
      const limit = transactionsPerPage;
      
      let url = `${config.backendUrl}/api/transactions/user-transactions?limit=${limit}&offset=${offset}`;
      
      // Add username filter if provided
      if (username) {
        url += `&username=${encodeURIComponent(username)}`;
      }
      
      const response = await axios.get(
        url,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setUserTransactions(response.data.transactions || []);
      setTotalPages(Math.ceil((response.data.pagination?.total || 0) / transactionsPerPage));
      setCurrentPage(page);
      setTransactionLoading(false);
    } catch (err) {
      console.error('Failed to fetch user transactions:', err);
      setUserTransactions([]);
      setTransactionLoading(false);
      // Show a notification or alert for the error
      alert('Không thể tải nhật ký giao dịch. Vui lòng thử lại sau.');
    }
  };

  // Fetch novel transactions
  const fetchNovelTransactions = async (page = 1, novelId = null) => {
    try {
      setNovelTransactionLoading(true);
      
      // If no novel ID provided, clear transactions and return
      if (!novelId) {
        setNovelTransactions([]);
        setNovelTransactionLoading(false);
        return;
      }
      
      const offset = (page - 1) * transactionsPerPage;
      const limit = transactionsPerPage;
      
      const response = await axios.get(
        `${config.backendUrl}/api/novel-transactions?novelId=${novelId}&limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setNovelTransactions(response.data.transactions || []);
      setNovelTotalPages(Math.ceil((response.data.pagination?.total || 0) / transactionsPerPage));
      setNovelCurrentPage(page);
      setNovelTransactionLoading(false);
    } catch (err) {
      console.error('Failed to fetch novel transactions:', err);
      setNovelTransactions([]);
      setNovelTransactionLoading(false);
      alert('Không thể tải nhật ký giao dịch truyện. Vui lòng thử lại sau.');
    }
  };

  // Fetch unmatched transactions
  const fetchUnmatchedTransactions = async () => {
    try {
      setUnmatchedLoading(true);
      const response = await axios.get(
        `${config.backendUrl}/api/topup/unmatched-transactions`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setUnmatchedTransactions(response.data);
      setUnmatchedLoading(false);
    } catch (err) {
      console.error('Failed to fetch unmatched transactions:', err);
      setUnmatchedTransactions([]);
      setUnmatchedLoading(false);
      alert('Không thể tải giao dịch chưa khớp. Vui lòng thử lại sau.');
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTransactions();
      fetchPendingRequests();
      fetchUnmatchedTransactions();
      // Remove default fetch of all transactions
      // fetchUserTransactions();
    }
  }, [user]);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearch || userSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await axios.get(
          `${config.backendUrl}/api/topup-admin/search-users?query=${encodeURIComponent(userSearch)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setSearchResults(response.data.slice(0, 5)); // Limit to 5 results
      } catch (err) {
        console.error('User search failed:', err);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Search for users for transaction filtering
  useEffect(() => {
    const searchUsers = async () => {
      if (!transactionUsername || transactionUsername.length < 2) {
        setTransactionSearchResults([]);
        return;
      }

      try {
        const response = await axios.get(
          `${config.backendUrl}/api/topup-admin/search-users?query=${encodeURIComponent(transactionUsername)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setTransactionSearchResults(response.data.slice(0, 5)); // Limit to 5 results
      } catch (err) {
        console.error('User search failed:', err);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [transactionUsername]);

  // Search for novels
  useEffect(() => {
    const searchNovels = async () => {
      if (!novelSearchQuery || novelSearchQuery.length < 2) {
        setNovelSearchResults([]);
        return;
      }

      try {
        const response = await axios.get(
          `${config.backendUrl}/api/novel-transactions/search-novels?query=${encodeURIComponent(novelSearchQuery)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setNovelSearchResults(response.data.slice(0, 5)); // Limit to 5 results
      } catch (err) {
        console.error('Novel search failed:', err);
      }
    };

    const timer = setTimeout(searchNovels, 500);
    return () => clearTimeout(timer);
  }, [novelSearchQuery]);

  // Search for users for matching unmatched transactions
  useEffect(() => {
    const searchUsers = async () => {
      if (!matchUserSearch || matchUserSearch.length < 2) {
        setMatchSearchResults([]);
        return;
      }

      try {
        const response = await axios.get(
          `${config.backendUrl}/api/topup-admin/search-users?query=${encodeURIComponent(matchUserSearch)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setMatchSearchResults(response.data.slice(0, 5)); // Limit to 5 results
      } catch (err) {
        console.error('User search failed:', err);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [matchUserSearch]);

  // Handle user selection from search results
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUsername(user.username);
    setUserSearch(user.username);
    setShowSearch(false);
  };

  // Handle user selection for transaction filtering
  const handleTransactionUserSelect = (user) => {
    setSelectedTransactionUser(user);
    setTransactionUsername(user.username);
    setShowTransactionSearch(false);
    
    // Fetch transactions for selected user
    fetchUserTransactions(1, user.username);
  };

  // Handle user selection for matching transactions
  const handleMatchUserSelect = (user) => {
    setSelectedMatchUser(user);
    setMatchUserSearch(user.username);
    setShowMatchSearch(false);
  };

  // Handle novel selection for transaction filtering
  const handleNovelSelect = (novel) => {
    setSelectedNovel(novel);
    setNovelSearchQuery(novel.title);
    setShowNovelSearch(false);
    
    // Fetch transactions for selected novel
    fetchNovelTransactions(1, novel._id);
  };

  // Handle balance adjustment
  const handleAdjustBalance = (requestId, value) => {
    setRequestAdjustments({
      ...requestAdjustments,
      [requestId]: Number(value)
    });
  };

  // Handle confirm request
  const handleConfirmRequest = async (requestId) => {
    if (!confirm('Bạn có chắc chắn muốn xác nhận yêu cầu này không?')) {
      return;
    }
    
    try {
      const adjustedBalance = requestAdjustments[requestId];
      const response = await axios.post(
        `${config.backendUrl}/api/topup-admin/process-request/${requestId}`,
        { 
          action: 'confirm',
          adjustedBalance 
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Update UI
      setPendingRequests(pendingRequests.filter(req => req._id !== requestId));
      
      // Refresh transactions
      fetchTransactions();
      fetchUserTransactions(currentPage, selectedTransactionUser?.username);
      
      alert('Yêu cầu đã được xác nhận thành công');
    } catch (err) {
      console.error('Không thể xác nhận yêu cầu:', err);
      alert(err.response?.data?.message || 'Không thể xác nhận yêu cầu');
    }
  };

  // Start matching an unmatched transaction
  const startMatchingTransaction = (transactionId) => {
    setMatchingTransactionId(transactionId);
    setSelectedMatchUser(null);
    setMatchUserSearch('');
    setMatchBalance('');
  };

  // Cancel matching
  const cancelMatching = () => {
    setMatchingTransactionId(null);
    setSelectedMatchUser(null);
    setMatchUserSearch('');
    setMatchBalance('');
  };

  // Handle dismissing an unmatched transaction
  const handleDismissTransaction = (transactionId) => {
    if (!confirm('Bạn có chắc chắn muốn hủy giao dịch này? Hành động này sẽ loại bỏ giao dịch khỏi danh sách chưa khớp.')) {
      return;
    }
    
    // Find the transaction to dismiss
    const transactionToDismiss = unmatchedTransactions.find(tx => tx.transactionId === transactionId);
    if (transactionToDismiss) {
      // Add to dismissed history with timestamp and status
      const dismissedTransaction = {
        ...transactionToDismiss,
        dismissedAt: new Date().toISOString(),
        status: 'dismissed',
        statusText: 'Đã hủy bởi admin'
      };
      setDismissedTransactions(prev => [dismissedTransaction, ...prev]);
    }
    
    // Remove the transaction from the unmatched list
    setUnmatchedTransactions(unmatchedTransactions.filter(tx => tx.transactionId !== transactionId));
  };

  // Process matched transaction
  const processMatchedTransaction = async (transactionId) => {
    if (!selectedMatchUser) {
      alert('Vui lòng chọn người dùng để khớp giao dịch');
      return;
    }

    if (!matchBalance || Number(matchBalance) <= 0) {
      alert('Vui lòng nhập số lượng lúa hợp lệ');
      return;
    }

    if (!confirm(`Xác nhận khớp giao dịch cho người dùng "${selectedMatchUser.username}" với ${matchBalance} lúa?`)) {
      return;
    }

    setProcessingMatch(true);

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/topup/process-unmatched/${transactionId}`,
        {
          userId: selectedMatchUser._id,
          amount: Number(matchBalance),
          balance: Number(matchBalance)
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Remove processed transaction from unmatched list
      setUnmatchedTransactions(unmatchedTransactions.filter(tx => tx.transactionId !== transactionId));
      
      // Add to history as matched transaction
      const matchedTransaction = unmatchedTransactions.find(tx => tx.transactionId === transactionId);
      if (matchedTransaction) {
        const processedTransaction = {
          ...matchedTransaction,
          processedAt: new Date().toISOString(),
          status: 'matched',
          statusText: `Đã khớp với ${selectedMatchUser.username} (${matchBalance} lúa)`,
          matchedUser: selectedMatchUser.username,
          matchedAmount: Number(matchBalance)
        };
        setDismissedTransactions(prev => [processedTransaction, ...prev]);
      }
      
      // Reset form
      setMatchingTransactionId(null);
      setSelectedMatchUser(null);
      setMatchUserSearch('');
      setMatchBalance('');
      
      // Refresh other data
      fetchTransactions();
      fetchUserTransactions(currentPage, selectedTransactionUser?.username);
      
      alert('Giao dịch đã được khớp thành công');
    } catch (err) {
      console.error('Không thể khớp giao dịch:', err);
      alert(err.response?.data?.message || 'Không thể khớp giao dịch');
    } finally {
      setProcessingMatch(false);
    }
  };

  // Handle decline request
  const handleDeclineRequest = async (requestId) => {
    if (!confirm('Bạn có chắc chắn muốn từ chối yêu cầu này không?')) {
      return;
    }
    
    try {
      const response = await axios.post(
        `${config.backendUrl}/api/topup-admin/process-request/${requestId}`,
        { action: 'decline' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Update UI
      setPendingRequests(pendingRequests.filter(req => req._id !== requestId));
      
      // Refresh transactions
      fetchTransactions();
      fetchUserTransactions(currentPage, selectedTransactionUser?.username);
      
      alert('Yêu cầu đã được từ chối thành công');
    } catch (err) {
      console.error('Không thể từ chối yêu cầu:', err);
      alert(err.response?.data?.message || 'Không thể từ chối yêu cầu');
    }
  };

  // Handle pagination
  const handlePageChange = (page) => {
    fetchUserTransactions(page, selectedTransactionUser?.username);
  };

  // Handle reset user filter
  const handleResetFilter = () => {
    setSelectedTransactionUser(null);
    setTransactionUsername('');
    setUserTransactions([]); // Clear transactions instead of fetching all
    setCurrentPage(1);
    setTotalPages(1);
  };

  // Handle novel pagination
  const handleNovelPageChange = (page) => {
    fetchNovelTransactions(page, selectedNovel?._id);
  };

  // Handle reset novel filter
  const handleResetNovelFilter = () => {
    setSelectedNovel(null);
    setNovelSearchQuery('');
    setNovelTransactions([]);
    setNovelCurrentPage(1);
    setNovelTotalPages(1);
  };

  // Handle top-up form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !amount || Number(amount) <= 0) {
      alert('Vui lòng nhập tên người dùng và số tiền hợp lệ');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/topup-admin`,
        { username, amount: Number(amount) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Refresh transactions
      fetchTransactions();
      fetchUserTransactions(currentPage, selectedTransactionUser?.username);

      // Reset form
      setUsername('');
      setAmount('');
      setUserSearch('');
      setSelectedUser(null);

      alert('Giao dịch đã được xử lý thành công');
    } catch (err) {
      console.error('Giao dịch thất bại:', err);
      alert(err.response?.data?.message || 'Không thể xử lý giao dịch');
    } finally {
      setSubmitting(false);
    }
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
      'open': 'Mở chương/tập',
      'admin': 'Điều chỉnh thủ công',
      'contribution': 'Đóng góp',
      'gift': 'Quà tặng',
      'refund': 'Hoàn tiền',
      'withdrawal': 'Rút tiền',
      'other': 'Khác'
    };
    return typeMap[type] || type;
  };

  // Get transaction amount class based on whether it's positive or negative
  const getAmountClass = (amount) => {
    return amount >= 0 ? 'amount-positive' : 'amount-negative';
  };

  // Get transaction status display text in Vietnamese
  const getTransactionStatusText = (status) => {
    const statusMap = {
      'completed': 'Thành công',
      'successful': 'Thành công',
      'pending': 'Đang xử lý',
      'failed': 'Thất bại',
      'cancelled': 'Đã hủy',
      'processing': 'Đang xử lý',
      'rejected': 'Bị từ chối'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  // Add handler for recent transactions pagination
  const handleRecentPageChange = (page) => {
    setRecentCurrentPage(page);
  };

  // Toggle transaction history visibility
  const toggleTransactionHistory = () => {
    setShowTransactionHistory(!showTransactionHistory);
  };

  // If not admin, don't render the component
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="top-up-container">
      <TopUpManagementSEO />
      <h1>Quản lý giao dịch</h1>
      <div className="top-up-content">
        <section className="top-up-section">
          <h2>Phát 🌾 cho người dùng</h2>
          <form className="topup-form" onSubmit={handleSubmit}>
            <div className="topup-form-group user-search-container">
              <label htmlFor="username">Tên người dùng</label>
              <input 
                type="text" 
                id="username" 
                name="username"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowSearch(true);
                }}
                onClick={() => setShowSearch(true)}
                placeholder="Tìm kiếm người dùng..."
                required 
              />
              {showSearch && searchResults.length > 0 && (
                <div className="user-search-results">
                  {searchResults.map(user => (
                    <div 
                      key={user._id} 
                      className="user-result"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.displayName || user.username} />
                        ) : (
                          <div className="default-avatar">
                            {(user.displayName || user.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="topup-user-info">
                        <div className="user-display-name">{user.displayName || user.username}</div>
                        <div className="user-username">@{user.username}</div>
                        <div className="topup-user-balance">Số dư hiện tại: {user.balance || 0} 🌾</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showSearch && userSearch.length >= 2 && searchResults.length === 0 && (
                <div className="no-results">Không tìm thấy người dùng</div>
              )}
            </div>
            
            <div className="amount-input-row">
              <div className="topup-form-group">
                <label htmlFor="amount">Số 🌾 phát</label>
                <input 
                  type="number" 
                  id="amount" 
                  name="amount" 
                  min="1" 
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="management-submit-button"
                disabled={submitting || !username.trim() || !amount || Number(amount) <= 0}
              >
                {submitting ? 'Đang phát...' : 'Phát 🌾'}
              </button>
            </div>
          </form>
        </section>

        {/* New section: Novel Transaction History */}
        <section className="top-up-section transaction-section">
          <div className="transaction-header-container">
            <h2>Nhật ký giao dịch truyện</h2>
            <div className="transaction-filter">
              <div className="user-search-container">
                <input 
                  type="text" 
                  placeholder="Tìm kiếm truyện để xem giao dịch..."
                  value={novelSearchQuery}
                  onChange={(e) => {
                    setNovelSearchQuery(e.target.value);
                    setShowNovelSearch(true);
                  }}
                  onClick={() => setShowNovelSearch(true)}
                />
                {showNovelSearch && novelSearchResults.length > 0 && (
                  <div className="user-search-results">
                    {novelSearchResults.map(novel => (
                      <div 
                        key={novel._id} 
                        className="user-result"
                        onClick={() => handleNovelSelect(novel)}
                      >
                        <div className="user-avatar">
                          {novel.illustration ? (
                            <img src={novel.illustration} alt={novel.title} />
                          ) : (
                            <div className="default-avatar">
                              {novel.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="topup-user-info">
                          <div className="user-username">{novel.title}</div>
                          <div className="topup-user-balance">Số dư hiện tại: {novel.novelBalance || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedNovel && (
                <>
                  <button 
                    className="reset-filter-button"
                    onClick={handleResetNovelFilter}
                  >
                    Xóa bộ lọc
                  </button>
                  <button 
                    className="refresh-button"
                    onClick={() => fetchNovelTransactions(novelCurrentPage, selectedNovel?._id)}
                    disabled={novelTransactionLoading}
                  >
                    {novelTransactionLoading ? 'Đang tải...' : 'Tải lại'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {!selectedNovel ? (
            <div className="no-user-selected">
              <p>Hãy tìm kiếm và chọn truyện để xem lịch sử giao dịch</p>
            </div>
          ) : novelTransactionLoading ? (
            <p>Đang tải nhật ký giao dịch...</p>
          ) : novelTransactions.length === 0 ? (
            <p>Không tìm thấy giao dịch nào cho truyện này</p>
          ) : (
            <>
              <div className="user-transactions-list">
                {novelTransactions.map((transaction) => (
                  <div key={transaction._id} className="user-transaction-item">
                    <div className="transaction-header">
                      <div className="transaction-user">
                        <span className="username">{transaction.novel.title}</span>
                        <span className="transaction-id">ID: {transaction._id}</span>
                      </div>
                      <span className="transaction-date">{formatDate(transaction.createdAt)}</span>
                    </div>
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
                    {transaction.sourceModel && (
                      <div className="transaction-source">
                        Nguồn: {transaction.sourceModel} (ID: {transaction.sourceId})
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {novelTotalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => handleNovelPageChange(1)}
                    disabled={novelCurrentPage === 1}
                  >
                    &laquo;
                  </button>
                  <button 
                    onClick={() => handleNovelPageChange(novelCurrentPage - 1)}
                    disabled={novelCurrentPage === 1}
                  >
                    &lt;
                  </button>
                  
                  <span className="page-info">
                    Trang {novelCurrentPage} / {novelTotalPages}
                  </span>
                  
                  <button 
                    onClick={() => handleNovelPageChange(novelCurrentPage + 1)}
                    disabled={novelCurrentPage === novelTotalPages}
                  >
                    &gt;
                  </button>
                  <button 
                    onClick={() => handleNovelPageChange(novelTotalPages)}
                    disabled={novelCurrentPage === novelTotalPages}
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* User Transactions Section - Modified to show instructions when no user selected */}
        <section className="top-up-section transaction-section">
          <div className="transaction-header-container">
            <h2>Nhật ký giao dịch người dùng</h2>
            <div className="transaction-filter">
              <div className="user-search-container">
                <input 
                  type="text" 
                  placeholder="Tìm kiếm người dùng để xem giao dịch..."
                  value={transactionUsername}
                  onChange={(e) => {
                    setTransactionUsername(e.target.value);
                    setShowTransactionSearch(true);
                  }}
                  onClick={() => setShowTransactionSearch(true)}
                />
                {showTransactionSearch && transactionSearchResults.length > 0 && (
                  <div className="user-search-results">
                    {transactionSearchResults.map(user => (
                      <div 
                        key={user._id} 
                        className="user-result"
                        onClick={() => handleTransactionUserSelect(user)}
                      >
                        <div className="user-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.displayName || user.username} />
                          ) : (
                            <div className="default-avatar">
                              {(user.displayName || user.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="topup-user-info">
                          <div className="user-display-name">{user.displayName || user.username}</div>
                          <div className="user-username">@{user.username}</div>
                          <div className="topup-user-balance">Số dư hiện tại: {user.balance || 0} 🌾</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedTransactionUser && (
                <>
                  <button 
                    className="reset-filter-button"
                    onClick={handleResetFilter}
                  >
                    Xóa bộ lọc
                  </button>
                  <button 
                    className="refresh-button"
                    onClick={() => fetchUserTransactions(currentPage, selectedTransactionUser?.username)}
                    disabled={transactionLoading}
                  >
                    {transactionLoading ? 'Đang tải...' : 'Tải lại'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {!selectedTransactionUser ? (
            <div className="no-user-selected">
              <p>Hãy tìm kiếm và chọn người dùng để xem lịch sử giao dịch</p>
            </div>
          ) : transactionLoading ? (
            <p>Đang tải nhật ký giao dịch...</p>
          ) : userTransactions.length === 0 ? (
            <p>Không tìm thấy giao dịch nào cho người dùng này</p>
          ) : (
            <>
              <div className="user-transactions-list">
                {userTransactions.map((transaction) => (
                  <div key={transaction._id} className="user-transaction-item">
                    <div className="transaction-header">
                      <div className="transaction-user">
                        <span className="username">{transaction.user.displayName || transaction.user.username}</span>
                        <span className="transaction-id">ID: {transaction._id}</span>
                      </div>
                      <span className="transaction-date">{formatDate(transaction.createdAt)}</span>
                    </div>
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
                    {transaction.sourceModel && (
                      <div className="transaction-source">
                        Nguồn: {transaction.sourceModel} (ID: {transaction.sourceId})
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    &laquo;
                  </button>
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>
                  
                  <span className="page-info">
                    Trang {currentPage} / {totalPages}
                  </span>
                  
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </button>
                  <button 
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* New section: Unmatched Transactions */}
        <section className="top-up-section unmatched-section">
          <div className="transaction-header-container">
            <h2>Giao dịch chưa khớp</h2>
            <div className="unmatched-section-buttons">
              <button 
                className="refresh-button"
                onClick={fetchUnmatchedTransactions}
                disabled={unmatchedLoading}
              >
                {unmatchedLoading ? 'Đang tải lại...' : 'Tải lại giao dịch'}
              </button>
              <button 
                className="history-toggle-button"
                onClick={toggleTransactionHistory}
              >
                {showTransactionHistory ? 'Ẩn lịch sử' : 'Lịch sử giao dịch chưa khớp'}
              </button>
            </div>
          </div>
          {unmatchedLoading ? (
            <p>Đang tải giao dịch chưa khớp...</p>
          ) : unmatchedTransactions.length === 0 ? (
            <p>Không có giao dịch chưa khớp</p>
          ) : (
            <div className="unmatched-transactions-list">
              {unmatchedTransactions.map((transaction) => (
                <div key={transaction.transactionId} className="unmatched-transaction-item">
                  <div className="transaction-header">
                    <div className="transaction-user">
                      <span className="username">Giao dịch chưa khớp</span>
                      <span className="transaction-id">ID: {transaction.transactionId}</span>
                    </div>
                    <span className="transaction-date">{formatDate(transaction.date || transaction.createdAt)}</span>
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-method">
                      Ngân hàng: {transaction.bankName || 'Không xác định'}
                    </div>
                    <div className="transaction-amount">
                      Số tiền: {formatPrice(transaction.amount)}
                    </div>
                    <div className="transaction-reference">
                      Mã tham chiếu: <span className="transfer-content">{transaction.extractedContent}</span>
                    </div>
                  </div>
                  {transaction.description && (
                    <div className="transaction-description">
                      <span className="description-label">Nội dung chuyển khoản:</span>
                      <div className="description-text">{transaction.description}</div>
                    </div>
                  )}
                  
                  {/* Matching form */}
                  {matchingTransactionId === transaction.transactionId ? (
                    <div className="match-transaction-form">
                      <div className="match-form-header">Khớp giao dịch này với người dùng:</div>
                      <div className="match-form-controls">
                        <div className="match-user-control user-search-container">
                          <input 
                            type="text" 
                            placeholder="Tìm kiếm người dùng..."
                            value={matchUserSearch}
                            onChange={(e) => {
                              setMatchUserSearch(e.target.value);
                              setShowMatchSearch(true);
                            }}
                            onClick={() => setShowMatchSearch(true)}
                          />
                          {showMatchSearch && matchSearchResults.length > 0 && (
                            <div className="user-search-results">
                              {matchSearchResults.map(user => (
                                <div 
                                  key={user._id} 
                                  className="user-result"
                                  onClick={() => handleMatchUserSelect(user)}
                                >
                                  <div className="user-avatar">
                                    {user.avatar ? (
                                      <img src={user.avatar} alt={user.displayName || user.username} />
                                    ) : (
                                      <div className="default-avatar">
                                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="topup-user-info">
                                    <div className="user-display-name">{user.displayName || user.username}</div>
                                    <div className="user-username">@{user.username}</div>
                                    <div className="topup-user-balance">Số dư hiện tại: {user.balance || 0} 🌾</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {showMatchSearch && matchUserSearch.length >= 2 && matchSearchResults.length === 0 && (
                            <div className="no-results">Không tìm thấy người dùng</div>
                          )}
                        </div>
                        <div className="match-balance-control">
                          <input 
                            type="number" 
                            placeholder="Số lúa"
                            value={matchBalance}
                            onChange={(e) => setMatchBalance(e.target.value)}
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="match-actions">
                        <button 
                          className="match-button"
                          onClick={() => processMatchedTransaction(transaction.transactionId)}
                          disabled={processingMatch || !selectedMatchUser || !matchBalance}
                        >
                          {processingMatch ? 'Đang xử lý...' : 'Khớp giao dịch'}
                        </button>
                        <button 
                          className="cancel-match-button"
                          onClick={cancelMatching}
                          disabled={processingMatch}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="transaction-actions">
                      <button 
                        className="match-button"
                        onClick={() => startMatchingTransaction(transaction.transactionId)}
                      >
                        Khớp với người dùng
                      </button>
                      <button 
                        className="dismiss-transaction-button"
                        onClick={() => handleDismissTransaction(transaction.transactionId)}
                      >
                        Hủy giao dịch
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Transaction History Section */}
          {showTransactionHistory && (
            <div className="transaction-history-section">
              <h3>Lịch sử giao dịch đã xử lý</h3>
              {dismissedTransactions.length === 0 ? (
                <p className="no-history">Chưa có giao dịch nào được xử lý</p>
              ) : (
                <div className="history-transactions-list">
                  {dismissedTransactions.map((transaction) => (
                    <div key={`${transaction.transactionId}-${transaction.status}`} className="history-transaction-item">
                      <div className="transaction-header">
                        <div className="transaction-user">
                          <span className="username">Giao dịch đã xử lý</span>
                          <span className="transaction-id">ID: {transaction.transactionId}</span>
                        </div>
                        <span className="transaction-date">
                          {formatDate(transaction.dismissedAt || transaction.processedAt)}
                        </span>
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-method">
                          Ngân hàng: {transaction.bankName || 'Không xác định'}
                        </div>
                        <div className="transaction-amount">
                          Số tiền: {formatPrice(transaction.amount)}
                        </div>
                        <div className="transaction-reference">
                          Mã tham chiếu: <span className="transfer-content">{transaction.extractedContent}</span>
                        </div>
                        <div className={`transaction-status ${transaction.status}`}>
                          {transaction.statusText}
                        </div>
                        {transaction.matchedUser && (
                          <div className="matched-info">
                            Đã khớp với: {transaction.matchedUser} | Số lúa: {transaction.matchedAmount}
                          </div>
                        )}
                      </div>
                      {transaction.description && (
                        <div className="transaction-description">
                          <span className="description-label">Nội dung chuyển khoản:</span>
                          <div className="description-text">{transaction.description}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* New section: Pending Requests */}
        <section className="top-up-section pending-section">
          <div className="transaction-header-container">
            <h2>Yêu cầu chờ xử lý</h2>
            <button 
              className="refresh-button"
              onClick={fetchPendingRequests}
              disabled={pendingLoading}
            >
              {pendingLoading ? 'Đang tải lại...' : 'Tải lại yêu cầu'}
            </button>
          </div>
          {pendingLoading ? (
            <p>Đang tải yêu cầu chờ xử lý...</p>
          ) : pendingRequests.length === 0 ? (
            <p>Không có yêu cầu chờ xử lý</p>
          ) : (
            <div className="pending-requests-list">
              {pendingRequests.map((request) => (
                <div key={request._id} className="pending-request-item">
                  <div className="request-header">
                    <div className="request-user">
                      <span className="username">{request.user.displayName || request.user.username}</span>
                      <span className="request-id">ID: {request._id}
                        {request.paymentMethod === 'bank' && request.details?.transferContent && 
                          <span className="transfer-content"> | Nội dung chuyển khoản: {request.details.transferContent}</span>
                        }
                      </span>
                    </div>
                    <span className="request-date">{formatDate(request.createdAt)}</span>
                  </div>
                  <div className="request-details">
                    <div className="request-method">
                      Phương thức: {request.paymentMethod === 'bank' 
                          ? 'Chuyển khoản ngân hàng' 
                          : 'Thẻ cào'}
                    </div>
                    <div className="request-amount">
                      Số tiền: {formatPrice(request.amount)}
                      {request.paymentMethod === 'bank' && (
                        <span className="actual-amount">
                          {' | '}Số tiền thực nhận: {formatPrice(request.receivedAmount || 0)}
                          {request.receivedAmount > 0 && request.receivedAmount !== request.amount && (
                            <span className="amount-mismatch"> ⚠️</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="request-balance">
                      Số 🌾: {request.balance}
                    </div>
                  </div>
                  {request.paymentMethod === 'bank' && request.bankTransactions && request.bankTransactions.length > 0 && (
                    <div className="bank-transactions">
                      <div className="transactions-title">Giao dịch đã nhận:</div>
                      {request.bankTransactions.map((transaction, idx) => (
                        <div key={idx} className="bank-transaction-item">
                          <span className="transaction-date">
                            {formatDate(transaction.date)}
                          </span>
                          <span className="transaction-amount">
                            {formatPrice(transaction.amount)}
                          </span>
                          <span className="transaction-id">
                            ID: {transaction.transactionId}
                          </span>
                          {transaction.description && (
                            <div className="transaction-description">
                              <span className="description-label">Nội dung chuyển khoản gốc:</span>
                              <div className="description-text">{transaction.description}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pending-request-actions">
                    <div className="balance-adjustment">
                      <label>Điều chỉnh số 🌾:</label>
                      <input 
                        type="number" 
                        value={requestAdjustments[request._id] || request.balance}
                        onChange={(e) => handleAdjustBalance(request._id, e.target.value)} 
                      />
                    </div>
                    <button 
                      className="confirm-button"
                      onClick={() => handleConfirmRequest(request._id)}
                    >
                      Xác nhận
                    </button>
                    <button 
                      className="decline-button"
                      onClick={() => handleDeclineRequest(request._id)}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="top-up-section">
          <h2>Giao dịch gần đây</h2>
          {loading ? (
            <p>Đang tải giao dịch...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <>
              <div className="transactions-list">
                {transactions.length === 0 ? (
                  <p>Không tìm thấy giao dịch</p>
                ) : (
                  transactions
                    .slice((recentCurrentPage - 1) * recentTransactionsPerPage, recentCurrentPage * recentTransactionsPerPage)
                    .map((transaction) => (
                    <div key={transaction._id} className="transaction-item">
                      <div className="transaction-header">
                        <div className="transaction-user">
                          <span className="username">{transaction.user.displayName || transaction.user.username}</span>
                          <span className="transaction-id">ID: {transaction._id}</span>
                        </div>
                        <span className="transaction-date">{formatDate(transaction.createdAt)}</span>
                      </div>
                      <div className="transaction-details">
                        {transaction.transactionType === 'admin' ? (
                          // Admin transaction
                          <div className="transaction-amount">Số 🌾 đã thêm: +{transaction.amount}</div>
                        ) : (
                          // User transaction
                          <>
                            <div className="transaction-method">
                              Phương thức: {transaction.paymentMethod === 'bank' 
                                  ? 'Chuyển khoản ngân hàng' 
                                  : 'Thẻ cào'}
                            </div>
                            <div className="transaction-amount">
                              Thanh toán: {formatPrice(transaction.amount)} | Số dư: +{transaction.balance}
                            </div>
                          </>
                        )}
                        <div className={`transaction-status ${transaction.status.toLowerCase()}`}>
                          {getTransactionStatusText(transaction.status)}
                        </div>
                      </div>
                      <div className="transaction-admin">
                        {transaction.adminId ? 
                          `Đã xử lý bởi: ${transaction.adminId.displayName || transaction.adminId.username}` : 
                          transaction.transactionType === 'admin' ? 
                            `Đã xử lý bởi: ${transaction.admin.displayName || transaction.admin.username}` : 
                            'Tự động xử lý'}
                      </div>
                      {transaction.notes && (
                        <div className="transaction-notes">
                          Ghi chú: {transaction.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {/* Pagination for recent transactions */}
              {recentTotalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => handleRecentPageChange(1)}
                    disabled={recentCurrentPage === 1}
                  >
                    &laquo;
                  </button>
                  <button 
                    onClick={() => handleRecentPageChange(recentCurrentPage - 1)}
                    disabled={recentCurrentPage === 1}
                  >
                    &lt;
                  </button>
                  
                  <span className="page-info">
                    Trang {recentCurrentPage} / {recentTotalPages}
                  </span>
                  
                  <button 
                    onClick={() => handleRecentPageChange(recentCurrentPage + 1)}
                    disabled={recentCurrentPage === recentTotalPages}
                  >
                    &gt;
                  </button>
                  <button 
                    onClick={() => handleRecentPageChange(recentTotalPages)}
                    disabled={recentCurrentPage === recentTotalPages}
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default TopUpManagement; 