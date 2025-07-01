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

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import '../styles/components/NovelDetail.css';
import '../styles/components/RedesignedNovelDetail.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp, faStar, faBookmark, faLock, faGift, faCrown, faChevronDown, faChevronUp, faEdit, faTrash, faPlus, faCopy, faTimes, faChartLine, faComment, faUser, faUsers, faCalendar, faEye, faRocket, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useSEO } from '../context/SEOContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import config from '../config/config';
import DOMPurify from 'dompurify';
import { createUniqueSlug } from '../utils/slugUtils';

import LoadingSpinner from './LoadingSpinner';
import NovelInfo from './novel-detail/NovelInfo';
import ScrollToTop from './ScrollToTop';
import api from '../services/api';
import sseService from '../services/sseService';
import GiftModal from './novel-detail/GiftModal';
import RatingModal from './RatingModal';
import ModuleRentalModal from './rental/ModuleRentalModal';

// Lazy load components that are not immediately visible
const CommentSection = lazy(() => import('./CommentSection'));
const ModuleChapters = lazy(() => import('./novel-detail/ModuleChapters'));
const ModuleForm = lazy(() => import('./novel-detail/ModuleForm'));
const ModuleList = lazy(() => import('./novel-detail/ModuleList'));
const ContributionModal = lazy(() => import('./novel-detail/ContributionModal'));
const ContributionHistoryModal = lazy(() => import('./novel-detail/ContributionHistoryModal'));
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
 * Displays novel budget and contribution interface
 * Only shows if the novel has paid modules or chapters, or if there's contribution history
 */
const NovelContributions = ({ novelId, novelBudget, onContributionSuccess, modules }) => {
  const { user, isAuthenticated } = useAuth();
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [hasContributionHistory, setHasContributionHistory] = useState(false);

  // Check for contribution history
  useEffect(() => {
    const checkContributionHistory = async () => {
      try {
        const response = await axios.get(
          `${config.backendUrl}/api/novels/${novelId}/contribution-history`
        );
        setHasContributionHistory(response.data.contributions && response.data.contributions.length > 0);
      } catch (error) {
        console.error('Failed to check contribution history:', error);
        setHasContributionHistory(false);
      }
    };

    if (novelId) {
      checkContributionHistory();
    }
  }, [novelId]);

  // Check if the novel has any paid content (modules or chapters) or contribution history
  const hasPaidContent = useMemo(() => {
    if (!modules || modules.length === 0) {
      // If no modules, check if there's contribution history
      return hasContributionHistory;
    }
    
    // Check for paid modules
    const hasPaidModules = modules.some(module => module.mode === 'paid');
    
    // Check for paid chapters within modules
    const hasPaidChapters = modules.some(module => 
      module.chapters && module.chapters.some(chapter => chapter.mode === 'paid')
    );
    
    // Show if there's paid content OR contribution history
    return hasPaidModules || hasPaidChapters || hasContributionHistory;
  }, [modules, hasContributionHistory]);

  // Don't render the contribution section if there's no paid content and no contribution history
  if (!hasPaidContent) {
    return null;
  }

  return (
    <div className="rd-contribution-section">
      <div className="rd-contribution-section-title">
        ĐÓNG GÓP
        <button 
          onClick={() => setShowFAQ(!showFAQ)}
          className="faq-toggle-btn"
        >
          FAQs
        </button>
      </div>
      
      {showFAQ && (
        <div className="faq-section">
          <div className="faq-title">
            Những câu hỏi thường gặp:
          </div>
          
          <div className="faq-question">
            <strong>Hỏi:</strong> Nạp lúa ở đâu?
          </div>
          <div className="faq-answer">
            <strong>Đáp:</strong> Nút "Nạp thêm".
          </div>
          
          <div className="faq-question">
            <strong>Hỏi:</strong> Kho lúa bị dư thì như thế nào?
          </div>
          <div className="faq-answer">
            <strong>Đáp:</strong> Lúa dư sẽ để lại trong kho và tự động trừ để mở chương khi chương trả phí mới được đăng (có lưu lại trong lịch sử đóng góp).
          </div>
          
          <div className="faq-question">
            <strong>Hỏi:</strong> Có lúa trong kho nhưng chưa đủ để mở chương thì sao?
          </div>
          <div className="faq-answer">
            <strong>Đáp:</strong> Lúa sẽ ở trong kho đến khi góp đủ để mở chương trả phí đăng sớm nhất.
          </div>
          
          <div className="faq-question">
            <strong>Hỏi:</strong> Ví dụ chương 1 giá 200 lúa, chương 2 giá 100 lúa, kho lúa có 100 lúa thì chương nào sẽ mở trước?
          </div>
          <div className="faq-answer">
            <strong>Đáp:</strong> Không chương nào cả. Lúa sẽ ở trong kho đến khi góp đủ 200 lúa để tự động mở chương 1. Chương được mở theo thứ tự và cả tập cũng vậy.
          </div>
          
          <div className="faq-question">
            <strong>Hỏi:</strong> Cách tính giá lúa của chương/tập?
          </div>
          <div className="faq-answer">
            <strong>Đáp:</strong> Số chữ * Giá chữ \ 100. Giá chữ dao động từ 4/5/6 vnđ 1 chữ tùy theo ngôn ngữ gốc (chưa kèm phụ phí).
          </div>
        </div>
      )}
      
      {/* Novel Budget Card */}
      <div className="novel-budget">
        <div className="balance-icon">
          <i className="fas fa-seedling"></i>
          </div>
        <div className="balance-info">
          <div className="balance-label">Kho lúa</div>
          <div className="balance-value">{(novelBudget || 0).toLocaleString()} 🌾</div>
              </div>
                </div>

      {/* Action Buttons */}
      <div className="contribution-actions">
        <button 
          className="btn btn-primary contribution-btn-primary" 
          onClick={() => {
            if (!isAuthenticated) {
              alert('Vui lòng đăng nhập để đóng góp');
              window.dispatchEvent(new CustomEvent('openLoginModal'));
              return;
            }
            setIsContributeModalOpen(true);
          }}
        >
          <i className="fas fa-plus-circle"></i>
          <span>Góp lúa</span>
        </button>
        <button 
          className="btn btn-secondary contribution-btn-secondary" 
          onClick={() => setIsHistoryModalOpen(true)}
        >
          <i className="fas fa-history"></i>
          <span>Lịch sử đóng góp</span>
        </button>
      </div>

      {/* Modals */}
      <ContributionModal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        novelId={novelId}
        onContributionSuccess={onContributionSuccess}
      />
      
      <ContributionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        novelId={novelId}
      />
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
    const novelSlug = createUniqueSlug(novel.title, novel._id);
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
      "url": `https://valvrareteam.net/truyen/${novelSlug}`,
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

  const novelSlug = createUniqueSlug(novel?.title, novel?._id);

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
      <meta property="og:url" content={`https://valvrareteam.net/truyen/${novelSlug}`} />
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
      <link rel="canonical" href={`https://valvrareteam.net/truyen/${novelSlug}`} />
      
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
const NovelDetail = ({ novelId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [autoLoadComments, setAutoLoadComments] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleForm, setModuleForm] = useState({ 
    title: '', 
    illustration: '', 
    loading: false, 
    error: '',
    mode: 'published',
    moduleBalance: 0,
    rentBalance: 0
  });
  const [editingModule, setEditingModule] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  
  // Rental modal state
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [selectedModuleForRent, setSelectedModuleForRent] = useState(null);
  
  // Handler for contribution success
  const handleContributionSuccess = useCallback(() => {
    // Refresh the novel data to update the budget
    queryClient.invalidateQueries(['novel', novelId]);
  }, [queryClient, novelId]);

  // Rental modal handlers
  const handleOpenRentalModal = useCallback((module) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để thuê tập');
      window.dispatchEvent(new CustomEvent('openLoginModal'));
      return;
    }
    setSelectedModuleForRent(module);
    setIsRentalModalOpen(true);
  }, [isAuthenticated]);

  const handleCloseRentalModal = useCallback(() => {
    setIsRentalModalOpen(false);
    setSelectedModuleForRent(null);
  }, []);

  const handleRentalSuccess = useCallback((data) => {
    // Refresh novel data and user balance after successful rental
    queryClient.invalidateQueries(['novel', novelId]);
    queryClient.invalidateQueries(['user']);
    setUserBalance(data.userBalance);
    
    // Notify SecondaryNavbar to refresh balance display
    window.dispatchEvent(new Event('balanceUpdated'));
  }, [queryClient, novelId]);

  // Set user balance when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // If user object already has balance, use it
      if (user.balance !== undefined) {
        setUserBalance(user.balance);
        return;
      }
      
      // Otherwise, fetch it from the profile endpoint
    const fetchUserBalance = async () => {
        try {
          const userResponse = await axios.get(
            `${config.backendUrl}/api/users/${user.displayName || user.username}/profile`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setUserBalance(userResponse.data.balance || 0);
        } catch (error) {
          console.error('Failed to fetch user balance:', error);
          setUserBalance(0);
      }
    };
    
    fetchUserBalance();
    }
  }, [isAuthenticated, user]);

  // Auto-show comments after delay (Option 1: Always show after delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAutoLoadComments(true);
    }, 2000); // 2 second delay after page load
    
    return () => clearTimeout(timer);
  }, []); // Run once when component mounts

  // Handle scroll to contribution section when coming from chapter access guard
  useEffect(() => {
    if (location.state?.scrollToContribution) {
      const timer = setTimeout(() => {
        const contributionSection = document.querySelector('.rd-contribution-section');
        if (contributionSection) {
          contributionSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 500); // Small delay to ensure component is fully rendered
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Handler for deleting modules
  const handleDeleteModule = useCallback(async (moduleId) => {
    // Only admin and moderator can delete modules (not pj_user)
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa tập này?')) {
      try {
        await api.deleteModule(novelId, moduleId);
        // Refresh the data
        queryClient.invalidateQueries(['novel', novelId]);
      } catch (error) {
        console.error('Không thể xóa tập:', error);
        alert('Không thể xóa module. Vui lòng thử lại.');
      }
    }
  }, [user, novelId, queryClient]);

  // Handler for module reordering
  const handleModuleReorder = useCallback(async (moduleId, direction) => {
    // Check if user has permission (admin, moderator, or pj_user managing this novel)
    if (!user) return;
    
    // Get current data for permission check and optimistic update
    const currentData = queryClient.getQueryData(['novel', novelId]);
    
    const canReorderModules = user.role === 'admin' || 
                             user.role === 'moderator' || 
                             (user.role === 'pj_user' && (
                               currentData?.novel?.active?.pj_user?.includes(user.id) || 
                               currentData?.novel?.active?.pj_user?.includes(user._id) ||
                               currentData?.novel?.active?.pj_user?.includes(user.username) ||
                               currentData?.novel?.active?.pj_user?.includes(user.displayName)
                             ));
    
    if (!canReorderModules) return;
    
    try {
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
            }
          } catch (serverError) {
            // If server fails, revert to previous state
            queryClient.setQueryData(['novel', novelId], previousData);
            console.error('Module reorder failed on server:', serverError);
            throw serverError;
          }
        }
      }
    } catch (error) {
      console.error('Module reorder error:', error);
    }
  }, [user, novelId, queryClient]);

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
          moduleBalance: 0,
          rentBalance: 0
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
                  rentBalance: parseInt(dataToSubmit.rentBalance) || 0,
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
          moduleBalance: dataToSubmit.mode === 'paid' ? parseInt(dataToSubmit.moduleBalance) || 0 : 0,
          rentBalance: parseInt(dataToSubmit.rentBalance) || 0
        });
      } else {
        // Create new module
        response = await api.createModule(novelId, {
          title: dataToSubmit.title,
          illustration: dataToSubmit.illustration,
          mode: dataToSubmit.mode,
          moduleBalance: dataToSubmit.mode === 'paid' ? parseInt(dataToSubmit.moduleBalance) || 0 : 0,
          rentBalance: parseInt(dataToSubmit.rentBalance) || 0
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
        moduleBalance: 0,
        rentBalance: 0
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
    // This effect is no longer needed since we simplified the navigation
    // The regular query invalidation will handle data freshness
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
    staleTime: 1000 * 60 * 3, // 3 minutes - don't refetch if data is less than 3 minutes old
    cacheTime: 1000 * 60 * 15, // 15 minutes - keep in cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false // Don't refetch when reconnecting
  });
  


  // Add handler functions for chapters
  const handleChapterReorder = useCallback(async (moduleId, chapterId, direction) => {
    // Check if user has permission (admin, moderator, or pj_user managing this novel)
    if (!user) return;
    
    // Get current data for permission check and optimistic update
    const currentData = queryClient.getQueryData(['novel', novelId]);
    
    const canReorderChapters = user.role === 'admin' || 
                              user.role === 'moderator' || 
                              (user.role === 'pj_user' && (
                                currentData?.novel?.active?.pj_user?.includes(user.id) || 
                                currentData?.novel?.active?.pj_user?.includes(user._id) ||
                                currentData?.novel?.active?.pj_user?.includes(user.username) ||
                                currentData?.novel?.active?.pj_user?.includes(user.displayName)
                              ));
    
    if (!canReorderChapters) return;
    
    try {
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
      console.error('Chapter reorder error:', error);
      // Force a refetch to ensure we're in sync with server
      queryClient.invalidateQueries(['novel', novelId]);
    }
  }, [user, novelId, queryClient]);
  
  const handleChapterDelete = useCallback(async (chapterId) => {
    // Only admin and moderator can delete chapters (not pj_user)
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return;
    
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
      moduleBalance: module.moduleBalance || 0,
      rentBalance: module.rentBalance || 0
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
    const handleUpdate = () => {
      // Simple invalidation without forced refetch
      queryClient.invalidateQueries(['novel', novelId]);
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
      // Only invalidate if it's for this novel
      if (data.novelId === novelId) {
        queryClient.invalidateQueries(['novel', novelId]);
      }
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
                novel={{...data.novel, modules: data.modules}}
                user={user}
                userInteraction={userInteraction}
                hasChapters={hasChapters}
                setIsRatingModalOpen={setIsRatingModalOpen}
                handleModuleFormToggle={handleModuleFormToggle}
                truncateHTML={truncateHTML}
                chaptersData={chaptersData}
                sidebar={<NovelContributions
                    novelId={novelId}
                    novelBudget={data.novel.novelBudget}
                    onContributionSuccess={handleContributionSuccess}
                    modules={data.modules}
                />}
            />
          
          <div className="chapter-list-container">
            <div className="chapters-header">
              <h2>Danh Sách Chương</h2>
              {/* Add module button - restricted to admin/moderator/assigned pj_user */}
              {(() => {
                const canAddModule = user?.role === 'admin' || user?.role === 'moderator' || 
                  (user?.role === 'pj_user' && (
                    data.novel.active?.pj_user?.includes(user.id) || 
                    data.novel.active?.pj_user?.includes(user._id) ||
                    data.novel.active?.pj_user?.includes(user.username) ||
                    data.novel.active?.pj_user?.includes(user.displayName)
                  ));



                return canAddModule;
              })() && (
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
              <div className="module-form-modal-overlay">
                <Suspense fallback={<LoadingSpinner />}>
                  <ModuleForm 
                    key={`edit-${editingModule}`}
                    moduleForm={moduleForm} 
                    setModuleForm={setModuleForm} 
                    handleModuleSubmit={handleModuleSubmit} 
                    handleModuleCoverUpload={handleModuleCoverUpload} 
                    handleModuleFormToggle={handleModuleFormToggle}
                    editingModule={editingModule} 
                    user={user}
                  />
                </Suspense>
              </div>
            )}
            
            {/* Regular position for the add form */}
            {showModuleForm && !editingModule && (
              <Suspense fallback={<LoadingSpinner />}>
                <ModuleForm 
                  key="new-module"
                  moduleForm={moduleForm} 
                  setModuleForm={setModuleForm} 
                  handleModuleSubmit={handleModuleSubmit} 
                  handleModuleCoverUpload={handleModuleCoverUpload} 
                  handleModuleFormToggle={handleModuleFormToggle}
                  editingModule={null} 
                  user={user}
                />
              </Suspense>
            )}
            
            {data?.modules && (
              <Suspense fallback={<LoadingSpinner />}>
                <ModuleList
                  modules={data.modules}
                  novelId={novelId}
                  novelTitle={data.novel.title}
                  novel={data.novel}
                  user={user}
                  handleModuleReorder={handleModuleReorder}
                  handleModuleDelete={handleDeleteModule}
                  handleEditModule={handleEditModule}
                  handleChapterReorder={handleChapterReorder}
                  handleChapterDelete={handleChapterDelete}
                  handleOpenRentalModal={handleOpenRentalModal}
                />
              </Suspense>
            )}
          </div>

          {/* Comments section - Auto-loads after delay */}
          {autoLoadComments && (
            <Suspense fallback={<LoadingSpinner />}>
              <CommentSection 
                contentId={novelId}
                contentType="novels"
                user={user}
                isAuthenticated={!!user}
                novel={data.novel}
              />
            </Suspense>
          )}

          {/* Rating Modal */}
          {isRatingModalOpen && (
            <Suspense fallback={<LoadingSpinner />}>
              <RatingModal 
                novelId={novelId}
                isOpen={isRatingModalOpen}
                onClose={() => setIsRatingModalOpen(false)}
                currentRating={userInteraction?.rating || 0}
              />
            </Suspense>
          )}
          
          {/* Module Rental Modal */}
          {isRentalModalOpen && selectedModuleForRent && (
            <ModuleRentalModal
              isOpen={isRentalModalOpen}
              onClose={handleCloseRentalModal}
              module={selectedModuleForRent}
              novel={data.novel}
              onRentalSuccess={handleRentalSuccess}
            />
          )}
          
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
