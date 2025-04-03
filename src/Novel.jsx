/**
 * Novel.jsx
 * 
 * Component that displays a list of novels with their details.
 * Features:
 * - Paginated novel list
 * - Search functionality
 * - Expandable descriptions
 * - Latest chapters display
 * - Status indicators
 * - Responsive layout
 * - Real-time updates via SSE
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import HotNovels from './components/HotNovels';
import './Novel.css';
import config from '../config/config';
import sseService from './services/sseService';

// Function to truncate HTML content safely
const truncateHTML = (html, maxLength) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  
  if (text.length <= maxLength) {
    return html;
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

  return truncated + '...';
};

// Novel component with optional search query prop
const Novel = ({ searchQuery = "" }) => {
  const { page } = useParams();
  const navigate = useNavigate();
  const currentPage = parseInt(page) || 1;
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const queryClient = useQueryClient();

  // Set up SSE connection for real-time updates
  useEffect(() => {
    // Define event handlers
    const handleUpdate = () => {
      console.log('Novel update event received');
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] });
    };

    const handleStatusChange = (data) => {
      console.log(`Novel status changed: "${data.title}" to "${data.status}"`);
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] }, { force: true });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] }, { force: true });
    };

    const handleNovelDelete = (data) => {
      console.log(`Novel deleted: "${data.title}" (ID: ${data.id})`);
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] }, { force: true });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] }, { force: true });
    };

    const handleRefresh = () => {
      console.log('Full refresh requested from server');
      queryClient.invalidateQueries();
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] }, { force: true });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] }, { force: true });
    };

    const handleNewNovel = () => {
      console.log('New novel added');
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] });
    };

    const handleNewChapter = (data) => {
      console.log(`New chapter "${data.chapterTitle}" added to "${data.novelTitle}"`);
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] });
    };

    // Add event listeners
    sseService.addEventListener('update', handleUpdate);
    sseService.addEventListener('novel_status_changed', handleStatusChange);
    sseService.addEventListener('novel_deleted', handleNovelDelete);
    sseService.addEventListener('refresh', handleRefresh);
    sseService.addEventListener('new_novel', handleNewNovel);
    sseService.addEventListener('new_chapter', handleNewChapter);

    // Clean up on unmount
    return () => {
      sseService.removeEventListener('update', handleUpdate);
      sseService.removeEventListener('novel_status_changed', handleStatusChange);
      sseService.removeEventListener('novel_deleted', handleNovelDelete);
      sseService.removeEventListener('refresh', handleRefresh);
      sseService.removeEventListener('new_novel', handleNewNovel);
      sseService.removeEventListener('new_chapter', handleNewChapter);
    };
  }, [currentPage, queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['novels', currentPage],
    queryFn: async () => {
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = new Date().getTime();
      const response = await axios.get(`${config.backendUrl}/api/novels?page=${currentPage}&_cb=${cacheBuster}`);
      return response.data;
    },
    staleTime: 0, // Data is immediately stale
    cacheTime: 1000 * 60, // Only cache for 1 minute max
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 10000, // Refresh every 30 seconds if tab stays open
    keepPreviousData: true // Keep showing previous page data while loading next page
  });

  const novels = data?.novels || [];
  const pagination = data?.pagination;

  // Toggle description expansion for a specific novel
  const toggleDescription = (novelId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  };

  // Format date to show time ago
  const formatTimeAgo = (date) => {
    const updateDate = new Date(date);
    return (
      <i>
        {updateDate.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'short',
          day: '2-digit'
        }).replace(',', '')}
      </i>
    );
  };

  // Filter novels based on search query
  const filteredNovels = useMemo(() => {
    if (!searchQuery) return novels;
    
    const query = searchQuery.toLowerCase();
    return novels.filter(novel => 
      novel.title.toLowerCase().includes(query) ||
      novel.author.toLowerCase().includes(query) ||
      novel.description.toLowerCase().includes(query)
    );
  }, [novels, searchQuery]);

  // Render pagination controls
  const renderPagination = () => {
    if (!pagination) return null;

    const { currentPage, totalPages } = pagination;
    const pages = [];

    // Always show first page
    pages.push(
      <Link
        key={1}
        to={`/page/1`}
        className={`page-link ${currentPage === 1 ? 'active' : ''}`}
      >
        1
      </Link>
    );

    // Add ellipsis after first page if needed
    if (currentPage > 3) {
      pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
    }

    // Add pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i <= currentPage + 1 && i >= currentPage - 1) {
        pages.push(
          <Link
            key={i}
            to={`/page/${i}`}
            className={`page-link ${currentPage === i ? 'active' : ''}`}
          >
            {i}
          </Link>
        );
      }
    }

    // Add ellipsis before last page if needed
    if (currentPage < totalPages - 2) {
      pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(
        <Link
          key={totalPages}
          to={`/page/${totalPages}`}
          className={`page-link ${currentPage === totalPages ? 'active' : ''}`}
        >
          {totalPages}
        </Link>
      );
    }

    return <div className="pagination">{pages}</div>;
  };

  // Show loading state
  if (isLoading) return <div className="loading">Loading novels...</div>;
  
  // Show error state
  if (error) return <div className="error">{error.message}</div>;

  // Show no results message for search
  if (filteredNovels.length === 0 && searchQuery) {
    return (
      <div className="novels-container">
        <h1 className="novels-title">Search Results</h1>
        <div className="no-results">
          <p>No novels found matching "{searchQuery}"</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="novels-container">
      <div className="main-content">
        {/* Section header */}
        <div className="section-header">
          <h2 className="section-title">
            LATEST UPDATES
            <span className="title-icon">★</span>
          </h2>
        </div>

        {/* Novels list */}
        <div className="novels-list">
          {filteredNovels.map((novel) => {
            const isDescriptionExpanded = expandedDescriptions[novel._id];
            const shouldShowReadMore = (novel.description?.length || 0) > 200;
            
            // Get the most recent update time from either the novel update or latest chapter
            const latestUpdateTime = novel.chapters?.length > 0
              ? Math.max(
                  new Date(novel.chapters[0].createdAt).getTime(),
                  new Date(novel.updatedAt || novel.createdAt).getTime()
                )
              : new Date(novel.updatedAt || novel.createdAt).getTime();
            
            return (
              <div key={novel._id} className="novel-update-card">
                {/* Cover image section */}
                <div className="novel-cover-section">
                  <Link to={`/novel/${novel._id}`} className="novel-cover-wrapper">
                    <img 
                      src={novel.illustration || 'https://res.cloudinary.com/dvoytcc6b/image/upload/v1743234203/%C6%A0_l%E1%BB%97i_h%C3%ACnh_m%E1%BA%A5t_r%E1%BB%93i_n8zdtv.png'} 
                      alt={novel.title}
                      className="novel-cover"
                    />
                  </Link>
                  <div className="novel-status">
                    {novel.status || 'Ongoing'}
                  </div>
                </div>
                
                {/* Novel content section */}
                <div className="novel-content">
                  {/* Title and metadata */}
                  <div className="novel-header">
                    <div className="novel-title-row">
                      <Link to={`/novel/${novel._id}`} className="novel-title-link">
                        <h3 className="novel-title">{novel.title}</h3>
                      </Link>
                      <span className="update-time">
                        {formatTimeAgo(new Date(latestUpdateTime))}
                      </span>
                    </div>
                  </div>

                  {/* Description with expand/collapse */}
                  <div className="novel-description">
                    <div dangerouslySetInnerHTML={{ 
                      __html: isDescriptionExpanded 
                        ? novel.description || 'No description available'
                        : shouldShowReadMore 
                          ? truncateHTML(novel.description || '', 200)
                          : novel.description || 'No description available'
                    }} />
                    {shouldShowReadMore && (
                      <button 
                        className="read-more-btn"
                        onClick={() => toggleDescription(novel._id)}
                      >
                        {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                  </div>

                  {/* Latest chapters list */}
                  <div className="latest-chapters">
                    {(novel.chapters || [])
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by newest first
                      .slice(0, 3) // Ensure we only show at most 3 chapters
                      .map((chapter, index) => (
                      <div key={index} className="chapter-link-container">
                        <Link 
                          to={`/novel/${novel._id}/chapter/${chapter._id}`}
                          className="chapter-link"
                        >
                          {chapter.title}
                        </Link>
                        <span className="chapter-date">
                          {formatTimeAgo(chapter.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {renderPagination()}
      </div>
      {/* Sidebar with hot novels */}
      <aside className="sidebar">
        <HotNovels />
      </aside>
    </div>
  );
};

export default Novel; 