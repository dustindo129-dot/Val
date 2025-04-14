import React, { useState, useEffect } from 'react';
import '../styles/Feedback.css';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import CommentSection from '../components/CommentSection';

const Feedback = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();
  
  return (
    <div className="feedback-container">
      <div className="feedback-panel">
        <div className="feedback-title">
          <h1>Feedback</h1>
        </div>
        <div className="feedback-content">
          <div className="content-display">
          <p><strong>Web được thực hiện bởi Nekko c&ugrave;ng sự trợ gi&uacute;p từ LittleKai, v&agrave; Maneki Neko.</strong></p>
            <p>&nbsp;</p>
            <p>Đ&acirc;y l&agrave; nơi để c&aacute;c bạn đưa ra feedback nhằm hỗ trợ ph&aacute;t triển web. Trong qu&aacute; tr&igrave;nh ph&aacute;t triển mọi thứ tạm thời sẽ chưa được việt h&oacute;a trừ nội dung (v&igrave; viết code bằng tiếng Anh). Những comment được tim nhiều nhất sẽ được c&acirc;n nhắc ph&aacute;t triển trước.</p>
            <p>&nbsp;</p>
            <p>Khu vực n&agrave;y được tạo ra với mục đ&iacute;ch chỉ sử dụng trong qu&aacute; tr&igrave;nh Beta, nhưng sau n&agrave;y c&oacute; thể chỉnh sửa th&agrave;nh bảng tin chung hay th&ocirc;ng b&aacute;o g&igrave; đ&oacute;. Cứ tự nhi&ecirc;n đề xuất Light Novel hoặc bất k&igrave; nội dung n&agrave;o c&aacute;c bạn muốn việt h&oacute;a bởi nh&oacute;m, web c&ograve;n kh&aacute; mới v&agrave; vẫn c&ograve;n nhiều khoảng trống để ph&aacute;t triển l&acirc;u d&agrave;i cả về mặt giao diện, nội dung cũng như nh&acirc;n sự v&agrave; những thứ kh&aacute;c.</p>
            <p>&nbsp;</p>
            <p>Vậy th&ocirc;i, have fun!</p>
            <p>&nbsp;</p>
            <p><em>Nekko</em></p>
            <p><em>04/13/2025&nbsp;&nbsp;</em></p>
          </div>
        </div>
      </div>
      
      <div className="comments-section">
        {isLoading ? (
          <div className="loading-spinner">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            <p>Loading comments...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            {error}
          </div>
        ) : (
          <CommentSection 
            contentId="feedback" 
            contentType="feedback"
            user={user}
            isAuthenticated={!!user} // Ensure this is a boolean based on user object existence
            defaultSort="likes"
          />
        )}
      </div>
    </div>
  );
};

export default Feedback; 