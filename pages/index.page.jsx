import React from 'react';
import NovelList from '../src/components/NovelList';
import api from '../src/services/api';

export const Page = (pageProps) => <NovelList {...pageProps} />;

// Pre-fetch homepage novels data for search engines (page 1)
export async function onBeforeRender(pageContext) {
  let novels = [];
  let totalPages = 1;
  const pageTitle = 'Valvrareteam - Đọc Light Novel Vietsub Miễn Phí | Light Novel Tiếng Việt Hay Nhất';
  const pageDescription = 'Thư viện Light Novel vietsub lớn nhất Việt Nam. Đọc Light Novel tiếng Việt miễn phí, cập nhật nhanh, dịch chất lượng cao. Hàng nghìn bộ Light Novel hay như Sword Art Online, Re:Zero, Overlord đang chờ bạn khám phá!';
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      // Fetch novels for page 1 (homepage)
      const response = await api.fetchNovels(1, 15); // 15 novels per page on homepage
      novels = response?.novels || [];
      totalPages = response?.totalPages || 1;
    }
  } catch (error) {
    console.error('Error pre-fetching novels for homepage:', error);
  }
  
  // Generate comprehensive meta data for SEO
  const currentUrl = 'https://valvrareteam.net';
  const siteName = 'Valvrareteam';
  
  // Generate keywords for homepage SEO
  const generateHomepageKeywords = () => {
    const keywords = [
      // Main target keywords
      'đọc light novel tiếng việt',
      'light novel vietsub',
      'light novel tiếng việt',
      'đọc light novel vietsub',
      'valvrareteam',
      
      // Popular novel titles and general terms
      'light novel',
      'novel tiếng việt',
      'truyện light novel',
      'light novel dịch',
      'light novel hay',
      'light novel mới',
      'light novel miễn phí',
      'đọc truyện light novel',
      'thư viện light novel',
      'light novel online',
      
      // Popular series that might be on the site
      'sword art online',
      're:zero',
      'overlord',
      'konosuba',
      'danmachi',
      'that time i got reincarnated as a slime',
      
      // Vietnamese specific terms
      'truyện dịch',
      'novel dịch',
      'truyện nhật',
      'light novel việt nam',
      'đọc truyện online',
      'web novel',
      'ln vietsub'
    ];
    
    return keywords.join(', ');
  };
  
  // Generate structured data (JSON-LD) for homepage
  const generateStructuredData = (novels, url) => {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": siteName,
      "description": pageDescription,
      "url": url,
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "url": url
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${url}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
      "inLanguage": "vi-VN",
      "about": {
        "@type": "Thing",
        "name": "Light Novel",
        "description": "Vietnamese translated light novels"
      }
    };
  };
  
  // Generate SEO header HTML for server-side rendering
  const generateSEOHeaderHTML = () => {
    return `
      <div class="seo-header">
        <h1 class="seo-header-h1">Đọc Light Novel Vietsub Miễn Phí - Light Novel Tiếng Việt Hay Nhất</h1>
        <p class="seo-header-subtitle">Thư viện Light Novel tiếng Việt lớn nhất Việt Nam, cập nhật nhanh, dịch chất lượng cao</p>
        <div class="seo-content">
          <p class="seo-description">
            Khám phá thế giới Light Novel Việt Nam với hàng nghìn bộ truyện được dịch chất lượng cao. 
            Từ những tác phẩm kinh điển như Sword Art Online, Re:Zero, Overlord đến những bộ truyện mới nhất, 
            tất cả đều được cập nhật thường xuyên và hoàn toàn miễn phí.
          </p>
          <div class="seo-features">
            <div class="feature-item">
              <h3>🔄 Cập Nhật Hàng Ngày</h3>
              <p>Các chương mới được đăng tải liên tục, đảm bảo bạn không bỏ lỡ bất kỳ nội dung nào.</p>
            </div>
            <div class="feature-item">
              <h3>📚 Thư Viện Đa Dạng</h3>
              <p>Từ Light Novel Nhật Bản, Trung Quốc, Hàn Quốc đến Web Novel gốc Việt Nam.</p>
            </div>
            <div class="feature-item">
              <h3>💯 Chất Lượng Dịch</h3>
              <p>Đội ngũ dịch giả chuyên nghiệp, đảm bảo nội dung chuẩn xác và dễ hiểu.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Generate SEO footer content for server-side rendering
  const generateSEOFooterHTML = () => {
    return `
      <div class="seo-content">
        <div class="seo-section">
          <h2 class="seo-h2">Tại Sao Chọn Valvrareteam?</h2>
          <p class="seo-description">
            Valvrareteam là điểm đến hàng đầu cho những người yêu thích Light Novel tại Việt Nam. 
            Với hơn 1000+ bộ truyện đa dạng từ Nhật Bản, Trung Quốc, Hàn Quốc và cả Web Novel gốc Việt Nam, 
            chúng tôi cam kết mang đến trải nghiệm đọc truyện tuyệt vời nhất.
          </p>
        </div>
        
        <div class="seo-section">
          <h2 class="seo-h2">Thể Loại Light Novel Phong Phú</h2>
          <p class="seo-description">
            Khám phá đa dạng thể loại từ Fantasy, Romance, Action, Comedy đến Isekai, Slice of Life. 
            Mỗi thể loại đều có những tác phẩm chất lượng cao được lựa chọn kỹ càng và dịch chuẩn xác.
          </p>
        </div>
        
        <div class="seo-popular">
          <h2>Light Novel Nổi Bật</h2>
          <p>
            Một số tác phẩm được yêu thích nhất tại Valvrareteam bao gồm các series nổi tiếng như 
            Sword Art Online với thế giới ảo đầy mạo hiểm, Re:Zero kể về cuộc sống trong thế giới khác, 
            và Overlord với câu chuyện về một game thủ trở thành Overlord trong game. 
            Ngoài ra còn có hàng trăm tác phẩm khác đang chờ bạn khám phá.
          </p>
        </div>
      </div>
    `;
  };

  return {
    pageContext: {
      pageProps: {
        preloadedNovels: novels,
        preloadedPage: 1, // This is always page 1
        preloadedTotalPages: totalPages,
        seoHeaderHTML: pageContext.isBot ? generateSEOHeaderHTML() : null,
        seoFooterHTML: pageContext.isBot ? generateSEOFooterHTML() : null
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription,
        // Additional meta tags for SEO
        meta: [
          // Keywords - targeting Vietnamese light novel searches
          {
            name: 'keywords',
            content: generateHomepageKeywords()
          },
          // Robots
          {
            name: 'robots',
            content: 'index, follow, max-image-preview:large, max-snippet:-1'
          },
          // Author
          {
            name: 'author',
            content: siteName
          },
          // Open Graph tags
          {
            property: 'og:title',
            content: pageTitle
          },
          {
            property: 'og:description',
            content: pageDescription
          },
          {
            property: 'og:type',
            content: 'website'
          },
          {
            property: 'og:url',
            content: currentUrl
          },
          {
            property: 'og:site_name',
            content: siteName
          },
          {
            property: 'og:locale',
            content: 'vi_VN'
          },
          // Twitter Card tags
          {
            name: 'twitter:card',
            content: 'summary_large_image'
          },
          {
            name: 'twitter:title',
            content: pageTitle
          },
          {
            name: 'twitter:description',
            content: pageDescription
          },
          {
            name: 'twitter:site',
            content: '@valvrareteam'
          },
          // Additional SEO meta
          {
            name: 'language',
            content: 'Vietnamese'
          },
          {
            name: 'coverage',
            content: 'Worldwide'
          },
          {
            name: 'distribution',
            content: 'Global'
          },
          {
            name: 'rating',
            content: 'General'
          },
          {
            name: 'revisit-after',
            content: '1 day'
          },
          // Geo targeting
          {
            name: 'geo.region',
            content: 'VN'
          },
          {
            name: 'geo.country',
            content: 'Vietnam'
          },
          // Content type
          {
            name: 'content-type',
            content: 'text/html; charset=UTF-8'
          },
          // Mobile optimization
          {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1.0'
          }
        ],
        // Structured data
        structuredData: generateStructuredData(novels, currentUrl)
      }
    }
  };
}

export const passToClient = ['pageProps'];