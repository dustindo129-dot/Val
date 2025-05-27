import React from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/Donate.css';

/**
 * DonateSEO Component
 * 
 * Provides SEO optimization for the Donate page including:
 * - Meta title and description
 * - Keywords
 * - Open Graph tags
 */
const DonateSEO = () => {
  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>Donate - Ủng Hộ Dịch Thuật Light Novel | Valvrareteam</title>
      <meta name="description" content="Ủng hộ team dịch thuật Valvrareteam để có thêm Light Novel chất lượng. Donate cho các bộ truyện High School DxD, Accel World, Rebuild World và nhiều bộ khác." />
      <meta name="keywords" content="donate, ủng hộ, dịch thuật, light novel, high school dxd, accel world, rebuild world, valvrareteam, hỗ trợ dịch giả" />
      
      {/* Language and charset */}
      <meta httpEquiv="Content-Language" content="vi-VN" />
      <meta name="language" content="Vietnamese" />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content="Donate - Ủng Hộ Dịch Thuật Light Novel | Valvrareteam" />
      <meta property="og:description" content="Ủng hộ team dịch thuật Valvrareteam để có thêm Light Novel chất lượng. Donate cho các bộ truyện yêu thích." />
      <meta property="og:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      <meta property="og:url" content="https://valvrareteam.net/donate" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Valvrareteam" />
      <meta property="og:locale" content="vi_VN" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Donate - Ủng Hộ Dịch Thuật Light Novel | Valvrareteam" />
      <meta name="twitter:description" content="Ủng hộ team dịch thuật Valvrareteam để có thêm Light Novel chất lượng." />
      <meta name="twitter:image" content="https://valvrareteam.b-cdn.net/Konachan.com_-_367009_animal_animated_bird_building_city_clouds_flowers_lennsan_no_humans_original_petals_polychromatic_reflection_scenic_sky_train_tree_water_1_u8wao6.gif" />
      
      {/* Canonical URL */}
      <link rel="canonical" href="https://valvrareteam.net/donate" />
    </Helmet>
  );
};

const Donate = () => {
  return (
    <>
      <DonateSEO />
      <div className="donate-container">
        <div className="donate-content">
          <h1>Thông Tin Donate</h1>
          <p>Đây là thông tin nhận Donate của Team. Và các bộ đang chạy nhận Donate nha. Bà con xài tạm trong quá trình phát triển hệ thống nạp tiền mới.</p>
                  
          <div className="donate-image-container">
            <img 
              src="https://Valvrareteam.b-cdn.net/Screenshot%202025-04-28%20192829.png" 
              alt="Thông tin Donate" 
              className="donate-image" 
            />
          </div>
          
          <h2>Danh sách Light Novel nhận donate:</h2>
          <ul className="donate-list">
            <li>High School DxD</li>
            <li>Accel World</li>
            <li>Rebuild World</li>
          </ul>
          
          <div className="donate-note">
            <p><strong>Lưu ý:</strong> Bà con khi donate thì thêm cú pháp là [TÊN TRUYỆN] + [SỐ CHƯƠNG] + [TÊN BẠN] giúp mình nha. Để mình tổng kết cho dễ á, còn phần tên của bạn thì để mình gắn vào mục những người donate cho truyện nha</p>
          </div>
          
          <h2>Tình trạng bộ truyện:</h2>
          <ul className="novel-status-list">
            <li>High School DxD Tập 25 – Đã hoàn thành</li>
            <li>Rebuild World từ Tập 4~5 sẽ là 30k/chương. Nếu donate thì sẽ up chương sớm, còn lại thì 1 tuần 1 chap nha.</li>
          </ul>
          
          <p className="donate-link">
            <strong>Link xem Donate:</strong> <a href="https://docs.google.com/spreadsheets/d/1d2ZN-zD5xU1AuSrPfYR6pXxTIa0Wr2AR1XxrUrjtKhc/edit?usp=sharing" target="_blank" rel="noopener noreferrer">https://docs.google.com/spreadsheets/d/1d2ZN-zD5xU1AuSrPfYR6pXxTIa0Wr2AR1XxrUrjtKhc/edit?usp=sharing</a>
          </p>

        </div>
      </div>
    </>
  );
};

export default Donate; 