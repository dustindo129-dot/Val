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

  // Protect the route - redirect non-admin users
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch top-up transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${config.backendUrl}/api/topup/transactions`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setTransactions(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch transactions');
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchTransactions();
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
          `${config.backendUrl}/api/users/search?query=${encodeURIComponent(userSearch)}`,
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

  // Handle user selection from search results
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUsername(user.username);
    setUserSearch(user.username);
    setShowSearch(false);
  };

  // Handle top-up form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !amount || Number(amount) <= 0) {
      alert('Please enter a valid username and amount');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${config.backendUrl}/api/topup`,
        { username, amount: Number(amount) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Add new transaction to list
      setTransactions(prevTransactions => [response.data, ...prevTransactions]);

      // Reset form
      setUsername('');
      setAmount('');
      setUserSearch('');
      setSelectedUser(null);

      alert('Top-up processed successfully');
    } catch (err) {
      console.error('Top-up failed:', err);
      alert(err.response?.data?.message || 'Failed to process top-up');
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

  // If not admin, don't render the component
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="top-up-container">
      <h1>Top-up Management</h1>
      <div className="top-up-content">
        <section className="top-up-section">
          <h2>Add New Top-up</h2>
          <form className="top-up-form" onSubmit={handleSubmit}>
            <div className="form-group user-search-container">
              <label htmlFor="username">Username</label>
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
                placeholder="Search for a user..."
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
                        <div className="topup-user-balance">Current balance: {user.balance || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showSearch && userSearch.length >= 2 && searchResults.length === 0 && (
                <div className="no-results">No users found</div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="amount">Amount</label>
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
              {submitting ? 'Processing...' : 'Process Top-up'}
            </button>
          </form>
        </section>

        <section className="top-up-section">
          <h2>Recent Transactions</h2>
          {loading ? (
            <p>Loading transactions...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <div className="transactions-list">
              {transactions.length === 0 ? (
                <p>No transactions found</p>
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
                      <div className="transaction-amount">Amount: +{transaction.amount}</div>
                      <div className={`transaction-status ${transaction.status.toLowerCase()}`}>
                        {transaction.status}
                      </div>
                    </div>
                    <div className="transaction-admin">
                      Processed by: {transaction.admin.username}
                    </div>
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