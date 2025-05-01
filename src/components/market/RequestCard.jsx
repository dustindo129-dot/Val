import React from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { formatRelativeTime } from './utils';

/**
 * Request Card Component
 * 
 * Displays a single request card with all details and actions
 * 
 * @param {Object} props - Component props
 * @param {Object} props.request - The request data
 * @param {boolean} props.isAdmin - Whether the current user is an admin
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {Object} props.user - The current user data
 * @param {boolean} props.isLikedByCurrentUser - Whether the request is liked by current user
 * @param {Set} props.likingRequests - Set of request IDs currently being liked
 * @param {Function} props.handleLikeRequest - Function to handle liking a request
 * @param {Function} props.handleShowContributionForm - Function to show contribution form
 * @param {Function} props.handleApproveRequest - Function to handle approving a request (admin only)
 * @param {Function} props.handleDeclineRequest - Function to handle declining a request (admin only)
 * @param {Function} props.handleDeleteRequest - Function to handle deleting a request (admin only)
 * @param {Set} props.withdrawableRequests - Set of withdrawable request IDs
 * @param {Set} props.withdrawingRequests - Set of request IDs currently being withdrawn
 * @param {Function} props.handleWithdrawRequest - Function to handle withdrawing a request
 * @param {Object} props.contributions - Object mapping request IDs to contribution arrays
 * @param {number} props.showContributionForm - ID of request with visible contribution form
 * @param {Function} props.setShowContributionForm - Function to set which request shows contributions
 * @param {boolean} props.isAdminRequest - Whether this is an admin request
 * @returns {JSX.Element} Request card component
 */
const RequestCard = ({
  request,
  isAdmin,
  isAuthenticated,
  user,
  isLikedByCurrentUser,
  likingRequests,
  handleLikeRequest,
  handleShowContributionForm,
  handleApproveRequest,
  handleDeclineRequest,
  handleDeleteRequest,
  withdrawableRequests,
  withdrawingRequests,
  handleWithdrawRequest,
  contributions,
  showContributionForm,
  setShowContributionForm,
  isAdminRequest
}) => {
  // Calculate progress percentage without capping at 100%
  const goalAmount = request.type === 'web' ? (request.goalBalance || 1000) : 1000;
  
  // Calculate total contributions for this request
  const totalContributions = contributions && contributions[request._id] 
    ? contributions[request._id].reduce((sum, contribution) => sum + contribution.amount, 0)
    : 0;
    
  // Calculate progress including both deposit and contributions
  const progressPercent = Math.round(((request.deposit + totalContributions) / goalAmount) * 100);

  return (
    <div className={`request-card ${isAdminRequest ? 'admin-request' : ''}`}>
      <div className="request-header">
        <div>
          <div className="request-title">
            {request.novel && (
              <Link to={`/novel/${request.novel._id}`} className="novel-link">
                {request.novel.title}
              </Link>
            )}
            {!request.novel && (
              <span>{request.title || "Yêu cầu truyện mới chưa có tên"}</span>
            )}
          </div>
          <div className="request-username">Đề xuất bởi: {request.user.username}</div>
        </div>
        <div className="request-info">
          <span className="request-time">{formatRelativeTime(request.createdAt)}</span>
        </div>
      </div>
      
      {request.note && (
        <div className="request-note">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(request.note) }} />
        </div>
      )}
      
      <div className="request-stats">
        <div className="stat-item">
          <i className="fas fa-thumbs-up"></i>
          <span>{request.likes ? request.likes.length : 0}</span>
        </div>
      </div>
      
      <div className="progress-container">
        <div className={`progress-bar ${progressPercent > 100 ? 'exceeded' : ''}`} style={{ width: `${Math.min(100, progressPercent)}%` }}></div>
      </div>
      <div className="progress-text">
        <span>{request.deposit + totalContributions} 🌾</span>
        <span>{progressPercent}%</span>
        <span>{goalAmount} 🌾</span>
      </div>
      
      {/* Contributions Section */}
      {contributions && contributions[request._id] && contributions[request._id].length > 0 && (
        <div className="show-donors-btn" onClick={() => {
          // Show donor list in a modal or toggle the list
          if (showContributionForm === request._id) {
            setShowContributionForm(null);
          } else {
            setShowContributionForm(request._id);
          }
        }}>
          <i className="fas fa-users"></i>
          {showContributionForm === request._id 
            ? 'Ẩn danh sách người góp 🌾' 
            : `Xem danh sách người góp 🌾 (${contributions[request._id].length})`}
        </div>
      )}
      
      {showContributionForm === request._id && contributions && contributions[request._id] && (
        <div className="donors-list active">
          {contributions[request._id].map(contribution => (
            <div key={contribution._id} className={`donor-item status-${contribution.status}`}>
              <div>
                <span className="donor-name">{contribution.user.username}</span> - 
                <span className="donor-amount">{contribution.amount} 🌾</span>
              </div>
              {contribution.note && (
                <div className="donor-message">"{contribution.note}"</div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="request-actions">
        <div className="action-row">
          <button 
            className={`action-btn upvote-btn ${isLikedByCurrentUser ? 'active' : ''}`}
            onClick={() => handleLikeRequest(request._id)}
            disabled={!isAuthenticated || likingRequests.has(request._id)}
          >
            <i className={`fas fa-thumbs-up ${isLikedByCurrentUser ? 'liked' : ''}`}></i>
            <span>Thích</span>
          </button>
          
          <button 
            className="action-btn donate-btn"
            onClick={() => handleShowContributionForm(request._id)}
          >
            <i className="fas fa-hand-holding-heart"></i>
            <span>Góp 🌾</span>
          </button>
        </div>
        
        {/* Admin actions */}
        {isAdmin && request.type === 'new' && (
          <div className="action-row">
            <button 
              className="action-btn approve-btn"
              onClick={() => handleApproveRequest(request._id)}
              title="Phê duyệt yêu cầu"
            >
              <i className="fas fa-check"></i>
              <span>Phê duyệt</span>
            </button>
            <button 
              className="action-btn decline-btn"
              onClick={() => handleDeclineRequest(request._id)}
              title="Từ chối yêu cầu"
            >
              <i className="fas fa-times"></i>
              <span>Từ chối</span>
            </button>
          </div>
        )}
        
        {/* Delete button for admin users and web requests */}
        {isAdmin && request.type === 'web' && (
          <button 
            className="action-btn decline-btn"
            onClick={() => handleDeleteRequest(request._id)}
            title="Gỡ yêu cầu"
          >
            <i className="fas fa-trash"></i>
            <span>Gỡ</span>
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
      </div>
    </div>
  );
};

export default RequestCard; 