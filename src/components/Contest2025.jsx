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

                 {/* Prize Section */}
         <div className="prize-section">
           <h2 className="section-title">🏆 Giải thưởng</h2>
           <div className="prizes-container">
             <div className="main-prizes">
               <div className="prize-card first-place">
                 <div className="prize-rank">01 GIẢI NHẤT</div>
                 <div className="prize-amount">1.000.000 VND + Banner</div>
               </div>
               <div className="prize-card second-place">
                 <div className="prize-rank">01 GIẢI NHÌ</div>
                 <div className="prize-amount">500.000 VND + Banner</div>
               </div>
               <div className="prize-card peoples-choice">
                 <div className="prize-rank">01 GIẢI NGHỆ SĨ NHÂN DÂN</div>
                 <div className="prize-amount">Banner</div>
               </div>
             </div>
             
             <div className="bonus-prizes">
               <h3>Phần thưởng riêng đến từ các ban giám khảo</h3>
               <div className="bonus-summary">
                 <p>
                   <em>Chỉ áp dụng cho tác phẩm đạt giải nhất (bonus, không liên quan đến giải thưởng tiền mặt).</em>
                 </p>
                 <p>
                   <strong>Nekko</strong>: Tài trợ full minh họa • <strong>Koru</strong>: Audiobook • <strong>Mr.Tuân</strong>: Biên tập viên hỗ trợ hoàn thành tập 1 của tác phẩm. 
                   <span className="bonus-disclaimer">Lưu ý: Ban giám khảo có quyền rút lại phần thưởng riêng nếu tác phẩm chưa đạt chất lượng mong muốn.</span>
                 </p>
               </div>
             </div>
           </div>
         </div>

         {/* Jury Messages Section */}
         <div className="jury-section">
           <h2 className="section-title">💬 Thông điệp từ ban giám khảo</h2>
           <div className="jury-cards">
             <div className="jury-card">
               <div className="jury-avatar">
                 <div className="avatar-placeholder male">N</div>
               </div>
               <div className="jury-info">
                 <h3 className="jury-name">Nekko</h3>
                 <p className="jury-message">
                   Nội dung thông điệp sẽ được thêm vào đây...
                 </p>
               </div>
             </div>
             
             <div className="jury-card">
               <div className="jury-avatar">
                 <div className="avatar-placeholder female">R</div>
               </div>
               <div className="jury-info">
                 <h3 className="jury-name">Rabi</h3>
                 <p className="jury-message">
                   Nội dung thông điệp sẽ được thêm vào đây...
                 </p>
               </div>
             </div>
             
             <div className="jury-card">
               <div className="jury-avatar">
                 <div className="avatar-placeholder male">T</div>
               </div>
               <div className="jury-info">
                 <h3 className="jury-name">Tuân</h3>
                 <p className="jury-message">
                   Nội dung thông điệp sẽ được thêm vào đây...
                 </p>
               </div>
             </div>
           </div>
         </div>

         {/* Submission and Rules Section */}
         <div className="submission-section">
           <div className="submission-panels">
             <div className="panel submission-panel">
               <div className="panel-icon">📧</div>
               <h3>Gửi bài dự thi</h3>
               <p>Thí sinh gửi bài dự thi qua email:</p>
               <div className="email-display">
               truyenvietcuavalvrareteam@gmail.com 
               </div>
               <p className="panel-note">Vui lòng đọc kỹ luật thi trước khi gửi bài</p>
             </div>
             
             <div className="panel rules-panel">
               <div className="panel-icon">📋</div>
               <h3>Luật và chi tiết đầy đủ</h3>
               <p>Tài liệu chính thức về quy định cuộc thi:</p>
               <a 
                 href="https://docs.google.com/document/d/15CLdlCD2g0iYoIexOtzF-T78MW7tagJr2bVkHj19c3g/edit?fbclid=IwZXh0bgNhZW0CMTAAYnJpZBExVUgyRXdsbXlmNjlBeE5VbQEelK_n4jzPEmjLXtFV4IjAR3DrSUXDfjGyZhR-VEsz89DTUvcWXtSEuzTaAQ4_aem_GyVJSNe4kg8L88ARV7cTFg&tab=t.0"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="rules-button"
               >
                 Xem luật thi đầy đủ
               </a>
               <p className="panel-note">Mở trong tab mới</p>
             </div>
           </div>
         </div>

         {/* Admin Content - Only visible to admins */}
         {isAdminOrMod && (
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
         )}
      </div>
    </div>
  );
};

export default Contest2025;
