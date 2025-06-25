import React, { useState } from 'react';
import axios from 'axios';
import config from '../config/config';
import './InterestTagsManager.css';

const InterestTagsManager = ({ 
  userInterests = [], 
  isOwnProfile = false, 
  userId, 
  onInterestsUpdate 
}) => {
  const [interests, setInterests] = useState(userInterests);
  const [isEditing, setIsEditing] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Predefined interest suggestions
  const suggestedInterests = [
    'Học Nghệ', 'Nhà Mạo Hiểm', 'Chuyển Giả', 'Đại Sư', 'Thần Đấu',
    'Quân Quân', 'Truyền Kỳ', 'Sử Thi', 'Thần Thoại', 'Vô Địch',
    'Phi Thăng', 'Thành Vực', 'Hàng Tình', 'Thiên Hà', 'Đại Vô Trụ',
    'Siêu Việt', 'Toàn Tri', 'Toàn Năng', 'Tu Tiên', 'Huyền Huyễn',
    'Đô Thị', 'Khoa Huyễn', 'Kiếm Hiệp', 'Võ Hiệp', 'Lãng Mạn'
  ];

  const handleAddInterest = async (interest) => {
    if (interests.length >= 20) {
      alert('Chỉ có thể có tối đa 20 chức danh');
      return;
    }

    if (interests.includes(interest)) {
      alert('Chức danh này đã tồn tại');
      return;
    }

    const updatedInterests = [...interests, interest];
    await updateInterests(updatedInterests);
  };

  const handleRemoveInterest = async (interestToRemove) => {
    const updatedInterests = interests.filter(interest => interest !== interestToRemove);
    await updateInterests(updatedInterests);
  };

  const handleAddCustomInterest = async () => {
    if (!newInterest.trim()) return;
    
    if (newInterest.length > 20) {
      alert('Chức danh không được dài quá 20 ký tự');
      return;
    }

    await handleAddInterest(newInterest.trim());
    setNewInterest('');
  };

  const updateInterests = async (updatedInterests) => {
    setIsSaving(true);
    try {
      await axios.put(
        `${config.backendUrl}/api/users/id/${userId}/interests`,
        { interests: updatedInterests },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setInterests(updatedInterests);
      if (onInterestsUpdate) {
        onInterestsUpdate(updatedInterests);
      }
    } catch (error) {
              console.error('Error updating interests:', error);
        alert('Không thể cập nhật chức danh. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const availableSuggestions = suggestedInterests.filter(
    suggestion => !interests.includes(suggestion)
  );

  return (
    <div className="interest-tags-manager">
      <div className="interest-tags-header">
        <h4>Chức danh</h4>
        {isOwnProfile && (
          <button 
            className="edit-interests-btn"
            onClick={() => setIsEditing(!isEditing)}
            disabled={isSaving}
          >
            <i className={`fa-solid ${isEditing ? 'fa-check' : 'fa-edit'}`}></i>
            {isEditing ? 'Xong' : 'Sửa'}
          </button>
        )}
      </div>

      <div className="interest-tags-list">
        {interests.length > 0 ? (
          interests.map((interest, index) => (
            <span key={index} className="profile-interest-tag">
              {interest}
              {isEditing && (
                <button
                  className="remove-interest-btn"
                  onClick={() => handleRemoveInterest(interest)}
                  disabled={isSaving}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              )}
            </span>
          ))
        ) : (
          <p className="no-interests">
            {isOwnProfile 
              ? 'Chưa có chức danh nào. Nhấn "Sửa" để thêm chức danh.' 
              : 'Người dùng chưa thêm chức danh nào.'
            }
          </p>
        )}
      </div>

      {isEditing && (
        <div className="interest-editor">
          <div className="add-custom-interest">
            <input
              type="text"
              placeholder="Thêm chức danh tùy chỉnh..."
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomInterest()}
              maxLength={20}
              disabled={isSaving}
            />
            <button
              onClick={handleAddCustomInterest}
              disabled={!newInterest.trim() || isSaving}
              className="add-interest-btn"
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          </div>

          {availableSuggestions.length > 0 && (
            <div className="suggested-interests">
              <p>Gợi ý:</p>
              <div className="suggestion-tags">
                {availableSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-tag"
                    onClick={() => handleAddInterest(suggestion)}
                    disabled={isSaving}
                  >
                    {suggestion}
                    <i className="fa-solid fa-plus"></i>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isSaving && (
        <div className="saving-indicator">
          <i className="fa-solid fa-spinner fa-spin"></i>
          Đang lưu...
        </div>
      )}
    </div>
  );
};

export default InterestTagsManager; 