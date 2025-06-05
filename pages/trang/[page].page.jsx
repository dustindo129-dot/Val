import React from 'react';
import NovelList from '../../src/components/NovelList';
import api from '../../src/services/api';

export const Page = (pageProps) => <NovelList {...pageProps} />;

// Pre-fetch homepage novels data for search engines
export async function onBeforeRender(pageContext) {
  const { page } = pageContext.routeParams;
  const pageNum = parseInt(page) || 1;
  
  let novels = [];
  let totalPages = 1;
  let pageTitle = pageNum === 1 
    ? 'Valvrareteam - Kho Tàng Light Novel Vietsub' 
    : `Trang ${pageNum} - Valvrareteam`;
  let pageDescription = pageNum === 1
    ? 'Kho tàng light novel tiếng Việt chất lượng cao. Cập nhật nhanh, đọc dễ dàng, trải nghiệm tốt nhất cho fan light novel!'
    : `Trang ${pageNum} - Khám phá thêm nhiều light novel tiếng Việt chất lượng cao tại Valvrareteam.`;
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      // Fetch novels for the specific page
      const response = await api.fetchNovels(pageNum, 15); // 15 novels per page on homepage
      novels = response?.novels || [];
      totalPages = response?.totalPages || 1;
    }
  } catch (error) {
    console.error(`Error pre-fetching novels for homepage page ${pageNum}:`, error);
  }
  
  // Generate SEO header HTML for server-side rendering (only for page 1)
  const generateSEOHeaderHTML = () => {
    if (pageNum !== 1) return null;
    
    return `
      <div class="seo-header">
        <h1 class="seo-header-h1">Đọc Light Novel Vietsub Miễn Phí - Light Novel Tiếng Việt Hay Nhất</h1>
        <p class="seo-header-subtitle">Thư viện Light Novel tiếng Việt lớn nhất Việt Nam, cập nhật nhanh, dịch chất lượng cao</p>
      </div>
    `;
  };

  return {
    pageContext: {
      pageProps: {
        preloadedNovels: novels,
        preloadedPage: pageNum,
        preloadedTotalPages: totalPages,
        seoHeaderHTML: pageContext.isBot ? generateSEOHeaderHTML() : null
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 