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
  
  return {
    pageContext: {
      pageProps: {
        preloadedNovels: novels,
        preloadedPage: 1, // This is always page 1
        preloadedTotalPages: totalPages
      },
      documentProps: {
        title: pageTitle,
        description: pageDescription
      }
    }
  };
}

export const passToClient = ['pageProps'];