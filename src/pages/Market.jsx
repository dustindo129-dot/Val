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
  const [requestNote, setRequestNote] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [novelSearchQuery, setNovelSearchQuery] = useState('');
  const [novelSearchResults, setNovelSearchResults] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [modules, setModules] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
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
  const [showHistory, setShowHistory] = useState(false);
  const [requestHistory, setRequestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  const [submittingContribution, setSubmittingContribution] = useState(false);
  const [contributions, setContributions] = useState({});
  const [loadingContributions, setLoadingContributions] = useState(new Set());

  // Fetch user balance and requests on component mount
  useEffect(() => {
    fetchData();
  }, [isAuthenticated, user, sortOrder]);

  // Fetch user balance and active requests
  const fetchData = async () => {
    if (!isAuthenticated) {
      setRequests([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch user balance
      const userResponse = await axios.get(
        `${config.backendUrl}/api/users/${user.username}/profile`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setUserBalance(userResponse.data.balance || 0);
      
      // Fetch requests with sort option
      const requestsResponse = await axios.get(
        `${config.backendUrl}/api/requests?sort=${sortOrder}`
      );
      setRequests(requestsResponse.data);
      
      // Set withdrawable requests
      const userRequestsResponse = await axios.get(
        `${config.backendUrl}/api/requests/history`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Filter requests that can be withdrawn (pending and created more than 24 hours ago)
      const withdrawable = new Set(
        userRequestsResponse.data
          .filter(req => {
            const requestTime = new Date(req.createdAt).getTime();
            const currentTime = new Date().getTime();
            const hoursSinceCreation = (currentTime - requestTime) / (1000 * 60 * 60);
            
            return req.status === 'pending' && hoursSinceCreation >= 24;
          })
          .map(req => req._id)
      );
      
      setWithdrawableRequests(withdrawable);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Search for novels as user types
  useEffect(() => {
    const searchNovels = async () => {
      if (!novelSearchQuery || novelSearchQuery.length < 3) {
        setNovelSearchResults([]);
        return;
      }
      
      // Skip search if a novel was just selected (when selectedNovel exists and its title matches the query)
      if (selectedNovel && selectedNovel.title === novelSearchQuery) {
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
  }, [novelSearchQuery, selectedNovel]);

  // Fetch modules when a novel is selected
  useEffect(() => {
    const fetchModules = async () => {
      if (!selectedNovel) {
        setModules([]);
        setChapters([]);
        setSelectedModule(null);
        setSelectedChapter(null);
        return;
      }
      
      setLoadingModules(true);
      setLoadingChapters(true);
      try {
        const response = await axios.get(
          `${config.backendUrl}/api/modules/${selectedNovel._id}/modules-with-chapters`
        );
        
        // Filter modules that are in 'paid' mode
        const paidModules = response.data.filter(module => module.mode === 'paid');
        setModules(paidModules);
        
        // Collect all paid chapters from all modules
        let allPaidChapters = [];
        response.data.forEach(module => {
          if (module.chapters) {
            const paidChaptersInModule = module.chapters.filter(chapter => chapter.mode === 'paid');
            allPaidChapters = [...allPaidChapters, ...paidChaptersInModule];
          }
        });
        setChapters(allPaidChapters);
        
        // Clear selected module and chapter since the novel changed
        setSelectedModule(null);
        setSelectedChapter(null);
      } catch (err) {
        console.error('Failed to fetch modules:', err);
      } finally {
        setLoadingModules(false);
        setLoadingChapters(false);
      }
    };
    
    fetchModules();
  }, [selectedNovel]);

  // Clear chapter selection when module selection changes
  useEffect(() => {
    if (selectedModule !== null) {
      setSelectedChapter(null);
    }
  }, [selectedModule]);

  // Handle request submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Please log in to make a request');
      return;
    }
    
    // Only validate requestText if it's a new novel request
    if (requestType === 'new' && !requestText.trim()) {
      alert('Please enter a request title');
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
    if (!confirm('IMPORTANT: You can only withdraw your request after 24 hours have passed since posting. Do you want to proceed?')) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const requestData = {
        type: requestType,
        text: DOMPurify.sanitize(requestText || ""), // Use empty string if no text
        deposit: Number(depositAmount)
      };
      
      // Add note if provided for new novel requests
      if (requestType === 'new' && requestNote.trim()) {
        requestData.note = DOMPurify.sanitize(requestNote);
      }
      
      // Add novel ID if request type is 'open'
      if (requestType === 'open' && selectedNovel) {
        requestData.novelId = selectedNovel._id;
        
        // Add module ID if selected
        if (selectedModule) {
          requestData.moduleId = selectedModule;
        }
        
        // Add chapter ID if selected
        if (selectedChapter) {
          requestData.chapterId = selectedChapter;
        }
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
      setRequestNote('');
      setDepositAmount('');
      setSelectedNovel(null);
      setSelectedModule(null);
      setSelectedChapter(null);
      setNovelSearchQuery('');
      
      // Add request to withdrawableRequests after 24 hours
      setTimeout(() => {
        setWithdrawableRequests(prev => new Set([...prev, newRequest._id]));
      }, 86400000); // 24 hours in milliseconds
      
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
    setRequestNote('');
    setDepositAmount('');
    setSelectedNovel(null);
    setSelectedModule(null);
    setSelectedChapter(null);
    setNovelSearchQuery('');
  };

  // Handle novel selection
  const handleNovelSelect = (novel) => {
    setSelectedNovel(novel);
    setNovelSearchQuery(novel.title);
    setShowNovelResults(false);
    setSelectedModule(null);
    setSelectedChapter(null);
  };

  // Handle module selection
  const handleModuleSelect = (e) => {
    setSelectedModule(e.target.value);
    setSelectedChapter(null);
  };

  // Handle chapter selection
  const handleChapterSelect = (e) => {
    setSelectedChapter(e.target.value);
  };

  // Handle request sorting
  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
  };

  // Handle clearing form
  const handleClearForm = () => {
    setRequestText('');
    setRequestNote('');
    setDepositAmount('');
    setSelectedNovel(null);
    setSelectedModule(null);
    setSelectedChapter(null);
    setNovelSearchQuery('');
  };

  // Fetch request history
  const fetchRequestHistory = async () => {
    if (!isAuthenticated) {
      return;
    }
    
    setHistoryLoading(true);
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/requests/all`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setRequestHistory(response.data);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to fetch request history:', err);
      alert('Failed to load request history');
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Toggle history view
  const toggleHistory = () => {
    if (showHistory) {
      setShowHistory(false);
    } else {
      fetchRequestHistory();
    }
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

    if (!confirm('Are you sure you want to approve this request? This will also approve all pending contributions.')) {
      return;
    }

    try {
      // First approve the request
      const approveResponse = await axios.post(
        `${config.backendUrl}/api/requests/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Check if there are contributions to approve
      const contributionsResponse = await axios.get(
        `${config.backendUrl}/api/contributions/request/${requestId}`
      );
      
      const pendingContributions = contributionsResponse.data.filter(
        contribution => contribution.status === 'pending'
      );
      
      // Only try to approve contributions if there are pending ones
      if (pendingContributions.length > 0) {
        try {
          await axios.post(
            `${config.backendUrl}/api/contributions/request/${requestId}/approve-all`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        } catch (contributionErr) {
          console.error('Failed to approve contributions:', contributionErr);
          // Don't throw here, as the request was already approved
        }
      }
      
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

    if (!confirm('Are you sure you want to decline this request? This will also decline all pending contributions and refund them.')) {
      return;
    }

    try {
      // First decline the request
      const declineResponse = await axios.post(
        `${config.backendUrl}/api/requests/${requestId}/decline`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Check if there are contributions to decline
      const contributionsResponse = await axios.get(
        `${config.backendUrl}/api/contributions/request/${requestId}`
      );
      
      const pendingContributions = contributionsResponse.data.filter(
        contribution => contribution.status === 'pending'
      );
      
      // Only try to decline contributions if there are pending ones
      if (pendingContributions.length > 0) {
        try {
          await axios.post(
            `${config.backendUrl}/api/contributions/request/${requestId}/decline-all`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        } catch (contributionErr) {
          console.error('Failed to decline contributions:', contributionErr);
          // Don't throw here, as the request was already declined
        }
      }
      
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

  // Fetch contributions for a request
  const fetchContributions = async (requestId) => {
    if (loadingContributions.has(requestId)) {
      return;
    }

    setLoadingContributions(prev => new Set([...prev, requestId]));
    
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/contributions/request/${requestId}`
      );
      
      setContributions(prev => ({
        ...prev,
        [requestId]: response.data
      }));
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
    } finally {
      setLoadingContributions(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Handle showing contribution form
  const handleShowContributionForm = (requestId) => {
    if (showContributionForm === requestId) {
      setShowContributionForm(null);
      setContributionAmount('');
      setContributionNote('');
    } else {
      setShowContributionForm(requestId);
      setContributionAmount('');
      setContributionNote('');
      
      // Fetch contributions if not loaded yet
      if (!contributions[requestId]) {
        fetchContributions(requestId);
      }
    }
  };

  // Handle contribution submission
  const handleSubmitContribution = async (requestId) => {
    if (!isAuthenticated) {
      alert('Please log in to contribute');
      return;
    }
    
    // Validate inputs
    if (!contributionAmount || isNaN(contributionAmount) || Number(contributionAmount) <= 0) {
      alert('Please enter a valid contribution amount');
      return;
    }
    
    if (Number(contributionAmount) > userBalance) {
      alert('Contribution amount cannot exceed your balance');
      return;
    }
    
    setSubmittingContribution(true);
    
    try {
      const contributionData = {
        requestId,
        amount: Number(contributionAmount)
      };
      
      // Add note if provided
      if (contributionNote.trim()) {
        contributionData.note = DOMPurify.sanitize(contributionNote);
      }
      
      const response = await axios.post(
        `${config.backendUrl}/api/contributions`,
        contributionData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      const newContribution = response.data;
      
      // Update contributions list with new contribution
      setContributions(prev => ({
        ...prev,
        [requestId]: [newContribution, ...(prev[requestId] || [])]
      }));
      
      // Update user balance
      setUserBalance(prevBalance => prevBalance - Number(contributionAmount));
      
      // Reset form
      setContributionAmount('');
      setContributionNote('');
      setShowContributionForm(null);
      
    } catch (err) {
      console.error('Failed to submit contribution:', err);
      alert(err.response?.data?.message || 'Failed to submit contribution');
    } finally {
      setSubmittingContribution(false);
    }
  };

  // Handle approving a contribution (admin only)
  const handleApproveContribution = async (contributionId, requestId) => {
    if (!user || user.role !== 'admin') {
      return;
    }

    if (!confirm('Are you sure you want to approve this contribution?')) {
      return;
    }

    try {
      await axios.post(
        `${config.backendUrl}/api/contributions/${contributionId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Update the contribution status locally
      setContributions(prev => ({
        ...prev,
        [requestId]: (prev[requestId] || []).map(contribution => 
          contribution._id === contributionId 
            ? { ...contribution, status: 'approved' }
            : contribution
        )
      }));
      
      alert('Contribution approved successfully');
    } catch (err) {
      console.error('Failed to approve contribution:', err);
      alert('Failed to approve contribution');
    }
  };

  // Handle declining a contribution (admin only)
  const handleDeclineContribution = async (contributionId, requestId) => {
    if (!user || user.role !== 'admin') {
      return;
    }

    if (!confirm('Are you sure you want to decline this contribution?')) {
      return;
    }

    try {
      await axios.post(
        `${config.backendUrl}/api/contributions/${contributionId}/decline`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Update the contribution status locally
      setContributions(prev => ({
        ...prev,
        [requestId]: (prev[requestId] || []).map(contribution => 
          contribution._id === contributionId 
            ? { ...contribution, status: 'declined' }
            : contribution
        )
      }));
      
      alert('Contribution declined successfully');
    } catch (err) {
      console.error('Failed to decline contribution:', err);
      alert('Failed to decline contribution');
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
                
                {/* Request History Button - Visible to all logged-in users */}
                {isAuthenticated && (
                  <button 
                    className={`type-tab history-tab ${showHistory ? 'active' : ''}`} 
                    onClick={toggleHistory}
                  >
                    Request History
                  </button>
                )}
              </div>
              
              {showHistory ? (
                <div className="request-history-container">
                  <h3>Request History</h3>
                  {historyLoading ? (
                    <p>Loading history...</p>
                  ) : requestHistory.length === 0 ? (
                    <p>No request history found</p>
                  ) : (
                    <div className="request-history-list">
                      {requestHistory.map(request => (
                        <div key={request._id} className={`history-item status-${request.status}`}>
                          <div className="history-header">
                            <div className="history-user">
                              <span className="history-username">{request.user.username}</span>
                              <span className="history-type">{request.type === 'new' ? 'New Novel' : 'Module Opening'}</span>
                              <span className={`history-status status-${request.status}`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </div>
                            <div className="history-date">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="history-text">{request.text}</div>
                          {request.note && (
                            <div className="history-note">{request.note}</div>
                          )}
                          {request.novel && (
                            <div className="history-novel">
                              <span>Novel: </span>
                              <Link to={`/novel/${request.novel._id}`}>{request.novel.title}</Link>
                              {request.module && (
                                <span className="module-info">- {request.module.title}</span>
                              )}
                              {request.chapter && (
                                <span className="chapter-info">- {request.chapter.title}</span>
                              )}
                            </div>
                          )}
                          <div className="history-deposit">Deposit: {request.deposit}</div>
                          
                          {/* Only show contributions section if contributions exist */}
                          {contributions[request._id] && contributions[request._id].length > 0 && (
                            <div className="history-contributions">
                              <h4>
                                {loadingContributions.has(request._id) 
                                  ? 'Loading contributions...' 
                                  : `Contributions (${contributions[request._id].length})`}
                              </h4>
                              
                              {contributions[request._id].map(contribution => (
                                <div key={contribution._id} className={`history-contribution status-${contribution.status}`}>
                                  <div className="contribution-header">
                                    <span className="contribution-username">{contribution.user.username}</span>
                                    <span className={`contribution-status status-${contribution.status}`}>
                                      {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                                    </span>
                                    <span className="contribution-date">
                                      {new Date(contribution.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {contribution.note && (
                                    <div className="contribution-note">{contribution.note}</div>
                                  )}
                                  <div className="contribution-amount">Amount: {contribution.amount}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="close-history-btn" onClick={() => setShowHistory(false)}>
                    Back to Requests
                  </button>
                </div>
              ) : (
                <form className="request-form" onSubmit={handleSubmit}>
                  {requestType === 'open' && (
                    <div className="novel-search-container">
                      <div className="novel-search short">
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
                      
                      {selectedNovel && modules.length > 0 && (
                        <div className="module-selector">
                          <select
                            value={selectedModule || ""}
                            onChange={handleModuleSelect}
                            className="module-select"
                          >
                            <option value="">Select a module (optional)</option>
                            {modules.map(module => (
                              <option key={module._id} value={module._id}>
                                {module.title}
                              </option>
                            ))}
                          </select>
                          {loadingModules && <span className="loading-indicator">Loading...</span>}
                        </div>
                      )}
                      
                      {selectedNovel && chapters.length > 0 && (
                        <div className="chapter-selector">
                          <select
                            value={selectedChapter || ""}
                            onChange={handleChapterSelect}
                            className="chapter-select"
                          >
                            <option value="">Select a chapter (optional)</option>
                            {chapters.map(chapter => (
                              <option key={chapter._id} value={chapter._id}>
                                {chapter.title}
                              </option>
                            ))}
                          </select>
                          {loadingChapters && <span className="loading-indicator">Loading...</span>}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {requestType === 'new' ? (
                    <>
                      <input
                        type="text"
                        className="request-title-input"
                        placeholder="Title of the novel you want..."
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        disabled={submitting}
                        required
                      />
                      <textarea
                        className="request-input"
                        placeholder="Additional note... (optional)"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        disabled={submitting}
                      />
                    </>
                  ) : (
                    <textarea
                      className="request-input"
                      placeholder="Write your request... (optional)"
                      value={requestText}
                      onChange={(e) => setRequestText(e.target.value)}
                      disabled={submitting}
                    />
                  )}
                  
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
                      disabled={submitting || 
                               (requestType === 'new' && !requestText.trim()) || 
                               !depositAmount || 
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
              )}
            </div>
          ) : (
            <div className="login-to-request">
              Please <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="login-link">log in</button> to make a request.
            </div>
          )}
          
          {!showHistory && (
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
                              <div className="request-novel-info">
                                <Link to={`/novel/${request.novel._id}`} className="novel-link">
                                  {request.novel.title}
                                </Link>
                                {request.module && (
                                  <span className="module-info">- {request.module.title}</span>
                                )}
                                {request.chapter && (
                                  <span className="chapter-info">- {request.chapter.title}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="request-time">{formatRelativeTime(request.createdAt)}</span>
                        </div>
                        <div className="request-text">
                          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(request.text) }} />
                          {request.note && (
                            <div className="request-note">
                              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(request.note) }} />
                            </div>
                          )}
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
                          
                          {/* Contribute button - visible to everyone for pending requests */}
                          {request.status === 'pending' && (
                            <button 
                              className="contribute-button"
                              onClick={() => handleShowContributionForm(request._id)}
                            >
                              {showContributionForm === request._id ? 'Cancel' : 'Contribute'}
                            </button>
                          )}
                          
                          {/* Withdraw button - visible only for the user's own requests after 24 hours */}
                          {isAuthenticated && 
                           user && 
                           request.user._id === (user._id || user.id) && 
                           withdrawableRequests.has(request._id) && (
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

                        {/* Contributions Section - Only shown when contribute form is active or contributions exist */}
                        {(showContributionForm === request._id || 
                          (contributions[request._id] && contributions[request._id].length > 0)) && (
                          <div className="contributions-container">
                            {/* Contribution Form - Only shown when contribute button is clicked */}
                            {showContributionForm === request._id && isAuthenticated && (
                              <div className="contribution-form">
                                <div className="contribution-input-container">
                                  <label htmlFor={`contribution-amount-${request._id}`}>Contribute amount:</label>
                                  <input
                                    type="number"
                                    id={`contribution-amount-${request._id}`}
                                    min="1"
                                    step="1"
                                    value={contributionAmount}
                                    onChange={(e) => setContributionAmount(e.target.value)}
                                    disabled={submittingContribution}
                                    required
                                    className="contribution-input"
                                  />
                                  <span className="balance-display">Current balance: {userBalance}</span>
                                </div>
                                
                                <textarea
                                  className="contribution-note-input"
                                  placeholder="Additional note... (optional)"
                                  value={contributionNote}
                                  onChange={(e) => setContributionNote(e.target.value)}
                                  disabled={submittingContribution}
                                />
                                
                                <div className="contribution-form-actions">
                                  <button 
                                    className="submit-contribution-btn"
                                    onClick={() => handleSubmitContribution(request._id)}
                                    disabled={submittingContribution || !contributionAmount || 
                                            (contributionAmount && Number(contributionAmount) > userBalance)}
                                  >
                                    {submittingContribution ? 'Contributing...' : 'Confirm'}
                                  </button>
                                  <button 
                                    type="button" 
                                    className="cancel-contribution-btn"
                                    onClick={() => {
                                      setShowContributionForm(null);
                                      setContributionAmount('');
                                      setContributionNote('');
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Show login prompt in the form area if not authenticated */}
                            {showContributionForm === request._id && !isAuthenticated && (
                              <div className="login-to-contribute">
                                Please <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="login-link">log in</button> to contribute.
                              </div>
                            )}
                            
                            {/* Contributions List - Only shown when contributions exist */}
                            {contributions[request._id] && contributions[request._id].length > 0 && (
                              <div className="contributions-list">
                                <h4 className="contributions-title">
                                  {loadingContributions.has(request._id) 
                                    ? 'Loading contributions...' 
                                    : `Contributions (${contributions[request._id].length})`}
                                </h4>
                                
                                {contributions[request._id].map(contribution => (
                                  <div key={contribution._id} className={`contribution-item status-${contribution.status}`}>
                                    <div className="contribution-avatar">
                                      {contribution.user.avatar ? (
                                        <img src={contribution.user.avatar} alt={contribution.user.username} />
                                      ) : (
                                        <div className="default-avatar">
                                          {contribution.user.username.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="contribution-content">
                                      <div className="contribution-header">
                                        <div className="contribution-user-info">
                                          <span className="contribution-username">{contribution.user.username}</span>
                                          <span className={`contribution-status status-${contribution.status}`}>
                                            {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                                          </span>
                                        </div>
                                        <span className="contribution-time">{formatRelativeTime(contribution.createdAt)}</span>
                                      </div>
                                      {contribution.note && (
                                        <div className="contribution-text">
                                          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contribution.note) }} />
                                        </div>
                                      )}
                                      <div className="contribution-amount">Contribution: {contribution.amount}</div>
                                      
                                      {/* Admin actions for contributions */}
                                      {user && user.role === 'admin' && contribution.status === 'pending' && (
                                        <div className="admin-actions contribution-admin-actions">
                                          <button 
                                            className="approve-btn"
                                            onClick={() => handleApproveContribution(contribution._id, request._id)}
                                          >
                                            Approve
                                          </button>
                                          <button 
                                            className="decline-btn"
                                            onClick={() => handleDeclineContribution(contribution._id, request._id)}
                                          >
                                            Decline
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Market; 