import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { formatRelativeTime } from './utils';
import cdnConfig from '../../config/bunny';
import bunnyUploadService from '../../services/bunnyUploadService';
import axios from 'axios';
import config from '../../config/config';

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
 * @param {Set} props.withdrawableRequests - Set of withdrawable request IDs
 * @param {Set} props.withdrawingRequests - Set of request IDs currently being withdrawn
 * @param {Function} props.handleWithdrawRequest - Function to handle withdrawing a request
 * @param {Object} props.contributions - Object mapping request IDs to contribution arrays
 * @param {number} props.showContributionForm - ID of request with visible contribution form
 * @param {Function} props.setShowContributionForm - Function to set which request shows contributions
 * @param {boolean} props.isAdminRequest - Whether this is an admin request
 * @param {Function} props.onRequestUpdate - Function to handle request updates
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
  withdrawableRequests,
  withdrawingRequests,
  handleWithdrawRequest,
  contributions,
  showContributionForm,
  setShowContributionForm,
  isAdminRequest,
  onRequestUpdate
}) => {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(request.note || '');
  const [editImage, setEditImage] = useState(request.illustration || '');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Update edit state when request changes (for real-time updates)
  React.useEffect(() => {
    if (!isEditing) {
      setEditNote(request.note || '');
      setEditImage(request.illustration || '');
    }
  }, [request.note, request.illustration, isEditing]);
  
  // Check if user can edit (admin or moderator)
  const canEdit = user && (user.role === 'admin' || user.role === 'moderator') && 
                  (request.type === 'new' || request.type === 'web');

  // Handle image upload for editing
  const handleEditImageUpload = async (e) => {
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
      setIsImageUploading(true);
      
      // Upload using bunny CDN service
      const imageUrl = await bunnyUploadService.uploadFile(
        file, 
        'request'
      );

      setEditImage(imageUrl);
    } catch (err) {
      console.error('Không thể tải lên ảnh:', err);
      alert('Không thể tải lên ảnh');
    } finally {
      setIsImageUploading(false);
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      
      const response = await axios.put(
        `${config.backendUrl}/api/requests/${request._id}`,
        {
          note: editNote,
          illustration: editImage
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update the request in the parent component
      if (onRequestUpdate) {
        onRequestUpdate(response.data.request);
      }

      setIsEditing(false);
      alert('Yêu cầu đã được cập nhật thành công');
    } catch (err) {
      console.error('Không thể cập nhật yêu cầu:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật yêu cầu');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditNote(request.note || '');
    setEditImage(request.illustration || '');
  };

  // Function to process request note content - enable hyperlinks and preserve line breaks
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
            <span>{request.novel?.title || request.title || "Yêu cầu truyện mới chưa có tên"}</span>
          </div>
          <div className="request-username">Đề xuất bởi: {request.user.displayName || request.user.username}</div>
        </div>
        <div className="request-info">
          <span className="request-time">{formatRelativeTime(request.createdAt)}</span>
          {request.isEdited && (
            <div className="edit-indicator">(Đã chỉnh sửa)</div>
          )}
        </div>
      </div>
      
      {/* Request Image */}
      <div className="request-image-container">
        {isEditing ? (
          <div className="edit-image-section">
            <img
              src={editImage || cdnConfig.defaultImages.novel}
              alt={request.title || "Yêu cầu truyện"}
              className="request-image"
              onError={(e) => {
                e.target.src = cdnConfig.defaultImages.novel;
              }}
            />
            <div className="image-upload-controls">
              <input
                type="file"
                accept="image/*"
                onChange={handleEditImageUpload}
                id={`edit-image-${request._id}`}
                style={{ display: 'none' }}
                disabled={isImageUploading || isSaving}
              />
              <label 
                htmlFor={`edit-image-${request._id}`} 
                className="upload-btn"
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: isImageUploading ? '#6c757d' : '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: isImageUploading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  marginTop: '8px'
                }}
              >
                {isImageUploading ? 'Đang tải...' : 'Thay đổi ảnh'}
              </label>
            </div>
          </div>
        ) : (
          <img
            src={request.illustration || cdnConfig.defaultImages.novel}
            alt={request.title || "Yêu cầu truyện"}
            className="request-image"
            onError={(e) => {
              e.target.src = cdnConfig.defaultImages.novel;
            }}
          />
        )}
      </div>
      
      {(request.note || isEditing) && (
        <div className="request-note">
          {isEditing ? (
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Ghi chú cho yêu cầu..."
              className="edit-note-textarea"
              disabled={isSaving}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                resize: 'vertical'
              }}
            />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processNoteContent(request.note)) }} />
          )}
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
                <span className="donor-name">{contribution.user.displayName || contribution.user.username}</span> - 
                <span className="donor-amount">{contribution.amount} 🌾</span>
              </div>
              {contribution.note && (
                <div className="donor-message" dangerouslySetInnerHTML={{ 
                  __html: `"${DOMPurify.sanitize(processNoteContent(contribution.note))}"` 
                }} />
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="request-actions">
        {/* Like and Donate buttons - hidden in edit mode */}
        {!isEditing && (
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
        )}
        
        {/* Edit actions for admin/moderator */}
        {canEdit && !isEditing && (
          <div className="action-row">
            <button 
              className="action-btn edit-btn"
              onClick={() => {
                // Ensure we start with current values
                setEditNote(request.note || '');
                setEditImage(request.illustration || '');
                setIsEditing(true);
              }}
              title="Chỉnh sửa yêu cầu"
            >
              <i className="fas fa-edit"></i>
              <span>Chỉnh sửa</span>
            </button>
          </div>
        )}

        {/* Edit save/cancel buttons */}
        {isEditing && (
          <div className="action-row">
            <button 
              className="action-btn save-btn"
              onClick={handleSaveEdit}
              disabled={isSaving}
              title="Lưu thay đổi"
            >
              <i className="fas fa-save"></i>
              <span>{isSaving ? 'Đang lưu...' : 'Lưu'}</span>
            </button>
            <button 
              className="action-btn cancel-btn"
              onClick={handleCancelEdit}
              disabled={isSaving}
              title="Hủy chỉnh sửa"
            >
              <i className="fas fa-times"></i>
              <span>Hủy</span>
            </button>
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (request.type === 'new' || request.type === 'web') && !isEditing && (
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