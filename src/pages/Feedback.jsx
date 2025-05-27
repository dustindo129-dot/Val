import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/Feedback.css';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * FeedbackSEO Component
 * 
 * Provides SEO optimization for the Feedback page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const FeedbackSEO = () => {
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>Phản Hồi - Góp Ý Phát Triển Website | Valvrareteam</title>
      <meta name="description" content="Đây là nơi để các bạn đưa ra feedback nhằm hỗ trợ phát triển web Valvrareteam. Góp ý, đề xuất Light Novel và chia sẻ ý kiến để cải thiện trải nghiệm đọc truyện." />
      <meta name="keywords" content="phản hồi, feedback, góp ý, đề xuất truyện, phát triển web, valvrareteam, light novel, cải thiện website" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content="Phản Hồi - Góp Ý Phát Triển Website | Valvrareteam" />
      <meta property="og:description" content="Đây là nơi để các bạn đưa ra feedback nhằm hỗ trợ phát triển web Valvrareteam. Góp ý, đề xuất Light Novel và chia sẻ ý kiến." />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content="https://valvrareteam.net/phan-hoi" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Phản Hồi - Góp Ý Phát Triển Website | Valvrareteam" />
      <meta name="twitter:description" content="Đây là nơi để các bạn đưa ra feedback nhằm hỗ trợ phát triển web Valvrareteam." />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      
      {/* Canonical URL */}
      <link rel="canonical" href="https://valvrareteam.net/phan-hoi" />
    </Helmet>
  );
};

const Feedback = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();
  
  return (
    <div className="feedback-container">
      <FeedbackSEO />
      <div className="feedback-panel">
        <div className="feedback-title">
          <h1>Phản hồi</h1>
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
            <LoadingSpinner size="large" text="Đang tải bình luận..." />
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