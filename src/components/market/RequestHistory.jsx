import React from 'react';
import { Link } from 'react-router-dom';

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
  return (
    <div className="request-history-container">
      <h3>Lịch sử yêu cầu</h3>
      {historyLoading ? (
        <p>Đang tải lịch sử...</p>
      ) : requestHistory.length === 0 ? (
        <p>Không có lịch sử yêu cầu</p>
      ) : (
        <div className="request-history-list">
          {requestHistory.map(request => (
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
                <div className="history-date">
                  {new Date(request.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="history-title">{request.title || "Yêu cầu truyện mới chưa có tên"}</div>
              {request.note && (
                <div className="history-note">{request.note}</div>
              )}
              {request.novel && (
                <div className="history-novel">
                  <span>Truyện: </span>
                  <Link to={`/novel/${request.novel._id}`}>{request.novel.title}</Link>
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
                        <span className="contribution-date">
                          {new Date(contribution.createdAt).toLocaleDateString()}
                        </span>
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
      )}
      <button className="close-history-btn" onClick={() => setShowHistory(false)}>
        Quay lại yêu cầu
      </button>
    </div>
  );
};

export default RequestHistory; 