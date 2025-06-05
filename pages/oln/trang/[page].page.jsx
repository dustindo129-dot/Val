import React from 'react';
import OLN from '../../../src/pages/OLN';
import api from '../../../src/services/api';

export const Page = (pageProps) => <OLN {...pageProps} />;

// Pre-fetch OLN novels data for search engines
export async function onBeforeRender(pageContext) {
  const { page } = pageContext.routeParams;
  const pageNum = parseInt(page) || 1;
  
  let novels = [];
  let totalPages = 1;
  let pageTitle = `OLN - Original Light Novel - Trang ${pageNum} - Valvrareteam`;
  let pageDescription = 'Khám phá những tác phẩm Original Light Novel (OLN) độc đáo và sáng tạo. Thưởng thức câu chuyện gốc từ tác giả Việt Nam.';
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      // Fetch OLN novels for the specific page
      const response = await api.fetchOLNNovels(pageNum, 20); // 20 novels per page
      novels = response?.novels || [];
      totalPages = response?.totalPages || 1;
      
      if (pageNum > 1) {
        pageDescription = `Trang ${pageNum} - Khám phá thêm nhiều tác phẩm Original Light Novel từ tác giả Việt Nam tại Valvrareteam.`;
      }
    }
  } catch (error) {
    console.error(`Error pre-fetching OLN novels for page ${pageNum}:`, error);
  }
  
  return {
    pageContext: {
      pageProps: {
        preloadedNovels: novels,
        preloadedPage: pageNum,
        preloadedTotalPages: totalPages
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 