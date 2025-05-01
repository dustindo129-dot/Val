import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config/config';
import DOMPurify from 'dompurify';
import '../styles/Market.css';

// Import the components we've created
import {
  MarketHeader,
  MarketRequestsList,
  MarketRequestForm,
  RequestHistory,
  ContributionModal
} from '../components/market';

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
  
  // Load Font Awesome for the new UI
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);
  
  const [userBalance, setUserBalance] = useState(0);
  const [requestType, setRequestType] = useState('new'); // 'new' or 'open' or 'web'
  const [requestText, setRequestText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [goalAmount, setGoalAmount] = useState('10000'); // Default goal amount for web requests
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
  const [selectedModuleData, setSelectedModuleData] = useState(null);
  const [selectedChapterData, setSelectedChapterData] = useState(null);
  const [contributionModalOpen, setContributionModalOpen] = useState(false);
  const [currentRequestForContribution, setCurrentRequestForContribution] = useState(null);

  // Fetch user balance and requests on component mount
  useEffect(() => {
    fetchData();
  }, [isAuthenticated, user, sortOrder]);

  // Add new effect to load contributions for all requests when requests change
  useEffect(() => {
    if (requests.length > 0) {
      fetchAllContributions();
    }
  }, [requests]);

  // Fetch user balance and active requests
  const fetchData = async () => {
    if (!isAuthenticated) {
      // Still fetch requests even if not authenticated
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch requests with sort option
        const requestsResponse = await axios.get(
          `${config.backendUrl}/api/requests?sort=${sortOrder}`
        );
        setRequests(requestsResponse.data);
      } catch (err) {
        console.error('Không thể tải dữ liệu:', err);
        setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
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
      console.error('Không thể tải dữ liệu:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // New function to fetch contributions for all loaded requests
  const fetchAllContributions = async () => {
    try {
      // Create a Set of request IDs to avoid duplicate requests
      const requestIds = new Set(requests.map(req => req._id));
      
      // Create a temporary object to store contributions by request ID
      const newContributions = { ...contributions };
      
      // For each request, fetch contributions if not already loaded
      for (const requestId of requestIds) {
        if (!contributions[requestId] && !loadingContributions.has(requestId)) {
          setLoadingContributions(prev => new Set([...prev, requestId]));
          
          try {
            const response = await axios.get(
              `${config.backendUrl}/api/contributions/request/${requestId}`
            );
            
            // Only store and display if there are actual contributions
            if (response.data.length > 0) {
              newContributions[requestId] = response.data;
            }
          } finally {
            setLoadingContributions(prev => {
              const next = new Set(prev);
              next.delete(requestId);
              return next;
            });
          }
        }
      }
      
      setContributions(newContributions);
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
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
        setSelectedModuleData(null);
        setSelectedChapterData(null);
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
        setSelectedModuleData(null);
        setSelectedChapterData(null);
      } catch (err) {
        console.error('Failed to fetch modules:', err);
      } finally {
        setLoadingModules(false);
        setLoadingChapters(false);
      }
    };
    
    fetchModules();
  }, [selectedNovel]);

  // Update selected module data when module selection changes
  useEffect(() => {
    if (selectedModule) {
      const moduleData = modules.find(m => m._id === selectedModule);
      setSelectedModuleData(moduleData);
      setSelectedChapterData(null);
    } else {
      setSelectedModuleData(null);
    }
  }, [selectedModule, modules]);

  // Update selected chapter data when chapter selection changes
  useEffect(() => {
    if (selectedChapter) {
      const chapterData = chapters.find(c => c._id === selectedChapter);
      setSelectedChapterData(chapterData);
    } else {
      setSelectedChapterData(null);
    }
  }, [selectedChapter, chapters]);

  // Handle request submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để gửi yêu cầu');
      return;
    }
    
    // Validate input based on request type
    if (requestType === 'new' && !requestText.trim()) {
      alert('Vui lòng điền tên truyện bạn muốn yêu cầu');
      return;
    }

    if (requestType === 'web' && !selectedNovel) {
      alert('Vui lòng chọn truyện cho đề xuất');
      return;
    }
    
    // Different validation for web requests vs other request types
    if (requestType !== 'web') {
    if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
      alert('Vui lòng điền số cọc hợp lệ');
      return;
    }
    
      // Validate minimum deposit amount for non-web requests
    if (Number(depositAmount) < 100) {
      alert('Số 🌾 cọc tối thiểu là 100');
      return;
    }
    
    if (Number(depositAmount) > userBalance) {
      alert('Số cọc không được vượt quá số 🌾 hiện tại');
      return;
      }
    } else {
      // Web request validation
      if (!goalAmount || isNaN(goalAmount) || Number(goalAmount) <= 0) {
        alert('Vui lòng điền số 🌾 mục tiêu hợp lệ');
        return;
      }
    }
    
    if (requestType === 'open' && !selectedNovel) {
      alert('Vui lòng chọn truyện bạn muốn mở chương');
      return;
    }
    
    // For "open" type, only allow if a paid module or chapter is selected
    if (requestType === 'open' && !selectedModuleData && !selectedChapterData) {
      alert('Vui lòng chọn một tập/chương đang khóa để mở');
      return;
    }
    
    // Different confirmation message based on request type
    let confirmMessage = '';
    if (requestType === 'web') {
      confirmMessage = 'Bạn có chắc muốn tạo đề xuất từ nhóm dịch cho truyện này?';
    } else if (requestType === 'open') {
      confirmMessage = 'QUAN TRỌNG: Điều này sẽ mở tập/chương đã chọn ngay lập tức bằng cọc của bạn. Hành động này không thể hoàn tác. Bạn có muốn tiếp tục không?';
    } else {
      confirmMessage = 'QUAN TRỌNG: Bạn chỉ có thể rút yêu cầu sau 24 giờ đã gửi. Bạn có muốn tiếp tục không?';
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (requestType === 'open') {
        // Handle open request - all processed immediately now
        const deposit = Number(depositAmount);
        
        // Create the request data
        const openRequestData = {
          type: 'open',
          title: DOMPurify.sanitize(requestText.trim() || "Yêu cầu được thông qua tự động"),
          novelId: selectedNovel._id,
          deposit: Number(depositAmount)
        };
        
        // Add module or chapter ID if selected
        if (selectedModuleData) {
          openRequestData.moduleId = selectedModuleData._id;
        } else if (selectedChapterData) {
          openRequestData.chapterId = selectedChapterData._id;
        }
        
        // Submit the request to the API
        const response = await axios.post(
          `${config.backendUrl}/api/requests`,
          openRequestData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        // Check if there was a refund
        if (response.data.refundAmount) {
          // Update local user balance to reflect refund
          setUserBalance(prevBalance => prevBalance - deposit + response.data.refundAmount);
          
          alert(`Yêu cầu đã được xử lí thành công. Mục đã được mở! Một số dư hoàn lại ${response.data.refundAmount} đã được thêm vào số 🌾 hiện tại của bạn.`);
        } else {
          // Update local user balance
          setUserBalance(prevBalance => prevBalance - deposit);
          
          alert('Yêu cầu của bạn đã được xử lý thành công. Mục đã được mở!');
        }
        
        // Refresh the page or fetch updated data
        await fetchData();
        
      } else {
        // Normal request creation for new and web types
        const requestData = {
          type: requestType,
          title: requestType === 'web' 
                 ? selectedNovel.title 
                 : DOMPurify.sanitize(requestText.trim() || "Yêu cầu truyện mới chưa có tên"),
          deposit: requestType === 'web' ? 0 : Number(depositAmount)
        };
        
        // Add goal balance for web requests
        if (requestType === 'web') {
          requestData.goalBalance = Number(goalAmount);
        }
        
        // Add note if provided
        if (requestNote.trim()) {
          requestData.note = DOMPurify.sanitize(requestNote);
        }
        
        // Add novel ID for web recommendations
        if (requestType === 'web') {
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
        
        // Update user balance (only for non-web requests)
        if (requestType !== 'web') {
        setUserBalance(prevBalance => prevBalance - Number(depositAmount));
        }
        
        // Add request to withdrawableRequests after 24 hours (for user requests only)
        if (requestType === 'new') {
          setTimeout(() => {
            setWithdrawableRequests(prev => new Set([...prev, newRequest._id]));
          }, 86400000); // 24 hours in milliseconds
        }
      }
      
      // Reset form in all cases
      setRequestText('');
      setRequestNote('');
      setDepositAmount('');
      setGoalAmount('10000');
      setSelectedNovel(null);
      setSelectedModule(null);
      setSelectedChapter(null);
      setSelectedModuleData(null);
      setSelectedChapterData(null);
      setNovelSearchQuery('');
      
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
    setGoalAmount('10000');
    setSelectedNovel(null);
    setSelectedModule(null);
    setSelectedChapter(null);
    setSelectedModuleData(null);
    setSelectedChapterData(null);
    setNovelSearchQuery('');
  };

  // Handle novel selection
  const handleNovelSelect = (novel) => {
    setSelectedNovel(novel);
    setNovelSearchQuery(novel.title);
    setShowNovelResults(false);
    setSelectedModule(null);
    setSelectedChapter(null);
    setSelectedModuleData(null);
    setSelectedChapterData(null);
  };

  // Handle module selection
  const handleModuleSelect = (e) => {
    setSelectedModule(e.target.value);
    setSelectedChapter(null);
    setSelectedChapterData(null);
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
    setGoalAmount('10000');
    setSelectedNovel(null);
    setSelectedModule(null);
    setSelectedChapter(null);
    setSelectedModuleData(null);
    setSelectedChapterData(null);
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
      console.error('Không thể tải lịch sử yêu cầu:', err);
      alert('Không thể tải lịch sử yêu cầu');
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
      alert('Vui lòng đăng nhập để thích yêu cầu');
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
      console.error('Không thể thích yêu cầu:', err);
      alert('Không thể thích yêu cầu');
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

    // Find the request in the current list to check its type
    const requestToApprove = requests.find(req => req._id === requestId);
    
    if (!requestToApprove) {
      return;
    }
    
    // Only allow approving 'new' type requests, since 'open' requests are auto-processed
    if (requestToApprove.type !== 'new') {
      alert('This type of request is automatically processed and cannot be manually approved.');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn phê duyệt yêu cầu này? Điều này sẽ phê duyệt tất cả các đóng góp đang chờ.')) {
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
          console.error('Không thể phê duyệt đóng góp:', contributionErr);
          // Don't throw here, as the request was already approved
        }
      }
      
      // Remove the request from the list
      setRequests(prevRequests => prevRequests.filter(request => request._id !== requestId));
      
      // If there's a novel ID in the response, navigate to it
      if (approveResponse.data.novelId) {
        alert('Yêu cầu đã được phê duyệt thành công và 🌾 đã được chuyển cho truyện.');
      } else {
        alert('Yêu cầu đã được phê duyệt thành công');
      }
    } catch (err) {
      console.error('Không thể phê duyệt yêu cầu:', err);
      
      // Check for novel constraint error
      if (err.response?.data?.needsNovel) {
        alert('Không thể phê duyệt: Bạn cần tạo truyện với tên chính xác khớp với yêu cầu trước.');
      } else {
        alert(err.response?.data?.message || 'Không thể phê duyệt yêu cầu');
      }
    }
  };

  // Handle declining a request (admin only)
  const handleDeclineRequest = async (requestId) => {
    if (!user || user.role !== 'admin') {
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn từ chối yêu cầu này? Điều này sẽ từ chối tất cả các đóng góp đang chờ và trả lại 🌾 cho người dùng.')) {
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
          console.error('Không thể từ chối đóng góp:', contributionErr);
          // Don't throw here, as the request was already declined
        }
      }
      
      // Remove the request from the list
      setRequests(prevRequests => prevRequests.filter(request => request._id !== requestId));
      
      alert('Yêu cầu đã được từ chối thành công');
    } catch (err) {
      console.error('Không thể từ chối yêu cầu:', err);
      alert('Không thể từ chối yêu cầu');
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
    
    if (!confirm('Bạn có chắc chắn muốn rút lại yêu cầu này? Số 🌾 cọc sẽ được trả lại.')) {
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
        
        alert('Yêu cầu đã được rút lại thành công. Số 🌾 cọc đã được trả lại.');
      }
    } catch (err) {
      console.error('Không thể rút lại yêu cầu:', err);
      alert(err.response?.data?.message || 'Không thể rút lại yêu cầu');
    } finally {
      // Remove request from withdrawing state
      setWithdrawingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Fetch contributions for a request - modify to avoid duplicate fetches
  const fetchContributions = async (requestId) => {
    if (loadingContributions.has(requestId) || contributions[requestId]) {
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
      console.error('Không thể tải đóng góp:', err);
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
    // Find the request to get title information for the modal
    const request = requests.find(r => r._id === requestId);
    if (!request) return;
    
    setCurrentRequestForContribution(request);
    setContributionAmount('');
    setContributionNote('');
    setContributionModalOpen(true);
    
    // Fetch contributions if not loaded yet
    if (!contributions[requestId]) {
      fetchContributions(requestId);
    }
  };

  // Close contribution modal
  const handleCloseContributionModal = () => {
    setContributionModalOpen(false);
    setCurrentRequestForContribution(null);
    setContributionAmount('');
    setContributionNote('');
  };

  // Handle contribution submission
  const handleSubmitContribution = async () => {
    if (!isAuthenticated || !currentRequestForContribution) {
      alert('Vui lòng đăng nhập để góp🌾');
      return;
    }
    
    const requestId = currentRequestForContribution._id;
    
    // Validate inputs
    if (!contributionAmount || isNaN(contributionAmount) || Number(contributionAmount) <= 0) {
      alert('Vui lòng nhập số🌾 góp hợp lệ');
      return;
    }
    
    if (Number(contributionAmount) > userBalance) {
      alert('Số🌾 góp không được vượt quá số🌾 có trong tài khoản');
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
      
      // Reset form and close modal
      handleCloseContributionModal();
      
    } catch (err) {
      console.error('Failed to submit contribution:', err);
      alert(err.response?.data?.message || 'Failed to submit contribution');
    } finally {
      setSubmittingContribution(false);
    }
  };

  return (
    <div className="market-container">
      <h1>Bảng Yêu Cầu</h1>
      <div className="market-content">
        {/* Market Header */}
        <MarketHeader />
        
        <section className="market-section">
          {/* Market Requests List */}
          <MarketRequestsList
            requests={requests}
            isLoading={isLoading}
            error={error}
            isAuthenticated={isAuthenticated}
            user={user}
            sortOrder={sortOrder}
            handleSortChange={handleSortChange}
            likingRequests={likingRequests}
            handleLikeRequest={handleLikeRequest}
            handleShowContributionForm={handleShowContributionForm}
            handleApproveRequest={handleApproveRequest}
            handleDeclineRequest={handleDeclineRequest}
            withdrawableRequests={withdrawableRequests}
            withdrawingRequests={withdrawingRequests}
            handleWithdrawRequest={handleWithdrawRequest}
            contributions={contributions}
            showContributionForm={showContributionForm}
            setShowContributionForm={setShowContributionForm}
            showHistory={showHistory}
          />
          
          {/* Request History */}
          {showHistory && (
            <RequestHistory
              requestHistory={requestHistory}
              historyLoading={historyLoading}
              contributions={contributions}
              loadingContributions={loadingContributions}
              setShowHistory={setShowHistory}
            />
          )}
        </section>
        
        <section className="market-section">
          <div className="market-header">
            <h2>Tạo yêu cầu mới</h2>
          </div>
          
          {isAuthenticated ? (
            <MarketRequestForm
              isAuthenticated={isAuthenticated}
              user={user}
              requestType={requestType}
              handleTypeChange={handleTypeChange}
              requestText={requestText}
              setRequestText={setRequestText}
              requestNote={requestNote}
              setRequestNote={setRequestNote}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              goalAmount={goalAmount}
              setGoalAmount={setGoalAmount}
              userBalance={userBalance}
              submitting={submitting}
              handleSubmit={handleSubmit}
              handleClearForm={handleClearForm}
              novelSearchQuery={novelSearchQuery}
              setNovelSearchQuery={setNovelSearchQuery}
              novelSearchResults={novelSearchResults}
              showNovelResults={showNovelResults}
              setShowNovelResults={setShowNovelResults}
              isSearching={isSearching}
              selectedNovel={selectedNovel}
              handleNovelSelect={handleNovelSelect}
              modules={modules}
              selectedModule={selectedModule}
              handleModuleSelect={handleModuleSelect}
              loadingModules={loadingModules}
              chapters={chapters}
              selectedChapter={selectedChapter}
              handleChapterSelect={handleChapterSelect}
              loadingChapters={loadingChapters}
              showHistory={showHistory}
              toggleHistory={toggleHistory}
            />
          ) : (
            <div className="login-to-request">
              Vui lòng <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="login-link">đăng nhập</button> để tạo yêu cầu.
            </div>
          )}
        </section>
      </div>
      
      {/* Contribution Modal */}
      <ContributionModal
          isOpen={contributionModalOpen}
          onClose={handleCloseContributionModal}
        currentRequest={currentRequestForContribution}
        contributionAmount={contributionAmount}
        setContributionAmount={setContributionAmount}
        contributionNote={contributionNote}
        setContributionNote={setContributionNote}
        submitting={submittingContribution}
        handleSubmit={handleSubmitContribution}
        userBalance={userBalance}
      />
    </div>
  );
};

export default Market; 