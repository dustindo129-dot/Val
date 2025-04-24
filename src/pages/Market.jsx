import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config/config';
import DOMPurify from 'dompurify';
import '../styles/Market.css';

/**
 * Market Page Component
 * 
 * Page for users to make requests for new novels or chapter openings
 * with deposit functionality
 * 
 * @returns {JSX.Element} Market page component
 */
const Market = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [userBalance, setUserBalance] = useState(0);
  const [requestType, setRequestType] = useState('new'); // 'new' or 'open'
  const [requestText, setRequestText] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [novelSearchQuery, setNovelSearchQuery] = useState('');
  const [novelSearchResults, setNovelSearchResults] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [requests, setRequests] = useState([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [likingRequests, setLikingRequests] = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [showNovelResults, setShowNovelResults] = useState(false);
  const [withdrawableRequests, setWithdrawableRequests] = useState(new Set());
  const [withdrawingRequests, setWithdrawingRequests] = useState(new Set());

  // Fetch user balance and requests on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all pending requests
        const requestsResponse = await axios.get(`${config.backendUrl}/api/requests?sort=${sortOrder}`);
        setRequests(requestsResponse.data);
        
        // Fetch user balance if authenticated
        if (isAuthenticated && user) {
          const userResponse = await axios.get(
            `${config.backendUrl}/api/users/${user.username}/profile`, 
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setUserBalance(userResponse.data.balance || 0);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, user, sortOrder]);

  // Search for novels when query changes
  useEffect(() => {
    const searchNovels = async () => {
      if (!novelSearchQuery || novelSearchQuery.length < 3) {
        setNovelSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const response = await axios.get(
          `${config.backendUrl}/api/novels/search?title=${encodeURIComponent(novelSearchQuery)}`
        );
        setNovelSearchResults(response.data.slice(0, 5)); // Limit to 5 results
        setShowNovelResults(true);
      } catch (err) {
        console.error('Novel search failed:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchNovels, 500);
    return () => clearTimeout(timer);
  }, [novelSearchQuery]);

  // Handle request submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Please log in to make a request');
      return;
    }
    
    // Validate inputs
    if (!requestText.trim()) {
      alert('Please enter a request description');
      return;
    }
    
    if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }
    
    if (Number(depositAmount) > userBalance) {
      alert('Deposit amount cannot exceed your balance');
      return;
    }
    
    if (requestType === 'open' && !selectedNovel) {
      alert('Please select a novel for chapter opening request');
      return;
    }
    
    // Warn user about withdrawal policy
    if (!confirm('IMPORTANT: You can only withdraw your request within the first 5 seconds after posting. Do you want to proceed?')) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const requestData = {
        type: requestType,
        text: DOMPurify.sanitize(requestText),
        deposit: Number(depositAmount)
      };
      
      // Add novel ID if request type is 'open'
      if (requestType === 'open' && selectedNovel) {
        requestData.novelId = selectedNovel._id;
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/requests`,
        requestData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      const newRequest = response.data;
      
      // Update requests list with new request
      setRequests(prevRequests => [newRequest, ...prevRequests]);
      
      // Update user balance
      setUserBalance(prevBalance => prevBalance - Number(depositAmount));
      
      // Reset form
      setRequestText('');
      setDepositAmount('');
      setSelectedNovel(null);
      setNovelSearchQuery('');
      
      // Mark this request as withdrawable for 5 seconds
      setWithdrawableRequests(prev => new Set([...prev, newRequest._id]));
      
      // After 5 seconds, make the request no longer withdrawable
      setTimeout(() => {
        setWithdrawableRequests(prev => {
          const next = new Set(prev);
          next.delete(newRequest._id);
          return next;
        });
      }, 5000);
      
    } catch (err) {
      console.error('Failed to submit request:', err);
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle request type change
  const handleTypeChange = (type) => {
    setRequestType(type);
    
    // Clear inputs when switching types
    setRequestText('');
    setDepositAmount('');
    setSelectedNovel(null);
    setNovelSearchQuery('');
  };

  // Handle novel selection
  const handleNovelSelect = (novel) => {
    setSelectedNovel(novel);
    setNovelSearchQuery(novel.title);
    setShowNovelResults(false);
  };

  // Handle request sorting
  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
  };

  // Handle clearing form
  const handleClearForm = () => {
    setRequestText('');
    setDepositAmount('');
    setSelectedNovel(null);
    setNovelSearchQuery('');
  };

  // Handle liking a request
  const handleLikeRequest = async (requestId) => {
    if (!isAuthenticated) {
      alert('Please log in to like requests');
      return;
    }

    // Prevent multiple simultaneous likes on the same request
    if (likingRequests.has(requestId)) {
      return;
    }

    try {
      // Add request to loading state
      setLikingRequests(prev => new Set([...prev, requestId]));

      const response = await axios.post(
        `${config.backendUrl}/api/requests/${requestId}/like`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Update requests state to reflect the new like status
      setRequests(prevRequests => 
        prevRequests.map(request => {
          if (request._id === requestId) {
            // Update likes array based on response
            const userId = user._id || user.id;
            
            if (response.data.liked) {
              return {
                ...request,
                likes: [...(request.likes || []), userId]
              };
            } else {
              return {
                ...request,
                likes: (request.likes || []).filter(id => id !== userId)
              };
            }
          }
          return request;
        })
      );
    } catch (err) {
      console.error('Error liking request:', err);
      alert('Failed to like request');
    } finally {
      // Remove request from loading state
      setLikingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Handle approving a request (admin only)
  const handleApproveRequest = async (requestId) => {
    if (!user || user.role !== 'admin') {
      return;
    }

    if (!confirm('Are you sure you want to approve this request?')) {
      return;
    }

    try {
      await axios.post(
        `${config.backendUrl}/api/requests/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Remove the request from the list
      setRequests(prevRequests => prevRequests.filter(request => request._id !== requestId));
      
      alert('Request approved successfully');
    } catch (err) {
      console.error('Failed to approve request:', err);
      alert('Failed to approve request');
    }
  };

  // Handle declining a request (admin only)
  const handleDeclineRequest = async (requestId) => {
    if (!user || user.role !== 'admin') {
      return;
    }

    if (!confirm('Are you sure you want to decline this request?')) {
      return;
    }

    try {
      await axios.post(
        `${config.backendUrl}/api/requests/${requestId}/decline`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Remove the request from the list
      setRequests(prevRequests => prevRequests.filter(request => request._id !== requestId));
      
      alert('Request declined successfully');
    } catch (err) {
      console.error('Failed to decline request:', err);
      alert('Failed to decline request');
    }
  };

  // Handle withdrawing a request
  const handleWithdrawRequest = async (requestId) => {
    if (!isAuthenticated) {
      return;
    }
    
    // Prevent multiple withdrawal attempts
    if (withdrawingRequests.has(requestId)) {
      return;
    }
    
    if (!confirm('Are you sure you want to withdraw this request? Your deposit will be refunded.')) {
      return;
    }
    
    try {
      // Add request to withdrawing state
      setWithdrawingRequests(prev => new Set([...prev, requestId]));
      
      const response = await axios.post(
        `${config.backendUrl}/api/requests/${requestId}/withdraw`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // If successful, remove the request from the list
      if (response.status === 200) {
        setRequests(prevRequests => prevRequests.filter(request => request._id !== requestId));
        
        // Update user balance with refund amount from server response
        const refundAmount = response.data.refundAmount;
        setUserBalance(prev => prev + refundAmount);
        
        alert('Request withdrawn successfully. Your deposit has been refunded.');
      }
    } catch (err) {
      console.error('Failed to withdraw request:', err);
      alert(err.response?.data?.message || 'Failed to withdraw request');
    } finally {
      // Remove request from withdrawing state
      setWithdrawingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Format date to relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="market-container">
      <h1>Market</h1>
      <div className="market-content">
        <section className="market-section">
          <h2>Market Overview</h2>
          <p>Welcome to the Market page. Here you can request new novels or chapter openings by making a deposit.</p>
        </section>
        
        <section className="market-section">
          <div className="market-header">
            <h2>Requests ({requests.length})</h2>
            
            {/* Sort controls */}
            <div className="sort-controls">
              <span>Sort by: </span>
              <button 
                className={`sort-btn ${sortOrder === 'newest' ? 'active' : ''}`}
                onClick={() => handleSortChange('newest')}
              >
                Newest
              </button>
              <button 
                className={`sort-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
                onClick={() => handleSortChange('oldest')}
              >
                Oldest
              </button>
              <button 
                className={`sort-btn ${sortOrder === 'likes' ? 'active' : ''}`}
                onClick={() => handleSortChange('likes')}
              >
                Most Liked
              </button>
            </div>
          </div>
          
          {isAuthenticated ? (
            <div className="request-form-container">
              <div className="request-type-tabs">
                <button 
                  className={`type-tab ${requestType === 'new' ? 'active' : ''}`} 
                  onClick={() => handleTypeChange('new')}
                >
                  Request New Novel
                </button>
                <button 
                  className={`type-tab ${requestType === 'open' ? 'active' : ''}`} 
                  onClick={() => handleTypeChange('open')}
                >
                  Request Module/Chapter Opening
                </button>
              </div>
              
              <form className="request-form" onSubmit={handleSubmit}>
                {requestType === 'open' && (
                  <div className="novel-search">
                    <input
                      type="text"
                      placeholder="Search for a novel..."
                      value={novelSearchQuery}
                      onChange={(e) => setNovelSearchQuery(e.target.value)}
                      onClick={() => setShowNovelResults(true)}
                      className="novel-search-input"
                    />
                    {isSearching && <div className="searching-indicator">Searching...</div>}
                    
                    {showNovelResults && novelSearchResults.length > 0 && (
                      <div className="novel-search-results">
                        {novelSearchResults.map(novel => (
                          <div 
                            key={novel._id} 
                            className="novel-result"
                            onClick={() => handleNovelSelect(novel)}
                          >
                            <img 
                              src={novel.illustration || 'https://placeholder.com/book'} 
                              alt={novel.title} 
                              className="novel-result-cover"
                            />
                            <div className="novel-result-info">
                              <div className="novel-result-title">{novel.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showNovelResults && novelSearchQuery.length >= 3 && novelSearchResults.length === 0 && !isSearching && (
                      <div className="no-results">No novels found</div>
                    )}
                  </div>
                )}
                
                <textarea
                  className="request-input"
                  placeholder="Write your request..."
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  disabled={submitting}
                  required
                />
                
                <div className="deposit-input-container">
                  <label htmlFor="deposit">Deposit:</label>
                  <input
                    type="number"
                    id="deposit"
                    min="1"
                    step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={submitting}
                    required
                    className="deposit-input"
                  />
                  <span className="balance-display">Current balance: {userBalance}</span>
                </div>
                
                <div className="request-form-actions">
                  <button 
                    type="submit" 
                    className="submit-request-btn"
                    disabled={submitting || !requestText.trim() || !depositAmount || 
                             (requestType === 'open' && !selectedNovel) ||
                             (depositAmount && Number(depositAmount) > userBalance)}
                  >
                    {submitting ? 'Posting...' : 'Post Request'}
                  </button>
                  <button 
                    type="button" 
                    className="discard-btn"
                    onClick={handleClearForm}
                  >
                    Discard
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="login-to-request">
              Please <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="login-link">log in</button> to make a request.
            </div>
          )}
          
          <div className="requests-list">
            {isLoading ? (
              <p>Loading requests...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : requests.length === 0 ? (
              <p>No requests found</p>
            ) : (
              requests.map(request => {
                // Get the current user ID
                const userId = user?.id || user?._id;
                
                // Check if the current user has liked this request
                const isLikedByCurrentUser = isAuthenticated && userId && 
                  request.likes && Array.isArray(request.likes) && 
                  request.likes.some(likeId => likeId === userId);
                
                return (
                  <div key={request._id} className="request-item">
                    <div className="request-avatar">
                      {request.user.avatar ? (
                        <img src={request.user.avatar} alt={request.user.username} />
                      ) : (
                        <div className="default-avatar">
                          {request.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="request-content">
                      <div className="request-header">
                        <div className="request-user-info">
                          <span className="request-username">{request.user.username}</span>
                          <span className="request-type">
                            {request.type === 'new' ? 'Request new novel' : 'Request module/chapter opening'}
                          </span>
                          {request.type === 'open' && request.novel && (
                            <Link to={`/novel/${request.novel._id}`} className="novel-link">
                              {request.novel.title}
                            </Link>
                          )}
                        </div>
                        <span className="request-time">{formatRelativeTime(request.createdAt)}</span>
                      </div>
                      <div className="request-text">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(request.text) }} />
                        <div className="request-deposit">Deposit: {request.deposit}</div>
                      </div>
                      <div className="request-actions">
                        <button 
                          className={`like-button ${isLikedByCurrentUser ? 'liked' : ''}`}
                          onClick={() => handleLikeRequest(request._id)}
                          disabled={!isAuthenticated || likingRequests.has(request._id)}
                        >
                          <span className="like-icon">
                            {likingRequests.has(request._id) ? '⏳' : isLikedByCurrentUser ? '❤️' : '🤍'}
                          </span>
                          <span className="like-count">{request.likes ? request.likes.length : 0}</span>
                        </button>
                        
                        {/* Withdraw button - visible only for the user's own requests after 5 seconds */}
                        {isAuthenticated && 
                         user && 
                         request.user._id === (user._id || user.id) && 
                         !withdrawableRequests.has(request._id) && (
                          <button 
                            className="withdraw-button"
                            onClick={() => handleWithdrawRequest(request._id)}
                            disabled={withdrawingRequests.has(request._id)}
                          >
                            {withdrawingRequests.has(request._id) ? 'Withdrawing...' : 'Withdraw'}
                          </button>
                        )}
                        
                        {/* Admin actions */}
                        {user && user.role === 'admin' && (
                          <div className="admin-actions">
                            <button 
                              className="approve-btn"
                              onClick={() => handleApproveRequest(request._id)}
                            >
                              Approve
                            </button>
                            <button 
                              className="decline-btn"
                              onClick={() => handleDeclineRequest(request._id)}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Market; 