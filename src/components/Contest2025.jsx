/**
 * Contest2025 Component
 * 
 * Component for the Val Light Novel Contest 2025 page
 * Shows different content based on user role:
 * - Admin/Moderator: Full contest management interface (to be implemented later)
 * - Everyone else: Announcement about official launch
 * 
 * Features:
 * - Role-based content display
 * - Responsive design
 * - Dark theme support
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Contest2025.css';

/**
 * Contest2025 Component
 * 
 * Main component for the Val LN Contest 2025 page
 * 
 * @param {Object} props - No props required
 */
const Contest2025 = () => {
  // Get user authentication state and role
  const { user, isAuthenticated } = useAuth();
  
  // Check if user is admin or moderator
  const isAdminOrMod = isAuthenticated && (user?.role === 'admin' || user?.role === 'moderator');

  return (
    <div className="contest-2025-container">
      <div className="contest-content">
        {/* Page Header */}
        <div className="contest-header">
          <h1 className="contest-title">Val Light Novel Contest 2025</h1>
          <div className="contest-subtitle">
            Cuộc thi sáng tác Light Novel 'cây nhà lá vườn' đến từ Valvrareteam 
          </div>
        </div>

        {/* Content based on user role */}
        {isAdminOrMod ? (
          /* Admin/Moderator Content - To be implemented later */
          <div className="admin-content">
            <div className="admin-placeholder">
              <h2>Bảng quản lý cuộc thi</h2>
              <p>Nội dung quản lý cuộc thi sẽ được thêm vào đây...</p>
              <div className="admin-sections">
                <div className="admin-section">
                  <h3>Quản lý bài dự thi</h3>
                  <p>Danh sách và quản lý các bài dự thi</p>
                </div>
                <div className="admin-section">
                  <h3>Quản lý thí sinh</h3>
                  <p>Thông tin và quản lý thí sinh tham gia</p>
                </div>
                <div className="admin-section">
                  <h3>Cài đặt cuộc thi</h3>
                  <p>Cấu hình thời gian, quy định cuộc thi</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Public Announcement Content */
          <div className="announcement-content">
            <div className="announcement-box">
              <div className="announcement-icon">
                🎉
              </div>
              <div className="announcement-text">
                <h2>CHÍNH THỨC RA MẮT CUỐI THÁNG 8/2025</h2>
                <p>
                  Cuộc thi sáng tác Light Novel đầu tiên của Valvrareteam sẽ chính thức ra mắt cuối tháng 8. Mọi công tác chuẩn bị đang được tiến hành.
                </p>
                <p>Hãy cùng bọn mình chờ đợi sự kiện đặc biệt này nhé!</p>
              </div>
            </div>
            
            {/* Additional info for announcement */}
            <div className="info-sections">
              <div className="info-section">
                <h3>📚 Về cuộc thi</h3>
                <p>Cuộc thi sáng tác Light Novel dành cho tất cả các tác giả yêu thích thể loại này</p>
              </div>
              <div className="info-section">
                <h3>🏆 Giải thưởng</h3>
                <p>Nhiều phần thưởng hấp dẫn đang chờ đợi các tác giả xuất sắc</p>
              </div>
              <div className="info-section">
                <h3>📅 Thời gian</h3>
                <p>Chi tiết về thời gian và quy định sẽ được công bố sớm</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contest2025;
