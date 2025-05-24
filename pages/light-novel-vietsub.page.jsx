import React from 'react';
import NovelList from '../src/components/NovelList';

export const Page = () => <NovelList />;

// Pre-render metadata for this SEO-optimized page
export async function onBeforeRender(pageContext) {
  return {
    pageContext: {
      pageProps: {
        // You can add specific filtering here if needed
        filter: 'trending'
      },
      documentProps: {
        title: 'Light Novel Vietsub - Đọc Light Novel Tiếng Việt Miễn Phí | Valvrareteam',
        description: 'Tổng hợp các bộ Light Novel vietsub hay nhất! Đọc Light Novel tiếng Việt chất lượng cao, dịch chuẩn, cập nhật nhanh. Sword Art Online, Re:Zero, Overlord, Tensura và hàng nghìn bộ khác đang chờ bạn khám phá miễn phí tại Valvrareteam!'
      }
    }
  };
}

export const passToClient = ['pageProps']; 