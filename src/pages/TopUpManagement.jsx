import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config/config';
import '../styles/TopUp.css';

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

  // Initial data fetch
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTransactions();
      fetchPendingRequests();
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

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  // Get transaction type display text
  const getTransactionTypeText = (type) => {
    const typeMap = {
      'topup': 'Nạp tiền (tự động)',
      'admin_topup': 'Nạp tiền (admin)',
      'request': 'Yêu cầu',
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

  // If not admin, don't render the component
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="top-up-container">
      <h1>Quản lý giao dịch</h1>
      <div className="top-up-content">
        <section className="top-up-section">
          <h2>Phát 🌾 cho người dùng</h2>
          <form className="top-up-form" onSubmit={handleSubmit}>
            <div className="form-group user-search-container">
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
                          <img src={user.avatar} alt={user.username} />
                        ) : (
                          <div className="default-avatar">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="topup-user-info">
                        <div className="user-username">{user.username}</div>
                        <div className="topup-user-balance">Số dư hiện tại: {user.balance || 0}</div>
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
              <div className="form-group">
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
                className="submit-button"
                disabled={submitting || !username.trim() || !amount || Number(amount) <= 0}
              >
                {submitting ? 'Đang phát...' : 'Phát 🌾'}
              </button>
            </div>
          </form>
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
                            <img src={user.avatar} alt={user.username} />
                          ) : (
                            <div className="default-avatar">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="topup-user-info">
                          <div className="user-username">{user.username}</div>
                          <div className="topup-user-balance">Số dư hiện tại: {user.balance || 0}</div>
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
                        <span className="username">{transaction.user.username}</span>
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
                        Thực hiện bởi: {transaction.performedBy.username}
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
                      <span className="username">{request.user.username}</span>
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
                      Phương thức: {request.paymentMethod === 'ewallet' 
                        ? `${request.subMethod.charAt(0).toUpperCase() + request.subMethod.slice(1)}` 
                        : request.paymentMethod === 'bank' 
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
                  <div className="request-actions">
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
            <div className="transactions-list">
              {transactions.length === 0 ? (
                <p>Không tìm thấy giao dịch</p>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction._id} className="transaction-item">
                    <div className="transaction-header">
                      <div className="transaction-user">
                        <span className="username">{transaction.user.username}</span>
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
                            Phương thức: {transaction.paymentMethod === 'ewallet' 
                              ? `${transaction.subMethod.charAt(0).toUpperCase() + transaction.subMethod.slice(1)}` 
                              : transaction.paymentMethod === 'bank' 
                                ? 'Chuyển khoản ngân hàng' 
                                : 'Thẻ cào'}
                          </div>
                          <div className="transaction-amount">
                            Thanh toán: {formatPrice(transaction.amount)} | Số dư: +{transaction.balance}
                          </div>
                        </>
                      )}
                      <div className={`transaction-status ${transaction.status.toLowerCase()}`}>
                        {transaction.status}
                      </div>
                    </div>
                    <div className="transaction-admin">
                      {transaction.adminId ? 
                        `Đã xử lý bởi: ${transaction.adminId.username}` : 
                        transaction.transactionType === 'admin' ? 
                          `Đã xử lý bởi: ${transaction.admin.username}` : 
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
          )}
        </section>
      </div>
    </div>
  );
};

export default TopUpManagement; 