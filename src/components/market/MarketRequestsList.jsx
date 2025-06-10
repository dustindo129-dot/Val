import React from 'react';
import RequestCard from './RequestCard';
import LoadingSpinner from '../LoadingSpinner';

/**
 * Market Requests List Component
 * 
 * Displays lists of web requests and user requests
 * 
 * @param {Object} props - Component props
 * @param {Array} props.requests - Array of all requests
 * @param {boolean} props.isLoading - Whether requests are loading
 * @param {string} props.error - Error message, if any
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {Object} props.user - The current user data
 * @param {string} props.sortOrder - The current sort order
 * @param {Function} props.handleSortChange - Function to handle sort order change
 * @param {Set} props.likingRequests - Set of request IDs currently being liked
 * @param {Function} props.handleLikeRequest - Function to handle liking a request
 * @param {Function} props.handleShowContributionForm - Function to show contribution form
 * @param {Function} props.handleApproveRequest - Function to handle approving a request
 * @param {Function} props.handleDeclineRequest - Function to handle declining a request
 * @param {Set} props.withdrawableRequests - Set of withdrawable request IDs
 * @param {Set} props.withdrawingRequests - Set of request IDs currently being withdrawn
 * @param {Function} props.handleWithdrawRequest - Function to handle withdrawing a request
 * @param {Object} props.contributions - Object mapping request IDs to contribution arrays
 * @param {number} props.showContributionForm - ID of request with visible contribution form
 * @param {Function} props.setShowContributionForm - Function to set which request shows contributions
 * @param {boolean} props.showHistory - Whether to show request history
 * @returns {JSX.Element} Market requests list component
 */
const MarketRequestsList = ({
  requests,
  isLoading,
  error,
  isAuthenticated,
  user,
  sortOrder,
  handleSortChange,
  likingRequests,
  handleLikeRequest,
  handleShowContributionForm,
  handleApproveRequest,
  handleDeclineRequest,
  withdrawableRequests,
  withdrawingRequests,
  handleWithdrawRequest,
  contributions,
  showContributionForm,
  setShowContributionForm,
  showHistory
}) => {
  if (showHistory) return null;

  const isAdmin = user && user.role === 'admin';
  const webRequests = requests.filter(req => req.type === 'web');
  const userRequests = requests.filter(req => req.type === 'new');

  return (
    <>
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
      
      {/* Web Requests Section */}
      <div className="subsection-header">
        <h3>
          <i className="fas fa-crown"></i> Đề xuất từ nhóm dịch
        </h3>
        {user && user.role === 'admin' && (
          <div className="admin-note">
            <i className="fas fa-info-circle"></i> Admin: Để phê duyệt yêu cầu "Đề xuất từ nhóm dịch", bạn phải tạo truyện với tên khớp chính xác với tiêu đề yêu cầu.
          </div>
        )}
      </div>
      <div className="request-grid">
        {isLoading ? (
          <LoadingSpinner size="medium" text="Đang tải yêu cầu..." />
        ) : error ? (
          <p className="error">{error}</p>
        ) : webRequests.length === 0 ? (
          <p>Không có đề xuất nào từ nhóm dịch</p>
        ) : (
          webRequests.map(request => {
            // Get the current user ID
            const userId = user?.id || user?._id;
            
            // Check if the current user has liked this request
            const isLikedByCurrentUser = isAuthenticated && userId && 
              request.likes && Array.isArray(request.likes) && 
              request.likes.some(likeId => likeId === userId);
            
            return (
              <RequestCard
                key={request._id}
                request={request}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
                user={user}
                isLikedByCurrentUser={isLikedByCurrentUser}
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
                isAdminRequest={true}
              />
            );
          })
        )}
      </div>
      
      {/* User Requests Section */}
      <div className="subsection-header">
        <h3>
          <i className="fas fa-users"></i> Đề xuất từ người dùng
        </h3>
        {user && user.role === 'admin' && (
          <div className="admin-note">
            <i className="fas fa-info-circle"></i> Admin: Để phê duyệt yêu cầu "Truyện mới", bạn phải tạo truyện với tên khớp chính xác với tiêu đề yêu cầu.
          </div>
        )}
      </div>
      <div className="request-grid">
        {isLoading ? (
          <LoadingSpinner size="medium" text="Đang tải yêu cầu..." />
        ) : error ? (
          <p className="error">{error}</p>
        ) : userRequests.length === 0 ? (
          <p>Không có đề xuất nào từ người dùng</p>
        ) : (
          userRequests.map(request => {
            // Get the current user ID
            const userId = user?.id || user?._id;
            
            // Check if the current user has liked this request
            const isLikedByCurrentUser = isAuthenticated && userId && 
              request.likes && Array.isArray(request.likes) && 
              request.likes.some(likeId => likeId === userId);
            
            return (
              <RequestCard
                key={request._id}
                request={request}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
                user={user}
                isLikedByCurrentUser={isLikedByCurrentUser}
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
                isAdminRequest={false}
              />
            );
          })
        )}
      </div>
    </>
  );
};

export default MarketRequestsList; 