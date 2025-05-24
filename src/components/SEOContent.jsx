import React from 'react';
import '../styles/SEOContent.css';

const SEOContent = ({ page = 'home' }) => {
  const renderHomeContent = () => (
    <div className="seo-content">
      <div className="seo-hero">
        <h1 className="seo-h1">Đọc Light Novel Vietsub Miễn Phí - Thư Viện Light Novel Tiếng Việt Lớn Nhất</h1>
        <p className="seo-description text-center">
          Chào mừng đến với <strong>Valvrareteam</strong> - thư viện <strong>Light Novel vietsub</strong> tại Việt Nam! 
          Tại đây bạn có thể <strong>đọc Light Novel tiếng Việt</strong> miễn phí với chất lượng dịch thuật tốt nhất.
        </p>
      </div>
      
      <div className="seo-features">
        <div className="feature-grid">
          <div className="feature-item">
            <h3>📚 Kho Light Novel Vietsub Phong Phú</h3>
            <p>Hàng nghìn bộ <strong>Light Novel tiếng Việt</strong> từ các thể loại hot nhất như Isekai, Romance, Action, Fantasy</p>
          </div>
          <div className="feature-item">
            <h3>⚡ Cập Nhật Nhanh Chóng</h3>
            <p><strong>Light Novel vietsub</strong> mới được cập nhật hàng ngày, bạn sẽ không bao giờ bỏ lỡ chapter mới</p>
          </div>
          <div className="feature-item">
            <h3>🎯 Dịch Thuật Chất Lượng</h3>
            <p>Đội ngũ dịch giả chuyên nghiệp đảm bảo <strong>Light Novel tiếng Việt</strong> chính xác, dễ hiểu</p>
          </div>
          <div className="feature-item">
            <h3>📱 Đọc Mọi Lúc Mọi Nơi</h3>
            <p>Giao diện tối ưu cho mobile, <strong>đọc Light Novel vietsub</strong> mượt mà trên mọi thiết bị</p>
          </div>
          <div className="feature-item">
            <h3>🔍 Tìm Kiếm Thông Minh</h3>
            <p>Hệ thống tìm kiếm nâng cao giúp bạn dễ dàng tìm <strong>Light Novel vietsub</strong> theo thể loại, tác giả, trạng thái</p>
          </div>
          <div className="feature-item">
            <h3>💬 Cộng Đồng Sôi Nổi</h3>
            <p>Tham gia thảo luận, đánh giá và chia sẻ cảm nhận về <strong>Light Novel tiếng Việt</strong> với độc giả khác</p>
          </div>
        </div>
      </div>

      <div className="seo-popular">
        <h2>Top Light Novel Vietsub Phổ Biến Nhất</h2>
        <p>
          Khám phá những bộ <strong>Light Novel tiếng Việt</strong> được yêu thích nhất như:
          High School DxD, No Game No Life, Silent Witch, Konosuba, và nhiều series Light Novel vietsub hấp dẫn khác.
        </p>
      </div>
    </div>
  );

  const renderCategoryContent = (category) => (
    <div className="seo-content">
      <div className="seo-hero">
        <h1 className="seo-h1">
          {category === 'trending' && 'Light Novel Vietsub Trending - Những Bộ Truyện Hot Nhất'}
          {category === 'popular' && 'Light Novel Tiếng Việt Phổ Biến - Top Truyện Được Yêu Thích'}
          {category === 'recent' && 'Đọc Light Novel Vietsub Mới Nhất - Cập Nhật Hàng Ngày'}
        </h1>
      </div>
    </div>
  );

  return (
    <>
      {page === 'home' && renderHomeContent()}
      {page !== 'home' && renderCategoryContent(page)}
    </>
  );
};

export default SEOContent; 