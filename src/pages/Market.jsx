import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import config from '../config/config';
import cdnConfig from '../config/bunny';
import bunnyUploadService from '../services/bunnyUploadService';
import DOMPurify from 'dompurify';
import '../styles/Market.css';

// Import the components we've created
import {
  MarketHeader,
  MarketRequestsList,
  MarketRequestForm,
  RequestHistory,
  MarketContributionModal
} from '../components/market';

/**
 * MarketSEO Component
 * 
 * Provides SEO optimization for the Market page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const MarketSEO = () => {
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>Bảng Yêu Cầu - Đề Xuất Light Novel Mới | Valvrareteam</title>
      <meta name="description" content="Đề xuất Light Novel mới và góp lúa để ủng hộ dịch thuật tại Valvrareteam. Cộng đồng độc giả cùng nhau quyết định những bộ truyện sẽ được dịch tiếp theo." />
      <meta name="keywords" content="bảng yêu cầu, đề xuất truyện, light novel mới, góp lúa, ủng hộ dịch thuật, valvrareteam, cộng đồng độc giả" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content="Bảng Yêu Cầu - Đề Xuất Light Novel Mới | Valvrareteam" />
      <meta property="og:description" content="Đề xuất Light Novel mới và góp lúa để ủng hộ dịch thuật tại Valvrareteam. Cộng đồng độc giả cùng nhau quyết định những bộ truyện sẽ được dịch tiếp theo." />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content="https://valvrareteam.net/bang-yeu-cau" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Bảng Yêu Cầu - Đề Xuất Light Novel Mới | Valvrareteam" />
      <meta name="twitter:description" content="Đề xuất Light Novel mới và góp lúa để ủng hộ dịch thuật tại Valvrareteam." />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      
      {/* Canonical URL */}
      <link rel="canonical" href="https://valvrareteam.net/bang-yeu-cau" />
    </Helmet>
  );
};

/**
 * Market Page Component
 * 
 * Page for users to make requests for new novels or chapter openings
 * with deposit functionality
 * 
 * OPTIMIZATIONS IMPLEMENTED TO PREVENT DUPLICATE CONTRIBUTION QUERIES:
 * 1. Use fetchOperationsRef to track ongoing fetch operations
 * 2. Batch parallel requests using Promise.all instead of sequential fetches
 * 3. Debounce fetchAllContributions calls with 100ms delay
 * 4. Use useCallback for fetch functions to prevent unnecessary re-renders
 * 5. Filter out already loaded/loading requests before making API calls
 * 6. Use requests.length instead of requests array as useEffect dependency
 * 7. Add comprehensive logging for debugging duplicate calls
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
  const [requestType, setRequestType] = useState('new'); // 'new' or 'web'
  const [requestText, setRequestText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requestContactInfo, setRequestContactInfo] = useState('');
  const [requestImage, setRequestImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [goalAmount, setGoalAmount] = useState('1000'); // Default goal amount for web requests
  const [requests, setRequests] = useState([]);
  const [sortOrder, setSortOrder] = useState('likes');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [likingRequests, setLikingRequests] = useState(new Set());
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
  const [contributionModalOpen, setContributionModalOpen] = useState(false);
  const [currentRequestForContribution, setCurrentRequestForContribution] = useState(null);

  // Ref to track fetch operations and prevent duplicate calls
  const fetchOperationsRef = useRef(new Set());

  // Optimized function to fetch contributions for all loaded requests
  const fetchAllContributions = useCallback(async () => {
    try {
      // Create a Set of request IDs to avoid duplicate requests
      const requestIds = new Set(requests.map(req => req._id));
      
      // Filter out request IDs that are already loaded, currently loading, or being tracked in operations
      const requestsToFetch = Array.from(requestIds).filter(
        requestId => !contributions[requestId] && 
                    !loadingContributions.has(requestId) && 
                    !fetchOperationsRef.current.has(requestId)
      );
      
      if (requestsToFetch.length === 0) {
        return; // Nothing to fetch
      }
      
      // Track operations to prevent duplicate calls
      requestsToFetch.forEach(requestId => fetchOperationsRef.current.add(requestId));
      
      // Mark all requests as loading
      setLoadingContributions(prev => new Set([...prev, ...requestsToFetch]));
      
      try {
        // Fetch contributions for multiple requests in parallel
        const contributionPromises = requestsToFetch.map(async (requestId) => {
          try {
            const response = await axios.get(
              `${config.backendUrl}/api/contributions/request/${requestId}`
            );
            
            return {
              requestId,
              contributions: response.data.length > 0 ? response.data : null
            };
          } catch (err) {
            console.error(`Failed to fetch contributions for request ${requestId}:`, err);
            return { requestId, contributions: null };
          }
        });
        
        const results = await Promise.all(contributionPromises);
        
        // Update contributions state with all results at once
        setContributions(prev => {
          const newContributions = { ...prev };
          results.forEach(({ requestId, contributions: requestContributions }) => {
            if (requestContributions) {
              newContributions[requestId] = requestContributions;
            }
          });
          return newContributions;
        });
      } finally {
        // Clean up: remove from tracking and loading states
        requestsToFetch.forEach(requestId => {
          fetchOperationsRef.current.delete(requestId);
        });
        
        setLoadingContributions(prev => {
          const next = new Set(prev);
          requestsToFetch.forEach(requestId => next.delete(requestId));
          return next;
        });
      }
      
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
    }
  }, [requests, contributions, loadingContributions]);

  // Fetch user balance and requests on component mount
  useEffect(() => {
    // Add debouncing to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, user?.id, sortOrder]); // Use user.id instead of full user object to prevent unnecessary refetches

  // Cleanup fetch operations on unmount
  useEffect(() => {
    return () => {
      // Clear any pending fetch operations when component unmounts
      fetchOperationsRef.current.clear();
    };
  }, []);

  // Add new effect to load contributions for all requests when requests change
  useEffect(() => {
    if (requests.length > 0) {
      // Use a small delay to debounce rapid calls
      const timeoutId = setTimeout(() => {
        fetchAllContributions();
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [requests.length]); // Only depend on length to avoid re-fetching when requests order changes

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
      // Use balance directly from user object
      const userBalance = user.balance || 0;
      setUserBalance(userBalance);
      
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

    if (requestType === 'new' && !requestNote.trim()) {
      alert('Vui lòng nói rõ bạn muốn team dịch từ vol mấy và những mong muốn/ghi chú thêm nếu có');
      return;
    }

    if (requestType === 'new' && !requestContactInfo.trim()) {
      alert('Vui lòng cung cấp thông tin liên lạc của bạn');
      return;
    }

    if (requestType === 'web') {
      // For web requests, just validate the title
      if (!requestText.trim()) {
        alert('Vui lòng nhập tên truyện cho đề xuất');
        return;
      }
      
      if (!goalAmount || isNaN(goalAmount) || Number(goalAmount) <= 0) {
        alert('Vui lòng điền số 🌾 mục tiêu hợp lệ');
        return;
      }
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
    }
    
    // Different confirmation message based on request type
    let confirmMessage = '';
    if (requestType === 'web') {
      confirmMessage = 'Bạn có chắc muốn tạo đề xuất từ nhóm dịch cho truyện này?';
    } else {
      confirmMessage = 'QUAN TRỌNG: Bạn chỉ có thể rút yêu cầu sau 24 giờ đã gửi. Bạn có muốn tiếp tục không?';
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Normal request creation for new and web types
      const requestData = {
        type: requestType,
        title: DOMPurify.sanitize(requestText.trim() || "Yêu cầu truyện mới chưa có tên"),
        deposit: requestType === 'web' ? 0 : Number(depositAmount),
        // Web requests are now pending like new requests
        status: 'pending'
      };
      
      // Add goal balance for web requests
      if (requestType === 'web') {
        requestData.goalBalance = Number(goalAmount);
      }
      
      // Add note if provided
      if (requestNote.trim()) {
        requestData.note = DOMPurify.sanitize(requestNote);
      }
      
      // Add contactInfo if provided (only for 'new' requests)
      if (requestType === 'new' && requestContactInfo.trim()) {
        requestData.contactInfo = DOMPurify.sanitize(requestContactInfo);
      }
      
      // Add image if provided
      if (requestImage) {
        requestData.image = requestImage;
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
        // Notify other components about balance change
        window.dispatchEvent(new CustomEvent('balanceUpdated'));
      }
      
      // Notify other components about request update
      window.dispatchEvent(new CustomEvent('requestUpdated'));
      
      // Add request to withdrawableRequests after 24 hours (for user requests only)
      if (requestType === 'new') {
        setTimeout(() => {
          setWithdrawableRequests(prev => new Set([...prev, newRequest._id]));
        }, 86400000); // 24 hours in milliseconds
      }
      
      // Reset form in all cases
      setRequestText('');
      setRequestNote('');
      setRequestContactInfo('');
      setRequestImage('');
      setDepositAmount('');
      setGoalAmount('1000');
      
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
    setRequestContactInfo('');
    setRequestImage('');
    setDepositAmount('');
    setGoalAmount('1000');
  };

  // Handle request sorting
  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng tải lên tệp ảnh');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh phải nhỏ hơn 5MB');
      return;
    }

    try {
      setImageUploading(true);
      
      // Upload using bunny CDN service
      const imageUrl = await bunnyUploadService.uploadFile(
        file, 
        'request'
      );

      setRequestImage(imageUrl);
    } catch (err) {
      console.error('Không thể tải lên ảnh:', err);
      alert('Không thể tải lên ảnh');
    } finally {
      setImageUploading(false);
    }
  };

  // Handle clearing form
  const handleClearForm = () => {
    setRequestText('');
    setRequestNote('');
    setRequestContactInfo('');
    setRequestImage('');
    setDepositAmount('');
    setGoalAmount('1000');
    setSelectedModule(null);
    setSelectedChapter(null);
    setSelectedModuleData(null);
    setSelectedChapterData(null);
    setNovelSearchQuery('');
  };

  // Fetch request history with optimized contribution loading
  const fetchRequestHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      let response;
      
      if (isAuthenticated) {
        // For authenticated users, try to get all requests (admin/mod gets all, regular users get their own)
        try {
          response = await axios.get(
            `${config.backendUrl}/api/requests/all`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        } catch (error) {
          // If user doesn't have permission for /all endpoint, fall back to public requests with includeAll
          if (error.response?.status === 403) {
            response = await axios.get(`${config.backendUrl}/api/requests?includeAll=true`);
          } else {
            throw error;
          }
        }
      } else {
        // For non-authenticated users, show all public requests (including approved/declined)
        response = await axios.get(`${config.backendUrl}/api/requests?includeAll=true`);
      }
      
      setRequestHistory(response.data);
      setShowHistory(true);
      
      // Optimize contribution fetching for history requests with duplicate prevention
      const historyRequestIds = response.data.map(req => req._id);
      const requestsToFetch = historyRequestIds.filter(
        requestId => !contributions[requestId] && 
                    !loadingContributions.has(requestId) &&
                    !fetchOperationsRef.current.has(requestId)
      );
      
      if (requestsToFetch.length > 0) {
        // Track all operations
        requestsToFetch.forEach(requestId => fetchOperationsRef.current.add(requestId));
        
        // Mark all as loading
        setLoadingContributions(prev => new Set([...prev, ...requestsToFetch]));
        
        try {
          // Fetch all in parallel
          const contributionPromises = requestsToFetch.map(async (requestId) => {
            try {
              const contributionsResponse = await axios.get(
                `${config.backendUrl}/api/contributions/request/${requestId}`
              );
              
              return {
                requestId,
                contributions: contributionsResponse.data.length > 0 ? contributionsResponse.data : null
              };
            } catch (err) {
              console.error(`Không thể tải đóng góp cho yêu cầu ${requestId}:`, err);
              return { requestId, contributions: null };
            }
          });
          
          const results = await Promise.all(contributionPromises);
          
          // Update contributions state with all results at once
          setContributions(prev => {
            const newContributions = { ...prev };
            results.forEach(({ requestId, contributions: requestContributions }) => {
              if (requestContributions) {
                newContributions[requestId] = requestContributions;
              }
            });
            return newContributions;
          });
        } finally {
          // Clean up tracking
          requestsToFetch.forEach(requestId => {
            fetchOperationsRef.current.delete(requestId);
          });
          
          // Remove all from loading state
          setLoadingContributions(prev => {
            const next = new Set(prev);
            requestsToFetch.forEach(requestId => next.delete(requestId));
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Không thể tải lịch sử yêu cầu:', err);
      alert('Không thể tải lịch sử yêu cầu');
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated, contributions, loadingContributions]);
  
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
    
            // Only allow approving 'new' and 'web' type requests
    if (requestToApprove.type !== 'new' && requestToApprove.type !== 'web') {
      alert('This type of request is automatically processed and cannot be manually approved.');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn phê duyệt yêu cầu này? Điều này sẽ phê duyệt tất cả các đóng góp đang chờ.')) {
      return;
    }

    try {
      // For both 'new' and 'web' requests, we need to check if a novel exists with the same title
      // First check if there's a novel with a matching title
      const novelCheckResponse = await axios.get(
        `${config.backendUrl}/api/novels/search?title=${encodeURIComponent(requestToApprove.title)}&exact=true`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // If no matching novel found
      if (!novelCheckResponse.data || novelCheckResponse.data.length === 0) {
        alert('Không thể phê duyệt: Bạn cần tạo truyện với tên chính xác khớp với yêu cầu trước.');
        return;
      }
      
      // Now approve the request
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
      
      // Notify other components about request update
      window.dispatchEvent(new CustomEvent('requestUpdated'));
      
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

    // Find the request to check its type
    const requestToDecline = requests.find(req => req._id === requestId);
    
    if (!requestToDecline) {
      return;
    }

    const confirmMessage = requestToDecline.type === 'web' 
      ? 'Bạn có chắc chắn muốn từ chối đề xuất này? Điều này sẽ từ chối tất cả các đóng góp đang chờ và trả lại 🌾 cho người dùng.'
      : 'Bạn có chắc chắn muốn từ chối yêu cầu này? Điều này sẽ từ chối tất cả các đóng góp đang chờ và trả lại 🌾 cho người dùng.';

    if (!confirm(confirmMessage)) {
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
          
          // Update local contributions state to reflect declined status
          if (contributions[requestId]) {
            setContributions(prev => ({
              ...prev,
              [requestId]: prev[requestId].map(contribution => 
                contribution.status === 'pending' 
                  ? { ...contribution, status: 'declined' } 
                  : contribution
              )
            }));
          }
        } catch (contributionErr) {
          console.error('Không thể từ chối đóng góp:', contributionErr);
          // Don't throw here, as the request was already declined
        }
      }
      
      // Remove the request from the list
      setRequests(prevRequests => prevRequests.filter(request => request._id !== requestId));
      
      // Notify other components about request update
      window.dispatchEvent(new CustomEvent('requestUpdated'));
      
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
    
    // Check if this request has any contributions before showing the confirmation
    const hasContributions = contributions[requestId] && contributions[requestId].some(contrib => contrib.status === 'pending');
    
    let confirmMessage = 'Bạn có chắc chắn muốn rút lại yêu cầu này? Số 🌾 cọc sẽ được trả lại.';
    if (hasContributions) {
      confirmMessage = 'Bạn có chắc chắn muốn rút lại yêu cầu này? Số 🌾 cọc và tất cả các đóng góp đang chờ xử lý sẽ được trả lại.';
    }
    
    if (!confirm(confirmMessage)) {
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
      
      // If successful, remove the request from the active list (it becomes withdrawn)
      if (response.status === 200) {
        setRequests(prevRequests => prevRequests.filter(request => request._id !== requestId));
        
        // Update user balance with refund amount from server response
        const refundAmount = response.data.refundAmount;
        const contributionsRefunded = response.data.contributionsRefunded || 0;
        setUserBalance(prev => prev + refundAmount);
        
        // Notify other components about request update
        window.dispatchEvent(new CustomEvent('requestUpdated'));
        
        // Show different message based on whether there were contributions
        if (contributionsRefunded > 0) {
          alert(`Yêu cầu đã được rút lại thành công. Số 🌾 cọc và ${contributionsRefunded} đóng góp đang chờ xử lý đã được trả lại.`);
        } else {
          alert('Yêu cầu đã được rút lại thành công. Số 🌾 cọc đã được trả lại.');
        }
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

  // Handle request update from edit
  const handleRequestUpdate = (updatedRequest) => {
    setRequests(prevRequests => 
      prevRequests.map(req => 
        req._id === updatedRequest._id ? updatedRequest : req
      )
    );
  };

  // Optimized single contribution fetch function with duplicate prevention
  const fetchContributions = useCallback(async (requestId) => {
    // Multiple checks to prevent duplicate fetches
    if (loadingContributions.has(requestId) || 
        contributions[requestId] || 
        fetchOperationsRef.current.has(requestId)) {
      return;
    }

    // Track this operation
    fetchOperationsRef.current.add(requestId);
    setLoadingContributions(prev => new Set([...prev, requestId]));
    
    try {
      const response = await axios.get(
        `${config.backendUrl}/api/contributions/request/${requestId}`
      );
      
      if (response.data.length > 0) {
        setContributions(prev => ({
          ...prev,
          [requestId]: response.data
        }));
      }
    } catch (err) {
      console.error(`Không thể tải đóng góp cho request ${requestId}:`, err);
    } finally {
      // Clean up tracking
      fetchOperationsRef.current.delete(requestId);
      setLoadingContributions(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [loadingContributions, contributions]);

  // Handle showing contribution form
  const handleShowContributionForm = (requestId) => {
    // Find the request to get title information for the modal
    const request = requests.find(r => r._id === requestId);
    if (!request) return;
    
    setCurrentRequestForContribution(request);
    setContributionAmount('');
    setContributionNote('');
    setContributionModalOpen(true);
    
    // Fetch contributions if not loaded yet and not currently loading
    if (!contributions[requestId] && !loadingContributions.has(requestId)) {
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
    if (!currentRequestForContribution) {
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
      const newBalance = userBalance - Number(contributionAmount);
      setUserBalance(newBalance);

      
      // Dispatch balance updated event
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: { 
          newBalance: newBalance,
          contribution: { amount: Number(contributionAmount), type: 'market' }
        }
      }));
      
      // Reset form and close modal
      handleCloseContributionModal();
      
    } catch (err) {
      console.error('❌ [Market] Failed to submit contribution:', err);
      alert(err.response?.data?.message || 'Failed to submit contribution');
    } finally {
      setSubmittingContribution(false);
    }
  };

  return (
    <div className="market-container">
      <MarketSEO />
      <div className="market-header">
        <h1>Bảng yêu cầu</h1>
      </div>
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
            onRequestUpdate={handleRequestUpdate}
          />
          
          {/* Request History */}
          {showHistory && (
            <RequestHistory
              requestHistory={requestHistory}
              historyLoading={historyLoading}
              contributions={contributions}
              loadingContributions={loadingContributions}
              setShowHistory={setShowHistory}
              user={user}
            />
          )}
        </section>
        
        <section className="market-section">
          <div className="market-header">
            <h2>Tạo yêu cầu mới</h2>
            {/* History Button - Available to all users */}
            <button 
              className={`type-tab history-tab ${showHistory ? 'active' : ''}`} 
              onClick={toggleHistory}
            >
              Lịch sử yêu cầu
            </button>
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
              requestContactInfo={requestContactInfo}
              setRequestContactInfo={setRequestContactInfo}
              requestImage={requestImage}
              handleImageUpload={handleImageUpload}
              imageUploading={imageUploading}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              goalAmount={goalAmount}
              setGoalAmount={setGoalAmount}
              userBalance={userBalance}
              submitting={submitting}
              handleSubmit={handleSubmit}
              handleClearForm={handleClearForm}
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
      
      {/* Market Contribution Modal */}
      <MarketContributionModal
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