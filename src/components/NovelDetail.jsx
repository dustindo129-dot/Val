/**
 * NovelDetail Component
 * 
 * Displays detailed information about a novel including:
 * - Cover image and basic information
 * - Novel description and metadata
 * - Chapter list with pagination
 * - Reading progress tracking
 * - Bookmark functionality
 * - Author information
 * - Status indicators
 * 
 * Features:
 * - Tabbed interface for chapters and comments
 * - Admin controls for chapter management
 * - Bookmark system integration
 * - Login prompt for authenticated actions
 * - Responsive layout
 * - Navigation breadcrumbs
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import '../styles/components/NovelDetail.css';
import '../styles/components/RedesignedNovelDetail.css';
import { CommentIcon, LockIcon } from './novel-detail/NovelIcons';
import LoadingSpinner from './LoadingSpinner';
import CommentSection from './CommentSection';
import RatingModal from './RatingModal';
import ModuleChapters from './novel-detail/ModuleChapters';
import ModuleForm from './novel-detail/ModuleForm';
import NovelInfo from './novel-detail/NovelInfo';
import ScrollToTop from './ScrollToTop';
import OpenRequestModal from './novel-detail/OpenRequestModal';
import api from '../services/api';
import sseService from '../services/sseService';
import ModuleList from './novel-detail/ModuleList';
import axios from 'axios';
import config from '../config/config';
import DOMPurify from 'dompurify';

// Lazy load components that exist as separate files
const Login = lazy(() => import('./auth/Login'));

// Utility for HTML truncation, used in description
const truncateHTML = (html, maxLength) => {
  if (!html) return '';
  
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  
  if (text.length <= maxLength) {
    return html;  // Return original HTML if text is shorter than maxLength
  }

  let truncated = '';
  let currentLength = 0;
  const words = html.split(/(<[^>]*>|\s+)/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordLength = word.replace(/<[^>]*>/g, '').length;

    if (currentLength + wordLength > maxLength) {
      break;
    }

    truncated += word;
    if (!word.match(/<[^>]*>/)) {
      currentLength += wordLength;
    }
  }

  return truncated + '...';  // Return truncated HTML with ellipsis
};

/**
 * NovelContributions Component
 * 
 * Displays approved contributions and requests for a novel in the sidebar
 */
const NovelContributions = ({ novelId }) => {
  const { data: contributionsData, isLoading: isLoadingContributions } = useQuery({
    queryKey: ['novel-contributions', novelId],
    queryFn: async () => {
      try {
        // This fetches both approved contributions and approved requests
        const response = await api.fetchNovelContributions(novelId);
        return response;
      } catch (error) {
        console.error("Error fetching contributions:", error);
        return { contributions: [], requests: [] };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Format date to readable format in Vietnamese format (DD/MM/YYYY)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Combine and sort contributions and requests by date
  const allItems = useMemo(() => {
    const contributions = contributionsData?.contributions || [];
    const requests = contributionsData?.requests || [];
    
    const combined = [
      ...contributions.map(item => ({ ...item, type: 'contribution' })),
      ...requests.map(item => ({ 
        ...item, 
        isRequest: true
      }))
    ];
    
    // Sort by updatedAt date descending (newest first)
    return combined.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [contributionsData]);

  // Calculate total number of items
  const totalCount = allItems.length;

  // Generate contribution message based on item type
  const getContributionMessage = (item) => {
    if (item.type === 'open' || item.request?.type === 'open') {
      const isFullyOpened = item.opened;
      return (
        <>
          Cảm ơn <span className="rd-contributor-name">
            {item.user?.username || "Người dùng ẩn danh"}
          </span> đã đóng góp <span className="rd-contribution-amount">
            {item.deposit} 🌾
          </span> {isFullyOpened ? (
            <>để mở <span className="rd-module-title">
              {item.chapter ? item.chapter.title : item.module.title}
            </span></>
          ) : (
            <>để mở <span className="rd-module-title">
              {item.chapter ? item.chapter.title : item.module.title}
            </span></>
          )}
        </>
      );
    } else if (item.type === 'new' || item.request?.type === 'new') {
      return (
        <>
          Cảm ơn <span className="rd-contributor-name">
            {item.user?.username || "Người dùng ẩn danh"}
          </span> đã đóng góp <span className="rd-contribution-amount">
            {item.amount} 🌾
          </span> để yêu cầu truyện mới
        </>
      );
    } else if (item.type === 'web' || item.request?.type === 'web') {
      return (
        <>
          Cảm ơn <span className="rd-contributor-name">
            {item.user?.username || "Người dùng ẩn danh"}
          </span> đã đóng góp <span className="rd-contribution-amount">
            {item.amount} 🌾
          </span> cho đề xuất từ nhóm dịch
        </>
      );
    } else {
      // Replace the generic fallback with one that only handles contributions
      return (
        <>
          Cảm ơn <span className="rd-contributor-name">
            {item.user?.username || "Người dùng ẩn danh"}
          </span> đã đóng góp <span className="rd-contribution-amount">
            {item.type === 'contribution' ? item.amount : item.deposit} 🌾
          </span>
        </>
      );
    }
  };

  return (
    <div className="rd-contribution-section">
      <div className="rd-contribution-section-title">
        ĐÓNG GÓP ({totalCount})
      </div>
      <div className="rd-contribution-list">
        {isLoadingContributions ? (
          <div className="rd-loading-spinner-small">Đang tải...</div>
        ) : allItems.length > 0 ? (
          allItems.map((item, index) => (
            <div key={`${item.type}-${item._id}`} className="rd-contribution-item">
              <div className="rd-contribution-content">
                {getContributionMessage(item)}
              </div>
              {(item.note || item.text) && (
                <div className="rd-contribution-message">
                  "{item.note || item.text}"
                </div>
              )}
              <div className="rd-contribution-date">
                {formatDate(item.updatedAt)}
              </div>
            </div>
          ))
        ) : (
          <div className="rd-no-contributions">Chưa có đóng góp</div>
        )}
      </div>
    </div>
  );
};

/**
 * NovelSEO Component
 * 
 * Provides comprehensive SEO optimization for individual novel pages including:
 * - Vietnamese keyword optimization
 * - Alternative titles support
 * - Book structured data (JSON-LD)
 * - Open Graph meta tags
 * - Twitter Cards
 */
const NovelSEO = ({ novel }) => {
  // Generate SEO-optimized title with Vietnamese keywords
  const generateSEOTitle = () => {
    const baseTitle = novel?.title || 'Light Novel';
    const altTitles = novel?.alternativeTitles || [];
    
    // Always include "vietsub" for Vietnamese audience
    let seoTitle = `${baseTitle} Vietsub - Đọc Light Novel Miễn Phí | Valvrareteam`;
    
    return seoTitle;
  };

  // Generate SEO description with Vietnamese keywords and alternative titles
  const generateSEODescription = () => {
    const novelTitle = novel?.title || 'Light Novel';
    let description = `Đọc ${novelTitle} vietsub miễn phí tại Valvrareteam. `;
    
    // Add alternative titles if available
    if (novel?.alternativeTitles && novel.alternativeTitles.length > 0) {
      description += `Còn được biết đến với tên: ${novel.alternativeTitles.join(', ')}. `;
    }
    
    // Add description excerpt
    if (novel?.description) {
      const cleanDesc = DOMPurify.sanitize(novel.description, { ALLOWED_TAGS: [] });
      const excerpt = cleanDesc.substring(0, 100).trim();
      description += `${excerpt}... `;
    }
    
    // Add status and genres
    if (novel?.status) {
      description += `Trạng thái: ${novel.status}. `;
    }
    
    if (novel?.genres && novel.genres.length > 0) {
      description += `Thể loại: ${novel.genres.slice(0, 3).join(', ')}. `;
    }
    
    description += `Light Novel tiếng Việt chất lượng cao, cập nhật mới nhất.`;
    
    return description.substring(0, 160); // SEO optimal length
  };

  // Generate keywords including Vietnamese terms and alternative titles
  const generateKeywords = () => {
    const novelTitle = novel?.title || 'Light Novel';
    const keywords = [
      novelTitle,
      `${novelTitle} vietsub`,
      `${novelTitle} tiếng việt`,
      `đọc ${novelTitle}`,
      `${novelTitle} online`,
      'Light Novel vietsub',
      'Light Novel tiếng Việt',
      'Đọc Light Novel miễn phí',
      'Truyện Light Novel',
      'LN vietsub',
      'Valvrareteam'
    ];
    
    // Add alternative titles
    if (novel?.alternativeTitles) {
      novel.alternativeTitles.forEach(altTitle => {
        keywords.push(altTitle, `${altTitle} vietsub`, `đọc ${altTitle}`);
      });
    }
    
    // Add genres
    if (novel?.genres) {
      keywords.push(...novel.genres);
    }
    
    return keywords.join(', ');
  };

  // Generate structured data for search engines
  const generateStructuredData = () => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Book",
      "name": novel.title,
      "author": {
        "@type": "Person",
        "name": novel.author || "Unknown"
      },
      "description": generateSEODescription(),
      "inLanguage": "vi-VN",
      "genre": novel.genres || [],
      "publisher": {
        "@type": "Organization",
        "name": "Valvrareteam",
        "url": "https://valvrareteam.net"
      },
      "url": `https://valvrareteam.net/novel/${novel._id}`,
      "image": novel.illustration,
      "datePublished": novel.createdAt,
      "dateModified": novel.updatedAt
    };

    // Add alternative names if available
    if (novel.alternativeTitles && novel.alternativeTitles.length > 0) {
      structuredData.alternateName = novel.alternativeTitles;
    }

    // Add aggregateRating if available
    if (novel.averageRating) {
      structuredData.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": novel.averageRating,
        "bestRating": 5,
        "worstRating": 1,
        "ratingCount": novel.ratingCount || 1
      };
    }

    return structuredData;
  };

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{generateSEOTitle()}</title>
      <meta name="description" content={generateSEODescription()} />
      <meta name="keywords" content={generateKeywords()} />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content={generateSEOTitle()} />
      <meta property="og:description" content={generateSEODescription()} />
      <meta property="og:image" content={novel.illustration} />
      <meta property="og:url" content={`https://valvrareteam.net/novel/${novel._id}`} />
      <meta property="og:type" content="book" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={generateSEOTitle()} />
      <meta name="twitter:description" content={generateSEODescription()} />
      <meta name="twitter:image" content={novel.illustration} />
      
      {/* Book-specific meta tags */}
      <meta property="book:author" content={novel.author || "Unknown"} />
      <meta property="book:genre" content={novel.genres?.join(', ') || ''} />
      <meta property="book:release_date" content={novel.createdAt} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={`https://valvrareteam.net/novel/${novel._id}`} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>
    </Helmet>
  );
};

/**
 * NovelDetail Component
 * 
 * Main component that displays comprehensive information about a novel
 * and manages user interactions with the novel content.
 */
const NovelDetail = () => {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleForm, setModuleForm] = useState({ 
    title: '', 
    illustration: '', 
    loading: false, 
    error: '',
    mode: 'published',
    moduleBalance: 0
  });
  const [editingModule, setEditingModule] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  
  // New state for open request modal
  const [openRequestModalOpen, setOpenRequestModalOpen] = useState(false);
  const [openRequestTarget, setOpenRequestTarget] = useState(null);
  const [submittingOpenRequest, setSubmittingOpenRequest] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // Fetch user balance when authenticated
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (isAuthenticated && user?.username) {
        try {
          const userResponse = await axios.get(
            `${config.backendUrl}/api/users/${user.username}/profile`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setUserBalance(userResponse.data.balance || 0);
        } catch (error) {
          console.error('Failed to fetch user balance:', error);
        }
      }
    };
    
    fetchUserBalance();
  }, [isAuthenticated, user]);

  // Handler for deleting modules
  const handleDeleteModule = useCallback(async (moduleId) => {
    if (!user || (user.role !== 'admin')) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa module này?')) {
      try {
        await api.deleteModule(novelId, moduleId);
        // Refresh the data
        queryClient.invalidateQueries(['novel', novelId]);
      } catch (error) {
        console.error('Không thể xóa module:', error);
        alert('Không thể xóa module. Vui lòng thử lại.');
      }
    }
  }, [user, novelId, queryClient]);

  // Handler for module reordering
  const handleModuleReorder = useCallback(async (moduleId, direction) => {
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return;
    
    try {
      // Get current data for optimistic update
      const currentData = queryClient.getQueryData(['novel', novelId]);
      const previousData = currentData ? JSON.parse(JSON.stringify(currentData)) : null;
      
      // Create a deep copy of the modules with their chapters
      const moduleWithChaptersMap = {};
      if (currentData?.modules) {
        currentData.modules.forEach(module => {
          // Store the full module including its chapters
          moduleWithChaptersMap[module._id] = JSON.parse(JSON.stringify(module));
        });
      }
      
      if (currentData?.modules) {
        // Find the module and its index
        const moduleIndex = currentData.modules.findIndex(m => m._id === moduleId);
        if (moduleIndex !== -1) {
          const targetIndex = direction === 'up' ? moduleIndex - 1 : moduleIndex + 1;
          
          // Validate move is possible
          if (targetIndex < 0 || targetIndex >= currentData.modules.length) {
            throw new Error('Không thể di chuyển module hơn nữa về hướng đó');
          }

          // Cancel any pending queries for this novel
          await queryClient.cancelQueries({ queryKey: ['novel', novelId] });
          
          // Get the modules that will be swapped
          const sourceModuleId = currentData.modules[moduleIndex]._id;
          const targetModuleId = currentData.modules[targetIndex]._id;
          
          // Get the full modules with their chapters
          const sourceModule = moduleWithChaptersMap[sourceModuleId];
          const targetModule = moduleWithChaptersMap[targetModuleId];
          
          // Create a new array with all modules
          const newModules = [...currentData.modules];
          
          // Swap the order values while preserving all other properties
          const tempOrder = sourceModule.order;
          sourceModule.order = targetModule.order;
          targetModule.order = tempOrder;
          
          // Update the modules in the array
          newModules[moduleIndex] = targetModule;
          newModules[targetIndex] = sourceModule;
          
          // Sort the modules by order
          newModules.sort((a, b) => a.order - b.order);
          
          // Ensure each module has its original chapters
          const updatedModules = newModules.map(module => {
            const originalModule = moduleWithChaptersMap[module._id];
            return {
              ...module,
              chapters: originalModule.chapters || []
            };
          });
          
          // Update cache immediately with the updated modules
          queryClient.setQueryData(['novel', novelId], {
            ...currentData,
            modules: updatedModules
          });

          try {
            // Make API call
            const response = await api.reorderModule({ 
              novelId,
              moduleId, 
              direction 
            });
            
            if (response?.modules) {
              // Map to store the server returned module structure (order, etc.)
              const serverModulesMap = {};
              response.modules.forEach(module => {
                serverModulesMap[module._id] = module;
              });
              
              // Create updated modules array that preserves chapters but uses server order
              const finalModules = updatedModules.map(module => {
                const serverModule = serverModulesMap[module._id];
                return {
                  ...module,
                  // Take server values for these properties
                  order: serverModule?.order ?? module.order,
                  updatedAt: serverModule?.updatedAt ?? module.updatedAt,
                  // Keep the chapter data we already have
                  chapters: module.chapters || []
                };
              });
              
              // Sort by the server-provided order
              finalModules.sort((a, b) => a.order - b.order);
              
              // Update the cache with the final, sorted modules
              queryClient.setQueryData(['novel', novelId], {
                ...currentData,
                modules: finalModules,
                updatedAt: new Date().toISOString()
              });
            } else {
              // If response has no modules, use the already updated modules
              // but still force a background refresh for consistency
              queryClient.invalidateQueries({ 
                queryKey: ['novel', novelId],
                refetchType: 'inactive'  // Background refresh only
              });
            }
          } catch (error) {
            // On error, revert to previous state
            if (previousData) {
              queryClient.setQueryData(['novel', novelId], previousData);
            }
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Failed to reorder module:', error);
      // Force a refetch to ensure we're in sync with server
      await queryClient.invalidateQueries({ queryKey: ['novel', novelId] });
      await queryClient.refetchQueries({ queryKey: ['novel', novelId], type: 'active' });
    }
  }, [user, novelId, queryClient, api]);

  // Handler for toggling the module form
  const handleModuleFormToggle = useCallback(() => {
    setShowModuleForm((prev) => {
      if (prev) {
        // Reset form when closing
        setModuleForm({
          title: '',
          illustration: '',
          loading: false,
          error: '',
          mode: 'published',
          moduleBalance: 0
        });
        setEditingModule(null);
      }
      return !prev;
    });
  }, []);

  // Handler for module submission (create/update)
  const handleModuleSubmit = useCallback(async (e, formData) => {
    e.preventDefault();
    
    // Use the formData passed from ModuleForm if available, otherwise use moduleForm state
    const dataToSubmit = formData || moduleForm;
    
    if (!dataToSubmit.title.trim()) {
      setModuleForm(prev => ({ ...prev, error: 'Module title is required' }));
      return;
    }
  
    setModuleForm(prev => ({ ...prev, loading: true, error: '' }));
  
    try {
      // Get current novel data for optimistic updates
      const currentNovelData = queryClient.getQueryData(['novel', novelId]);
      
      // Store current data for possible rollback
      let previousData = null;
      if (currentNovelData) {
        previousData = JSON.parse(JSON.stringify(currentNovelData));
      }
      
      let response;
      if (editingModule) {
        // Optimistically update the cache before API call
        if (currentNovelData?.modules) {
          const updatedModules = currentNovelData.modules.map(module => 
            module._id === editingModule 
              ? { 
                  ...module, 
                  title: dataToSubmit.title,
                  illustration: dataToSubmit.illustration,
                  mode: dataToSubmit.mode,
                  moduleBalance: dataToSubmit.mode === 'paid' ? parseInt(dataToSubmit.moduleBalance) || 0 : 0,
                  updatedAt: new Date().toISOString()
                }
              : module
          );
          
          queryClient.setQueryData(['novel', novelId], {
            ...currentNovelData,
            modules: updatedModules,
            updatedAt: new Date().toISOString()
          });
        }
        
        // Make the API call
        response = await api.updateModule(novelId, editingModule, {
          title: dataToSubmit.title,
          illustration: dataToSubmit.illustration,
          mode: dataToSubmit.mode,
          moduleBalance: dataToSubmit.mode === 'paid' ? parseInt(dataToSubmit.moduleBalance) || 0 : 0
        });
      } else {
        // Create new module
        response = await api.createModule(novelId, {
          title: dataToSubmit.title,
          illustration: dataToSubmit.illustration,
          mode: dataToSubmit.mode,
          moduleBalance: dataToSubmit.mode === 'paid' ? parseInt(dataToSubmit.moduleBalance) || 0 : 0
        });
        
        // If we have current data and a successful response, optimistically add the new module
        if (currentNovelData?.modules && response) {
          const updatedModules = [...currentNovelData.modules, response];
          queryClient.setQueryData(['novel', novelId], {
            ...currentNovelData,
            modules: updatedModules,
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      // Force a refetch to ensure consistency with server
      await queryClient.invalidateQueries(['novel', novelId], { 
        refetchType: 'all' 
      });
      
      // Close the form and reset state
      setShowModuleForm(false);
      setModuleForm({
        title: '',
        illustration: '',
        loading: false,
        error: '',
        mode: 'published',
        moduleBalance: 0
      });
      setEditingModule(null);
    } catch (error) {
      console.error('Lỗi gửi module:', error);
      const errorMessage = error.response?.data?.message || 'Không thể lưu module. Vui lòng thử lại.';
      setModuleForm(prev => ({ 
        ...prev, 
        loading: false,
        error: errorMessage
      }));
      
      // On error, force refetch to make sure we have correct data
      queryClient.refetchQueries(['novel', novelId]);
    }
  }, [moduleForm, editingModule, novelId, queryClient]);
  
  // Handler for opening the request modal for modules or chapters
  const handleOpenRequestModal = useCallback((module, chapter = null) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để mở nội dung');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }
    
    // Set the target to either the module or the chapter
    setOpenRequestTarget(chapter || module);
    setOpenRequestModalOpen(true);
  }, [isAuthenticated]);

  // Handler for submitting an open request
  const handleSubmitOpenRequest = useCallback(async (depositAmount) => {
    if (!isAuthenticated || !openRequestTarget) {
      return;
    }
    
    setSubmittingOpenRequest(true);
    
    try {
      // Determine if we're opening a module or chapter
      const isModule = openRequestTarget.moduleBalance !== undefined;
      
      // Create the request data
      const openRequestData = {
        type: 'open',
        title: DOMPurify.sanitize(`Yêu cầu được thông qua tự động`),
        novelId,
        deposit: Number(depositAmount)
      };
      
      // Add module or chapter ID based on the target
      if (isModule) {
        openRequestData.moduleId = openRequestTarget._id;
      } else {
        openRequestData.chapterId = openRequestTarget._id;
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
        setUserBalance(prevBalance => prevBalance - depositAmount + response.data.refundAmount);
        
        alert(`Yêu cầu đã được xử lí thành công. ${isModule ? 'Tập' : 'Chương'} đã được mở! Một số dư hoàn lại ${response.data.refundAmount} đã được thêm vào số 🌾 hiện tại của bạn.`);
      } else if (response.data.opened) {
        // Content was successfully opened
        // Update local user balance
        setUserBalance(prevBalance => prevBalance - depositAmount);
        
        alert(`Yêu cầu của bạn đã được xử lý thành công. ${isModule ? 'Tập' : 'Chương'} đã được mở!`);
      } else {
        // Content was not opened (not enough balance)
        // Update local user balance
        setUserBalance(prevBalance => prevBalance - depositAmount);
        
        alert(`Yêu cầu của bạn đã được xử lý thành công. Cảm ơn đã góp 🌾 để mở ${isModule ? 'Tập' : 'Chương'}!`);
      }
      
      // Close the modal
      setOpenRequestModalOpen(false);
      setOpenRequestTarget(null);
      
      // Refresh the novel data to show unlocked content
      queryClient.invalidateQueries(['novel', novelId]);
      
    } catch (err) {
      console.error('Failed to submit open request:', err);
      alert(err.response?.data?.message || 'Failed to submit open request');
    } finally {
      setSubmittingOpenRequest(false);
    }
  }, [isAuthenticated, openRequestTarget, novelId, queryClient]);
  
  // Check if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user && !token) {
      console.error("Vấn đề xác thực: Người dùng đã đăng nhập nhưng token bị thiếu");
    }
  }, [user]);
  
  // Query for fetching novel data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: async () => {
      // Check if we need to force a fresh fetch from the server
      const needsFreshData = location.state?.from === 'addChapter' && location.state?.shouldRefetch;
      
      // Check if novel was viewed in the last 4 hours
      const viewKey = `novel_${novelId}_last_viewed`;
      const lastViewed = localStorage.getItem(viewKey);
      const now = Date.now();
      const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      
      // Only count view if:
      // 1. Never viewed before, or
      // 2. Last viewed more than 4 hours ago
      const shouldCountView = !needsFreshData && 
        !queryClient.getQueryData(['novel', novelId]) && 
        (!lastViewed || (now - parseInt(lastViewed, 10)) > fourHours);
      
      // Use forceRefresh when coming from chapter creation
      const response = await api.fetchNovelWithModules(novelId, needsFreshData, shouldCountView);
      
      // Update last viewed timestamp if we counted a view
      if (shouldCountView) {
        localStorage.setItem(viewKey, now.toString());
      }
      
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false // Prevent refetch on window focus
  });
  
  // Check if we're coming from chapter creation and need to refetch
  useEffect(() => {
    const handleRefresh = async () => {
      if (location.state?.from === 'addChapter' && location.state?.shouldRefetch) {
        // Force a full refetch that bypasses the cache completely
        await queryClient.invalidateQueries(['novel', novelId], { refetchType: 'all' });
        await refetch(); 
        
        // Only clear the state after refetch completes
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    
    handleRefresh();
  }, [location, refetch, navigate, queryClient, novelId]);
  
  // Check if novel has chapters
  const hasChapters = useMemo(() => {
    return (data?.modules?.some(module => 
      module.chapters && module.chapters.length > 0
    )) || false;
  }, [data]);

  // Calculate chapters data early
  const chaptersData = useMemo(() => ({
    chapters: data?.modules?.flatMap(module => module.chapters || []) || []
  }), [data]);

  // Query for fetching user's reading progress
  const { data: readingProgress } = useQuery({
    queryKey: ['readingProgress', user?.username, novelId],
    queryFn: async () => {
      // Return null since reading progress feature is not implemented yet
      return null;
    },
    enabled: false, // Disable the query until reading progress feature is implemented
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  });
  
  // Query to get user interaction data (likes, ratings)
  const { data: userInteraction } = useQuery({
    queryKey: ['userInteraction', user?.username, novelId],
    queryFn: () => {
      if (!user?.username || !novelId) return { liked: false, rating: null };
      return api.getUserNovelInteraction(novelId);
    },
    enabled: !!user?.username && !!novelId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Toggle comments section
  const toggleComments = () => {
    setIsCommentsOpen(!isCommentsOpen);
  };

  // Add handler functions for chapters
  const handleChapterReorder = useCallback(async (moduleId, chapterId, direction) => {
    if (!user || user.role !== 'admin') return;
    
    try {
      // Get current data for optimistic update
      const currentData = queryClient.getQueryData(['novel', novelId]);
      const previousData = currentData ? JSON.parse(JSON.stringify(currentData)) : null;
      
      if (currentData?.modules) {
        // Find the module and its chapters
        const moduleIndex = currentData.modules.findIndex(m => m._id === moduleId);
        if (moduleIndex !== -1) {
          const module = currentData.modules[moduleIndex];
          const chapters = [...module.chapters];
          const currentIndex = chapters.findIndex(c => c._id === chapterId);
          const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
          
          // Validate move is possible
          if (targetIndex < 0 || targetIndex >= chapters.length) {
            throw new Error('Không thể di chuyển chương hơn nữa về hướng đó');
          }

          // Cancel any pending queries for this novel
          await queryClient.cancelQueries(['novel', novelId]);
          
          // Swap chapters for optimistic update
          [chapters[currentIndex], chapters[targetIndex]] = [chapters[targetIndex], chapters[currentIndex]];
          
          // Update cache immediately
          queryClient.setQueryData(['novel', novelId], {
            ...currentData,
            modules: currentData.modules.map((m, i) => 
              i === moduleIndex ? { ...m, chapters } : m
            )
          });

          try {
            // Make API call
            await api.reorderChapter({ 
              novelId,
              moduleId,
              chapterId, 
              direction 
            });
          } catch (error) {
            // On error, revert to previous state
            if (previousData) {
              queryClient.setQueryData(['novel', novelId], previousData);
            }
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Không thể di chuyển chương:', error);
      // Force a refetch to ensure we're in sync with server
      queryClient.invalidateQueries(['novel', novelId]);
    }
  }, [user, novelId, queryClient]);
  
  const handleChapterDelete = useCallback(async (moduleId, chapterId) => {
    if (!user || user.role !== 'admin') return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa chương này? Hành động này không thể hoàn tác.')) {
      try {
        await api.deleteChapter(chapterId);
        // Refresh the data
        queryClient.invalidateQueries(['novel', novelId]);
      } catch (error) {
        console.error('Không thể xóa chương:', error);
      }
    }
  }, [user, novelId, queryClient]);
  
  const handleEditModule = useCallback((module) => {
    // Set form data from the existing module
    setModuleForm({
      title: module.title || '',
      illustration: module.illustration || '',
      loading: false,
      error: '',
      mode: module.mode || 'published',
      moduleBalance: module.moduleBalance || 0
    });
    
    // Set the editing ID
    setEditingModule(module._id);
    
    // Show the form
    setShowModuleForm(true);
  }, []);

  const handleModuleCoverUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setModuleForm(prev => ({ ...prev, loading: true, error: '' }));
  
    try {
      const url = await api.uploadModuleCover(file);
      setModuleForm(prev => ({ ...prev, illustration: url, loading: false }));
    } catch (error) {
      console.error('Upload error:', error);
      setModuleForm(prev => ({
        ...prev,
        loading: false,
        error: 'Không thể tải ảnh bìa. Vui lòng thử lại.' 
      }));
    }
  }, []);

  // Set up SSE connection for real-time updates
  useEffect(() => {
    const handleUpdate = async () => {
      await queryClient.invalidateQueries(['novel', novelId]);
      await queryClient.refetchQueries(['novel', novelId]); // Force immediate refetch
    };

    const handleStatusChange = (data) => {
      if (data.id === novelId) {
        queryClient.invalidateQueries(['novel', novelId]);
      }
    };

    const handleNovelDelete = (data) => {
      if (data.id === novelId) {
        // Navigate away if the current novel is deleted
        navigate('/');
      }
    };

    const handleNewChapter = (data) => {
      queryClient.invalidateQueries(['novel', novelId]);
    };

    // Add event listeners
    sseService.addEventListener('update', handleUpdate);
    sseService.addEventListener('novel_status_changed', handleStatusChange);
    sseService.addEventListener('novel_deleted', handleNovelDelete);
    sseService.addEventListener('new_chapter', handleNewChapter);

    // Clean up on unmount
    return () => {
      sseService.removeEventListener('update', handleUpdate);
      sseService.removeEventListener('novel_status_changed', handleStatusChange);
      sseService.removeEventListener('novel_deleted', handleNovelDelete);
      sseService.removeEventListener('new_chapter', handleNewChapter);
    };
  }, [novelId, queryClient, navigate]);

  return (
    <div className="novel-detail-page">
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error-message">Lỗi tải truyện: {error.message}</div>
      ) : data?.novel ? (
        <>
          <NovelSEO novel={data.novel} />
          <NovelInfo 
            novel={data.novel}
            user={user}
            userInteraction={userInteraction}
            hasChapters={hasChapters}
            setIsRatingModalOpen={setIsRatingModalOpen}
            handleModuleFormToggle={handleModuleFormToggle}
            truncateHTML={truncateHTML}
            chaptersData={chaptersData}
            sidebar={<NovelContributions novelId={novelId} />}
          />
          
          <div className="chapter-list-container">
            <div className="chapters-header">
              <h2>Danh Sách Chương</h2>
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <button 
                  className="add-module-btn"
                  onClick={handleModuleFormToggle}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Thêm tập
                </button>
              )}
            </div>
            
            {/* Place the form at the top level for maximum visibility when editing */}
            {showModuleForm && editingModule && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                width: '80%',
                maxWidth: '600px',
                background: 'white',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
              }}>
                <ModuleForm 
                  key={`edit-${editingModule}`}
                  moduleForm={moduleForm} 
                  setModuleForm={setModuleForm} 
                  handleModuleSubmit={handleModuleSubmit} 
                  handleModuleCoverUpload={handleModuleCoverUpload} 
                  handleModuleFormToggle={handleModuleFormToggle}
                  editingModule={editingModule} 
                />
              </div>
            )}
            
            {/* Regular position for the add form */}
            {showModuleForm && !editingModule && (
              <ModuleForm 
                key="new-module"
                moduleForm={moduleForm} 
                setModuleForm={setModuleForm} 
                handleModuleSubmit={handleModuleSubmit} 
                handleModuleCoverUpload={handleModuleCoverUpload} 
                handleModuleFormToggle={handleModuleFormToggle}
                editingModule={null} 
              />
            )}
            
            {data?.modules && (
              <ModuleList
                modules={data.modules}
                novelId={novelId}
                user={user}
                handleModuleReorder={handleModuleReorder}
                handleModuleDelete={handleDeleteModule}
                handleEditModule={handleEditModule}
                handleChapterReorder={handleChapterReorder}
                handleChapterDelete={handleChapterDelete}
                onOpenModuleRequest={handleOpenRequestModal}
              />
            )}
          </div>

          {/* Comments section */}
          <div className="comments-section">
            <button
              className="comments-toggle-btn" 
              onClick={toggleComments}
            >
              {isCommentsOpen ? (
                <>
                  <LockIcon size={18} style={{ marginRight: '8px' }} />
                  Ẩn bình luận
                </>
              ) : (
                <>
                  <CommentIcon size={18} style={{ marginRight: '8px' }} />
                  Hiển thị bình luận
                </>
              )}
            </button>
            
            {isCommentsOpen && (
              <CommentSection 
                contentId={novelId}
                contentType="novels"
                user={user}
                isAuthenticated={!!user}
              />
            )}
          </div>

          {/* Rating Modal */}
          {isRatingModalOpen && (
            <RatingModal 
              novelId={novelId}
              isOpen={isRatingModalOpen}
              onClose={() => setIsRatingModalOpen(false)}
              currentRating={userInteraction?.rating || 0}
            />
          )}
          
          {/* Open Request Modal */}
          <OpenRequestModal
            isOpen={openRequestModalOpen}
            onClose={() => {
              setOpenRequestModalOpen(false);
              setOpenRequestTarget(null);
            }}
            onSubmit={handleSubmitOpenRequest}
            target={openRequestTarget}
            userBalance={userBalance}
            submitting={submittingOpenRequest}
          />
          
          {/* Add ScrollToTop component */}
          <ScrollToTop threshold={400} />
        </>
      ) : (
        <div className="error-message">Truyện không tồn tại</div>
      )}
    </div>
  );
};

export default NovelDetail; 
