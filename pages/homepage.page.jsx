// This file redirects or renders the homepage at /homepage URL
import React from 'react';
import NovelList from '../src/components/NovelList';

export const Page = () => <NovelList />;

// Optional: Export an onBeforeRender() hook if you need to fetch data before rendering
export async function onBeforeRender(pageContext) {
  // Here you can fetch data for this page
  return {
    pageContext: {
      pageProps: {
        // Any props you want to pass to the page
      }
    }
  };
}

// Metadata for SEO
export const documentProps = {
  title: 'Valvrareteam - Đọc Light Novel Vietsub Miễn Phí | Light Novel Tiếng Việt Hay Nhất',
  description: 'Thư viện Light Novel vietsub lớn nhất Việt Nam. Đọc Light Novel tiếng Việt miễn phí, cập nhật nhanh, dịch chất lượng cao. Hàng nghìn bộ Light Novel hay như Sword Art Online, Re:Zero, Overlord đang chờ bạn khám phá!'
}; 