import React from 'react';
import NovelDirectory from '../../../src/components/NovelDirectory';
import api from '../../../src/services/api';

export const Page = (pageProps) => <NovelDirectory {...pageProps} />;

// Pre-fetch novels data for search engines
export async function onBeforeRender(pageContext) {
  const { page } = pageContext.routeParams;
  const pageNum = parseInt(page) || 1;
  
  let novels = [];
  let totalPages = 1;
  let pageTitle = `Danh Sách Truyện - Trang ${pageNum} - Valvrareteam`;
  let pageDescription = 'Khám phá kho tàng light novel tiếng Việt chất lượng cao tại Valvrareteam. Cập nhật nhanh, đọc dễ dàng, trải nghiệm tốt nhất.';
  
  // Generate canonical URL
  const canonicalUrl = pageNum === 1 
    ? 'https://valvrareteam.net/danh-sach-truyen'
    : `https://valvrareteam.net/danh-sach-truyen/trang/${pageNum}`;
  
  try {
    if (pageContext.isBot || process.env.NODE_ENV === 'production') {
      // Fetch novels for the specific page
      const response = await api.fetchNovels(pageNum, 20); // 20 novels per page
      novels = response?.novels || [];
      totalPages = response?.totalPages || 1;
      
      if (pageNum > 1) {
        pageDescription = `Trang ${pageNum} - Khám phá thêm nhiều light novel tiếng Việt chất lượng cao tại Valvrareteam.`;
      }
    }
  } catch (error) {
    console.error(`Error pre-fetching novels for page ${pageNum}:`, error);
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
        description: pageDescription,
        link: [
          {
            rel: 'canonical',
            href: canonicalUrl
          }
        ]
      }
    }
  };
}

export const passToClient = ['pageProps', 'routeParams']; 