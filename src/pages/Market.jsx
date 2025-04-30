import { useEffect, useState } from 'react';
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
  // New state for the open now option
  const [openNowOption, setOpenNowOption] = useState('post'); // 'post' or 'openNow'
  // State to store the selected module/chapter details
  const [selectedModuleData, setSelectedModuleData] = useState(null);
  const [selectedChapterData, setSelectedChapterData] = useState(null);

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

  // Reset open now option when selections change
  useEffect(() => {
    // If no paid module or chapter is selected, reset to "Post"
    if (!selectedModuleData && !selectedChapterData) {
      setOpenNowOption('post');
    }
  }, [selectedModuleData, selectedChapterData]);

  // Clear chapter selection when module selection changes
  useEffect(() => {
    if (selectedModule !== null) {
      setSelectedChapter(null);
      setSelectedChapterData(null);
    }
  }, [selectedModule]);

  // Handle request submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để gửi yêu cầu');
      return;
    }
    
    // Only validate requestText if it's a new novel request
    if (requestType === 'new' && !requestText.trim()) {
      alert('Vui lòng điền tên truyện bạn muốn yêu cầu');
      return;
    }
    
    if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
      alert('Vui lòng điền số cọc hợp lệ');
      return;
    }
    
    // Validate minimum deposit amount
    if (Number(depositAmount) < 100) {
      alert('Số 🌾 cọc tối thiểu là 100');
      return;
    }
    
    if (Number(depositAmount) > userBalance) {
      alert('Số cọc không được vượt quá số 🌾 hiện tại');
      return;
    }
    
    if (requestType === 'open' && !selectedNovel) {
      alert('Vui lòng chọn truyện bạn muốn mở chương');
      return;
    }
    
    // For "Open now!" option, only allow if a paid module or chapter is selected
    if (openNowOption === 'openNow' && !selectedModuleData && !selectedChapterData) {
      alert('Vui lòng chọn một tập/chương đang khóa để sử dụng tùy chọn "Mở ngay"');
      return;
    }
    
    // Different confirmation message based on selected option
    let confirmMessage = '';
    if (openNowOption === 'post') {
      confirmMessage = 'QUAN TRỌNG: Bạn chỉ có thể rút yêu cầu sau 24 giờ đã gửi. Bạn có muốn tiếp tục không?';
    } else { // openNow option
      confirmMessage = 'QUAN TRỌNG: Điều này sẽ mở tập/chương đã chọn ngay lập tức bằng cọc của bạn. Hành động này không thể hoàn tác. Bạn có muốn tiếp tục không?';
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (openNowOption === 'openNow') {
        // Handle "Open now!" option
        const deposit = Number(depositAmount);
        let refundAmount = 0;
        
        if (selectedModuleData) {
          // If deposit is greater than moduleBalance, calculate refund
          if (deposit > selectedModuleData.moduleBalance) {
            refundAmount = deposit - selectedModuleData.moduleBalance;
          }
          
          // Update module mode to "published" if balance will be 0 after this transaction
          const newMode = selectedModuleData.moduleBalance <= deposit ? 'published' : 'paid';
          const newBalance = Math.max(0, selectedModuleData.moduleBalance - deposit);
          
          // Call API to update module
          await axios.put(
            `${config.backendUrl}/api/modules/${selectedNovel._id}/modules/${selectedModuleData._id}`,
            {
              title: selectedModuleData.title,
              mode: newMode,
              moduleBalance: newBalance
            },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          
          // Create a request record with 'approved' status
          const requestData = {
            type: 'open',
            text: DOMPurify.sanitize(requestText || "Auto-approved open now request"),
            deposit: deposit,
            novelId: selectedNovel._id,
            moduleId: selectedModuleData._id,
            status: 'approved',
            openNow: true
          };
          
          await axios.post(
            `${config.backendUrl}/api/requests`,
            requestData,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          
        } else if (selectedChapterData) {
          // If deposit is greater than chapterBalance, calculate refund
          if (deposit > selectedChapterData.chapterBalance) {
            refundAmount = deposit - selectedChapterData.chapterBalance;
          }
          
          // Update chapter mode to "published" if balance will be 0 after this transaction
          const newMode = selectedChapterData.chapterBalance <= deposit ? 'published' : 'paid';
          const newBalance = Math.max(0, selectedChapterData.chapterBalance - deposit);
          
          // Call API to update chapter
          await axios.put(
            `${config.backendUrl}/api/chapters/${selectedChapterData._id}`,
            {
              title: selectedChapterData.title,
              mode: newMode,
              chapterBalance: newBalance
            },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          
          // Create a request record with 'approved' status
          const requestData = {
            type: 'open',
            text: DOMPurify.sanitize(requestText || "Auto-approved open now request"),
            deposit: deposit,
            novelId: selectedNovel._id,
            chapterId: selectedChapterData._id,
            status: 'approved',
            openNow: true
          };
          
          await axios.post(
            `${config.backendUrl}/api/requests`,
            requestData,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        }
        
        // Handle refund if necessary
        if (refundAmount > 0) {
          await axios.post(
            `${config.backendUrl}/api/users/refund`,
            { amount: refundAmount },
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          
          // Update local user balance to reflect refund
          setUserBalance(prevBalance => prevBalance - deposit + refundAmount);
          
          alert(`Yêu cầu đã được xử lí thành công. Mục đã được mở! Một số dư hoàn lại ${refundAmount} đã được thêm vào số 🌾 hiện tại của bạn.`);
        } else {
          // Update local user balance
          setUserBalance(prevBalance => prevBalance - deposit);
          
          alert('Yêu cầu của bạn đã được xử lý thành công. Mục đã được mở!');
        }
        
        // Refresh the page or fetch updated data
        await fetchData();
        
      } else {
        // Normal "Post" option - existing code
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
        
        // Add request to withdrawableRequests after 24 hours
        setTimeout(() => {
          setWithdrawableRequests(prev => new Set([...prev, newRequest._id]));
        }, 86400000); // 24 hours in milliseconds
      }
      
      // Reset form in all cases
      setRequestText('');
      setRequestNote('');
      setDepositAmount('');
      setSelectedNovel(null);
      setSelectedModule(null);
      setSelectedChapter(null);
      setSelectedModuleData(null);
      setSelectedChapterData(null);
      setNovelSearchQuery('');
      setOpenNowOption('post');
      
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
    setSelectedModuleData(null);
    setSelectedChapterData(null);
    setNovelSearchQuery('');
    setOpenNowOption('post');
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
    setOpenNowOption('post');
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

  // Handle option change (Post or Open now)
  const handleOptionChange = (option) => {
    setOpenNowOption(option);
  };

  // Check if "Open now!" option can be enabled
  const canOpenNow = selectedModuleData || selectedChapterData;

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
    setSelectedModuleData(null);
    setSelectedChapterData(null);
    setNovelSearchQuery('');
    setOpenNowOption('post');
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
      
      alert('Yêu cầu đã được phê duyệt thành công');
    } catch (err) {
      console.error('Không thể phê duyệt yêu cầu:', err);
      alert('Không thể phê duyệt yêu cầu');
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
      alert('Vui lòng đăng nhập để góp🌾');
      return;
    }
    
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
      return 'vừa xong';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} phút trước`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} giờ trước`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="market-container">
      <h1>Bảng Yêu Cầu</h1>
      <div className="market-content">
        <section className="market-section">
          <h2>Hướng dẫn chung</h2>
          <div className="market-overview">
            <p>Đây là nơi bạn có thể dùng 🌾 để yêu cầu truyện dịch mới hoặc yêu cầu mở chương/tập mới/sẵn có.</p>
            
            <div className="overview-section">
              <h3>Quy tắc chung:</h3>
              <ul>
                <li>Số 🌾 cọc tối thiểu là 100.</li>
                <li>Yêu cầu có thể rút lại sau 24h (sau 24h nút rút lại sẽ hiện ra), trừ trường hợp chọn Mở ngay!</li>
                <li>Có thể góp lúa vào yêu cầu có sẵn, bằng nút "góp" ở mỗi yêu cầu.</li>
                <li>Nếu yêu cầu bị từ chối, số 🌾 cọc sẽ được trả lại cho người dùng.</li>
                <li>Nếu số 🌾 cọc vượt quá số 🌾 cần để mở chương/tập mới, số dư sẽ được trả lại cho người dùng.</li>
              </ul>
            </div>

            <div className="overview-section">
              <h3>Đối với yêu cầu truyện mới:</h3>
              <ul>
                <li>Điền tên bộ truyện bạn muốn yêu cầu + nhắn nhủ thêm nếu có</li>
                <li>Cọc một số 🌾 bất kì (tối thiểu 100). Nếu dịch giả quyết định chạy bộ truyện yêu cầu, sẽ dựa vào con số này để quyết định làm bao nhiêu khi mới bắt đầu chạy, ví dụ 100 🌾 thì chắc vừa đủ mở project hoặc cùng lắm làm cái mở đầu hoặc đăng minh họa, nên cách tốt nhất hãy kêu gọi mọi người góp 🌾 cùng.</li>
                <li>Đăng yêu cầu và chờ đợi. Bên team dịch sẽ chỉ chấp nhận yêu cầu khi có thể đảm bảo tiến độ và chất lượng, nên sẽ mất chút thời gian để tìm được người dịch phù hợp nhất tùy theo yêu cầu.</li>
              </ul>
            </div>

            <div className="overview-section">
              <h3>Đối với mở chương/tập có sẵn:</h3>
              <ul>
                <li>Chọn bộ truyện trong thanh tìm kiếm.</li>
                <li>Chọn chương/tập bạn muốn mở + nhắn nhủ thêm nếu có.</li>
                <li>Điền số 🌾 cọc.</li>
                <li>Chọn 1 trong 2 option: Mở ngay hoặc Đăng bài gọi vốn.
                   <p>Nếu chọn mở ngay, số cọc sẽ lập tức được trừ vào số 🌾 cần để mở chương/tập, tự động mở nếu con số giảm xuống 0.</p>
                   <p>Nếu chọn Đăng bài gọi vốn, thì giống như gửi yêu cầu ở trên, có thể rút lại sau 24h, admin sẽ chấp nhận yêu cầu khi thấy số lượng 🌾 do mọi người góp đủ để mở chương/tập, hoặc sau quãng thời gian đủ lâu.</p></li>
                <li>Nếu chương/tập không có sẵn, và bạn muốn yêu cầu dịch giả dịch phần tiếp, hãy chọn tên bộ truyện, bỏ trống phần chương/tập, và chọn đăng bài gọi vốn.</li>
              </ul>
            </div>

            <div className="overview-section">
              <p className="important-note"><strong><em>Không có giới hạn cho bất kì yêu cầu nào của bạn, dù là truyện tiếng Anh, Nhật hay Trung, bất cứ gì cũng có thể được dịch ra tiếng Việt.</em></strong></p>
              <p className="important-note"><strong><em>Giá niêm yết: 4đ/1 chữ với truyện tiếng Anh/Trung, 6đ/1 chữ với truyện tiếng Nhật.</em></strong></p>
            </div>

            <div className="overview-section">
              <p className="note">Lưu ý: Đối với những yêu cầu liên quan đến truyện bản quyền hoặc 18+, vui lòng liên hệ <a href="https://www.facebook.com/profile.php?id=100064392503502" target="_blank" rel="noopener noreferrer">fanpage</a> để được tư vấn thêm.</p>
            </div>

            <div className="update-date">
              <em>Cập nhật ngày 29/04/2025</em>
            </div>
          </div>
        </section>
        
        <section className="market-section">
          <div className="market-header">
            <h2>Danh sách yêu cầu ({requests.length})</h2>
            
            {/* Sort controls */}
            <div className="sort-controls">
              <span>Sắp xếp theo: </span>
              <button 
                className={`sort-btn ${sortOrder === 'newest' ? 'active' : ''}`}
                onClick={() => handleSortChange('newest')}
              >
                Mới nhất
              </button>
              <button 
                className={`sort-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
                onClick={() => handleSortChange('oldest')}
              >
                Cũ nhất
              </button>
              <button 
                className={`sort-btn ${sortOrder === 'likes' ? 'active' : ''}`}
                onClick={() => handleSortChange('likes')}
              >
                Nhiều lượt thích nhất
              </button>
            </div>
          </div>
          
          {!showHistory && (
            <div className="requests-list">
              {isLoading ? (
                <p>Đang tải yêu cầu...</p>
              ) : error ? (
                <p className="error">{error}</p>
              ) : requests.length === 0 ? (
                <p>Không có yêu cầu nào</p>
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
                              {request.type === 'new' ? 'Yêu cầu truyện mới' : 'Yêu cầu mở chương/tập có sẵn'}
                            </span>
                            {request.openNow && (
                              <span className="request-open-now-badge">
                                Mở ngay
                              </span>
                            )}
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
                          <div className="request-deposit">🌾 Cọc: {request.deposit}</div>
                        </div>
                        <div className="request-actions">
                          <button 
                            className={`like-button ${isLikedByCurrentUser ? 'liked' : ''}`}
                            onClick={() => handleLikeRequest(request._id)}
                            disabled={!isAuthenticated || likingRequests.has(request._id)}
                          >
                            <span className="like-icon market-like-icon">
                              {likingRequests.has(request._id) ? '⏳' : <i className={`fa-solid fa-thumbs-up ${isLikedByCurrentUser ? 'liked' : ''}`}></i>}
                            </span>
                            <span className="like-text">Thích</span>
                            <span className="like-count">{request.likes ? request.likes.length : 0}</span>
                          </button>
                          
                          {/* Contribute button - visible to everyone for pending requests */}
                          {request.status === 'pending' && (
                            <button 
                              className="contribute-button"
                              onClick={() => handleShowContributionForm(request._id)}
                            >
                              {showContributionForm === request._id ? 'Hủy bỏ' : 'Góp 🌾'}
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
                              {withdrawingRequests.has(request._id) ? 'Đang rút...' : 'Rút lại yêu cầu'}
                            </button>
                          )}
                          
                          {/* Admin actions */}
                          {user && user.role === 'admin' && (
                            <div className="admin-actions">
                              <button 
                                className="approve-btn"
                                onClick={() => handleApproveRequest(request._id)}
                              >
                                Duyệt
                              </button>
                              <button 
                                className="decline-btn"
                                onClick={() => handleDeclineRequest(request._id)}
                              >
                                Từ chối
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
                                  <label htmlFor={`contribution-amount-${request._id}`}>Góp số🌾:</label>
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
                                  <span className="balance-display">🌾 hiện tại: {userBalance}</span>
                                </div>
                                
                                <textarea
                                  className="contribution-note-input"
                                  placeholder="Nhắn nhủ thêm... (nếu có)"
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
                                    {submittingContribution ? 'Đang góp...' : 'Xác nhận'}
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
                                    Hủy bỏ
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Show login prompt in the form area if not authenticated */}
                            {showContributionForm === request._id && !isAuthenticated && (
                              <div className="login-to-contribute">
                                Vui lòng <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="login-link">đăng nhập</button> để góp🌾.
                              </div>
                            )}
                            
                            {/* Contributions List - Only shown when contributions exist */}
                            {contributions[request._id] && contributions[request._id].length > 0 && (
                              <div className="contributions-list">
                                <h4 className="contributions-title">
                                  {loadingContributions.has(request._id) 
                                    ? 'Đang tải đóng góp...' 
                                    : `Đóng góp (${contributions[request._id].length})`}
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
                                      <div className="contribution-amount">Góp🌾: {contribution.amount}</div>
                                      
                                      {/* Admin actions for contributions */}
                                      {user && user.role === 'admin' && contribution.status === 'pending' && (
                                        <div className="admin-actions contribution-admin-actions">
                                          <button 
                                            className="approve-btn"
                                            onClick={() => handleApproveContribution(contribution._id, request._id)}
                                          >
                                            Duyệt
                                          </button>
                                          <button 
                                            className="decline-btn"
                                            onClick={() => handleDeclineContribution(contribution._id, request._id)}
                                          >
                                            Từ chối
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
        
        <section className="market-section">
          <div className="market-header">
            <h2>Tạo yêu cầu mới</h2>
          </div>
          
          {isAuthenticated ? (
            <div className="request-form-container">
              <div className="request-type-tabs">
                <button 
                  className={`type-tab ${requestType === 'new' ? 'active' : ''}`} 
                  onClick={() => handleTypeChange('new')}
                >
                  Yêu cầu truyện mới
                </button>
                <button 
                  className={`type-tab ${requestType === 'open' ? 'active' : ''}`} 
                  onClick={() => handleTypeChange('open')}
                >
                  Yêu cầu mở chương/tập có sẵn
                </button>
                
                {/* Request History Button - Visible to all logged-in users */}
                {isAuthenticated && (
                  <button 
                    className={`type-tab history-tab ${showHistory ? 'active' : ''}`} 
                    onClick={toggleHistory}
                  >
                    Lịch sử yêu cầu
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
                              {request.openNow && (
                                <span className="history-open-now-badge">
                                  Mở ngay
                                </span>
                              )}
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
                    Quay lại yêu cầu
                  </button>
                </div>
              ) : (
                <form className="request-form" onSubmit={handleSubmit}>
                  {requestType === 'open' && (
                    <div className="novel-search-container">
                      <div className="novel-search short">
                        <input
                          type="text"
                          placeholder="Tìm kiếm truyện..."
                          value={novelSearchQuery}
                          onChange={(e) => {
                            setNovelSearchQuery(e.target.value);
                            setShowNovelResults(true);
                          }}
                          onFocus={() => setShowNovelResults(true)}
                          disabled={submitting}
                          className="novel-search-input"
                        />
                        {isSearching && <div className="searching-indicator">Đang tìm...</div>}
                        
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
                          <div className="no-results">Không tìm thấy truyện</div>
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
                          {loadingModules && <span className="loading-indicator">Đang tải...</span>}
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
                          {loadingChapters && <span className="loading-indicator">Đang tải...</span>}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {requestType === 'new' ? (
                    <>
                      <input
                        type="text"
                        className="request-title-input"
                        placeholder="Tên truyện bạn muốn yêu cầu..."
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        disabled={submitting}
                        required
                      />
                      <textarea
                        className="request-input"
                        placeholder="Nhắn nhủ thêm... (nếu có)"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        disabled={submitting}
                      />
                    </>
                  ) : (
                    <textarea
                      className="request-input"
                      placeholder="Nhắn nhủ thêm... (nếu có)"
                      value={requestText}
                      onChange={(e) => setRequestText(e.target.value)}
                      disabled={submitting}
                    />
                  )}
                  
                  {/* Request options for "open" type requests */}
                  {requestType === 'open' && selectedNovel && (
                    <div className="request-options">
                      <div className="options-title">Loại yêu cầu:</div>
                      <div className="radio-options">
                        <label className={`option-label ${openNowOption === 'post' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="requestOption"
                            value="post"
                            checked={openNowOption === 'post'}
                            onChange={() => handleOptionChange('post')}
                          />
                          <span className="option-text">Đăng bài gọi vốn</span>
                          <span className="option-description">Gửi yêu cầu đợi duyệt (Có thể rút lại sau 24h)</span>
                        </label>
                        
                        <label 
                          className={`option-label ${openNowOption === 'openNow' ? 'selected' : ''} ${!canOpenNow ? 'disabled' : ''}`}
                        >
                          <input
                            type="radio"
                            name="requestOption"
                            value="openNow"
                            checked={openNowOption === 'openNow'}
                            onChange={() => handleOptionChange('openNow')}
                            disabled={!canOpenNow}
                          />
                          <span className="option-text">Mở ngay</span>
                          <span className="option-description">
                            {canOpenNow 
                              ? `Mở ${selectedModuleData ? 'module' : 'chapter'} ngay lập tức với số cọc của bạn`
                              : 'Chọn một tập/chương đang bị khóa để bật tùy chọn này'}
                          </span>
                        </label>
                      </div>
                      
                      {openNowOption === 'openNow' && selectedModuleData && (
                        <div className="option-info">
                          <p>Số 🌾 còn lại để mở tập: {selectedModuleData.moduleBalance}</p>
                          {Number(depositAmount) > 0 && (
                            <>
                              <p>
                                {Number(depositAmount) >= selectedModuleData.moduleBalance 
                                  ? 'Thao tác này sẽ mở khóa tập và chuyển chế độ thành "Công khai"' 
                                  : `Thao tác này sẽ giảm số cọc còn lại thành ${Math.max(0, selectedModuleData.moduleBalance - Number(depositAmount))}`}
                              </p>
                              {Number(depositAmount) > selectedModuleData.moduleBalance && (
                                <p className="refund-info">
                                  Bạn sẽ được hoàn lại {Number(depositAmount) - selectedModuleData.moduleBalance}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      
                      {openNowOption === 'openNow' && selectedChapterData && (
                        <div className="option-info">
                          <p>Số 🌾 còn lại để mở chương: {selectedChapterData.chapterBalance}</p>
                          {Number(depositAmount) > 0 && (
                            <>
                              <p>
                                {Number(depositAmount) >= selectedChapterData.chapterBalance 
                                  ? 'Thao tác này sẽ mở khóa chương và chuyển chế độ thành "Công khai"' 
                                  : `Thao tác này sẽ giảm số cọc còn lại thành ${Math.max(0, selectedChapterData.chapterBalance - Number(depositAmount))}`}
                              </p>
                              {Number(depositAmount) > selectedChapterData.chapterBalance && (
                                <p className="refund-info">
                                  Bạn sẽ được hoàn lại {Number(depositAmount) - selectedChapterData.chapterBalance}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="deposit-input-container">
                    <label htmlFor="deposit">Cọc:</label>
                    <input
                      type="number"
                      id="deposit"
                      min="100"
                      step="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      disabled={submitting}
                      required
                      className="deposit-input"
                    />
                    <span className="balance-display">🌾 hiện tại: {userBalance}</span>
                    <span className="min-deposit-notice">Số cọc tối thiểu: 100</span>
                  </div>
                  
                  <div className="request-form-actions">
                    <button 
                      type="submit" 
                      className="submit-request-btn"
                      disabled={submitting || 
                               (requestType === 'new' && !requestText.trim()) || 
                               !depositAmount || 
                               Number(depositAmount) < 100 ||
                               (requestType === 'open' && !selectedNovel) ||
                               (depositAmount && Number(depositAmount) > userBalance)}
                    >
                      {submitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                    </button>
                    <button 
                      type="button" 
                      className="discard-btn"
                      onClick={handleClearForm}
                    >
                      Bỏ bản nháp
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="login-to-request">
              Vui lòng <button onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))} className="login-link">đăng nhập</button> để tạo yêu cầu.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Market; 