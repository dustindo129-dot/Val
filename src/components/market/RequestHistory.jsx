import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUniqueSlug } from '../../utils/slugUtils';
import LoadingSpinner from '../LoadingSpinner';

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
 * @returns {JSX.Element} Request history component
 */
const RequestHistory = ({
  requestHistory,
  historyLoading,
  contributions,
  loadingContributions,
  setShowHistory
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
                    <span className="history-username">{request.user.username}</span>
                    <span className="history-type">
                      {request.type === 'new' 
                        ? 'Truyện mới' 
                        : request.type === 'web'
                          ? 'Đề xuất từ nhóm dịch'
                          : 'Mở chương/tập có sẵn'}
                    </span>
                    <span className={`history-status status-${request.status}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    {request.openNow && (
                      <span className="history-open-now-badge">
                        Mở ngay
                      </span>
                    )}
                  </div>
                                    <div className="history-date">                    {(() => {                      const date = new Date(request.createdAt);                      const day = date.getDate().toString().padStart(2, '0');                      const month = (date.getMonth() + 1).toString().padStart(2, '0');                      const year = date.getFullYear();                      return `${day}/${month}/${year}`;                    })()}                  </div>
                </div>
                <div className="history-title">{request.title || "Yêu cầu truyện mới chưa có tên"}</div>
                {request.note && (
                  <div className="history-note">{request.note}</div>
                )}
                {request.novel && (
                  <div className="history-novel">
                    <span>Truyện: </span>
                    <Link to={`/novel/${createUniqueSlug(request.novel.title, request.novel._id)}`}>{request.novel.title}</Link>
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
                          <span className="contribution-username">{contribution.user.username}</span>
                          <span className={`contribution-status status-${contribution.status}`}>
                            {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                          </span>
                                                    <span className="contribution-date">                            {(() => {                              const date = new Date(contribution.createdAt);                              const day = date.getDate().toString().padStart(2, '0');                              const month = (date.getMonth() + 1).toString().padStart(2, '0');                              const year = date.getFullYear();                              return `${day}/${month}/${year}`;                            })()}                          </span>
                        </div>
                        {contribution.note && (
                          <div className="contribution-note">{contribution.note}</div>
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
            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                onClick={() => goToPage(1)} 
                disabled={currentPage === 1}
              >
                <i className="fas fa-angle-double-left"></i>
              </button>
              <button 
                className="pagination-btn" 
                onClick={() => goToPage(currentPage - 1)} 
                disabled={currentPage === 1}
              >
                <i className="fas fa-angle-left"></i>
              </button>
              <span className="pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button 
                className="pagination-btn" 
                onClick={() => goToPage(currentPage + 1)} 
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-angle-right"></i>
              </button>
              <button 
                className="pagination-btn" 
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