import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCog } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/ChapterAccessGuard.css';

/**
 * ChapterAccessGuard Component
 * 
 * Displays appropriate messages when a user doesn't have access to chapter content
 */
const ChapterAccessGuard = ({ chapter, user, children }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Check if user has access to chapter content based on mode
  const canAccessChapterContent = (chapter, user) => {
    if (!chapter || !chapter.mode) return true; // Default to accessible if no mode specified
    
    switch (chapter.mode) {
      case 'published':
        return true; // Published is accessible to everyone
      case 'protected':
        return isAuthenticated; // Protected requires user to be logged in
      case 'draft':
        return user?.role === 'admin' || user?.role === 'moderator'; // Draft accessible to admin and moderator
      case 'paid':
        return user && (user.role === 'admin' || user.role === 'moderator'); // Paid content only accessible to admin/moderator
      default:
        return true;
    }
  };

  const hasAccess = canAccessChapterContent(chapter, user);

  // Check if user can access paid content
  const canAccessPaidContent = user && (user.role === 'admin' || user.role === 'moderator');
  
  // Check if this chapter is in paid mode
  const isPaidChapter = chapter?.mode === 'paid';
  
  if (!hasAccess) {
    return (
      <div className="restricted-content-message">
        {chapter?.mode === 'protected' && (
          <div className="protected-content">
            <FontAwesomeIcon icon={faLock} size="3x" />
            <h3>Nội dung bảo mật</h3>
            <p>Vui lòng đăng nhập để đọc chương này.</p>
          </div>
        )}
        {chapter?.mode === 'draft' && (
          <div className="draft-content">
            <FontAwesomeIcon icon={faCog} size="3x" />
            <h3>Nội dung nháp</h3>
            <p>Chương này đang ở chế độ nháp và không khả dụng cho người dùng.</p>
          </div>
        )}
        {isPaidChapter && !canAccessPaidContent && (
          <div className="chapter-access-guard">
            <div className="locked-chapter-container">
              <div className="locked-chapter-content">
                <FontAwesomeIcon icon={faLock} className="locked-chapter-icon" />
                <h3>Chương này yêu cầu thanh toán để truy cập</h3>
                <p>Cần {chapter.chapterBalance || 0} 🌾 để mở khóa. Vui lòng truy cập bảng yêu cầu!</p>
                <div className="locked-chapter-actions">
                  <Link to="/market" className="go-to-market-btn">Truy cập bảng yêu cầu</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return children;
};

export default ChapterAccessGuard; 