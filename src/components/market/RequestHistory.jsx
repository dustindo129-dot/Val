import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUniqueSlug, generateNovelUrl } from '../../utils/slugUtils';
import LoadingSpinner from '../LoadingSpinner';
import DOMPurify from 'dompurify';
import { translateRequestStatus, translateRequestType, translateContributionStatus } from '../../utils/marketStatusTranslation';

/**
 * Request History Component
 * 
 * Displays a user's request history
 * 
 * @param {Object} props - Component props
 * @param {Array} props.requestHistory - Array of request history items
 * @param {boolean} props.historyLoading - Whether history is loading
 * @param {Object} props.contributions - Object mapping request IDs to contribution arrays
 * @param {Set} props.loadingContributions - Set of request IDs with loading contributions
 * @param {Function} props.setShowHistory - Function to toggle history visibility
 * @param {Object} props.user - The current user data
 * @returns {JSX.Element} Request history component
 */
const RequestHistory = ({
  requestHistory,
  historyLoading,
  contributions,
  loadingContributions,
  setShowHistory,
  user
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 5;
  
  // Calculate total pages
  const totalPages = Math.ceil(requestHistory.length / requestsPerPage);
  
  // Get current page requests
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = requestHistory.slice(indexOfFirstRequest, indexOfLastRequest);
  
  // Change page
  const goToPage = (pageNumber) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  };

  // Function to process note content - enable hyperlinks and preserve line breaks
  const processNoteContent = (content) => {
    if (!content) return '';
    
    let processedContent = content;
    
    // Convert line breaks to <br> tags
    processedContent = processedContent.replace(/\n/g, '<br>');
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
    processedContent = processedContent.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert www links to clickable links
    const wwwRegex = /(^|[^\/])(www\.[^\s<>"]+)/gi;
    processedContent = processedContent.replace(wwwRegex, '$1<a href="http://$2" target="_blank" rel="noopener noreferrer">$2</a>');
    
    // Convert email addresses to mailto links
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    processedContent = processedContent.replace(emailRegex, '<a href="mailto:$1">$1</a>');
    
    // Support basic markdown-style formatting
    // Bold text **text** or __text__
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedContent = processedContent.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic text *text* or _text_
    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processedContent = processedContent.replace(/_(.*?)_/g, '<em>$1</em>');
    
    return processedContent;
  };

  return (
    <div className="request-history-container">
      <div className="request-history-header">
        <h3>Lịch sử yêu cầu</h3>
        <button className="close-history-btn" onClick={() => setShowHistory(false)}>
          <i className="fas fa-times"></i> Quay lại yêu cầu
        </button>
      </div>
      {historyLoading ? (
        <LoadingSpinner size="medium" text="Đang tải lịch sử..." />
      ) : requestHistory.length === 0 ? (
        <p>Không có lịch sử yêu cầu</p>
      ) : (
        <>
          <div className="request-history-list">
            {currentRequests.map(request => (
              <div key={request._id} className={`history-item status-${request.status}`}>
                <div className="history-header">
                  <div className="history-user">
                    <span className="history-username">{request.user.displayName || request.user.username}</span>
                    <span className="history-type">
                      {translateRequestType(request.type)}
                    </span>
                    <span className={`history-status status-${request.status}`}>
                      {translateRequestStatus(request.status)}
                    </span>

                  </div>
                                    <div className="history-date">                    {(() => {                      const date = new Date(request.createdAt);                      const day = date.getDate().toString().padStart(2, '0');                      const month = (date.getMonth() + 1).toString().padStart(2, '0');                      const year = date.getFullYear();                      return `${day}/${month}/${year}`;                    })()}                  </div>
                </div>
                <div className="history-title">{request.title || "Yêu cầu truyện mới chưa có tên"}</div>
                {request.note && (
                  <div className="history-note" dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(processNoteContent(request.note)) 
                  }} />
                )}
                {/* Contact Info - only visible for 'new' requests and only to admin/mod or request owner */}
                {request.type === 'new' && 
                 request.contactInfo && 
                 user && 
                 (user.role === 'admin' || user.role === 'moderator' || request.user._id === (user._id || user.id)) && (
                  <div className="request-contact-info">
                    <strong>Thông tin liên lạc:</strong> <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processNoteContent(request.contactInfo)) }} />
                  </div>
                )}
                {request.novel && (
                  <div className="history-novel">
                    <span>Truyện: </span>
                    <Link to={generateNovelUrl(request.novel)}>{request.novel.title}</Link>
                    {request.module && (
                      <span className="module-info">- {request.module.title}</span>
                    )}
                    {request.chapter && (
                      <span className="chapter-info">- {request.chapter.title}</span>
                    )}
                  </div>
                )}
                <div className="history-deposit">Cọc: {request.deposit}</div>
                
                {/* Only show contributions section if contributions exist */}
                {contributions && contributions[request._id] && contributions[request._id].length > 0 && (
                  <div className="history-contributions">
                    <h4>
                      {loadingContributions.has(request._id) 
                        ? 'Đang tải đóng góp...' 
                        : `Đóng góp (${contributions[request._id].length})`}
                    </h4>
                    
                    {contributions[request._id].map(contribution => (
                      <div key={contribution._id} className={`history-contribution status-${contribution.status}`}>
                        <div className="contribution-header">
                          <span className="contribution-username">{contribution.user.displayName || contribution.user.username}</span>
                          <span className={`contribution-status status-${contribution.status}`}>
                            {translateContributionStatus(contribution.status)}
                          </span>
                                                    <span className="contribution-date">                            {(() => {                              const date = new Date(contribution.createdAt);                              const day = date.getDate().toString().padStart(2, '0');                              const month = (date.getMonth() + 1).toString().padStart(2, '0');                              const year = date.getFullYear();                              return `${day}/${month}/${year}`;                            })()}                          </span>
                        </div>
                        {contribution.note && (
                          <div className="contribution-note" dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(processNoteContent(contribution.note)) 
                          }} />
                        )}
                        <div className="contribution-amount">Góp 🌾: {contribution.amount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="market-pagination-controls">
              <button 
                className="market-pagination-btn" 
                onClick={() => goToPage(1)} 
                disabled={currentPage === 1}
              >
                <i className="fas fa-angle-double-left"></i>
              </button>
              <button 
                className="market-pagination-btn" 
                onClick={() => goToPage(currentPage - 1)} 
                disabled={currentPage === 1}
              >
                <i className="fas fa-angle-left"></i>
              </button>
              <span className="market-pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button 
                className="market-pagination-btn" 
                onClick={() => goToPage(currentPage + 1)} 
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-angle-right"></i>
              </button>
              <button 
                className="market-pagination-btn" 
                onClick={() => goToPage(totalPages)} 
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-angle-double-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RequestHistory; 