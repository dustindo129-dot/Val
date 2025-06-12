import React from 'react';
import NovelList from '../src/components/NovelList';
import api from '../src/services/api';

export const Page = (pageProps) => <NovelList {...pageProps} />;

// Pre-fetch homepage novels data for search engines (page 1)
export async function onBeforeRender(pageContext) {
  let novels = [];
  let totalPages = 1;
  const pageTitle = 'Valvrareteam - Đọc Light Novel Vietsub Miễn Phí | Light Novel Tiếng Việt Hay Nhất';
  const pageDescription = 'Thư viện Light Novel vietsub hàng đầu Việt Nam với 1000+ bộ truyện chất lượng cao. Khám phá, tìm kiếm và đọc Light Novel tiếng Việt miễn phí tại Valvrareteam - Cập nhật hàng ngày, dịch chuẩn xác!';
  
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
  const generateHomepageKeywords = (novels) => {
    const keywords = [
      // Main target keywords - BRAND SPECIFIC
      'valvrareteam',
      'valvrareteam light novel',
      'valvrareteam vietsub',
      'đọc light novel valvrareteam',
      'light novel valvrareteam',
      'valvrareteam.net',
      
      // Main target keywords - GENERIC
      'đọc light novel tiếng việt',
      'light novel vietsub',
      'light novel tiếng việt',
      'đọc light novel vietsub',
      
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
      
      // Brand + Popular series combinations
      'light novel valvrareteam',
      'novel vietsub valvrareteam',
      'truyện dịch valvrareteam',
      'đọc light novel valvrareteam',
      
      // Vietnamese specific terms
      'truyện dịch',
      'novel dịch',
      'truyện nhật',
      'truyện trung quốc',
      'truyện hàn quốc',
      'light novel việt nam',
      'đọc truyện online',
      'web novel',
      'ln vietsub',
      'novel online'
    ];
    
    // Add dynamic keywords from actual novels (limit to prevent keyword stuffing)
    if (novels && novels.length > 0) {
      // Take first 5 novels to add their titles as keywords
      const topNovels = novels.slice(0, 5);
      topNovels.forEach(novel => {
        if (novel?.title) {
          const novelTitle = novel.title.toLowerCase();
          keywords.push(
            `${novelTitle} valvrareteam`,
            `${novelTitle} vietsub`,
            `đọc ${novelTitle}`
          );
        }
      });
    }
    
    return keywords.join(', ');
  };
  
  // Generate structured data (JSON-LD) for homepage
  const generateStructuredData = (novels, url) => {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": siteName,
      "alternateName": ["Valvrareteam", "ValvraTeam", "Light Novel Vietsub"],
      "description": pageDescription,
      "url": url,
      "sameAs": [
        // Add your social media profiles when available
        // "https://facebook.com/valvrareteam",
        // "https://twitter.com/valvrareteam"
      ],
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "url": url,
        "logo": {
          "@type": "ImageObject",
          "url": `${url}/images/valvrare-logo.svg`,
          "width": 100,
          "height": 100
        },
        "description": "Thư viện Light Novel vietsub lớn nhất Việt Nam",
        "foundingDate": "2023",
        "knowsAbout": [
          "Light Novel",
          "Light Novel Vietsub", 
          "Light Novel Tiếng Việt",
          "Japanese Light Novels",
          "Chinese Web Novels",
          "Korean Light Novels",
          "Vietnamese Web Novels"
        ]
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
      "about": [
        {
          "@type": "Thing",
          "name": "Light Novel",
          "description": "Vietnamese translated light novels"
        },
        {
          "@type": "Thing", 
          "name": "Light Novel Vietsub",
          "description": "Vietnamese light novel translations and original content"
        }
      ],
      "audience": {
        "@type": "Audience",
        "audienceType": "Light Novel readers",
        "geographicArea": {
          "@type": "Country",
          "name": "Vietnam"
        }
      },
      "mainEntity": {
        "@type": "ItemList",
        "name": "Light Novel Collection",
        "description": "Complete collection of Vietnamese translated light novels",
        "numberOfItems": novels?.length || 0
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
            Từ những tác phẩm kinh điển đến những bộ truyện mới nhất từ Nhật Bản, Trung Quốc, Hàn Quốc, 
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
          <h2 class="seo-h2">Valvrareteam - Thư Viện Light Novel Vietsub Uy Tín Nhất</h2>
          <p class="seo-description">
            <strong>Valvrareteam</strong> là điểm đến hàng đầu cho những người yêu thích Light Novel tại Việt Nam. 
            Với hơn 1000+ bộ truyện đa dạng từ Nhật Bản, Trung Quốc, Hàn Quốc và cả Web Novel gốc Việt Nam, 
            <strong>Valvrareteam.net</strong> cam kết mang đến trải nghiệm đọc truyện tuyệt vời nhất.
            Khi bạn tìm kiếm bất kỳ Light Novel nào kèm từ khóa "Valvrareteam", đây chính là nguồn chính thức và uy tín nhất.
          </p>
        </div>
        
        <div class="seo-section">
          <h2 class="seo-h2">Tại Sao Chọn Valvrareteam Cho Light Novel Vietsub?</h2>
          <p class="seo-description">
            <strong>Valvrareteam</strong> nổi tiếng với chất lượng dịch thuật chuẩn xác và cập nhật nhanh chóng. 
            Các bộ Light Novel từ Nhật Bản, Trung Quốc, Hàn Quốc và Web Novel Việt Nam
            đều được dịch và cập nhật thường xuyên tại <strong>Valvrareteam.net</strong>. 
            Đây là lý do tại sao khi tìm kiếm "[Tên truyện] Valvrareteam" bạn sẽ tìm thấy nguồn chính thức và chất lượng nhất.
          </p>
        </div>
        
        <div class="seo-section">
          <h2 class="seo-h2">Light Novel Nổi Bật Tại Valvrareteam</h2>
          <p class="seo-description">
            <strong>Valvrareteam</strong> chuyên cung cấp các bộ Light Novel chất lượng cao với dịch thuật chuẩn xác.
            Từ những series kinh điển đến những tác phẩm mới nhất, tất cả đều được cập nhật thường xuyên 
            với chất lượng dịch thuật hàng đầu tại <strong>Valvrareteam.net</strong>.
            Đây là lý do tại sao khi tìm kiếm bất kỳ Light Novel nào kèm "Valvrareteam" 
            bạn sẽ tìm thấy nguồn chính thức và chất lượng nhất.
          </p>
        </div>
        
        <div class="seo-section">
          <h2 class="seo-h2">Tìm Kiếm Light Novel Tại Valvrareteam</h2>
          <p class="seo-description">
            Để tìm được bản dịch chính thức và chất lượng nhất của bất kỳ Light Novel nào, 
            hãy thêm từ khóa "<strong>Valvrareteam</strong>" vào tìm kiếm của bạn. 
            Ví dụ: "Tên truyện + Valvrareteam" sẽ đưa bạn đến nguồn dịch thuật uy tín nhất.
            <strong>Valvrareteam.net</strong> - Điểm đến số 1 cho Light Novel Vietsub!
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
            content: generateHomepageKeywords(novels)
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
        // Canonical URL
        link: [
          {
            rel: 'canonical',
            href: 'https://valvrareteam.net'
          }
        ],
        // Structured data
        structuredData: generateStructuredData(novels, currentUrl)
      }
    }
  };
}

export const passToClient = ['pageProps'];